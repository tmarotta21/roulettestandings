import { redirect } from "next/navigation";
import { getUsernameCookie } from "@/lib/username";

export const dynamic = "force-dynamic";

export default async function WeeklySchedulePage() {
  const username = await getUsernameCookie();
  if (username) {
    redirect(`/u/${encodeURIComponent(username)}?tab=weekly`);
  }
  redirect("/?change=1");
}
