import { HeroSectionForm } from "@/components/content/HeroSectionForm";
import { getHeroSection } from "@/lib/content";
export default async function Page(){const hero=await getHeroSection();return <div className="space-y-5"><div><h1 className="text-xl font-bold">Hero Section</h1><p className="text-sm text-slate-500">Manage the storefront’s primary headings, imagery, and calls to action.</p></div><HeroSectionForm initial={hero}/></div>}
