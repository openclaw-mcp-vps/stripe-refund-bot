"use client";

import { useState, useTransition } from "react";
import type { RefundCase } from "@/lib/types";

interface RefundQueueProps {
  initialCases: RefundCase[];
}

type QueueAction = "refresh" | "approve" | "force-approve" | "reject" | "needs-review";

export default function RefundQueue({ initialCases }: RefundQueueProps) {
  const [queue, setQueue] = useState<RefundCase[]>(initialCases);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>("");

  const refreshQueue = () => {
    startTransition(async () => {
      const response = await fetch("/api/refunds/queue", {
        method: "GET"
      });

      if (!response.ok) {
        setMessage("Unable to refresh queue.");
        return;
      }

      const payload = (await response.json()) as { refunds: RefundCase[] };
      setQueue(payload.refunds);
      setMessage("Queue refreshed.");
    });
  };

  const actOnCase = (caseId: string, action: QueueAction) => {
    setMessage("");

    startTransition(async () => {
      if (action === "refresh") {
        refreshQueue();
        return;
      }

      if (action === "approve" || action === "force-approve") {
        const response = await fetch("/api/refunds/process", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ caseId, force: action === "force-approve" })
        });

        if (!response.ok) {
          setMessage("Could not process refund. Check Stripe configuration.");
          return;
        }
      } else {
        const status = action === "reject" ? "rejected" : "needs_review";

        const response = await fetch("/api/refunds/queue", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            caseId,
            status,
            note:
              status === "rejected"
                ? "Marked as rejected by operator."
                : "Marked for manual review by operator."
          })
        });

        if (!response.ok) {
          setMessage("Unable to update queue item.");
          return;
        }
      }

      const next = await fetch("/api/refunds/queue");
      const payload = (await next.json()) as { refunds: RefundCase[] };
      setQueue(payload.refunds);
      setMessage("Queue updated.");
    });
  };

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Refund Queue</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Process validated refunds instantly or route edge cases to manual review.
          </p>
        </div>
        <button
          type="button"
          onClick={() => actOnCase("", "refresh")}
          className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-4 py-2 text-sm font-semibold transition hover:border-[var(--accent)]"
        >
          Refresh Queue
        </button>
      </div>

      {message ? <p className="mt-4 text-sm text-[var(--text-muted)]">{message}</p> : null}

      <div className="mt-5 grid gap-4">
        {queue.length === 0 ? (
          <p className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-4 py-3 text-sm text-[var(--text-muted)]">
            No refund requests yet. Send a webhook payload to `/api/email/webhook` to test intake.
          </p>
        ) : (
          queue.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-[var(--text-muted)]">{new Date(item.createdAt).toLocaleString()}</p>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                    item.status === "refunded"
                      ? "bg-[rgba(46,160,67,0.2)] text-[var(--accent)]"
                      : item.status === "needs_review"
                        ? "bg-[rgba(252,196,25,0.2)] text-[#f9d56e]"
                        : item.status === "rejected"
                          ? "bg-[rgba(248,81,73,0.18)] text-[var(--danger)]"
                          : "bg-[rgba(99,110,123,0.2)] text-[var(--text-muted)]"
                  }`}
                >
                  {item.status.replace("_", " ")}
                </span>
              </div>

              <h3 className="mt-3 text-lg font-semibold">{item.subject}</h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">From: {item.senderEmail}</p>
              <p className="mt-3 text-sm text-[var(--text-muted)]">{item.decisionReason}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => actOnCase(item.id, "approve")}
                  disabled={isPending || item.status === "refunded"}
                  className="rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-[var(--primary-contrast)] disabled:opacity-60"
                >
                  Process Refund
                </button>
                <button
                  type="button"
                  onClick={() => actOnCase(item.id, "force-approve")}
                  disabled={isPending || item.status === "refunded"}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-xs font-semibold disabled:opacity-60"
                >
                  Force Refund
                </button>
                <button
                  type="button"
                  onClick={() => actOnCase(item.id, "needs-review")}
                  disabled={isPending}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-xs font-semibold disabled:opacity-60"
                >
                  Mark Review
                </button>
                <button
                  type="button"
                  onClick={() => actOnCase(item.id, "reject")}
                  disabled={isPending}
                  className="rounded-lg border border-[var(--danger)] bg-[rgba(248,81,73,0.12)] px-3 py-2 text-xs font-semibold text-[var(--danger)] disabled:opacity-60"
                >
                  Reject
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
