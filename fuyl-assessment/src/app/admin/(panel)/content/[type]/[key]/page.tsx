import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { FocusArea, Ingredient, Question, SafetyRule } from "@/engine";
import { PageHeader } from "@/components/admin/ui";
import { buildEditorMeta } from "@/components/admin/editors/meta";
import { QuestionEditor } from "@/components/admin/editors/QuestionEditor";
import { AreaEditor, IngredientEditor, SafetyEditor } from "@/components/admin/editors/SimpleEditors";
import { requireAdminPage } from "@/lib/admin/auth";
import { getDraft } from "@/lib/admin/kbStore";
import { findReferences, getEntity, reviewKey } from "@/kb/draft";
import { ENTITY_LABEL, ENTITY_TYPES, type EntityType } from "@/kb/schema";

export const dynamic = "force-dynamic";

const BLANK: Record<EntityType, () => object> = {
  question: () => ({ key: "", block: "feel", order: 99, type: "single", tier: "followup", prompt: "", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] }) satisfies Question,
  area: () => ({ key: "", name: "", order: 99, copy: "", ingredients: [], tips: [] }) satisfies FocusArea,
  ingredient: () => ({ key: "", name: "" }) satisfies Ingredient,
  safety: () => ({ key: "", level: "consult", when: { flag: "" }, title: "", message: "", ingredientKeys: [] }) satisfies SafetyRule,
};

export default async function EditEntity({ params }: { params: Promise<{ type: string; key: string }> }) {
  const admin = await requireAdminPage();
  const { type, key } = await params;
  if (!(ENTITY_TYPES as readonly string[]).includes(type)) notFound();
  const t = type as EntityType;
  const { kb, reviews } = await getDraft();

  const isNew = key === "new";
  const entity = isNew ? BLANK[t]() : getEntity(kb, t, key);
  if (!entity) notFound();

  const common = {
    originalKey: isNew ? null : key,
    meta: buildEditorMeta(kb),
    review: isNew ? undefined : reviews[reviewKey(t, key)],
    references: isNew ? [] : findReferences(kb, t, key),
    canDelete: admin.role === "admin",
  };
  const title = isNew ? `New ${ENTITY_LABEL[t].toLowerCase()}` : "name" in entity ? String(entity.name) : "title" in entity ? String(entity.title) : key;

  return (
    <>
      <Link href={`/admin/content/${t}`} className="mb-3 inline-flex items-center gap-1 text-sm text-teal-deep hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> All {ENTITY_LABEL[t].toLowerCase()}s
      </Link>
      <PageHeader title={title} description={isNew ? undefined : `${ENTITY_LABEL[t]} · ${key}`} />
      {t === "question" && <QuestionEditor initial={entity as Question} {...common} />}
      {t === "area" && <AreaEditor initial={entity as FocusArea} {...common} />}
      {t === "ingredient" && <IngredientEditor initial={entity as Ingredient} {...common} />}
      {t === "safety" && <SafetyEditor initial={entity as SafetyRule} {...common} />}
    </>
  );
}
