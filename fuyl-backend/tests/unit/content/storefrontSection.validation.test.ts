import { storefrontSectionSchemas } from '../../../src/modules/content/validators';

describe('storefront section validation', () => {
  it('accepts a valid announcement section', () => {
    const result = storefrontSectionSchemas['announcement-bar'].safeParse({
      title: 'Announcement Bar',
      isActive: false,
      data: { text: 'Launch offer', linkHref: '/collections/all', linkText: 'Shop', dismissible: true },
    });
    expect(result.success).toBe(true);
  });

  it('rejects unsafe CTA schemes', () => {
    const result = storefrontSectionSchemas['popup-banner'].safeParse({
      title: 'Popup Banner',
      isActive: true,
      data: {
        title: 'Offer', body: 'Details', imageUrl: '', ctaLabel: 'Open',
        ctaHref: 'javascript:alert(1)', delayMs: 1000, frequency: 'once_per_session',
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects unreasonable popup delays and prebooking capacity', () => {
    const result = storefrontSectionSchemas['prebooking-modal'].safeParse({
      title: 'Prebooking Modal',
      isActive: true,
      data: {
        floatingButtonLabel: 'Join', delayMs: -1, capacity: 0, badge: 'Soon',
        headline: 'Join us', description: 'Description', submitButtonLabel: 'Submit',
        privacyNote: '', showDonation: false, donationLabel: '', donationSublabel: '',
        donationQrUrl: '', successHeadline: 'Done', successDescription: 'Thank you',
        whatsappButtonLabel: 'WhatsApp', continueShoppingLabel: 'Continue',
      },
    });
    expect(result.success).toBe(false);
  });

  it('has no writable schema for arbitrary section keys', () => {
    expect(storefrontSectionSchemas['attacker-controlled-key']).toBeUndefined();
  });
});
