import type { AnswerInput, Option, Question } from "@/engine";

/**
 * Built-in understanding for the Assisted assessment: turns a free-text reply
 * into a structured answer for ONE known question, with no external AI.
 *
 * It is deliberately conservative. When it isn't confident it returns
 * `unclear`, and the chat asks again with the options spelled out — a wrong
 * guess on a health question is worse than one extra question. For the
 * conditions/medicines questions, an unrecognised but non-negative reply maps
 * to "Something else", which keeps the consult-your-doctor note.
 */

export type Understood = { ok: true; input: AnswerInput } | { ok: false; reason: "unclear" | "too-many"; max?: number };

// ─── Text helpers ───────────────────────────────────────────────────────────

export const normalise = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/[^\p{L}\p{N}+<'.\s-]/gu, " ")
    // Keep decimal points ("6.5"), drop every other dot.
    .replace(/(?<!\d)\.|\.(?!\d)/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokens = (s: string) => normalise(s).split(" ").filter(Boolean);

const STOP = new Set(
  "i im i'm a an the of or and to my me in on at for is it its it's am are be been with some most do does have has had about any very just really feel feeling get getting often".split(
    " ",
  ),
);

const NEG = /\b(no|nope|nah|never|not|none|nothing|nil|nahi|nahin|dont|don't|doesnt|doesn't|didnt|didn't|haven't|havent|hardly|neither|nor)\b/;
const NONE_PHRASE = /\b(none|nothing|no issues?|no problems?|neither|not really|none of (these|them|those)|all good|doesn'?t apply|not applicable|n\/?a)\b/;
const YES = /\b(yes|yeah|yep|yup|ya|yah|haan|han|ha|sure|definitely|correct|right|i do|i am|i have|of course)\b/;
const NO = /\b(no|nope|nah|never|nahi|nahin|not|don'?t|do not|haven'?t|have not|none)\b/;

// ─── Numbers ────────────────────────────────────────────────────────────────

const UNITS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

/** All numbers in the text, in order: digits ("27", "6.5") and English words ("twenty seven"). */
export function numbersIn(text: string): number[] {
  const out: number[] = [];
  const t = normalise(text).replace(/-/g, " - ");
  const words = t.split(" ");
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (/^\d+(\.\d+)?$/.test(w)) {
      out.push(Number(w));
      continue;
    }
    if (w in TENS) {
      const next = words[i + 1];
      if (next && next in UNITS && UNITS[next] < 10) {
        out.push(TENS[w] + UNITS[next]);
        i++;
      } else out.push(TENS[w]);
      continue;
    }
    if (w in UNITS) out.push(UNITS[w]);
    if (w === "half" && out.length === 0) out.push(0.5);
  }
  return out;
}

/** "<5", "5-6", "8+", "0-1" → numeric range, or null if the value isn't a range. */
function rangeOf(value: string): [number, number] | null {
  let m = value.match(/^<(\d+)$/);
  if (m) return [-Infinity, Number(m[1]) - 0.001];
  m = value.match(/^(\d+)\+$/);
  if (m) return [Number(m[1]), Infinity];
  m = value.match(/^(\d+)-(\d+)$/);
  if (m) return [Number(m[1]), Number(m[2])];
  return null;
}

// ─── Synonyms (question.value → extra phrases) ─────────────────────────────

const SYN: Record<string, string[]> = {
  "sex.female": ["woman", "girl", "lady", "f", "she", "her"],
  "sex.male": ["man", "boy", "guy", "m", "he", "him"],
  "sex.na": ["prefer not", "rather not", "skip", "non binary", "nonbinary", "other"],
  "pregnancy.pregnant": ["expecting", "pregnant"],
  "pregnancy.breastfeeding": ["breastfeeding", "breast feeding", "nursing", "feeding my baby"],
  "pregnancy.ttc": ["trying to conceive", "trying for a baby", "planning a baby", "trying to get pregnant", "ttc"],
  "priorities.gut": ["digestion", "bloating", "gut", "stomach"],
  "priorities.immunity": ["immune", "immunity", "falling sick", "colds"],
  "priorities.stress": ["stress", "anxiety", "calm"],
  "priorities.focus": ["focus", "concentration", "brain fog", "memory"],
  "priorities.skin": ["skin", "hair", "nails"],
  "priorities.fitness": ["fitness", "gym", "workout", "recovery", "muscle"],
  "priorities.ageing": ["ageing", "aging", "longevity", "healthy ageing"],
  "priorities.liver": ["liver", "detox"],
  "priorities.nutrients": ["nutrients", "nutrient gaps", "vitamins", "deficiency", "multivitamin"],
  "priorities.energy": ["energy", "tired", "fatigue", "tiredness"],
  "diet.veg": ["vegetarian", "veg", "veggie"],
  "diet.eggetarian": ["eggetarian", "eggs", "egg"],
  "diet.vegan": ["vegan", "plant based", "plant-based", "no dairy"],
  "diet.jain": ["jain"],
  "diet.nonveg": ["non veg", "non-veg", "nonveg", "non vegetarian", "non-vegetarian", "meat", "chicken", "mutton", "fish", "everything"],
  "dairy.daily": ["every day", "daily", "everyday", "always"],
  "dairy.sometimes": ["sometimes", "few times", "occasionally"],
  "dairy.rarely": ["rarely", "never", "hardly"],
  "fish.often": ["often", "twice", "regularly"],
  "fish.weekly": ["once a week", "weekly"],
  "fish.rarely": ["rarely", "never", "hardly", "don't eat fish"],
  "activity.sitting": ["sitting", "desk", "sedentary", "not active", "inactive"],
  "activity.light": ["light", "walk", "walking", "lightly"],
  "activity.regular": ["regular", "workout", "exercise", "gym"],
  "activity.intense": ["intense", "athlete", "hard training", "daily training"],
  "training.strength": ["strength", "gym", "weights", "lifting"],
  "training.cardio": ["cardio", "running", "cycling", "run", "swim", "swimming"],
  "training.sports": ["sports", "football", "cricket", "badminton", "tennis", "basketball"],
  "training.yoga": ["yoga", "pilates", "stretching"],
  "sun.rarely": ["hardly", "rarely", "never", "indoors", "barely", "no sun"],
  "sun.some": ["some", "little", "few minutes", "15", "20", "30 minutes"],
  "sun.lots": ["lots", "a lot", "outdoors", "outside", "hours"],
  "alcohol.never": ["never", "don't drink", "dont drink", "no alcohol", "teetotal"],
  "alcohol.occasionally": ["occasionally", "sometimes", "rarely", "socially", "parties"],
  "alcohol.weekly": ["weekly", "every week", "weekends", "once a week"],
  "alcohol.most": ["most days", "daily", "every day", "everyday"],
  "energy.good": ["good", "great", "fine", "energised", "energized", "energetic", "okay", "ok"],
  "energy.slump": ["slump", "some days", "sometimes", "dip", "low sometimes"],
  "energy.tired": ["exhausted", "tired", "always tired", "drained", "fatigued", "low energy"],
  "energy_when.morning": ["morning", "wake up", "waking"],
  "energy_when.after-meals": ["after meals", "after lunch", "after eating", "after food"],
  "energy_when.afternoon": ["afternoon", "evening", "3 pm", "4 pm"],
  "energy_when.all-day": ["all day", "whole day", "always"],
  "sleep.well": ["well", "good", "fine", "great", "okay", "ok", "sound"],
  "sleep.falling": ["falling asleep", "can't sleep", "cant sleep", "insomnia", "trouble falling", "takes long"],
  "sleep.waking": ["wake up during", "waking up at night", "wake at night", "keep waking", "interrupted"],
  "sleep.unrested": ["tired in the morning", "wake up tired", "not rested", "unrested", "groggy"],
  "sleep_habits.screens": ["phone", "laptop", "screen", "scrolling", "instagram", "netflix"],
  "sleep_habits.late-caffeine": ["coffee", "tea", "caffeine"],
  "sleep_habits.irregular": ["irregular", "different time", "late nights", "shift"],
  "sleep_habits.racing": ["racing", "overthinking", "thinking", "anxious", "worry"],
  "stress.low": ["low", "balanced", "calm", "relaxed", "not stressed", "chill"],
  "stress.moderate": ["moderate", "medium", "some", "average", "manageable", "okay"],
  "stress.high": ["high", "very stressed", "stretched", "a lot", "overwhelmed", "burnt out", "burned out", "extreme"],
  "stress_impact.mood": ["mood", "energy", "irritable"],
  "gut.good": ["good", "fine", "regular", "comfortable", "normal", "no issues", "okay", "ok"],
  "gut.issues": ["issues", "problems", "bloating", "constipation", "acidity", "gas", "upset"],
  "gut_issues.bloating": ["bloating", "bloated", "gas"],
  "gut_issues.constipation": ["constipation", "constipated"],
  "gut_issues.irregular": ["irregular", "loose", "diarrhoea", "diarrhea"],
  "gut_issues.acidity": ["acidity", "acid", "heartburn", "reflux"],
  "gut_issues.heavy": ["heavy", "full", "sluggish"],
  "gut_freq.daily": ["most days", "daily", "every day", "always"],
  "gut_freq.weekly": ["few times a week", "weekly", "often"],
  "gut_freq.sometimes": ["now and then", "sometimes", "occasionally", "rarely"],
  "colds.rarely": ["rarely", "never", "hardly"],
  "colds.sometimes": ["sometimes", "2", "3", "twice", "few times"],
  "colds.often": ["often", "frequently", "always", "every month", "4", "5"],
  "recovery.quick": ["quick", "few days", "fast", "soon"],
  "recovery.slow": ["slow", "a week", "weeks", "long"],
  "focus.sharp": ["sharp", "no", "fine", "good", "clear"],
  "focus.sometimes": ["sometimes", "occasionally", "lose focus"],
  "focus.foggy": ["foggy", "fog", "forgetful", "often", "always"],
  "skin.dull": ["dull", "skin"],
  "skin.hair": ["hair", "hairfall", "hair fall", "thinning", "balding"],
  "skin.nails": ["nails", "brittle"],
  "skin.ageing": ["ageing", "aging", "wrinkles", "fine lines"],
  "energy_signs.hairfall": ["hair", "hairfall", "hair fall"],
  "energy_signs.cold": ["cold"],
  "energy_signs.breathless": ["breathless", "out of breath", "breathing"],
  "energy_signs.nails": ["nails", "brittle"],
  "ageing_signs.joints": ["joints", "joint", "knee", "stiff"],
  "ageing_signs.bones": ["bones", "bone", "osteoporosis"],
  "ageing_signs.heart-family": ["heart", "family history", "cholesterol"],
  "fried.most": ["most days", "daily", "often", "every day", "a lot"],
  "fried.few": ["few times", "weekly", "sometimes"],
  "fried.rarely": ["rarely", "never", "hardly"],
  "periods.heavy": ["heavy"],
  "periods.pms": ["pms", "cramps", "mood swings"],
  "periods.irregular": ["irregular", "late", "pcos", "pcod"],
  "health_gate.pns": ["prefer not", "rather not", "skip"],
  "conditions.thyroid": ["thyroid", "hypothyroid", "hyperthyroid", "hashimoto"],
  "conditions.diabetes": ["diabetes", "diabetic", "sugar", "blood sugar", "prediabetes"],
  "conditions.bp": ["bp", "blood pressure", "hypertension"],
  "conditions.heart": ["heart"],
  "conditions.liver": ["liver", "fatty liver"],
  "conditions.kidney": ["kidney", "renal"],
  "conditions.autoimmune": ["autoimmune", "lupus", "rheumatoid", "psoriasis"],
  "conditions.bleeding": ["bleeding", "clotting", "haemophilia", "hemophilia"],
  "conditions.iron": ["iron overload", "haemochromatosis", "hemochromatosis"],
  "conditions.gi": ["ibs", "ibd", "coeliac", "celiac", "crohn", "colitis"],
  "medications.thyroid": ["thyroid", "thyronorm", "eltroxin", "levothyroxine"],
  "medications.anticoag": ["blood thinner", "warfarin", "aspirin", "clopidogrel", "anticoagulant"],
  "medications.diabetes": ["diabetes", "metformin", "insulin", "sugar"],
  "medications.bp": ["bp", "blood pressure", "amlodipine", "telmisartan"],
  "medications.sedative": ["sleeping pill", "anxiety", "antidepressant", "depression", "sedative", "ssri"],
  "medications.immuno": ["steroid", "immunosuppressant", "prednisolone"],
  "medications.cancer": ["cancer", "chemo", "chemotherapy"],
};

/** Questions where an unrecognised, non-negative reply should count as "Something else" (keeps the safety note). */
const CATCH_ALL: Record<string, string> = { conditions: "other", medications: "other" };

// ─── Matching ───────────────────────────────────────────────────────────────

const has = (hay: string, phrase: string) => {
  const p = normalise(phrase);
  if (!p) return false;
  return new RegExp(`(^|\\s)${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`).test(hay);
};

function optionScore(q: Question, o: Option, text: string): number {
  const label = normalise(o.label);
  if (text === label || text === normalise(o.value)) return 100;
  let score = 0;
  if (has(text, label)) score = Math.max(score, 60);
  for (const s of SYN[`${q.key}.${o.value}`] ?? []) if (has(text, s)) score = Math.max(score, 40 + Math.min(normalise(s).length, 20));
  const words = tokens(o.label).filter((w) => w.length >= 3 && !STOP.has(w));
  if (words.length) {
    const hits = words.filter((w) => has(text, w)).length;
    score = Math.max(score, Math.round((hits / words.length) * 35));
  }
  return score;
}

const noneOption = (q: Question) => q.options?.find((o) => o.exclusive) ?? q.options?.find((o) => o.value === "no" || o.value === "none");

function understandChoice(q: Question, raw: string): Understood {
  const opts = q.options ?? [];
  const text = normalise(raw);
  if (!text) return { ok: false, reason: "unclear" };

  // "2" / "option 2" → the second option (the chat numbers options in its prompts).
  const idx = text.match(/^(?:option\s*)?(\d{1,2})$/);
  if (idx && opts.every((o) => !rangeOf(o.value))) {
    const o = opts[Number(idx[1]) - 1];
    if (o) return { ok: true, input: { values: [o.value] } };
  }

  // Numeric bands: "about 6 hours" → "5-6".
  if (opts.length && opts.every((o) => rangeOf(o.value))) {
    const exact = opts.find((o) => text === normalise(o.value) || text === normalise(o.label));
    if (exact) return { ok: true, input: { values: [exact.value] } };
    const nums = numbersIn(raw);
    if (nums.length) {
      let n = nums.length >= 2 && /\d\s*-\s*\d|\bto\b/.test(text) ? (nums[0] + nums[1]) / 2 : nums[0];
      if (/\b(less than|under|below|fewer than)\b/.test(text)) n -= 0.5;
      if (/\b(more than|over|above|plus)\b|\+/.test(text)) n += 0.5;
      const ranges = opts.map((o) => ({ o, r: rangeOf(o.value)! }));
      const hit = ranges.find(({ r }) => n >= r[0] && n <= r[1]);
      const nearest = hit ?? [...ranges].sort((a, b) => dist(n, a.r) - dist(n, b.r))[0];
      if (nearest) return { ok: true, input: { values: [nearest.o.value] } };
    }
  }

  const isYesNo = opts.some((o) => o.value === "yes") && opts.some((o) => o.value === "no");
  const scored = opts.map((o) => ({ o, s: optionScore(q, o, text) })).filter((x) => x.s >= 30);

  if (q.type === "single") {
    if (isYesNo) {
      const special = scored.filter((x) => x.o.value !== "yes" && x.o.value !== "no").sort((a, b) => b.s - a.s)[0];
      if (special && special.s >= 40) return { ok: true, input: { values: [special.o.value] } };
      const no = NO.test(text);
      const yes = YES.test(text);
      if (no && !yes) return { ok: true, input: { values: ["no"] } };
      if (yes && !no) return { ok: true, input: { values: ["yes"] } };
      return { ok: false, reason: "unclear" };
    }
    const best = scored.sort((a, b) => b.s - a.s);
    if (best.length && (best.length === 1 || best[0].s > best[1].s)) return { ok: true, input: { values: [best[0].o.value] } };
    const none = noneOption(q);
    if (none && NONE_PHRASE.test(text) && !scored.some((x) => x.o !== none)) return { ok: true, input: { values: [none.value] } };
    return { ok: false, reason: "unclear" };
  }

  // multi
  const none = noneOption(q);
  const picks = scored.filter((x) => x.o !== none).map((x) => x.o.value);
  if (picks.length === 0) {
    if (none && (NONE_PHRASE.test(text) || NEG.test(text))) return { ok: true, input: { values: [none.value] } };
    const catchAll = CATCH_ALL[q.key];
    if (catchAll && !NEG.test(text) && text.length >= 3) return { ok: true, input: { values: [catchAll] } };
    return { ok: false, reason: "unclear" };
  }
  if (q.maxSelect && picks.length > q.maxSelect) return { ok: false, reason: "too-many", max: q.maxSelect };
  return { ok: true, input: { values: opts.filter((o) => picks.includes(o.value)).map((o) => o.value) } };
}

const dist = (n: number, r: [number, number]) => (n < r[0] ? r[0] - n : n > r[1] ? n - r[1] : 0);

const NAME_PATTERNS = [
  /\b(?:my name is|my name's|name is|i am|i'm|im|this is|call me|it's|its)\s+([\p{L}][\p{L}\p{M}.'-]*(?:\s+[\p{L}][\p{L}\p{M}.'-]*)?)/iu,
];

function understandText(q: Question, raw: string): Understood {
  let t = raw.trim().replace(/\s+/g, " ");
  if (q.isNameQuestion) {
    for (const re of NAME_PATTERNS) {
      const m = t.match(re);
      if (m) {
        t = m[1];
        break;
      }
    }
    t = t.replace(/[.!,]+$/g, "").trim();
    // A single short reply ("Riya", "riya sharma") — capitalise politely.
    if (t.split(" ").length > 3) return { ok: false, reason: "unclear" };
    t = t.replace(/(^|\s)(\p{L})/gu, (_, s: string, c: string) => s + c.toUpperCase());
  }
  if (!t) return { ok: false, reason: "unclear" };
  return { ok: true, input: { text: t } };
}

function understandNumber(q: Question, raw: string): Understood {
  const nums = numbersIn(raw).filter((n) => Number.isInteger(n));
  const inRange = nums.filter((n) => (q.min === undefined || n >= q.min) && (q.max === undefined || n <= q.max));
  const pick = inRange[0] ?? nums[0];
  if (pick === undefined) return { ok: false, reason: "unclear" };
  // Out-of-range numbers are passed on so the engine's validation explains the limit.
  return { ok: true, input: { number: pick } };
}

export function understand(q: Question, text: string): Understood {
  switch (q.type) {
    case "single":
    case "multi":
      return understandChoice(q, text);
    case "number":
      return understandNumber(q, text);
    case "text":
      return understandText(q, text);
    case "grid":
      return { ok: false, reason: "unclear" };
  }
}
