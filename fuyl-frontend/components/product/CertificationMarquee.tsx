import type { Certification } from '@/types/product'

interface CertificationMarqueeProps {
  certifications: Certification[]
}

// Same .marquee-track CSS scroll technique as components/home/MarqueeStrip.tsx
// (defined in styles/globals.css), but prop-driven with real logo images
// instead of that component's hardcoded text list.
export function CertificationMarquee({ certifications }: CertificationMarqueeProps) {
  if (!certifications.length) return null

  const all = [...certifications, ...certifications]

  return (
    <div className="w-full overflow-hidden py-6 select-none bg-brand-cream" aria-hidden="true">
      <div className="marquee-track">
        {all.map((cert, i) => (
          <span key={`${cert.label}-${i}`} className="inline-flex items-center gap-3 px-8 shrink-0">
            {cert.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cert.logoUrl} alt={cert.label} className="h-10 w-auto object-contain grayscale opacity-70" />
            ) : null}
            <span className="text-label whitespace-nowrap text-brand-muted">{cert.label}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
