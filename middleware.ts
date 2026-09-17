import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const match = request.nextUrl.pathname.match(/^\/u\/([^/]+)/);
  if (!match) return NextResponse.next();
  const username = decodeURIComponent(match[1] ?? "").trim();
  if (!username) return NextResponse.next();
  const res = NextResponse.next();
  if (request.cookies.get("rs_username")?.value !== username) {
    res.cookies.set("rs_username", username, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });
  }
  return res;
}

export const config = {
  matcher: ["/u/:username*"],
};
