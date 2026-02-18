/**
 * ContentQuiz — Post-article quiz modal.
 *
 * Displays one question at a time with animated transitions.
 * Correct answers trigger green highlight + confetti; wrong answers
 * trigger red highlight + shake.  A results screen shows the final
 * score, XP earned, and actions (share, retry, close).
 */

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FocusTrap } from '@/components/FocusTrap';
import { Confetti } from '@/components/celebrations/Confetti';
import { useTelegram } from '@/hooks/useTelegram';
import { fetchQuiz, submitQuiz } from '@/api/content';
import type { QuizQuestion, QuizResult, QuizAnswer } from '@/api/content';
import { X, Trophy, RotateCcw, Share2, Loader2, AlertCircle } from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────

interface ContentQuizProps {
  articleId: number;
  articleTitle: string;
  telegramId: number;
  onClose: () => void;
  /** Called when quiz is completed so parent can refresh XP / progress */
  onComplete?: (result: QuizResult) => void;
}

type Phase = 'loading' | 'question' | 'feedback' | 'results' | 'error';

interface AnswerFeedback {
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
}

// ── Option letter labels ────────────────────────────────────────────

const LETTERS = ['A', 'B', 'C', 'D'] as const;

// ── Animations ──────────────────────────────────────────────────────

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const panelVariants = {
  hidden: { y: '100%' },
  visible: { y: 0, transition: { type: 'spring', damping: 30, stiffness: 300 } },
  exit: { y: '100%', transition: { duration: 0.25 } },
};

const questionSlide = {
  enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
};

const shakeAnimation = {
  x: [0, -10, 10, -8, 8, -4, 4, 0],
  transition: { duration: 0.5 },
};

// ── Helpers ─────────────────────────────────────────────────────────

function scoreEmoji(pct: number): string {
  if (pct === 100) return '🏆';
  if (pct >= 80) return '🌟';
  if (pct >= 60) return '👍';
  if (pct >= 40) return '📖';
  return '💪';
}

function scoreMessage(pct: number): string {
  if (pct === 100) return 'Perfect score!';
  if (pct >= 80) return 'Great job!';
  if (pct >= 60) return 'Well done!';
  if (pct >= 40) return 'Not bad, keep learning!';
  return 'Try reading the article again';
}

function scoreGradient(pct: number): string {
  if (pct >= 80) return 'from-emerald-500 to-teal-400';
  if (pct >= 60) return 'from-blue-500 to-cyan-400';
  if (pct >= 40) return 'from-amber-500 to-yellow-400';
  return 'from-rose-500 to-pink-400';
}

// ── Component ───────────────────────────────────────────────────────

export function ContentQuiz({
  articleId,
  articleTitle,
  telegramId,
  onClose,
  onComplete,
}: ContentQuizProps) {
  const { haptic } = useTelegram();

  // State
  const [phase, setPhase] = useState<Phase>('loading');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Derived
  const currentQuestion = questions[currentIdx] ?? null;
  const scorePct = result ? result.score : 0;

  // ── Load quiz on mount ──────────────────────────────────────────

  const loadQuiz = useCallback(async () => {
    setPhase('loading');
    setErrorMsg('');
    try {
      const q = await fetchQuiz(articleId);
      if (!q || q.length === 0) {
        setErrorMsg('No quiz available for this article.');
        setPhase('error');
        return;
      }
      setQuestions(q);
      setCurrentIdx(0);
      setAnswers([]);
      setFeedback(null);
      setResult(null);
      setDirection(1);
      setPhase('question');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load quiz');
      setPhase('error');
    }
  }, [articleId]);

  // Trigger load on first render
  useState(() => { loadQuiz(); });

  // ── Select answer ───────────────────────────────────────────────

  const handleSelect = useCallback(
    (selectedIndex: number) => {
      if (phase !== 'question' || !currentQuestion) return;

      haptic.impact('medium');
      setAnswers((prev) => [...prev, { question_id: currentQuestion.id, selected_index: selectedIndex }]);

      // We don't know correct_index on the client — that's only revealed
      // after submit.  Show a "selected" state and advance.
      // We'll reveal per-question feedback after the full quiz is submitted.
      setDirection(1);

      // Brief "selected" highlight then advance
      setFeedback({ selectedIndex, correctIndex: -1, isCorrect: true }); // placeholder
      setPhase('feedback');

      setTimeout(() => {
        if (currentIdx < questions.length - 1) {
          setCurrentIdx((i) => i + 1);
          setFeedback(null);
          setPhase('question');
        } else {
          // Last question — submit
          submitAnswers([...answers, { question_id: currentQuestion.id, selected_index: selectedIndex }]);
        }
      }, 400);
    },
    [phase, currentQuestion, currentIdx, questions.length, answers, haptic],
  );

  // ── Submit quiz ─────────────────────────────────────────────────

  const submitAnswers = useCallback(
    async (allAnswers: QuizAnswer[]) => {
      setSubmitting(true);
      setPhase('loading');
      try {
        const res = await submitQuiz(articleId, telegramId, allAnswers);
        setResult(res);
        setPhase('results');
        onComplete?.(res);

        if (res.score >= 80) {
          setShowConfetti(true);
          haptic.notification('success');
        } else if (res.score >= 40) {
          haptic.notification('success');
        } else {
          haptic.notification('warning');
        }
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to submit quiz');
        setPhase('error');
      } finally {
        setSubmitting(false);
      }
    },
    [articleId, telegramId, onComplete, haptic],
  );

  // ── Retry quiz ──────────────────────────────────────────────────

  const handleRetry = useCallback(() => {
    haptic.impact('light');
    loadQuiz();
  }, [haptic, loadQuiz]);

  // ── Share score ─────────────────────────────────────────────────

  const handleShare = useCallback(() => {
    haptic.impact('light');
    const text = `${scoreEmoji(scorePct)} I scored ${scorePct}% on "${articleTitle}" quiz! Can you beat me?`;
    // Use Telegram's share API if available
    if (window.Telegram?.WebApp?.openTelegramLink) {
      const encoded = encodeURIComponent(text);
      window.Telegram.WebApp.openTelegramLink(`https://t.me/share/url?text=${encoded}`);
    }
  }, [haptic, scorePct, articleTitle]);

  // ── Progress dots ───────────────────────────────────────────────

  const progressDots = useMemo(
    () =>
      questions.map((_, i) => {
        let color = 'bg-telegram-hint/30';
        if (i < currentIdx || phase === 'results') {
          // Answered
          if (result && result.correct_answers) {
            const ans = answers[i];
            const isCorrect = ans && result.correct_answers[i] === ans.selected_index;
            color = isCorrect ? 'bg-emerald-500' : 'bg-rose-500';
          } else {
            color = 'bg-telegram-link';
          }
        } else if (i === currentIdx) {
          color = 'bg-telegram-link';
        }
        const isActive = i === currentIdx && phase !== ('results' as Phase);
        return (
          <motion.div
            key={i}
            className={`h-1.5 rounded-full transition-colors duration-300 ${color}`}
            style={{ flex: 1 }}
            initial={false}
            animate={{ scale: isActive ? 1.2 : 1 }}
          />
        );
      }),
    [questions, currentIdx, phase, result, answers],
  );

  // ── Render ──────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      <motion.div
        key="quiz-backdrop"
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end"
        onClick={onClose}
      >
        <FocusTrap onEscape={onClose}>
          <motion.div
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-telegram-secondaryBg rounded-t-3xl w-full max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Header ─────────────────────────────── */}
            <div className="px-5 pt-4 pb-2 flex-shrink-0">
              <div className="w-12 h-1 bg-telegram-hint/30 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1 mr-3">
                  <h3 className="text-sm font-semibold text-telegram-hint truncate">
                    {articleTitle}
                  </h3>
                  <h2 className="text-lg font-bold text-telegram-text">
                    {phase === 'results' ? 'Quiz Results' : 'Quiz'}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full bg-telegram-hint/10 hover:bg-telegram-hint/20 transition-colors"
                  aria-label="Close quiz"
                >
                  <X className="w-5 h-5 text-telegram-hint" />
                </button>
              </div>

              {/* Progress bar */}
              {questions.length > 0 && (
                <div className="flex gap-1 mt-3">
                  {progressDots}
                </div>
              )}
            </div>

            {/* ── Content ────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-5 pb-6">
              {/* Loading */}
              {phase === 'loading' && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-8 h-8 text-telegram-link animate-spin" />
                  <p className="text-sm text-telegram-hint">
                    {submitting ? 'Checking your answers…' : 'Loading quiz…'}
                  </p>
                </div>
              )}

              {/* Error */}
              {phase === 'error' && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <AlertCircle className="w-10 h-10 text-rose-400" />
                  <p className="text-sm text-telegram-hint text-center">{errorMsg}</p>
                  <button
                    onClick={handleRetry}
                    className="mt-2 px-5 py-2 rounded-xl bg-telegram-link text-white text-sm font-medium"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {/* Question */}
              {(phase === 'question' || phase === 'feedback') && currentQuestion && (
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={currentQuestion.id}
                    custom={direction}
                    variants={questionSlide}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                    className="mt-4"
                  >
                    {/* Question number & XP */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-telegram-link uppercase tracking-wider">
                        Question {currentIdx + 1} of {questions.length}
                      </span>
                      <span className="text-xs font-medium text-amber-500">
                        +{currentQuestion.xp_reward} XP
                      </span>
                    </div>

                    {/* Question text */}
                    <h3 className="text-base font-semibold text-telegram-text leading-snug mb-5">
                      {currentQuestion.question}
                    </h3>

                    {/* Options */}
                    <div className="flex flex-col gap-2.5">
                      {currentQuestion.options.map((option, i) => {
                        const isSelected = feedback?.selectedIndex === i;
                        const isFeedbackPhase = phase === 'feedback';

                        return (
                          <motion.button
                            key={i}
                            onClick={() => handleSelect(i)}
                            disabled={phase === 'feedback'}
                            whileTap={phase === 'question' ? { scale: 0.97 } : undefined}
                            animate={
                              isFeedbackPhase && isSelected
                                ? { scale: [1, 1.02, 1], transition: { duration: 0.3 } }
                                : {}
                            }
                            className={`
                              w-full text-left px-4 py-3.5 rounded-2xl border-2 transition-all duration-200
                              flex items-start gap-3
                              ${
                                isFeedbackPhase && isSelected
                                  ? 'border-telegram-link bg-telegram-link/10'
                                  : 'border-telegram-hint/15 bg-telegram-bg hover:border-telegram-link/40 active:bg-telegram-link/5'
                              }
                              disabled:cursor-default
                            `}
                          >
                            <span
                              className={`
                                flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold
                                ${
                                  isFeedbackPhase && isSelected
                                    ? 'bg-telegram-link text-white'
                                    : 'bg-telegram-hint/10 text-telegram-hint'
                                }
                              `}
                            >
                              {LETTERS[i] ?? i + 1}
                            </span>
                            <span className="text-sm text-telegram-text leading-snug pt-0.5">
                              {option}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}

              {/* Results */}
              {phase === 'results' && result && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                  className="mt-4"
                >
                  {/* Score circle */}
                  <div className="flex flex-col items-center mb-6">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
                      className={`
                        w-28 h-28 rounded-full flex flex-col items-center justify-center
                        bg-gradient-to-br ${scoreGradient(scorePct)} shadow-lg
                      `}
                    >
                      <span className="text-3xl">{scoreEmoji(scorePct)}</span>
                      <span className="text-2xl font-extrabold text-white">{scorePct}%</span>
                    </motion.div>

                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="mt-3 text-lg font-bold text-telegram-text"
                    >
                      {scoreMessage(scorePct)}
                    </motion.p>

                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="text-sm text-telegram-hint"
                    >
                      {result.correct} of {result.total} correct
                    </motion.p>
                  </div>

                  {/* XP earned card */}
                  {result.xp_earned > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="bg-gradient-to-r from-amber-500/15 to-yellow-500/15 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-center gap-2 mb-5"
                    >
                      <Trophy className="w-5 h-5 text-amber-500" />
                      <span className="font-bold text-amber-600">+{result.xp_earned} XP earned!</span>
                    </motion.div>
                  )}

                  {/* Per-question breakdown */}
                  <div className="space-y-2 mb-6">
                    {questions.map((q, i) => {
                      const ans = answers[i];
                      const correctIdx = result.correct_answers?.[i] ?? -1;
                      const isCorrect = ans && ans.selected_index === correctIdx;

                      return (
                        <motion.div
                          key={q.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 + i * 0.08 }}
                          className={`
                            p-3 rounded-xl border flex items-start gap-3
                            ${isCorrect
                              ? 'bg-emerald-500/5 border-emerald-500/20'
                              : 'bg-rose-500/5 border-rose-500/20'
                            }
                          `}
                        >
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={!isCorrect ? shakeAnimation : { scale: 1 }}
                            transition={{ delay: 0.6 + i * 0.08 }}
                            className={`
                              flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white
                              ${isCorrect ? 'bg-emerald-500' : 'bg-rose-500'}
                            `}
                          >
                            {isCorrect ? '✓' : '✗'}
                          </motion.span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-telegram-text leading-snug">
                              {q.question}
                            </p>
                            {!isCorrect && correctIdx >= 0 && (
                              <p className="text-xs text-emerald-600 mt-1">
                                Correct: {q.options[correctIdx]}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    {scorePct < 80 && (
                      <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        onClick={handleRetry}
                        whileTap={{ scale: 0.96 }}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-telegram-hint/10 text-telegram-text font-semibold text-sm"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Try Again
                      </motion.button>
                    )}
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.9 }}
                      onClick={handleShare}
                      whileTap={{ scale: 0.96 }}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-telegram-link text-white font-semibold text-sm"
                    >
                      <Share2 className="w-4 h-4" />
                      Share Score
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </FocusTrap>

        {/* Confetti overlay */}
        <Confetti show={showConfetti} onComplete={() => setShowConfetti(false)} />
      </motion.div>
    </AnimatePresence>
  );
}
