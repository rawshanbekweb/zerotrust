import { get, post } from './client.js';
import type { AuthResponse, UserDto, AuthTokens } from '../types/index.js';

export const authApi = {
  login: (email: string, password: string, deviceFingerprint?: string) =>
    post<AuthResponse>('/auth/login', { email, password, deviceFingerprint }),

  register: (data: {
    email: string;
    username: string;
    password: string;
    firstName: string;
    lastName: string;
    roleId: string;
  }) => post<UserDto>('/auth/register', data),

  refresh: (refreshToken: string) =>
    post<AuthTokens>('/auth/refresh', { refreshToken }),

  logout: () =>
    post<null>('/auth/logout'),

  logoutAll: () =>
    post<null>('/auth/logout-all'),

  getProfile: () =>
    get<UserDto>('/auth/profile'),

  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) =>
    post<null>('/auth/change-password', { currentPassword, newPassword, confirmPassword }),

  getSessions: () =>
    get<unknown[]>('/auth/sessions'),
};
