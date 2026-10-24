import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'student';
  avatar?: string;
  department?: string;
  createdAt: Date;
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['student'], required: true },
  avatar: { type: String },
  department: { type: String, default: 'Computer Science' },
  createdAt: { type: Date, default: Date.now }
});

export const User = model<IUser>('User', userSchema);
