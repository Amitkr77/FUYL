import Image from "next/image";
import Link from "next/link";
import { generateSEO } from "@/lib/utils/seo";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export const metadata = generateSEO({
  title: "The Science",
  description:
    "The clinical research and peer-reviewed evidence behind every key ingredient in FUYL COMPLETE+.",
  url: "https://fuyl.in/pages/science",
});

// Mirrors the "Science" nav item's two submenu links (lib/constants/nav.ts)
const CARDS = [
  {
    label: "Ingredients",
    desc: "The anatomy of FUYL COMPLETE+ ",
    href: "/pages/ingredients",
    image: "/images/ingredient.png",
  },
  {
    label: "Learn",
    desc: "science behind health and nutrition",
    href: "/pages/learn",
    image: "/images/science_learn_SS.webp",
  },
];

export default function SciencePage() {
  return (
    <section className="container-brand section-py">
      <Breadcrumbs className="mb-6" items={[{ label: "Science" }]} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {CARDS.map((card, i) => (
          <Link
            key={card.href}
            href={card.href}
            className="group relative block h-105 sm:h-140 overflow-hidden rounded-2xl bg-brand-cream"
          >
            <Image
              src={card.image}
              alt={card.label}
              fill
              priority={i === 0}
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end items-center p-6 sm:p-8">
              <h1 className="text-display-lg font-display uppercase tracking-wide text-white">
                {card.label}
              </h1>
              <p className="mt-2 text-sm text-white uppercase">{card.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
