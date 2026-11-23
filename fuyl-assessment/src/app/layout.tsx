import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AmbientBackground } from "@/components/motion/AmbientBackground";
import { MotionProvider } from "@/components/motion/MotionProvider";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Find Your FUYL Match", template: "%s · FUYL Assessment" },
  description:
    "A 3-minute personalised wellness assessment that shows how FUYL COMPLETE+ fits your body, lifestyle and goals.",
  icons: { icon: "/favicon-white.webp" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#12291f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={`${inter.variable} h-full antialiased`}>
      <body className="relative isolate flex min-h-dvh flex-col">
        <AmbientBackground />
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
