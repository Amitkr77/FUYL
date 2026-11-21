/**
 * Suggest a correction for an obviously mistyped email domain
 * ("gmial.com" → "gmail.com", "gmail.con" → "gmail.com"), so the report doesn't
 * silently go to an address that doesn't exist. Pure and dependency-free.
 */
const DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "yahoo.co.in",
  "yahoo.in",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "rediffmail.com",
  "protonmail.com",
  "proton.me",
  "aol.com",
  "zoho.com",
  "fuyl.in",
];

function distance(a: string, b: string): number {
  // Damerau–Levenshtein (optimal string alignment): counts a swap of two
  // neighbouring letters ("gmial" ↔ "gmail") as one edit.
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

export function suggestEmail(input: string): string | null {
  const email = input.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at < 1 || at === email.length - 1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (DOMAINS.includes(domain)) return null;

  let best: { domain: string; d: number } | null = null;
  for (const candidate of DOMAINS) {
    const d = distance(domain, candidate);
    // Allow up to 2 edits for longer domains, 1 for short ones.
    const limit = candidate.length > 6 ? 2 : 1;
    if (d > 0 && d <= limit && (!best || d < best.d)) best = { domain: candidate, d };
  }
  return best ? `${local}@${best.domain}` : null;
}
