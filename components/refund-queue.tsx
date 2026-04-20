"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Loader2, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type QueueItem = {
  id: string;
  customerEmail: string;
  subject: string;
  reasonSummary: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  analysis: {
    verdict: "approve" | "reject" | "needs_human";
    confidence: number;
    rationale: string;
    riskFlags: string[];
  };
  purchase: {
    purchaseFound: boolean;
    withinPolicy: boolean;
    amountCents: number | null;
    currency: string | null;
  };
};

type QueueResponse = {
  success: boolean;
  items: QueueItem[];
  summary: {
    pending: number;
    needsHuman: number;
    refunded: number;
    failed: number;
  };
};

function statusVariant(status: string): "default" | "success" | "warning" | "danger" {
  if (status === "refunded") {
    return "success";
  }
  if (status === "failed") {
    return "danger";
  }
  if (status === "needs_human" || status === "pending") {
    return "warning";
  }
  return "default";
}

function formatAmount(amountCents: number | null, currency: string | null): string {
  if (amountCents == null || !currency) {
    return "n/a";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase()
  }).format(amountCents / 100);
}

export function RefundQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [summary, setSummary] = useState<QueueResponse["summary"]>({ pending: 0, needsHuman: 0, refunded: 0, failed: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [approveLoadingId, setApproveLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/refunds/queue", { cache: "no-store" });
      const payload = (await response.json()) as QueueResponse;

      if (!response.ok || !payload.success) {
        setError("Unable to load queue.");
        return;
      }

      setItems(payload.items);
      setSummary(payload.summary);
    } catch {
      setError("Unable to load queue.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      void refresh();
    }, 25000);
    return () => clearInterval(timer);
  }, [refresh]);

  const actionable = useMemo(
    () => items.filter((item) => item.status === "pending" || item.status === "needs_human" || item.status === "failed"),
    [items]
  );

  async function approve(id: string) {
    setApproveLoadingId(id);
    try {
      const response = await fetch("/api/refunds/approve", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ refundRequestId: id })
      });

      if (!response.ok) {
        setError("Approval failed. Check Stripe credentials and request details.");
      }
      await refresh();
    } catch {
      setError("Approval failed. Check Stripe credentials and request details.");
    } finally {
      setApproveLoadingId(null);
    }
  }

  return (
    <Card className="border-white/10 bg-[#111826]/90">
      <CardHeader>
        <CardTitle className="text-xl">Refund Queue</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-xs sm:grid-cols-4">
          <div className="rounded-lg border border-white/10 bg-[#0d1523] p-3">Pending: <span className="font-semibold">{summary.pending}</span></div>
          <div className="rounded-lg border border-white/10 bg-[#0d1523] p-3">Needs human: <span className="font-semibold">{summary.needsHuman}</span></div>
          <div className="rounded-lg border border-white/10 bg-[#0d1523] p-3">Refunded: <span className="font-semibold">{summary.refunded}</span></div>
          <div className="rounded-lg border border-white/10 bg-[#0d1523] p-3">Failed: <span className="font-semibold">{summary.failed}</span></div>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0d1523] p-4 text-sm text-[#9fb2c8]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading refund queue...
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        ) : null}

        {items.length === 0 && !isLoading ? (
          <div className="rounded-xl border border-white/10 bg-[#0d1523] p-4 text-sm text-[#9fb2c8]">
            No refund requests yet. Send a test request from the Email Intake card.
          </div>
        ) : null}

        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-white/10 bg-[#0d1523] p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-[#e6edf3]">{item.subject}</p>
                  <p className="text-xs text-[#93a9bf]">{item.customerEmail}</p>
                </div>
                <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
              </div>

              <div className="mt-3 grid gap-2 text-xs text-[#a8bdd2] sm:grid-cols-2">
                <p>
                  <Clock3 className="mr-1 inline h-3.5 w-3.5" />
                  Created: {new Date(item.createdAt).toLocaleString()}
                </p>
                <p>
                  Amount: {formatAmount(item.purchase.amountCents, item.purchase.currency)}
                </p>
                <p>
                  <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
                  AI verdict: {item.analysis.verdict} ({Math.round(item.analysis.confidence * 100)}%)
                </p>
                <p>
                  Purchase checks: {item.purchase.purchaseFound ? "found" : "not found"} / {item.purchase.withinPolicy ? "within policy" : "outside policy"}
                </p>
              </div>

              <p className="mt-2 text-sm text-[#c0d1e2]">{item.reasonSummary}</p>
              <p className="mt-1 text-xs text-[#8fa6be]">{item.analysis.rationale}</p>

              {item.analysis.riskFlags.length > 0 ? (
                <p className="mt-2 text-xs text-amber-200">
                  <ShieldAlert className="mr-1 inline h-3.5 w-3.5" />
                  Flags: {item.analysis.riskFlags.join(", ")}
                </p>
              ) : null}

              {actionable.find((entry) => entry.id === item.id) ? (
                <div className="mt-3 flex gap-2">
                  <Button
                    onClick={() => approve(item.id)}
                    disabled={approveLoadingId === item.id}
                    className="bg-emerald-400 text-black hover:bg-emerald-300"
                  >
                    {approveLoadingId === item.id ? "Approving..." : "Approve & Refund"}
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
