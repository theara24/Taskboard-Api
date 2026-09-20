import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { ApiResponse } from '../utils/api-response';
import { ApiError } from '../utils/api-error';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.register(req.body);
      ApiResponse.created(res, result, 'User registered successfully');
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.login(req.body);
      ApiResponse.success(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized();
      }
      const user = await AuthService.getCurrentUser(req.user.id);
      ApiResponse.success(res, user, 'User profile retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async googleAuth(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { env } = await import('../config/env');
      if (!env.GOOGLE_CLIENT_ID) {
        // Return information explaining how to set up Google OAuth or fallback to demo
        res.redirect(`${env.FRONTEND_URL}/login?error=google_oauth_not_configured`);
        return;
      }

      const params = new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        redirect_uri: env.GOOGLE_CALLBACK_URL,
        response_type: 'code',
        scope: 'openid profile email',
        access_type: 'offline',
        prompt: 'consent',
      });

      res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
    } catch (error) {
      next(error);
    }
  }

  static async googleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { env } = await import('../config/env');
      const { code } = req.query;

      if (!code || typeof code !== 'string') {
        res.redirect(`${env.FRONTEND_URL}/login?error=invalid_oauth_code`);
        return;
      }

      // Exchange code for tokens
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: env.GOOGLE_CLIENT_ID || '',
          client_secret: env.GOOGLE_CLIENT_SECRET || '',
          redirect_uri: env.GOOGLE_CALLBACK_URL,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenRes.ok) {
        res.redirect(`${env.FRONTEND_URL}/login?error=oauth_token_exchange_failed`);
        return;
      }

      const tokenData = (await tokenRes.json()) as { access_token?: string };
      if (!tokenData.access_token) {
        res.redirect(`${env.FRONTEND_URL}/login?error=no_access_token`);
        return;
      }

      // Fetch user profile from Google
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!profileRes.ok) {
        res.redirect(`${env.FRONTEND_URL}/login?error=failed_fetching_google_profile`);
        return;
      }

      const profile = (await profileRes.json()) as {
        sub: string;
        email: string;
        name?: string;
        picture?: string;
      };

      const result = await AuthService.handleGoogleAuth({
        googleId: profile.sub,
        email: profile.email,
        name: profile.name || profile.email.split('@')[0],
        avatarUrl: profile.picture,
      });

      res.redirect(
        `${env.FRONTEND_URL}/auth/callback?token=${result.token}&email=${encodeURIComponent(
          result.user.email,
        )}&name=${encodeURIComponent(result.user.name)}`,
      );
    } catch (error) {
      next(error);
    }
  }

  static async googleDemo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, name, avatarUrl } = req.body;
      if (!email) {
        throw ApiError.badRequest('Email is required for Google Demo login');
      }

      const result = await AuthService.handleGoogleAuth({
        googleId: `google-demo-${Date.now()}`,
        email,
        name: name || email.split('@')[0],
        avatarUrl:
          avatarUrl ||
          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || email)}`,
      });

      ApiResponse.success(res, result, 'Google demo login successful');
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized();
      }
      const updated = await AuthService.updateProfile(req.user.id, req.body);
      ApiResponse.success(res, updated, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized();
      }
      const result = await AuthService.changePassword(req.user.id, req.body);
      ApiResponse.success(res, result, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }
}
