import Link from "next/link";
import { Activity, ArrowLeft, Inbox, Workflow } from "lucide-react";
import { EmailSetup } from "@/components/email-setup";
import { RefundQueue } from "@/components/refund-queue";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-8 sm:px-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Badge className="border-emerald-400/30 bg-emerald-500/15 text-emerald-200">Dashboard Access Active</Badge>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Refund Operations Console</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#a9bcd1]">
            Monitor inbound refund requests, approve edge cases, and keep a complete action trail for Stripe and email responses.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-[#0f1622] px-4 py-2 text-sm font-medium text-[#d0e0f2] hover:bg-[#162034]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Site
        </Link>
      </div>

      <section className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card className="border-white/10 bg-[#111826]/90">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Inbox className="h-4 w-4 text-cyan-300" />Inbox Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[#9fb2c8]">Capture refund requests from forwarded emails or IMAP polling jobs.</CardContent>
        </Card>
        <Card className="border-white/10 bg-[#111826]/90">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Workflow className="h-4 w-4 text-amber-300" />Decision Engine</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[#9fb2c8]">AI verdicts combine policy checks and Stripe data to recommend action.</CardContent>
        </Card>
        <Card className="border-white/10 bg-[#111826]/90">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4 text-emerald-300" />Live Queue</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[#9fb2c8]">Approve uncertain requests in one click while safe cases can auto-refund.</CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <RefundQueue />
        <EmailSetup />
      </section>
    </main>
  );
}
