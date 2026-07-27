import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import type { ProductInfoBlock } from "@/types/product";

interface ProductInfoBlocksProps {
  blocks: ProductInfoBlock[];
}

export function ProductInfoBlocks({ blocks }: ProductInfoBlocksProps) {
  if (!blocks.length) return null;

  return (
    <div className="flex flex-col gap-16 sm:gap-20">
      {/* Header */}
      <div className="max-w-2xl">
        <span className="text-label tracking-widest text-brand-teal">
          What&apos;s Inside
        </span>
        <h2 className="mt-3 text-display-lg font-display text-brand-forest">
          Product Information
        </h2>
        <p className="mt-3 text-body-md text-brand-muted">
          Each ingredient is chosen for a reason and dosed to actually work.
        </p>
      </div>

      {/* Blocks — zig-zag, alternating image side */}
      <div className="flex flex-col gap-16 sm:gap-20">
        {blocks.map((block, i) => {
          const reversed = i % 2 === 1;
          return (
            <div
              key={i}
              className={cn(
                "flex flex-col items-center gap-8 lg:gap-16",
                reversed ? "lg:flex-row-reverse" : "lg:flex-row",
              )}
            >
              {/* Image */}
              {block.image && (
                <div className="relative aspect-4/3 w-full shrink-0 overflow-hidden rounded-3xl shadow-xl shadow-brand-forest/10 lg:w-1/2">
                  <Image
                    src={block.image}
                    alt={block.title || ""}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
              )}

              {/* Content */}
              <div className={cn("w-full", block.image && "lg:w-1/2")}>
                <span className="font-display text-6xl leading-none text-brand-sage sm:text-7xl">
                  {String(i + 1).padStart(2, "0")}
                </span>

                {block.title && (
                  <h3 className="mt-5 text-display-md font-display text-brand-forest">
                    {block.title}
                  </h3>
                )}

                <p className="mt-4 text-body-md leading-relaxed text-brand-muted">
                  {block.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
