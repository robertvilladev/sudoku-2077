import { FormattedDate, FormattedMessage } from "react-intl";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useAuth } from "../../lib/auth/AuthContext.js";
import { DIFFICULTY_LABEL } from "../../lib/i18n/difficulty.js";
import { useCompletions } from "./api.js";

export function ProfilePage() {
  const { accessToken, isInitializing } = useAuth();
  const completions = useCompletions();

  if (isInitializing) {
    return (
      <p className="p-8 font-mono text-sm text-neutral-500">
        <FormattedMessage id="profileLoading" />
      </p>
    );
  }

  if (!accessToken) {
    return (
      <p className="p-8 font-mono text-sm text-neutral-500">
        <FormattedMessage id="profileLoginPrompt" />
      </p>
    );
  }

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-8">
      <h2 className="font-mono text-2xl font-semibold uppercase">
        <FormattedMessage id="profileTitle" />
      </h2>
      {completions.isLoading && (
        <p className="font-mono text-sm text-neutral-500">
          <FormattedMessage id="profileLoading" />
        </p>
      )}
      <div className="flex flex-col gap-2">
        {completions.data?.map((completion) => (
          <Card key={completion.puzzleId} className="flex-row items-center justify-between px-4">
            <Badge variant="outline" className="uppercase">
              <FormattedMessage id={DIFFICULTY_LABEL[completion.difficulty]} />
            </Badge>
            <span className="font-mono text-sm text-neutral-500">
              <FormattedDate value={completion.completedAt} dateStyle="medium" />
            </span>
          </Card>
        ))}
      </div>
      {completions.data?.length === 0 && (
        <p className="font-mono text-sm text-neutral-500">
          <FormattedMessage id="profileEmpty" />
        </p>
      )}
    </section>
  );
}
