import Link from "next/link";
import Image from "next/image";
import { generateSEO } from "@/lib/utils/seo";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { BlogPostCard } from "@/components/content/BlogPostCard";
import type { BlogPostPreview } from "@/components/content/BlogPostCard";

export const metadata = generateSEO({
  title: "Learn",
  description:
    "Nutrition science, ingredient deep-dives, wellness guides and expert perspectives — the FUYL editorial hub.",
  url: "https://fuyl.in/pages/learn",
});

const PLACEHOLDER_IMG =
  "https://fuyl.in/cdn/shop/files/FUYL_Complete_Product_Shot.jpg";

const POSTS: BlogPostPreview[] = [
  {
    id: "1",
    slug: "why-most-indians-are-micronutrient-deficient",
    title:
      "Why 80% of Indians Are Micronutrient Deficient (And What to Do About It)",
    excerpt:
      "Despite eating three meals a day, most urban Indians are deficient in at least 5 critical micronutrients. Here is the data, the reasons, and the solution.",
    author: "FUYL Nutrition Team",
    publishedAt: "May 2025",
    image: PLACEHOLDER_IMG,
    imageAlt: "Micronutrient deficiency India",
    tags: ["Nutrition", "Research"],
    readTime: 8,
  },
  {
    id: "2",
    slug: "ashwagandha-complete-guide",
    title: "Ashwagandha: The Complete Evidence-Based Guide",
    excerpt:
      "Everything the clinical research says about ashwagandha — what it does, what it doesn't do, the right dose, and why KSM-66 is the only form worth taking.",
    author: "Dr. Rima Khanna",
    publishedAt: "April 2025",
    image: PLACEHOLDER_IMG,
    imageAlt: "Ashwagandha root",
    tags: ["Adaptogens", "Stress"],
    readTime: 12,
  },
  {
    id: "3",
    slug: "gut-health-immunity-connection",
    title:
      "The Gut-Immunity Connection: Why Your Microbiome Is Your Immune System",
    excerpt:
      "70% of your immune system lives in your gut. Here's the science explaining how your microbiome directly controls your susceptibility to illness — and how to fix it.",
    author: "FUYL Nutrition Team",
    publishedAt: "April 2025",
    image: PLACEHOLDER_IMG,
    imageAlt: "Gut microbiome",
    tags: ["Gut Health", "Immunity"],
    readTime: 10,
  },
  {
    id: "4",
    slug: "vitamin-d-deficiency-india",
    title:
      "The Vitamin D Crisis: Why Living in the Sunniest Country Isn't Enough",
    excerpt:
      "India has more sunshine than almost anywhere on earth. Yet over 80% of urban Indians are Vitamin D deficient. Here's why, and what to do about it.",
    author: "FUYL Nutrition Team",
    publishedAt: "March 2025",
    image: PLACEHOLDER_IMG,
    imageAlt: "Vitamin D sunlight",
    tags: ["Vitamins", "Research"],
    readTime: 7,
  },
  {
    id: "5",
    slug: "magnesium-sleep-anxiety",
    title:
      "Magnesium: The Mineral That Fixes Sleep, Anxiety and Energy — If You Take It Right",
    excerpt:
      "Magnesium is involved in over 300 biochemical reactions. Most people are deficient. Most supplements use the wrong form. Here's everything you need to know.",
    author: "Anjali Mehta, RD",
    publishedAt: "March 2025",
    image: PLACEHOLDER_IMG,
    imageAlt: "Magnesium supplement",
    tags: ["Minerals", "Sleep"],
    readTime: 9,
  },
  {
    id: "6",
    slug: "milk-thistle-liver-health",
    title:
      "Milk Thistle and Your Liver: The Science Behind the Most Important Detox You're Ignoring",
    excerpt:
      "The liver performs 500+ functions. Modern life damages it daily. Milk Thistle's active compound Silymarin is one of the most evidence-backed hepatoprotective agents available.",
    author: "FUYL Nutrition Team",
    publishedAt: "February 2025",
    image: PLACEHOLDER_IMG,
    imageAlt: "Liver health milk thistle",
    tags: ["Liver", "Detox"],
    readTime: 8,
  },
];

const TAGS = [
  "All",
  "Nutrition",
  "Research",
  "Adaptogens",
  "Immunity",
  "Vitamins",
];

export default function LearnPage() {
  const [featured, ...rest] = POSTS;

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
          {/* Tag filter — client-side filtering can be added later */}
          <ScrollReveal>
            <div className="mb-12 flex justify-center border-b border-[var(--color-brand-border)]">
              <div className="flex flex-wrap items-center gap-6">
                {TAGS.map((tag) => (
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

          {/* Featured post */}
          {/* <ScrollReveal>
            <div
              className="pb-14 mb-14 border-b"
              style={{ borderColor: "var(--color-brand-border)" }}
            >
              <BlogPostCard post={featured} featured />
            </div>
          </ScrollReveal> */}

          {/* Grid */}
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-2">
            {rest.map((post, i) => (
              <ScrollReveal key={post.id} delay={i * 70}>
                <BlogPostCard post={post} />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
