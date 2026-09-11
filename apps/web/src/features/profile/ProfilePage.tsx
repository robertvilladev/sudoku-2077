import { useAuth } from "../../lib/auth/AuthContext.js";
import { useCompletions } from "./api.js";

export function ProfilePage() {
  const { accessToken } = useAuth();
  const completions = useCompletions();

  if (!accessToken) {
    return <p>Log in to see your profile.</p>;
  }

  return (
    <section>
      <h2>Your completions</h2>
      {completions.isLoading && <p>Loading…</p>}
      <ul>
        {completions.data?.map((completion) => (
          <li key={completion.puzzleId}>
            {completion.difficulty} — {new Date(completion.completedAt).toLocaleDateString()}
          </li>
        ))}
      </ul>
      {completions.data?.length === 0 && <p>No completions yet — go solve a puzzle!</p>}
    </section>
  );
}
