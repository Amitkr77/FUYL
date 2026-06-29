import { Types } from 'mongoose';
import { ICustomerProfile, CustomerProfileModel, ICustomerAddress } from '../models/profile.model';

export class CustomerProfileRepository {
  async findByUserId(userId: string | Types.ObjectId): Promise<ICustomerProfile | null> {
    return CustomerProfileModel.findOne({ userId: new Types.ObjectId(userId.toString()) });
  }

  async findOrCreate(userId: string | Types.ObjectId, defaults?: Partial<ICustomerProfile>): Promise<ICustomerProfile> {
    const existing = await CustomerProfileModel.findOne({ userId: new Types.ObjectId(userId.toString()) });
    if (existing) return existing;
    return CustomerProfileModel.create({
      userId: new Types.ObjectId(userId.toString()),
      displayName: defaults?.displayName ?? 'Customer',
      loyaltyTier: 'bronze',
      loyaltyPoints: 0,
      lifetimeSpend: 0,
      lifetimeOrders: 0,
      preferredLanguage: 'en',
      preferredCurrency: 'INR',
      addresses: [],
      wishlist: [],
      savedPaymentMethods: [],
      marketingOptIn: true,
      ...defaults,
    });
  }

  async update(userId: string | Types.ObjectId, patch: Partial<ICustomerProfile>): Promise<ICustomerProfile | null> {
    return CustomerProfileModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId.toString()) },
      { $set: patch },
      { new: true, upsert: true }
    );
  }

  // ─── Addresses ────────────────────────────────────────────────
  async addAddress(userId: string | Types.ObjectId, address: ICustomerAddress): Promise<ICustomerProfile | null> {
    const profile = await this.findOrCreate(userId);
    if (address.isDefault) {
      // unset other defaults
      profile.addresses.forEach((a) => (a.isDefault = false));
    }
    profile.addresses.push(address);
    return profile.save();
  }

  async updateAddress(userId: string | Types.ObjectId, addressId: string, patch: Partial<ICustomerAddress>): Promise<ICustomerProfile | null> {
    const profile = await this.findByUserId(userId);
    if (!profile) return null;
    const idx = profile.addresses.findIndex((a) => a._id?.toString() === addressId);
    if (idx < 0) return null;
    Object.assign(profile.addresses[idx], patch);
    if (patch.isDefault) {
      profile.addresses.forEach((a, i) => {
        if (i !== idx) a.isDefault = false;
      });
    }
    return profile.save();
  }

  async removeAddress(userId: string | Types.ObjectId, addressId: string): Promise<ICustomerProfile | null> {
    const profile = await this.findByUserId(userId);
    if (!profile) return null;
    profile.addresses = profile.addresses.filter((a) => a._id?.toString() !== addressId);
    return profile.save();
  }

  // ─── Wishlist ─────────────────────────────────────────────────
  async addToWishlist(userId: string | Types.ObjectId, productId: string, variantId?: string): Promise<ICustomerProfile> {
    const profile = await this.findOrCreate(userId);
    const exists = profile.wishlist.some(
      (w) => w.productId.toString() === productId && (w.variantId?.toString() ?? '') === (variantId ?? '')
    );
    if (!exists) {
      profile.wishlist.push({
        productId: new Types.ObjectId(productId),
        variantId: variantId ? new Types.ObjectId(variantId) : undefined,
        addedAt: new Date(),
      });
    }
    return profile.save();
  }

  async removeFromWishlist(userId: string | Types.ObjectId, productId: string, variantId?: string): Promise<ICustomerProfile | null> {
    const profile = await this.findByUserId(userId);
    if (!profile) return null;
    profile.wishlist = profile.wishlist.filter(
      (w) => !(w.productId.toString() === productId && (w.variantId?.toString() ?? '') === (variantId ?? ''))
    );
    return profile.save();
  }

  // ─── Loyalty ──────────────────────────────────────────────────
  async addLoyaltyPoints(userId: string | Types.ObjectId, points: number): Promise<ICustomerProfile | null> {
    return CustomerProfileModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId.toString()) },
      { $inc: { loyaltyPoints: points } },
      { new: true, upsert: true }
    );
  }

  async recordOrder(userId: string | Types.ObjectId, orderTotal: number): Promise<ICustomerProfile | null> {
    const profile = await this.findOrCreate(userId);
    profile.lifetimeSpend += orderTotal;
    profile.lifetimeOrders += 1;
    // Tier upgrade logic
    if (profile.lifetimeSpend >= 50000) profile.loyaltyTier = 'platinum';
    else if (profile.lifetimeSpend >= 20000) profile.loyaltyTier = 'gold';
    else if (profile.lifetimeSpend >= 5000) profile.loyaltyTier = 'silver';
    return profile.save();
  }
}
