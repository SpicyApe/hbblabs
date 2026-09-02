import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Fraunces, IBM_Plex_Mono } from "next/font/google";
import { brand } from "@/lib/brand";
import "./globals.css";

/*
 * Three families, three jobs:
 *   Jakarta  — UI and body. Geometric, slightly warm, holds up small.
 *   Fraunces — display. Carries the serif half of the headline pairing.
 *   Plex Mono — lab-record voice: batch codes, sequences, CAS numbers.
 */
const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(`https://${brand.domain}`),
  title: {
    default: `${brand.name} — Research-Grade Peptides`,
    template: `%s | ${brand.name}`,
  },
  description: brand.tagline,
  robots: {
    index: true,
    follow: true,
    // Cart and checkout have nothing to index and leak order state into search.
    nocache: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
