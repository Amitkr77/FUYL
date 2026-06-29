import { generateSEO } from '@/lib/utils/seo'
import { LegalPage } from '@/components/content/LegalPage'

export const metadata = generateSEO({ title: 'Privacy Policy', noIndex: true })

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated="January 2025"
      subtitle="How we collect, use and protect your personal information."
      sections={[
        {
          heading: 'Information We Collect',
          body: [
            'Name, email address, phone number and delivery address when you place an order',
            'Payment information — processed securely by Razorpay, never stored by us',
            'Usage data such as pages visited, time on site and device type via anonymised analytics',
            'Communications you send us via email, WhatsApp or our contact form',
          ],
        },
        {
          heading: 'How We Use Your Information',
          body: [
            'To process and fulfil your orders and send shipping notifications',
            'To respond to your queries and provide customer support',
            'To send you product updates, offers and educational content (only if you opt in)',
            'To improve our website, product and service through anonymised analytics',
          ],
        },
        {
          heading: 'Data Sharing',
          body: 'We share your data only with partners required to fulfil your order — logistics providers (name and address) and payment processors (Razorpay). We do not sell, rent or trade your personal information to any third parties for marketing purposes.',
        },
        {
          heading: 'Cookies',
          body: 'We use essential cookies to keep you logged in and remember your cart. We use analytics cookies (anonymised) to understand how visitors use our site. You can disable non-essential cookies in your browser settings.',
        },
        {
          heading: 'Data Security',
          body: 'All data is transmitted over HTTPS. Payment data is processed by Razorpay (PCI-DSS compliant). We store only what is necessary and review our data practices regularly.',
        },
        {
          heading: 'Your Rights',
          body: [
            'Request access to the personal data we hold about you',
            'Request correction of inaccurate data',
            'Request deletion of your data (subject to legal obligations)',
            'Opt out of marketing communications at any time',
            'Lodge a complaint with the relevant data protection authority',
          ],
        },
        {
          heading: 'Contact',
          body: 'For any privacy-related queries, email us at support@fuyl.in. We aim to respond within 5 business days.',
        },
      ]}
    />
  )
}
