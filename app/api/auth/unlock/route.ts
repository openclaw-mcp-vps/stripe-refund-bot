import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ACCESS_COOKIE_MAX_AGE_SECONDS,
  ACCESS_COOKIE_NAME,
  ACCESS_COOKIE_VALUE,
  ACCESS_EMAIL_COOKIE_NAME
} from "@/lib/auth";
import { hasAccessGrant } from "@/lib/db";

const unlockSchema = z.object({
  email: z.string().email()
});

export async function POST(request: Request) {
  try {
    const body = unlockSchema.parse(await request.json());
    const email = body.email.trim().toLowerCase();
    const allowed = await hasAccessGrant(email);

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          message: "No paid access found for that email yet. Complete checkout, then try again in 10-20 seconds."
        },
        { status: 403 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: "Access granted. Redirecting to dashboard."
    });

    const secure = process.env.NODE_ENV === "production";

    response.cookies.set({
      name: ACCESS_COOKIE_NAME,
      value: ACCESS_COOKIE_VALUE,
      httpOnly: true,
      sameSite: "lax",
      secure,
      maxAge: ACCESS_COOKIE_MAX_AGE_SECONDS,
      path: "/"
    });

    response.cookies.set({
      name: ACCESS_EMAIL_COOKIE_NAME,
      value: email,
      httpOnly: false,
      sameSite: "lax",
      secure,
      maxAge: ACCESS_COOKIE_MAX_AGE_SECONDS,
      path: "/"
    });

    return response;
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid email."
      },
      { status: 400 }
    );
  }
}
