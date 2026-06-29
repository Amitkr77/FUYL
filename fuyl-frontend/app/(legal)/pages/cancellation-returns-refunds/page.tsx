import { generateSEO } from '@/lib/utils/seo'
import { LegalPage } from '@/components/content/LegalPage'

export const metadata = generateSEO({ title: 'Cancellation, Returns & Refunds', noIndex: true })

export default function ReturnsPage() {
  return (
    <LegalPage
      title="Cancellation, Returns & Refunds"
      lastUpdated="January 2025"
      subtitle="Our 30-day money-back guarantee and returns process — explained clearly."
      sections={[
        {
          heading: '30-Day Money-Back Guarantee',
          body: 'We stand behind FUYL COMPLETE+ with a 30-day money-back guarantee. If you have taken the product consistently for 30 days and do not feel a meaningful improvement in your energy, gut health or overall wellbeing, contact us for a full refund. No questions asked.',
        },
        {
          heading: 'Order Cancellation',
          body: [
            'Orders can be cancelled within 2 hours of placement for a full refund',
            'Orders already dispatched cannot be cancelled — initiate a return on delivery instead',
            'To cancel, email support@fuyl.in immediately with your order number',
          ],
        },
        {
          heading: 'Return Eligibility',
          body: [
            'Products returned within 30 days of delivery are eligible for a full refund',
            'Damaged or defective products are eligible for replacement or refund regardless of timeline',
            'Opened products are eligible under our 30-day guarantee (see above)',
            'Products purchased during flash sales or with discount codes are eligible at the paid price',
          ],
        },
        {
          heading: 'How to Initiate a Return',
          body: [
            'Email support@fuyl.in with your order number and reason for return',
            'Our team will respond within 24 hours with return instructions',
            'Pack the product securely — we will arrange pickup in most cities',
            'Refund is processed within 5–7 business days of receiving the return',
          ],
        },
        {
          heading: 'Refund Method',
          body: 'Refunds are issued to the original payment method. UPI and card refunds typically appear within 5–7 business days. Bank transfers may take up to 10 business days. We will notify you by email once the refund is processed.',
        },
        {
          heading: 'Non-Returnable Items',
          body: [
            'Products tampered with or showing signs of misuse',
            'Products returned after 30 days without prior approval',
            'Gift cards and promotional items',
          ],
        },
        {
          heading: 'Contact for Returns',
          body: 'Email: support@fuyl.in · WhatsApp: +91 9274787827 · Hours: Monday–Saturday, 9am–6pm IST',
        },
      ]}
    />
  )
}
