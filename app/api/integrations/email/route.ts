import { NextResponse } from "next/server";
import { z } from "zod";
import { hasAccessCookie } from "@/lib/access";
import { updateEmailIntegration } from "@/lib/database";

const formSchema = z.object({
  provider: z.enum(["gmail_forwarding", "sendgrid", "postmark", "custom"]),
  inboundAddress: z.string().email()
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const hasAccess = await hasAccessCookie();

  if (!hasAccess) {
    return NextResponse.redirect(new URL("/dashboard", request.url), {
      status: 303
    });
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => null);
    const parsed = formSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid payload",
          details: parsed.error.flatten()
        },
        {
          status: 400
        }
      );
    }

    const email = await updateEmailIntegration(parsed.data);
    return NextResponse.json({ email });
  }

  const form = await request.formData();
  const parsed = formSchema.safeParse({
    provider: form.get("provider"),
    inboundAddress: form.get("inboundAddress")
  });

  if (parsed.success) {
    await updateEmailIntegration(parsed.data);
  }

  return NextResponse.redirect(new URL("/dashboard", request.url), {
    status: 303
  });
}
