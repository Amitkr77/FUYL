import DOMPurify from 'isomorphic-dompurify'

// Sanitizes backend-authored HTML (product descriptions, blog/page bodies)
// before it is injected via dangerouslySetInnerHTML. Allows the common
// formatting tags a WYSIWYG editor produces while stripping <script>, inline
// event handlers, javascript: URLs, and other active content — closing the
// stored-XSS path where an authored (or maliciously-injected) product/blog
// body could execute in a shopper's browser. Runs on both server (RSC) and
// client via isomorphic-dompurify.
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return ''
  return DOMPurify.sanitize(dirty, { USE_PROFILES: { html: true } })
}

// Serializes a JSON-LD object for embedding in an inline <script> tag. Escapes
// "<" so a user-controlled string (e.g. a product name containing
// "</script>") can't break out of the script element and inject markup.
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
