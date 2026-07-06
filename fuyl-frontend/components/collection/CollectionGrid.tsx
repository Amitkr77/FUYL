import { ProductCard } from "./ProductCard";
import { MockProductCard, type MockProduct } from "./MockProductCard";
import type { Product } from "@/types/product";

const MOCK_PRODUCTS: MockProduct[] = [
  {
    id: "m1",
    name: "FUYL COMPLETE+ (15 Sachets)",
    tag: "Daily Nutrition",
    badge: "BESTSELLER",
    image: "/images/fuyl-complete+.webp",
    hoverImage: "https://fuyl.in/cdn/shop/files/FUYL_Complete_Product_Shot.jpg",
    price: 1499,
    comparePrice: 2000,
    rating: 4.8,
    reviewCount: 124,
    slug: "fuyl-complete",
  },
  {
    id: "m2",
    name: "FUYL COMPLETE+ (30 Sachets)",
    tag: "Best Value",
    badge: "SAVE 25%",
    image: "https://fuyl.in/cdn/shop/files/FUYL_Complete_Product_Shot.jpg",
    hoverImage: "/images/fuyl-complete+.webp",
    price: 2699,
    comparePrice: 3600,
    rating: 4.9,
    reviewCount: 89,
    slug: "fuyl-complete",
  },
];

interface CollectionGridProps {
  products: Product[];
}

export function CollectionGrid({ products }: CollectionGridProps) {
  if (!products.length) {
    return (
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {MOCK_PRODUCTS.map((product) => (
          <MockProductCard key={product.id} product={product} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-2">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
