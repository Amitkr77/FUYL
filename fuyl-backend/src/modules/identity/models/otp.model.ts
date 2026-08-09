import mongoose, { Schema, Document } from 'mongoose';

export interface IOtp extends Document {
  identifier: string;    // lowercased email or E.164 phone
  type: 'email' | 'phone';
  codeHash: string;      // SHA-256 of the 6-digit code
  expiresAt: Date;
  attempts: number;      // failed verification attempts — voided at 5
  isUsed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OtpSchema = new Schema<IOtp>(
  {
    identifier: { type: String, required: true, index: true, lowercase: true, trim: true },
    type:       { type: String, enum: ['email', 'phone'], required: true },
    codeHash:   { type: String, required: true },
    // TTL index — MongoDB removes the document automatically after expiry
    expiresAt:  { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    attempts:   { type: Number, default: 0 },
    isUsed:     { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const OtpModel = mongoose.model<IOtp>('Otp', OtpSchema, 'otps');
