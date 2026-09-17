import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UsernameForm({
  error,
  defaultUsername,
}: {
  error?: string | null;
  defaultUsername?: string;
}) {
  return (
    <form action="/api/username" method="post" className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="username">Sleeper username</Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          required
          defaultValue={defaultUsername}
          placeholder="your Sleeper username"
        />
      </div>
      <Button type="submit">See standings</Button>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </form>
  );
}
