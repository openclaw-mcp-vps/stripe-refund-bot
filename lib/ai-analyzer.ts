import OpenAI from "openai";
import { z } from "zod";
import type { ParsedRefundRequest, RefundAnalysis, RefundPolicy } from "@/lib/types";

const aiSchema = z.object({
  classification: z.enum(["refund_request", "not_refund", "unclear"]),
  confidence: z.number().min(0).max(1),
  summary: z.string().min(8),
  rationale: z.string().min(8),
  riskFlags: z.array(z.string()),
  recommendedAction: z.enum(["auto_refund", "manual_review", "reject"])
});

let cachedClient: OpenAI | null = null;

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = new OpenAI({ apiKey });
  }

  return cachedClient;
}

function heuristicAnalysis(parsed: ParsedRefundRequest, policy: RefundPolicy): RefundAnalysis {
  const text = `${parsed.subject} ${parsed.messageText}`.toLowerCase();
  const riskFlags: string[] = [];

  if (!parsed.isLikelyRefundRequest) {
    return {
      classification: "not_refund",
      confidence: 0.88,
      summary: "Message is unlikely to be a refund request.",
      rationale: "No refund intent keywords were detected in the message body or subject line.",
      riskFlags,
      recommendedAction: "reject"
    };
  }

  if (policy.blockHighRiskLanguage) {
    for (const keyword of policy.blockedKeywords) {
      if (text.includes(keyword.toLowerCase())) {
        riskFlags.push(`Risk keyword detected: ${keyword}`);
      }
    }
  }

  if (policy.requireOrderIdentifier && !parsed.orderId && !parsed.stripeChargeId && !parsed.paymentIntentId) {
    riskFlags.push("Order identifier missing");
  }

  if (parsed.requestedAmountCents && parsed.requestedAmountCents > policy.maxAutoRefundAmountCents) {
    riskFlags.push("Requested amount exceeds auto-refund threshold");
  }

  const recommendedAction = riskFlags.length > 0 ? "manual_review" : "auto_refund";

  return {
    classification: "refund_request",
    confidence: riskFlags.length > 0 ? 0.74 : 0.93,
    summary:
      recommendedAction === "auto_refund"
        ? "Clear refund intent with low risk indicators."
        : "Refund intent is clear, but manual review is safer due to policy/risk triggers.",
    rationale:
      recommendedAction === "auto_refund"
        ? "The message asks for a refund and does not trigger policy risk keywords."
        : "Policy constraints or risk terms were triggered and require human approval.",
    riskFlags,
    recommendedAction
  };
}

export async function analyzeRefundRequest(
  parsed: ParsedRefundRequest,
  policy: RefundPolicy
): Promise<RefundAnalysis> {
  const fallback = heuristicAnalysis(parsed, policy);
  const client = getClient();

  if (!client) {
    return fallback;
  }

  try {
    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: [
        {
          role: "system",
          content:
            "You are a refund operations analyst. Return strict JSON that classifies refund intent and policy risk."
        },
        {
          role: "user",
          content: JSON.stringify({
            message: parsed,
            policy
          })
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "refund_analysis",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              classification: {
                type: "string",
                enum: ["refund_request", "not_refund", "unclear"]
              },
              confidence: { type: "number", minimum: 0, maximum: 1 },
              summary: { type: "string" },
              rationale: { type: "string" },
              riskFlags: {
                type: "array",
                items: { type: "string" }
              },
              recommendedAction: {
                type: "string",
                enum: ["auto_refund", "manual_review", "reject"]
              }
            },
            required: [
              "classification",
              "confidence",
              "summary",
              "rationale",
              "riskFlags",
              "recommendedAction"
            ]
          }
        }
      }
    });

    const raw = response.output_text?.trim();

    if (!raw) {
      return fallback;
    }

    const candidate = JSON.parse(raw);
    return aiSchema.parse(candidate);
  } catch (error) {
    console.error("ai-analysis-fallback", error);
    return fallback;
  }
}
