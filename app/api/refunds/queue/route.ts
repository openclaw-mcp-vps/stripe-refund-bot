import { NextResponse } from "next/server";
import { z } from "zod";
import { hasAccessCookie } from "@/lib/access";
import { listRefundCases, updateRefundCase } from "@/lib/database";

const updateQueueSchema = z.object({
  caseId: z.string().min(1),
  status: z.enum(["queued", "needs_review", "rejected"]),
  note: z.string().min(4)
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

  const refunds = await listRefundCases(100);
  return NextResponse.json({ refunds });
}

export async function PATCH(request: Request) {
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
  const parsed = updateQueueSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        details: parsed.error.flatten()
      },
      {
        status: 400
      }
    );
  }

  const updated = await updateRefundCase(parsed.data.caseId, {
    status: parsed.data.status,
    decisionReason: parsed.data.note,
    manualReviewRequired: parsed.data.status === "needs_review",
    reviewedByHumanAt: new Date().toISOString()
  });

  if (!updated) {
    return NextResponse.json(
      {
        error: "Refund case not found"
      },
      {
        status: 404
      }
    );
  }

  return NextResponse.json({ refund: updated });
}
