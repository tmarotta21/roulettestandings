import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, expectedAdminToken, pinMatches } from "@/lib/admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const pin = String(form.get("pin") ?? "");
  if (!pinMatches(pin)) {
    return NextResponse.redirect(new URL("/login?error=1", request.url), 303);
  }
  const token = expectedAdminToken();
  const res = NextResponse.redirect(new URL("/", request.url), 303);
  if (token) {
    res.cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return res;
}
