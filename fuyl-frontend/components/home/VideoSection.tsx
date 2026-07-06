"use client";

import { useRef, useState, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Countdown } from "@/components/ui/Countdown";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const LAUNCH_DATE = "2026-07-06T00:00:00+05:30";

export function VideoSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    videoRef.current?.play().catch(() => {});
  }, []);

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  return (
    <section className="relative w-full max-w-full overflow-hidden min-h-dvh">
      {/* Background video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        autoPlay
        loop
        muted
        poster="https://fuyl.in/cdn/shop/files/FUYL_Complete_Product_Shot.jpg"
        aria-hidden="true"
      >
        <source src="/video/fuyl-reveal.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay — heavier at top and bottom, lighter in the middle so video shows */}
      <div className="absolute inset-0 bg-linear-to-b from-black/60 via-black/40 to-black/70" />

      {/* Mute toggle — top right */}
      <button
        onClick={toggleMute}
        aria-label={muted ? "Unmute video" : "Mute video"}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border border-white/30 bg-black/30 text-white backdrop-blur-sm hover:bg-black/50 transition-colors"
      >
        {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>

      {/* Centered content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center text-white px-5 py-20 sm:py-16 lg:py-24 min-h-dvh max-w-full">
        <ScrollReveal>
          <div className="flex justify-center mb-4">
            <span className="inline-block rounded-full px-3 py-1 bg-white/10 text-white text-label">
              Launching Soon
            </span>
          </div>
          <h2 className="text-display-xl font-display mb-3 sm:mb-6 max-w-3xl">
            FUYL COMPLETE+
            <br />
            IS ALMOST HERE.
          </h2>
          <p className="text-sm sm:text-lg text-white/70 max-w-[90%] sm:max-w-md mx-auto mb-6 sm:mb-10 leading-relaxed">
            Join the waitlist for early access, launch-day pricing, and a free
            nutrition consultation.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div className="w-full max-w-full overflow-x-auto sm:overflow-visible">
            <Countdown targetDate={LAUNCH_DATE} />
          </div>
        </ScrollReveal>

        {/* <ScrollReveal delay={200}>
          <form
            className="flex flex-col sm:flex-row gap-2 mt-8 sm:mt-10 w-full max-w-md mx-auto px-1 sm:px-0"
            onSubmit={(e) => { e.preventDefault(); alert('Waitlist coming soon!') }}
          >
            <input
              type="email"
              placeholder="your@email.com"
              required
              className="flex-1 min-w-0 h-12 px-4 text-sm bg-white/10 rounded-sm outline-none border border-white/20 text-white placeholder:text-white/40 focus:border-brand-teal transition-colors backdrop-blur-sm"
            />
            <button
              type="submit"
              className="h-12 px-6 text-xs font-semibold uppercase tracking-widest bg-brand-rose text-white rounded-sm transition-colors hover:bg-brand-rose-dark shrink-0"
            >
              Join Waitlist
            </button>
          </form>
        </ScrollReveal> */}
      </div>
    </section>
  );
}
