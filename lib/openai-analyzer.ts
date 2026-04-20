import OpenAI from "openai";
import { z } from "zod";
import type { PurchaseVerificationResult } from "@/lib/stripe-client";
import type { RefundAnalysis } from "@/lib/types";

const analysisSchema = z.object({
  verdict: z.enum(["approve", "reject", "needs_human"]),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(10),
  riskFlags: z.array(z.string()).max(8)
});

function heuristicAnalysis(input: {
  subject: string;
  body: string;
  purchase: PurchaseVerificationResult;
}): RefundAnalysis {
  const text = `${input.subject}\n${input.body}`.toLowerCase();
  const mentionsChargeback = text.includes("chargeback") || text.includes("bank dispute") || text.includes("fraud");
  const abusiveTone = text.includes("scam") || text.includes("lawyer") || text.includes("reporting you");

  if (!input.purchase.purchaseFound) {
    return {
      verdict: "needs_human",
      confidence: 0.25,
      rationale: "No purchase was found in Stripe for this email, so a human should confirm account ownership before refunding.",
      riskFlags: ["purchase_not_found"]
    };
  }

  if (!input.purchase.withinPolicy) {
    return {
      verdict: "reject",
      confidence: 0.8,
      rationale: "A valid purchase exists but falls outside the configured refund window.",
      riskFlags: ["outside_policy_window"]
    };
  }

  if (mentionsChargeback || abusiveTone) {
    return {
      verdict: "needs_human",
      confidence: 0.7,
      rationale: "Message includes high-risk language that warrants manual review before issuing funds.",
      riskFlags: ["escalated_tone"]
    };
  }

  return {
    verdict: "approve",
    confidence: 0.9,
    rationale: "Purchase exists, request is within policy, and no elevated fraud markers were found.",
    riskFlags: []
  };
}

export async function analyzeRefundLegitimacy(input: {
  customerEmail: string;
  subject: string;
  body: string;
  purchase: PurchaseVerificationResult;
}): Promise<RefundAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return heuristicAnalysis(input);
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You evaluate SaaS refund requests. Return JSON with verdict (approve|reject|needs_human), confidence (0-1), rationale, and riskFlags array. Approve only when purchase exists and policy window is valid."
        },
        {
          role: "user",
          content: JSON.stringify({
            customerEmail: input.customerEmail,
            subject: input.subject,
            body: input.body,
            stripePurchaseCheck: input.purchase
          })
        }
      ]
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return heuristicAnalysis(input);
    }

    const parsed = analysisSchema.safeParse(JSON.parse(content));
    if (!parsed.success) {
      return heuristicAnalysis(input);
    }

    return parsed.data;
  } catch {
    return heuristicAnalysis(input);
  }
}
