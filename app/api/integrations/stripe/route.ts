import { NextResponse } from "next/server";
import { hasAccessCookie } from "@/lib/access";
import { checkStripeConnection } from "@/lib/stripe";
import { updateStripeIntegration } from "@/lib/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const hasAccess = await hasAccessCookie();

  if (!hasAccess) {
    return NextResponse.redirect(new URL("/dashboard", request.url), {
      status: 303
    });
  }

  const status = await checkStripeConnection();

  await updateStripeIntegration({
    connected: status.connected,
    mode: status.mode,
    accountLabel: status.accountLabel
  });

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return NextResponse.json({ stripe: status });
  }

  return NextResponse.redirect(new URL("/dashboard", request.url), {
    status: 303
  });
}
