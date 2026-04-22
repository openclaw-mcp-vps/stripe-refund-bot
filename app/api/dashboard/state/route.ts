import { NextResponse } from "next/server";
import { hasAccessCookie } from "@/lib/access";
import { getDashboardState } from "@/lib/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const hasAccess = await hasAccessCookie();

  if (!hasAccess) {
    return NextResponse.json(
      {
        error: "Unauthorized"
      },
      {
        status: 401
      }
    );
  }

  const state = await getDashboardState();
  return NextResponse.json(state);
}
