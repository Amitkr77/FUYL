import type { KnowledgeBase } from "@/engine";

/** Lightweight lookup data the editors need for their dropdowns. */
export interface EditorMeta {
  questions: { key: string; prompt: string; type: string; options: { value: string; label: string }[] }[];
  areas: { key: string; name: string }[];
  ingredients: { key: string; name: string }[];
  flags: string[];
}

export function buildEditorMeta(kb: KnowledgeBase): EditorMeta {
  const flags = new Set<string>();
  for (const q of kb.questions) {
    q.options?.forEach((o) => o.flags?.forEach((f) => flags.add(f)));
    q.bands?.forEach((b) => b.flags?.forEach((f) => flags.add(f)));
  }
  return {
    questions: kb.questions.map((q) => ({ key: q.key, prompt: q.prompt, type: q.type, options: (q.options ?? []).map((o) => ({ value: o.value, label: o.label })) })),
    areas: kb.areas.map((a) => ({ key: a.key, name: a.name })),
    ingredients: kb.ingredients.map((i) => ({ key: i.key, name: i.name })),
    flags: [...flags].sort(),
  };
}
