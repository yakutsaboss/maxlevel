import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

const AVATAR_KEYS: Record<string, string> = {
  gym_warrior: 'onboardingQuiz.summary.avatar.gym_warrior',
  office_boss: 'onboardingQuiz.summary.avatar.office_boss',
  magic_pet: 'onboardingQuiz.summary.avatar.magic_pet',
  night_owl: 'onboardingQuiz.summary.avatar.night_owl',
  couch_hero: 'onboardingQuiz.summary.avatar.couch_hero',
  male: 'onboardingQuiz.summary.avatar.male',
  female: 'onboardingQuiz.summary.avatar.female',
  other: 'onboardingQuiz.summary.avatar.other',
};

interface SummaryStatsProps {
  name: string;
  gender?: string;
}

export function SummaryStats({ name, gender }: SummaryStatsProps) {
  const { t } = useTranslation();
  const avatarKey = AVATAR_KEYS[gender || ''];
  const avatarLabel = avatarKey ? t(avatarKey) : (gender || t('onboardingQuiz.summary.avatar.unknown'));

  return (
    <motion.div
      className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-5 mb-4 shadow-lg"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white text-xl font-bold">{name}</h3>
          <p className="text-purple-200 text-sm">{avatarLabel}</p>
        </div>
        <div className="bg-white/20 rounded-xl px-3 py-1.5 text-center">
          <div className="text-white text-2xl font-bold">1</div>
          <div className="text-purple-200 text-xs">{t('onboardingQuiz.summary.level')}</div>
        </div>
      </div>
      <div className="mt-3 bg-white/20 rounded-full h-2">
        <div className="h-full bg-yellow-400 rounded-full" style={{ width: '10%' }} />
      </div>
      <p className="text-purple-200 text-xs mt-1 text-right">0 / 500 {t('onboardingQuiz.summary.xp')}</p>
    </motion.div>
  );
}
