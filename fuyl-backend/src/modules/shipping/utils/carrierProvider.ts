import { logger } from '../../../config/logger';

/**
 * Carrier abstraction — no real courier account (Shiprocket/Delhivery/etc.)
 * is configured, so this generates a synthetic tracking number and logs
 * instead of calling a real shipping API, mirroring the same
 * stub-when-unconfigured pattern already used for SMS/WhatsApp/push. Swap
 * the body of createShipmentWithCarrier() for a real HTTP call once a
 * carrier account exists — the interface it returns is what the rest of
 * the module depends on, so no other code needs to change.
 */
export interface CarrierBookingInput {
  carrier: string;
  shipmentNumber: string;
  weightGrams?: number;
}

export interface CarrierBookingResult {
  trackingNumber: string;
  trackingUrl: string;
  labelUrl?: string;
}

export async function createShipmentWithCarrier(input: CarrierBookingInput): Promise<CarrierBookingResult> {
  // Real integration would POST to the carrier's booking API here and
  // return their tracking number/label. Until one is configured, mint a
  // deterministic-looking synthetic tracking number so the rest of the
  // system (order sync, customer-facing tracking link, admin UI) has
  // something real to display and test against.
  const trackingNumber = `${input.carrier.slice(0, 3).toUpperCase()}${Date.now().toString().slice(-10)}`;
  logger.info(`[shipping][carrier-stub] booked shipment ${input.shipmentNumber} via ${input.carrier} -> ${trackingNumber}`);
  return {
    trackingNumber,
    trackingUrl: `https://track.example.com/${trackingNumber}`,
  };
}
