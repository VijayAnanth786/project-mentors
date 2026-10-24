import { Schema, model, Document, Types } from 'mongoose';

export interface IReview extends Document {
  progressId: Types.ObjectId;
  teamId: Types.ObjectId;
  mentorId: Types.ObjectId;
  status: 'Approved' | 'Needs Improvement' | 'Major Issue';
  feedback: string;
  reviewedAt: Date;
}

const reviewSchema = new Schema<IReview>({
  progressId: { type: Schema.Types.ObjectId, ref: 'Progress', required: true },
  teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  mentorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['Approved', 'Needs Improvement', 'Major Issue'],
    required: true
  },
  feedback: { type: String, required: true, maxlength: 500 },
  reviewedAt: { type: Date, default: Date.now }
});

export const Review = model<IReview>('Review', reviewSchema);
