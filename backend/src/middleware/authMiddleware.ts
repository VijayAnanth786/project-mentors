import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, UserRole, UserStatus } from '../models/User';
import { db } from '../db/database';
import { useMongo } from '../config/storageMode';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  department?: string;
  year?: string;
  college?: string;
  avatar?: string;
  mustChangePassword?: boolean;
  tempPasswordExpiresAt?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

const isBlockedStatus = (status: string): boolean => {
  const normalized = String(status || '').toUpperCase();
  return normalized === 'BLOCKED' || normalized === 'INACTIVE';
};

const readSqliteUser = (id: string) => {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  if (!row) return null;

  let department = 'Computer Science';
  let year = '3rd Year';
  try {
    const mentorProfile = db.prepare('SELECT department FROM mentor_profiles WHERE user_id = ?').get(row.id) as any;
    const studentProfile = db.prepare('SELECT department, year_cohort FROM student_profiles WHERE user_id = ?').get(row.id) as any;
    department = mentorProfile?.department || studentProfile?.department || department;
    year = studentProfile?.year_cohort || year;
  } catch {}

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: String(row.role).toLowerCase(),
    status: isBlockedStatus(row.status) ? 'blocked' : 'active',
    department,
    year,
    college: 'College of Engineering & Technology',
    avatar: row.avatar,
    mustChangePassword: Boolean(row.must_change_password),
    tempPasswordExpiresAt: row.temp_password_expires_at || null
  };
};

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
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      res.status(500).json({ success: false, message: 'Server authentication is not configured.' });
      return;
    }
    const decoded = jwt.verify(token, secret) as any;

    if (!decoded?.id) {
      res.status(401).json({ success: false, message: 'Session expired or token invalid.' });
      return;
    }

    // The database is authoritative for role and status. JWT claims are never
    // used as a fallback identity, so deactivated or role-changed accounts lose
    // access immediately.
    let userDoc: any = null;
    if (useMongo()) {
      userDoc = await User.findById(decoded.id);
    } else {
      userDoc = readSqliteUser(decoded.id);
    }

    if (!userDoc) {
      res.status(401).json({ success: false, message: 'User not found or session invalid.' });
      return;
    }

    if (isBlockedStatus(userDoc.status)) {
      res.status(403).json({ success: false, message: 'Account is blocked. Please contact an administrator.' });
      return;
    }

    req.user = {
      id: userDoc.id || userDoc._id.toString(),
      name: userDoc.name,
      email: userDoc.email,
      role: String(userDoc.role).toLowerCase() as UserRole,
      status: String(userDoc.status).toLowerCase() as UserStatus,
      department: userDoc.department || 'Computer Science',
      year: userDoc.year || '3rd Year',
      college: userDoc.college || 'College of Engineering & Technology',
      avatar: userDoc.avatar,
      mustChangePassword: Boolean(userDoc.mustChangePassword),
      tempPasswordExpiresAt: userDoc.tempPasswordExpiresAt
        ? new Date(userDoc.tempPasswordExpiresAt).toISOString()
        : null
    };

    const path = (req.originalUrl || req.url || '').split('?')[0];
    const isOnboardingRoute =
      path.endsWith('/auth/me') ||
      path.endsWith('/auth/change-password') ||
      path.endsWith('/auth/logout');

    // If user must change password, restrict them from protected operational routes
    if (userDoc.mustChangePassword && !isOnboardingRoute) {
      res.status(403).json({
        success: false,
        code: 'PASSWORD_CHANGE_REQUIRED',
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
