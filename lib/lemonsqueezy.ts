import crypto from "node:crypto";
import { lemonSqueezySetup } from "@lemonsqueezy/lemonsqueezy.js";

type LemonWebhookPayload = {
  meta?: {
    event_name?: string;
    custom_data?: Record<string, unknown>;
  };
  data?: {
    id?: string | number;
    attributes?: Record<string, unknown>;
  };
};

let lemonInitialized = false;

export function initializeLemonSqueezyClient() {
  const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
  if (!apiKey || lemonInitialized) {
    return;
  }
  lemonSqueezySetup({ apiKey });
  lemonInitialized = true;
}

export function getLemonCheckoutUrl(): string | null {
  const productValue = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID;
  if (!productValue) {
    return null;
  }

  const trimmed = productValue.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://checkout.lemonsqueezy.com/buy/${trimmed}`;
}

export function verifyLemonWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    return false;
  }

  if (!signature) {
    return false;
  }

  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const digestBuffer = Buffer.from(digest);
  const signatureBuffer = Buffer.from(signature);

  if (digestBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(digestBuffer, signatureBuffer);
}

function readAttributeString(attributes: Record<string, unknown> | undefined, keys: string[]): string | null {
  if (!attributes) {
    return null;
  }

  for (const key of keys) {
    const value = attributes[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

export function extractLemonWebhookOrder(payload: LemonWebhookPayload) {
  const eventName = payload.meta?.event_name ?? null;
  const attributes = payload.data?.attributes;
  const customData = payload.meta?.custom_data;

  const customEmail =
    (typeof customData?.unlock_email === "string" ? customData.unlock_email : null) ??
    (typeof customData?.email === "string" ? customData.email : null);

  const email =
    customEmail ??
    readAttributeString(attributes, [
      "user_email",
      "customer_email",
      "email",
      "billing_email",
      "first_order_item.email"
    ]);

  const orderId = payload.data?.id == null ? null : String(payload.data.id);

  return {
    eventName,
    email: email?.toLowerCase() ?? null,
    orderId
  };
}
