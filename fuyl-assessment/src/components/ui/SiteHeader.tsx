import Image from "next/image";
import Link from "next/link";

export function SiteHeader({ children, wide = false }: { children?: React.ReactNode; wide?: boolean }) {
  return (
    <header className={`relative z-10 mx-auto flex w-full items-center justify-between px-4 pt-5 sm:pt-7 ${wide ? "max-w-[1400px] lg:px-8" : "max-w-5xl sm:px-6"}`}>
      <Link href="/" aria-label="FUYL assessment home" className="rounded-lg">
        <Image src="/logo.webp" alt="FUYL" width={84} height={34} className="h-7 w-auto sm:h-8" priority />
      </Link>
      {children}
    </header>
  );
}
