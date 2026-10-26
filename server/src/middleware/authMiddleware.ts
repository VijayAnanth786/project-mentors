import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User, UserRole, UserStatus } from '../models/User';
import { db } from '../db/database';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  department?: string;
  mustChangePassword?: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_replace_in_production';
    const decoded = jwt.verify(token, secret) as any;

    let userDoc: any = null;
    if (mongoose.connection.readyState === 1) {
      try {
        userDoc = await User.findById(decoded.id);
      } catch {}
    }

    if (!userDoc) {
      try {
        const row = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id) as any;
        if (row) {
          userDoc = {
            _id: row.id,
            id: row.id,
            name: row.name,
            email: row.email,
            role: row.role,
            status: row.status.toUpperCase(),
            department: 'Computer Science',
            mustChangePassword: false
          };
        }
      } catch {}
    }

    // In serverless multi-container environments, respect verified signed JWT token claims
    if (!userDoc && decoded && decoded.id && decoded.email) {
      userDoc = {
        _id: decoded.id,
        id: decoded.id,
        name: decoded.name || 'User',
        email: decoded.email,
        role: decoded.role || 'student',
        status: 'ACTIVE',
        department: decoded.department || 'Computer Science',
        mustChangePassword: false
      };
    }

    if (!userDoc) {
      res.status(401).json({ success: false, message: 'User not found or session invalid.' });
      return;
    }

    if (userDoc.status === 'BLOCKED' || userDoc.status === 'INACTIVE') {
      res.status(403).json({ success: false, message: 'Account is blocked. Please contact an administrator.' });
      return;
    }

    req.user = {
      id: userDoc.id || userDoc._id.toString(),
      name: userDoc.name,
      email: userDoc.email,
      role: (userDoc.role.toLowerCase() as UserRole),
      status: (userDoc.status.toLowerCase() as UserStatus),
      department: userDoc.department,
      mustChangePassword: userDoc.mustChangePassword
    };

    // If user must change password, restrict them from protected operational routes
    if (
      userDoc.mustChangePassword &&
      !req.path.includes('/change-password') &&
      !req.path.includes('/me') &&
      !req.path.includes('/logout')
    ) {
      res.status(403).json({
        success: false,
        mustChangePassword: true,
        message: 'Password change required before accessing other dashboard resources.'
      });
      return;
    }

    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Session expired or token invalid.' });
  }
};

export const requireRoles = (...allowedRoles: Array<UserRole | 'student' | 'mentor' | 'admin'>) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const normalizedUserRole = (req.user.role || '').toUpperCase();
    const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase());

    if (!normalizedAllowed.includes(normalizedUserRole)) {
      res.status(403).json({
        success: false,
        message: `Forbidden: Access requires ${allowedRoles.join(' or ')} privileges.`
      });
      return;
    }

    next();
  };
};

// Aliases for compatibility
export const authenticateJWT = authenticate;
