import { Schema, model, Document, Types } from 'mongoose';

export interface IFileAttachment {
  name: string;
  size: string;
  type: string;
  url: string;
}

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
  status: 'SUBMITTED' | 'APPROVED' | 'NEEDS_IMPROVEMENT' | 'MAJOR_ISSUE';
}

const fileSchema = new Schema<IFileAttachment>({
  name: { type: String, required: true },
  size: { type: String, required: true },
  type: { type: String, required: true },
  url: { type: String, required: true }
});

const progressSchema = new Schema<IProgress>({
  teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  weekNumber: { type: Number, required: true },
  completedTasks: [{ type: String }],
  currentWork: [{ type: String }],
  blockers: [{ type: String }],
  nextWeekGoals: [{ type: String }],
  files: [fileSchema],
  githubUrl: { type: String, default: '' },
  submittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  submissionDate: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['SUBMITTED', 'APPROVED', 'NEEDS_IMPROVEMENT', 'MAJOR_ISSUE'],
    default: 'SUBMITTED'
  }
});

export const Progress = model<IProgress>('Progress', progressSchema);
