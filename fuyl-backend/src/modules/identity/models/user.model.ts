import mongoose, { Schema, Document } from 'mongoose';
import { RoleEnum } from '../../../shared/enums';

export interface IUser extends Document {
  email: string;
  emailLower: string;
  phone?: string;
  phoneHash?: string;
  passwordHash: string;
  role: typeof RoleEnum[keyof typeof RoleEnum];
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isActive: boolean;
  isDeleted: boolean;
  sellerId?: mongoose.Types.ObjectId;
  permissions: string[];
  lastLoginAt?: Date;
  lastLoginIp?: string;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  passwordChangedAt?: Date;
  referralCodeApplied?: string;
  deviceFingerprint?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true },
    emailLower: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    phone: { type: String, trim: true, index: true, sparse: true },
    phoneHash: { type: String, index: true, sparse: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: Object.values(RoleEnum), default: RoleEnum.CUSTOMER, index: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    displayName: { type: String, trim: true },
    avatarUrl: { type: String },
    isEmailVerified: { type: Boolean, default: false, index: true },
    isPhoneVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    sellerId: { type: Schema.Types.ObjectId, ref: 'Seller' },
    permissions: [{ type: String }],
    lastLoginAt: { type: Date },
    lastLoginIp: { type: String },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },
    passwordChangedAt: { type: Date },
    referralCodeApplied: { type: String, index: true, sparse: true },
    deviceFingerprint: { type: String },
  },
  { timestamps: true }
);

UserSchema.pre('validate', function (next) {
  if (this.email) this.emailLower = this.email.toLowerCase().trim();
  next();
});

UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.phoneHash;
  delete obj.failedLoginAttempts;
  delete obj.lockedUntil;
  delete obj.__v;
  return obj;
};

export const UserModel = mongoose.model<IUser>('User', UserSchema, 'users');
