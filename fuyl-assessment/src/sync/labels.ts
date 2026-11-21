import type { StoreImage } from "./parse";

/**
 * Doses in the knowledge base were transcribed from two label images on the
 * COMPLETE+ product page. Images can't be parsed reliably, so instead we watch
 * them: Shopify bumps an image's `?v=` version whenever it's replaced. If a
 * label image changes (or disappears), the admin is asked to review doses.
 */

export const LABEL_IMAGES = [
  { file: "ShopPic-5.png", label: "Blend profile (per 10 g sachet)" },
  { file: "ShopPic-6.png", label: "Nutritional information" },
] as const;

export type LabelStatus = "ok" | "changed" | "missing" | "baseline";

export interface LabelCheck {
  file: string;
  label: string;
  status: LabelStatus;
  currentSrc?: string;
  acknowledgedSrc?: string;
}

/**
 * Compare current label images against the versions an admin last confirmed.
 * With no acknowledgement yet, the current version becomes the baseline (the
 * KB doses were transcribed from these exact images).
 */
export function checkLabels(images: StoreImage[], acknowledged: Record<string, string>): LabelCheck[] {
  return LABEL_IMAGES.map(({ file, label }) => {
    const current = images.find((i) => i.file === file);
    const ack = acknowledged[file];
    if (!current) return { file, label, status: "missing", acknowledgedSrc: ack };
    if (!ack) return { file, label, status: "baseline", currentSrc: current.src };
    return { file, label, status: current.src === ack ? "ok" : "changed", currentSrc: current.src, acknowledgedSrc: ack };
  });
}

export const needsReview = (checks: LabelCheck[]) => checks.some((c) => c.status === "changed" || c.status === "missing");
