import Stripe from "stripe";
import { getRefundPolicyDays, isWithinRefundPolicy } from "@/lib/policy";

let stripeClient: Stripe | null | undefined;

function getStripeClientInstance(): Stripe | null {
  if (stripeClient !== undefined) {
    return stripeClient;
  }

  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    stripeClient = null;
    return stripeClient;
  }

  stripeClient = new Stripe(apiKey);
  return stripeClient;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type PurchaseVerificationResult = {
  purchaseFound: boolean;
  withinPolicy: boolean;
  policyDays: number;
  reason: string;
  chargeId: string | null;
  paymentIntentId: string | null;
  amountCents: number | null;
  currency: string | null;
  purchasedAt: string | null;
};

export async function verifyRefundEligibility(email: string): Promise<PurchaseVerificationResult> {
  const stripe = getStripeClientInstance();
  const policyDays = getRefundPolicyDays();

  if (!stripe) {
    return {
      purchaseFound: false,
      withinPolicy: false,
      policyDays,
      reason: "Stripe key missing. Provide STRIPE_SECRET_KEY.",
      chargeId: null,
      paymentIntentId: null,
      amountCents: null,
      currency: null,
      purchasedAt: null
    };
  }

  const normalizedEmail = normalizeEmail(email);
  let foundCharge: Stripe.Charge | null = null;
  let startingAfter: string | undefined;

  for (let page = 0; page < 5; page += 1) {
    const response = await stripe.charges.list({
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {})
    });

    const match = response.data
      .filter((charge) => {
        const chargeEmail = charge.billing_details.email?.toLowerCase();
        return chargeEmail === normalizedEmail && charge.paid;
      })
      .sort((a, b) => b.created - a.created)[0];

    if (match) {
      foundCharge = match;
      break;
    }

    const last = response.data.at(-1);
    if (!response.has_more || !last) {
      break;
    }

    startingAfter = last.id;
  }

  if (!foundCharge) {
    return {
      purchaseFound: false,
      withinPolicy: false,
      policyDays,
      reason: "No Stripe charge found for this customer email.",
      chargeId: null,
      paymentIntentId: null,
      amountCents: null,
      currency: null,
      purchasedAt: null
    };
  }

  const purchasedAtDate = new Date(foundCharge.created * 1000);
  const withinPolicy = isWithinRefundPolicy(purchasedAtDate, policyDays);

  return {
    purchaseFound: true,
    withinPolicy,
    policyDays,
    reason: withinPolicy
      ? "Purchase found and eligible for policy window."
      : `Purchase found but outside ${policyDays}-day policy window.`,
    chargeId: foundCharge.id,
    paymentIntentId:
      typeof foundCharge.payment_intent === "string"
        ? foundCharge.payment_intent
        : foundCharge.payment_intent?.id ?? null,
    amountCents: foundCharge.amount,
    currency: foundCharge.currency,
    purchasedAt: purchasedAtDate.toISOString()
  };
}

export type StripeRefundResult = {
  refundId: string;
  status: string | null;
};

export async function issueStripeRefund(params: {
  chargeId: string;
  amountCents?: number | null;
  metadata?: Record<string, string>;
}): Promise<StripeRefundResult> {
  const stripe = getStripeClientInstance();
  if (!stripe) {
    throw new Error("Stripe key missing. Cannot create refund.");
  }

  const refund = await stripe.refunds.create({
    charge: params.chargeId,
    reason: "requested_by_customer",
    ...(typeof params.amountCents === "number" ? { amount: params.amountCents } : {}),
    ...(params.metadata ? { metadata: params.metadata } : {})
  });

  return {
    refundId: refund.id,
    status: refund.status
  };
}

export function getStripeClient() {
  return getStripeClientInstance();
}
