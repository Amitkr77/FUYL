import { generateSEO } from "@/lib/utils/seo";
import { LegalPage } from "@/components/content/LegalPage";
import { getTermsConditionsCMS } from "@/lib/api/content";

export const metadata = generateSEO({
  title: "Terms & Conditions",
  description:
    "The terms governing your use of fuyl.in and purchase of FUYL products.",
  url: "https://fuyl.in/pages/terms-conditions",
});

const FALLBACK_SECTIONS = [
  {
    heading: "Acceptance of Terms",
    body: "By accessing fuyl.in or placing an order, you agree to these Terms and Conditions. If you do not agree, please do not use our website or purchase our products. We reserve the right to update these terms at any time — continued use of the site constitutes acceptance.",
  },
  {
    heading: "Products & Descriptions",
    body: "We make every effort to ensure product descriptions, ingredient lists and images are accurate. However, we do not warrant that descriptions are error-free. FUYL COMPLETE+ is a food supplement, not a medicine, and is not intended to diagnose, treat, cure or prevent any disease.",
  },
  {
    heading: "Pricing & Payment",
    body: [
      "All prices are in Indian Rupees (₹) and inclusive of GST",
      "Prices are subject to change without notice — orders are billed at the price at time of purchase",
      "Payment is accepted via UPI, credit/debit card, net banking and wallets through Razorpay",
      "Failed payments will not result in order confirmation",
    ],
  },
  {
    heading: "Intellectual Property",
    body: "All content on fuyl.in — including text, images, logos, and product formulations — is the property of FUYL (Healthful Wellness Pvt Ltd) or its licensors. You may not reproduce, distribute or create derivative works without written permission.",
  },
  {
    heading: "Limitation of Liability",
    body: "To the maximum extent permitted by law, FUYL is not liable for any indirect, incidental or consequential damages arising from use of our products or website. Our total liability shall not exceed the value of the order in question.",
  },
  {
    heading: "Governing Law",
    body: "These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts of [City], India.",
  },
];

export default async function TermsConditionsPage() {
  const cms = await getTermsConditionsCMS();

  const sections = cms?.sections.map((s) => ({
    heading: s.heading,
    body: s.isList ? s.body.split("\n").filter(Boolean) : s.body,
  })) ?? FALLBACK_SECTIONS;

  return (
    <LegalPage
      title="Terms & Conditions"
      subtitle={cms?.subtitle ?? "The terms governing your use of fuyl.in and purchase of FUYL products."}
      lastUpdated={cms?.lastUpdated ?? "January 2025"}
      sections={sections}
    />
  );
}
