import { NextResponse } from "next/server";
import { appendEventLog } from "@/lib/db";
import { getStripeClient } from "@/lib/stripe-client";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  try {
    let event: { id?: string; type?: string; data?: unknown };
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripe = getStripeClient();

    if (webhookSecret && stripe && signature) {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } else {
      event = JSON.parse(rawBody) as { id?: string; type?: string; data?: unknown };
    }

    await appendEventLog({
      source: "stripe",
      eventType: event.type ?? "unknown",
      payload: {
        eventId: event.id ?? null,
        raw: event.data ?? null
      }
    });

    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Invalid Stripe webhook payload"
      },
      { status: 400 }
    );
  }
}
