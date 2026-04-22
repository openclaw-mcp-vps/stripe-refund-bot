import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  AppDatabase,
  EmailIntegrationState,
  PaidCustomer,
  RefundAnalysis,
  RefundCase,
  RefundCaseStatus,
  RefundPolicy,
  StripeIntegrationState,
  StripeSnapshot
} from "@/lib/types";

const DATABASE_PATH = path.join(process.cwd(), "data", "database.json");

const defaultPolicy: RefundPolicy = {
  refundWindowDays: 30,
  maxAutoRefundAmountCents: 20_000,
  requireOrderIdentifier: false,
  blockHighRiskLanguage: true,
  blockedKeywords: ["chargeback", "lawsuit", "fraud", "bank dispute"],
  excludedProductKeywords: ["annual", "lifetime"],
  autoReplyTemplate:
    "Your refund has been processed. Depending on your bank, the funds should appear in 5-10 business days."
};

const defaultStripeIntegration: StripeIntegrationState = {
  connected: false,
  accountLabel: null,
  mode: "unknown",
  lastCheckedAt: null
};

const defaultEmailIntegration: EmailIntegrationState = {
  connected: false,
  provider: "custom",
  inboundAddress: "refunds@your-domain.com",
  lastWebhookAt: null
};

const defaultDatabase: AppDatabase = {
  policy: defaultPolicy,
  integrations: {
    stripe: defaultStripeIntegration,
    email: defaultEmailIntegration
  },
  refunds: [],
  paidCustomers: []
};

let writeQueue: Promise<void> = Promise.resolve();

async function ensureDatabaseFile(): Promise<void> {
  const dir = path.dirname(DATABASE_PATH);
  await mkdir(dir, { recursive: true });

  try {
    await readFile(DATABASE_PATH, "utf8");
  } catch {
    await writeFile(DATABASE_PATH, JSON.stringify(defaultDatabase, null, 2), "utf8");
  }
}

async function readDatabase(): Promise<AppDatabase> {
  await ensureDatabaseFile();
  const raw = await readFile(DATABASE_PATH, "utf8");

  try {
    const parsed = JSON.parse(raw) as AppDatabase;

    return {
      policy: {
        ...defaultPolicy,
        ...parsed.policy,
        blockedKeywords: parsed.policy?.blockedKeywords ?? defaultPolicy.blockedKeywords,
        excludedProductKeywords:
          parsed.policy?.excludedProductKeywords ?? defaultPolicy.excludedProductKeywords
      },
      integrations: {
        stripe: { ...defaultStripeIntegration, ...parsed.integrations?.stripe },
        email: { ...defaultEmailIntegration, ...parsed.integrations?.email }
      },
      refunds: parsed.refunds ?? [],
      paidCustomers: parsed.paidCustomers ?? []
    };
  } catch {
    return structuredClone(defaultDatabase);
  }
}

async function persistDatabase(db: AppDatabase): Promise<void> {
  await writeFile(DATABASE_PATH, JSON.stringify(db, null, 2), "utf8");
}

async function withWriteLock<T>(mutate: (db: AppDatabase) => Promise<T> | T): Promise<T> {
  const operation = writeQueue.then(async () => {
    const db = await readDatabase();
    const result = await mutate(db);
    await persistDatabase(db);
    return result;
  });

  writeQueue = operation.then(
    () => undefined,
    () => undefined
  );

  return operation;
}

export async function getPolicy(): Promise<RefundPolicy> {
  const db = await readDatabase();
  return db.policy;
}

export async function updatePolicy(nextPolicy: RefundPolicy): Promise<RefundPolicy> {
  return withWriteLock(async (db) => {
    db.policy = nextPolicy;
    return db.policy;
  });
}

export async function getRefundCaseById(caseId: string): Promise<RefundCase | null> {
  const db = await readDatabase();
  return db.refunds.find((item) => item.id === caseId) ?? null;
}

export async function listRefundCases(limit = 100): Promise<RefundCase[]> {
  const db = await readDatabase();
  return db.refunds
    .slice()
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, limit);
}

interface CreateRefundCaseInput {
  source: RefundCase["source"];
  senderEmail: string;
  subject: string;
  message: string;
  parsed: RefundCase["parsed"];
  analysis: RefundAnalysis;
  status: RefundCaseStatus;
  decisionReason: string;
  manualReviewRequired: boolean;
  stripe?: Partial<StripeSnapshot>;
}

export async function createRefundCase(input: CreateRefundCaseInput): Promise<RefundCase> {
  return withWriteLock(async (db) => {
    const now = new Date().toISOString();

    const created: RefundCase = {
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      source: input.source,
      status: input.status,
      decisionReason: input.decisionReason,
      manualReviewRequired: input.manualReviewRequired,
      senderEmail: input.senderEmail,
      subject: input.subject,
      message: input.message,
      parsed: input.parsed,
      analysis: input.analysis,
      stripe: {
        chargeId: input.stripe?.chargeId ?? null,
        paymentIntentId: input.stripe?.paymentIntentId ?? null,
        amountCents: input.stripe?.amountCents ?? null,
        amountRefundedCents: input.stripe?.amountRefundedCents ?? null,
        currency: input.stripe?.currency ?? null,
        purchasedAt: input.stripe?.purchasedAt ?? null,
        refundId: input.stripe?.refundId ?? null
      },
      processedAt: null,
      reviewedByHumanAt: null
    };

    db.refunds.push(created);
    return created;
  });
}

export async function updateRefundCase(
  caseId: string,
  patch: Partial<Omit<RefundCase, "id" | "createdAt" | "stripe">> & {
    stripe?: Partial<StripeSnapshot>;
  }
): Promise<RefundCase | null> {
  return withWriteLock(async (db) => {
    const index = db.refunds.findIndex((item) => item.id === caseId);

    if (index < 0) {
      return null;
    }

    const current = db.refunds[index];
    const mergedStripe = patch.stripe ? { ...current.stripe, ...patch.stripe } : current.stripe;

    const next: RefundCase = {
      ...current,
      ...patch,
      stripe: mergedStripe,
      updatedAt: new Date().toISOString()
    };

    db.refunds[index] = next;
    return next;
  });
}

export async function markPaidCustomer(
  email: string,
  source: PaidCustomer["source"],
  checkoutSessionId: string | null
): Promise<PaidCustomer> {
  return withWriteLock(async (db) => {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = db.paidCustomers.find((item) => item.email === normalizedEmail);

    if (existing) {
      existing.checkoutSessionId = checkoutSessionId ?? existing.checkoutSessionId;
      return existing;
    }

    const created: PaidCustomer = {
      email: normalizedEmail,
      source,
      checkoutSessionId,
      createdAt: new Date().toISOString()
    };

    db.paidCustomers.push(created);
    return created;
  });
}

export async function hasPaidCustomer(email: string): Promise<boolean> {
  const db = await readDatabase();
  const normalizedEmail = email.trim().toLowerCase();
  return db.paidCustomers.some((item) => item.email === normalizedEmail);
}

export async function updateStripeIntegration(
  patch: Partial<StripeIntegrationState>
): Promise<StripeIntegrationState> {
  return withWriteLock(async (db) => {
    db.integrations.stripe = {
      ...db.integrations.stripe,
      ...patch,
      lastCheckedAt: new Date().toISOString()
    };

    return db.integrations.stripe;
  });
}

export async function updateEmailIntegration(
  patch: Partial<EmailIntegrationState>
): Promise<EmailIntegrationState> {
  return withWriteLock(async (db) => {
    db.integrations.email = {
      ...db.integrations.email,
      ...patch,
      connected: true
    };

    return db.integrations.email;
  });
}

export async function recordEmailWebhookHit(): Promise<void> {
  await withWriteLock(async (db) => {
    db.integrations.email.lastWebhookAt = new Date().toISOString();
    db.integrations.email.connected = true;
  });
}

export async function recordRefundFromStripeWebhook(
  chargeId: string,
  refundId: string,
  amountRefundedCents: number
): Promise<void> {
  await withWriteLock(async (db) => {
    const target = db.refunds.find((item) => item.stripe.chargeId === chargeId);

    if (!target) {
      return;
    }

    target.status = "refunded";
    target.decisionReason = "Stripe webhook confirmed refund completion.";
    target.stripe.refundId = refundId;
    target.stripe.amountRefundedCents = amountRefundedCents;
    target.processedAt = new Date().toISOString();
    target.updatedAt = new Date().toISOString();
  });
}

export async function getDashboardState() {
  const db = await readDatabase();
  const refunds = db.refunds
    .slice()
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 50);

  const totals = refunds.reduce(
    (acc, item) => {
      acc.total += 1;

      if (item.status === "refunded") {
        acc.refunded += 1;
        acc.refundedCents += item.stripe.amountRefundedCents ?? item.stripe.amountCents ?? 0;
      }

      if (item.status === "needs_review") {
        acc.needsReview += 1;
      }

      if (item.status === "rejected") {
        acc.rejected += 1;
      }

      return acc;
    },
    {
      total: 0,
      refunded: 0,
      needsReview: 0,
      rejected: 0,
      refundedCents: 0
    }
  );

  return {
    policy: db.policy,
    integrations: db.integrations,
    refunds,
    metrics: {
      totalRequests: totals.total,
      autoRefunded: totals.refunded,
      pendingReview: totals.needsReview,
      rejected: totals.rejected,
      refundedUsd: Number((totals.refundedCents / 100).toFixed(2))
    }
  };
}
