import { generateSEO } from "@/lib/utils/seo";
import { LegalPage } from "@/components/content/LegalPage";
import { getCancellationReturnsCMS } from "@/lib/api/content";

export const metadata = generateSEO({
  title: "Cancellation & Returns",
  description:
    "FUYL's 30-day money-back guarantee and returns process — explained clearly.",
  url: "https://fuyl.in/pages/cancellation-returns",
});

const FALLBACK_SECTIONS = [
  {
    heading: "30-Day Money-Back Guarantee",
    body: "We stand behind FUYL COMPLETE+ with a 30-day money-back guarantee. If you have taken the product consistently for 30 days and do not feel a meaningful improvement in your energy, gut health or overall wellbeing, contact us for a full refund. No questions asked.",
  },
  {
    heading: "Order Cancellation",
    body: [
      "Orders can be cancelled within 2 hours of placement for a full refund",
      "Orders already dispatched cannot be cancelled — initiate a return on delivery instead",
      "To cancel, email support@fuyl.in immediately with your order number",
    ],
  },
  {
    heading: "Return Eligibility",
    body: [
      "Products returned within 30 days of delivery are eligible for a full refund",
      "Damaged or defective products are eligible for replacement or refund regardless of timeline",
      "Opened products are eligible under our 30-day guarantee (see above)",
    ],
  },
  {
    heading: "How to Initiate a Return",
    body: [
      "Email support@fuyl.in with your order number and reason for return",
      "We will provide a return shipping label within 24 hours",
      "Once the return is received and inspected, refunds are processed within 5–7 business days",
    ],
  },
  {
    heading: "Refund Method",
    body: "Refunds are issued to the original payment method. UPI and wallet refunds typically process within 24 hours. Card refunds may take 5–10 business days depending on your bank.",
  },
];

export default async function CancellationReturnsPage() {
  const cms = await getCancellationReturnsCMS();

  const sections = cms?.sections.map((s) => ({
    heading: s.heading,
    body: s.isList ? s.body.split("\n").filter(Boolean) : s.body,
  })) ?? FALLBACK_SECTIONS;

  return (
    <LegalPage
      title="Cancellation & Returns"
      subtitle={cms?.subtitle ?? "Our 30-day money-back guarantee and returns process — explained clearly."}
      lastUpdated={cms?.lastUpdated ?? "January 2025"}
      sections={sections}
    />
  );
}
