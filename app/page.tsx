import Link from "next/link";
import Script from "next/script";
import { ArrowRight, Bot, MailCheck, ShieldCheck, Wallet } from "lucide-react";
import { PurchaseAccess } from "@/components/purchase-access";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLemonCheckoutUrl } from "@/lib/lemonsqueezy";

const faqs = [
  {
    question: "How does the bot decide whether a refund is legitimate?",
    answer:
      "It combines policy checks (purchase exists, window valid, prior refund history) with an AI analysis of the customer email. High-confidence approvals can auto-refund, while ambiguous requests are routed to your queue."
  },
  {
    question: "Can I keep final control over refunds?",
    answer:
      "Yes. You can require human approval for every refund, or only for low-confidence and policy-edge cases."
  },
  {
    question: "Does this support Stripe subscriptions and one-time charges?",
    answer:
      "Yes. The Stripe integration validates either payment source and returns the exact charge data needed to issue a compliant refund."
  },
  {
    question: "How quickly can I be live?",
    answer:
      "Most founders are processing real requests in under 30 minutes by forwarding refund emails to the app and adding Stripe keys."
  }
];

const pricing = [
  {
    name: "Starter",
    price: "$25",
    period: "/month",
    volume: "Up to 100 refunds/month",
    points: [
      "Inbox-driven refund triage",
      "Stripe legitimacy checks",
      "AI-written reply drafts",
      "Human approval queue"
    ]
  },
  {
    name: "Growth",
    price: "$79",
    period: "/month",
    volume: "Up to 500 refunds/month",
    points: [
      "Everything in Starter",
      "Auto-approval thresholds",
      "Priority processing",
      "Weekly operations insights"
    ]
  }
];

export default function HomePage() {
  const checkoutUrl = getLemonCheckoutUrl();

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-10 sm:px-10">
      <Script src="https://app.lemonsqueezy.com/js/lemon.js" strategy="lazyOnload" />

      <section className="rounded-3xl border border-white/10 bg-[#111826]/90 p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_30px_100px_rgba(0,0,0,0.45)] sm:p-12">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <Badge className="border-amber-400/40 bg-amber-500/20 text-amber-200">fintech-automation</Badge>
          <Badge className="border-cyan-400/40 bg-cyan-500/15 text-cyan-200">email-first workflow</Badge>
          <Badge className="border-emerald-400/40 bg-emerald-500/15 text-emerald-200">human-in-loop safety</Badge>
        </div>

        <h1 className="max-w-4xl text-4xl font-extrabold leading-tight sm:text-6xl">
          Stripe Refund Bot
          <span className="mt-1 block text-2xl text-[#9fb2c8] sm:text-3xl">
            AI assistant that handles refund requests in your inbox
          </span>
        </h1>

        <p className="mt-6 max-w-3xl text-lg text-[#c8d6e5]">
          Every refund request costs 10–15 minutes of founder attention. Stripe Refund Bot reads incoming requests,
          confirms the purchase and policy window, drafts the exact reply, and issues refunds when confidence is high.
          Edge cases are queued for your one-click approval.
        </p>

        <div className="mt-8 grid gap-3 text-sm text-[#aabed4] sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">30 refunds/month at 10 minutes each is roughly 5 founder hours recovered.</div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">Built for SaaS founders at $5k+ MRR with recurring refund load.</div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">Auditable actions, webhook event log, and policy-aware decisions.</div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg" className="bg-amber-500 text-black hover:bg-amber-400">
            <Link href="/dashboard">
              Open Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-white/20 bg-transparent hover:bg-white/5">
            <a href="#pricing">See Pricing</a>
          </Button>
        </div>
      </section>

      <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-white/10 bg-[#10151f]/95">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><MailCheck className="h-4 w-4 text-cyan-300" />Inbox ingestion</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[#9fb2c8]">Capture refund emails from Gmail API, IMAP, or forwarder webhook.</CardContent>
        </Card>
        <Card className="border-white/10 bg-[#10151f]/95">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-emerald-300" />Legitimacy checks</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[#9fb2c8]">Verify Stripe purchase, policy window, and fraud signals before action.</CardContent>
        </Card>
        <Card className="border-white/10 bg-[#10151f]/95">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Wallet className="h-4 w-4 text-amber-300" />Automated refunds</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[#9fb2c8]">Issue Stripe refunds instantly for high-confidence requests.</CardContent>
        </Card>
        <Card className="border-white/10 bg-[#10151f]/95">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Bot className="h-4 w-4 text-fuchsia-300" />Human-in-loop</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[#9fb2c8]">Ambiguous cases are queued with rationale and recommended next action.</CardContent>
        </Card>
      </section>

      <section className="mt-12 rounded-3xl border border-white/10 bg-[#111826]/80 p-8">
        <h2 className="text-2xl font-bold sm:text-3xl">Why founders buy this</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Card className="border-white/10 bg-black/20">
            <CardHeader><CardTitle className="text-lg">Problem</CardTitle></CardHeader>
            <CardContent className="text-sm text-[#b3c2d4]">Refund requests hit your inbox at random times, forcing context switches and manual Stripe checks.</CardContent>
          </Card>
          <Card className="border-white/10 bg-black/20">
            <CardHeader><CardTitle className="text-lg">Solution</CardTitle></CardHeader>
            <CardContent className="text-sm text-[#b3c2d4]">One webhook pipeline analyzes each request, verifies Stripe facts, and routes to auto-refund or approval queue.</CardContent>
          </Card>
          <Card className="border-white/10 bg-black/20">
            <CardHeader><CardTitle className="text-lg">Outcome</CardTitle></CardHeader>
            <CardContent className="text-sm text-[#b3c2d4]">You handle exceptions only. Routine refunds become a background process with traceable decisions.</CardContent>
          </Card>
        </div>
      </section>

      <section id="pricing" className="mt-12">
        <div className="mb-5 flex items-end justify-between gap-3">
          <h2 className="text-2xl font-bold sm:text-3xl">Pricing</h2>
          <span className="text-sm text-[#a8bdd3]">Cancel anytime</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {pricing.map((plan) => (
            <Card key={plan.name} className="border-white/10 bg-[#10151f]/95">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-xl">
                  {plan.name}
                  <span className="text-sm text-[#9fb2c8]">{plan.volume}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold">
                  {plan.price}
                  <span className="text-base font-medium text-[#9fb2c8]">{plan.period}</span>
                </p>
                <ul className="mt-4 space-y-2 text-sm text-[#c1d2e6]">
                  {plan.points.map((point) => (
                    <li key={point}>• {point}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6 sm:p-8">
        <h2 className="text-2xl font-bold sm:text-3xl">Unlock the refund dashboard</h2>
        <p className="mt-2 max-w-3xl text-sm text-[#cfdced]">
          Pay once via Lemon Squeezy checkout. After payment, use the same billing email to unlock your dashboard with a secure access cookie.
        </p>
        <PurchaseAccess checkoutUrl={checkoutUrl} />
      </section>

      <section className="mt-12 rounded-3xl border border-white/10 bg-[#10151f]/90 p-8">
        <h2 className="text-2xl font-bold sm:text-3xl">FAQ</h2>
        <div className="mt-6 space-y-4">
          {faqs.map((faq) => (
            <Card key={faq.question} className="border-white/10 bg-black/20">
              <CardHeader>
                <CardTitle className="text-base">{faq.question}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-[#b7cadf]">{faq.answer}</CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
