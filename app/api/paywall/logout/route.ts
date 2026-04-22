import { NextResponse } from "next/server";
import { clearAccessCookie } from "@/lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/dashboard", request.url), {
    status: 303
  });

  clearAccessCookie(response);
  return response;
}
