import { Router, Request, Response } from 'express';
import { validateBody } from '@core/middleware/validation.middleware';
import {
  SignupSchema,
  LoginSchema,
  RefreshTokenSchema,
  PasswordResetRequestSchema,
  PasswordResetConfirmSchema
} from './auth.schemas';
import { authService } from './auth.service';
import { jwtMiddleware, JwtAuthenticatedRequest } from './jwt.middleware';

const router = Router();

function getClientIp(req: Request): string {
  return (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || '127.0.0.1';
}

// POST /v1/auth/signup
router.post('/signup', validateBody(SignupSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await authService.signup(req.body, getClientIp(req), req.headers['user-agent']);
    res.status(201).json(result);
  } catch (error: any) {
    const status = error.message.includes('already exists') ? 409 : 400;
    res.status(status).json({ error: error.message });
  }
});

// POST /v1/auth/login
router.post('/login', validateBody(LoginSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await authService.login(req.body, getClientIp(req), req.headers['user-agent']);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

// POST /v1/auth/refresh
router.post('/refresh', validateBody(RefreshTokenSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await authService.refresh(req.body.refreshToken, getClientIp(req), req.headers['user-agent']);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

// POST /v1/auth/logout
router.post('/logout', validateBody(RefreshTokenSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    await authService.logout(req.body.refreshToken);
    res.status(200).json({ message: 'Logged out successfully.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// GET /v1/auth/me
router.get('/me', jwtMiddleware, async (req: JwtAuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const profile = await authService.getMe(req.userId!, req.merchantId!);
    res.status(200).json(profile);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /v1/auth/password/reset/request
router.post(
  '/password/reset/request',
  validateBody(PasswordResetRequestSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      await authService.requestPasswordReset(req.body);
      // Always return 200 to prevent email enumeration
      res.status(200).json({ message: 'If that email is registered, you will receive a reset link shortly.' });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to process password reset request.' });
    }
  }
);

// POST /v1/auth/password/reset/confirm
router.post(
  '/password/reset/confirm',
  validateBody(PasswordResetConfirmSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      await authService.confirmPasswordReset(req.body);
      res.status(200).json({ message: 'Password reset successfully. Please log in with your new password.' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

export default router;
