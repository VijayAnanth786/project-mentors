import { Schema, model, Document, Types } from 'mongoose';

export interface ITeam extends Document {
  name: string;
  yearCohort: string;
  leaderId: Types.ObjectId;
  memberIds: Types.ObjectId[];
  mentorId?: Types.ObjectId | null;
  department: string;
  createdAt: Date;
}

const teamSchema = new Schema<ITeam>({
  name: { type: String, required: true },
  yearCohort: { type: String, default: '3rd Year' },
  leaderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  memberIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  mentorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  department: { type: String, default: 'Computer Science' },
  createdAt: { type: Date, default: Date.now }
});

export const Team = model<ITeam>('Team', teamSchema);
