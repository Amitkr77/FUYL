import { z } from 'zod';
import { ShipmentStatus } from '../../../shared/enums';

export const createShipmentSchema = z.object({
  orderId: z.string().length(24),
  sellerId: z.string().length(24),
  carrier: z.string().min(1).max(100),
  weightGrams: z.number().min(0).optional(),
  dimensionsCm: z.object({
    length: z.number().min(0),
    width: z.number().min(0),
    height: z.number().min(0),
  }).optional(),
});

export const updateShipmentStatusSchema = z.object({
  status: z.enum([
    ShipmentStatus.LABEL_CREATED, ShipmentStatus.PICKED_UP, ShipmentStatus.IN_TRANSIT,
    ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.DELIVERED, ShipmentStatus.FAILED,
    ShipmentStatus.RETURNED_TO_ORIGIN, ShipmentStatus.CANCELLED,
  ]),
  note: z.string().max(500).optional(),
  location: z.string().max(200).optional(),
});

export type CreateShipmentDTO = z.infer<typeof createShipmentSchema>;
export type UpdateShipmentStatusDTO = z.infer<typeof updateShipmentStatusSchema>;
