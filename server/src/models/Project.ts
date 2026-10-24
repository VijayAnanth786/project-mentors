import { Schema, model, Document, Types } from 'mongoose';

export interface IMilestone {
  title: string;
  status: 'Completed' | 'In Progress' | 'Pending';
  targetDate?: Date;
}

export interface IProject extends Document {
  title: string;
  description: string;
  techStack: string[];
  teamId: Types.ObjectId;
  githubUrl?: string;
  currentPhase: string;
  deadline: Date;
  lastUpdateDate: Date;
  progressPercentage: number;
  status: 'ON_TRACK' | 'NEEDS_ATTENTION' | 'DELAYED' | 'COMPLETED';
  hasPendingReview: boolean;
  milestones: IMilestone[];
  createdAt: Date;
}

const milestoneSchema = new Schema<IMilestone>({
  title: { type: String, required: true },
  status: { type: String, enum: ['Completed', 'In Progress', 'Pending'], default: 'Pending' },
  targetDate: { type: Date }
});

const projectSchema = new Schema<IProject>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  techStack: [{ type: String }],
  teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  githubUrl: { type: String, default: '' },
  currentPhase: { type: String, default: 'Development' },
  deadline: { type: Date, required: true },
  lastUpdateDate: { type: Date, default: Date.now },
  progressPercentage: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['ON_TRACK', 'NEEDS_ATTENTION', 'DELAYED', 'COMPLETED'],
    default: 'ON_TRACK'
  },
  hasPendingReview: { type: Boolean, default: false },
  milestones: [milestoneSchema],
  createdAt: { type: Date, default: Date.now }
});

export const Project = model<IProject>('Project', projectSchema);
