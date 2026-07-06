import { generateSEO } from "@/lib/utils/seo";
import { SITE } from "@/lib/constants/site";

export const metadata = generateSEO({
  title: "Refer & Earn",
  description:
    "Join the FUYL Ambassador Programme — share your referral link and earn up to 15% on every order.",
  url: "https://fuyl.in/pages/refer-and-earn",
});

export default function ReferAndEarnPage() {
  return (
    <div className="min-h-screen bg-brand-cream flex flex-col">
      {/* Page header */}
      <div className="bg-white border-b border-brand-border">
        <div className="container-brand py-8">
          <span className="inline-block rounded-full px-3 py-1 bg-brand-teal/10 text-brand-teal text-label mb-3">
            Ambassador Programme
          </span>
          <h1 className="text-display-xl font-display text-brand-forest">
            REFER & EARN
          </h1>
          <p className="text-brand-muted text-body-sm mt-2 max-w-xl">
            Share FUYL with friends and family and earn up to 15% on every order
            placed through your unique link.
          </p>
        </div>
      </div>

      {/* Iframe */}
      <div className="flex-1 w-full">
        <iframe
          src={SITE.referral}
          width="100%"
          height="100%"
          style={{ minHeight: "90vh", border: "none", display: "block" }}
          title="FUYL Referral Programme"
          allow="payment"
        />
      </div>
    </div>
  );
}
