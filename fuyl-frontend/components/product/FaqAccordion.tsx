import { Accordion } from '@/components/ui/Accordion'
import type { ProductFAQ } from '@/types/product'

interface FaqAccordionProps {
  faqs: ProductFAQ[]
}

export function FaqAccordion({ faqs }: FaqAccordionProps) {
  if (!faqs.length) return null

  return (
    <div className="border-t pt-10" style={{ borderColor: 'var(--color-brand-border)' }}>
      <h2 className="text-display-md font-display mb-4 text-brand-forest">Questions &amp; Answers</h2>
      <Accordion items={faqs.map((f, i) => ({ id: String(i), question: f.question, answer: f.answer }))} />
    </div>
  )
}
