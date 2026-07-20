import Link from "next/link";
import Image from "next/image";
import { Mail, Phone } from "lucide-react";
import { FOOTER_LINKS, SITE } from "@/lib/constants";

function InstagramIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient
          id="ig-gradient"
          x1="0"
          y1="32"
          x2="32"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFDD55" />
          <stop offset="30%" stopColor="#FF543E" />
          <stop offset="60%" stopColor="#C837AB" />
          <stop offset="100%" stopColor="#5B51D8" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#ig-gradient)" />
      <rect
        x="9"
        y="9"
        width="14"
        height="14"
        rx="4"
        stroke="white"
        strokeWidth="1.8"
        fill="none"
      />
      <circle
        cx="16"
        cy="16"
        r="4"
        stroke="white"
        strokeWidth="1.8"
        fill="none"
      />
      <circle cx="20.6" cy="11.4" r="1" fill="white" />
    </svg>
  );
}
function YoutubeIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="9" fill="#FF0000" />
      <path d="M13 11.5v9l8-4.5-8-4.5z" fill="white" />
    </svg>
  );
}
function FacebookIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="9" fill="#1877F2" />
      <path
        d="M20 11h-2.2c-.9 0-1.3.4-1.3 1.3V14h3.3l-.4 3.3h-2.9V25h-3.4v-7.7H11V14h2.1v-1.9c0-2.4 1.3-3.9 3.8-3.9H20v2.8z"
        fill="white"
      />
    </svg>
  );
}
function PinterestIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="9" fill="#E60023" />
      <path
        d="M16 8c-4.4 0-7 2.9-7 6.4 0 2 .9 3.6 2.7 4.2.3.1.5 0 .6-.3l.2-.9c.1-.3 0-.4-.1-.6-.5-.6-.8-1.4-.8-2.5 0-3.2 2.3-6 6-6 3.3 0 5.1 2 5.1 4.7 0 3.5-1.5 6.5-3.8 6.5-1.2 0-2.2-1-1.9-2.3.4-1.5 1.1-3.2 1.1-4.3 0-1-.5-1.8-1.6-1.8-1.3 0-2.3 1.3-2.3 3.1 0 1.1.4 1.9.4 1.9l-1.5 6.5c-.3 1.4-.1 3.2 0 3.4 0 .1.2.1.2 0 .1-.1 1.4-1.7 1.8-3.2l.7-2.8c.4.7 1.4 1.3 2.6 1.3 3.4 0 5.7-3.1 5.7-7.2 0-3.1-2.6-6-6.9-6z"
        fill="white"
      />
    </svg>
  );
}
function LinkedinIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="9" fill="#0A66C2" />
      <path
        d="M11.7 13.4h3v9.6h-3v-9.6zM13.2 12a1.7 1.7 0 1 1 0-3.4 1.7 1.7 0 0 1 0 3.4zM16.6 13.4h2.9v1.3h.04c.4-.75 1.4-1.5 2.9-1.5 3.1 0 3.7 2 3.7 4.7v5.1h-3v-4.5c0-1.1 0-2.5-1.5-2.5s-1.8 1.2-1.8 2.4v4.6h-3v-9.6z"
        fill="white"
      />
    </svg>
  );
}

function VisaIcon() {
  return (
    <svg width="38" height="24" viewBox="0 0 48 32" fill="none">
      <rect
        x="0.5"
        y="0.5"
        width="47"
        height="31"
        rx="4"
        fill="white"
        stroke="#E5E5E5"
      />
      <text
        x="24"
        y="21"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontStyle="italic"
        fontWeight="700"
        fontSize="13"
        fill="#1A1F71"
      >
        VISA
      </text>
    </svg>
  );
}
function MastercardIcon() {
  return (
    <svg width="38" height="24" viewBox="0 0 48 32" fill="none">
      <rect
        x="0.5"
        y="0.5"
        width="47"
        height="31"
        rx="4"
        fill="white"
        stroke="#E5E5E5"
      />
      <circle cx="20" cy="16" r="9" fill="#EB001B" />
      <circle cx="28" cy="16" r="9" fill="#F79E1B" />
      <path d="M24 9.5a9 9 0 0 1 0 13 9 9 0 0 1 0-13z" fill="#FF5F00" />
    </svg>
  );
}
function UpiIcon() {
  return (
    <svg width="38" height="24" viewBox="0 0 48 32" fill="none">
      <rect
        x="0.5"
        y="0.5"
        width="47"
        height="31"
        rx="4"
        fill="white"
        stroke="#E5E5E5"
      />
      <text
        x="24"
        y="20"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontWeight="800"
        fontSize="12"
      >
        <tspan fill="#097939">UP</tspan>
        <tspan fill="#ED752E">I</tspan>
      </text>
    </svg>
  );
}
function RupayIcon() {
  return (
    <svg width="38" height="24" viewBox="0 0 48 32" fill="none">
      <defs>
        <linearGradient
          id="rupay-gradient"
          x1="0"
          y1="0"
          x2="48"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#F37021" />
          <stop offset="100%" stopColor="#0F9D58" />
        </linearGradient>
      </defs>
      <rect width="48" height="32" rx="4" fill="url(#rupay-gradient)" />
      <text
        x="24"
        y="20"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontWeight="700"
        fontSize="10"
        fill="white"
      >
        RuPay
      </text>
    </svg>
  );
}

export function Footer() {
  const socialLinks = [
    { href: SITE.instagram, icon: InstagramIcon, label: "Instagram" },
    { href: SITE.youtube, icon: YoutubeIcon, label: "YouTube" },
    { href: SITE.facebook, icon: FacebookIcon, label: "Facebook" },
    { href: SITE.pinterest, icon: PinterestIcon, label: "Pinterest" },
    { href: SITE.linkedin, icon: LinkedinIcon, label: "LinkedIn" },
  ];

  const paymentMethods = [
    { label: "Visa", icon: VisaIcon },
    { label: "Mastercard", icon: MastercardIcon },
    { label: "UPI", icon: UpiIcon },
    { label: "RuPay", icon: RupayIcon },
  ];

  return (
    <>
      <div className="relative  w-full  overflow-hidden h-52 sm:h-72 md:h-96 lg:h-120 xl:h-184 bg-neutral-100">
        <Image
          src="/images/footer-image.webp"
          alt="FUYL"
          fill
          className="object-contain md:object-cover object-center"
          sizes="100vw"
        />
      </div>
      <footer className="bg-neutral-100">
        <div className="container-brand py-16 grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="md:col-span-2">
            <p className="text-label text-brand-forest">Find us here</p>
            <div className="mt-4 flex flex-col items-start gap-1">
              <a
                href={`mailto:${SITE.email}`}
                className="flex min-h-6 items-center gap-2.5 py-2 text-body-xs text-brand-muted hover:text-brand-teal transition-colors"
              >
                <Mail size={15} className="shrink-0" />
                {SITE.email}
              </a>
              <a
                href={`tel:${SITE.phone}`}
                className="flex min-h-6 items-center gap-2.5 py-2 text-body-xs text-brand-muted hover:text-brand-teal transition-colors"
              >
                <Phone size={15} className="shrink-0" />
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
                  className="rounded-lg overflow-hidden transition-transform duration-200 hover:scale-110 hover:shadow-md"
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {/* Explore */}
          <div>
            <p className="text-label mb-4 text-brand-forest">Explore</p>
            <ul className="space-y-3">
              {FOOTER_LINKS.explore.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-body-sm text-brand-muted hover:text-brand-teal transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Discover */}
          <div>
            <p className="text-label mb-4 text-brand-forest">Discover</p>
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
                    className="text-body-sm text-brand-muted hover:text-brand-teal transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <p className="text-label mb-4 text-brand-forest">Support</p>
            <ul className="space-y-3">
              {FOOTER_LINKS.support.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-body-sm text-brand-muted hover:text-brand-teal transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-brand-border">
          <div className="container-brand py-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-body-xs text-brand-muted">
              © {new Date().getFullYear()} FUYL — {SITE.company}
            </p>
            <div className="flex items-center gap-2">
              {paymentMethods.map(({ label, icon: Icon }) => (
                <span
                  key={label}
                  role="img"
                  aria-label={label}
                  className="rounded-md overflow-hidden shadow-sm"
                >
                  <Icon />
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
