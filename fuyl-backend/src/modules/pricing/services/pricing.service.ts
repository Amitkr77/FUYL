import { PriceBookRepository } from '../repositories/priceBook.repository';
import { TaxRuleRepository } from '../repositories/taxRule.repository';
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from '../../../shared/errors';
import { logger } from '../../../config/logger';
import { Types } from 'mongoose';
import {
  CreatePriceBookDTO, UpdatePriceBookDTO,
  CreateTaxRuleDTO, UpdateTaxRuleDTO,
} from '../validators';
import { clampPaise, fromPaise, toPaise } from '../../../shared/utils';

const priceBookRepo = new PriceBookRepository();
const taxRuleRepo = new TaxRuleRepository();

export interface QuoteItemInput {
  productId: string;
  variantId?: string;
  quantity: number;
  basePrice: number;
  sellerId?: string;
  isSubscription?: boolean;
  isTaxable?: boolean;
  taxRate?: number;              // product-level GST % fallback (used when no global tax rules match)
  customerRole?: string;
  state?: string;
  country?: string;
}

export interface QuoteItemOutput {
  productId: string;
  variantId?: string;
  quantity: number;
  basePrice: number;
  appliedPrice: number;          // after price-book overrides + volume tiers
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  totalPrice: number;            // appliedPrice * quantity - discount + tax
  currency: string;
  taxBreakdown: Array<{ code: string; rate: number; type: string; amount: number }>;
  appliedPriceBookId?: string;
}

export interface QuoteResult {
  items: QuoteItemOutput[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingTotal: number;
  grandTotal: number;
  currency: string;
}

class PricingService {
  // ─── Price Books ──────────────────────────────────────────────
  async createPriceBook(dto: CreatePriceBookDTO) {
    return priceBookRepo.create({
      ...dto,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      sellerIds: (dto.sellerIds ?? []).map((id) => new Types.ObjectId(id)),
      categoryIds: (dto.categoryIds ?? []).map((id) => new Types.ObjectId(id)),
      entries: dto.entries.map((e) => ({
        productId: new Types.ObjectId(e.productId),
        variantId: e.variantId ? new Types.ObjectId(e.variantId) : undefined,
        price: e.price,
        discountPercent: e.discountPercent,
        currency: e.currency,
      })),
      volumeTiers: dto.volumeTiers?.map((t) => ({
        minQuantity: t.minQuantity,
        discountPercent: t.discountPercent,
        appliesToProductId: t.appliesToProductId ? new Types.ObjectId(t.appliesToProductId) : undefined,
      })),
    });
  }

  async getPriceBook(id: string) {
    const pb = await priceBookRepo.findById(id);
    if (!pb) throw new NotFoundError('PriceBook');
    return pb;
  }

  async listPriceBooks(page = 1, limit = 20, filter: Record<string, unknown> = {}) {
    return priceBookRepo.findAll(filter, page, limit);
  }

  async updatePriceBook(id: string, dto: UpdatePriceBookDTO) {
    const patch: Record<string, unknown> = { ...dto };
    if (dto.startsAt !== undefined) patch.startsAt = dto.startsAt ? new Date(dto.startsAt) : undefined;
    if (dto.endsAt !== undefined) patch.endsAt = dto.endsAt ? new Date(dto.endsAt) : undefined;
    if (dto.sellerIds !== undefined) patch.sellerIds = dto.sellerIds.map((id) => new Types.ObjectId(id));
    if (dto.categoryIds !== undefined) patch.categoryIds = dto.categoryIds.map((id) => new Types.ObjectId(id));
    if (dto.entries !== undefined) {
      patch.entries = dto.entries.map((e: any) => ({
        productId: new Types.ObjectId(e.productId),
        variantId: e.variantId ? new Types.ObjectId(e.variantId) : undefined,
        price: e.price,
        discountPercent: e.discountPercent,
        currency: e.currency,
      }));
    }
    if (dto.volumeTiers !== undefined) {
      patch.volumeTiers = dto.volumeTiers.map((t: any) => ({
        minQuantity: t.minQuantity,
        discountPercent: t.discountPercent,
        appliesToProductId: t.appliesToProductId ? new Types.ObjectId(t.appliesToProductId) : undefined,
      }));
    }
    const updated = await priceBookRepo.update(id, patch);
    if (!updated) throw new NotFoundError('PriceBook');
    return updated;
  }

  async deletePriceBook(id: string) {
    await priceBookRepo.delete(id);
  }

  async activatePriceBook(id: string) {
    const pb = await priceBookRepo.activate(id);
    if (!pb) throw new NotFoundError('PriceBook');
    return pb;
  }

  async archivePriceBook(id: string) {
    const pb = await priceBookRepo.archive(id);
    if (!pb) throw new NotFoundError('PriceBook');
    return pb;
  }

  // ─── Tax Rules ────────────────────────────────────────────────
  async createTaxRule(dto: CreateTaxRuleDTO) {
    const existing = await taxRuleRepo.findByCode(dto.code);
    if (existing) throw new ConflictError(`Tax code ${dto.code} already exists`);
    return taxRuleRepo.create({
      ...dto,
      code: dto.code.toUpperCase(),
      startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      categoryIds: (dto.categoryIds ?? []).map((id) => new Types.ObjectId(id)),
      sellerIds: (dto.sellerIds ?? []).map((id) => new Types.ObjectId(id)),
    });
  }

  async getTaxRule(id: string) {
    const r = await taxRuleRepo.findById(id);
    if (!r) throw new NotFoundError('TaxRule');
    return r;
  }

  async listTaxRules(activeOnly = false) {
    if (activeOnly) return taxRuleRepo.findActive();
    return taxRuleRepo.findAll();
  }

  async updateTaxRule(id: string, dto: UpdateTaxRuleDTO) {
    const patch: Record<string, unknown> = { ...dto };
    if (dto.startsAt !== undefined) patch.startsAt = dto.startsAt ? new Date(dto.startsAt) : undefined;
    if (dto.endsAt !== undefined) patch.endsAt = dto.endsAt ? new Date(dto.endsAt) : undefined;
    if (dto.categoryIds !== undefined) patch.categoryIds = dto.categoryIds.map((id) => new Types.ObjectId(id));
    if (dto.sellerIds !== undefined) patch.sellerIds = dto.sellerIds.map((id) => new Types.ObjectId(id));
    const updated = await taxRuleRepo.update(id, patch);
    if (!updated) throw new NotFoundError('TaxRule');
    return updated;
  }

  async deleteTaxRule(id: string) {
    await taxRuleRepo.delete(id);
  }

  // ─── Quoting ──────────────────────────────────────────────────
  /**
   * Quote the final prices for a basket of items, applying:
   *   1. Price-book overrides (highest-priority active matching book wins)
   *   2. Volume-tier discounts
   *   3. Tax rules (matching category/state/HSN)
   */
  async quote(items: QuoteItemInput[], opts: { state?: string; country?: string; currency?: string } = {}): Promise<QuoteResult> {
    const currency = opts.currency ?? 'INR';
    const taxRules = await taxRuleRepo.findActive();
    const out: QuoteItemOutput[] = [];
    let subtotalPaise = 0;
    let discountTotalPaise = 0;
    let taxTotalPaise = 0;

    for (const item of items) {
      // 1. Find best matching price book
      const books = await priceBookRepo.findActiveForProduct(item.productId);
      let appliedPrice = item.basePrice;
      let appliedPriceBookId: string | undefined;
      let bookDiscountPercent = 0;

      for (const book of books) {
        // Apply role filter
        if (book.customerRoles && book.customerRoles.length > 0) {
          if (!item.customerRole || !book.customerRoles.includes(item.customerRole)) continue;
        }
        // Apply seller filter
        if (book.sellerIds && book.sellerIds.length > 0) {
          if (!item.sellerId || !book.sellerIds.some((s) => s.toString() === item.sellerId)) continue;
        }

        // Find matching entry
        const entry = book.entries.find(
          (e) =>
            e.productId.toString() === item.productId &&
            (!item.variantId || (e.variantId?.toString() ?? '') === item.variantId)
        );
        if (!entry) continue;

        // Apply price-book override
        if (entry.price !== undefined) {
          appliedPrice = entry.price;
        } else if (entry.discountPercent !== undefined) {
          appliedPrice = item.basePrice * (1 - entry.discountPercent / 100);
        }
        appliedPriceBookId = book._id.toString();
        bookDiscountPercent = entry.discountPercent ?? 0;
        break; // first match (already sorted by priority desc)
      }

      // 2. Apply volume-tier discounts
      let volumeDiscountPercent = 0;
      if (appliedPriceBookId) {
        const book = books.find((b) => b._id.toString() === appliedPriceBookId);
        if (book?.volumeTiers && book.volumeTiers.length > 0) {
          const applicable = book.volumeTiers
            .filter((t) => t.appliesToProductId?.toString() === item.productId || !t.appliesToProductId)
            .filter((t) => item.quantity >= t.minQuantity)
            .sort((a, b) => b.discountPercent - a.discountPercent);
          if (applicable.length > 0) volumeDiscountPercent = applicable[0].discountPercent;
        }
      }

      const appliedPricePaise = toPaise(appliedPrice);
      const lineSubtotalPaise = appliedPricePaise * item.quantity;
      const volumeDiscountPaise = Math.round(lineSubtotalPaise * (volumeDiscountPercent / 100));
      const discountedSubtotalPaise = clampPaise(lineSubtotalPaise - volumeDiscountPaise);

      // 3. Apply tax rules (skipped entirely for non-taxable items)
      const taxBreakdown: Array<{ code: string; rate: number; type: string; amount: number }> = [];
      let lineTaxPaise = 0;
      for (const rule of item.isTaxable === false ? [] : taxRules) {
        // Filter by seller
        if (rule.sellerIds && rule.sellerIds.length > 0) {
          if (!item.sellerId || !rule.sellerIds.some((s) => s.toString() === item.sellerId)) continue;
        }
        // Filter by state
        if (rule.states && rule.states.length > 0) {
          if (!opts.state || !rule.states.includes(opts.state.toUpperCase())) continue;
        }
        // Filter by country
        if (rule.countries && rule.countries.length > 0) {
          if (!opts.country || !rule.countries.includes(opts.country.toUpperCase())) continue;
        }

        let amountPaise = 0;
        if (rule.type === 'percent') {
          const basePaise = rule.isCompound ? discountedSubtotalPaise + lineTaxPaise : discountedSubtotalPaise;
          amountPaise = Math.round(basePaise * (rule.rate / 100));
        } else if (rule.type === 'flat') {
          amountPaise = toPaise(rule.rate);
        } else if (rule.type === 'per_unit') {
          amountPaise = toPaise(rule.rate) * item.quantity;
        }
        lineTaxPaise += amountPaise;
        taxBreakdown.push({ code: rule.code, rate: rule.rate, type: rule.type, amount: fromPaise(amountPaise) });
      }

      // Fallback: if no tax rules applied but the product has a taxRate, use it directly.
      if (lineTaxPaise === 0 && item.isTaxable !== false && item.taxRate && item.taxRate > 0) {
        const amountPaise = Math.round(discountedSubtotalPaise * (item.taxRate / 100));
        lineTaxPaise = amountPaise;
        taxBreakdown.push({ code: 'GST', rate: item.taxRate, type: 'percent', amount: fromPaise(amountPaise) });
      }

      const lineTotalPaise = discountedSubtotalPaise + lineTaxPaise;

      out.push({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        basePrice: item.basePrice,
        appliedPrice: fromPaise(appliedPricePaise),
        discountPercent: bookDiscountPercent + volumeDiscountPercent,
        discountAmount: fromPaise(volumeDiscountPaise),
        taxPercent: taxBreakdown.reduce((s, t) => s + (t.type === 'percent' ? t.rate : 0), 0),
        taxAmount: fromPaise(lineTaxPaise),
        totalPrice: fromPaise(lineTotalPaise),
        currency,
        taxBreakdown,
        appliedPriceBookId,
      });

      subtotalPaise += lineSubtotalPaise;
      discountTotalPaise += volumeDiscountPaise;
      taxTotalPaise += lineTaxPaise;
    }

    return {
      items: out,
      subtotal: fromPaise(subtotalPaise),
      discountTotal: fromPaise(discountTotalPaise),
      taxTotal: fromPaise(taxTotalPaise),
      shippingTotal: 0, // set by checkout module
      grandTotal: fromPaise(subtotalPaise - discountTotalPaise + taxTotalPaise),
      currency,
    };
  }

  /**
   * Convenience: compute tax for a single line item.
   */
  async computeTax(basePrice: number, quantity: number, opts: {
    categoryIds?: string[];
    sellerId?: string;
    state?: string;
    country?: string;
    isCompound?: boolean;
  }): Promise<{ totalTax: number; breakdown: Array<{ code: string; amount: number }> }> {
    const taxRules = await taxRuleRepo.findActive();
    const lineSubtotalPaise = toPaise(basePrice) * quantity;
    let totalTaxPaise = 0;
    const breakdown: Array<{ code: string; amount: number }> = [];

    for (const rule of taxRules) {
      if (rule.categoryIds && rule.categoryIds.length > 0) {
        const cats = opts.categoryIds ?? [];
        if (!cats.some((c) => rule.categoryIds?.some((rc) => rc.toString() === c))) continue;
      }
      if (rule.sellerIds && rule.sellerIds.length > 0) {
        if (!opts.sellerId || !rule.sellerIds.some((s) => s.toString() === opts.sellerId)) continue;
      }
      if (rule.states && rule.states.length > 0) {
        if (!opts.state || !rule.states.includes(opts.state.toUpperCase())) continue;
      }
      if (rule.countries && rule.countries.length > 0) {
        if (!opts.country || !rule.countries.includes(opts.country.toUpperCase())) continue;
      }
      let amountPaise = 0;
      if (rule.type === 'percent') {
        const basePaise = rule.isCompound ? lineSubtotalPaise + totalTaxPaise : lineSubtotalPaise;
        amountPaise = Math.round(basePaise * (rule.rate / 100));
      } else if (rule.type === 'flat') {
        amountPaise = toPaise(rule.rate);
      } else if (rule.type === 'per_unit') {
        amountPaise = toPaise(rule.rate) * quantity;
      }
      totalTaxPaise += amountPaise;
      breakdown.push({ code: rule.code, amount: fromPaise(amountPaise) });
    }

    return { totalTax: fromPaise(totalTaxPaise), breakdown };
  }
}

export const pricingService = new PricingService();
