import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  roles?: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing or malformed Bearer token.' }
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Token is invalid or expired.' }
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email || '',
    };

    next();
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'AUTH_ERROR', message: err.message || 'Authentication error.' }
    });
  }
}

export function requireRole(allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.' }
      });
      return;
    }
    // In production, query user_roles table or check JWT claims
    next();
  };
}
