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
  updatedAt: Date;
}

const milestoneSchema = new Schema<IMilestone>(
  {
    title: { type: String, required: true },
    status: { type: String, enum: ['Completed', 'In Progress', 'Pending'], default: 'Pending' },
    targetDate: { type: Date }
  },
  { _id: true }
);

const projectSchema = new Schema<IProject>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    techStack: [{ type: String, trim: true }],
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    githubUrl: { type: String, default: '' },
    currentPhase: { type: String, default: 'Development' },
    deadline: { type: Date, required: true },
    lastUpdateDate: { type: Date, default: Date.now },
    progressPercentage: { type: Number, default: 0, min: 0, max: 100 },
    status: {
      type: String,
      enum: ['ON_TRACK', 'NEEDS_ATTENTION', 'DELAYED', 'COMPLETED'],
      default: 'ON_TRACK',
      index: true
    },
    hasPendingReview: { type: Boolean, default: false },
    milestones: [milestoneSchema]
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret: any) => {
        delete ret.__v;
        ret.id = ret._id ? ret._id.toString() : ret.id;
        return ret;
      }
    }
  }
);

projectSchema.index({ status: 1, deadline: 1 });

export const Project = model<IProject>('Project', projectSchema);
