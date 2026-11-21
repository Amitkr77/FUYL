import { parse as parseHTML, type HTMLElement } from "node-html-parser";
import { z } from "zod";

/**
 * Pure parsers for the two fuyl.in sources. No network, no database — so they
 * can be unit-tested against snapshots of the real pages.
 *
 *  1. Shopify product JSON  — https://fuyl.in/products/<handle>.json
 *  2. Ingredients page HTML — https://fuyl.in/pages/ingredients
 *     Each ingredient is a `.fuyl-card` with data-title / data-category /
 *     data-image and a hidden `.fuyl-card-data` body made of
 *     "The Ingredient" / "What It Does" / "Why It Matters" sections.
 *
 * Everything is stored as PLAIN TEXT — never raw HTML — so synced content can
 * never inject markup into the app.
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Shopify CDN URLs are often protocol-relative ("//fuyl.in/cdn/..."). */
export function absoluteUrl(src: string, base = "https://fuyl.in"): string {
  if (src.startsWith("//")) return `https:${src}`;
  if (src.startsWith("/")) return `${base.replace(/\/$/, "")}${src}`;
  return src;
}

/** Strip Shopify's sizing param so we store one canonical image URL. */
export function canonicalImage(src: string): string {
  const url = new URL(absoluteUrl(src));
  url.searchParams.delete("width");
  url.searchParams.delete("height");
  return url.toString();
}

/** File name of an image URL, e.g. "ShopPic-5.png". */
export function imageFileName(src: string): string {
  return decodeURIComponent(new URL(absoluteUrl(src)).pathname.split("/").pop() ?? "");
}

const text = (el: HTMLElement | null | undefined) => (el ? el.text.replace(/\s+/g, " ").trim() : "");

// ─── 1 · Shopify product ────────────────────────────────────────────────────

const ShopifyProduct = z.object({
  product: z.object({
    id: z.number(),
    title: z.string(),
    handle: z.string(),
    body_html: z.string().nullable().optional(),
    variants: z
      .array(
        z.object({
          id: z.number(),
          title: z.string(),
          price: z.string(),
          compare_at_price: z.string().nullable().optional(),
          available: z.boolean().optional(),
        }),
      )
      .min(1),
    images: z.array(z.object({ src: z.string(), alt: z.string().nullable().optional(), position: z.number().optional() })),
  }),
});

export interface StoreVariant {
  title: string;
  price: number;
  compareAtPrice?: number;
  available?: boolean;
}

export interface StoreImage {
  src: string;
  alt?: string;
  file: string;
  position: number;
}

export interface StoreProductData {
  handle: string;
  title: string;
  url: string;
  description: string;
  priceFrom: number;
  currency: "INR";
  variants: StoreVariant[];
  images: StoreImage[];
}

export function parseProductJson(json: unknown, storeUrl = "https://fuyl.in"): StoreProductData {
  const { product } = ShopifyProduct.parse(json);
  const variants: StoreVariant[] = product.variants.map((v) => ({
    title: v.title,
    price: Number(v.price),
    compareAtPrice: v.compare_at_price ? Number(v.compare_at_price) : undefined,
    available: v.available,
  }));
  if (variants.some((v) => !Number.isFinite(v.price))) throw new Error("Product has a non-numeric price");

  const images: StoreImage[] = product.images.map((img, i) => ({
    src: absoluteUrl(img.src, storeUrl),
    alt: img.alt ?? undefined,
    file: imageFileName(img.src),
    position: img.position ?? i + 1,
  }));

  return {
    handle: product.handle,
    title: product.title,
    url: `${storeUrl.replace(/\/$/, "")}/products/${product.handle}`,
    description: text(parseHTML(product.body_html ?? "")),
    priceFrom: Math.min(...variants.map((v) => v.price)),
    currency: "INR",
    variants,
    images,
  };
}

// ─── 2 · Ingredients page ───────────────────────────────────────────────────

export interface StoreIngredientPoint {
  heading: string;
  text: string;
}

export interface StoreIngredientData {
  title: string;
  category: string;
  image?: string;
  about: string;
  whatItDoes: StoreIngredientPoint[];
  whyItMatters: string;
}

type Section = "about" | "what" | "why" | null;

function sectionFor(heading: string): Section {
  const h = heading.toLowerCase();
  if (h.startsWith("the ingredient")) return "about";
  if (h.startsWith("what it does")) return "what";
  if (h.startsWith("why it matters")) return "why";
  return null;
}

/** Parse the hidden body of one card into its three sections. */
function parseCardBody(body: HTMLElement | null): Pick<StoreIngredientData, "about" | "whatItDoes" | "whyItMatters"> {
  const out = { about: "", whatItDoes: [] as StoreIngredientPoint[], whyItMatters: "" };
  if (!body) return out;
  let section: Section = null;

  for (const p of body.querySelectorAll("p")) {
    const full = text(p);
    if (!full) continue;
    const strong = p.querySelector("strong");
    const strongText = text(strong);

    // A paragraph that is ONLY a <strong> heading switches section.
    if (strong && strongText === full) {
      const next = sectionFor(full);
      if (next) {
        section = next;
        continue;
      }
    }

    if (section === "about") out.about = [out.about, full].filter(Boolean).join(" ");
    else if (section === "why") out.whyItMatters = [out.whyItMatters, full].filter(Boolean).join(" ");
    else if (section === "what") {
      // "<strong>Eye health – </strong>Lutein and …"
      if (strong && strongText && full.startsWith(strongText)) {
        out.whatItDoes.push({
          heading: strongText.replace(/[\s–—:-]+$/u, "").trim(),
          text: full.slice(strongText.length).trim(),
        });
      } else {
        out.whatItDoes.push({ heading: "", text: full });
      }
    }
  }
  return out;
}

export function parseIngredientsPage(html: string): StoreIngredientData[] {
  const root = parseHTML(html);
  const seen = new Set<string>();
  const out: StoreIngredientData[] = [];

  for (const card of root.querySelectorAll(".fuyl-card")) {
    const title = (card.getAttribute("data-title") ?? "").trim();
    if (!title || seen.has(title)) continue;
    seen.add(title);
    const rawImage = card.getAttribute("data-image");
    out.push({
      title,
      category: (card.getAttribute("data-category") ?? "").trim(),
      image: rawImage ? canonicalImage(rawImage) : undefined,
      ...parseCardBody(card.querySelector(".fuyl-card-data")),
    });
  }
  return out;
}
