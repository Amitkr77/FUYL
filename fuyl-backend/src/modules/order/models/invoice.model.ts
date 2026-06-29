import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoice extends Document {
  invoiceNumber: string;
  orderId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  sellerId?: mongoose.Types.ObjectId;
  amount: number;
  tax: number;
  total: number;
  currency: string;
  pdfUrl?: string;
  status: 'draft' | 'issued' | 'void' | 'paid';
  issuedAt: Date;
  dueAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User' },
    amount: { type: Number, required: true, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    pdfUrl: { type: String },
    status: { type: String, enum: ['draft', 'issued', 'void', 'paid'], default: 'issued', index: true },
    issuedAt: { type: Date, default: Date.now },
    dueAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const InvoiceModel = mongoose.model<IInvoice>('Invoice', InvoiceSchema, 'invoices');
