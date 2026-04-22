const faqItems = [
  {
    question: "How does Stripe Refund Bot decide whether to auto-refund?",
    answer:
      "Every request is checked against Stripe payment data, purchase timestamp, refund-window rules, and your high-risk keyword list. Only requests that pass all checks are auto-refunded."
  },
  {
    question: "What goes to manual review?",
    answer:
      "Anything outside policy: missing order references, high-dollar requests, keywords like chargeback/fraud, excluded products, or missing Stripe matches."
  },
  {
    question: "Do customers still get a human-sounding response?",
    answer:
      "Yes. The bot drafts a response with refund status and expected bank settlement timing. You can customize the tone and template in the dashboard."
  },
  {
    question: "Can I run this in test mode first?",
    answer:
      "Yes. Connect a Stripe test key, forward sample inbox events to the webhook endpoint, and validate end-to-end behavior before enabling production mode."
  }
];

const pricingTiers = [
  {
    name: "Starter",
    price: "$25/mo",
    description: "For founders handling refund operations themselves.",
    volume: "100 refunds/month",
    bullets: ["Stripe + inbox integration", "AI triage and policy checks", "Manual-review queue"]
  },
  {
    name: "Growth",
    price: "$79/mo",
    description: "For support-heavy SaaS teams with steady refund volume.",
    volume: "500 refunds/month",
    bullets: ["Everything in Starter", "Priority webhook processing", "Advanced policy controls"]
  }
];

export default function HomePage() {
  const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-20 pt-16 md:px-10 md:pt-24">
        <p className="inline-flex w-fit rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1 text-xs tracking-[0.16em] text-[var(--text-muted)] uppercase">
          Fintech Automation
        </p>

        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div className="space-y-6">
            <h1
              className="max-w-3xl text-4xl leading-tight font-semibold md:text-6xl"
              style={{ fontFamily: "var(--font-fraunces), serif" }}
            >
              Stripe Refund Bot handles refund requests in your inbox before they eat your weekend.
            </h1>
            <p className="max-w-2xl text-lg text-[var(--text-muted)] md:text-xl">
              Connect Stripe plus email. The assistant reads refund requests, confirms the purchase,
              validates policy, issues legitimate refunds, and drafts the customer reply. Edge cases are
              routed to your queue with full context.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              {paymentLink ? (
                <a
                  href={paymentLink}
                  className="rounded-xl bg-[var(--primary)] px-6 py-3 font-semibold text-[var(--primary-contrast)] transition hover:brightness-110"
                >
                  Buy Now on Stripe
                </a>
              ) : (
                <span className="rounded-xl border border-[var(--danger)] bg-[#2a1414] px-6 py-3 text-sm text-[#ffb4af]">
                  Add NEXT_PUBLIC_STRIPE_PAYMENT_LINK to enable checkout.
                </span>
              )}
              <a
                href="/dashboard"
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-6 py-3 font-semibold text-[var(--text)] transition hover:border-[var(--accent)]"
              >
                Open Dashboard
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
            <p className="text-sm text-[var(--text-muted)]">Founder math</p>
            <p className="mt-2 text-3xl font-semibold">5 hours/month saved</p>
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              Manual refunds average 10-15 minutes. At 30 requests/month, that is 300-450 minutes of
              repetitive ops work that can be automated.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3">
                <p className="text-[var(--text-muted)]">Ideal customer</p>
                <p className="mt-1 font-medium">SaaS founders, $5k+ MRR</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3">
                <p className="text-[var(--text-muted)]">Volume</p>
                <p className="mt-1 font-medium">20+ refunds/month</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[var(--border)] bg-[var(--bg-elevated)]">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-14 md:grid-cols-3 md:px-10">
          <article>
            <h2 className="text-xl font-semibold">The Problem</h2>
            <p className="mt-3 text-[var(--text-muted)]">
              Refund requests arrive across threads, formats, and urgency levels. Founders stop product work
              to verify orders, check policy windows, and reply manually.
            </p>
          </article>
          <article>
            <h2 className="text-xl font-semibold">The Solution</h2>
            <p className="mt-3 text-[var(--text-muted)]">
              Refund Bot standardizes every request into one queue, runs policy checks automatically,
              performs safe refunds, and leaves only ambiguous decisions for humans.
            </p>
          </article>
          <article>
            <h2 className="text-xl font-semibold">The Outcome</h2>
            <p className="mt-3 text-[var(--text-muted)]">
              Faster customer response times, consistent refund handling, and a support workflow that scales
              without hiring a full-time operator.
            </p>
          </article>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-16 md:px-10">
        <h2 className="text-3xl font-semibold" style={{ fontFamily: "var(--font-fraunces), serif" }}>
          Pricing
        </h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {pricingTiers.map((tier) => (
            <article
              key={tier.name}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6"
            >
              <p className="text-sm tracking-[0.08em] text-[var(--text-muted)] uppercase">{tier.name}</p>
              <p className="mt-3 text-4xl font-semibold">{tier.price}</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{tier.volume}</p>
              <p className="mt-4 text-sm text-[var(--text-muted)]">{tier.description}</p>
              <ul className="mt-4 space-y-2 text-sm text-[var(--text)]">
                {tier.bullets.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-24 md:px-10">
        <h2 className="text-3xl font-semibold" style={{ fontFamily: "var(--font-fraunces), serif" }}>
          FAQ
        </h2>
        <div className="mt-8 grid gap-4">
          {faqItems.map((item) => (
            <article key={item.question} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
              <h3 className="text-lg font-semibold">{item.question}</h3>
              <p className="mt-2 text-sm text-[var(--text-muted)]">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
