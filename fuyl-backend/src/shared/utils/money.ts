/** Money boundary helpers: APIs use rupees; arithmetic uses integer paise. */
export type Paise = number & { readonly __paise: unique symbol };

export function toPaise(rupees: number): Paise {
  if (!Number.isFinite(rupees)) throw new TypeError('Money amount must be finite');
  return Math.round((rupees + Number.EPSILON) * 100) as Paise;
}

export function fromPaise(paise: number): number {
  if (!Number.isSafeInteger(paise)) throw new TypeError('Paise amount must be a safe integer');
  return paise / 100;
}

export function clampPaise(value: number, min = 0, max = Number.MAX_SAFE_INTEGER): Paise {
  return Math.min(max, Math.max(min, Math.round(value))) as Paise;
}

export function proratePaise(totalPaise: number, part: number, whole: number): Paise {
  if (!Number.isSafeInteger(totalPaise) || !Number.isSafeInteger(part) || !Number.isSafeInteger(whole) || whole <= 0) {
    throw new TypeError('Invalid money proration');
  }
  return Math.round((totalPaise * part) / whole) as Paise;
}
