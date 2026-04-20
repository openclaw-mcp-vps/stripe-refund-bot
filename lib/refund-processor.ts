import nodemailer from "nodemailer";
import { z } from "zod";
import { analyzeRefundLegitimacy } from "@/lib/openai-analyzer";
import {
  appendEventLog,
  createRefundRequest,
  getRefundRequestById,
  listRefundRequests,
  updateRefundRequest
} from "@/lib/db";
import { extractEmailAddress } from "@/lib/email-monitor";
import { issueStripeRefund, verifyRefundEligibility } from "@/lib/stripe-client";
import type { RefundRequest, RefundStatus } from "@/lib/types";

const inboundEmailSchema = z.object({
  source: z.string().default("inbound_webhook"),
  from: z.string().min(3),
  subject: z.string().min(3),
  body: z.string().min(10),
  messageId: z.string().optional().nullable()
});

type InboundEmail = z.infer<typeof inboundEmailSchema>;

function summarizeReason(body: string): string {
  const normalized = body.replace(/\s+/g, " ").trim();
  if (normalized.length <= 180) {
    return normalized;
  }
  return `${normalized.slice(0, 177)}...`;
}

function shouldAutoRefund(status: RefundStatus, confidence: number): boolean {
  const enabled = (process.env.AUTO_REFUND_ENABLED ?? "true").toLowerCase() === "true";
  return enabled && status === "pending" && confidence >= 0.85;
}

function buildApprovalReply(request: RefundRequest): string {
  return [
    `Hi ${request.customerEmail.split("@")[0]},`,
    "",
    "Thanks for writing in. We approved your refund request and have processed the refund to your original payment method.",
    "",
    "Most banks show the credit within 5-10 business days.",
    "",
    "If anything looks off, reply to this email and we will investigate immediately.",
    "",
    "Best,",
    "Support"
  ].join("\n");
}

function buildRejectionReply(request: RefundRequest): string {
  return [
    `Hi ${request.customerEmail.split("@")[0]},`,
    "",
    "Thanks for reaching out. We reviewed the request and could not approve a refund based on our current refund policy.",
    "",
    `Reason: ${request.purchase.reason}`,
    "",
    "If you believe this is incorrect, reply with more context and we can manually review it.",
    "",
    "Best,",
    "Support"
  ].join("\n");
}

async function sendReplyIfConfigured(params: {
  to: string;
  subject: string;
  body: string;
}) {
  const host = process.env.SMTP_HOST;
  const port = Number.parseInt(process.env.SMTP_PORT ?? "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !user || !pass || !from) {
    return false;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    }
  });

  await transporter.sendMail({
    from,
    to: params.to,
    subject: params.subject,
    text: params.body
  });

  return true;
}

async function settleRefund(request: RefundRequest) {
  if (!request.chargeId) {
    throw new Error("No charge ID found for this request.");
  }

  const refundResult = await issueStripeRefund({
    chargeId: request.chargeId,
    amountCents: request.purchase.amountCents,
    metadata: {
      refund_request_id: request.id,
      source: request.source
    }
  });

  const reply = buildApprovalReply(request);
  const sent = await sendReplyIfConfigured({
    to: request.customerEmail,
    subject: "Your refund has been processed",
    body: reply
  });

  const updated = await updateRefundRequest(request.id, (current) => ({
    ...current,
    status: "refunded",
    refundId: refundResult.refundId,
    refundFailureReason: null,
    responseDraft: reply,
    responseSentAt: sent ? new Date().toISOString() : null
  }));

  await appendEventLog({
    source: "system",
    eventType: "refund.processed",
    payload: {
      refundRequestId: request.id,
      refundId: refundResult.refundId,
      sendEmail: sent
    }
  });

  return updated;
}

export async function processInboundRefundEmail(input: unknown) {
  const payload = inboundEmailSchema.parse(input) as InboundEmail;
  const customerEmail = extractEmailAddress(payload.from);

  if (!customerEmail) {
    throw new Error("Customer email address could not be parsed.");
  }

  const purchase = await verifyRefundEligibility(customerEmail);
  const analysis = await analyzeRefundLegitimacy({
    customerEmail,
    subject: payload.subject,
    body: payload.body,
    purchase
  });

  let status: RefundStatus = "pending";

  if (!purchase.purchaseFound || analysis.verdict === "needs_human") {
    status = "needs_human";
  } else if (analysis.verdict === "reject") {
    status = "rejected";
  } else if (!purchase.withinPolicy) {
    status = "needs_human";
  }

  const request = await createRefundRequest({
    source: payload.source,
    messageId: payload.messageId ?? null,
    customerEmail,
    subject: payload.subject,
    body: payload.body,
    reasonSummary: summarizeReason(payload.body),
    status,
    chargeId: purchase.chargeId,
    paymentIntentId: purchase.paymentIntentId,
    analysis,
    purchase: {
      purchaseFound: purchase.purchaseFound,
      withinPolicy: purchase.withinPolicy,
      policyDays: purchase.policyDays,
      reason: purchase.reason,
      amountCents: purchase.amountCents,
      currency: purchase.currency,
      purchasedAt: purchase.purchasedAt
    }
  });

  await appendEventLog({
    source: "email",
    eventType: "email.processed",
    payload: {
      refundRequestId: request.id,
      verdict: analysis.verdict,
      confidence: analysis.confidence,
      status,
      customerEmail
    }
  });

  if (status === "rejected") {
    const rejection = buildRejectionReply(request);
    const sent = await sendReplyIfConfigured({
      to: request.customerEmail,
      subject: "Update on your refund request",
      body: rejection
    });

    await updateRefundRequest(request.id, (current) => ({
      ...current,
      responseDraft: rejection,
      responseSentAt: sent ? new Date().toISOString() : null
    }));

    return {
      requestId: request.id,
      status,
      verdict: analysis.verdict
    };
  }

  if (shouldAutoRefund(status, analysis.confidence)) {
    await updateRefundRequest(request.id, (current) => ({
      ...current,
      status: "processing"
    }));

    try {
      await settleRefund(request);
      return {
        requestId: request.id,
        status: "refunded",
        verdict: analysis.verdict
      };
    } catch (error) {
      await updateRefundRequest(request.id, (current) => ({
        ...current,
        status: "failed",
        refundFailureReason: error instanceof Error ? error.message : "Refund failed"
      }));

      return {
        requestId: request.id,
        status: "failed",
        verdict: analysis.verdict
      };
    }
  }

  return {
    requestId: request.id,
    status,
    verdict: analysis.verdict
  };
}

export async function approveRefundRequest(refundRequestId: string) {
  const request = await getRefundRequestById(refundRequestId);
  if (!request) {
    throw new Error("Refund request not found.");
  }

  if (request.status === "refunded") {
    return request;
  }

  await updateRefundRequest(refundRequestId, (current) => ({
    ...current,
    status: "processing",
    refundFailureReason: null
  }));

  try {
    const settled = await settleRefund(request);
    if (!settled) {
      throw new Error("Unable to store refund result.");
    }
    return settled;
  } catch (error) {
    const failed = await updateRefundRequest(refundRequestId, (current) => ({
      ...current,
      status: "failed",
      refundFailureReason: error instanceof Error ? error.message : "Refund failed"
    }));

    if (!failed) {
      throw error;
    }

    return failed;
  }
}

export async function getRefundQueueData() {
  const items = await listRefundRequests(200);

  return {
    items,
    summary: {
      pending: items.filter((item) => item.status === "pending").length,
      needsHuman: items.filter((item) => item.status === "needs_human").length,
      refunded: items.filter((item) => item.status === "refunded").length,
      failed: items.filter((item) => item.status === "failed").length
    }
  };
}
