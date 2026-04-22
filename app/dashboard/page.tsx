import { hasAccessCookie } from "@/lib/access";
import { getDashboardState } from "@/lib/database";
import ConnectEmail from "@/components/ConnectEmail";
import ConnectStripe from "@/components/ConnectStripe";
import PolicySettings from "@/components/PolicySettings";
import RefundQueue from "@/components/RefundQueue";

export const dynamic = "force-dynamic";

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value);
}

export default async function DashboardPage() {
  const dashboard = await getDashboardState();
  const hasAccess = await hasAccessCookie();
  const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;

  if (!hasAccess) {
    return (
      <main className="min-h-screen bg-[var(--bg)] px-6 py-12 text-[var(--text)] md:px-10">
        <div className="mx-auto w-full max-w-3xl space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-8">
          <h1 className="text-3xl font-semibold">Dashboard Locked</h1>
          <p className="text-[var(--text-muted)]">
            This workflow is behind a paid access cookie. Complete checkout, then claim dashboard access
            with the same purchase email.
          </p>

          {paymentLink ? (
            <a
              href={paymentLink}
              className="inline-flex rounded-xl bg-[var(--primary)] px-5 py-3 font-semibold text-[var(--primary-contrast)] transition hover:brightness-110"
            >
              Buy Access on Stripe
            </a>
          ) : (
            <p className="rounded-xl border border-[var(--danger)] bg-[#2a1414] px-4 py-3 text-sm text-[#ffb4af]">
              Missing NEXT_PUBLIC_STRIPE_PAYMENT_LINK in environment variables.
            </p>
          )}

          <form action="/api/paywall/claim" method="post" className="grid gap-3">
            <label className="text-sm">
              Purchase email
              <input
                type="email"
                name="email"
                required
                placeholder="you@company.com"
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2"
              />
            </label>
            <button
              type="submit"
              className="w-fit rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-4 py-2 text-sm font-semibold transition hover:border-[var(--accent)]"
            >
              Claim Dashboard Access
            </button>
          </form>

          <p className="text-xs text-[var(--text-muted)]">
            Access is granted when your email is found in Stripe `checkout.session.completed` events.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] px-6 py-10 text-[var(--text)] md:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Refund Operations Dashboard</h1>
            <p className="mt-2 text-[var(--text-muted)]">
              AI-assisted refunds for Stripe purchases from your support inbox.
            </p>
          </div>
          <form action="/api/paywall/logout" method="post">
            <button
              type="submit"
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2 text-sm font-semibold"
            >
              Lock Dashboard
            </button>
          </form>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <article className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">Total Requests</p>
            <p className="mt-2 text-3xl font-semibold">{dashboard.metrics.totalRequests}</p>
          </article>
          <article className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">Auto Refunded</p>
            <p className="mt-2 text-3xl font-semibold">{dashboard.metrics.autoRefunded}</p>
          </article>
          <article className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">Needs Review</p>
            <p className="mt-2 text-3xl font-semibold">{dashboard.metrics.pendingReview}</p>
          </article>
          <article className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">Refunded Value</p>
            <p className="mt-2 text-3xl font-semibold">{formatUsd(dashboard.metrics.refundedUsd)}</p>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <ConnectStripe integration={dashboard.integrations.stripe} />
          <ConnectEmail integration={dashboard.integrations.email} />
        </section>

        <PolicySettings initialPolicy={dashboard.policy} />
        <RefundQueue initialCases={dashboard.refunds} />
      </div>
    </main>
  );
}
