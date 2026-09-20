"use client";
import { useState } from "react";
import type { AffiliateProgram, AffiliateSettings } from "@/lib/affiliate";
import { saveAffiliateSettingsAction } from "@/app/(admin)/affiliates/actions";
import { Input, Textarea, Select, Checkbox, FormSection } from "@/components/ui/form";

export function AffiliateSettingsForm({settings,programs}:{settings:AffiliateSettings;programs:AffiliateProgram[]}){
 const[saving,setSaving]=useState(false),[message,setMessage]=useState("");
 async function submit(data:FormData){setSaving(true);setMessage("");const r=await saveAffiliateSettingsAction({registrationEnabled:data.get('registrationEnabled')==='on',autoApprove:data.get('autoApprove')==='on',defaultProgramId:String(data.get('defaultProgramId')||'')||undefined,signupTitle:String(data.get('signupTitle')||''),signupIntroduction:String(data.get('signupIntroduction')||''),termsUrl:String(data.get('termsUrl')||'')||undefined,notificationEmail:String(data.get('notificationEmail')||'')||undefined,requiredFields:['name','email',...(data.get('requirePhone')==='on'?['phone']:[]),...(data.get('requireChannels')==='on'?['channels']:[])]});setSaving(false);setMessage(r.error??'Settings saved.')}
 const defaultId=typeof settings.defaultProgramId==='string'?settings.defaultProgramId:settings.defaultProgramId?._id;
 return <form action={submit} className="grid gap-5 xl:grid-cols-[1fr_340px]"><div className="space-y-5">
  <FormSection title="Registration"><div className="space-y-4">
   <Checkbox label="Accept affiliate applications" description="When disabled, the public application endpoint rejects new applications." name="registrationEnabled" defaultChecked={settings.registrationEnabled}/>
   <Checkbox label="Automatically approve applicants" description="Creates the default tracking link immediately." name="autoApprove" defaultChecked={settings.autoApprove}/>
   <Select label="Default program" name="defaultProgramId" defaultValue={defaultId} options={programs.map(p=>({value:p._id,label:p.name}))}/>
  </div></FormSection>

  <FormSection title="Signup page content"><div className="space-y-4">
   <Input label="Page title" name="signupTitle" required defaultValue={settings.signupTitle}/>
   <Textarea label="Introduction" name="signupIntroduction" required rows={4} defaultValue={settings.signupIntroduction}/>
   <Input label="Terms URL" name="termsUrl" placeholder="/terms/affiliate" defaultValue={settings.termsUrl}/>
  </div></FormSection>

  <FormSection title="Application fields and notifications"><div className="space-y-3">
   <Checkbox label="Name and email (required)" checked readOnly/>
   <Checkbox label="Require phone number" name="requirePhone" defaultChecked={settings.requiredFields.includes('phone')}/>
   <Checkbox label="Require promotion channels" name="requireChannels" defaultChecked={settings.requiredFields.includes('channels')}/>
   <Input label="Application notification email" type="email" name="notificationEmail" defaultValue={settings.notificationEmail}/>
  </div></FormSection>
 </div><aside><div className="sticky top-5 rounded-xl border bg-white p-5"><h3 className="font-semibold">Publishing</h3><p className="mt-2 text-sm text-slate-500">These settings immediately affect public affiliate applications.</p>{message&&<p className={`mt-4 rounded-lg p-3 text-sm ${message==='Settings saved.'?'bg-green-50 text-green-700':'bg-red-50 text-red-600'}`}>{message}</p>}<button disabled={saving} className="mt-5 w-full rounded-lg bg-[#558476] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#457366] disabled:opacity-50">{saving?'Saving…':'Save settings'}</button></div></aside></form>
}
