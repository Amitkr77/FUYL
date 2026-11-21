import { connectDB } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
import { getProduct, productLink } from "@/lib/kb";
import { Submission } from "@/models/assessment";

export const dynamic = "force-dynamic";

/**
 * Product CTA: records the first click for conversion reporting, then
 * redirects to COMPLETE+ on fuyl.in with campaign tags. Always redirects,
 * even if the token is unknown or the database is unavailable.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const product = await getProduct();
  try {
    if (/^[A-Za-z0-9_-]{16,64}$/.test(token)) {
      await connectDB();
      await Submission.updateOne({ tokenHash: sha256(token), ctaClickedAt: { $exists: false } }, { $set: { ctaClickedAt: new Date() } });
    }
  } catch (err) {
    console.error("[go] could not record click", err);
  }
  return Response.redirect(productLink(product.url, "result-page"), 302);
}
