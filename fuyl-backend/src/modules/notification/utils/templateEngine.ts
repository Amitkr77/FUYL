/**
 * Tiny template engine — supports {{variable}} substitution and {{#if variable}}…{{/if}} blocks.
 * No external deps; sufficient for transactional emails.
 */
export function renderTemplate(template: string, data: Record<string, unknown>): string {
  // {{#if var}}…{{/if}} blocks
  let out = template.replace(
    /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_m, key: string, body: string) => {
      const val = data[key];
      if (Array.isArray(val) ? val.length > 0 : Boolean(val)) {
        return renderTemplate(body, data);
      }
      return '';
    }
  );

  // {{var}} substitution
  out = out.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => {
    const val = data[key];
    return val === undefined || val === null ? '' : String(val);
  });

  return out;
}

export function extractVariables(template: string): string[] {
  const set = new Set<string>();
  const re = /\{\{(\w+)\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(template)) !== null) {
    if (m[1] !== 'if' && m[1] !== 'endif') set.add(m[1]);
  }
  // Also extract {{#if var}} variable names
  const ifRe = /\{\{#if\s+(\w+)\}\}/g;
  while ((m = ifRe.exec(template)) !== null) {
    set.add(m[1]);
  }
  return Array.from(set);
}
