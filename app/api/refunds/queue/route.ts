import { NextResponse } from "next/server";
import { getRefundQueueData } from "@/lib/refund-processor";

export async function GET() {
  const data = await getRefundQueueData();

  return NextResponse.json({
    success: true,
    items: data.items,
    summary: data.summary
  });
}
