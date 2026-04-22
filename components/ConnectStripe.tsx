import type { StripeIntegrationState } from "@/lib/types";

interface ConnectStripeProps {
  integration: StripeIntegrationState;
}

export default function ConnectStripe({ integration }: ConnectStripeProps) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Stripe Connection</h2>
          <p className="mt-2 max-w-md text-sm text-[var(--text-muted)]">
            Refund automation needs a valid `STRIPE_SECRET_KEY` and a Stripe webhook endpoint at
            `/api/stripe/webhook`.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
            integration.connected
              ? "bg-[rgba(46,160,67,0.2)] text-[var(--accent)]"
              : "bg-[rgba(248,81,73,0.18)] text-[var(--danger)]"
          }`}
        >
          {integration.connected ? `Connected (${integration.mode})` : "Not Connected"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 text-sm text-[var(--text-muted)]">
        <p>
          <span className="text-[var(--text)]">Account:</span> {integration.accountLabel ?? "Unavailable"}
        </p>
        <p>
          <span className="text-[var(--text)]">Publishable key:</span>{" "}
          {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? "Configured" : "Missing"}
        </p>
        <p>
          <span className="text-[var(--text)]">Last checked:</span> {integration.lastCheckedAt ?? "Never"}
        </p>
      </div>

      <form action="/api/integrations/stripe" method="post" className="mt-5">
        <button
          type="submit"
          className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-4 py-2 text-sm font-semibold transition hover:border-[var(--accent)]"
        >
          Validate Stripe Connection
        </button>
      </form>
    </section>
  );
}
