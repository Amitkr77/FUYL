import mongoose, { Schema, Document } from 'mongoose';

export interface IContactMessage extends Document {
  name: string;
  email: string;
  phone?: string;
  topic?: string;
  message: string;
  createdAt: Date;
}

const ContactMessageSchema = new Schema<IContactMessage>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    phone: { type: String, trim: true, maxlength: 30 },
    topic: { type: String, trim: true, maxlength: 100 },
    message: { type: String, required: true, maxlength: 5000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const ContactMessageModel = mongoose.model<IContactMessage>(
  'ContactMessage',
  ContactMessageSchema,
  'contact_messages'
);
