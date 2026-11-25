/**
 * Fixed user-facing copy (draft — for review). Becomes admin-editable in
 * Phase 6. Usage and timeline lines mirror FUYL's own FAQ on fuyl.in.
 */

export const CONSENT_VERSION = "2026-11-25";

export const CONSENT_TEXT =
  "By starting, you agree to FUYL using your answers, including health information, to personalise your recommendation. Answers are stored securely and deleted after 12 months. In the assisted assessment, answers you type may be processed by FUYL's AI provider — never with your email — and if you stop midway we'll email you one link to continue."

export const ASSISTED = {
  title: "Assisted assessment",
  body: "Enter your email to get a plan tailored just for you. Then answer each question by tapping an option or in your own words — our AI assistant understands everyday language. We'll send your report to this address.",
  facts: ["Answer in your own words", "About 3 minutes", "Report sent to your email"],
};

export const DISCLAIMER =
  "This assessment is for general wellness information only and is not medical advice. FUYL COMPLETE+ is a nutritional supplement for healthy adults and is not intended to diagnose, treat, cure or prevent any disease. If you are pregnant, nursing, on medication or managing a health condition, consult your doctor before starting.";

export const WELCOME = {
  eyebrow: "Personalised wellness assessment",
  title: "Find your FUYL match",
  body: "Answer a few questions about your body, lifestyle and goals. We'll show you how COMPLETE+ supports you — ingredient by ingredient.",
  facts: ["About 3 minutes", "Only questions that matter to you", "Report sent to your email"],
};

export const LOADER_STEPS = [
  { title: "Understanding your goals", body: "Bringing together your priorities, lifestyle and daily habits." },
  { title: "Checking ingredient safety", body: "Reviewing your answers against every ingredient in COMPLETE+." },
  { title: "Matching your ingredients", body: "Finding the COMPLETE+ ingredients that support your focus areas." },
  { title: "Your report is ready", body: "Personalised for you." },
];

export const HOW_TO_USE = [
  { title: "One sachet daily", body: "Mix one 10 g sachet with 200 ml of chilled water or your smoothie — ideally every morning." },
  { title: "Give it 30 days", body: "One box has 15 sachets. A full month is two boxes." },
  { title: "Stay consistent", body: "COMPLETE+ is designed to work better the longer you take it." },
];

export const TIMELINE = [
  { when: "Week 1", body: "Your gut adapts to the new fibres and probiotic." },
  { when: "Weeks 2–3", body: "Most people notice changes in digestion and energy." },
  { when: "Week 4", body: "Stress and sleep benefits begin to emerge." },
];

/** FUYL customer support, as published on fuyl.in. */
export const SUPPORT = {
  email: "support@fuyl.in",
  phone: "+91 92747 87827",
  whatsapp: "https://wa.me/919274787827?text=" + encodeURIComponent("Hi FUYL, I just took the wellness assessment and have a question about COMPLETE+."),
};

/** Trust badges shown on the COMPLETE+ listing on fuyl.in. */
export const TRUST = ["FSSAI approved", "cGMP certified facility", "Third-party tested", "100% vegetarian"];
