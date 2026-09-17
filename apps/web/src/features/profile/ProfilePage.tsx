import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useAuth } from "../../lib/auth/AuthContext.js";
import { useCompletions } from "./api.js";

export function ProfilePage() {
  const { accessToken, isInitializing } = useAuth();
  const completions = useCompletions();

  if (isInitializing) {
    return <p className="p-8 font-mono text-sm text-neutral-500">Loading…</p>;
  }

  if (!accessToken) {
    return <p className="p-8 font-mono text-sm text-neutral-500">Log in to see your profile.</p>;
  }

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-8">
      <h2 className="font-mono text-2xl font-semibold">YOUR COMPLETIONS</h2>
      {completions.isLoading && <p className="font-mono text-sm text-neutral-500">Loading…</p>}
      <div className="flex flex-col gap-2">
        {completions.data?.map((completion) => (
          <Card key={completion.puzzleId} className="flex-row items-center justify-between px-4">
            <Badge variant="outline">{completion.difficulty}</Badge>
            <span className="font-mono text-sm text-neutral-500">
              {new Date(completion.completedAt).toLocaleDateString()}
            </span>
          </Card>
        ))}
      </div>
      {completions.data?.length === 0 && (
        <p className="font-mono text-sm text-neutral-500">No completions yet — go solve a puzzle!</p>
      )}
    </section>
  );
}
