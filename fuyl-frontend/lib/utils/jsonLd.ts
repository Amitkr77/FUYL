// Serializes a JSON-LD object for embedding in an inline <script> tag. Escapes
// "<" so a user-controlled string (e.g. a product name containing
// "</script>") can't break out of the script element and inject markup.
//
// Intentionally dependency-free and kept separate from sanitizeHtml.ts: this
// runs in the root layout and on every breadcrumb, so it must NOT drag in the
// HTML sanitizer (and its heavy DOM dependency) across the whole app.
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
