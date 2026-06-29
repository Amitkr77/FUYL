import mongoose, { Schema, Document } from 'mongoose';

export interface ICheckoutSessions extends Document {
  // TODO: add fields for the checkout_sessions collection
  createdAt: Date;
  updatedAt: Date;
}

const CheckoutSessionsSchema = new Schema<ICheckoutSessions>(
  {
    // TODO: define schema for checkout_sessions
  },
  { timestamps: true }
);

export const CheckoutSessionsModel = mongoose.model<ICheckoutSessions>('CheckoutSessions', CheckoutSessionsSchema, 'checkout_sessions');
