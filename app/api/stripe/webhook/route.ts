import Stripe from "stripe";
import { NextResponse } from "next/server";
import {
  markPaidCustomer,
  recordRefundFromStripeWebhook,
  updateStripeIntegration
} from "@/lib/database";
import { getStripeWebhookClient } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const stripe = getStripeWebhookClient();

  if (!stripe) {
    return NextResponse.json(
      {
        error: "STRIPE_SECRET_KEY is missing"
      },
      {
        status: 500
      }
    );
  }

  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      {
        error: "Missing Stripe webhook signature or webhook secret"
      },
      {
        status: 400
      }
    );
  }

  const rawBody = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Webhook signature verification failed"
      },
      {
        status: 400
      }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const email = (session.customer_details?.email ?? session.customer_email ?? "").trim().toLowerCase();

    if (email) {
      await markPaidCustomer(email, "stripe_webhook", session.id);
    }

    await updateStripeIntegration({
      connected: true,
      mode: session.livemode ? "live" : "test",
      accountLabel: "Webhook verified"
    });
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const firstRefund = charge.refunds?.data?.[0];

    if (firstRefund) {
      await recordRefundFromStripeWebhook(charge.id, firstRefund.id, firstRefund.amount);
    }
  }

  return NextResponse.json({ received: true });
}
