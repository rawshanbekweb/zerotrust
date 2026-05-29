import { prisma } from '../../services/prisma.service.js';
import { NotFoundError, ConflictError } from '../../utils/api-response.js';
import { log } from '../../utils/logger.js';

export class PoliciesService {
  async findAll() {
    return prisma.securityPolicy.findMany({
      orderBy: { priority: 'desc' }
    });
  }

  async findById(id: string) {
    const policy = await prisma.securityPolicy.findUnique({ where: { id } });
    if (!policy) throw new NotFoundError('Policy');
    return policy;
  }

  async create(
    data: {
      name: string;
      displayName: string;
      description?: string;
      type: string;
      category: string;
      rules: any[];
      conditions: Record<string, any>;
      actions: string[];
      priority?: number;
    },
    requesterUserId: string,
    ipAddress: string
  ) {
    const exists = await prisma.securityPolicy.findUnique({ where: { name: data.name } });
    if (exists) throw new ConflictError('A policy with this name already exists');

    const policy = await prisma.securityPolicy.create({
      data: {
        name: data.name,
        displayName: data.displayName,
        description: data.description ?? null,
        type: data.type,
        category: data.category,
        rules: JSON.stringify(data.rules),
        conditions: JSON.stringify(data.conditions),
        actions: JSON.stringify(data.actions),
        priority: data.priority ?? 50,
        isActive: true,
        createdById: requesterUserId
      }
    });

    // Record in Audit Log
    await prisma.auditLog.create({
      data: {
        userId: requesterUserId,
        action: 'POLICY_CREATED',
        resource: 'policies',
        resourceId: policy.id,
        newValue: JSON.stringify(policy),
        description: `Security policy "${policy.displayName}" was created by administrator.`,
        ipAddress,
        severity: 'WARNING'
      }
    });

    log.info(`Security policy ${policy.name} created`, { policyId: policy.id });
    return policy;
  }

  async update(
    id: string,
    data: {
      displayName?: string;
      description?: string;
      rules?: any[];
      conditions?: Record<string, any>;
      actions?: string[];
      priority?: number;
      isActive?: boolean;
    },
    requesterUserId: string,
    ipAddress: string
  ) {
    const policy = await prisma.securityPolicy.findUnique({ where: { id } });
    if (!policy) throw new NotFoundError('Policy');

    // Prepare update data
    const updateData: any = {};
    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.rules !== undefined) updateData.rules = JSON.stringify(data.rules);
    if (data.conditions !== undefined) updateData.conditions = JSON.stringify(data.conditions);
    if (data.actions !== undefined) updateData.actions = JSON.stringify(data.actions);
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updated = await prisma.securityPolicy.update({
      where: { id },
      data: updateData
    });

    // Record detailed JSON Diff in Audit Log!
    await prisma.auditLog.create({
      data: {
        userId: requesterUserId,
        action: 'POLICY_UPDATED',
        resource: 'policies',
        resourceId: policy.id,
        oldValue: JSON.stringify(policy),
        newValue: JSON.stringify(updated),
        description: `Security policy "${policy.displayName}" was updated by administrator.`,
        ipAddress,
        severity: 'WARNING'
      }
    });

    log.info(`Security policy ${policy.name} updated`, { policyId: policy.id });
    return updated;
  }

  async toggleActive(id: string, isActive: boolean, requesterUserId: string, ipAddress: string) {
    const policy = await prisma.securityPolicy.findUnique({ where: { id } });
    if (!policy) throw new NotFoundError('Policy');

    const updated = await prisma.securityPolicy.update({
      where: { id },
      data: { isActive }
    });

    // Record in Audit Log
    await prisma.auditLog.create({
      data: {
        userId: requesterUserId,
        action: isActive ? 'POLICY_ENABLED' : 'POLICY_DISABLED',
        resource: 'policies',
        resourceId: policy.id,
        description: `Security policy "${policy.displayName}" was ${isActive ? 'enabled' : 'disabled'}.`,
        ipAddress,
        severity: isActive ? 'INFO' : 'WARNING'
      }
    });

    log.info(`Security policy ${policy.name} toggled: ${isActive}`, { policyId: id });
    return updated;
  }

  async delete(id: string, requesterUserId: string, ipAddress: string) {
    const policy = await prisma.securityPolicy.findUnique({ where: { id } });
    if (!policy) throw new NotFoundError('Policy');
    if (policy.isSystem) throw new ConflictError('Cannot delete system-locked policies');

    await prisma.securityPolicy.delete({ where: { id } });

    // Record in Audit Log
    await prisma.auditLog.create({
      data: {
        userId: requesterUserId,
        action: 'POLICY_DELETED',
        resource: 'policies',
        resourceId: policy.id,
        oldValue: JSON.stringify(policy),
        description: `Security policy "${policy.displayName}" was permanently deleted.`,
        ipAddress,
        severity: 'CRITICAL'
      }
    });

    log.warn(`Security policy ${policy.name} deleted permanently`, { policyId: id });
  }

  /**
   * Dynamic Zero Trust Gate: evaluates session details against all active security policies.
   * Returns ALLOW, DENY, or MFA_CHALLENGE
   */
  async evaluateAccess(context: {
    user: { id: string; role: string; riskScore: number; isActive: boolean };
    device?: { trustScore: number; isTrusted: boolean; isBlocked: boolean } | null;
    ipAddress: string;
    location?: { country: string; city: string } | null;
  }): Promise<{ action: 'ALLOW' | 'DENY' | 'MFA_CHALLENGE'; triggeredPolicy?: string }> {
    const activePolicies = await prisma.securityPolicy.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' }
    });

    for (const policy of activePolicies) {
      let rules: any[] = [];
      try {
        rules = JSON.parse(policy.rules);
      } catch {
        continue;
      }

      let policyTriggered = true;

      // Evaluate rules in AND format
      for (const rule of rules) {
        const { field, operator, value } = rule;
        let contextValue: any = null;

        // Resolve context fields
        if (field === 'user.isActive') contextValue = context.user.isActive;
        else if (field === 'user.riskScore') contextValue = context.user.riskScore;
        else if (field === 'device.isTrusted') contextValue = context.device?.isTrusted ?? false;
        else if (field === 'device.trustScore') contextValue = context.device?.trustScore ?? 0;
        else if (field === 'device.isBlocked') contextValue = context.device?.isBlocked ?? false;
        else if (field === 'location.country') contextValue = context.location?.country ?? 'Unknown';

        let ruleMatch = false;
        if (operator === 'eq') ruleMatch = contextValue === value;
        else if (operator === 'neq') ruleMatch = contextValue !== value;
        else if (operator === 'lt') ruleMatch = contextValue < Number(value);
        else if (operator === 'lte') ruleMatch = contextValue <= Number(value);
        else if (operator === 'gt') ruleMatch = contextValue > Number(value);
        else if (operator === 'gte') ruleMatch = contextValue >= Number(value);

        if (!ruleMatch) {
          policyTriggered = false;
          break; // AND condition fails
        }
      }

      if (policyTriggered && rules.length > 0) {
        let actions: string[] = ['ALLOW'];
        try {
          actions = JSON.parse(policy.actions);
        } catch {}

        log.debug(`Zero Trust Access Gate: Session matched policy ${policy.name} -> Actions: ${actions.join(',')}`);

        if (actions.includes('DENY')) {
          return { action: 'DENY', triggeredPolicy: policy.displayName };
        }
        if (actions.includes('MFA_CHALLENGE')) {
          return { action: 'MFA_CHALLENGE', triggeredPolicy: policy.displayName };
        }
      }
    }

    return { action: 'ALLOW' };
  }
}

export const policiesService = new PoliciesService();
export default policiesService;
