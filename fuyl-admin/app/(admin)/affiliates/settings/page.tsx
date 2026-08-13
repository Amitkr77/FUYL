import { AffiliateSettingsForm } from "@/components/affiliates/AffiliateSettingsForm";
import { getAffiliateSettings,listAffiliatePrograms } from "@/lib/affiliate";
export default async function Page(){const[settings,programs]=await Promise.all([getAffiliateSettings(),listAffiliatePrograms()]);return <div className="space-y-5"><div><h2 className="text-lg font-semibold">Affiliate settings</h2><p className="text-sm text-slate-500">Control applications and public signup content.</p></div><AffiliateSettingsForm settings={settings} programs={programs}/></div>}
