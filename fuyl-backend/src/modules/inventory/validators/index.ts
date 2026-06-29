import { z } from 'zod';

export const stockAdjustmentSchema = z.object({
  productId: z.string().length(24),
  variantId: z.string().length(24).optional(),
  sellerId: z.string().length(24),
  warehouseId: z.string().default('default'),
  delta: z.number().int(),                // positive or negative
  type: z.enum(['purchase', 'return_in', 'adjustment_in', 'adjustment_out', 'damage', 'transfer_in', 'transfer_out']),
  referenceType: z.string().optional(),
  referenceId: z.string().length(24).optional(),
  unitCost: z.number().min(0).optional(),
  note: z.string().max(500).optional(),
});

export const setReorderSchema = z.object({
  reorderThreshold: z.number().int().min(0),
  reorderQuantity: z.number().int().min(0),
});

export const reserveStockSchema = z.object({
  items: z.array(z.object({
    productId: z.string().length(24),
    variantId: z.string().length(24).optional(),
    sellerId: z.string().length(24),
    quantity: z.number().int().min(1),
  })),
  cartId: z.string().length(24).optional(),
  orderId: z.string().length(24).optional(),
  userId: z.string().length(24).optional(),
  ttlMinutes: z.number().int().min(1).max(1440).default(15),
});

export const releaseReservationSchema = z.object({
  cartId: z.string().length(24).optional(),
  orderId: z.string().length(24).optional(),
});

export type StockAdjustmentDTO = z.infer<typeof stockAdjustmentSchema>;
export type SetReorderDTO = z.infer<typeof setReorderSchema>;
export type ReserveStockDTO = z.infer<typeof reserveStockSchema>;
export type ReleaseReservationDTO = z.infer<typeof releaseReservationSchema>;
