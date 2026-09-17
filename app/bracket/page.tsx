import { redirect } from "next/navigation";
import { getUsernameCookie } from "@/lib/username";

export const dynamic = "force-dynamic";

export default async function BracketPage() {
  const username = await getUsernameCookie();
  if (username) {
    redirect(`/u/${encodeURIComponent(username)}?tab=bracket`);
  }
  redirect("/?change=1");
}
