import * as authService from '../services/auth.service.js';
import { success, created } from '../utils/response.js';

export async function register(req, res, next) {
  try {
    const result = await authService.registerUser(req.body);
    return created(res, result, 'Account created successfully.');
  } catch (err) { next(err); }
}

export async function login(req, res, next) {
  try {
    const result = await authService.loginUser(req.body);
    return success(res, result, 'Logged in successfully.');
  } catch (err) { next(err); }
}

export async function refresh(req, res, next) {
  try {
    const result = await authService.refreshUserTokens(req.body.refreshToken);
    return success(res, result, 'Tokens refreshed.');
  } catch (err) { next(err); }
}

export async function logout(req, res, next) {
  try {
    await authService.logoutUser(req.body.refreshToken);
    return success(res, {}, 'Logged out successfully.');
  } catch (err) { next(err); }
}

export async function getMe(req, res, next) {
  try {
    const user = await authService.getMe(req.user.id);
    return success(res, user);
  } catch (err) { next(err); }
}

export async function updateProfile(req, res, next) {
  try {
    const profile = await authService.updateProfile(req.user.id, req.body);
    return success(res, profile, 'Profile updated.');
  } catch (err) { next(err); }
}
