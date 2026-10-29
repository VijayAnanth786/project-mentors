import { Schema, model, Document, Types } from 'mongoose';

export interface IAnnouncement extends Document {
  authorId: Types.ObjectId;
  title: string;
  message: string;
  audience: 'all' | 'students' | 'mentors';
  createdAt: Date;
  updatedAt: Date;
}

const announcementSchema = new Schema<IAnnouncement>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    audience: {
      type: String,
      enum: ['all', 'students', 'mentors'],
      required: true,
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

announcementSchema.index({ audience: 1, createdAt: -1 });

export const Announcement = model<IAnnouncement>('Announcement', announcementSchema);
