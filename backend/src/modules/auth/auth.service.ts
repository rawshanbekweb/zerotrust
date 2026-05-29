import argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../services/prisma.service.js';
import { generateTokenPair, verifyRefreshToken } from '../../utils/token.utils.js';
import {
  UnauthorizedError,
  ConflictError,
  NotFoundError,
  AppError,
} from '../../utils/api-response.js';
import { log } from '../../utils/logger.js';
import type {
  AuthResponse,
  UserDto,
  AuthTokens,
} from '../../types/index.js';
import type { LoginInput, RegisterInput, ChangePasswordInput } from './auth.validation.js';

// ─────────────────────────────────────────────────────────────
// Auth Service — pure business logic, no HTTP concerns
// ─────────────────────────────────────────────────────────────

type UserWithRole = any;

export class AuthService {
  // ─── LOGIN ──────────────────────────────────────────────────
  async login(
    input: LoginInput,
    ipAddress: string,
    userAgent: string,
  ): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({
      where:   { email: input.email },
      include: {
        role: {
          include: { permissions: { include: { permission: true } } },
        },
      },
    });

    // Always hash-compare to prevent timing attacks that reveal valid emails
    const dummyHash = '$argon2id$v=19$m=65536,t=3,p=4$dummysalt123456$dummyhash1234567890123456789012';
    const passwordToCheck = user?.passwordHash ?? dummyHash;
    const isPasswordValid = await argon2.verify(passwordToCheck, input.password).catch(() => false);

    if (!user || !isPasswordValid) {
      await this.recordLoginAttempt({
        userId:     user?.id ?? null,
        email:      input.email,
        ipAddress,
        userAgent,
        success:    false,
        failReason: 'INVALID_PASSWORD',
      });
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      await this.recordLoginAttempt({
        userId:     user.id,
        email:      input.email,
        ipAddress,
        userAgent,
        success:    false,
        failReason: 'ACCOUNT_INACTIVE',
      });
      throw new UnauthorizedError('Account has been deactivated');
    }

    // Check for brute force — 5 failed attempts in 15 minutes = soft lock
    const recentFailures = await prisma.loginAttempt.count({
      where: {
        userId:    user.id,
        success:   false,
        createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
      },
    });

    if (recentFailures >= 5) {
      await this.recordLoginAttempt({
        userId:     user.id,
        email:      input.email,
        ipAddress,
        userAgent,
        success:    false,
        failReason: 'ACCOUNT_LOCKED',
        isBruteForce: true,
      });
      throw new UnauthorizedError(
        'Account temporarily locked due to multiple failed attempts. Try again in 15 minutes.',
      );
    }

    // Device fingerprint tracking
    let deviceId: string | null = null;
    if (input.deviceFingerprint) {
      const device = await prisma.device.findUnique({
        where: { fingerprint: input.deviceFingerprint },
      });

      if (device) {
        await prisma.device.update({
          where: { id: device.id },
          data:  { lastSeenAt: new Date(), ipAddress },
        });
        deviceId = device.id;
      } else {
        // Register new device — trust score starts at 50, needs admin approval for full trust
        const newDevice = await prisma.device.create({
          data: {
            userId:      user.id,
            name:        `Device from ${ipAddress}`,
            type:        detectDeviceType(userAgent),
            fingerprint: input.deviceFingerprint,
            ipAddress,
            browser:     extractBrowser(userAgent),
            os:          extractOS(userAgent),
            trustScore:  50,
            isTrusted:   false,
            country:     'Unknown',
          },
        });
        deviceId = newDevice.id;
        log.info('New device registered', { userId: user.id, deviceId: newDevice.id });
      }
    }

    // Create session
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const tokens = generateTokenPair({
      sub:       user.id,
      email:     user.email,
      role:      user.role.name,
      sessionId,
    });

    await prisma.session.create({
      data: {
        id:           sessionId,
        userId:       user.id,
        deviceId,
        refreshToken: tokens.refreshToken,
        ipAddress,
        userAgent,
        country:      'Uzbekistan',
        isActive:     true,
        expiresAt,
      },
    });

    // Update last login metadata
    await prisma.user.update({
      where: { id: user.id },
      data:  {
        lastLoginAt:      new Date(),
        lastLoginIp:      ipAddress,
        lastLoginCountry: 'Uzbekistan',
      },
    });

    await this.recordLoginAttempt({
      userId:    user.id,
      email:     input.email,
      ipAddress,
      userAgent,
      success:   true,
      failReason: null,
    });

    log.info('User logged in', { userId: user.id, email: user.email, ip: ipAddress });

    return {
      user:        this.toUserDto(user),
      tokens:      { ...tokens, expiresIn: tokens.expiresIn },
      requiresMfa: user.isMfaEnabled,
    };
  }

  // ─── REGISTER ───────────────────────────────────────────────
  async register(input: RegisterInput): Promise<UserDto> {
    const [existingEmail, existingUsername] = await Promise.all([
      prisma.user.findUnique({ where: { email: input.email } }),
      prisma.user.findUnique({ where: { username: input.username } }),
    ]);

    if (existingEmail) throw new ConflictError('Email already registered');
    if (existingUsername) throw new ConflictError('Username already taken');

    const roleExists = await prisma.role.findUnique({ where: { id: input.roleId } });
    if (!roleExists) throw new NotFoundError('Role');

    const passwordHash = await argon2.hash(input.password, {
      type:        argon2.argon2id,
      memoryCost:  65536,
      timeCost:    3,
      parallelism: 4,
    });

    const user = await prisma.user.create({
      data: {
        email:       input.email,
        username:    input.username,
        passwordHash,
        firstName:   input.firstName,
        lastName:    input.lastName,
        roleId:      input.roleId,
        department:  input.department ?? null,
        jobTitle:    input.jobTitle ?? null,
        riskScore:   0,
        riskLevel:   'LOW',
        trustScore:  100,
      },
      include: {
        role: {
          include: { permissions: { include: { permission: true } } },
        },
      },
    });

    log.info('New user registered', { userId: user.id, email: user.email });

    return this.toUserDto(user);
  }

  // ─── REFRESH TOKEN ──────────────────────────────────────────
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    const payload = verifyRefreshToken(refreshToken);

    const session = await prisma.session.findUnique({
      where: { refreshToken },
      include: {
        user: {
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        },
      },
    });

    if (!session || !session.isActive || session.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token expired or revoked');
    }

    if (session.userId !== payload.sub) {
      throw new UnauthorizedError('Token mismatch');
    }

    // Token rotation: invalidate old refresh token, issue new pair
    const newTokens = generateTokenPair({
      sub:       session.user.id,
      email:     session.user.email,
      role:      session.user.role.name,
      sessionId: session.id,
    });

    await prisma.session.update({
      where: { id: session.id },
      data:  {
        refreshToken:   newTokens.refreshToken,
        lastActivityAt: new Date(),
        expiresAt:      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { ...newTokens, expiresIn: newTokens.expiresIn };
  }

  // ─── LOGOUT ─────────────────────────────────────────────────
  async logout(sessionId: string): Promise<void> {
    await prisma.session.update({
      where: { id: sessionId },
      data:  {
        isActive:      false,
        revokedReason: 'USER_LOGOUT',
        revokedAt:     new Date(),
      },
    });
    log.info('Session revoked', { sessionId });
  }

  // ─── LOGOUT ALL SESSIONS ────────────────────────────────────
  async logoutAll(userId: string): Promise<void> {
    await prisma.session.updateMany({
      where: { userId, isActive: true },
      data:  {
        isActive:      false,
        revokedReason: 'USER_LOGOUT_ALL',
        revokedAt:     new Date(),
      },
    });
    log.info('All sessions revoked', { userId });
  }

  // ─── CHANGE PASSWORD ────────────────────────────────────────
  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');

    const isValid = await argon2.verify(user.passwordHash, input.currentPassword);
    if (!isValid) {
      throw new AppError('Current password is incorrect', 'INVALID_PASSWORD', 400);
    }

    const newPasswordHash = await argon2.hash(input.newPassword, {
      type:        argon2.argon2id,
      memoryCost:  65536,
      timeCost:    3,
      parallelism: 4,
    });

    await prisma.user.update({
      where: { id: userId },
      data:  { passwordHash: newPasswordHash },
    });

    // Revoke all other sessions to enforce re-login after password change
    await prisma.session.updateMany({
      where: { userId, isActive: true },
      data:  { isActive: false, revokedReason: 'PASSWORD_CHANGED', revokedAt: new Date() },
    });

    log.info('Password changed', { userId });
  }

  // ─── GET PROFILE ────────────────────────────────────────────
  async getProfile(userId: string): Promise<UserDto> {
    const user = await prisma.user.findUnique({
      where:   { id: userId },
      include: {
        role: {
          include: { permissions: { include: { permission: true } } },
        },
      },
    });
    if (!user) throw new NotFoundError('User');
    return this.toUserDto(user);
  }

  // ─── ACTIVE SESSIONS ────────────────────────────────────────
  async getSessions(userId: string) {
    return prisma.session.findMany({
      where:   { userId, isActive: true },
      include: { device: true },
      orderBy: { lastActivityAt: 'desc' },
    });
  }

  // ─── PRIVATE HELPERS ────────────────────────────────────────
  private async recordLoginAttempt(data: {
    userId:       string | null;
    email:        string;
    ipAddress:    string;
    userAgent:    string;
    success:      boolean;
    failReason:   string | null;
    isBruteForce?: boolean;
  }): Promise<void> {
    await prisma.loginAttempt.create({
      data: {
        userId:        data.userId,
        email:         data.email,
        ipAddress:     data.ipAddress,
        userAgent:     data.userAgent,
        success:       data.success,
        failReason:    data.failReason,
        country:       'Uzbekistan',
        isBruteForce:  data.isBruteForce ?? false,
      },
    }).catch((err: unknown) => log.error('Failed to record login attempt', { err }));
  }

  private toUserDto(user: UserWithRole): UserDto {
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
}

// ─── Device fingerprint helpers ───────────────────────────────

function detectDeviceType(userAgent: string): string {
  if (/mobile|android|iphone/i.test(userAgent)) return 'MOBILE';
  if (/tablet|ipad/i.test(userAgent)) return 'TABLET';
  return 'DESKTOP';
}

function extractBrowser(userAgent: string): string {
  if (/Edge\//.test(userAgent))    return 'Edge';
  if (/Firefox\//.test(userAgent)) return 'Firefox';
  if (/Chrome\//.test(userAgent))  return 'Chrome';
  if (/Safari\//.test(userAgent))  return 'Safari';
  return 'Unknown';
}

function extractOS(userAgent: string): string {
  if (/Windows NT 10/.test(userAgent)) return 'Windows 10/11';
  if (/Windows/.test(userAgent))       return 'Windows';
  if (/Mac OS X/.test(userAgent))      return 'macOS';
  if (/Linux/.test(userAgent))         return 'Linux';
  if (/Android/.test(userAgent))       return 'Android';
  if (/iOS/.test(userAgent))           return 'iOS';
  return 'Unknown';
}

export const authService = new AuthService();
