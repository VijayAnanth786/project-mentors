import { Schema, model, Document, Types } from 'mongoose';

export interface IReview extends Document {
  progressId: Types.ObjectId;
  teamId: Types.ObjectId;
  mentorId: Types.ObjectId;
  status: 'Approved' | 'Needs Improvement' | 'Major Issue' | 'APPROVED' | 'CHANGES_REQUESTED';
  feedback: string;
  reviewedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    progressId: { type: Schema.Types.ObjectId, ref: 'Progress', required: true, index: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    mentorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['Approved', 'Needs Improvement', 'Major Issue', 'APPROVED', 'CHANGES_REQUESTED'],
      required: true
    },
    feedback: { type: String, required: true, trim: true, maxlength: 2000 },
    reviewedAt: { type: Date, default: Date.now }
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

export const Review = model<IReview>('Review', reviewSchema);
