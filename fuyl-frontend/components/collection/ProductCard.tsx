'use client'

import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatPrice } from "@/lib/utils/formatPrice";
import { AddToCartButton } from "@/components/product/AddToCartButton";
import type { Product } from "@/types/product";

interface ProductCardProps {
  product: Product;
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
  const hoverImage = product.images[1];

  if (layout === "list") {
    return (
      <div className="group relative flex items-center gap-6 rounded-sm border border-brand-border p-4 transition-shadow hover:shadow-md">
        {/* Image with hover swap */}
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-sm bg-brand-sage">
          <Link href={`/products/${product.slug}`} className="block h-full w-full" aria-label={product.name}>
            {image && (
              <Image
                src={image.url}
                alt={image.altText || product.name}
                fill
                className={`object-cover transition-opacity duration-500 ${hoverImage ? "group-hover:opacity-0" : ""}`}
                sizes="96px"
              />
            )}
            {hoverImage && (
              <Image
                src={hoverImage.url}
                alt={hoverImage.altText || product.name}
                fill
                className="object-cover absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                sizes="96px"
              />
            )}
          </Link>
          {!product.available && (
            <div className="absolute top-1 left-1">
              <Badge variant="muted">Sold Out</Badge>
            </div>
          )}
        </div>

        {/* Name */}
        <div className="min-w-0 flex-1">
          <Link href={`/products/${product.slug}`}>
            <p className="text-body-md font-semibold text-brand-forest group-hover:text-brand-teal transition-colors truncate">
              {product.name}
            </p>
          </Link>
        </div>

        {/* Rating */}
        <div className="w-32 shrink-0">
          <RatingRow product={product} />
        </div>

        {/* Price */}
        <div className="w-32 shrink-0">
          <PriceRow variant={variant} />
        </div>

        {/* ATC */}
        {variant && (
          <div className="w-40 shrink-0">
            <AddToCartButton product={product} variant={variant} quantity={1} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="group relative flex flex-col">
      {/* Image with hover swap */}
      <div className="relative aspect-square rounded-sm overflow-hidden bg-brand-sage">
        <Link href={`/products/${product.slug}`} className="block h-full w-full" aria-label={product.name}>
          {image && (
            <Image
              src={image.url}
              alt={image.altText || product.name}
              fill
              className={`object-cover transition-opacity duration-500 ${hoverImage ? "group-hover:opacity-0" : ""}`}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          )}
          {hoverImage && (
            <Image
              src={hoverImage.url}
              alt={hoverImage.altText || product.name}
              fill
              className="object-cover absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          )}
        </Link>
        {!product.available && (
          <div className="absolute top-3 left-3">
            <Badge variant="muted">Sold Out</Badge>
          </div>
        )}
      </div>

      {/* Title, rating, price, ATC */}
      <div className="mt-3 flex flex-1 flex-col space-y-1.5">
        <Link href={`/products/${product.slug}`}>
          <p className="text-body-sm font-semibold text-brand-forest group-hover:text-brand-teal transition-colors">
            {product.name}
          </p>
        </Link>

        <RatingRow product={product} />
        <PriceRow variant={variant} />

        {variant && (
          <div className="mt-auto pt-2">
            <AddToCartButton product={product} variant={variant} quantity={1} />
          </div>
        )}
      </div>
    </div>
  );
}
