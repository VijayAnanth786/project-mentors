import { Schema, model, Document, Types } from 'mongoose';

export interface IActivityEvent extends Document {
  userId?: Types.ObjectId | null;
  actionType: string;
  description: string;
  targetType?: string | null;
  targetId?: string | null;
  createdAt: Date;
}

const activityEventSchema = new Schema<IActivityEvent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    actionType: { type: String, required: true },
    description: { type: String, required: true, trim: true },
    targetType: { type: String, default: null },
    targetId: { type: String, default: null }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform: (_, ret: any) => {
        delete ret.__v;
        ret.id = ret._id ? ret._id.toString() : ret.id;
        return ret;
      }
    }
  }
);

activityEventSchema.index({ createdAt: -1 });

export const ActivityEvent = model<IActivityEvent>('ActivityEvent', activityEventSchema);
