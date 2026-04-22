import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { ParsedRefundRequest } from "@/lib/types";

const emailPayloadSchema = z
  .object({
    id: z.string().optional(),
    messageId: z.string().optional(),
    from: z.string().optional(),
    sender: z.string().optional(),
    subject: z.string().optional(),
    text: z.string().optional(),
    body: z.string().optional(),
    html: z.string().optional(),
    receivedAt: z.string().optional()
  })
  .passthrough();

const refundKeywords = [
  "refund",
  "money back",
  "cancel",
  "charged",
  "billing issue",
  "not working",
  "accidental"
];

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractEmailAddress(raw: string): string {
  const match = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0].toLowerCase() : "unknown@unknown.com";
}

function extractAmountCents(text: string): number | null {
  const moneyMatch = text.match(/\$\s?(\d+(?:\.\d{1,2})?)/);

  if (!moneyMatch) {
    return null;
  }

  const parsed = Number.parseFloat(moneyMatch[1]);

  if (Number.isNaN(parsed)) {
    return null;
  }

  return Math.round(parsed * 100);
}

function extractReason(text: string): string | null {
  const becauseMatch = text.match(/because\s+([^.!?\n]+)/i);

  if (becauseMatch?.[1]) {
    return becauseMatch[1].trim();
  }

  const dueToMatch = text.match(/due to\s+([^.!?\n]+)/i);
  return dueToMatch?.[1]?.trim() ?? null;
}

export function parseRefundEmailPayload(payload: unknown): ParsedRefundRequest | null {
  const parsed = emailPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    return null;
  }

  const source = parsed.data;
  const subject = source.subject?.trim() ?? "No subject";
  const from = source.from ?? source.sender ?? "unknown@unknown.com";
  const senderEmail = extractEmailAddress(from);

  const messageText =
    source.text?.trim() ?? source.body?.trim() ?? stripHtml(source.html ?? "") ?? "";

  const lowered = `${subject} ${messageText}`.toLowerCase();
  const isLikelyRefundRequest = refundKeywords.some((keyword) => lowered.includes(keyword));

  const orderIdMatch = lowered.match(/(?:order|receipt|invoice)\s*[#: -]*([a-z0-9_-]{4,40})/i);
  const chargeIdMatch = lowered.match(/(ch_[a-zA-Z0-9]{8,})/);
  const paymentIntentMatch = lowered.match(/(pi_[a-zA-Z0-9]{8,})/);

  return {
    messageId: source.messageId ?? source.id ?? randomUUID(),
    receivedAt: source.receivedAt ?? new Date().toISOString(),
    senderEmail,
    subject,
    messageText,
    orderId: orderIdMatch?.[1] ?? null,
    stripeChargeId: chargeIdMatch?.[1] ?? null,
    paymentIntentId: paymentIntentMatch?.[1] ?? null,
    requestedAmountCents: extractAmountCents(messageText),
    reason: extractReason(messageText),
    isLikelyRefundRequest
  };
}
