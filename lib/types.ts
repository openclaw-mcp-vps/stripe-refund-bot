export type AnalysisVerdict = "approve" | "reject" | "needs_human";

export type RefundStatus =
  | "pending"
  | "needs_human"
  | "processing"
  | "refunded"
  | "rejected"
  | "failed";

export type RefundAnalysis = {
  verdict: AnalysisVerdict;
  confidence: number;
  rationale: string;
  riskFlags: string[];
};

export type PurchaseCheck = {
  purchaseFound: boolean;
  withinPolicy: boolean;
  policyDays: number;
  reason: string;
  amountCents: number | null;
  currency: string | null;
  purchasedAt: string | null;
};

export type RefundRequest = {
  id: string;
  source: string;
  messageId: string | null;
  customerEmail: string;
  subject: string;
  body: string;
  reasonSummary: string;
  status: RefundStatus;
  chargeId: string | null;
  paymentIntentId: string | null;
  analysis: RefundAnalysis;
  purchase: PurchaseCheck;
  refundId: string | null;
  refundFailureReason: string | null;
  responseDraft: string | null;
  responseSentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AccessGrant = {
  email: string;
  grantedAt: string;
  source: "lemonsqueezy_webhook" | "manual";
  orderId: string | null;
  eventName: string | null;
};

export type EventLogEntry = {
  id: string;
  source: "stripe" | "lemonsqueezy" | "email" | "system";
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type AppDatabase = {
  refundRequests: RefundRequest[];
  accessGrants: AccessGrant[];
  eventLog: EventLogEntry[];
};
