import { CustomerProfileRepository } from '../repositories/profile.repository';
import { NotFoundError, BadRequestError } from '../../../shared/errors';
import { eventBus, Events } from '../../../shared/services/eventBus.service';
import { logger } from '../../../config/logger';
import { Types } from 'mongoose';
import { UpdateProfileDTO, AddressDTO, WishlistItemDTO } from '../validators';

const profileRepo = new CustomerProfileRepository();

class CustomerService {
  async getOrCreateProfile(userId: string, displayName?: string) {
    return profileRepo.findOrCreate(new Types.ObjectId(userId), { displayName: displayName ?? 'Customer' });
  }

  async updateProfile(userId: string, dto: UpdateProfileDTO) {
    const patch: Record<string, unknown> = { ...dto };
    if (dto.dateOfBirth) patch.dateOfBirth = new Date(dto.dateOfBirth);
    return profileRepo.update(new Types.ObjectId(userId), patch);
  }

  // ─── Addresses ────────────────────────────────────────────────
  async listAddresses(userId: string) {
    const profile = await this.getOrCreateProfile(userId);
    return profile.addresses;
  }

  async addAddress(userId: string, dto: AddressDTO) {
    return profileRepo.addAddress(new Types.ObjectId(userId), dto as any);
  }

  async updateAddress(userId: string, addressId: string, dto: Partial<AddressDTO>) {
    const updated = await profileRepo.updateAddress(new Types.ObjectId(userId), addressId, dto as any);
    if (!updated) throw new NotFoundError('Address');
    return updated;
  }

  async removeAddress(userId: string, addressId: string) {
    const updated = await profileRepo.removeAddress(new Types.ObjectId(userId), addressId);
    if (!updated) throw new NotFoundError('Address');
    return updated;
  }

  // ─── Wishlist ─────────────────────────────────────────────────
  async getWishlist(userId: string) {
    const profile = await this.getOrCreateProfile(userId);
    return profile.wishlist;
  }

  async addToWishlist(userId: string, dto: WishlistItemDTO) {
    return profileRepo.addToWishlist(new Types.ObjectId(userId), dto.productId, dto.variantId);
  }

  async removeFromWishlist(userId: string, productId: string, variantId?: string) {
    return profileRepo.removeFromWishlist(new Types.ObjectId(userId), productId, variantId);
  }

  // ─── Loyalty ──────────────────────────────────────────────────
  async getLoyaltySummary(userId: string) {
    const profile = await this.getOrCreateProfile(userId);
    return {
      tier: profile.loyaltyTier,
      points: profile.loyaltyPoints,
      lifetimeSpend: profile.lifetimeSpend,
      lifetimeOrders: profile.lifetimeOrders,
      nextTierThreshold: this.getNextTierThreshold(profile.lifetimeSpend),
    };
  }

  private getNextTierThreshold(currentSpend: number): { tier: string; threshold: number; progress: number } | null {
    if (currentSpend < 5000) return { tier: 'silver', threshold: 5000, progress: currentSpend / 5000 };
    if (currentSpend < 20000) return { tier: 'gold', threshold: 20000, progress: currentSpend / 20000 };
    if (currentSpend < 50000) return { tier: 'platinum', threshold: 50000, progress: currentSpend / 50000 };
    return null;
  }
}

export const customerService = new CustomerService();
