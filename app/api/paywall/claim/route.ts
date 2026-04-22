import { NextResponse } from "next/server";
import { z } from "zod";
import { addAccessCookie } from "@/lib/access";
import { hasPaidCustomer, markPaidCustomer } from "@/lib/database";
import { verifyPaidCheckoutForEmail } from "@/lib/stripe";

const claimSchema = z.object({
  email: z.string().email()
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function makeFailureResponse(request: Request, forJson: boolean, message: string) {
  if (forJson) {
    return NextResponse.json(
      {
        error: message
      },
      {
        status: 403
      }
    );
  }

  return NextResponse.redirect(new URL("/dashboard", request.url), {
    status: 303
  });
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const expectsJson = contentType.includes("application/json");

  const body = expectsJson
    ? await request.json().catch(() => null)
    : {
        email: String((await request.formData()).get("email") ?? "")
      };

  const parsed = claimSchema.safeParse(body);

  if (!parsed.success) {
    return makeFailureResponse(request, expectsJson, "Provide a valid purchase email.");
  }

  const email = parsed.data.email.trim().toLowerCase();
  let paid = await hasPaidCustomer(email);

  if (!paid) {
    const checked = await verifyPaidCheckoutForEmail(email);

    if (checked.paid) {
      await markPaidCustomer(email, "stripe_lookup", checked.checkoutSessionId);
      paid = true;
    }
  }

  if (!paid) {
    return makeFailureResponse(
      request,
      expectsJson,
      "This email has no paid checkout session yet. Wait for Stripe webhook delivery or verify checkout completion."
    );
  }

  if (expectsJson) {
    const response = NextResponse.json({ ok: true });
    addAccessCookie(response);
    return response;
  }

  const response = NextResponse.redirect(new URL("/dashboard", request.url), {
    status: 303
  });
  addAccessCookie(response);
  return response;
}
