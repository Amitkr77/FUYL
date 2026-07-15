"use client";

import { useEffect, useState } from "react";
import { Star, Shield, Truck, Leaf } from "lucide-react";
import { QuantitySelector } from "./QuantitySelector";
import { AddToCartButton } from "./AddToCartButton";
import { BuyNowButton } from "./BuyNowButton";
import { WishlistButton } from "./WishlistButton";
import { ProductBadges } from "./ProductBadges";
import { formatPrice, discountPercent } from "@/lib/utils/formatPrice";
import { Badge } from "@/components/ui/Badge";
import { getActivePlans, type SubscriptionPlan } from "@/lib/api/subscriptionPlans";
import type { Product } from "@/types/product";

interface ProductInfoProps {
  product: Product;
}

export function ProductInfo({ product }: ProductInfoProps) {
  const [quantity, setQuantity] = useState(1);
  const [purchaseType, setPurchaseType] = useState<"one-time" | "subscribe">("one-time");
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");

  const variant = product.variants[0];

  useEffect(() => {
    if (!product.isSubscribable) return;
    getActivePlans()
      .then((p) => {
        setPlans(p);
        if (p[0]) setSelectedPlanId(p[0].id);
      })
      .catch(() => {});
  }, [product.isSubscribable]);

  if (!variant) return null;

  const compareAtPrice = variant.compareAtPrice ?? product.compareAtPrice;
  const savings = discountPercent(variant.price, compareAtPrice ?? 0);
  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const subscribedPrice = selectedPlan
    ? Math.round(variant.price * (1 - selectedPlan.discountPercent / 100) * 100) / 100
    : variant.price;

  const usps = [
    { icon: Shield, text: "60+ Research-Backed Ingredients" },
    { icon: Leaf, text: "No Artificial Colours or Flavours" },
    { icon: Truck, text: "Free Shipping on All Orders" },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Brand label — Teal */}
      <p className="text-label text-brand-teal">FUYL NUTRITION</p>

      {/* Title */}
      <h1 className="text-display-xl font-display text-brand-forest">
        {product.name}
      </h1>

      {/* Rating */}
      {product.rating && (
        <div className="flex items-center gap-2">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                size={14}
                className={
                  n <= Math.round(product.rating!)
                    ? "fill-amber-400 text-amber-400"
                    : "text-brand-border"
                }
              />
            ))}
          </div>
          <span className="text-body-sm font-semibold text-brand-forest">
            {product.rating}
          </span>
          {product.reviewCount && (
            <span className="text-body-xs text-brand-muted">
              ({product.reviewCount} reviews)
            </span>
          )}
        </div>
      )}

      {/* Price — Forest Green featured pricing */}
      <div className="flex items-baseline gap-3">
        <span className="text-display-md font-display text-brand-forest">
          {formatPrice(purchaseType === "subscribe" ? subscribedPrice : variant.price)}
        </span>
        {compareAtPrice && (
          <>
            <span className="text-body-md line-through text-brand-muted">
              {formatPrice(compareAtPrice)}
            </span>
            {/* Forest Green savings badge — premium pricing highlight */}
            {savings && <Badge variant="berry">{savings}</Badge>}
          </>
        )}
      </div>

      {product.unitPrice && (
        <p className="text-body-xs text-brand-muted">
          {formatPrice(product.unitPrice.value)} {product.unitPrice.unit}
        </p>
      )}

      {product.additionalPrices.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {product.additionalPrices.map((p) => (
            <p key={p.label} className="text-body-xs text-brand-muted">
              {p.label}: <span className="font-medium text-brand-forest">{formatPrice(p.price)}</span>
            </p>
          ))}
        </div>
      )}

      {/* Flavour / variant label */}
      <p className="text-body-sm text-brand-muted">
        Mixed Berry · 15 Sachets · 150g
      </p>

      {/* Badges */}
      <ProductBadges tags={product.tags} badge={product.badge} />

      {/* Purchase options — one-time vs subscribe & save */}
      {product.isSubscribable && plans.length > 0 && (
        <div className="flex flex-col gap-2 pt-2">
          <span className="text-label text-brand-muted">Purchase Options</span>
          <div className="flex flex-col gap-2">
            <label
              className="flex items-center gap-3 p-3 border rounded-sm cursor-pointer text-body-sm"
              style={{ borderColor: purchaseType === "one-time" ? "var(--color-brand-berry)" : "var(--color-brand-border)" }}
            >
              <input type="radio" name="purchaseType" checked={purchaseType === "one-time"} onChange={() => setPurchaseType("one-time")} />
              One-time purchase
            </label>
            <label
              className="flex items-center gap-3 p-3 border rounded-sm cursor-pointer text-body-sm"
              style={{ borderColor: purchaseType === "subscribe" ? "var(--color-brand-berry)" : "var(--color-brand-border)" }}
            >
              <input type="radio" name="purchaseType" checked={purchaseType === "subscribe"} onChange={() => setPurchaseType("subscribe")} />
              Subscribe &amp; Save
            </label>
          </div>
          {purchaseType === "subscribe" && (
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="h-10 px-3 text-body-sm border rounded-sm"
              style={{ borderColor: "var(--color-brand-border)" }}
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  Every {p.intervalCount > 1 ? `${p.intervalCount} ` : ""}{p.interval}
                  {p.discountPercent > 0 ? ` — ${p.discountPercent}% off` : ""}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Qty + ATC */}
      <div className="flex flex-col gap-3 pt-2">
        <div className="flex items-center gap-4">
          <span className="text-label text-brand-muted">Quantity</span>
          <QuantitySelector value={quantity} onChange={setQuantity} max={10} />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <AddToCartButton
              product={product}
              variant={variant}
              quantity={quantity}
              subscriptionInterval={purchaseType === "subscribe" ? selectedPlan?.interval : undefined}
              subscriptionDiscountPercent={purchaseType === "subscribe" ? selectedPlan?.discountPercent : undefined}
            />
          </div>
          <WishlistButton productId={product.id} variantId={variant.id} />
        </div>
        <BuyNowButton
          product={product}
          variant={variant}
          quantity={quantity}
          subscriptionInterval={purchaseType === "subscribe" ? selectedPlan?.interval : undefined}
          subscriptionDiscountPercent={purchaseType === "subscribe" ? selectedPlan?.discountPercent : undefined}
        />
      </div>

      {/* USP row — Teal icons */}
      <div className="pt-2 space-y-2.5 border-t border-brand-border">
        {usps.map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-3">
            <Icon size={15} className="text-brand-teal shrink-0" />
            <span className="text-body-sm text-brand-forest">{text}</span>
          </div>
        ))}
      </div>

      {/* Money-back guarantee */}
      <p className="text-body-xs p-3 rounded-sm text-center font-medium bg-brand-cream text-brand-muted">
        30-Day Money-Back Guarantee · If you don't feel the difference, we'll
        refund you.
      </p>
    </div>
  );
}
