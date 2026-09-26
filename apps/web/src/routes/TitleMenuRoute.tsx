import { CubeTransparentIcon } from "@phosphor-icons/react";
import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate } from "react-router-dom";
import { useDailyChallenge } from "../features/puzzle/api.js";
import { Button } from "@/components/ui/button";
import { PageFlicker } from "@/components/cyberpunk/PageFlicker";
import { ScanlineOverlay } from "@/components/cyberpunk/ScanlineOverlay";
import { TerminalBootText } from "@/components/cyberpunk/TerminalBootText";

export function TitleMenuRoute() {
  const navigate = useNavigate();
  const daily = useDailyChallenge();
  const intl = useIntl();

  return (
    <PageFlicker>
      <div className="relative flex min-h-screen flex-col items-center justify-center gap-10 overflow-hidden px-4">
        <ScanlineOverlay />
        <TerminalBootText
          lines={[
            intl.formatMessage({ id: "titleBootOnline" }),
            intl.formatMessage({ id: "titleBootLoading" }),
            intl.formatMessage({ id: "titleBootIntegrity" }),
          ]}
        />

        <div className="flex items-center gap-3">
          <CubeTransparentIcon size={44} className="glow-icon-accent text-accent" />
          {/* eslint-disable formatjs/no-literal-string-in-jsx -- wordmark is a brand name, never translated */}
          <h1 className="font-mono text-5xl font-bold tracking-tight glow-logo sm:text-6xl">
            SUDOKU<span className="text-accent">//</span>2077
          </h1>
          {/* eslint-enable formatjs/no-literal-string-in-jsx */}
        </div>

        <div className="flex w-full max-w-xs flex-col gap-3">
          <Button variant="primary" className="h-11" onClick={() => navigate("/play")}>
            <FormattedMessage id="menuPlay" />
          </Button>
          <Button
            variant="secondary"
            className="h-11"
            disabled={daily.isLoading || daily.isError}
            onClick={() => daily.data && navigate(`/puzzles/${daily.data.puzzle.id}`)}
          >
            <FormattedMessage id="menuDailyChallenge" />
          </Button>
          <Button variant="ghost" className="h-11" disabled>
            <FormattedMessage id="menuLeaderboard" />
          </Button>
        </div>

        {/* eslint-disable-next-line formatjs/no-literal-string-in-jsx -- build tag, not copy */}
        <p className="absolute bottom-5 left-8 font-mono text-[10px] text-neutral-700">
          v0.4.2 // BUILD_2077-09-11
        </p>
      </div>
    </PageFlicker>
  );
}
