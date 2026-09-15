import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminPinConfigured } from "@/lib/admin";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Commissioner login</h1>
        <p className="mt-2 text-sm text-emerald-100/70">
          {adminPinConfigured()
            ? "Enter the admin PIN to download roulette standings."
            : "Set ADMIN_PIN in the environment, then come back."}
        </p>
      </div>
      <form action="/api/admin/login" method="post" className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="pin">PIN</Label>
          <Input id="pin" name="pin" type="password" required disabled={!adminPinConfigured()} />
        </div>
        <Button type="submit" disabled={!adminPinConfigured()}>
          Enter
        </Button>
        {error ? <p className="text-sm text-red-300">Wrong PIN.</p> : null}
      </form>
    </div>
  );
}
