"use client";

import { useState } from "react";
import { Star, Quote } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

type Tab = "experts" | "customers";

const TESTIMONIALS = {
  experts: [
    {
      id: "e1",
      name: "Dr. Rima Khanna",
      role: "MD, Internal Medicine · Mumbai",
      body: "I have reviewed the formulation closely. The choice of KSM-66 Ashwagandha, Bacillus Coagulans and bioavailable Magnesium Glycinate shows real clinical intent. I recommend FUYL to my patients who struggle with stress and gut issues.",
    },
    {
      id: "e2",
      name: "Anjali Mehta",
      role: "Registered Dietitian · Delhi",
      body: "What impresses me most is the transparency — you can see exactly what is in each sachet and at what dose. Most supplements hide behind proprietary blends. FUYL does not.",
    },
    {
      id: "e3",
      name: "Vikram Rao",
      role: "Sports Nutritionist · Bengaluru",
      body: "For my athletes, FUYL fills micronutrient gaps that even good diets miss. The digestive enzyme blend supports better absorption and recovery.",
    },
  ],

  customers: [
    {
      id: "c1",
      name: "Priya S.",
      role: "Marketing Manager · Pune",
      body: "Three months in and the difference is real. My energy is consistent throughout the day — no afternoon crash. FUYL replaced multiple supplements for me.",
    },
    {
      id: "c2",
      name: "Rahul M.",
      role: "Software Engineer · Hyderabad",
      body: "I was sceptical at first, but FUYL is different. By week two I noticed better sleep and by week four I felt more energetic.",
    },
    {
      id: "c3",
      name: "Neha T.",
      role: "Entrepreneur · Bengaluru",
      body: "Running a company meant poor sleep and constant stress. FUYL helped me feel more balanced, focused, and consistent.",
    },
  ],
};

function Stars() {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={14}
          className="fill-brand-forest text-brand-forest"
        />
      ))}
    </div>
  );
}

export function TestimonialsSection() {
  const [tab, setTab] = useState<Tab>("customers");

  const items = TESTIMONIALS[tab];

  return (
    <section className="section-py bg-brand-cream">
      <div className="container-brand">
        <ScrollReveal>
          <div className="flex justify-center mb-4">
            <span className="inline-block rounded-md px-3 py-2 bg-brand-sage text-brand-forest text-label">
              Testimonials
            </span>
          </div>

          <h2 className="text-display-xl font-display text-center text-brand-forest">
            WHAT PEOPLE ARE SAYING
          </h2>
          <p className="text-body-md text-brand-muted text-center max-w-2xl mx-auto mt-4">
            Trusted by experts and customers worldwide
          </p>
          {/* </ScrollReveal> */}

          {/* Tabs */}
          <div className="mt-10 flex justify-center">
            <div className="inline-flex items-center rounded-full border border-brand-border bg-white p-1 shadow-sm">
              {(["customers", "experts"] as Tab[]).map((item) => (
                <button
                  key={item}
                  onClick={() => setTab(item)}
                  className={cn(
                    `
          relative
          min-w-32
          rounded-full
          px-6
          py-3
          text-xs
          font-semibold
          uppercase
          tracking-widest
          transition-all
          duration-300
          `,
                    tab === item
                      ? `
              bg-brand-forest
              text-white
              shadow-sm
            `
                      : `
              text-brand-muted
              hover:text-brand-forest
              hover:bg-brand-forest/5
            `,
                  )}
                >
                  {item === "customers" ? "Customers" : "Experts"}
                </button>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Mobile: horizontal scroll; md+: 3-col grid */}
        <div className="mt-12 overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden -mx-4 sm:-mx-6 md:mx-0 md:overflow-visible">
          <div className="flex gap-4 px-4 sm:px-6 md:px-0 pb-2 md:pb-0 md:grid md:grid-cols-3 md:gap-6">
            {items.map((item, index) => (
              <ScrollReveal
                key={item.id}
                delay={index * 100}
                className="shrink-0 w-72 sm:w-80 md:w-auto flex flex-col"
              >
                <article
                  className="
                relative
                flex
                flex-col
                h-full
                rounded-xl
                border
                border-brand-border
                bg-white
                p-7
                transition-all
                duration-300
                hover:-translate-y-1
                hover:shadow-lg
              "
                >
                  <Quote
                    size={32}
                    className="
                    absolute
                    right-6
                    top-6
                    text-brand-teal/20
                  "
                  />

                  <Stars />

                  <p
                    className="
                  mt-5
                  flex-1
                  text-body-md
                  leading-relaxed
                  text-brand-muted
                "
                  >
                    “{item.body}”
                  </p>

                  <div
                    className="
                  mt-6
                  flex
                  items-center
                  gap-3
                  border-t
                  border-brand-border
                  pt-5
                "
                  >
                    <div
                      className="
                    flex
                    h-11
                    w-11
                    items-center
                    justify-center
                    rounded-full
                    bg-brand-teal
                    text-sm
                    font-semibold
                    text-white
                  "
                    >
                      {item.name.charAt(0)}
                    </div>

                    <div>
                      <p className="text-body-sm font-semibold text-brand-forest">
                        {item.name}
                      </p>

                      <p className="text-body-xs text-brand-muted">
                        {item.role}
                      </p>
                    </div>
                  </div>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
