import crypto from 'crypto';
import { AffiliateRepository } from '../repositories/affiliate.repository';
import { IAffiliate } from '../models/affiliate.model';
import { IAffiliateProgram } from '../models/program.model';
import { AffiliateSettingsModel, IAffiliateSettings } from '../models/settings.model';
import { AffiliateImpersonationModel } from '../models/impersonation.model';
import { UserModel } from '../../identity/models/user.model';
import { signShortAccessToken, hashToken } from '../../identity/utils/crypto';
import { auditService } from '../../../shared/services/audit.service';
import { ProgramRepository } from '../repositories/program.repository';
import { LinkRepository } from '../repositories/link.repository';
import { CommissionRepository } from '../repositories/commission.repository';
import { PayoutRepository } from '../repositories/payout.repository';
import { AffiliateStatus } from '../../../shared/enums';
import { NotFoundError, ConflictError, BadRequestError } from '../../../shared/errors';
import { logger } from '../../../config/logger';
import mongoose from 'mongoose';

const affiliateRepo  = new AffiliateRepository();
const programRepo    = new ProgramRepository();
const linkRepo       = new LinkRepository();
const commissionRepo = new CommissionRepository();
const payoutRepo     = new PayoutRepository();

export class AffiliateService {
  /** Public: submit an affiliate application. */
  async apply(input: {
    name:     string;
    email:    string;
    phone?:   string;
    channels: string[];
    userId?:  string;
    message?: string;
  }) {
    const settings = await AffiliateSettingsModel.findOneAndUpdate({ key: 'default' }, { $setOnInsert: { key: 'default' } }, { upsert: true, new: true });
    if (!settings.registrationEnabled) throw new BadRequestError('Affiliate registration is currently closed');
    if (settings.requiredFields.includes('phone') && !input.phone?.trim()) throw new BadRequestError('Phone is required');
    const existing = await affiliateRepo.findByEmail(input.email);
    if (existing) throw new ConflictError('An application with this email already exists');

    const program = settings.defaultProgramId ? await programRepo.findById(settings.defaultProgramId) : await programRepo.findActive();
    if (!program) throw new BadRequestError('No active affiliate program at this time');

    const affiliate = await affiliateRepo.create({
      name:      input.name,
      email:     input.email,
      phone:     input.phone,
      channels:  input.channels,
      userId:    input.userId ? new mongoose.Types.ObjectId(input.userId) : (await UserModel.findOne({ emailLower: input.email.toLowerCase().trim(), isActive: true, isDeleted: false }))?._id,
      programId: program._id,
      status:    settings.autoApprove ? AffiliateStatus.APPROVED : AffiliateStatus.PENDING,
      ...(settings.autoApprove ? { approvedAt: new Date() } : {}),
    });

    if (settings.autoApprove) { const code=await this.generateUniqueCode(affiliate.name); await linkRepo.create({affiliateId:affiliate._id,code,destination:'/',label:'Default'}); }

    logger.info(`[affiliate] new application: ${affiliate.email} (${affiliate._id})`);
    return affiliate;
  }

  /** Admin: approve an application — creates the default tracking link. */
  async approve(affiliateId: string, actorId: string) {
    const affiliate = await affiliateRepo.findById(affiliateId);
    if (!affiliate) throw new NotFoundError('Affiliate');
    if (affiliate.status !== AffiliateStatus.PENDING) {
      throw new ConflictError(`Affiliate is already ${affiliate.status}`);
    }

    await affiliateRepo.update(affiliateId, {
      status:     AffiliateStatus.APPROVED,
      approvedAt: new Date(),
    });

    // Auto-create default tracking link
    const code = await this.generateUniqueCode(affiliate.name);
    await linkRepo.create({
      affiliateId: affiliate._id,
      code,
      destination: '/',
      label:       'Default',
    });

    logger.info(`[affiliate] approved: ${affiliateId} by ${actorId}, code=${code}`);
    return { affiliate, code };
  }

  /** Admin: reject an application. */
  async reject(affiliateId: string, reason: string, actorId: string) {
    const affiliate = await affiliateRepo.findById(affiliateId);
    if (!affiliate) throw new NotFoundError('Affiliate');

    await affiliateRepo.update(affiliateId, {
      status:         AffiliateStatus.REJECTED,
      rejectedAt:     new Date(),
      rejectedReason: reason,
    });

    logger.info(`[affiliate] rejected: ${affiliateId} by ${actorId}: ${reason}`);
  }

  /** Admin: suspend an active affiliate. */
  async suspend(affiliateId: string, reason: string, actorId: string) {
    const affiliate = await affiliateRepo.findById(affiliateId);
    if (!affiliate) throw new NotFoundError('Affiliate');

    await affiliateRepo.update(affiliateId, {
      status:          AffiliateStatus.SUSPENDED,
      suspendedAt:     new Date(),
      suspendedReason: reason,
    });

    logger.info(`[affiliate] suspended: ${affiliateId} by ${actorId}: ${reason}`);
  }

  /** Affiliate: update their own payment info. */
  async updatePaymentInfo(
    affiliateId: string,
    info: { upi?: string; bankAccount?: string; ifsc?: string; accountName?: string }
  ) {
    return affiliateRepo.update(affiliateId, { paymentInfo: info });
  }

  /** Affiliate: create a new tracking link. */
  async createLink(affiliateId: string, input: { destination: string; label?: string }) {
    const affiliate = await affiliateRepo.findById(affiliateId);
    if (!affiliate) throw new NotFoundError('Affiliate');
    if (affiliate.status !== AffiliateStatus.APPROVED) {
      throw new BadRequestError('Only approved affiliates can create links');
    }

    // Destination must be a relative path (no external redirects).
    // This prevents open-redirect attacks where an affiliate could set
    // destination to an arbitrary URL like "https://phishing.example.com".
    const dest = input.destination.trim();
    if (!dest.startsWith('/') || dest.includes('://') || dest.length > 500) {
      throw new BadRequestError('destination must be a relative path starting with /');
    }

    const code = await this.generateUniqueCode(affiliate.name);
    return linkRepo.create({
      affiliateId: affiliate._id,
      code,
      destination: dest,
      label:       input.label,
    });
  }

  /** Affiliate: fetch my dashboard data. */
  async myDashboard(affiliateId: string) {
    const [affiliate, links, commissions, payouts] = await Promise.all([
      affiliateRepo.findById(affiliateId),
      linkRepo.findByAffiliate(affiliateId),
      commissionRepo.findByAffiliate(affiliateId),
      payoutRepo.findByAffiliate(affiliateId),
    ]);
    if (!affiliate) throw new NotFoundError('Affiliate');

    const siteUrl = process.env.CLIENT_URL ?? 'http://localhost:3000';
    const linksWithUrl = links.map((l) => ({
      ...l.toObject(),
      trackingUrl: `${siteUrl}/r/${l.code}`,
    }));

    return {
      affiliate,
      links: linksWithUrl,
      commissions,
      payouts,
      stats: affiliate.stats,
    };
  }

  /** Affiliate: get my payouts. */
  async myPayouts(affiliateId: string) {
    return payoutRepo.findByAffiliate(affiliateId);
  }

  /** Affiliate: get the active program's public details. */
  async getProgram(affiliateId: string) {
    const affiliate = await affiliateRepo.findById(affiliateId);
    if (!affiliate) throw new NotFoundError('Affiliate');
    const program = await programRepo.findById(affiliate.programId);
    if (!program) throw new NotFoundError('Affiliate program');
    return {
      name:                  program.name,
      description:           program.description,
      defaultRate:           program.defaultRate,
      commissionBase:        program.commissionBase,
      attributionWindowDays: program.attributionWindowDays,
      minPayoutAmount:       program.minPayoutAmount,
    };
  }

  /** Affiliate: update their own editable profile fields. */
  async updateProfile(
    affiliateId: string,
    patch: {
      name?:          string;
      phone?:         string;
      channels?:      string[];
      website?:       string;
      socialHandles?: Record<string, string>;
    }
  ) {
    const { website, socialHandles, ...directFields } = patch;
    const update: Partial<IAffiliate> = { ...directFields };

    // website and socialHandles live in the metadata bag so the model
    // schema does not need a migration for every new social platform.
    if (website !== undefined || socialHandles !== undefined) {
      const affiliate = await affiliateRepo.findById(affiliateId);
      if (!affiliate) throw new NotFoundError('Affiliate');
      update.metadata = {
        ...(affiliate.metadata ?? {}),
        ...(website !== undefined ? { website } : {}),
        ...(socialHandles !== undefined ? { socialHandles } : {}),
      };
    }

    return affiliateRepo.update(affiliateId, update);
  }

  /** Affiliate: get my links. */
  async myLinks(affiliateId: string) {
    const links = await linkRepo.findByAffiliate(affiliateId);
    const siteUrl = process.env.CLIENT_URL ?? 'http://localhost:3000';
    return links.map((l) => ({
      ...l.toObject(),
      trackingUrl: `${siteUrl}/r/${l.code}`,
    }));
  }

  /** Find an approved affiliate by their userId (for auth'd requests). */
  async findByUserId(userId: string) {
    const affiliate = await affiliateRepo.findByUserId(userId);
    if (!affiliate) throw new NotFoundError('Affiliate profile');
    return affiliate;
  }

  async resolvePortalAffiliate(user: { userId: string; email?: string; impersonatedAffiliateId?: string }) {
    if (user.impersonatedAffiliateId) { const affiliate=await affiliateRepo.findById(user.impersonatedAffiliateId);if(!affiliate)throw new NotFoundError('Affiliate profile');return affiliate; }
    const linked=await affiliateRepo.findByUserId(user.userId);
    if(linked)return linked;
    if(user.email){const byEmail=await affiliateRepo.findByEmail(user.email);if(byEmail&&!byEmail.userId){const claimed=await affiliateRepo.update(byEmail._id,{userId:new mongoose.Types.ObjectId(user.userId)});if(claimed)return claimed;}}
    throw new NotFoundError('Affiliate profile');
  }

  async createImpersonation(affiliateId:string,admin:{userId:string;role:string}){const affiliate=await affiliateRepo.findById(affiliateId);if(!affiliate)throw new NotFoundError('Affiliate');if(affiliate.status!==AffiliateStatus.APPROVED)throw new BadRequestError('Only approved affiliates can be impersonated');const raw=crypto.randomBytes(32).toString('hex');await AffiliateImpersonationModel.create({tokenHash:hashToken(raw),affiliateId:affiliate._id,adminUserId:new mongoose.Types.ObjectId(admin.userId),expiresAt:new Date(Date.now()+300000)});await auditService.write(admin,'affiliate.impersonation.created',{type:'affiliate',id:affiliateId},{expiresInMinutes:5});return{code:raw,expiresInSeconds:300}}

  async exchangeImpersonation(code:string){const session=await AffiliateImpersonationModel.findOneAndUpdate({tokenHash:hashToken(code),usedAt:{$exists:false},expiresAt:{$gt:new Date()}},{$set:{usedAt:new Date()}},{new:true});if(!session)throw new BadRequestError('Impersonation link is invalid, expired, or already used');const affiliate=await affiliateRepo.findById(session.affiliateId);if(!affiliate||affiliate.status!==AffiliateStatus.APPROVED)throw new BadRequestError('Affiliate is not active');const linked=affiliate.userId?await UserModel.findById(affiliate.userId):null;const userId=linked?._id.toString()??affiliate._id.toString();const accessToken=signShortAccessToken({userId,role:'customer',email:affiliate.email,permissions:[],impersonatedAffiliateId:affiliate._id.toString(),impersonatedBy:session.adminUserId.toString()},'15m');await auditService.write({userId:session.adminUserId.toString(),role:'admin'},'affiliate.impersonation.started',{type:'affiliate',id:affiliate._id.toString()});return{accessToken,affiliate,user:{_id:userId,email:affiliate.email,firstName:affiliate.name.split(' ')[0]??'',lastName:affiliate.name.split(' ').slice(1).join(' '),phone:affiliate.phone},expiresInSeconds:900}}

  // ─── Admin helpers ────────────────────────────────────────────────────────

  async adminList(input: { page: number; limit: number; status?: string; programId?: string; search?: string; sort?: string; direction?: string }) {
    const filter: Record<string, unknown> = {};
    if (input.status) filter.status = input.status;
    if (input.programId) filter.programId = input.programId;
    if (input.search) {
      const escaped = input.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
        { phone: { $regex: escaped, $options: 'i' } },
      ];
    }
    const allowedSort = new Set(['createdAt', 'name', 'status', 'stats.totalClicks', 'stats.totalOrders', 'stats.totalRevenue']);
    const sortField = allowedSort.has(input.sort ?? '') ? input.sort! : 'createdAt';
    return affiliateRepo.paginate(filter, input.page, input.limit, { [sortField]: input.direction === 'asc' ? 1 : -1 });
  }

  async adminDetail(affiliateId: string) {
    const affiliate = await affiliateRepo.adminDetail(affiliateId);
    if (!affiliate) throw new NotFoundError('Affiliate');
    const [links, commissions, payouts] = await Promise.all([
      linkRepo.findByAffiliate(affiliateId),
      commissionRepo.findByAffiliate(affiliateId),
      payoutRepo.findByAffiliate(affiliateId),
    ]);
    const siteUrl = process.env.CLIENT_URL ?? 'http://localhost:3000';
    return {
      affiliate,
      links: links.map((link) => ({ ...link.toObject(), trackingUrl: `${siteUrl}/r/${link.code}` })),
      commissions,
      payouts,
    };
  }

  async adminCreate(input: { name: string; email: string; phone?: string; channels?: string[]; programId?: string; status?: string }) {
    if (!input.name?.trim() || !input.email?.trim()) throw new BadRequestError('name and email are required');
    if (await affiliateRepo.findByEmail(input.email)) throw new ConflictError('An affiliate with this email already exists');
    const program = input.programId ? await programRepo.findById(input.programId) : await programRepo.findActive();
    if (!program) throw new BadRequestError('An active affiliate program is required');
    const approved = input.status === AffiliateStatus.APPROVED;
    const linkedUser=await UserModel.findOne({emailLower:input.email.trim().toLowerCase(),isActive:true,isDeleted:false});
    const affiliate = await affiliateRepo.create({
      name: input.name.trim(), email: input.email.trim().toLowerCase(), phone: input.phone?.trim(),
      channels: input.channels ?? [], programId: program._id,
      status: approved ? AffiliateStatus.APPROVED : AffiliateStatus.PENDING,
      userId: linkedUser?._id,
      ...(approved ? { approvedAt: new Date() } : {}),
    });
    if (approved) {
      const code = await this.generateUniqueCode(affiliate.name);
      await linkRepo.create({ affiliateId: affiliate._id, code, destination: '/', label: 'Default' });
    }
    return affiliate;
  }

  async adminUpdate(affiliateId: string, patch: { name?: string; phone?: string; channels?: string[]; programId?: string; paymentInfo?: IAffiliate['paymentInfo'] }) {
    const affiliate = await affiliateRepo.findById(affiliateId);
    if (!affiliate) throw new NotFoundError('Affiliate');
    if (patch.programId && !(await programRepo.findById(patch.programId))) throw new NotFoundError('Affiliate program');
    return affiliateRepo.update(affiliateId, patch as Partial<IAffiliate>);
  }

  async adminReview(affiliateId: string, input: { internalNote?: string; fraudStatus?: 'clear'|'review'|'blocked'; fraudNote?: string }, actorId: string) {
    const affiliate=await affiliateRepo.findById(affiliateId);if(!affiliate)throw new NotFoundError('Affiliate');
    return affiliateRepo.update(affiliateId,{metadata:{...(affiliate.metadata??{}),internalNote:input.internalNote??(affiliate.metadata as any)?.internalNote,fraudReview:{status:input.fraudStatus??(affiliate.metadata as any)?.fraudReview?.status??'clear',note:input.fraudNote??(affiliate.metadata as any)?.fraudReview?.note,reviewedAt:new Date(),reviewedBy:actorId}}});
  }

  async adminCreateLink(affiliateId:string,input:{destination:string;label?:string}){return this.createLink(affiliateId,input)}
  async adminUpdateLink(affiliateId:string,linkId:string,input:{destination?:string;label?:string;isActive?:boolean}){const link=await linkRepo.findById(linkId);if(!link||link.affiliateId.toString()!==affiliateId)throw new NotFoundError('Affiliate link');if(input.destination!==undefined){const d=input.destination.trim();if(!d.startsWith('/')||d.includes('://')||d.length>500)throw new BadRequestError('destination must be a relative path starting with /');}return linkRepo.update(linkId,input)}

  async affiliateSettings(publicOnly=false){const settings=await AffiliateSettingsModel.findOneAndUpdate({key:'default'},{$setOnInsert:{key:'default'}},{upsert:true,new:true}).populate('defaultProgramId','name defaultRate');if(publicOnly)return {registrationEnabled:settings.registrationEnabled,signupTitle:settings.signupTitle,signupIntroduction:settings.signupIntroduction,termsUrl:settings.termsUrl,requiredFields:settings.requiredFields,defaultProgram:settings.defaultProgramId};return settings}
  async updateAffiliateSettings(input:Partial<IAffiliateSettings>){if(input.defaultProgramId&&!(await programRepo.findById(input.defaultProgramId)))throw new NotFoundError('Affiliate program');return AffiliateSettingsModel.findOneAndUpdate({key:'default'},{$set:{registrationEnabled:input.registrationEnabled,autoApprove:input.autoApprove,defaultProgramId:input.defaultProgramId,signupTitle:input.signupTitle,signupIntroduction:input.signupIntroduction,termsUrl:input.termsUrl,requiredFields:input.requiredFields,notificationEmail:input.notificationEmail}},{upsert:true,new:true,runValidators:true})}

  async reactivate(affiliateId: string, actorId: string) {
    const affiliate = await affiliateRepo.findById(affiliateId);
    if (!affiliate) throw new NotFoundError('Affiliate');
    if (![AffiliateStatus.SUSPENDED, AffiliateStatus.REJECTED].includes(affiliate.status as any)) throw new ConflictError('Only suspended or rejected affiliates can be reactivated');
    const updated = await affiliateRepo.update(affiliateId, { status: AffiliateStatus.APPROVED, approvedAt: new Date(), suspendedReason: undefined, rejectedReason: undefined });
    if ((await linkRepo.findByAffiliate(affiliateId)).length === 0) {
      const code = await this.generateUniqueCode(affiliate.name);
      await linkRepo.create({ affiliateId: affiliate._id, code, destination: '/', label: 'Default' });
    }
    logger.info(`[affiliate] reactivated: ${affiliateId} by ${actorId}`);
    return updated;
  }

  async adminStats() {
    return affiliateRepo.adminStats();
  }

  async adminPrograms() {
    const programs = await programRepo.listAll();
    return Promise.all(programs.map(async (program) => ({ ...program.toObject(), affiliateCount: await affiliateRepo.countByProgram(program._id) })));
  }

  async adminProgram(id: string) {
    const program = await programRepo.findById(id);
    if (!program) throw new NotFoundError('Affiliate program');
    return { ...program.toObject(), affiliateCount: await affiliateRepo.countByProgram(id) };
  }

  async createProgram(input: Partial<IAffiliateProgram>) {
    if (!input.name?.trim()) throw new BadRequestError('Program name is required');
    if (input.defaultRate === undefined || input.defaultRate < 0 || input.defaultRate > 100) throw new BadRequestError('Default rate must be between 0 and 100');
    const program = await programRepo.create({
      name: input.name.trim(), description: input.description?.trim(), isActive: input.isActive ?? true,
      isDefault: false, defaultRate: input.defaultRate, commissionBase: input.commissionBase ?? 'subtotal',
      attributionWindowDays: input.attributionWindowDays ?? 30, tiers: input.tiers ?? [],
      minPayoutAmount: input.minPayoutAmount ?? 500, autoApproveAfterDays: input.autoApproveAfterDays ?? 7,
    });
    const existing = await programRepo.listAll();
    if (input.isDefault || existing.length === 1) return programRepo.setDefault(program._id);
    return program;
  }

  async updateProgram(id: string, input: Partial<IAffiliateProgram>) {
    const existing = await programRepo.findById(id);
    if (!existing) throw new NotFoundError('Affiliate program');
    if (input.defaultRate !== undefined && (input.defaultRate < 0 || input.defaultRate > 100)) throw new BadRequestError('Default rate must be between 0 and 100');
    const patch = { ...input };
    delete patch.isDefault;
    const updated = await programRepo.update(id, patch);
    if (input.isDefault) return programRepo.setDefault(id);
    return updated;
  }

  async setDefaultProgram(id: string) {
    if (!(await programRepo.findById(id))) throw new NotFoundError('Affiliate program');
    return programRepo.setDefault(id);
  }

  async deleteProgram(id: string) {
    const program = await programRepo.findById(id);
    if (!program) throw new NotFoundError('Affiliate program');
    if (program.isDefault) throw new ConflictError('The default program cannot be deleted');
    if (await affiliateRepo.countByProgram(id)) throw new ConflictError('Move affiliates to another program before deleting this program');
    await programRepo.delete(id);
  }

  // ─── Internals ────────────────────────────────────────────────────────────

  private async generateUniqueCode(name: string): Promise<string> {
    const base = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5);
    for (let attempt = 0; attempt < 10; attempt++) {
      const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
      const code   = `${base}${suffix}`;
      const exists = await linkRepo.findByCode(code);
      if (!exists) return code;
    }
    return `AFF${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }
}

export const affiliateService = new AffiliateService();
