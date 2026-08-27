import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { SITE } from "@/lib/constants/site";
import { getInstagramPosts } from "@/lib/api/content";

export async function InstagramFeed() {
  const posts = await getInstagramPosts();
  // Only render a genuine feed. When Instagram isn't configured
  // (no INSTAGRAM_ACCESS_TOKEN) or the API returns nothing, hide the section
  // entirely rather than showing duplicate placeholder tiles that look broken
  // and undercut trust. It reappears automatically once a real feed exists.
  if (posts.length === 0) return null;
  const tiles = posts.map((p) => ({
    id: p.id,
    src: p.mediaUrl,
    alt: p.caption ? p.caption.slice(0, 140) : "FUYL on Instagram",
    href: p.permalink,
  }));

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
              className="inline-flex items-center gap-1 text-body-sm font-semibold shrink-0 text-brand-teal hover:text-brand-teal-dark transition-colors"
            >
              Follow on Instagram <ArrowRight size={14} />
            </Link>
          </div>
        </ScrollReveal>

        {/* A single horizontal feed on every breakpoint. Portrait 4:5 cards
            show Instagram photography/reel covers with less aggressive crop. */}
        <div className="overflow-x-auto overscroll-x-contain scroll-smooth snap-x snap-mandatory scrollbar-none [&::-webkit-scrollbar]:hidden -mx-4 sm:-mx-6 lg:-mx-8">
          <div className="flex w-max gap-3 px-4 sm:px-6 lg:px-8 pb-3">
            {tiles.map(({ id, src, alt, href }, i) => (
              <ScrollReveal
                key={id}
                delay={Math.min(i, 10) * 40}
                className="shrink-0 w-56 sm:w-64 lg:w-72 snap-start"
              >
                <Link
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative block aspect-9/16 overflow-hidden rounded-xl group bg-brand-sage"
                >
                  <Image
                    src={src}
                    alt={alt}
                    fill
                    unoptimized
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width: 640px) 224px, (max-width: 1024px) 256px, 288px"
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
