import type { Metadata } from "next";
import "./globals.css";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://stripe-refund-bot.com";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "Stripe Refund Bot | AI assistant for email refund workflows",
  description:
    "Stripe Refund Bot handles refund requests from your inbox, verifies policy and purchase validity, issues refunds, and drafts customer replies.",
  keywords: [
    "stripe refunds",
    "refund automation",
    "email automation",
    "saas operations",
    "customer support ai",
    "fintech automation"
  ],
  openGraph: {
    title: "Stripe Refund Bot",
    description:
      "AI agent for Stripe refund requests: parse inbox emails, verify policy, issue refunds, and queue risky cases for human approval.",
    url: baseUrl,
    siteName: "Stripe Refund Bot",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Stripe Refund Bot dashboard preview"
      }
    ],
    locale: "en_US",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Stripe Refund Bot",
    description:
      "Turn refund emails into approved Stripe actions with AI verification and human-in-loop controls.",
    images: ["/og-image.svg"]
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
