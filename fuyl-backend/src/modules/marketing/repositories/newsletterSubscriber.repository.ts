import { FilterQuery } from 'mongoose';
import {
  NewsletterSubscriberModel,
  INewsletterSubscriber,
  NewsletterStatus,
} from '../models/newsletterSubscriber.model';

export class NewsletterSubscriberRepository {
  findByEmail(email: string) {
    return NewsletterSubscriberModel.findOne({ email: email.toLowerCase().trim() });
  }

  findByVerificationTokenHash(hash: string) {
    return NewsletterSubscriberModel.findOne({ verificationTokenHash: hash });
  }

  findByUnsubscribeToken(token: string) {
    return NewsletterSubscriberModel.findOne({ unsubscribeToken: token });
  }

  create(data: Partial<INewsletterSubscriber>) {
    return NewsletterSubscriberModel.create(data);
  }

  async paginate(
    filter: FilterQuery<INewsletterSubscriber> = {},
    page = 1,
    limit = 20
  ) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      NewsletterSubscriberModel.find(filter)
        .select('-verificationTokenHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      NewsletterSubscriberModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  /** Counts per status + total — powers the admin stat cards. */
  async statsForAdmin() {
    const [total, active, pending, unsubscribed] = await Promise.all([
      NewsletterSubscriberModel.countDocuments({}),
      NewsletterSubscriberModel.countDocuments({ status: 'active' }),
      NewsletterSubscriberModel.countDocuments({ status: 'pending' }),
      NewsletterSubscriberModel.countDocuments({ status: 'unsubscribed' }),
    ]);
    return { total, active, pending, unsubscribed };
  }

  countByStatus(status: NewsletterStatus) {
    return NewsletterSubscriberModel.countDocuments({ status });
  }

  deleteById(id: string) {
    return NewsletterSubscriberModel.findByIdAndDelete(id);
  }
}

export const newsletterSubscriberRepository = new NewsletterSubscriberRepository();
