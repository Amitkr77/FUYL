import { generateSEO } from '@/lib/utils/seo'
import { LegalPage } from '@/components/content/LegalPage'
import { getShippingPolicyCMS } from '@/lib/api/content'

export const metadata = generateSEO({ title: 'Shipping Policy', noIndex: true })

const FALLBACK_SECTIONS = [
  { heading: 'Processing Time', body: 'All orders are processed within 1–2 business days (Monday to Saturday, excluding public holidays) after receiving your order confirmation email. You will receive a notification when your order has shipped.' },
  {
    heading: 'Shipping Rates & Delivery Times',
    body: [
      'Free standard shipping on all orders above ₹499 — delivered within 5–7 business days',
      'Standard shipping ₹79 for orders below ₹499 — delivered within 5–7 business days',
      'Express shipping ₹149 — delivered within 2–3 business days (select cities)',
    ],
  },
  { heading: 'Delivery Areas', body: 'We ship to all pin codes across India via Shiprocket and its network of courier partners. For remote areas, delivery may take up to 10 business days. Please ensure your delivery address is correct and complete at the time of ordering.' },
  { heading: 'Order Tracking', body: 'Once your order ships, you will receive a tracking number via email and SMS. You can track your order in real time through the carrier\'s website or through your FUYL account under "My Orders".' },
  { heading: 'Damaged or Lost Orders', body: 'If your order arrives damaged or is lost in transit, please contact us at support@fuyl.in within 48 hours of the expected delivery date with your order number and photographs of any damage. We will arrange a replacement or full refund promptly.' },
  { heading: 'Address Changes', body: 'Address changes can be requested within 2 hours of placing your order. Please contact us immediately at support@fuyl.in or via WhatsApp. Once an order has been dispatched, address changes may not be possible.' },
]

export default async function ShippingPolicyPage() {
  const cms = await getShippingPolicyCMS()

  const lastUpdated = cms?.lastUpdated ?? 'January 2025'
  const subtitle    = cms?.subtitle    ?? 'Everything you need to know about how and when we ship your order.'
  const sections    = cms?.sections.map((s) => ({
    heading: s.heading,
    body: s.isList ? s.body.split('\n').filter(Boolean) : s.body,
  })) ?? FALLBACK_SECTIONS

  return (
    <LegalPage
      title="Shipping Policy"
      lastUpdated={lastUpdated}
      subtitle={subtitle}
      sections={sections}
    />
  )
}
