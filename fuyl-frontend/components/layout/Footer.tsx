import Link from "next/link";
import Image from "next/image";
import { FOOTER_LINKS, SITE } from "@/lib/constants";

function InstagramIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}
function YoutubeIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
      <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" />
    </svg>
  );
}
function FacebookIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}
function LinkedinIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

export function Footer() {
  const socialLinks = [
    { href: SITE.instagram, icon: InstagramIcon, label: "Instagram" },
    { href: SITE.youtube, icon: YoutubeIcon, label: "YouTube" },
    { href: SITE.facebook, icon: FacebookIcon, label: "Facebook" },
    { href: SITE.linkedin, icon: LinkedinIcon, label: "LinkedIn" },
  ];

  return (
    <>
      <div
        className="
  relative
  h-[520px]
  overflow-hidden
  md:h-[720px]
  "
      >
        <Image
          src="/images/footer-image.webp"
          alt="FUYL"
          fill
          className="
    object-cover
    object-center
    "
          sizes="100vw"
        />

        <div className=" absolute inset-0 bg-linear-to-b from-transparent via-brand-forest/10 to-brand-forest/50" />
      </div>
      <footer className=" bg-brand-forest text-white  border-white/10">
        <div className="container-brand py-16 grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/">
              <Image
                src="https://fuyl.in/cdn/shop/files/Final_Logo_290526.png?v=1780044950"
                alt="FUYL"
                width={90}
                height={32}
                className="h-8 w-auto object-contain brightness-0 invert"
              />
            </Link>
            <p className="mt-4 text-body-sm leading-relaxed max-w-xs text-white/60">
              Complete daily nutrition. 60+ premium ingredients. One sachet
              every morning.
            </p>
            <div className="mt-6 space-y-1.5">
              <a
                href={`mailto:${SITE.email}`}
                className="block text-body-xs text-white/50 hover:text-brand-teal transition-colors"
              >
                {SITE.email}
              </a>
              <a
                href={`tel:${SITE.phone}`}
                className="block text-body-xs text-white/50 hover:text-brand-teal transition-colors"
              >
                {SITE.phone}
              </a>
            </div>
            <div className="mt-6 flex items-center gap-3">
              {socialLinks.map(({ href, icon: Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="p-2 rounded-sm border border-white/20 text-white/60 hover:text-brand-teal hover:border-brand-teal transition-colors duration-200"
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {/* Explore */}
          <div>
            <p className="text-label mb-4 text-white/40">Explore</p>
            <ul className="space-y-3">
              {FOOTER_LINKS.explore.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-body-sm text-white/70 hover:text-brand-teal transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Discover */}
          <div>
            <p className="text-label mb-4 text-white/40">Discover</p>
            <ul className="space-y-3">
              {FOOTER_LINKS.discover.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    target={
                      "external" in link && (link as any).external
                        ? "_blank"
                        : undefined
                    }
                    rel={
                      "external" in link && (link as any).external
                        ? "noopener noreferrer"
                        : undefined
                    }
                    className="text-body-sm text-white/70 hover:text-brand-teal transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <p className="text-label mb-4 text-white/40">Support</p>
            <ul className="space-y-3">
              {FOOTER_LINKS.support.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-body-sm text-white/70 hover:text-brand-teal transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10">
          <div className="container-brand py-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-body-xs text-white/40">
              © {new Date().getFullYear()} FUYL — {SITE.company}
            </p>
            <div className="flex items-center gap-2">
              {["Visa", "Mastercard", "UPI", "RuPay"].map((method) => (
                <span
                  key={method}
                  className="px-2 py-1 rounded text-[10px] font-medium border border-white/15 text-white/40"
                >
                  {method}
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
