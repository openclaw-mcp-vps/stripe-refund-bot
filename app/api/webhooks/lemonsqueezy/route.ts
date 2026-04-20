import { NextResponse } from "next/server";
import { appendEventLog, upsertAccessGrant } from "@/lib/db";
import { extractLemonWebhookOrder, initializeLemonSqueezyClient, verifyLemonWebhookSignature } from "@/lib/lemonsqueezy";

const ACCESS_EVENTS = new Set([
  "order_created",
  "subscription_created",
  "subscription_resumed",
  "subscription_payment_success",
  "subscription_payment_recovered"
]);

export async function POST(request: Request) {
  initializeLemonSqueezyClient();

  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");

  if (process.env.LEMON_SQUEEZY_WEBHOOK_SECRET && !verifyLemonWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ success: false, error: "Invalid Lemon Squeezy signature." }, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody) as {
      meta?: { event_name?: string };
      data?: { id?: string | number };
    };

    const order = extractLemonWebhookOrder(payload);

    if (order.email && order.eventName && ACCESS_EVENTS.has(order.eventName)) {
      await upsertAccessGrant({
        email: order.email,
        grantedAt: new Date().toISOString(),
        source: "lemonsqueezy_webhook",
        orderId: order.orderId,
        eventName: order.eventName
      });
    }

    await appendEventLog({
      source: "lemonsqueezy",
      eventType: order.eventName ?? "unknown",
      payload: {
        orderId: order.orderId,
        email: order.email
      }
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Invalid Lemon Squeezy payload." }, { status: 400 });
  }
}
