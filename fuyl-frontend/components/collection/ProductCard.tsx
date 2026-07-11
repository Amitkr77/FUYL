import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { formatPrice, discountPercent } from "@/lib/utils/formatPrice";
import type { Product } from "@/types/product";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const variant = product.variants[0];
  const image = product.images[0];
  const savings = variant?.compareAtPrice
    ? discountPercent(variant.price, variant.compareAtPrice)
    : "";

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      {/* Image — sage-tinted background */}
      <div className="relative aspect-square rounded-sm overflow-hidden bg-brand-sage">
        {image && (
          <Image
            src={image.url}
            alt={image.altText || product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        )}
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {/* Rose Gold premium badge */}
          {product.badge && <Badge variant="berry">{product.badge}</Badge>}
          {savings && <Badge variant="default">{savings}</Badge>}
          {!product.available && <Badge variant="muted">Sold Out</Badge>}
        </div>
      </div>

      {/* Info */}
      <div className="mt-3 space-y-1">
        {/* Teal hover — interactive state */}
        <p className="text-body-sm font-semibold text-brand-forest group-hover:text-brand-teal transition-colors">
          {product.name}
        </p>
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
      </div>
    </Link>
  );
}
