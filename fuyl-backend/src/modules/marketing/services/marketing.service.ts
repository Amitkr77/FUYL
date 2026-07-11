import { ContactMessageModel, NewsletterSubscriberModel } from '../models';
import { ContactMessageDTO, NewsletterSubscribeDTO } from '../validators';

class MarketingService {
  async submitContactMessage(dto: ContactMessageDTO) {
    const message = await ContactMessageModel.create(dto);
    // No email-dispatch integration yet (would route through the
    // notification module's template/queue system) — submissions are
    // persisted so nothing is lost, but no one is actively alerted.
    return { id: message._id, received: true };
  }

  async subscribeNewsletter(dto: NewsletterSubscribeDTO) {
    // Idempotent — resubscribing (or re-submitting the same email) just
    // reactivates the existing row instead of erroring on the unique index.
    await NewsletterSubscriberModel.findOneAndUpdate(
      { email: dto.email.toLowerCase().trim() },
      { $set: { isActive: true } },
      { upsert: true }
    );
    return { subscribed: true };
  }
}

export const marketingService = new MarketingService();
