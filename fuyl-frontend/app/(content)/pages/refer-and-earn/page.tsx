import { generateSEO } from "@/lib/utils/seo";
import { ReferAndEarnClient } from "@/components/referral/ReferAndEarnClient";

export const metadata = generateSEO({
  title: "Refer & Earn",
  description:
    "Join the FUYL Ambassador Programme — share your referral link and earn wallet credit on every order.",
  url: "https://fuyl.in/pages/refer-and-earn",
});

// BUG FIXED (per explicit request): this used to embed a third-party
// iframe (SITE.referral) instead of the custom referral module — which
// was already fully built and tested on the backend (codes, campaigns,
// rewards, fraud checks) but never surfaced as a real storefront page.
export default function ReferAndEarnPage() {
  return <ReferAndEarnClient />;
}
