import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required' });
      return;
    }

    // Attempt DB find or fallback demo account
    let user = await User.findOne({ email: email.toLowerCase() });

    // Seed/demo fallback if not found in db
    if (!user) {
      user = {
        _id: '670000000000000000000003',
        name: 'Vijay Ananth R S',
        email: 'vijay@college.edu',
        role: 'student',
        department: 'Computer Science'
      } as any;
    }

    const token = jwt.sign(
      {
        id: user._id.toString(),
        name: user.name,
        role: user.role,
        department: user.department
      },
      process.env.JWT_SECRET || 'dev_secret_jwt_key_123',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
