import { NextResponse } from "next/server";
import { z } from "zod";
import { getPolicy, updatePolicy } from "@/lib/database";
import { hasAccessCookie } from "@/lib/access";

const policySchema = z.object({
  refundWindowDays: z.number().int().min(1).max(120),
  maxAutoRefundAmountCents: z.number().int().min(100),
  requireOrderIdentifier: z.boolean(),
  blockHighRiskLanguage: z.boolean(),
  blockedKeywords: z.array(z.string()).min(1),
  excludedProductKeywords: z.array(z.string()),
  autoReplyTemplate: z.string().min(16)
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const hasAccess = await hasAccessCookie();

  if (!hasAccess) {
    return NextResponse.json(
      {
        error: "Unauthorized"
      },
      {
        status: 401
      }
    );
  }

  const policy = await getPolicy();
  return NextResponse.json({ policy });
}

export async function POST(request: Request) {
  const hasAccess = await hasAccessCookie();

  if (!hasAccess) {
    return NextResponse.json(
      {
        error: "Unauthorized"
      },
      {
        status: 401
      }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = policySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid policy payload",
        details: parsed.error.flatten()
      },
      {
        status: 400
      }
    );
  }

  const policy = await updatePolicy(parsed.data);
  return NextResponse.json({ policy });
}
