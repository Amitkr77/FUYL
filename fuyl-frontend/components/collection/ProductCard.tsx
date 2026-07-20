import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatPrice, discountPercent } from "@/lib/utils/formatPrice";
import { AddToCartButton } from "@/components/product/AddToCartButton";
import { WishlistButton } from "@/components/product/WishlistButton";
import type { Product } from "@/types/product";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const variant = product.variants[0];
  const image = product.images[0];
  const category =
    product.supplementInfo?.ingredientCategory || product.tags?.[0];
  const savings = variant?.compareAtPrice
    ? discountPercent(variant.price, variant.compareAtPrice)
    : "";

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
          <WishlistButton productId={product.id} variantId={variant?.id} />
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

        {/* Rating & reviews */}
        {product.rating ? (
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
        ) : null}

        {/* Price */}
        <div className="flex items-baseline gap-2">
          {variant && (
            <>
              <span className="text-body-md font-semibold text-brand-forest">
                {formatPrice(variant.price)}
              </span>
              {variant.compareAtPrice && (
                <span className="text-body-sm line-through text-brand-muted">
                  {formatPrice(variant.compareAtPrice)}
                </span>
              )}
            </>
          )}
        </div>

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
