import { prisma } from '../../services/prisma.service.js';
import { NotFoundError, ConflictError } from '../../utils/api-response.js';
import { parsePagination } from '../../utils/pagination.js';
import type { UserDto, UpdateUserDto } from '../../types/index.js';
import type { Request } from 'express';
type UserWithRole = any;

function toUserDto(user: UserWithRole): UserDto {
  return {
    id:               user.id,
    email:            user.email,
    username:         user.username,
    firstName:        user.firstName,
    lastName:         user.lastName,
    fullName:         `${user.firstName} ${user.lastName}`,
    avatar:           user.avatar,
    department:       user.department,
    jobTitle:         user.jobTitle,
    isActive:         user.isActive,
    isMfaEnabled:     user.isMfaEnabled,
    riskScore:        user.riskScore,
    riskLevel:        user.riskLevel as UserDto['riskLevel'],
    trustScore:       user.trustScore,
    role: {
      id:          user.role.id,
      name:        user.role.name,
      displayName: user.role.displayName,
      description: user.role.description,
      color:       user.role.color,
      permissions: user.role.permissions.map((rp: any) => ({
        id:          rp.permission.id,
        action:      rp.permission.action,
        resource:    rp.permission.resource,
        description: rp.permission.description,
      })),
    },
    lastLoginAt:      user.lastLoginAt?.toISOString() ?? null,
    lastLoginIp:      user.lastLoginIp,
    lastLoginCity:    user.lastLoginCity,
    lastLoginCountry: user.lastLoginCountry,
    createdAt:        user.createdAt.toISOString(),
  };
}

const include = {
  role: {
    include: { permissions: { include: { permission: true } } },
  },
} as const;

export class UsersService {
  async findAll(req: Request) {
    const { page, limit, skip, sortBy, sortOrder, search } = parsePagination(req);

    const where = search
      ? {
          OR: [
            { email:     { contains: search } },
            { username:  { contains: search } },
            { firstName: { contains: search } },
            { lastName:  { contains: search } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return { users: users.map(toUserDto), total, page, limit };
  }

  async findById(id: string): Promise<UserDto> {
    const user = await prisma.user.findUnique({ where: { id }, include });
    if (!user) throw new NotFoundError('User');
    return toUserDto(user);
  }

  async update(id: string, data: UpdateUserDto): Promise<UserDto> {
    const exists = await prisma.user.findUnique({ where: { id } });
    if (!exists) throw new NotFoundError('User');

    if (data.roleId) {
      const role = await prisma.role.findUnique({ where: { id: data.roleId } });
      if (!role) throw new NotFoundError('Role');
    }

    const user = await prisma.user.update({
      where: { id },
      data:  {
        firstName:  data.firstName,
        lastName:   data.lastName,
        department: data.department,
        jobTitle:   data.jobTitle,
        isActive:   data.isActive,
        roleId:     data.roleId,
      } as any,
      include: include as any,
    });

    return toUserDto(user);
  }

  async deactivate(id: string, requesterId: string): Promise<void> {
    if (id === requesterId) {
      throw new ConflictError('Cannot deactivate your own account');
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('User');

    await prisma.user.update({ where: { id }, data: { isActive: false } });

    // Revoke all active sessions
    await prisma.session.updateMany({
      where: { userId: id, isActive: true },
      data:  { isActive: false, revokedReason: 'ACCOUNT_DEACTIVATED', revokedAt: new Date() },
    });
  }

  async getRiskProfile(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');

    const [profile, history] = await Promise.all([
      prisma.riskProfile.findUnique({ where: { userId } }),
      prisma.riskScoreHistory.findMany({
        where:   { userId },
        orderBy: { createdAt: 'desc' },
        take:    30,
      }),
    ]);

    return { profile, history };
  }

  async getLoginHistory(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');

    return prisma.loginAttempt.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      take:    50,
    });
  }

  async getRoles() {
    return prisma.role.findMany({
      include: { permissions: { include: { permission: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async getStats() {
    const [total, active, highRisk, byRole] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { riskLevel: { in: ['HIGH', 'CRITICAL'] } } }),
      prisma.user.groupBy({ by: ['riskLevel'], _count: true }),
    ]);

    return { total, active, highRisk, byRiskLevel: byRole };
  }
}

export const usersService = new UsersService();
