import { listStorefrontSectionRevisions } from '@/lib/content'
import { SectionRevisionHistory } from './SectionRevisionHistory'

export async function SectionHistoryPanel({ sectionKey }: { sectionKey:string }) {
  const revisions=await listStorefrontSectionRevisions(sectionKey).catch(()=>[])
  return <SectionRevisionHistory sectionKey={sectionKey} revisions={revisions}/>
}
