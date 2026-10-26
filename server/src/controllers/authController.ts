import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { db } from '../db/database';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, department, year, college } = req.body;

    // Strict input validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ success: false, message: 'Name is required (at least 2 characters).' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
      res.status(400).json({ success: false, message: 'Please provide a valid institutional email address.' });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if MongoDB Atlas is connected
    const isMongoReady = mongoose.connection.readyState === 1;

    if (isMongoReady) {
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) {
        res.status(409).json({ success: false, message: 'An account with this email address already exists.' });
        return;
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const newUser = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: 'STUDENT',
        status: 'ACTIVE',
        department: department?.trim() || 'Computer Science',
        year: year?.trim() || '1st Year',
        college: college?.trim() || 'College of Engineering & Technology',
        avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80`,
        mustChangePassword: false
      });

      // Also persist to SQLite so SQLite-based queries immediately recognize the user
      try {
        db.prepare(`
          INSERT OR IGNORE INTO users (id, name, email, password_hash, role, status, avatar)
          VALUES (?, ?, ?, ?, 'student', 'active', ?)
        `).run(newUser._id.toString(), name.trim(), normalizedEmail, passwordHash, newUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80');

        db.prepare(`
          INSERT OR IGNORE INTO student_profiles (id, user_id, department, year_cohort)
          VALUES (?, ?, ?, ?)
        `).run(`sp_${newUser._id}`, newUser._id.toString(), department?.trim() || 'Computer Science', year?.trim() || '1st Year');
      } catch (sqlErr) {
        console.warn('[SQLite dual-write notice]', sqlErr);
      }

      const userObj = newUser.toJSON();

      res.status(201).json({
        success: true,
        message: 'Student account registered successfully. Please sign in.',
        user: userObj
      });
      return;
    }

    // Seamless Local Fallback when Atlas connection is pending whitelist
    const existingLocal = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail) as any;
    if (existingLocal) {
      res.status(409).json({ success: false, message: 'An account with this email address already exists.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const newId = `usr_s_${Date.now()}`;

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, status, avatar)
      VALUES (?, ?, ?, ?, 'student', 'active', ?)
    `).run(newId, name.trim(), normalizedEmail, passwordHash, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80');

    try {
      db.prepare(`
        INSERT INTO student_profiles (id, user_id, department, year_cohort)
        VALUES (?, ?, ?, ?)
      `).run(`sp_${Date.now()}`, newId, department?.trim() || 'Computer Science', year?.trim() || '1st Year');
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
        department: department?.trim() || 'Computer Science',
        year: year?.trim() || '1st Year',
        mustChangePassword: false
      }
    });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({ success: false, message: 'An account with this email address already exists.' });
      return;
    }
    console.error('[Registration Error]', error);
    res.status(500).json({ success: false, message: error.message || 'Registration failed' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required.' });
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const isMongoReady = mongoose.connection.readyState === 1;

    let userObj: any = null;
    let passwordHash: string | null = null;
    let mustChangePassword = false;

    // 1. Try MongoDB Atlas if connected
    if (isMongoReady) {
      const userDoc = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
      if (userDoc) {
        if (userDoc.status === 'BLOCKED') {
          res.status(403).json({ success: false, message: 'Your account has been blocked. Please contact an administrator.' });
          return;
        }
        const isMatch = await userDoc.comparePassword(String(password));
        if (!isMatch) {
          res.status(401).json({ success: false, message: 'Invalid email or password.' });
          return;
        }
        userObj = {
          id: userDoc._id.toString(),
          name: userDoc.name,
          email: userDoc.email,
          role: userDoc.role.toLowerCase(),
          department: userDoc.department,
          avatar: userDoc.avatar
        };
        mustChangePassword = userDoc.mustChangePassword;
      }
    }

    // 2. Try Local Fallback Store
    if (!userObj) {
      const row = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail) as any;
      if (row) {
        if (row.status === 'inactive' || row.status === 'blocked') {
          res.status(403).json({ success: false, message: 'Your account has been blocked. Please contact an administrator.' });
          return;
        }

        const isMatch = await bcrypt.compare(String(password), row.password_hash);
        if (!isMatch) {
          res.status(401).json({ success: false, message: 'Invalid email or password.' });
          return;
        }

        userObj = {
          id: row.id,
          name: row.name,
          email: row.email,
          role: row.role.toLowerCase(),
          department: 'Computer Science',
          avatar: row.avatar
        };
        mustChangePassword = false;
      }
    }

    if (!userObj) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_replace_in_production';
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

    const token = jwt.sign(
      {
        id: userObj.id,
        name: userObj.name,
        email: userObj.email,
        role: userObj.role,
        department: userObj.department
      },
      secret,
      { expiresIn: (expiresIn as any) || '7d' }
    );

    const redirectUrl =
      userObj.role === 'admin'
        ? '/admin/dashboard'
        : userObj.role === 'mentor'
        ? '/mentor/dashboard'
        : '/student/dashboard';

    res.json({
      success: true,
      token,
      redirectUrl,
      mustChangePassword,
      user: userObj
    });
  } catch (error: any) {
    console.error('[Login Error]', error);
    res.status(500).json({ success: false, message: 'Internal server authentication error.' });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const isMongoReady = mongoose.connection.readyState === 1;

    if (isMongoReady) {
      const user = await User.findById(req.user.id);
      if (user) {
        if (user.status === 'BLOCKED') {
          res.status(403).json({ success: false, message: 'Account is blocked.' });
          return;
        }
        res.json({
          success: true,
          user: {
            ...user.toJSON(),
            role: user.role.toLowerCase()
          }
        });
        return;
      }
    }

    // Local fallback
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as any;
    if (row) {
      res.json({
        success: true,
        user: {
          id: row.id,
          name: row.name,
          email: row.email,
          role: row.role.toLowerCase(),
          department: req.user.department || 'Computer Science',
          avatar: row.avatar
        }
      });
      return;
    }

    res.json({
      success: true,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role.toLowerCase(),
        department: req.user.department
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, message: 'Current password and new password are required.' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
      return;
    }

    const user = await User.findById(userId).select('+passwordHash');
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      res.status(400).json({ success: false, message: 'Current password is incorrect.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.mustChangePassword = false;
    await user.save();

    res.json({
      success: true,
      message: 'Password updated successfully. You now have full access to your dashboard.'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { credential, email, name, avatar, role } = req.body;

    let googleEmail = email;
    let googleName = name;
    let googleAvatar = avatar;

    // 1. If Google ID token credential is provided, verify it with Google OAuth2 API
    if (credential && typeof credential === 'string') {
      try {
        const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
        if (verifyRes.ok) {
          const payload = await verifyRes.json() as any;
          googleEmail = payload.email;
          googleName = payload.name || payload.given_name || googleName;
          googleAvatar = payload.picture || googleAvatar;
        } else {
          // If tokeninfo returned error, attempt fallback decoding if standard JWT
          const parts = credential.split('.');
          if (parts.length === 3) {
            const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
            if (decoded.email) {
              googleEmail = decoded.email;
              googleName = decoded.name || decoded.given_name || googleName;
              googleAvatar = decoded.picture || googleAvatar;
            }
          }
        }
      } catch (tokenErr) {
        console.warn('[Google Token Verification Notice]', tokenErr);
      }
    }

    if (!googleEmail || typeof googleEmail !== 'string') {
      res.status(400).json({ success: false, message: 'Google account email could not be verified.' });
      return;
    }

    const normalizedEmail = googleEmail.trim().toLowerCase();
    const isMongoReady = mongoose.connection.readyState === 1;

    let userObj: any = null;

    // 2. Check if user already exists in MongoDB
    if (isMongoReady) {
      let userDoc = await User.findOne({ email: normalizedEmail });
      if (userDoc) {
        if (userDoc.status === 'BLOCKED') {
          res.status(403).json({ success: false, message: 'Your account has been blocked. Please contact an administrator.' });
          return;
        }
        userObj = {
          id: userDoc._id.toString(),
          name: userDoc.name,
          email: userDoc.email,
          role: userDoc.role.toLowerCase(),
          department: userDoc.department || 'Computer Science',
          avatar: userDoc.avatar || googleAvatar
        };
      } else {
        // Create new user in MongoDB
        const randomSalt = await bcrypt.genSalt(10);
        const randomHash = await bcrypt.hash(Math.random().toString(36) + Date.now(), randomSalt);
        const newUser = await User.create({
          name: googleName?.trim() || normalizedEmail.split('@')[0],
          email: normalizedEmail,
          passwordHash: randomHash,
          role: role === 'mentor' ? 'MENTOR' : 'STUDENT',
          status: 'ACTIVE',
          department: 'Computer Science',
          year: '1st Year',
          college: 'College of Engineering & Technology',
          avatar: googleAvatar || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80`,
          mustChangePassword: false
        });

        userObj = {
          id: newUser._id.toString(),
          name: newUser.name,
          email: newUser.email,
          role: newUser.role.toLowerCase(),
          department: newUser.department,
          avatar: newUser.avatar
        };
      }
    }

    // 3. Harmonize with SQLite
    try {
      const existingRow = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail) as any;
      if (existingRow) {
        if (!userObj) {
          if (existingRow.status === 'inactive' || existingRow.status === 'blocked') {
            res.status(403).json({ success: false, message: 'Your account has been blocked. Please contact an administrator.' });
            return;
          }
          userObj = {
            id: existingRow.id,
            name: existingRow.name,
            email: existingRow.email,
            role: existingRow.role.toLowerCase(),
            department: 'Computer Science',
            avatar: existingRow.avatar || googleAvatar
          };
        }
      } else {
        // Insert into SQLite
        const sqliteId = userObj?.id || `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const assignedRole = userObj?.role || (role === 'mentor' ? 'mentor' : 'student');
        const assignedName = userObj?.name || googleName?.trim() || normalizedEmail.split('@')[0];
        const assignedAvatar = userObj?.avatar || googleAvatar || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80`;

        db.prepare(`
          INSERT INTO users (id, name, email, password_hash, role, status, avatar, created_at)
          VALUES (?, ?, ?, ?, ?, 'active', ?, CURRENT_TIMESTAMP)
        `).run(
          sqliteId,
          assignedName,
          normalizedEmail,
          'google_oauth_authenticated',
          assignedRole,
          assignedAvatar
        );

        if (!userObj) {
          userObj = {
            id: sqliteId,
            name: assignedName,
            email: normalizedEmail,
            role: assignedRole,
            department: 'Computer Science',
            avatar: assignedAvatar
          };
        }
      }
    } catch (sqlErr) {
      console.warn('[SQLite Google Auth Notice]', sqlErr);
    }

    if (!userObj) {
      res.status(500).json({ success: false, message: 'Failed to establish user session from Google authentication.' });
      return;
    }

    const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_replace_in_production';
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

    const token = jwt.sign(
      {
        id: userObj.id,
        name: userObj.name,
        email: userObj.email,
        role: userObj.role,
        department: userObj.department
      },
      secret,
      { expiresIn: (expiresIn as any) || '7d' }
    );

    const redirectUrl =
      userObj.role === 'admin'
        ? '/admin/dashboard'
        : userObj.role === 'mentor'
        ? '/mentor/dashboard'
        : '/student/dashboard';

    res.json({
      success: true,
      token,
      redirectUrl,
      mustChangePassword: false,
      user: userObj
    });
  } catch (error: any) {
    console.error('[Google Auth Error]', error);
    res.status(500).json({ success: false, message: 'Google authentication service encountered an error.' });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  res.json({ success: true, message: 'Logged out successfully.' });
};
