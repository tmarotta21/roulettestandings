import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "rs_admin";

function envValue(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

export function adminPassword(): string | undefined {
  return envValue("ADMIN_PASSWORD", "ADMIN_PIN");
}

export function adminPinConfigured(): boolean {
  return Boolean(adminPassword());
}

function tokenForPin(pin: string): string {
  return createHmac("sha256", pin).update("roulettestandings-admin").digest("hex");
}

export function expectedAdminToken(): string | null {
  const pin = adminPassword();
  if (!pin) return null;
  return tokenForPin(pin);
}

export function pinMatches(pin: string): boolean {
  const expected = adminPassword();
  if (!expected) return false;
  const a = Buffer.from(pin);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function isAdmin(): Promise<boolean> {
  const expected = expectedAdminToken();
  if (!expected) return false;
  const jar = await cookies();
  const value = jar.get(ADMIN_COOKIE)?.value;
  if (!value) return false;
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function currentSeason(): string {
  return envValue("SLEEPER_SEASON") ?? "2026";
}
