import type { EmailIntegrationState } from "@/lib/types";

interface ConnectEmailProps {
  integration: EmailIntegrationState;
}

const providerOptions: Array<EmailIntegrationState["provider"]> = [
  "gmail_forwarding",
  "sendgrid",
  "postmark",
  "custom"
];

export default function ConnectEmail({ integration }: ConnectEmailProps) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Email Intake</h2>
          <p className="mt-2 max-w-md text-sm text-[var(--text-muted)]">
            Forward refund emails from your support inbox to `/api/email/webhook`. Every message gets
            parsed, risk-scored, and routed to automation or review.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
            integration.connected
              ? "bg-[rgba(46,160,67,0.2)] text-[var(--accent)]"
              : "bg-[rgba(248,81,73,0.18)] text-[var(--danger)]"
          }`}
        >
          {integration.connected ? "Connected" : "Not Connected"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 text-sm text-[var(--text-muted)]">
        <p>
          <span className="text-[var(--text)]">Provider:</span> {integration.provider}
        </p>
        <p>
          <span className="text-[var(--text)]">Inbound mailbox:</span> {integration.inboundAddress}
        </p>
        <p>
          <span className="text-[var(--text)]">Last webhook hit:</span> {integration.lastWebhookAt ?? "Never"}
        </p>
      </div>

      <form action="/api/integrations/email" method="post" className="mt-5 grid gap-3">
        <label className="text-sm">
          Provider
          <select
            name="provider"
            defaultValue={integration.provider}
            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2 text-sm"
          >
            {providerOptions.map((provider) => (
              <option key={provider} value={provider}>
                {provider}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          Inbound address
          <input
            name="inboundAddress"
            type="email"
            required
            defaultValue={integration.inboundAddress}
            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2 text-sm"
          />
        </label>

        <button
          type="submit"
          className="w-fit rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-4 py-2 text-sm font-semibold transition hover:border-[var(--accent)]"
        >
          Save Email Settings
        </button>
      </form>
    </section>
  );
}
