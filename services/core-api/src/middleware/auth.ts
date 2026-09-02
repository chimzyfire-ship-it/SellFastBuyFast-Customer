import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { db } from '../db/client.js';
import { userRoles, merchantMembers } from '../db/schema.js';
import { and, eq } from 'drizzle-orm';
import { errors } from '../lib/errors.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  roles: string[];
  merchantIds: string[];
  merchantRoles: Record<string, string>;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const BUYER_ROLE = 'buyer';

const STAFF_ROLES = [
  'support_agent',
  'catalogue_moderator',
  'finance_reviewer',
  'operations_admin',
  'security_admin',
];

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw errors.unauthorized('Missing or malformed Bearer token.');
    }

    const token = authHeader.split(' ')[1];
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      throw errors.unauthorized('Token is invalid or expired.');
    }

    const [roles, memberships] = await Promise.all([
      db.select({ role: userRoles.role }).from(userRoles).where(eq(userRoles.userId, user.id)),
      db
        .select({ merchantId: merchantMembers.merchantId, role: merchantMembers.role })
        .from(merchantMembers)
        .where(eq(merchantMembers.userId, user.id)),
    ]);

    const granted = new Set<string>([BUYER_ROLE]);
    for (const r of roles) granted.add(r.role);
    for (const m of memberships) {
      granted.add(m.role === 'owner' ? 'merchant_owner' : 'merchant_staff');
    }

    req.user = {
      id: user.id,
      email: user.email ?? '',
      roles: Array.from(granted),
      merchantIds: memberships.map((m) => m.merchantId),
      merchantRoles: Object.fromEntries(memberships.map((m) => [m.merchantId, m.role])),
    };

    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...allowed: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(errors.unauthorized());
      return;
    }
    const isStaff = req.user.roles.some((r) => STAFF_ROLES.includes(r));
    const allowedSet = new Set(allowed);
    const ok = req.user.roles.some((r) => allowedSet.has(r)) || (allowed.includes('staff') && isStaff);
    if (!ok) {
      next(errors.forbidden());
      return;
    }
    next();
  };
}

export function requireMerchantAccess(merchantIdParam = 'merchantId') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(errors.unauthorized());
      return;
    }
    const merchantId = req.params[merchantIdParam] ?? req.body?.[merchantIdParam];
    if (!merchantId) {
      next(errors.validation('Merchant id is required.'));
      return;
    }
    const isPlatformStaff = req.user.roles.some((r) => STAFF_ROLES.includes(r));
    if (!isPlatformStaff && !req.user.merchantIds.includes(merchantId)) {
      next(errors.forbidden('You do not belong to this merchant.'));
      return;
    }
    next();
  };
}
