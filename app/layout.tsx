import type { Metadata } from "next";
import { Fraunces, Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap"
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap"
});

const siteName = "Stripe Refund Bot";
const siteDescription =
  "AI assistant that reads refund requests in your inbox, verifies Stripe purchases against policy, and auto-processes safe refunds.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://stripe-refund-bot.example.com"),
  title: {
    default: `${siteName} — AI Inbox Refund Automation`,
    template: `%s | ${siteName}`
  },
  description: siteDescription,
  keywords: [
    "stripe refunds",
    "refund automation",
    "email automation",
    "saas operations",
    "fintech automation"
  ],
  openGraph: {
    title: `${siteName} — AI Inbox Refund Automation`,
    description: siteDescription,
    siteName,
    type: "website",
    url: "/"
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} — AI Inbox Refund Automation`,
    description: siteDescription
  },
  alternates: {
    canonical: "/"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${spaceGrotesk.variable} ${fraunces.variable}`}>{children}</body>
    </html>
  );
}
