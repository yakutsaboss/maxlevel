import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';
import { ProgressBar } from './ui/ProgressBar';
import type { OnboardingData } from '@/hooks/useOnboarding';

interface ToggleRowProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ label, description, value, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="font-medium text-telegram-text text-sm">{label}</p>
        <p className="text-xs text-telegram-hint">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-12 h-7 rounded-full transition-all flex-shrink-0 ml-3 ${
          value ? 'bg-telegram-link' : 'bg-telegram-hint/30'
        }`}
      >
        <div
          className={`w-5 h-5 bg-white rounded-full transition-transform mx-1 ${
            value ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

interface NotificationPrefsProps {
  progress: number;
  stepLabel?: string;
  data: OnboardingData;
  onUpdate: (prefs: OnboardingData['notification_preferences']) => void;
  onNext: () => void;
}

export function NotificationPrefs({ progress, stepLabel, data, onUpdate, onNext }: NotificationPrefsProps) {
  const { t } = useTranslation();
  const { haptic } = useTelegram();
  const existing = data.notification_preferences || {};

  const [prefs, setPrefs] = useState({
    quest_reminders: existing.quest_reminders !== false,
    daily_summary: existing.daily_summary !== false,
    achievement_alerts: existing.achievement_alerts !== false,
    streak_warnings: existing.streak_warnings !== false,
  });

  const update = (key: string, value: boolean) => {
    haptic.selection();
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    onUpdate(next);
  };

  return (
    <div className="min-h-screen flex flex-col bg-telegram-bg">
      <ProgressBar progress={progress} stepLabel={stepLabel} />

      <div className="flex-1 flex flex-col px-6 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <Bell className="w-10 h-10 text-telegram-link mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-telegram-text mb-1">{t('onboarding.notifications')}</h2>
          <p className="text-telegram-hint text-sm">{t('onboarding.stayOnTrack')}</p>
        </motion.div>

        <div className="bg-telegram-secondaryBg rounded-2xl px-4 divide-y divide-telegram-hint/10">
          <ToggleRow
            label={t('onboarding.taskReminders')}
            description={t('onboarding.taskRemindersDesc')}
            value={prefs.quest_reminders}
            onChange={(v) => update('quest_reminders', v)}
          />
          <ToggleRow
            label={t('onboarding.dailySummary')}
            description={t('onboarding.dailySummaryDesc')}
            value={prefs.daily_summary}
            onChange={(v) => update('daily_summary', v)}
          />
          <ToggleRow
            label={t('onboarding.achievementAlerts')}
            description={t('onboarding.achievementAlertsDesc')}
            value={prefs.achievement_alerts}
            onChange={(v) => update('achievement_alerts', v)}
          />
          <ToggleRow
            label={t('onboarding.streakWarnings')}
            description={t('onboarding.streakWarningsDesc')}
            value={prefs.streak_warnings}
            onChange={(v) => update('streak_warnings', v)}
          />
        </div>

        <p className="text-xs text-telegram-hint text-center mt-4">
          {t('onboarding.changeInSettings')}
        </p>
      </div>

      <div className="px-6 pb-8">
        <button
          onClick={() => { haptic.impact('medium'); onNext(); }}
          className="w-full py-4 rounded-2xl text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg"
        >
          {t('onboarding.continue')}
        </button>
      </div>
    </div>
  );
}
