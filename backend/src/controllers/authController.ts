import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/User';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { db } from '../db/database';
import { useMongo } from '../config/storageMode';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_TEMP_ATTEMPTS = Number(process.env.TEMP_PASSWORD_MAX_ATTEMPTS || 5);

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.trim().length > 0) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production.');
  }
  return 'dev_only_jwt_secret_not_for_production';
};

const signToken = (user: any): string => {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      year: user.year,
      college: user.college
    },
    getJwtSecret(),
    { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
  );
};

const redirectForRole = (role: string): string => {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'mentor') return '/mentor/dashboard';
  return '/student/dashboard';
};

const readSqliteProfile = (userId: string) => {
  let department = 'Computer Science';
  let year = '3rd Year';
  try {
    const mentor = db.prepare('SELECT department FROM mentor_profiles WHERE user_id = ?').get(userId) as any;
    const student = db.prepare('SELECT department, year_cohort FROM student_profiles WHERE user_id = ?').get(userId) as any;
    department = mentor?.department || student?.department || department;
    year = student?.year_cohort || year;
  } catch {}
  return { department, year };
};

const fromSqlite = (row: any) => {
  if (!row) return null;
  const profile = readSqliteProfile(row.id);
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: String(row.role || 'student').toLowerCase(),
    status: String(row.status || 'active').toLowerCase(),
    department: profile.department,
    year: profile.year,
    college: 'College of Engineering & Technology',
    avatar: row.avatar || undefined,
    mustChangePassword: Boolean(row.must_change_password),
    tempPasswordExpiresAt: row.temp_password_expires_at || null,
    tempPasswordAttempts: Number(row.temp_password_attempts || 0)
  };
};

const fromMongo = (userDoc: any) => ({
  id: userDoc._id.toString(),
  name: userDoc.name,
  email: userDoc.email,
  role: String(userDoc.role).toLowerCase(),
  status: String(userDoc.status).toLowerCase(),
  department: userDoc.department || 'Computer Science',
  year: userDoc.year || '3rd Year',
  college: userDoc.college || 'College of Engineering & Technology',
  avatar: userDoc.avatar || undefined,
  mustChangePassword: Boolean(userDoc.mustChangePassword),
  tempPasswordExpiresAt: userDoc.tempPasswordExpiresAt
    ? new Date(userDoc.tempPasswordExpiresAt).toISOString()
    : null,
  tempPasswordAttempts: Number(userDoc.tempPasswordAttempts || 0)
});

const isExpired = (value: string | Date | null | undefined): boolean => {
  if (!value) return false;
  const time = new Date(value).getTime();
  return Number.isFinite(time) && Date.now() > time;
};

const isLocked = (user: any): boolean =>
  Boolean(user.mustChangePassword) && Number(user.tempPasswordAttempts || 0) >= MAX_TEMP_ATTEMPTS;

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, department, year, college } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ success: false, message: 'Name is required (at least 2 characters).' });
      return;
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, 10);
    const avatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80';
    const normalizedDepartment = typeof department === 'string' && department.trim() ? department.trim() : 'Computer Science';
    const normalizedYear = typeof year === 'string' && year.trim() ? year.trim() : '1st Year';

    if (useMongo()) {
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) {
        res.status(409).json({ success: false, message: 'An account with this email address already exists.' });
        return;
      }

      const newUser = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: 'STUDENT',
        status: 'ACTIVE',
        department: normalizedDepartment,
        year: normalizedYear,
        college: typeof college === 'string' && college.trim() ? college.trim() : 'College of Engineering & Technology',
        avatar,
        mustChangePassword: false
      });

      res.status(201).json({
        success: true,
        message: 'Student account registered successfully. Please sign in.',
        user: fromMongo(newUser)
      });
      return;
    }

    const existingLocal = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(normalizedEmail) as any;
    if (existingLocal) {
      res.status(409).json({ success: false, message: 'An account with this email address already exists.' });
      return;
    }

    const newId = `usr_s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, status, avatar)
      VALUES (?, ?, ?, ?, 'student', 'active', ?)
    `).run(newId, name.trim(), normalizedEmail, passwordHash, avatar);

    try {
      db.prepare(`
        INSERT INTO student_profiles (id, user_id, department, year_cohort)
        VALUES (?, ?, ?, ?)
      `).run(`sp_${newId}`, newId, normalizedDepartment, normalizedYear);
    } catch {}

    res.status(201).json({
      success: true,
      message: 'Student account registered successfully. Please sign in.',
      user: {
        id: newId,
        name: name.trim(),
        email: normalizedEmail,
        role: 'student',
        status: 'active',
        department: normalizedDepartment,
        year: normalizedYear,
        mustChangePassword: false
      }
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      res.status(409).json({ success: false, message: 'An account with this email address already exists.' });
      return;
    }
    console.error('[Registration Error]', error);
    res.status(500).json({ success: false, message: 'Registration failed.' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      res.status(400).json({ success: false, message: 'Email and password are required.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    let account: any = null;
    let passwordHash = '';
    let mongoDoc: any = null;
    let sqliteRow: any = null;

    if (useMongo()) {
      mongoDoc = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
      if (mongoDoc) {
        account = fromMongo(mongoDoc);
        passwordHash = mongoDoc.passwordHash;
      }
    } else {
      sqliteRow = db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(normalizedEmail) as any;
      if (sqliteRow) {
        account = fromSqlite(sqliteRow);
        passwordHash = sqliteRow.password_hash;
      }
    }

    if (!account || !passwordHash) {
      res.status(401).json({ success: false, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
      return;
    }

    if (account.status === 'blocked' || account.status === 'inactive') {
      res.status(403).json({ success: false, code: 'ACCOUNT_BLOCKED', message: 'Your account has been blocked. Please contact an administrator.' });
      return;
    }

    if (account.mustChangePassword) {
      if (isExpired(account.tempPasswordExpiresAt)) {
        res.status(403).json({
          success: false,
          code: 'TEMP_PASSWORD_EXPIRED',
          message: 'Your temporary password has expired. Ask an administrator to issue a new one.'
        });
        return;
      }
      if (isLocked(account)) {
        res.status(403).json({
          success: false,
          code: 'TEMP_PASSWORD_LOCKED',
          message: 'Too many failed attempts with this temporary password. Ask an administrator to issue a new one.'
        });
        return;
      }
    }

    const isMatch = await bcrypt.compare(password, passwordHash);
    if (!isMatch) {
      if (account.mustChangePassword) {
        const attempts = Number(account.tempPasswordAttempts || 0) + 1;
        if (mongoDoc) {
          mongoDoc.tempPasswordAttempts = attempts;
          await mongoDoc.save();
        } else if (sqliteRow) {
          db.prepare('UPDATE users SET temp_password_attempts = ? WHERE id = ?').run(attempts, sqliteRow.id);
        }
        if (attempts >= MAX_TEMP_ATTEMPTS) {
          res.status(403).json({
            success: false,
            code: 'TEMP_PASSWORD_LOCKED',
            message: 'Too many failed attempts with this temporary password. Ask an administrator to issue a new one.'
          });
          return;
        }
      }
      res.status(401).json({ success: false, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
      return;
    }

    if (account.mustChangePassword && isExpired(account.tempPasswordExpiresAt)) {
      res.status(403).json({
        success: false,
        code: 'TEMP_PASSWORD_EXPIRED',
        message: 'Your temporary password has expired. Ask an administrator to issue a new one.'
      });
      return;
    }

    // Successful authentication: reset the temporary attempt counter and record login.
    if (mongoDoc) {
      mongoDoc.tempPasswordAttempts = 0;
      mongoDoc.lastLoginAt = new Date();
      await mongoDoc.save();
    } else if (sqliteRow) {
      db.prepare('UPDATE users SET temp_password_attempts = 0, last_login_at = CURRENT_TIMESTAMP WHERE id = ?').run(sqliteRow.id);
    }

    const token = signToken(account);

    res.json({
      success: true,
      token,
      redirectUrl: account.mustChangePassword ? '/login' : redirectForRole(account.role),
      mustChangePassword: Boolean(account.mustChangePassword),
      temporaryPasswordExpiresAt: account.tempPasswordExpiresAt,
      user: account
    });
  } catch (error: any) {
    console.error('[Login Error]', error?.message || error);
    res.status(500).json({ success: false, message: 'Internal server authentication error.' });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    let account: any = null;
    if (useMongo()) {
      const user = await User.findById(req.user.id);
      if (user) account = fromMongo(user);
    } else {
      const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as any;
      if (row) account = fromSqlite(row);
    }

    if (!account) {
      res.status(401).json({ success: false, message: 'User not found or session invalid.' });
      return;
    }

    if (account.status === 'blocked' || account.status === 'inactive') {
      res.status(403).json({ success: false, code: 'ACCOUNT_BLOCKED', message: 'Account is blocked.' });
      return;
    }

    res.json({
      success: true,
      user: {
        ...account,
        tempPasswordAttempts: undefined
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Unable to load the current session.' });
  }
};

export const changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || typeof currentPassword !== 'string') {
      res.status(400).json({ success: false, message: 'Current password is required.' });
      return;
    }
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      res.status(400).json({ success: false, message: 'New password must be at least 8 characters long.' });
      return;
    }
    if (confirmPassword !== undefined && confirmPassword !== newPassword) {
      res.status(400).json({ success: false, message: 'New passwords do not match.' });
      return;
    }
    if (newPassword === currentPassword) {
      res.status(400).json({ success: false, message: 'New password must be different from the current password.' });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    if (useMongo()) {
      const user = await User.findById(req.user.id).select('+passwordHash');
      if (!user) {
        res.status(404).json({ success: false, message: 'User account not found.' });
        return;
      }
      if (user.mustChangePassword && isExpired(user.tempPasswordExpiresAt)) {
        res.status(403).json({ success: false, code: 'TEMP_PASSWORD_EXPIRED', message: 'The temporary password has expired.' });
        return;
      }
      const matches = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!matches) {
        res.status(400).json({ success: false, code: 'CURRENT_PASSWORD_INCORRECT', message: 'Current password is incorrect.' });
        return;
      }

      user.passwordHash = newHash;
      user.mustChangePassword = false;
      user.tempPasswordAttempts = 0;
      user.tempPasswordConsumedAt = new Date();
      user.passwordChangedAt = new Date();
      await user.save();

      const account = fromMongo(user);
      res.json({
        success: true,
        message: 'Password updated successfully. You now have full access to your dashboard.',
        token: signToken(account),
        user: account
      });
      return;
    }

    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as any;
    if (!row) {
      res.status(404).json({ success: false, message: 'User account not found.' });
      return;
    }
    if (row.must_change_password && isExpired(row.temp_password_expires_at)) {
      res.status(403).json({ success: false, code: 'TEMP_PASSWORD_EXPIRED', message: 'The temporary password has expired.' });
      return;
    }

    const matches = await bcrypt.compare(currentPassword, row.password_hash);
    if (!matches) {
      res.status(400).json({ success: false, code: 'CURRENT_PASSWORD_INCORRECT', message: 'Current password is incorrect.' });
      return;
    }

    db.prepare(`
      UPDATE users
      SET password_hash = ?,
          must_change_password = 0,
          temp_password_attempts = 0,
          temp_password_consumed_at = CURRENT_TIMESTAMP,
          password_changed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newHash, row.id);

    const updatedRow = db.prepare('SELECT * FROM users WHERE id = ?').get(row.id) as any;
    const account = fromSqlite(updatedRow);

    res.json({
      success: true,
      message: 'Password updated successfully. You now have full access to your dashboard.',
      token: signToken(account),
      user: account
    });
  } catch (error: any) {
    console.error('[ChangePassword Error]', error?.message || error);
    res.status(500).json({ success: false, message: 'Password update failed. Please try again.' });
  }
};

export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { credential, accessToken, email, name, avatar } = req.body;

    let googleEmail = email;
    let googleName = name;
    let googleAvatar = avatar;

    if (credential && typeof credential === 'string') {
      try {
        const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
        if (verifyRes.ok) {
          const payload = await verifyRes.json() as any;
          googleEmail = payload.email || googleEmail;
          googleName = payload.name || payload.given_name || googleName;
          googleAvatar = payload.picture || googleAvatar;
        } else {
          res.status(401).json({ success: false, message: 'Google credential verification failed.' });
          return;
        }
      } catch {
        res.status(401).json({ success: false, message: 'Google credential verification failed.' });
        return;
      }
    } else if (accessToken && typeof accessToken === 'string') {
      try {
        const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (userinfoRes.ok) {
          const info = await userinfoRes.json() as any;
          googleEmail = info.email || googleEmail;
          googleName = info.name || info.given_name || googleName;
          googleAvatar = info.picture || googleAvatar;
        } else {
          res.status(401).json({ success: false, message: 'Google access token verification failed.' });
          return;
        }
      } catch {
        res.status(401).json({ success: false, message: 'Google access token verification failed.' });
        return;
      }
    } else {
      res.status(400).json({ success: false, message: 'A Google credential or access token is required.' });
      return;
    }

    if (!googleEmail || typeof googleEmail !== 'string' || !EMAIL_REGEX.test(googleEmail.trim())) {
      res.status(400).json({ success: false, message: 'Google account email could not be verified.' });
      return;
    }

    const normalizedEmail = googleEmail.trim().toLowerCase();
    let account: any = null;

    if (useMongo()) {
      let userDoc = await User.findOne({ email: normalizedEmail });
      if (!userDoc) {
        // New Google users are always students. Roles are never accepted from the client.
        const randomHash = await bcrypt.hash(cryptoRandomPassword(), 10);
        userDoc = await User.create({
          name: googleName?.trim() || normalizedEmail.split('@')[0],
          email: normalizedEmail,
          passwordHash: randomHash,
          role: 'STUDENT',
          status: 'ACTIVE',
          department: 'Computer Science',
          year: '1st Year',
          college: 'College of Engineering & Technology',
          avatar: googleAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
          mustChangePassword: false
        });
      }
      if (String(userDoc.status).toLowerCase() === 'blocked') {
        res.status(403).json({ success: false, message: 'Your account has been blocked. Please contact an administrator.' });
        return;
      }
      account = fromMongo(userDoc);
    } else {
      const row = db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(normalizedEmail) as any;
      if (row) {
        if (String(row.status).toLowerCase() === 'blocked' || String(row.status).toLowerCase() === 'inactive') {
          res.status(403).json({ success: false, message: 'Your account has been blocked. Please contact an administrator.' });
          return;
        }
        account = fromSqlite(row);
      } else {
        const id = `usr_google_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const randomHash = await bcrypt.hash(cryptoRandomPassword(), 10);
        db.prepare(`
          INSERT INTO users (id, name, email, password_hash, role, status, avatar, created_at)
          VALUES (?, ?, ?, ?, 'student', 'active', ?, CURRENT_TIMESTAMP)
        `).run(
          id,
          googleName?.trim() || normalizedEmail.split('@')[0],
          normalizedEmail,
          randomHash,
          googleAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80'
        );
        account = fromSqlite(db.prepare('SELECT * FROM users WHERE id = ?').get(id));
      }
    }

    if (!account) {
      res.status(500).json({ success: false, message: 'Failed to establish user session from Google authentication.' });
      return;
    }

    res.json({
      success: true,
      token: signToken(account),
      redirectUrl: redirectForRole(account.role),
      mustChangePassword: Boolean(account.mustChangePassword),
      user: account
    });
  } catch (error: any) {
    console.error('[Google Auth Error]', error?.message || error);
    res.status(500).json({ success: false, message: 'Google authentication service encountered an error.' });
  }
};

const cryptoRandomPassword = (): string => {
  // 32 hex characters, generated by the platform CSPRNG.
  return crypto.randomBytes(16).toString('hex');
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  res.json({ success: true, message: 'Logged out successfully.' });
};
