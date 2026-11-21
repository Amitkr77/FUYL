import type { KnowledgeBase } from "@/engine";

/** Small but complete KB exercising every branch type the engine supports. */
export function fixtureKB(): KnowledgeBase {
  return {
    version: 7,
    settings: { questionCap: 40, topAreas: 3, ingredientsPerArea: 3, bands: { high: 0.5, moderate: 0.25 } },
    questions: [
      { key: "name", block: "about", order: 1, type: "text", tier: "core", prompt: "What should we call you?", isNameQuestion: true, summaryTemplate: "You're {answer}." },
      {
        key: "sex", block: "about", order: 2, type: "single", tier: "core", prompt: "Which best describes you, {name}?",
        summaryTemplate: "You identify as {answer}.",
        options: [
          { value: "female", label: "Female" },
          { value: "male", label: "Male" },
          { value: "na", label: "Prefer not to say", summary: null },
        ],
      },
      {
        key: "age", block: "about", order: 3, type: "number", tier: "core", prompt: "How old are you?", min: 10, max: 100,
        summaryTemplate: "You're {answer}.",
        bands: [
          { max: 18, flags: ["under_19"], summary: null },
          { min: 19, max: 44, summary: "{value} years old" },
          { min: 45, summary: "{value} years old", reason: "You're 45 or older", effects: [{ area: "ageing", weight: 3 }] },
        ],
      },
      {
        key: "pregnancy", block: "about", order: 4, type: "single", tier: "core", prompt: "Are you pregnant or breastfeeding?",
        showIf: { all: [{ answer: "sex", in: ["female"] }, { number: "age", gte: 19, lte: 50 }] },
        options: [
          { value: "pregnant", label: "Pregnant", flags: ["pregnant"] },
          { value: "ttc", label: "Trying to conceive", flags: ["ttc"] },
          { value: "no", label: "No" },
        ],
      },
      {
        key: "priorities", block: "about", order: 5, type: "multi", tier: "core", maxSelect: 2, isPriorityQuestion: true,
        prompt: "Top priorities?",
        options: [
          { value: "energy", label: "Energy", effects: [{ area: "energy", weight: 6 }] },
          { value: "gut", label: "Gut", effects: [{ area: "gut", weight: 6 }] },
          { value: "sleep", label: "Sleep", effects: [{ area: "sleep", weight: 6 }] },
          { value: "ageing", label: "Healthy ageing", effects: [{ area: "ageing", weight: 6 }] },
        ],
      },
      {
        key: "energy", block: "feel", order: 1, type: "single", tier: "core", prompt: "How's your energy?",
        summaryTemplate: "Your energy is {answer}.",
        options: [
          { value: "good", label: "Great", summary: "steady" },
          { value: "slump", label: "Afternoon slump", summary: "dipping in the afternoon", reason: "You hit an afternoon slump", effects: [{ area: "energy", weight: 3 }] },
          { value: "tired", label: "Tired all day", summary: "low most of the day", reason: "You feel tired most of the day", effects: [{ area: "energy", weight: 5 }] },
        ],
      },
      {
        key: "energy_when", block: "feel", order: 2, type: "single", tier: "followup", prompt: "When does it dip?",
        showIf: { answer: "energy", in: ["slump", "tired"] },
        options: [
          { value: "morning", label: "Mornings", reason: "Mornings are hardest", effects: [{ area: "energy", weight: 1 }] },
          { value: "afternoon", label: "After lunch", effects: [{ area: "energy", weight: 1 }, { area: "gut", weight: 1 }] },
        ],
      },
      {
        key: "gut", block: "feel", order: 3, type: "multi", tier: "core", prompt: "Any digestion issues?",
        summaryTemplate: "Digestion: {answer}.",
        options: [
          { value: "bloat", label: "Bloating", reason: "You get bloated", effects: [{ area: "gut", weight: 3 }] },
          { value: "irregular", label: "Irregular", reason: "You're irregular", effects: [{ area: "gut", weight: 3 }] },
          { value: "none", label: "None of these", exclusive: true, summary: "no issues" },
        ],
      },
      {
        key: "gut_freq", block: "feel", order: 4, type: "single", tier: "followup", prompt: "How often?",
        showIf: { answer: "gut", notIn: ["none"] },
        options: [
          { value: "often", label: "Most days", effects: [{ area: "gut", weight: 2 }] },
          { value: "rare", label: "Rarely", effects: [{ area: "gut", weight: 0 }] },
        ],
      },
      {
        key: "sleep", block: "feel", order: 5, type: "single", tier: "core", prompt: "How do you sleep?",
        options: [
          { value: "well", label: "Well" },
          { value: "poor", label: "Poorly", reason: "You don't sleep well", effects: [{ area: "sleep", weight: 4 }] },
        ],
      },
      {
        key: "conditions_gate", block: "safety", order: 1, type: "single", tier: "core", prompt: "Any conditions or medication?",
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
          { value: "pns", label: "Prefer not to say", flags: ["undisclosed"] },
        ],
      },
      {
        key: "meds", block: "safety", order: 2, type: "multi", tier: "core", prompt: "Which medicines?",
        showIf: { answer: "conditions_gate", in: ["yes"] },
        options: [
          { value: "thyroid", label: "Thyroid", flags: ["thyroid"] },
          { value: "none", label: "None", exclusive: true },
        ],
      },
    ],
    areas: [
      { key: "energy", name: "Energy", order: 1, copy: "Energy copy", tips: ["t1", "t2", "t3"], ingredients: [
        { key: "b12", weight: 5, why: "B12 supports energy" }, { key: "iron", weight: 4, why: "Iron why" }, { key: "ash", weight: 2, why: "Ash why" }, { key: "beet", weight: 1, why: "Beet why" },
      ] },
      { key: "gut", name: "Gut", order: 2, copy: "Gut copy", tips: ["g1"], ingredients: [
        { key: "probiotic", weight: 5, why: "Probiotic why" }, { key: "phgg", weight: 4, why: "PHGG why" },
      ] },
      { key: "sleep", name: "Sleep", order: 3, copy: "Sleep copy", tips: ["s1"], ingredients: [
        { key: "ash", weight: 5, why: "Ash sleep why" }, { key: "mag", weight: 4, why: "Mag why" },
      ] },
      { key: "ageing", name: "Healthy Ageing", order: 4, copy: "Ageing copy", tips: [], ingredients: [{ key: "d3", weight: 3, why: "D3 why" }] },
    ],
    ingredients: [
      { key: "b12", name: "Vitamin B12", dose: "2.2 mcg", rda: 100 },
      { key: "iron", name: "Iron", dose: "3 mg", rda: 15.8 },
      { key: "ash", name: "KSM-66® Ashwagandha", blend: "Adaptogen & Cognitive Blend", blendDose: "400 mg" },
      { key: "beet", name: "Beetroot" },
      { key: "probiotic", name: "Bacillus coagulans" },
      { key: "phgg", name: "PHGG Sunfiber®" },
      { key: "mag", name: "Magnesium" },
      { key: "d3", name: "Vitamin D3" },
    ],
    safetyRules: [
      { key: "under_19", level: "stop", when: { flag: "under_19" }, title: "Not for under 19s", message: "COMPLETE+ is formulated for adults.", ingredientKeys: [] },
      { key: "pregnant", level: "stop", when: { flag: "pregnant" }, title: "Pregnancy", message: "Please speak to your doctor first.", ingredientKeys: ["ash"] },
      { key: "ttc", level: "consult", when: { flag: "ttc" }, title: "Trying to conceive", message: "Check with your doctor.", ingredientKeys: ["ash"] },
      { key: "thyroid", level: "consult", when: { flag: "thyroid" }, title: "Thyroid medication", message: "Check with your doctor.", ingredientKeys: ["ash"] },
      { key: "undisclosed", level: "consult", when: { flag: "undisclosed" }, title: "Health details not shared", message: "Check with your doctor.", ingredientKeys: [] },
    ],
  };
}
