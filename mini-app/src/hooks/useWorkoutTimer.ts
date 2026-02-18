import { useState, useRef, useCallback, useEffect } from 'react';

export interface LapEntry {
  number: number;
  elapsed: number; // total elapsed at lap mark (seconds)
  split: number;   // time since last lap (seconds)
}

export interface UseWorkoutTimerReturn {
  /** Elapsed time in seconds */
  elapsed: number;
  /** Whether the timer is currently running */
  isRunning: boolean;
  /** Whether the timer has been started at least once */
  hasStarted: boolean;
  /** Recorded laps */
  laps: LapEntry[];
  /** Start or resume the timer */
  start: () => void;
  /** Pause the timer */
  pause: () => void;
  /** Resume after pause (alias for start) */
  resume: () => void;
  /** Stop the timer completely */
  stop: () => void;
  /** Reset the timer to zero */
  reset: () => void;
  /** Add a lap/set marker */
  addLap: () => void;
}

const TICK_INTERVAL_MS = 100;

/**
 * Hook for accurate workout timer logic.
 * Uses Date.now() for drift-proof elapsed time calculation.
 */
export function useWorkoutTimer(): UseWorkoutTimerReturn {
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [laps, setLaps] = useState<LapEntry[]>([]);

  // Track the wall-clock time when the timer was last started/resumed
  const startTimeRef = useRef<number>(0);
  // Track accumulated elapsed time before the current run segment
  const accumulatedRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (isRunning) return;

    setHasStarted(true);
    setIsRunning(true);
    startTimeRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const currentSegment = (now - startTimeRef.current) / 1000;
      setElapsed(accumulatedRef.current + currentSegment);
    }, TICK_INTERVAL_MS);
  }, [isRunning]);

  const pause = useCallback(() => {
    if (!isRunning) return;

    clearTimer();
    // Freeze accumulated time
    const now = Date.now();
    accumulatedRef.current += (now - startTimeRef.current) / 1000;
    setElapsed(accumulatedRef.current);
    setIsRunning(false);
  }, [isRunning, clearTimer]);

  const stop = useCallback(() => {
    clearTimer();
    if (isRunning) {
      const now = Date.now();
      accumulatedRef.current += (now - startTimeRef.current) / 1000;
      setElapsed(accumulatedRef.current);
    }
    setIsRunning(false);
  }, [isRunning, clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    accumulatedRef.current = 0;
    startTimeRef.current = 0;
    setElapsed(0);
    setIsRunning(false);
    setHasStarted(false);
    setLaps([]);
  }, [clearTimer]);

  const addLap = useCallback(() => {
    const currentElapsed = isRunning
      ? accumulatedRef.current + (Date.now() - startTimeRef.current) / 1000
      : accumulatedRef.current;

    setLaps((prev) => {
      const lastLapElapsed = prev.length > 0 ? prev[prev.length - 1].elapsed : 0;
      return [
        ...prev,
        {
          number: prev.length + 1,
          elapsed: currentElapsed,
          split: currentElapsed - lastLapElapsed,
        },
      ];
    });
  }, [isRunning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return {
    elapsed,
    isRunning,
    hasStarted,
    laps,
    start,
    pause,
    resume: start,
    stop,
    reset,
    addLap,
  };
}

/** Format seconds to HH:MM:SS string */
export function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0'),
  ].join(':');
}

/** Format seconds to M:SS for lap display */
export function formatLapTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
