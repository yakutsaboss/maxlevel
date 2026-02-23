import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Target, Clock, Crown, Loader2, AlertCircle, RefreshCw, Trophy, LogOut } from 'lucide-react';
import { getChallengeDetails } from '@/api/social';
import { FocusTrap } from '@/components/FocusTrap';
import type { ChallengeDetail } from '@/api/social';

interface ChallengeDetailModalProps {
  challengeId: number | null;
  onClose: () => void;
  userId: number;
  onLeave?: (challengeId: number) => Promise<void>;
}

export function ChallengeDetailModal({ challengeId, onClose, userId, onLeave }: ChallengeDetailModalProps) {
  const { t } = useTranslation();
  const [detail, setDetail] = useState<ChallengeDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const fetchDetails = useCallback(async (id: number) => {
    try {
      setLoading(true);
      setError(false);
      const data = await getChallengeDetails(id);
      setDetail(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (challengeId !== null) {
      fetchDetails(challengeId);
      document.body.style.overflow = 'hidden';
    } else {
      setDetail(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [challengeId, fetchDetails]);

  const handleLeave = async () => {
    if (!challengeId || !onLeave) return;
    try {
      setLeaving(true);
      await onLeave(challengeId);
      onClose();
    } catch {
      // error handled by parent
    } finally {
      setLeaving(false);
    }
  };

  if (challengeId === null) return null;

  const sortedParticipants = detail
    ? [...detail.participants].sort((a, b) => b.progress - a.progress)
    : [];

  // Check if the current user is the creator by matching the creator info
  const creatorParticipant = detail
    ? sortedParticipants.find(
        (p) =>
          p.first_name === detail.creator.first_name &&
          p.username === detail.creator.username
      )
    : null;
  const userIsCreator = creatorParticipant?.user_id === userId;

  const progressPercent = detail?.target_value
    ? Math.min(100, Math.round(((detail.participants.find(p => p.user_id === userId)?.progress ?? 0) / detail.target_value) * 100))
    : 0;

  const userProgress = detail?.participants.find(p => p.user_id === userId)?.progress ?? 0;

  return (
    <AnimatePresence>
      {challengeId !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end"
          onClick={onClose}
        >
          <FocusTrap onEscape={onClose} aria-label={detail?.title || t('social.challengeDetails')}>
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="bg-telegram-secondaryBg rounded-t-3xl w-full p-6 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-telegram-hint/30 rounded-full mx-auto mb-4" />

            {/* Close button */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-telegram-text">
                {t('social.challengeDetails')}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-telegram-hint active:scale-95 transition-transform"
                aria-label={t('common.close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loading && (
              <div className="space-y-4 animate-pulse">
                <div className="h-6 w-3/4 bg-telegram-hint/20 rounded" />
                <div className="h-4 w-1/2 bg-telegram-hint/20 rounded" />
                <div className="h-2 w-full bg-telegram-hint/20 rounded-full" />
                <div className="h-4 w-1/3 bg-telegram-hint/20 rounded mt-4" />
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-telegram-hint/20" />
                    <div className="flex-1">
                      <div className="h-4 w-24 bg-telegram-hint/20 rounded" />
                    </div>
                    <div className="h-4 w-12 bg-telegram-hint/20 rounded" />
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="text-center py-8">
                <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                <p className="text-telegram-hint text-sm mb-4">{t('errors.somethingWentWrong')}</p>
                <button
                  onClick={() => challengeId !== null && fetchDetails(challengeId)}
                  className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl bg-telegram-link/10 text-telegram-link text-sm font-medium active:scale-95 transition-transform"
                >
                  <RefreshCw className="w-4 h-4" />
                  {t('common.retry')}
                </button>
              </div>
            )}

            {detail && !loading && !error && (
              <>
                {/* Challenge Info */}
                <div className="mb-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-xl font-bold text-telegram-text">{detail.title}</h3>
                    {detail.mode && (
                      <span className="text-xs bg-telegram-link/10 text-telegram-link px-2 py-0.5 rounded-full flex-shrink-0">
                        {detail.mode}
                      </span>
                    )}
                  </div>
                  {detail.description && (
                    <p className="text-telegram-hint text-sm mb-3">{detail.description}</p>
                  )}

                  <div className="flex flex-wrap gap-3 text-xs text-telegram-hint mb-3">
                    {detail.target_value && (
                      <span className="flex items-center gap-1">
                        <Target className="w-3.5 h-3.5" />
                        {t('social.targetValue')}: {detail.target_value}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(detail.start_date).toLocaleDateString()}
                      {detail.end_date && ` — ${new Date(detail.end_date).toLocaleDateString()}`}
                    </span>
                  </div>

                  {/* User progress bar */}
                  {detail.target_value && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-telegram-hint">{t('social.progress')}</span>
                        <span className="text-telegram-text font-medium">
                          {userProgress}/{detail.target_value} ({progressPercent}%)
                        </span>
                      </div>
                      <div className="h-2 bg-telegram-hint/20 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${progressPercent >= 100 ? 'bg-green-400' : 'bg-telegram-link'}`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Participants Leaderboard */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-telegram-text flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-telegram-link" />
                    {t('social.participants')} ({detail.participant_count})
                  </h4>

                  <div className="space-y-1">
                    {sortedParticipants.map((participant, index) => {
                      const isCurrentUser = participant.user_id === userId;
                      const rank = index + 1;

                      return (
                        <div
                          key={participant.user_id}
                          className={`flex items-center gap-3 py-2.5 px-3 rounded-xl ${
                            isCurrentUser
                              ? 'bg-telegram-link/10 border border-telegram-link/20'
                              : 'bg-telegram-bg/50'
                          }`}
                        >
                          {/* Rank */}
                          <div className="w-7 text-center flex-shrink-0">
                            {rank <= 3 ? (
                              <Trophy className={`w-4 h-4 mx-auto ${
                                rank === 1 ? 'text-yellow-400' :
                                rank === 2 ? 'text-gray-400' :
                                'text-amber-600'
                              }`} />
                            ) : (
                              <span className="text-xs text-telegram-hint font-medium">
                                #{rank}
                              </span>
                            )}
                          </div>

                          {/* Avatar */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isCurrentUser ? 'bg-telegram-link/20' : 'bg-telegram-hint/20'
                          }`}>
                            <span className={`text-sm font-bold ${
                              isCurrentUser ? 'text-telegram-link' : 'text-telegram-hint'
                            }`}>
                              {participant.first_name.charAt(0).toUpperCase()}
                            </span>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className={`text-sm font-medium truncate ${
                                isCurrentUser ? 'text-telegram-link' : 'text-telegram-text'
                              }`}>
                                {participant.first_name}
                              </span>
                              {participant.user_id === creatorParticipant?.user_id && (
                                <Crown className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                              )}
                            </div>
                            {participant.username && (
                              <span className="text-xs text-telegram-hint">@{participant.username}</span>
                            )}
                          </div>

                          {/* Level */}
                          <span className="text-xs text-telegram-hint flex-shrink-0">
                            {t('social.level')}{participant.current_level}
                          </span>

                          {/* Progress */}
                          <span className={`text-sm font-semibold flex-shrink-0 ${
                            isCurrentUser ? 'text-telegram-link' : 'text-telegram-text'
                          }`}>
                            {participant.progress}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Leave button */}
                {onLeave && !userIsCreator && (
                  <button
                    onClick={handleLeave}
                    disabled={leaving}
                    className="w-full flex items-center justify-center gap-2 bg-red-500/10 text-red-400 px-4 py-3 rounded-xl text-sm font-medium active:scale-95 transition-transform disabled:opacity-50"
                  >
                    {leaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <LogOut className="w-4 h-4" />
                    )}
                    {t('social.leaveChallenge')}
                  </button>
                )}

                {userIsCreator && (
                  <p className="text-center text-xs text-telegram-hint mt-2">
                    {t('social.creatorCannotLeave')}
                  </p>
                )}
              </>
            )}
          </motion.div>
          </FocusTrap>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
