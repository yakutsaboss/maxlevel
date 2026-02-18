import { memo, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Square, Plus, Check, Flame } from 'lucide-react';
import { useWorkoutTimer, formatTime, formatLapTime } from '../../hooks/useWorkoutTimer.js';
import { Confetti } from '../celebrations/Confetti.js';
import { useTelegram } from '../../hooks/useTelegram.js';

export interface ActivityTypeInfo {
  name: string;
  icon_emoji: string;
  calories_per_min: number;
}

interface WorkoutTimerProps {
  activityType: ActivityTypeInfo;
  onComplete: (duration: number, calories: number) => void;
  onCancel: () => void;
}

type TimerPhase = 'ready' | 'active' | 'confirm-stop' | 'summary';

const RING_SIZE = 240;
const RING_STROKE = 6;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export const WorkoutTimer = memo(function WorkoutTimer({
  activityType,
  onComplete,
  onCancel,
}: WorkoutTimerProps) {
  const { haptic } = useTelegram();
  const timer = useWorkoutTimer();
  const [phase, setPhase] = useState<TimerPhase>('ready');
  const [showConfetti, setShowConfetti] = useState(false);

  const calories = useMemo(
    () => Math.round(activityType.calories_per_min * (timer.elapsed / 60)),
    [activityType.calories_per_min, timer.elapsed]
  );

  const handleStart = useCallback(() => {
    haptic.impact('medium');
    timer.start();
    setPhase('active');
  }, [haptic, timer]);

  const handlePause = useCallback(() => {
    haptic.impact('light');
    timer.pause();
  }, [haptic, timer]);

  const handleResume = useCallback(() => {
    haptic.impact('light');
    timer.resume();
  }, [haptic, timer]);

  const handleStopRequest = useCallback(() => {
    haptic.impact('heavy');
    timer.pause();
    setPhase('confirm-stop');
  }, [haptic, timer]);

  const handleConfirmStop = useCallback(() => {
    haptic.notification('success');
    timer.stop();
    setPhase('summary');
    setShowConfetti(true);
  }, [haptic, timer]);

  const handleCancelStop = useCallback(() => {
    haptic.impact('light');
    timer.resume();
    setPhase('active');
  }, [haptic, timer]);

  const handleSave = useCallback(() => {
    haptic.impact('medium');
    const durationMin = Math.round(timer.elapsed / 60);
    onComplete(durationMin, calories);
  }, [haptic, timer.elapsed, calories, onComplete]);

  const handleCancel = useCallback(() => {
    haptic.impact('light');
    timer.reset();
    onCancel();
  }, [haptic, timer, onCancel]);

  const handleAddLap = useCallback(() => {
    haptic.selection();
    timer.addLap();
  }, [haptic, timer]);

  // Pulsing ring animation: one full pulse cycle = 4 seconds
  const pulseProgress = useMemo(() => {
    if (!timer.isRunning) return 0;
    const cycle = timer.elapsed % 4;
    return cycle / 4;
  }, [timer.isRunning, timer.elapsed]);

  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - pulseProgress);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[50] flex flex-col bg-telegram-bg"
    >
      {/* Confetti on completion */}
      <Confetti show={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={handleCancel}
          className="text-telegram-hint text-sm px-3 py-1"
          aria-label="Cancel workout"
        >
          Cancel
        </button>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{activityType.icon_emoji}</span>
          <span className="text-telegram-text font-semibold text-lg">
            {activityType.name}
          </span>
        </div>
        <div className="w-16" /> {/* Spacer for balance */}
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait">
          {phase === 'summary' ? (
            <SummaryView
              key="summary"
              elapsed={timer.elapsed}
              calories={calories}
              laps={timer.laps}
              activityType={activityType}
              onSave={handleSave}
            />
          ) : phase === 'confirm-stop' ? (
            <ConfirmStopView
              key="confirm"
              elapsed={timer.elapsed}
              onConfirm={handleConfirmStop}
              onResume={handleCancelStop}
            />
          ) : (
            <TimerView
              key="timer"
              elapsed={timer.elapsed}
              isRunning={timer.isRunning}
              hasStarted={timer.hasStarted}
              calories={calories}
              lapCount={timer.laps.length}
              pulseProgress={pulseProgress}
              strokeDashoffset={strokeDashoffset}
              onStart={handleStart}
              onPause={handlePause}
              onResume={handleResume}
              onStop={handleStopRequest}
              onAddLap={handleAddLap}
            />
          )}
        </AnimatePresence>

        {/* Lap list — shown during active/ready phase */}
        {phase !== 'summary' && phase !== 'confirm-stop' && timer.laps.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-xs mt-6 max-h-40 overflow-y-auto"
          >
            <div className="text-telegram-hint text-xs uppercase tracking-wider mb-2 text-center">
              Laps
            </div>
            <div className="space-y-1">
              {timer.laps.slice().reverse().map((lap) => (
                <div
                  key={lap.number}
                  className="flex justify-between px-3 py-1.5 rounded-lg bg-telegram-secondaryBg"
                >
                  <span className="text-telegram-hint text-sm">
                    Lap {lap.number}
                  </span>
                  <span className="text-telegram-text text-sm font-mono">
                    {formatLapTime(lap.split)}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
});

/* ---------- Sub-views ---------- */

interface TimerViewProps {
  elapsed: number;
  isRunning: boolean;
  hasStarted: boolean;
  calories: number;
  lapCount: number;
  pulseProgress: number;
  strokeDashoffset: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onAddLap: () => void;
}

function TimerView({
  elapsed,
  isRunning,
  hasStarted,
  calories,
  lapCount,
  strokeDashoffset,
  onStart,
  onPause,
  onResume,
  onStop,
  onAddLap,
}: TimerViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex flex-col items-center"
    >
      {/* Timer ring + time */}
      <div className="relative" style={{ width: RING_SIZE, height: RING_SIZE }}>
        <svg
          width={RING_SIZE}
          height={RING_SIZE}
          className="absolute inset-0"
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Background ring */}
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke="var(--tg-theme-hint-color, #999)"
            strokeWidth={RING_STROKE}
            opacity={0.2}
          />
          {/* Animated progress ring */}
          {isRunning && (
            <motion.circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              stroke="var(--tg-theme-button-color, #2481cc)"
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              animate={{
                strokeDashoffset: [RING_CIRCUMFERENCE, 0, RING_CIRCUMFERENCE],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          )}
        </svg>

        {/* Time display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-5xl font-mono font-bold text-telegram-text tracking-tight"
            animate={isRunning ? { scale: [1, 1.02, 1] } : {}}
            transition={isRunning ? { duration: 1, repeat: Infinity } : {}}
          >
            {formatTime(elapsed)}
          </motion.span>
        </div>
      </div>

      {/* Calories counter */}
      <motion.div
        className="flex items-center gap-2 mt-4"
        animate={isRunning ? { opacity: [0.7, 1, 0.7] } : { opacity: 1 }}
        transition={isRunning ? { duration: 2, repeat: Infinity } : {}}
      >
        <Flame className="w-5 h-5 text-orange-500" />
        <span className="text-telegram-text text-xl font-semibold">
          {calories}
        </span>
        <span className="text-telegram-hint text-sm">cal</span>
      </motion.div>

      {/* Lap counter */}
      {hasStarted && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-telegram-hint text-sm">
            {lapCount} {lapCount === 1 ? 'lap' : 'laps'}
          </span>
        </div>
      )}

      {/* Control buttons */}
      <div className="flex items-center gap-4 mt-8">
        {!hasStarted ? (
          /* Initial start */
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onStart}
            className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
            style={{
              backgroundColor: 'var(--tg-theme-button-color, #2481cc)',
              color: 'var(--tg-theme-button-text-color, #fff)',
            }}
            aria-label="Start workout"
          >
            <Play className="w-8 h-8 ml-1" />
          </motion.button>
        ) : (
          <>
            {/* Stop button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onStop}
              className="w-16 h-16 rounded-full flex items-center justify-center bg-red-500/15 border-2 border-red-500"
              aria-label="Stop workout"
            >
              <Square className="w-6 h-6 text-red-500" />
            </motion.button>

            {/* Pause / Resume */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={isRunning ? onPause : onResume}
              className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
              style={{
                backgroundColor: 'var(--tg-theme-button-color, #2481cc)',
                color: 'var(--tg-theme-button-text-color, #fff)',
              }}
              aria-label={isRunning ? 'Pause workout' : 'Resume workout'}
            >
              {isRunning ? (
                <Pause className="w-8 h-8" />
              ) : (
                <Play className="w-8 h-8 ml-1" />
              )}
            </motion.button>

            {/* Add lap button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onAddLap}
              className="w-16 h-16 rounded-full flex items-center justify-center border-2"
              style={{
                borderColor: 'var(--tg-theme-button-color, #2481cc)',
                color: 'var(--tg-theme-button-color, #2481cc)',
              }}
              aria-label="Add lap"
            >
              <Plus className="w-6 h-6" />
            </motion.button>
          </>
        )}
      </div>
    </motion.div>
  );
}

/* ---------- Confirm Stop ---------- */

interface ConfirmStopViewProps {
  elapsed: number;
  onConfirm: () => void;
  onResume: () => void;
}

function ConfirmStopView({ elapsed, onConfirm, onResume }: ConfirmStopViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex flex-col items-center gap-6"
    >
      <div className="text-5xl">
        <Square className="w-16 h-16 text-red-500" />
      </div>
      <h2 className="text-telegram-text text-2xl font-bold">End workout?</h2>
      <p className="text-telegram-hint text-center">
        You've been going for {formatTime(elapsed)}
      </p>
      <div className="flex gap-4 mt-4">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onResume}
          className="px-6 py-3 rounded-xl font-medium text-telegram-text bg-telegram-secondaryBg"
        >
          Continue
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onConfirm}
          className="px-6 py-3 rounded-xl font-medium text-white bg-red-500"
        >
          End Workout
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ---------- Summary ---------- */

interface SummaryViewProps {
  elapsed: number;
  calories: number;
  laps: Array<{ number: number; elapsed: number; split: number }>;
  activityType: ActivityTypeInfo;
  onSave: () => void;
}

function SummaryView({ elapsed, calories, laps, activityType, onSave }: SummaryViewProps) {
  const durationMin = Math.round(elapsed / 60);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      className="flex flex-col items-center gap-5 w-full max-w-sm"
    >
      {/* Checkmark */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 10, stiffness: 200, delay: 0.2 }}
        className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{ backgroundColor: 'var(--tg-theme-button-color, #2481cc)' }}
      >
        <Check className="w-10 h-10 text-white" />
      </motion.div>

      <h2 className="text-telegram-text text-2xl font-bold">Workout Complete!</h2>
      <span className="text-4xl">{activityType.icon_emoji}</span>
      <span className="text-telegram-hint">{activityType.name}</span>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 w-full mt-2">
        <div className="bg-telegram-secondaryBg rounded-xl p-3 text-center">
          <div className="text-telegram-hint text-xs">Duration</div>
          <div className="text-telegram-text text-lg font-bold mt-1">
            {formatTime(elapsed)}
          </div>
        </div>
        <div className="bg-telegram-secondaryBg rounded-xl p-3 text-center">
          <div className="text-telegram-hint text-xs">Calories</div>
          <div className="text-telegram-text text-lg font-bold mt-1 flex items-center justify-center gap-1">
            <Flame className="w-4 h-4 text-orange-500" />
            {calories}
          </div>
        </div>
        <div className="bg-telegram-secondaryBg rounded-xl p-3 text-center">
          <div className="text-telegram-hint text-xs">Laps</div>
          <div className="text-telegram-text text-lg font-bold mt-1">
            {laps.length}
          </div>
        </div>
      </div>

      {/* Lap details (if any) */}
      {laps.length > 0 && (
        <div className="w-full max-h-32 overflow-y-auto mt-1">
          <div className="space-y-1">
            {laps.map((lap) => (
              <div
                key={lap.number}
                className="flex justify-between px-3 py-1.5 rounded-lg bg-telegram-secondaryBg"
              >
                <span className="text-telegram-hint text-sm">
                  Lap {lap.number}
                </span>
                <span className="text-telegram-text text-sm font-mono">
                  {formatLapTime(lap.split)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onSave}
        className="w-full py-4 rounded-xl font-semibold text-lg mt-2"
        style={{
          backgroundColor: 'var(--tg-theme-button-color, #2481cc)',
          color: 'var(--tg-theme-button-text-color, #fff)',
        }}
        aria-label={`Save workout: ${durationMin} minutes, ${calories} calories`}
      >
        Save Workout
      </motion.button>
    </motion.div>
  );
}
