import { analyzeRefundRequest } from "@/lib/ai-analyzer";
import {
  createRefundCase,
  getPolicy,
  getRefundCaseById,
  updateRefundCase
} from "@/lib/database";
import { parseRefundEmailPayload } from "@/lib/email-parser";
import { assessRefundEligibility, createStripeRefund } from "@/lib/stripe";
import type { RefundCase } from "@/lib/types";

export async function ingestRefundEmail(payload: unknown): Promise<{
  accepted: boolean;
  caseId: string | null;
  reason: string;
}> {
  const parsed = parseRefundEmailPayload(payload);

  if (!parsed) {
    return {
      accepted: false,
      caseId: null,
      reason: "Email payload did not match expected schema."
    };
  }

  const policy = await getPolicy();
  const analysis = await analyzeRefundRequest(parsed, policy);

  const createdCase = await createRefundCase({
    source: "email_webhook",
    senderEmail: parsed.senderEmail,
    subject: parsed.subject,
    message: parsed.messageText,
    parsed,
    analysis,
    status: "queued",
    decisionReason: "Queued for automated policy checks.",
    manualReviewRequired: false,
    stripe: {
      chargeId: parsed.stripeChargeId,
      paymentIntentId: parsed.paymentIntentId
    }
  });

  if (analysis.classification !== "refund_request") {
    await updateRefundCase(createdCase.id, {
      status: "rejected",
      decisionReason: "Message was classified as non-refund intent.",
      manualReviewRequired: false
    });

    return {
      accepted: false,
      caseId: createdCase.id,
      reason: "Message was not classified as a refund request."
    };
  }

  if (analysis.recommendedAction === "reject") {
    await updateRefundCase(createdCase.id, {
      status: "rejected",
      decisionReason: analysis.rationale,
      manualReviewRequired: false
    });

    return {
      accepted: false,
      caseId: createdCase.id,
      reason: "AI policy analysis recommended rejection."
    };
  }

  if (analysis.recommendedAction === "manual_review" || analysis.riskFlags.length > 0) {
    await updateRefundCase(createdCase.id, {
      status: "needs_review",
      decisionReason: analysis.rationale,
      manualReviewRequired: true
    });

    return {
      accepted: true,
      caseId: createdCase.id,
      reason: "Refund request queued for human review based on AI risk flags."
    };
  }

  const processed = await processRefundCase(createdCase.id, false);

  return {
    accepted: processed.status === "refunded",
    caseId: processed.id,
    reason: processed.decisionReason
  };
}

export async function processRefundCase(caseId: string, forceManualApproval: boolean): Promise<RefundCase> {
  const currentCase = await getRefundCaseById(caseId);

  if (!currentCase) {
    throw new Error(`Refund case ${caseId} not found.`);
  }

  if (currentCase.status === "refunded") {
    return currentCase;
  }

  await updateRefundCase(caseId, {
    status: "processing",
    decisionReason: "Verifying purchase and applying refund policy checks..."
  });

  const policy = await getPolicy();
  const eligibility = await assessRefundEligibility(currentCase.parsed, policy);

  if (!eligibility.charge || !eligibility.eligible) {
    const rejected = await updateRefundCase(caseId, {
      status: eligibility.requiresManualReview ? "needs_review" : "rejected",
      decisionReason: eligibility.reason,
      manualReviewRequired: eligibility.requiresManualReview,
      stripe: {
        chargeId: eligibility.charge?.id ?? currentCase.stripe.chargeId,
        amountCents: eligibility.charge?.amount ?? currentCase.stripe.amountCents,
        amountRefundedCents:
          eligibility.charge?.amount_refunded ?? currentCase.stripe.amountRefundedCents,
        currency: eligibility.charge?.currency ?? currentCase.stripe.currency,
        purchasedAt: eligibility.charge
          ? new Date(eligibility.charge.created * 1000).toISOString()
          : currentCase.stripe.purchasedAt
      }
    });

    if (!rejected) {
      throw new Error(`Unable to update refund case ${caseId}.`);
    }

    return rejected;
  }

  if ((eligibility.requiresManualReview || currentCase.analysis.recommendedAction === "manual_review") && !forceManualApproval) {
    const manualReviewCase = await updateRefundCase(caseId, {
      status: "needs_review",
      decisionReason: eligibility.reason,
      manualReviewRequired: true,
      stripe: {
        chargeId: eligibility.charge.id,
        paymentIntentId: (eligibility.charge.payment_intent as string | null) ??
          currentCase.stripe.paymentIntentId,
        amountCents: eligibility.charge.amount,
        amountRefundedCents: eligibility.charge.amount_refunded,
        currency: eligibility.charge.currency,
        purchasedAt: new Date(eligibility.charge.created * 1000).toISOString()
      }
    });

    if (!manualReviewCase) {
      throw new Error(`Unable to update refund case ${caseId}.`);
    }

    return manualReviewCase;
  }

  try {
    const refund = await createStripeRefund(
      eligibility.charge.id,
      eligibility.amountToRefundCents ?? eligibility.charge.amount,
      caseId
    );

    const refundedCase = await updateRefundCase(caseId, {
      status: "refunded",
      processedAt: new Date().toISOString(),
      manualReviewRequired: false,
      decisionReason: "Refund issued successfully through Stripe.",
      stripe: {
        chargeId: eligibility.charge.id,
        paymentIntentId:
          (eligibility.charge.payment_intent as string | null) ??
          currentCase.stripe.paymentIntentId,
        amountCents: eligibility.charge.amount,
        amountRefundedCents: refund.amount,
        currency: refund.currency,
        purchasedAt: new Date(eligibility.charge.created * 1000).toISOString(),
        refundId: refund.refundId
      }
    });

    if (!refundedCase) {
      throw new Error(`Unable to finalize refund case ${caseId}.`);
    }

    return refundedCase;
  } catch (error) {
    const failedCase = await updateRefundCase(caseId, {
      status: "failed",
      manualReviewRequired: true,
      decisionReason:
        error instanceof Error
          ? `Stripe refund call failed: ${error.message}`
          : "Stripe refund call failed for an unknown reason."
    });

    if (!failedCase) {
      throw new Error(`Unable to update failed case ${caseId}.`);
    }

    return failedCase;
  }
}
