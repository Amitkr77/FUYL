import Image from "next/image";
import Link from "next/link";

export function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-4 pt-5 sm:px-6 sm:pt-7">
      <Link href="/" aria-label="FUYL assessment home" className="rounded-lg">
        <Image src="/logo.webp" alt="FUYL" width={84} height={34} className="h-7 w-auto sm:h-8" priority />
      </Link>
      {children}
    </header>
  );
}
