import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { processInboundRefundEmail } from "@/lib/refund-processor";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const result = await processInboundRefundEmail(body);

    return NextResponse.json({
      success: true,
      message: "Refund request processed.",
      refundRequestId: result.requestId,
      status: result.status,
      verdict: result.verdict
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid payload.",
          issues: error.issues
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to process refund request."
      },
      { status: 500 }
    );
  }
}
