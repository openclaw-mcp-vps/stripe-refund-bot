"use client";

import { useState } from "react";
import { AlertCircle, Mail, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ProcessResult = {
  success: boolean;
  refundRequestId?: string;
  status?: string;
  verdict?: string;
  message?: string;
};

export function EmailSetup() {
  const [from, setFrom] = useState("customer@example.com");
  const [subject, setSubject] = useState("Refund request for last invoice");
  const [body, setBody] = useState(
    "Hi team, I was charged yesterday and realized this tool does not fit our workflow. Can I get a full refund?"
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);

  async function submitTestEmail() {
    setIsProcessing(true);
    setResult(null);

    try {
      const response = await fetch("/api/email/process", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ from, subject, body, source: "dashboard_test" })
      });

      const payload = (await response.json()) as ProcessResult;
      setResult(payload);
    } catch {
      setResult({ success: false, message: "Email simulation failed. Check server logs." });
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Card className="h-fit border-white/10 bg-[#111826]/90">
      <CardHeader>
        <CardTitle className="text-xl">Email Intake Setup</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-white/15 bg-[#0d1523] p-4 text-sm text-[#a9bfd4]">
          <p className="font-semibold text-[#dbe8f5]">Connect inbox in production:</p>
          <ul className="mt-2 space-y-1">
            <li>1. Forward refund emails to your ingestion endpoint.</li>
            <li>2. Or run IMAP polling with `lib/email-monitor.ts` on a worker.</li>
            <li>3. Send parsed email payloads to `/api/email/process`.</li>
          </ul>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[#dbe8f5]" htmlFor="from">
            Customer email
          </label>
          <Input id="from" value={from} onChange={(event) => setFrom(event.target.value)} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[#dbe8f5]" htmlFor="subject">
            Subject
          </label>
          <Input id="subject" value={subject} onChange={(event) => setSubject(event.target.value)} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[#dbe8f5]" htmlFor="body">
            Email body
          </label>
          <Textarea id="body" value={body} onChange={(event) => setBody(event.target.value)} />
        </div>

        <Button onClick={submitTestEmail} disabled={isProcessing} className="w-full bg-cyan-400 text-black hover:bg-cyan-300">
          <Send className="h-4 w-4" />
          {isProcessing ? "Processing..." : "Process Test Refund Email"}
        </Button>

        {result ? (
          <div className="space-y-2 rounded-xl border border-white/15 bg-[#0d1523] p-3 text-sm">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-[#dfeaf7]">Processing result</p>
              <Badge variant={result.success ? "success" : "danger"}>{result.success ? "Success" : "Failed"}</Badge>
            </div>
            <p className="text-[#9db4ca]">{result.message ?? "Request handled."}</p>
            {result.refundRequestId ? <p className="text-[#9db4ca]">Queue ID: {result.refundRequestId}</p> : null}
            {result.verdict ? <p className="text-[#9db4ca]">AI verdict: {result.verdict}</p> : null}
            {result.status ? <p className="text-[#9db4ca]">Status: {result.status}</p> : null}
          </div>
        ) : null}

        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Stripe keys are required for real purchase verification and refund execution. Without keys, requests are queued for manual review.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#8ea5bd]">
          <Mail className="h-3.5 w-3.5" />
          API endpoint for inbound mail: <code>/api/email/process</code>
        </div>
      </CardContent>
    </Card>
  );
}
