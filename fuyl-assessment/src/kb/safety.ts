import type { SafetyRule } from "@/engine";

/**
 * Safety rules (draft — for review by a qualified nutritionist / doctor).
 *
 * Aligned with FUYL's own guidance on fuyl.in: "formulated for healthy adults,
 * not a treatment for any condition. If you're pregnant, nursing, on
 * medication, or managing a health issue, consult your doctor before
 * starting." The label states a target population of age 19+.
 *
 *   stop    → no product recommendation; kind "speak to your doctor" screen
 *   consult → product shown with a clear "check with your doctor first" note
 *   info    → a gentle pointer (e.g. check the full label)
 */
export const SAFETY_RULES: SafetyRule[] = [
  // ── Stop ──
  {
    key: "under_19",
    level: "stop",
    when: { flag: "under_19" },
    title: "COMPLETE+ is made for adults",
    message:
      "FUYL COMPLETE+ is formulated for adults aged 19 and above, so we can't recommend it for you yet. A balanced diet is the best foundation — and a doctor can advise if you think you need extra nutrition.",
    ingredientKeys: [],
  },
  {
    key: "pregnant",
    level: "stop",
    when: { flag: "pregnant" },
    title: "Congratulations — let's keep you both safe",
    message:
      "COMPLETE+ contains herbal extracts such as ashwagandha that aren't recommended during pregnancy. Please speak to your doctor about the right prenatal nutrition for you.",
    ingredientKeys: ["ashwagandha", "brahmi", "tulsi", "giloy", "fenugreek", "milk-thistle"],
  },
  {
    key: "breastfeeding",
    level: "stop",
    when: { flag: "breastfeeding" },
    title: "Let's keep you and your baby safe",
    message:
      "COMPLETE+ contains herbal extracts that haven't been established as safe while breastfeeding. Please speak to your doctor about the right nutrition for you.",
    ingredientKeys: ["ashwagandha", "brahmi", "tulsi", "giloy", "fenugreek", "milk-thistle"],
  },

  // ── Consult ──
  {
    key: "ttc",
    level: "consult",
    when: { flag: "ttc" },
    title: "Trying to conceive",
    message:
      "Some herbal ingredients aren't recommended once you become pregnant. Please check with your doctor before starting, and stop if you become pregnant.",
    ingredientKeys: ["ashwagandha", "brahmi", "tulsi", "giloy", "fenugreek"],
  },
  {
    key: "thyroid",
    level: "consult",
    when: { any: [{ flag: "cond_thyroid" }, { flag: "med_thyroid" }] },
    title: "Thyroid condition or medicine",
    message:
      "Ashwagandha may affect thyroid hormone levels, and COMPLETE+ also contains iodine and selenium. Please check with your doctor before starting.",
    ingredientKeys: ["ashwagandha", "iodine", "selenium"],
  },
  {
    key: "diabetes",
    level: "consult",
    when: { any: [{ flag: "cond_diabetes" }, { flag: "med_diabetes" }] },
    title: "Diabetes or blood-sugar medicine",
    message:
      "Some ingredients may lower blood sugar and could add to the effect of diabetes medicine. Please check with your doctor before starting.",
    ingredientKeys: ["fenugreek", "ala", "ashwagandha", "tulsi", "giloy"],
  },
  {
    key: "bleeding",
    level: "consult",
    when: { any: [{ flag: "cond_bleeding" }, { flag: "med_anticoag" }] },
    title: "Blood thinners or a bleeding disorder",
    message:
      "Vitamin K2 can interfere with blood thinners such as warfarin, and some antioxidants may affect clotting. Please check with your doctor before starting.",
    ingredientKeys: ["vitamin-k2", "grape-seed", "vitamin-e", "flaxseed"],
  },
  {
    key: "blood_pressure",
    level: "consult",
    when: { any: [{ flag: "cond_bp" }, { flag: "med_bp" }] },
    title: "Blood pressure",
    message:
      "Some ingredients may affect blood pressure and add to the effect of blood-pressure medicine. Please check with your doctor before starting.",
    ingredientKeys: ["ashwagandha", "beetroot", "tulsi"],
  },
  {
    key: "heart",
    level: "consult",
    when: { flag: "cond_heart" },
    title: "Heart condition",
    message: "Because you have a heart condition, please check with your doctor before starting COMPLETE+.",
    ingredientKeys: [],
  },
  {
    key: "sedatives",
    level: "consult",
    when: { flag: "med_sedative" },
    title: "Sleep, anxiety or antidepressant medicine",
    message:
      "Ashwagandha, brahmi and tulsi may add to the effect of sedatives and some mood medicines. Please check with your doctor before starting.",
    ingredientKeys: ["ashwagandha", "brahmi", "tulsi"],
  },
  {
    key: "immune",
    level: "consult",
    when: { any: [{ flag: "cond_autoimmune" }, { flag: "med_immuno" }] },
    title: "Autoimmune condition or immune-suppressing medicine",
    message:
      "Some ingredients may stimulate the immune system, which may not suit autoimmune conditions or immunosuppressant treatment. Please check with your doctor before starting.",
    ingredientKeys: ["giloy", "ashwagandha", "bacillus-coagulans"],
  },
  {
    key: "liver",
    level: "consult",
    when: { flag: "cond_liver" },
    title: "Liver condition",
    message:
      "Rare liver reactions have been reported with some herbal extracts. With a liver condition, please check with your doctor before starting.",
    ingredientKeys: ["giloy", "ashwagandha", "milk-thistle"],
  },
  {
    key: "kidney",
    level: "consult",
    when: { flag: "cond_kidney" },
    title: "Kidney condition",
    message: "With a kidney condition, minerals need careful management. Please check with your doctor before starting.",
    ingredientKeys: ["magnesium", "zinc", "iron", "selenium", "iodine", "manganese"],
  },
  {
    key: "iron_overload",
    level: "consult",
    when: { flag: "cond_iron" },
    title: "Iron overload",
    message: "COMPLETE+ contains iron, and vitamin C increases iron absorption. Please check with your doctor before starting.",
    ingredientKeys: ["iron", "vitamin-c"],
  },
  {
    key: "digestive",
    level: "consult",
    when: { flag: "cond_gi" },
    title: "Digestive condition",
    message:
      "COMPLETE+ contains prebiotic fibres and a probiotic. These suit most people, but with IBS, IBD or coeliac disease please check with your doctor first.",
    ingredientKeys: ["inulin", "fos", "phgg", "bacillus-coagulans"],
  },
  {
    key: "cancer",
    level: "consult",
    when: { flag: "med_cancer" },
    title: "Cancer treatment",
    message:
      "High-antioxidant supplements may interact with some cancer treatments. Please speak to your oncologist before starting.",
    ingredientKeys: ["ala", "grape-seed", "astaxanthin", "vitamin-c", "vitamin-e"],
  },
  {
    key: "surgery",
    level: "consult",
    when: { flag: "surgery" },
    title: "Upcoming surgery",
    message:
      "Some ingredients may affect bleeding or anaesthesia, so they're usually paused 2 weeks before surgery. Please check with your doctor or surgeon.",
    ingredientKeys: ["vitamin-k2", "grape-seed", "vitamin-e", "ashwagandha", "fenugreek"],
  },
  {
    key: "other_condition",
    level: "consult",
    when: { any: [{ flag: "cond_other" }, { flag: "med_other" }] },
    title: "Other condition or medicine",
    message:
      "Because you have a health condition or take prescription medicine, please check with your doctor before starting COMPLETE+. You can share the full ingredient list with them.",
    ingredientKeys: [],
  },
  {
    key: "undisclosed",
    level: "consult",
    when: { flag: "undisclosed" },
    title: "A quick check with your doctor",
    message:
      "That's completely fine. If you have any health condition or take medicine, please check with your doctor before starting COMPLETE+.",
    ingredientKeys: [],
  },

  // ── Info ──
  {
    key: "allergy",
    level: "info",
    when: { flag: "allergy" },
    title: "Check the full ingredient list",
    message:
      "COMPLETE+ contains coconut milk powder and is 100% vegetarian. Please read the full ingredient list on the pack to check against your allergies.",
    ingredientKeys: ["coconut-milk-powder"],
  },
];
