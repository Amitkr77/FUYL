/**
 * Slowly drifting, heavily blurred colour fields behind every glass surface.
 * Pure CSS (transform-only keyframes) so it stays on the compositor and costs
 * nothing on the main thread. Disabled automatically under reduced motion via
 * the global media query in globals.css.
 */
export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden print:hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-mist via-cream to-mist" />
      <div className="absolute -left-[15%] -top-[20%] h-[65vmax] w-[65vmax] rounded-full bg-sage/80 blur-[110px] animate-drift-a" />
      <div className="absolute -right-[20%] top-[10%] h-[55vmax] w-[55vmax] rounded-full bg-teal/30 blur-[120px] animate-drift-b" />
      <div className="absolute bottom-[-25%] left-[20%] h-[50vmax] w-[50vmax] rounded-full bg-ember/10 blur-[130px] animate-drift-c" />
      <div className="grain absolute inset-0 opacity-[0.06] mix-blend-multiply" />
    </div>
  );
}
