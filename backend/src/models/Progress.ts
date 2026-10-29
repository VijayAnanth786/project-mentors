import { Schema, model, Document, Types } from 'mongoose';

export interface IFileAttachment {
  name: string;
  size: string;
  type: string;
  url: string;
}

export type ProgressStatus =
  | 'SUBMITTED'
  | 'PENDING'
  | 'APPROVED'
  | 'CHANGES_REQUESTED'
  | 'NEEDS_IMPROVEMENT'
  | 'MAJOR_ISSUE'
  | 'OVERDUE';

export interface IProgress extends Document {
  teamId: Types.ObjectId;
  projectId: Types.ObjectId;
  weekNumber: number;
  completedTasks: string[];
  currentWork: string[];
  blockers: string[];
  nextWeekGoals: string[];
  files: IFileAttachment[];
  githubUrl?: string;
  submittedBy: Types.ObjectId;
  submissionDate: Date;
  status: ProgressStatus;
  feedback?: string;
  reviewerId?: Types.ObjectId | null;
  reviewedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const fileSchema = new Schema<IFileAttachment>(
  {
    name: { type: String, required: true },
    size: { type: String, required: true },
    type: { type: String, required: true },
    url: { type: String, required: true }
  },
  { _id: false }
);

const progressSchema = new Schema<IProgress>(
  {
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    weekNumber: { type: Number, required: true },
    completedTasks: [{ type: String }],
    currentWork: [{ type: String }],
    blockers: [{ type: String }],
    nextWeekGoals: [{ type: String }],
    files: [fileSchema],
    githubUrl: { type: String, default: '' },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    submissionDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['SUBMITTED', 'PENDING', 'APPROVED', 'CHANGES_REQUESTED', 'NEEDS_IMPROVEMENT', 'MAJOR_ISSUE', 'OVERDUE'],
      default: 'SUBMITTED',
      index: true
    },
    feedback: { type: String, default: '' },
    reviewerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null }
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

progressSchema.index({ teamId: 1, weekNumber: -1 });

export const Progress = model<IProgress>('Progress', progressSchema);
