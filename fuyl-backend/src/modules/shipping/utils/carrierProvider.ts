import { logger } from '../../../config/logger';
import { delhiveryService, type DelhiveryConsignee } from './delhivery.service';

/**
 * Carrier abstraction. Routes bookings to Delhivery when it's configured
 * (token + registered pickup location); otherwise falls back to a synthetic
 * tracking number so dev/test environments keep working without a real courier
 * account — the same stub-when-unconfigured pattern the notification providers use.
 */
export interface CarrierBookingInput {
  carrier: string;
  shipmentNumber: string;
  orderNumber: string;
  consignee: DelhiveryConsignee;
  paymentMode: 'Prepaid' | 'COD';
  codAmount?: number;
  declaredValue: number;
  weightGrams?: number;
  dimensionsCm?: { length: number; width: number; height: number };
  productsDesc?: string;
}

export interface CarrierBookingResult {
  trackingNumber: string;
  trackingUrl: string;
  labelUrl?: string;
}

export async function createShipmentWithCarrier(input: CarrierBookingInput): Promise<CarrierBookingResult> {
  if (delhiveryService.isConfigured()) {
    const result = await delhiveryService.createShipment({
      orderNumber: input.orderNumber,
      consignee: input.consignee,
      paymentMode: input.paymentMode,
      codAmount: input.codAmount,
      declaredValue: input.declaredValue,
      weightGrams: input.weightGrams ?? 500,
      dimensionsCm: input.dimensionsCm,
      productsDesc: input.productsDesc,
    });
    logger.info(`[shipping][delhivery] booked ${input.shipmentNumber} -> waybill ${result.waybill}`);
    return { trackingNumber: result.waybill, trackingUrl: result.trackingUrl };
  }

  // Fallback stub (no carrier configured) — mint a synthetic tracking number.
  const trackingNumber = `${input.carrier.slice(0, 3).toUpperCase()}${Date.now().toString().slice(-10)}`;
  logger.info(`[shipping][carrier-stub] booked shipment ${input.shipmentNumber} via ${input.carrier} -> ${trackingNumber}`);
  return {
    trackingNumber,
    trackingUrl: `https://track.example.com/${trackingNumber}`,
  };
}
