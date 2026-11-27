import type { AgeGroup, SexValues } from "./types";

/** Adult age groups used for daily reference values (the US NIH bands). */
export const AGE_GROUPS: { value: AgeGroup; label: string }[] = [
  { value: "19-30", label: "19–30" },
  { value: "31-50", label: "31–50" },
  { value: "51-70", label: "51–70" },
  { value: "71+", label: "71+" },
];

/** The age group for an age; adults who didn't say get 31–50 (the base values). */
export function ageGroupOf(age?: number): AgeGroup {
  if (!age || !Number.isFinite(age)) return "31-50";
  return age <= 30 ? "19-30" : age <= 50 ? "31-50" : age <= 70 ? "51-70" : "71+";
}

type RefLike = { india: SexValues; global: SexValues; byAge?: Partial<Record<AgeGroup, { india?: SexValues; global?: SexValues }>> };

/** India and global daily needs for one age group (base values unless that group differs). */
export function refForAge(ref: RefLike, group: AgeGroup): { india: SexValues; global: SexValues } {
  const o = ref.byAge?.[group];
  return { india: o?.india ?? ref.india, global: o?.global ?? ref.global };
}
