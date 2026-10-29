import { Schema, model, Document, Types } from 'mongoose';

export interface IMeeting extends Document {
  teamId: Types.ObjectId;
  mentorId: Types.ObjectId;
  title: string;
  date: string;
  time: string;
  linkOrLocation: string;
  notes?: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const meetingSchema = new Schema<IMeeting>(
  {
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    mentorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    time: { type: String, required: true, trim: true },
    linkOrLocation: { type: String, required: true, trim: true },
    notes: { type: String, default: null },
    status: {
      type: String,
      enum: ['upcoming', 'completed', 'cancelled'],
      default: 'upcoming',
      index: true
    }
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

meetingSchema.index({ mentorId: 1, status: 1, date: 1 });

export const Meeting = model<IMeeting>('Meeting', meetingSchema);
