import { NextResponse } from "next/server";
import { z } from "zod";
import { approveRefundRequest } from "@/lib/refund-processor";

const approveSchema = z.object({
  refundRequestId: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const body = approveSchema.parse(await request.json());
    const updated = await approveRefundRequest(body.refundRequestId);

    return NextResponse.json({
      success: true,
      message: updated.status === "refunded" ? "Refund approved and processed." : "Refund approval completed.",
      item: updated
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to approve refund."
      },
      { status: 400 }
    );
  }
}
