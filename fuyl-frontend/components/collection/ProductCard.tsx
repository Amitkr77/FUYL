import Link from "next/link";
import Image from "next/image";
import { Star, Repeat } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatPrice, discountPercent } from "@/lib/utils/formatPrice";
import { AddToCartButton } from "@/components/product/AddToCartButton";
import { WishlistButton } from "@/components/product/WishlistButton";
import type { Product } from "@/types/product";

interface ProductCardProps {
  product: Product;
  // 'grid' (default) — the vertical card, used on mobile/tablet. 'list' — a
  // wide horizontal row with its own aligned columns, used on desktop (see
  // CollectionGrid — the breakpoint decides which renders, there's no toggle).
  layout?: "grid" | "list";
}

function RatingRow({ product }: { product: Product }) {
  if (!product.rating) return null;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            size={13}
            className={
              n <= Math.round(product.rating!)
                ? "fill-amber-400 text-amber-400"
                : "text-brand-border"
            }
          />
        ))}
      </div>
      <span className="text-body-xs font-semibold text-brand-forest">
        {product.rating}
      </span>
      {product.reviewCount ? (
        <span className="text-body-xs text-brand-muted">
          ({product.reviewCount})
        </span>
      ) : null}
    </div>
  );
}

function PriceRow({ variant }: { variant: Product["variants"][number] | undefined }) {
  if (!variant) return null;
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-body-md font-semibold text-brand-forest">
        {formatPrice(variant.price)}
      </span>
      {variant.compareAtPrice && (
        <span className="text-body-sm line-through text-brand-muted">
          {formatPrice(variant.compareAtPrice)}
        </span>
      )}
    </div>
  );
}

export function ProductCard({ product, layout = "grid" }: ProductCardProps) {
  const variant = product.variants[0];
  const image = product.images[0];
  const category =
    product.supplementInfo?.ingredientCategory || product.tags?.[0];
  const savings = variant?.compareAtPrice
    ? discountPercent(variant.price, variant.compareAtPrice)
    : "";

  if (layout === "list") {
    // Desktop-only row (CollectionGrid only mounts this tree at lg: and up —
    // see its "hidden lg:flex" wrapper), so this can assume a wide container
    // and doesn't need its own mobile fallback. Distinct aligned columns
    // (image / name / rating / price / actions) rather than a stack crammed
    // next to the image, so rating and price line up cleanly row over row.
    return (
      <div className="group relative flex items-center gap-6 rounded-sm border border-brand-border p-4 transition-shadow hover:shadow-md">
        {/* Image */}
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-sm bg-brand-sage">
          <Link
            href={`/products/${product.slug}`}
            className="block h-full w-full"
            aria-label={product.name}
          >
            {image && (
              <Image
                src={image.url}
                alt={image.altText || product.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="96px"
              />
            )}
          </Link>
          <div className="absolute top-1 left-1 flex flex-col gap-1">
            {product.badge && <Badge variant="berry">{product.badge}</Badge>}
            {!product.available && <Badge variant="muted">Sold Out</Badge>}
          </div>
        </div>

        {/* Name / category / subscribe hint — the one flexible column */}
        <div className="min-w-0 flex-1">
          {category && (
            <p className="text-body-xs uppercase tracking-wide text-brand-muted">
              {category}
            </p>
          )}
          <Link href={`/products/${product.slug}`}>
            <p className="text-body-md font-semibold text-brand-forest group-hover:text-brand-teal transition-colors truncate">
              {product.name}
            </p>
          </Link>
          {product.isSubscribable && (
            <p className="mt-1 flex items-center gap-1 text-body-xs text-brand-teal">
              <Repeat size={11} className="shrink-0" />
              Subscribe &amp; save
            </p>
          )}
        </div>

        {/* Rating column */}
        <div className="w-32 shrink-0">
          <RatingRow product={product} />
        </div>

        {/* Price column */}
        <div className="w-32 shrink-0 flex flex-col items-start gap-1.5">
          <PriceRow variant={variant} />
          {savings && <Badge variant="default">{savings}</Badge>}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-3">
          <WishlistButton productId={product.id} variantId={variant?.id || undefined} />
          {variant && (
            <div className="w-40">
              <AddToCartButton product={product} variant={variant} quantity={1} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="group relative flex flex-col">
      {/* Image — sage-tinted background */}
      <div className="relative aspect-square rounded-sm overflow-hidden bg-brand-sage">
        <Link
          href={`/products/${product.slug}`}
          className="block h-full w-full"
          aria-label={product.name}
        >
          {image && (
            <Image
              src={image.url}
              alt={image.altText || product.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          )}
        </Link>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {/* Forest Green premium badge */}
          {product.badge && <Badge variant="berry">{product.badge}</Badge>}
          {savings && <Badge variant="default">{savings}</Badge>}
          {!product.available && <Badge variant="muted">Sold Out</Badge>}
        </div>

        {/* Wishlist — sits above the image, outside the product link */}
        <div className="absolute top-3 right-3">
          <WishlistButton productId={product.id} variantId={variant?.id || undefined} />
        </div>
      </div>

      {/* Info */}
      <div className="mt-3 flex flex-1 flex-col space-y-1.5">
        {category && (
          <p className="text-body-xs uppercase tracking-wide text-brand-muted">
            {category}
          </p>
        )}

        {/* Teal hover — interactive state */}
        <Link href={`/products/${product.slug}`}>
          <p className="text-body-sm font-semibold text-brand-forest group-hover:text-brand-teal transition-colors">
            {product.name}
          </p>
        </Link>

        <RatingRow product={product} />

        <PriceRow variant={variant} />

        {/* Subscribe & Save hint — full option lives on the product page */}
        {product.isSubscribable && (
          <p className="flex items-center gap-1 text-body-xs text-brand-teal">
            <Repeat size={11} className="shrink-0" />
            Subscribe &amp; save
          </p>
        )}

        {/* Add to cart — pinned to the bottom so cards align in the grid */}
        {variant && (
          <div className="mt-auto pt-2">
            <AddToCartButton product={product} variant={variant} quantity={1} />
          </div>
        )}
      </div>
    </div>
  );
}
