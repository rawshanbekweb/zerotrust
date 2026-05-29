import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🌱 Seeding Zero Trust Security Platform...');

  // ─── PERMISSIONS ──────────────────────────────────────────────
  const resources = ['users', 'devices', 'incidents', 'policies', 'analytics', 'audit', 'settings', 'alerts', 'roles'];
  const actions   = ['create', 'read', 'update', 'delete', 'manage'];

  const permissions = await Promise.all(
    resources.flatMap((resource) =>
      actions.map((action) =>
        prisma.permission.upsert({
          where:  { action_resource: { action, resource } },
          update: {},
          create: { action, resource, description: `${action} ${resource}` },
        }),
      ),
    ),
  );

  console.log(`✅ ${permissions.length} permissions created`);

  // ─── ROLES ────────────────────────────────────────────────────
  const superAdminRole = await prisma.role.upsert({
    where:  { name: 'SUPER_ADMIN' },
    update: {},
    create: {
      name:        'SUPER_ADMIN',
      displayName: 'Super Administrator',
      description: 'Full platform access — reserved for platform owners',
      color:       '#a855f7',
      isSystem:    true,
    },
  });

  const adminRole = await prisma.role.upsert({
    where:  { name: 'ADMIN' },
    update: {},
    create: {
      name:        'ADMIN',
      displayName: 'Administrator',
      description: 'Organization-level administrator',
      color:       '#3b82f6',
      isSystem:    true,
    },
  });

  const analystRole = await prisma.role.upsert({
    where:  { name: 'ANALYST' },
    update: {},
    create: {
      name:        'ANALYST',
      displayName: 'Security Analyst',
      description: 'Can view and manage incidents, alerts, and reports',
      color:       '#06b6d4',
      isSystem:    true,
    },
  });

  const viewerRole = await prisma.role.upsert({
    where:  { name: 'VIEWER' },
    update: {},
    create: {
      name:        'VIEWER',
      displayName: 'Viewer',
      description: 'Read-only access to dashboards and reports',
      color:       '#64748b',
      isSystem:    true,
    },
  });

  // Assign all permissions to SUPER_ADMIN
  for (const perm of permissions) {
    await prisma.rolePermission.upsert({
      where:  { roleId_permissionId: { roleId: superAdminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: superAdminRole.id, permissionId: perm.id },
    });
  }

  // ADMIN: all except settings.delete
  const adminPerms = permissions.filter(
    (p) => !(p.resource === 'settings' && p.action === 'delete'),
  );
  for (const perm of adminPerms) {
    await prisma.rolePermission.upsert({
      where:  { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id },
    });
  }

  // ANALYST: read everything + manage incidents/alerts
  const analystPerms = permissions.filter(
    (p) =>
      p.action === 'read' ||
      (p.resource === 'incidents' && ['create', 'update'].includes(p.action)) ||
      (p.resource === 'alerts' && ['create', 'update'].includes(p.action)),
  );
  for (const perm of analystPerms) {
    await prisma.rolePermission.upsert({
      where:  { roleId_permissionId: { roleId: analystRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: analystRole.id, permissionId: perm.id },
    });
  }

  // VIEWER: read only
  const viewerPerms = permissions.filter((p) => p.action === 'read');
  for (const perm of viewerPerms) {
    await prisma.rolePermission.upsert({
      where:  { roleId_permissionId: { roleId: viewerRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: viewerRole.id, permissionId: perm.id },
    });
  }

  console.log('✅ Roles and permissions configured');

  // ─── USERS ─────────────────────────────────────────────────
  const adminPassword = await argon2.hash('Admin@ZeroTrust2024');
  const userPassword  = await argon2.hash('User@ZeroTrust2024');

  const users = [
    {
      email:       'admin@zerotrust.uz',
      username:    'superadmin',
      firstName:   'Alisher',
      lastName:    'Nazarov',
      department:  'IT Security',
      jobTitle:    'Chief Information Security Officer',
      roleId:      superAdminRole.id,
      riskScore:   5,
      riskLevel:   'LOW',
      trustScore:  98,
      isActive:    true,
      passwordHash: adminPassword,
    },
    {
      email:       'security.admin@zerotrust.uz',
      username:    'secadmin',
      firstName:   'Dilnoza',
      lastName:    'Yusupova',
      department:  'Information Security',
      jobTitle:    'Security Administrator',
      roleId:      adminRole.id,
      riskScore:   12,
      riskLevel:   'LOW',
      trustScore:  92,
      isActive:    true,
      passwordHash: adminPassword,
    },
    {
      email:       'analyst.tashkent@zerotrust.uz',
      username:    'analyst_tashkent',
      firstName:   'Jasur',
      lastName:    'Rakhimov',
      department:  'SOC',
      jobTitle:    'Security Analyst',
      roleId:      analystRole.id,
      riskScore:   18,
      riskLevel:   'LOW',
      trustScore:  85,
      isActive:    true,
      passwordHash: userPassword,
    },
    {
      email:       'm.karimov@nationalbank.uz',
      username:    'm_karimov',
      firstName:   'Murod',
      lastName:    'Karimov',
      department:  'Finance',
      jobTitle:    'Financial Analyst',
      roleId:      viewerRole.id,
      riskScore:   45,
      riskLevel:   'MEDIUM',
      trustScore:  65,
      isActive:    true,
      passwordHash: userPassword,
    },
    {
      email:       's.mirzayev@tashkentstate.uz',
      username:    's_mirzayev',
      firstName:   'Sanjar',
      lastName:    'Mirzayev',
      department:  'IT Department',
      jobTitle:    'System Administrator',
      roleId:      analystRole.id,
      riskScore:   72,
      riskLevel:   'HIGH',
      trustScore:  35,
      isActive:    true,
      passwordHash: userPassword,
    },
    {
      email:       'f.toshmatova@ministry.gov.uz',
      username:    'f_toshmatova',
      firstName:   'Feruza',
      lastName:    'Toshmatova',
      department:  'Digital Transformation',
      jobTitle:    'IT Specialist',
      roleId:      viewerRole.id,
      riskScore:   28,
      riskLevel:   'LOW',
      trustScore:  78,
      isActive:    true,
      passwordHash: userPassword,
    },
    {
      email:       'suspicious@external.net',
      username:    'ext_user_007',
      firstName:   'Unknown',
      lastName:    'External',
      department:  'External',
      jobTitle:    'Contractor',
      roleId:      viewerRole.id,
      riskScore:   88,
      riskLevel:   'CRITICAL',
      trustScore:  10,
      isActive:    false,
      passwordHash: userPassword,
    },
  ];

  const createdUsers = [];
  for (const userData of users) {
    const user = await prisma.user.upsert({
      where:  { email: userData.email },
      update: {},
      create: {
        ...userData,
        isEmailVerified: true,
        lastLoginAt:     new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        lastLoginIp:     `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        lastLoginCity:   ['Tashkent', 'Samarkand', 'Bukhara', 'Namangan', 'Andijan'][Math.floor(Math.random() * 5)],
        lastLoginCountry: 'Uzbekistan',
      },
    });
    createdUsers.push(user);
  }

  console.log(`✅ ${createdUsers.length} users created`);

  // ─── DEVICES ──────────────────────────────────────────────────
  const deviceTypes = ['DESKTOP', 'MOBILE', 'LAPTOP'] as const;
  const browsers    = ['Chrome', 'Firefox', 'Edge', 'Safari'];
  const oses        = ['Windows 11', 'Windows 10', 'macOS 14', 'Ubuntu 22.04', 'Android 14', 'iOS 17'];
  const cities      = ['Tashkent', 'Samarkand', 'Bukhara', 'Namangan', 'Andijan', 'Fergana'];

  for (const user of createdUsers.slice(0, 5)) {
    const deviceCount = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < deviceCount; i++) {
      const trustScore = user.trustScore - Math.floor(Math.random() * 20);
      await prisma.device.upsert({
        where:  { fingerprint: `fp_${user.id}_${i}` },
        update: {},
        create: {
          userId:      user.id,
          name:        `${user.firstName}'s ${deviceTypes[i % 3]}`,
          type:        deviceTypes[i % 3],
          os:          oses[Math.floor(Math.random() * oses.length)] ?? 'Windows 11',
          browser:     browsers[Math.floor(Math.random() * browsers.length)] ?? 'Chrome',
          fingerprint: `fp_${user.id}_${i}`,
          ipAddress:   `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          city:        cities[Math.floor(Math.random() * cities.length)] ?? 'Tashkent',
          country:     'Uzbekistan',
          trustScore:  Math.max(0, trustScore),
          isTrusted:   trustScore > 60,
          isBlocked:   trustScore < 20,
        },
      });
    }
  }

  console.log('✅ Devices registered');

  // ─── SECURITY POLICIES ────────────────────────────────────────
  const policies = [
    {
      name:        'zero-trust-baseline',
      displayName: 'Zero Trust Baseline Policy',
      description: 'Core Zero Trust policy — deny all by default, allow only verified identities from trusted devices',
      type:        'ACCESS',
      category:    'ZERO_TRUST',
      rules:       JSON.stringify([
        { field: 'user.isActive', operator: 'eq', value: true },
        { field: 'device.isTrusted', operator: 'eq', value: true },
        { field: 'user.riskScore', operator: 'lt', value: 70 },
      ]),
      conditions:  JSON.stringify({ operator: 'AND' }),
      actions:     JSON.stringify(['ALLOW']),
      priority:    100,
      isSystem:    true,
    },
    {
      name:        'high-risk-mfa-required',
      displayName: 'High Risk — MFA Required',
      description: 'Force MFA challenge for users with risk score above 50',
      type:        'MFA',
      category:    'ZERO_TRUST',
      rules:       JSON.stringify([
        { field: 'user.riskScore', operator: 'gte', value: 50 },
      ]),
      conditions:  JSON.stringify({ operator: 'AND' }),
      actions:     JSON.stringify(['MFA_CHALLENGE']),
      priority:    90,
      isSystem:    false,
    },
    {
      name:        'block-critical-risk',
      displayName: 'Block Critical Risk Users',
      description: 'Deny access and notify SOC for users at critical risk level',
      type:        'ACCESS',
      category:    'ZERO_TRUST',
      rules:       JSON.stringify([
        { field: 'user.riskScore', operator: 'gte', value: 85 },
      ]),
      conditions:  JSON.stringify({ operator: 'AND' }),
      actions:     JSON.stringify(['DENY', 'NOTIFY']),
      priority:    100,
      isSystem:    false,
    },
    {
      name:        'block-untrusted-device',
      displayName: 'Block Untrusted Devices',
      description: 'Quarantine sessions from unregistered or low-trust devices',
      type:        'DEVICE',
      category:    'ZERO_TRUST',
      rules:       JSON.stringify([
        { field: 'device.trustScore', operator: 'lt', value: 30 },
      ]),
      conditions:  JSON.stringify({ operator: 'AND' }),
      actions:     JSON.stringify(['DENY', 'NOTIFY']),
      priority:    95,
      isSystem:    false,
    },
    {
      name:        'uzbekistan-geo-restriction',
      displayName: 'Geographic Access Restriction',
      description: 'Alert and require step-up auth for logins outside Uzbekistan',
      type:        'NETWORK',
      category:    'COMPLIANCE',
      rules:       JSON.stringify([
        { field: 'location.country', operator: 'neq', value: 'Uzbekistan' },
      ]),
      conditions:  JSON.stringify({ operator: 'AND' }),
      actions:     JSON.stringify(['MFA_CHALLENGE', 'NOTIFY']),
      priority:    85,
      isSystem:    false,
    },
    {
      name:        'session-timeout-policy',
      displayName: 'Session Timeout — 8 Hours',
      description: 'Automatically terminate inactive sessions after 8 hours',
      type:        'SESSION',
      category:    'COMPLIANCE',
      rules:       JSON.stringify([
        { field: 'session.idleMinutes', operator: 'gt', value: 480 },
      ]),
      conditions:  JSON.stringify({ operator: 'AND' }),
      actions:     JSON.stringify(['DENY']),
      priority:    70,
      isSystem:    false,
    },
  ];

  for (const policy of policies) {
    await prisma.securityPolicy.upsert({
      where:  { name: policy.name },
      update: {},
      create: policy,
    });
  }

  console.log('✅ Security policies seeded');

  // ─── INCIDENTS ────────────────────────────────────────────────
  const adminUser = createdUsers[0];
  const analystUser = createdUsers[2];

  const incidents = [
    {
      title:        'Brute Force Attack — National Bank Portal',
      description:  '147 failed login attempts from IP 185.220.101.42 (Tor exit node) targeting finance department accounts over a 12-minute window.',
      type:         'BRUTE_FORCE',
      severity:     'HIGH',
      status:       'INVESTIGATING',
      sourceIp:     '185.220.101.42',
      mitreTactic:  'Credential Access',
      mitreTechnique: 'T1110.001 — Password Guessing',
      isSimulated:  false,
      assignedToId: analystUser?.id,
      createdById:  adminUser?.id,
    },
    {
      title:        'Impossible Travel Detected — Ministry of Finance',
      description:  'User f.toshmatova authenticated from Tashkent (08:42 UTC+5) then from Frankfurt, Germany (09:15 UTC+1). Physical travel impossible in 33 minutes.',
      type:         'IMPOSSIBLE_TRAVEL',
      severity:     'CRITICAL',
      status:       'OPEN',
      sourceIp:     '91.148.128.45',
      mitreTactic:  'Initial Access',
      mitreTechnique: 'T1078 — Valid Accounts',
      isSimulated:  false,
      affectedUserId: createdUsers[5]?.id,
      createdById:  adminUser?.id,
    },
    {
      title:        'Suspicious Device Registration — New Unrecognized Hardware',
      description:  'Analyst account s.mirzayev registered 3 new devices within 2 hours from different IP ranges. Pattern consistent with account takeover preparation.',
      type:         'SUSPICIOUS_DEVICE',
      severity:     'MEDIUM',
      status:       'OPEN',
      sourceIp:     '95.214.55.128',
      mitreTactic:  'Persistence',
      mitreTechnique: 'T1098 — Account Manipulation',
      isSimulated:  true,
      affectedUserId: createdUsers[4]?.id,
      createdById:  adminUser?.id,
    },
    {
      title:        'Privilege Escalation Attempt — Tashkent University',
      description:  'User attempted to access SUPER_ADMIN API endpoints using a valid VIEWER token. 23 unauthorized API calls blocked by RBAC guard.',
      type:         'PRIVILEGE_ESCALATION',
      severity:     'HIGH',
      status:       'CONTAINED',
      sourceIp:     '212.72.74.100',
      mitreTactic:  'Privilege Escalation',
      mitreTechnique: 'T1078.003 — Local Accounts',
      isSimulated:  false,
      assignedToId: analystUser?.id,
      createdById:  adminUser?.id,
    },
    {
      title:        '[SIM] SQL Injection Probe — API Gateway',
      description:  'Automated scan detected SQL injection patterns in authentication endpoint. 8 distinct payloads attempted. All blocked by input sanitization.',
      type:         'SQL_INJECTION',
      severity:     'MEDIUM',
      status:       'RESOLVED',
      sourceIp:     '45.33.32.156',
      mitreTactic:  'Initial Access',
      mitreTechnique: 'T1190 — Exploit Public-Facing Application',
      isSimulated:  true,
      createdById:  adminUser?.id,
    },
  ];

  const createdIncidents = [];
  for (const incident of incidents) {
    const created = await prisma.incident.create({
      data: {
        ...incident,
        detectedAt: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000),
        resolvedAt: incident.status === 'RESOLVED'
          ? new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000)
          : null,
      },
    });
    createdIncidents.push(created);
  }

  console.log(`✅ ${createdIncidents.length} incidents seeded`);

  // ─── ALERTS ───────────────────────────────────────────────────
  const alerts = [
    { type: 'BRUTE_FORCE',        severity: 'HIGH',     title: 'Brute Force Attack Detected',          description: '147 failed logins from 185.220.101.42 in 12 minutes',  sourceIp: '185.220.101.42' },
    { type: 'IMPOSSIBLE_TRAVEL',  severity: 'CRITICAL', title: 'Impossible Travel Alert',              description: 'User authenticated from 2 countries 33 minutes apart',   sourceIp: '91.148.128.45'  },
    { type: 'HIGH_RISK_USER',     severity: 'HIGH',     title: 'User Risk Score Critical Threshold',   description: 'User ext_user_007 risk score reached 88/100',            sourceIp: null             },
    { type: 'NEW_DEVICE',         severity: 'MEDIUM',   title: 'Unrecognized Device Login',            description: 'New device registered from unknown location',           sourceIp: '95.214.55.128'  },
    { type: 'POLICY_VIOLATION',   severity: 'HIGH',     title: 'Policy Violation — Geo Restriction',  description: 'Access denied for login outside Uzbekistan',            sourceIp: '91.148.128.45'  },
    { type: 'SESSION_ANOMALY',    severity: 'MEDIUM',   title: 'Abnormal Session Activity',            description: 'Session from Tashkent user accessing resources at 3AM',  sourceIp: '10.0.0.45'      },
    { type: 'MFA_BYPASS_ATTEMPT', severity: 'CRITICAL', title: 'MFA Bypass Attempt Blocked',           description: 'Repeated MFA code submission with expired tokens',      sourceIp: '178.62.240.49'  },
    { type: 'PRIVILEGE_ESCALATION', severity: 'HIGH',   title: 'Unauthorized Admin Access Attempt',   description: '23 blocked requests to admin endpoints with viewer token', sourceIp: '212.72.74.100' },
  ];

  for (const alert of alerts) {
    await prisma.alert.create({
      data: {
        ...alert,
        createdAt: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000),
        isRead: Math.random() > 0.6,
      },
    });
  }

  console.log(`✅ ${alerts.length} alerts seeded`);

  // ─── AUDIT LOGS ───────────────────────────────────────────────
  const auditEntries = [
    { action: 'USER_LOGIN',           resource: 'users',    severity: 'INFO',     description: 'Successful login from Tashkent' },
    { action: 'POLICY_UPDATED',       resource: 'policies', severity: 'WARNING',  description: 'Security policy "zero-trust-baseline" modified' },
    { action: 'USER_BLOCKED',         resource: 'users',    severity: 'CRITICAL', description: 'User ext_user_007 blocked — critical risk score' },
    { action: 'DEVICE_TRUSTED',       resource: 'devices',  severity: 'INFO',     description: 'Device approved by administrator' },
    { action: 'INCIDENT_CREATED',     resource: 'incidents', severity: 'WARNING', description: 'New incident: Brute Force Attack detected' },
    { action: 'MFA_ENABLED',          resource: 'users',    severity: 'INFO',     description: 'MFA enabled for user analyst.tashkent' },
    { action: 'SESSION_TERMINATED',   resource: 'sessions', severity: 'WARNING',  description: 'Session force-terminated — suspicious activity' },
    { action: 'ROLE_ASSIGNED',        resource: 'roles',    severity: 'INFO',     description: 'Role ANALYST assigned to new user' },
    { action: 'API_KEY_CREATED',      resource: 'settings', severity: 'INFO',     description: 'New API integration key generated' },
    { action: 'LOGIN_FAILED',         resource: 'users',    severity: 'WARNING',  description: 'Failed login — invalid credentials (attempt 3/5)' },
    { action: 'PRIVILEGE_ESCALATION', resource: 'users',    severity: 'CRITICAL', description: 'Unauthorized admin endpoint access blocked' },
    { action: 'DATA_EXPORT',          resource: 'audit',    severity: 'WARNING',  description: 'Audit log export initiated by admin' },
  ];

  const ips = ['10.0.0.1', '10.0.0.45', '95.214.55.128', '185.220.101.42', '91.148.128.45'];
  for (let i = 0; i < auditEntries.length; i++) {
    const entry = auditEntries[i];
    if (!entry) continue;
    const user = createdUsers[i % createdUsers.length];
    if (!user) continue;
    await prisma.auditLog.create({
      data: {
        userId:      user.id,
        action:      entry.action,
        resource:    entry.resource,
        description: entry.description,
        severity:    entry.severity,
        ipAddress:   ips[i % ips.length] ?? '10.0.0.1',
        createdAt:   new Date(Date.now() - i * 3 * 60 * 60 * 1000),
      },
    });
  }

  console.log('✅ Audit logs seeded');

  // ─── RISK PROFILES ────────────────────────────────────────────
  for (const user of createdUsers) {
    await prisma.riskProfile.upsert({
      where:  { userId: user.id },
      update: {},
      create: {
        userId:       user.id,
        currentScore: user.riskScore,
        level:        user.riskLevel,
        factors:      JSON.stringify([
          { id: 'login_failures',       name: 'Recent Login Failures',     score: 15, weight: 1.0 },
          { id: 'unusual_time',         name: 'Unusual Login Time',        score: 10, weight: 0.8 },
          { id: 'new_device',           name: 'New/Unrecognized Device',   score: 20, weight: 1.2 },
          { id: 'geo_anomaly',          name: 'Geographic Anomaly',        score: 25, weight: 1.5 },
        ].filter(() => Math.random() > 0.5)),
      },
    });
  }

  console.log('✅ Risk profiles created');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Login Credentials:');
  console.log('   Super Admin: admin@zerotrust.uz / Admin@ZeroTrust2024');
  console.log('   Security Admin: security.admin@zerotrust.uz / Admin@ZeroTrust2024');
  console.log('   Analyst: analyst.tashkent@zerotrust.uz / User@ZeroTrust2024');
  console.log('   Viewer: m.karimov@nationalbank.uz / User@ZeroTrust2024');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    void prisma.$disconnect();
    process.exit(1);
  });
