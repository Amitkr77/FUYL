'use client'

import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface AccordionItem {
  id: string
  question: string
  answer: string
}

interface AccordionProps {
  items: AccordionItem[]
  allowMultiple?: boolean
  defaultOpen?: string[]
  className?: string
}

export function Accordion({
  items,
  allowMultiple = false,
  defaultOpen = [],
  className,
}: AccordionProps) {
  const [open, setOpen] = useState<Set<string>>(
    new Set(defaultOpen)
  )

  const toggle = (id: string) => {
    setOpen((current) => {
      const next = new Set(current)

      if (next.has(id)) {
        next.delete(id)
      } else {
        if (!allowMultiple) {
          next.clear()
        }

        next.add(id)
      }

      return next
    })
  }

  return (
    <div
      className={cn(
        'divide-y divide-brand-border',
        className
      )}
    >
      {items.map((item) => {
        const isOpen = open.has(item.id)
        const contentId = `accordion-${item.id}`

        return (
          <div
            key={item.id}
            className="group"
          >
            <button
              type="button"
              onClick={() => toggle(item.id)}
              aria-expanded={isOpen}
              aria-controls={contentId}
              className="
                flex
                w-full
                items-center
                justify-between
                gap-6
                py-6
                text-left
                transition-colors
                duration-200
              "
            >
              <span
                className="
                  text-body-md
                  font-semibold
                  text-brand-forest
                  transition-colors
                  duration-200
                  group-hover:text-brand-teal
                "
              >
                {item.question}
              </span>


              <span
                className={cn(
                  `
                  flex
                  h-8
                  w-8
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  border
                  transition-all
                  duration-300
                  `,
                  isOpen
                    ? `
                      border-brand-teal
                      bg-brand-teal
                      text-white
                    `
                    : `
                      border-brand-border
                      text-brand-olive
                    `
                )}
              >
                {isOpen ? (
                  <Minus size={16}/>
                ) : (
                  <Plus size={16}/>
                )}
              </span>
            </button>


            <div
              id={contentId}
              className={cn(
                `
                grid
                transition-all
                duration-300
                ease-out
                `,
                isOpen
                  ? 'grid-rows-[1fr] opacity-100 pb-6'
                  : 'grid-rows-[0fr] opacity-0'
              )}
            >
              <div className="overflow-hidden">
                <p
                  className="
                    max-w-2xl
                    text-body-md
                    leading-relaxed
                    text-brand-muted
                  "
                >
                  {item.answer}
                </p>
              </div>
            </div>

          </div>
        )
      })}
    </div>
  )
}