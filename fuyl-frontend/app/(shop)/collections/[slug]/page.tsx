import { generateSEO } from "@/lib/utils/seo";
import { getCollection, getProducts } from "@/lib/api/products";
import { CollectionGrid } from "@/components/collection/CollectionGrid";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  if (slug === "all") return generateSEO({ title: "Shop All" });
  try {
    const col = await getCollection(slug);
    return generateSEO({ title: col.title, description: col.description });
  } catch {
    return generateSEO({ title: "Shop All" });
  }
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;

  // BUG FIXED (found live — reported alongside the add-to-cart bug):
  // getCollection() always returns products: [] (the backend has no
  // collection→product resolution engine yet — see its own comment in
  // lib/api/products.ts), which meant every collection page, including the
  // main "/collections/all" browse page linked from Shop/404/breadcrumbs
  // site-wide, permanently fell through to CollectionGrid's hardcoded mock
  // products. Those mock products link to a slug ("fuyl-complete") that
  // doesn't exist in the database, so add-to-cart on them always failed.
  // "all" is the site's general browse page — it isn't a real collection,
  // so it now lists every real published product directly instead of
  // going through the unbuilt collection-filtering path. Named collections
  // still attempt real collection data and simply show an honest empty
  // state (not fake products) until that backend capability exists.
  let products: Awaited<ReturnType<typeof getProducts>> = [];
  let title = "Shop All";

  if (slug === "all") {
    try {
      products = await getProducts({ limit: 60 });
    } catch {
      products = [];
    }
  } else {
    try {
      const col = await getCollection(slug);
      products = col.products;
      title = col.title;
    } catch {
      products = [];
    }
  }

  return (
    <div className="container-brand section-py">
      <Breadcrumbs
        className="mb-6"
        items={
          slug === "all"
            ? [{ label: title }]
            : [{ label: "Shop", href: "/collections/all" }, { label: title }]
        }
      />

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-display-xl font-display">{title.toUpperCase()}</h1>
        <p className="text-body-md mt-2" style={{ color: "var(--color-brand-muted)" }}>
          {products.length} {products.length === 1 ? "product" : "products"}
        </p>
      </div>

      <CollectionGrid products={products} />
    </div>
  );
}
