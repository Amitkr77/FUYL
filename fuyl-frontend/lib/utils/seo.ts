import type { Metadata } from 'next'
import { SITE } from '@/lib/constants/site'

interface SEOProps {
  title?:       string
  description?: string
  image?:       string
  url?:         string
  noIndex?:     boolean
}

export function generateSEO({
  title,
  description,
  image,
  url,
  noIndex = false,
}: SEOProps = {}): Metadata {
  const resolvedTitle       = title ? `${title} | ${SITE.name}` : `${SITE.name} — ${SITE.tagline}`
  const resolvedDescription = description ?? SITE.description
  const resolvedImage       = image ?? `${SITE.url}/images/og-default.jpg`
  const resolvedUrl         = url ?? SITE.url

  return {
    title:       resolvedTitle,
    description: resolvedDescription,
    robots:      noIndex ? 'noindex, nofollow' : 'index, follow',
    alternates:  { canonical: resolvedUrl },
    openGraph: {
      title:       resolvedTitle,
      description: resolvedDescription,
      url:         resolvedUrl,
      siteName:    SITE.name,
      type:        'website',
      images:      [{ url: resolvedImage, width: 1200, height: 630, alt: resolvedTitle }],
    },
    twitter: {
      card:        'summary_large_image',
      title:       resolvedTitle,
      description: resolvedDescription,
      images:      [resolvedImage],
    },
  }
}

export const orgSchema = {
  '@context':    'https://schema.org',
  '@type':       'Organization',
  name:          SITE.name,
  url:           SITE.url,
  logo:          `${SITE.url}/images/logo.png`,
  contactPoint: {
    '@type':           'ContactPoint',
    telephone:         SITE.phone,
    contactType:       'customer service',
    availableLanguage: 'English',
  },
  sameAs: [SITE.instagram, SITE.youtube, SITE.facebook, SITE.linkedin],
}
