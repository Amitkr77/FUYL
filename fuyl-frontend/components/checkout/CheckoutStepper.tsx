'use client'

interface CheckoutStepperProps {
  steps: string[]
  currentIndex: number
  // Only completed steps are clickable — you can go back to fix something,
  // never forward-skip past where the flow has actually validated you to.
  onStepClick?: (index: number) => void
}

export function CheckoutStepper({ steps, currentIndex, onStepClick }: CheckoutStepperProps) {
  return (
    <nav aria-label="Checkout progress" className="mb-8">
      {/* Mobile — compact "Step X of Y", full stepper doesn't fit comfortably */}
      <p
        className="sm:hidden text-body-xs font-semibold uppercase tracking-widest mb-3"
        style={{ color: 'var(--color-brand-muted)' }}
      >
        Step {currentIndex + 1} of {steps.length} — {steps[currentIndex]}
      </p>

      {/* Desktop/tablet — full numbered stepper with a connecting progress line */}
      <ol className="hidden sm:flex items-center">
        {steps.map((label, i) => {
          const isCompleted = i < currentIndex
          const isCurrent = i === currentIndex
          const clickable = isCompleted && !!onStepClick

          return (
            <li key={label} className="flex items-center flex-1 last:flex-none">
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onStepClick?.(i)}
                aria-current={isCurrent ? 'step' : undefined}
                className={`flex items-center gap-2.5 ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors"
                  style={{
                    background: isCompleted || isCurrent ? 'var(--color-brand-forest)' : 'transparent',
                    color:      isCompleted || isCurrent ? 'white' : 'var(--color-brand-muted)',
                    border:     isCompleted || isCurrent ? 'none' : '1px solid var(--color-brand-border)',
                  }}
                >
                  {isCompleted ? '✓' : i + 1}
                </span>
                <span
                  className="text-body-sm font-semibold whitespace-nowrap"
                  style={{ color: isCurrent || isCompleted ? 'var(--color-brand-forest)' : 'var(--color-brand-muted)' }}
                >
                  {label}
                </span>
              </button>
              {i < steps.length - 1 && (
                <div
                  className="flex-1 h-px mx-3 transition-colors"
                  style={{ background: isCompleted ? 'var(--color-brand-forest)' : 'var(--color-brand-border)' }}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
