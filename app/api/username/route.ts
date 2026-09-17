import { NextRequest, NextResponse } from "next/server";
import { SleeperError } from "@/lib/sleeper";
import {
  cookieUsernameOptions,
  hostedLeaguesForUser,
  USERNAME_COOKIE,
} from "@/lib/username";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const raw = String(form.get("username") ?? "").trim();
  if (!raw) {
    return NextResponse.redirect(new URL("/?error=missing", request.url), 303);
  }
  try {
    const { user } = await hostedLeaguesForUser(raw);
    const username = user.username || raw;
    const res = NextResponse.redirect(
      new URL(`/u/${encodeURIComponent(username)}`, request.url),
      303,
    );
    res.cookies.set(USERNAME_COOKIE, username, cookieUsernameOptions());
    return res;
  } catch (error) {
    const notFound = error instanceof SleeperError;
    return NextResponse.redirect(
      new URL(notFound ? "/?error=notfound" : "/?error=sleeper", request.url),
      303,
    );
  }
}
