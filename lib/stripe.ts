import Stripe from "stripe";
import type { ParsedRefundRequest, RefundPolicy } from "@/lib/types";

let stripeClient: Stripe | null = null;

function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;

  if (!key) {
    return null;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }

  return stripeClient;
}

export async function checkStripeConnection(): Promise<{
  connected: boolean;
  mode: "test" | "live" | "unknown";
  accountLabel: string | null;
}> {
  const stripe = getStripeClient();

  if (!stripe) {
    return {
      connected: false,
      mode: "unknown",
      accountLabel: null
    };
  }

  try {
    const balance = await stripe.balance.retrieve();
    return {
      connected: true,
      mode: balance.livemode ? "live" : "test",
      accountLabel: "Stripe API key verified"
    };
  } catch (error) {
    console.error("stripe-connect-check-failed", error);
    return {
      connected: false,
      mode: "unknown",
      accountLabel: null
    };
  }
}

async function findChargeByEmail(
  stripe: Stripe,
  senderEmail: string,
  orderId?: string | null
): Promise<Stripe.Charge | null> {
  const charges = await stripe.charges.list({ limit: 100 });
  const targetEmail = senderEmail.toLowerCase();

  const filtered = charges.data.filter((charge) => {
    const billingEmail = charge.billing_details?.email?.toLowerCase();
    const receiptEmail = charge.receipt_email?.toLowerCase();
    const emailMatches = billingEmail === targetEmail || receiptEmail === targetEmail;

    if (!emailMatches) {
      return false;
    }

    if (!orderId) {
      return true;
    }

    const metadataBlob = JSON.stringify(charge.metadata).toLowerCase();
    return metadataBlob.includes(orderId.toLowerCase()) || (charge.description ?? "").toLowerCase().includes(orderId.toLowerCase());
  });

  filtered.sort((a, b) => b.created - a.created);
  return filtered[0] ?? null;
}

async function resolveCharge(stripe: Stripe, parsed: ParsedRefundRequest): Promise<Stripe.Charge | null> {
  if (parsed.stripeChargeId) {
    try {
      return await stripe.charges.retrieve(parsed.stripeChargeId);
    } catch {
      return null;
    }
  }

  if (parsed.paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(parsed.paymentIntentId, {
        expand: ["latest_charge"]
      });

      if (typeof paymentIntent.latest_charge === "string") {
        return await stripe.charges.retrieve(paymentIntent.latest_charge);
      }

      return (paymentIntent.latest_charge as Stripe.Charge | null) ?? null;
    } catch {
      return null;
    }
  }

  return findChargeByEmail(stripe, parsed.senderEmail, parsed.orderId);
}

export interface EligibilityResult {
  eligible: boolean;
  requiresManualReview: boolean;
  reason: string;
  amountToRefundCents: number | null;
  charge: Stripe.Charge | null;
}

export async function assessRefundEligibility(
  parsed: ParsedRefundRequest,
  policy: RefundPolicy
): Promise<EligibilityResult> {
  const stripe = getStripeClient();

  if (!stripe) {
    return {
      eligible: false,
      requiresManualReview: true,
      reason: "Stripe secret key is missing. Add STRIPE_SECRET_KEY before automating refunds.",
      amountToRefundCents: null,
      charge: null
    };
  }

  const charge = await resolveCharge(stripe, parsed);

  if (!charge) {
    return {
      eligible: false,
      requiresManualReview: true,
      reason: "No matching Stripe charge was found for this request.",
      amountToRefundCents: null,
      charge: null
    };
  }

  if (!charge.paid) {
    return {
      eligible: false,
      requiresManualReview: true,
      reason: "Charge exists but is not in a paid state.",
      amountToRefundCents: null,
      charge
    };
  }

  const chargeAgeDays = (Date.now() - charge.created * 1000) / (1000 * 60 * 60 * 24);

  if (chargeAgeDays > policy.refundWindowDays) {
    return {
      eligible: false,
      requiresManualReview: false,
      reason: `Purchase is outside the ${policy.refundWindowDays}-day refund window.`,
      amountToRefundCents: null,
      charge
    };
  }

  const alreadyRefunded = charge.amount_refunded;
  const remainingCents = Math.max(charge.amount - alreadyRefunded, 0);

  if (remainingCents <= 0) {
    return {
      eligible: false,
      requiresManualReview: false,
      reason: "Charge has already been fully refunded.",
      amountToRefundCents: 0,
      charge
    };
  }

  const requestedAmountCents = parsed.requestedAmountCents ?? remainingCents;
  const amountToRefundCents = Math.min(requestedAmountCents, remainingCents);

  const descriptor = `${charge.description ?? ""} ${JSON.stringify(charge.metadata)}`.toLowerCase();
  const excludedProductMatched = policy.excludedProductKeywords.some((keyword) =>
    descriptor.includes(keyword.toLowerCase())
  );

  if (excludedProductMatched) {
    return {
      eligible: true,
      requiresManualReview: true,
      reason: "Charge appears to include an excluded product keyword.",
      amountToRefundCents,
      charge
    };
  }

  if (amountToRefundCents > policy.maxAutoRefundAmountCents) {
    return {
      eligible: true,
      requiresManualReview: true,
      reason: "Requested amount is above your auto-refund threshold.",
      amountToRefundCents,
      charge
    };
  }

  return {
    eligible: true,
    requiresManualReview: false,
    reason: "Refund request satisfies policy checks and charge verification.",
    amountToRefundCents,
    charge
  };
}

export async function createStripeRefund(
  chargeId: string,
  amountToRefundCents: number,
  caseId: string
): Promise<{ refundId: string; amount: number; currency: string }> {
  const stripe = getStripeClient();

  if (!stripe) {
    throw new Error("Stripe client not available. Set STRIPE_SECRET_KEY.");
  }

  const refund = await stripe.refunds.create(
    {
      charge: chargeId,
      amount: amountToRefundCents,
      reason: "requested_by_customer",
      metadata: {
        refund_case_id: caseId,
        source: "stripe-refund-bot"
      }
    },
    {
      idempotencyKey: `refund-case-${caseId}`
    }
  );

  return {
    refundId: refund.id,
    amount: refund.amount,
    currency: refund.currency
  };
}

export async function verifyPaidCheckoutForEmail(
  email: string
): Promise<{ paid: boolean; checkoutSessionId: string | null }> {
  const stripe = getStripeClient();

  if (!stripe) {
    return { paid: false, checkoutSessionId: null };
  }

  const sessions = await stripe.checkout.sessions.list({ limit: 100 });
  const normalizedEmail = email.trim().toLowerCase();

  const match = sessions.data.find((session) => {
    const sessionEmail = (session.customer_details?.email ?? session.customer_email ?? "").toLowerCase();
    return session.payment_status === "paid" && sessionEmail === normalizedEmail;
  });

  return {
    paid: Boolean(match),
    checkoutSessionId: match?.id ?? null
  };
}

export function getStripeWebhookClient(): Stripe | null {
  return getStripeClient();
}
