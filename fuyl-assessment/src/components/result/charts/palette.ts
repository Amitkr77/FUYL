/**
 * Chart colours, validated with the dataviz palette checker against the
 * report's light glass surface (#f4f7ef): lightness band, chroma floor,
 * colour-blind separation and contrast all pass.
 *
 *  - INDIA / GLOBAL: the two reference series (teal vs burnt orange — ΔE 14+
 *    under protanopia). Text never wears these; a dot beside the label does.
 *  - COVERAGE: one hue, light → dark, for "how much of the daily need".
 */
export const INDIA = "#00897b";
export const GLOBAL = "#c45a1c";
/** Neutral for "what one serve gives" bars, so the coloured markers carry the comparison. */
export const AMOUNT = "#3f5148";
export const TRACK = "rgba(18,41,31,0.08)";
export const COVERAGE = ["#7ab8a1", "#459c82", "#1f7c66", "#0c5244"] as const;
