import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Work_Sans } from "next/font/google";
import "./globals.css";
import { siteUrl } from "@/lib/site";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
});

// Server-rendered pages call the Render API, which can take up to ~60s to wake on the free tier.
export const maxDuration = 60;

// Public pages read live data (menu, settings, promotions) from the API, so render them
// per request instead of at build time. Otherwise `next build` on Vercel fails whenever
// the Render API is asleep, not deployed yet, or BACKEND_URL is wrong.
export const dynamic = "force-dynamic";

const SITE_NAME = "Rock n Logs";
const SITE_DESCRIPTION =
  "Rock n Logs is a neighborhood bistro serving seasonal plates, wood-fired mains, and a warm room for regulars and first-timers alike.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${SITE_NAME} — Neighborhood Bistro`,
    // Sub-pages set title: "Menu" etc.; this renders "Menu | Rock n Logs".
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    title: `${SITE_NAME} — Neighborhood Bistro`,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: `${SITE_NAME} — Neighborhood Bistro`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${workSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
