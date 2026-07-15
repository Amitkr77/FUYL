import Link from "next/link";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { SITE } from "@/lib/constants/site";
import { getInstagramPosts } from "@/lib/api/content";

const PLACEHOLDERS = Array.from({ length: 3 }, (_, i) => ({
  id: `ig-${i}`,
  src: `https://fuyl.in/cdn/shop/files/FUYL_Complete_Product_Shot.jpg`,
  alt: `FUYL Instagram post ${i + 1}`,
  href: SITE.instagram,
}));

export async function InstagramFeed() {
  const posts = await getInstagramPosts(6);
  // Falls back to static placeholders whenever the feed isn't configured
  // (no INSTAGRAM_ACCESS_TOKEN) or the API call fails for any reason —
  // getInstagramPosts() already swallows errors down to [] for this.
  const tiles = posts.length > 0
    ? posts.map((p) => ({
        id: p.id,
        src: p.mediaUrl,
        alt: p.caption ? p.caption.slice(0, 140) : "FUYL on Instagram",
        href: p.permalink,
      }))
    : PLACEHOLDERS;

  return (
    <section className="section-py bg-white">
      <div className="container-brand">
        <ScrollReveal>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
            <div>
              <span className="inline-block rounded-md px-3 py-2 bg-brand-sage text-brand-forest text-label mb-3 uppercase tracking-widest">
                {/* @fuylnutrition */}
                from our feed
              </span>
              <h2 className="text-display-xl font-display text-brand-forest">
                DAILY NUTRITION, IN REAL LIFE
              </h2>
            </div>
            {/* Teal link — interactive secondary action */}
            <Link
              href={SITE.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="text-body-sm font-semibold shrink-0 text-brand-teal hover:text-brand-teal-dark transition-colors"
            >
              Follow on Instagram →
            </Link>
          </div>
        </ScrollReveal>

        {/* Mobile: horizontal scroll with larger cards; sm+: grid */}
        <div className="overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden -mx-4 sm:mx-0 sm:overflow-visible">
          <div className="flex gap-3 px-4 sm:px-0 pb-2 sm:pb-0 sm:grid sm:grid-cols-3 sm:gap-2 lg:grid-cols-3">
            {tiles.map(({ id, src, alt, href }, i) => (
              <ScrollReveal
                key={id}
                delay={i * 40}
                className="shrink-0 w-52 sm:w-auto"
              >
                <Link
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative block aspect-square overflow-hidden rounded-xl group bg-brand-sage"
                >
                  <img
                    src={src}
                    alt={alt}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  {/* Teal hover overlay — interactive element */}
                  <div className="absolute inset-0 bg-brand-teal/0 group-hover:bg-brand-teal/25 transition-colors duration-300" />
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
