import { useCallback, useEffect, useRef, useState } from "react";

export interface UseGameTimerResult {
  elapsedSeconds: number;
  isRunning: boolean;
  pause: () => void;
  resume: () => void;
}

export function useGameTimer(initialSeconds = 0): UseGameTimerResult {
  const [elapsedSeconds, setElapsedSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!isRunning) return;
    intervalRef.current = setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  const pause = useCallback(() => setIsRunning(false), []);
  const resume = useCallback(() => setIsRunning(true), []);

  return { elapsedSeconds, isRunning, pause, resume };
}
