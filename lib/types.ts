export type RefundCaseStatus =
  | "queued"
  | "processing"
  | "refunded"
  | "needs_review"
  | "rejected"
  | "failed";

export interface RefundPolicy {
  refundWindowDays: number;
  maxAutoRefundAmountCents: number;
  requireOrderIdentifier: boolean;
  blockHighRiskLanguage: boolean;
  blockedKeywords: string[];
  excludedProductKeywords: string[];
  autoReplyTemplate: string;
}

export interface ParsedRefundRequest {
  messageId: string;
  receivedAt: string;
  senderEmail: string;
  subject: string;
  messageText: string;
  orderId: string | null;
  stripeChargeId: string | null;
  paymentIntentId: string | null;
  requestedAmountCents: number | null;
  reason: string | null;
  isLikelyRefundRequest: boolean;
}

export interface RefundAnalysis {
  classification: "refund_request" | "not_refund" | "unclear";
  confidence: number;
  summary: string;
  rationale: string;
  riskFlags: string[];
  recommendedAction: "auto_refund" | "manual_review" | "reject";
}

export interface StripeSnapshot {
  chargeId: string | null;
  paymentIntentId: string | null;
  amountCents: number | null;
  amountRefundedCents: number | null;
  currency: string | null;
  purchasedAt: string | null;
  refundId: string | null;
}

export interface RefundCase {
  id: string;
  createdAt: string;
  updatedAt: string;
  source: "email_webhook" | "manual";
  status: RefundCaseStatus;
  decisionReason: string;
  manualReviewRequired: boolean;
  senderEmail: string;
  subject: string;
  message: string;
  parsed: ParsedRefundRequest;
  analysis: RefundAnalysis;
  stripe: StripeSnapshot;
  processedAt: string | null;
  reviewedByHumanAt: string | null;
}

export interface StripeIntegrationState {
  connected: boolean;
  accountLabel: string | null;
  mode: "test" | "live" | "unknown";
  lastCheckedAt: string | null;
}

export interface EmailIntegrationState {
  connected: boolean;
  provider: "gmail_forwarding" | "sendgrid" | "postmark" | "custom";
  inboundAddress: string;
  lastWebhookAt: string | null;
}

export interface IntegrationState {
  stripe: StripeIntegrationState;
  email: EmailIntegrationState;
}

export interface PaidCustomer {
  email: string;
  source: "stripe_webhook" | "stripe_lookup";
  checkoutSessionId: string | null;
  createdAt: string;
}

export interface AppDatabase {
  policy: RefundPolicy;
  integrations: IntegrationState;
  refunds: RefundCase[];
  paidCustomers: PaidCustomer[];
}
