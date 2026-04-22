import { NextResponse } from "next/server";
import { z } from "zod";
import { hasAccessCookie } from "@/lib/access";
import { processRefundCase } from "@/lib/refund-workflow";

const processSchema = z.object({
  caseId: z.string().min(1),
  force: z.boolean().optional().default(false)
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const parsed = processSchema.safeParse(body);

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

  try {
    const updated = await processRefundCase(parsed.data.caseId, parsed.data.force);
    return NextResponse.json({ refund: updated });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to process refund"
      },
      {
        status: 500
      }
    );
  }
}
