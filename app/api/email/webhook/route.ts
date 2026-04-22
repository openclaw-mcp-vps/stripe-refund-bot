import { NextResponse } from "next/server";
import { ingestRefundEmail } from "@/lib/refund-workflow";
import { recordEmailWebhookHit } from "@/lib/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const webhookSecret = process.env.EMAIL_WEBHOOK_SECRET;

  if (webhookSecret) {
    const receivedSecret = request.headers.get("x-email-webhook-secret");

    if (receivedSecret !== webhookSecret) {
      return NextResponse.json(
        {
          error: "Invalid webhook secret"
        },
        {
          status: 401
        }
      );
    }
  }

  const bodyText = await request.text();
  let payload: unknown;

  try {
    payload = JSON.parse(bodyText);
  } catch {
    return NextResponse.json(
      {
        error: "Expected JSON payload"
      },
      {
        status: 400
      }
    );
  }

  await recordEmailWebhookHit();
  const result = await ingestRefundEmail(payload);

  return NextResponse.json(result, {
    status: result.accepted ? 200 : 202
  });
}
