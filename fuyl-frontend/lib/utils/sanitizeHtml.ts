import sanitizeHtmlLib from 'sanitize-html'

// Sanitizes backend-authored HTML (product descriptions, blog/page bodies)
// before it is injected via dangerouslySetInnerHTML. Allows the common
// formatting tags a WYSIWYG editor produces while stripping <script>, inline
// event handlers, javascript: URLs, and other active content — closing the
// stored-XSS path where an authored (or maliciously-injected) product/blog
// body could execute in a shopper's browser.
//
// Uses `sanitize-html` (a pure htmlparser2-based sanitizer) rather than
// DOMPurify: DOMPurify needs a DOM, so on the server it pulls in jsdom, whose
// ESM-only transitive deps crash Vercel's serverless bundle
// (ERR_REQUIRE_ESM). This runs server-side only — callers in client
// components should receive already-sanitized HTML as a prop.
const OPTIONS: sanitizeHtmlLib.IOptions = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr', 'span', 'div',
    'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup', 'mark', 'small',
    'ul', 'ol', 'li',
    'a', 'blockquote', 'code', 'pre',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    'img', 'figure', 'figcaption',
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    '*': ['id'],
  },
  // Only safe URL schemes — blocks javascript:, data: (except images), etc.
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  // Force external links to open safely.
  transformTags: {
    a: sanitizeHtmlLib.simpleTransform('a', { rel: 'noopener noreferrer' }),
  },
}

export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return ''
  return sanitizeHtmlLib(dirty, OPTIONS)
}
