import { Schema, model, Document, Types } from 'mongoose';

export interface ITeam extends Document {
  name: string;
  yearCohort: string;
  leaderId: Types.ObjectId;
  memberIds: Types.ObjectId[];
  mentorId?: Types.ObjectId | null;
  projectId?: Types.ObjectId | null;
  department: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const teamSchema = new Schema<ITeam>(
  {
    name: { type: String, required: true, trim: true },
    yearCohort: { type: String, default: '3rd Year', trim: true },
    leaderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    memberIds: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    mentorId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', default: null },
    department: { type: String, default: 'Computer Science', trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true }
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

teamSchema.index({ name: 1 });
teamSchema.index({ mentorId: 1, status: 1 });

export const Team = model<ITeam>('Team', teamSchema);
