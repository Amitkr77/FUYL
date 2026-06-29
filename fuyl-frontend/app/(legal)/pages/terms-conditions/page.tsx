import { generateSEO } from '@/lib/utils/seo'
import { LegalPage } from '@/components/content/LegalPage'

export const metadata = generateSEO({ title: 'Terms & Conditions', noIndex: true })

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      lastUpdated="January 2025"
      subtitle="The terms governing your use of fuyl.in and purchase of FUYL products."
      sections={[
        {
          heading: 'Acceptance of Terms',
          body: 'By accessing fuyl.in or placing an order, you agree to these Terms and Conditions. If you do not agree, please do not use our website or purchase our products. We reserve the right to update these terms at any time — continued use of the site constitutes acceptance.',
        },
        {
          heading: 'Products & Descriptions',
          body: 'We make every effort to ensure product descriptions, ingredient lists and images are accurate. However, we do not warrant that descriptions are error-free. FUYL COMPLETE+ is a food supplement, not a medicine, and is not intended to diagnose, treat, cure or prevent any disease.',
        },
        {
          heading: 'Pricing & Payment',
          body: [
            'All prices are in Indian Rupees (₹) and inclusive of GST',
            'Prices are subject to change without notice — orders are billed at the price at time of purchase',
            'Payment is accepted via UPI, credit/debit card, net banking and wallets through Razorpay',
            'Failed payments will not result in order confirmation',
          ],
        },
        {
          heading: 'Orders & Availability',
          body: 'Placing an order is an offer to purchase. We reserve the right to refuse or cancel any order at our discretion — for example due to stock availability, pricing errors, or suspected fraudulent activity. In such cases, any payment made will be fully refunded.',
        },
        {
          heading: 'Intellectual Property',
          body: 'All content on fuyl.in — including text, images, logos, graphics, videos and formulations — is the property of Wholsum Wellness Technology Private Limited and is protected by applicable intellectual property laws. You may not reproduce, distribute or commercially exploit any content without prior written consent.',
        },
        {
          heading: 'Health Disclaimer',
          body: 'FUYL COMPLETE+ is a nutritional supplement intended for healthy adults. It is not a substitute for a varied, balanced diet or a healthy lifestyle. Consult your physician before use if you are pregnant, breastfeeding, under 18, or taking prescription medication. Do not exceed the recommended daily dose.',
        },
        {
          heading: 'Limitation of Liability',
          body: 'To the maximum extent permitted by law, Wholsum Wellness Technology Private Limited shall not be liable for any indirect, incidental or consequential damages arising from use of our products or website. Our total liability is limited to the amount paid for the specific order in question.',
        },
        {
          heading: 'Governing Law',
          body: 'These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Mumbai, Maharashtra.',
        },
        {
          heading: 'Contact',
          body: 'For any questions regarding these terms: support@fuyl.in · Wholsum Wellness Technology Pvt. Ltd.',
        },
      ]}
    />
  )
}
