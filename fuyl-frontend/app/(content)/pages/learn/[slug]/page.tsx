import Link from "next/link";
import { notFound } from "next/navigation";
import { generateSEO } from "@/lib/utils/seo";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { getPost } from "@/lib/api/content";
import { sanitizeHtml } from "@/lib/utils/sanitizeHtml";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  try {
    const post = await getPost(slug);
    return generateSEO({
      title: post.title,
      description: post.excerpt,
      url: `https://fuyl.in/pages/learn/${slug}`,
    });
  } catch {
    return generateSEO({
      title: slug.replace(/-/g, " "),
      url: `https://fuyl.in/pages/learn/${slug}`,
    });
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;

  let post: Awaited<ReturnType<typeof getPost>>;
  try {
    post = await getPost(slug);
  } catch {
    notFound();
  }

  return (
    <div className="container-brand section-py max-w-3xl mx-auto">
      <ScrollReveal>
        <Breadcrumbs
          className="mb-6"
          items={[
            { label: "Learn", href: "/pages/learn" },
            { label: post.title },
          ]}
        />

        {post.image && (
          <div
            className="relative aspect-video overflow-hidden rounded-sm mb-8"
            style={{ background: "var(--color-brand-cream)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.image}
              alt={post.imageAlt}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <Link
          href="/pages/learn"
          className="text-body-xs font-semibold uppercase tracking-wider hover:text-brand-teal transition-colors"
          style={{ color: "var(--color-brand-muted)" }}
        >
          ← Back to Learn
        </Link>
        <h1 className="text-display-xl font-display mt-6 mb-4">{post.title}</h1>
        <div
          className="flex items-center gap-2 text-body-xs mb-6"
          style={{ color: "var(--color-brand-muted)" }}
        >
          <span>{post.author}</span>
          <span>·</span>
          <span>
            {new Date(post.publishedAt).toLocaleDateString("en-IN", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
          <span>·</span>
          <span>{post.readTime} min read</span>
        </div>
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-body-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-sm"
                style={{
                  background: "var(--color-brand-berry-pale)",
                  color: "var(--color-brand-berry)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        {/* Post content is stored as HTML (the admin editor supports raw HTML).
            Sanitized at render so an authored/injected body can't execute
            scripts in the reader's browser (see lib/utils/sanitizeHtml). */}
        <div
          className="prose max-w-none text-body-md leading-relaxed"
          style={{ color: "var(--color-brand-forest)" }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.body) }}
        />
      </ScrollReveal>
    </div>
  );
}
