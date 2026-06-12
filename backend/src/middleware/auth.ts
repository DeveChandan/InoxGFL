import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_inoxgfl_2026';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
  console.log('[Auth Middleware] Headers Received:', JSON.stringify(req.headers));
  const customToken = req.headers['x-inoxgfl-token'] as string;
  console.log('[Auth Middleware] customToken extracted:', !!customToken);
  
  if (customToken) {
    try {
      const decoded = jwt.verify(customToken, JWT_SECRET) as any;
      req.user = req.user || {};
      req.user.role = decoded.role;
      req.user.email = decoded.email;
      req.user.vendor_code = decoded.vendor_code;
      console.log('[Auth Middleware] Successfully verified custom token. Role:', req.user.role, 'VendorCode:', req.user.vendor_code);
      return next();
    } catch (e: any) {
      console.warn('[Auth Middleware] Invalid custom token, error:', e.message);
    }
  }
  
  // Local Development Fallback:
  // If there is no token (running locally without Approuter), grant mock access
  if (process.env.NODE_ENV !== 'production' && !req.user) {
    req.user = { 
      email: 'vineet.kumar@gfl.co.in', 
      role: 'SUPER_ADMIN',
      name: 'Local Dev User'
    };
    return next();
  }

  // If no custom token and no local dev, check if passport XSUAA populated req.user
  if (req.user) {
    const userEmail = (req.user.email || req.user.id || '').toLowerCase();
    
    // BULLETPROOF FIX: If this is the master admin, guarantee their role
    if (userEmail === 'vineet.kumar@gfl.co.in' && !req.user.role) {
      req.user.role = 'SUPER_ADMIN';
      console.log('[Auth Middleware] Bulletproof: Granted SUPER_ADMIN to', userEmail);
    } else if (!req.user.role) {
      req.user.role = 'EMPLOYEE';
      console.log('[Auth Middleware] Bulletproof: Defaulted to EMPLOYEE for', userEmail);
    }

    return next();
  }

  res.status(401).json({ message: 'Unauthorized: No active SAP session found' });
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
};
