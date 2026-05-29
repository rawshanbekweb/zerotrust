import { z } from 'zod';

export const LoginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email format')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
  deviceFingerprint: z.string().optional(),
});

export const RegisterSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email format')
    .toLowerCase()
    .trim(),
  username: z
    .string({ required_error: 'Username is required' })
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-z0-9_]+$/i, 'Username can only contain letters, numbers, and underscores')
    .trim(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[@$!%*?&#^()]/, 'Password must contain at least one special character'),
  firstName: z
    .string({ required_error: 'First name is required' })
    .min(1, 'First name is required')
    .max(50)
    .trim(),
  lastName: z
    .string({ required_error: 'Last name is required' })
    .min(1, 'Last name is required')
    .max(50)
    .trim(),
  roleId: z.string({ required_error: 'Role is required' }).cuid('Invalid role ID'),
  department: z.string().max(100).trim().optional(),
  jobTitle: z.string().max(100).trim().optional(),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string({ required_error: 'Refresh token is required' }).min(1),
});

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain uppercase')
      .regex(/[a-z]/, 'Must contain lowercase')
      .regex(/[0-9]/, 'Must contain a number')
      .regex(/[@$!%*?&#^()]/, 'Must contain a special character'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type LoginInput          = z.infer<typeof LoginSchema>;
export type RegisterInput       = z.infer<typeof RegisterSchema>;
export type RefreshTokenInput   = z.infer<typeof RefreshTokenSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
