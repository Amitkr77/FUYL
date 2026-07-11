import Image from "next/image";
import { generateSEO } from "@/lib/utils/seo";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { BlogPostCard } from "@/components/content/BlogPostCard";
import { getPosts } from "@/lib/api/content";

export const metadata = generateSEO({
  title: "Learn",
  description:
    "Nutrition science, ingredient deep-dives, wellness guides and expert perspectives — the FUYL editorial hub.",
  url: "https://fuyl.in/pages/learn",
});

export default async function LearnPage() {
  let posts: Awaited<ReturnType<typeof getPosts>> = [];
  try {
    posts = await getPosts({ limit: 12 });
  } catch {
    // Graceful fallback — an empty editorial hub renders below rather than crashing.
  }

  const categories = ["All", ...new Set(posts.map((p) => p.tags[0]).filter(Boolean))];

  return (
    <>
      {/* Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-2 min-h-[80vh]">
        {/* Left — Content */}
        <div className="bg-brand-cream flex items-center px-6 py-20 sm:px-10 lg:px-16 xl:px-24 lg:py-28">
          <ScrollReveal>
            <Breadcrumbs className="mb-5" items={[{ label: "Learn" }]} />
            <span className="inline-block rounded-full px-3 py-1 bg-brand-teal/10 text-brand-teal text-label mb-5">
              The FUYL Editorial
            </span>
            <h1 className="text-display-2xl font-display text-brand-forest mb-6">
              LEARN.
            </h1>
            <p className="text-body-lg text-brand-muted leading-relaxed max-w-lg">
              Nutrition science, ingredient deep-dives, wellness guides and
              expert perspectives — no fluff, no brand propaganda.
            </p>
          </ScrollReveal>
        </div>

        {/* Right — Image */}
        <div className="relative min-h-[50vh] lg:min-h-0">
          <Image
            src="/images/ingredients-hero.webp"
            alt="FUYL nutrition science"
            fill
            priority
            className="object-cover object-center"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
      </section>

      <section
        className="section-py"
        style={{ background: "var(--color-brand-white)" }}
      >
        <div className="container-brand">
          {/* Category pills — display-only for now; the backend doesn't
              support filtering by category yet (see lib/api/content.ts) */}
          <ScrollReveal>
            <div className="mb-12 flex justify-center border-b border-[var(--color-brand-border)]">
              <div className="flex flex-wrap items-center gap-6">
                {categories.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="
          relative
          pb-3
          text-sm
          font-semibold
          uppercase
          tracking-wider
          text-gray-600
          transition-colors
          duration-200
          hover:text-brand-forest
          after:absolute
          after:left-0
          after:bottom-0
          after:h-0.5
          after:w-0
          after:bg-brand-forest
          after:transition-all
          after:duration-300
          hover:after:w-full
        "
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Grid */}
          {posts.length === 0 ? (
            <p className="text-body-md text-center py-12" style={{ color: "var(--color-brand-muted)" }}>
              New articles are on the way — check back soon.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-2">
              {posts.map((post, i) => (
                <ScrollReveal key={post.id} delay={i * 70}>
                  <BlogPostCard post={post} />
                </ScrollReveal>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
