import { Schema, model, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'STUDENT' | 'MENTOR' | 'ADMIN' | 'student' | 'mentor' | 'admin';
export type UserStatus = 'ACTIVE' | 'BLOCKED' | 'active' | 'blocked' | 'inactive';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  department?: string;
  year?: string;
  college?: string;
  avatar?: string;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address']
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false // Excluded from normal queries and API responses
    },
    role: {
      type: String,
      enum: {
        values: ['STUDENT', 'MENTOR', 'ADMIN'],
        message: '{VALUE} is not a valid role'
      },
      required: true
    },
    status: {
      type: String,
      enum: {
        values: ['ACTIVE', 'BLOCKED'],
        message: '{VALUE} is not a valid status'
      },
      default: 'ACTIVE'
    },
    department: {
      type: String,
      trim: true
    },
    year: {
      type: String,
      trim: true
    },
    college: {
      type: String,
      trim: true
    },
    avatar: {
      type: String
    },
    mustChangePassword: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret: any) => {
        delete ret.passwordHash;
        delete ret.__v;
        ret.id = ret._id ? ret._id.toString() : ret.id;
        return ret;
      }
    }
  }
);

// Method to verify passwords securely
userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};

export const User: Model<IUser> = model<IUser>('User', userSchema);
