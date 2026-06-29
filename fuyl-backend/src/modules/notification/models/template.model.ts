import mongoose, { Schema, Document } from 'mongoose';

export interface ITemplate extends Document {
  name: string;                    // e.g. 'email_verification'
  channel: 'email' | 'sms' | 'whatsapp' | 'push';
  subject?: string;                // for email
  body: string;                    // handlebars/mustache-compatible template
  variables: string[];             // expected variable names
  isActive: boolean;
  description?: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const TemplateSchema = new Schema<ITemplate>(
  {
    name: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    channel: { type: String, enum: ['email', 'sms', 'whatsapp', 'push'], required: true },
    subject: { type: String },
    body: { type: String, required: true },
    variables: [{ type: String }],
    isActive: { type: Boolean, default: true, index: true },
    description: { type: String },
    version: { type: Number, default: 1 },
  },
  { timestamps: true }
);

export const TemplateModel = mongoose.model<ITemplate>('Template', TemplateSchema, 'notification_templates');
