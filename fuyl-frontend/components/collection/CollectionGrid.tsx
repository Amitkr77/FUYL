import { ProductCard } from "./ProductCard";
import type { Product } from "@/types/product";

interface CollectionGridProps {
  products: Product[];
}

export function CollectionGrid({ products }: CollectionGridProps) {
  if (!products.length) {
    return (
      <div className="py-20 text-center">
        <p className="text-body-lg" style={{ color: "var(--color-brand-muted)" }}>
          No products here yet — check back soon.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
