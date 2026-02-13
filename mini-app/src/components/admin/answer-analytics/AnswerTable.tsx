import { motion } from 'framer-motion';
import { BarChart3, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AnswerChart } from '@/components/admin/answer-analytics/AnswerChart';
import type { ModeAnalyticsData } from '@/components/admin/answer-analytics/useAnswerAnalytics';

interface AnswerTableProps {
  currentMode: ModeAnalyticsData | undefined;
  expandedQ: string | null;
  onToggleQuestion: (key: string) => void;
}

export function AnswerTable({ currentMode, expandedQ, onToggleQuestion }: AnswerTableProps) {
  const { t } = useTranslation();
  if (!currentMode) {
    return (
      <div className="bg-telegram-secondaryBg rounded-xl p-6 text-center space-y-2">
        <BarChart3 size={28} className="text-telegram-hint mx-auto" />
        <p className="text-sm text-telegram-hint">
          {t('admin.noAnalyticsData')}
        </p>
      </div>
    );
  }

  return (
    <motion.div
      key={currentMode.mode_name}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="space-y-2"
    >
      {/* Respondent count card */}
      <div className="bg-telegram-secondaryBg rounded-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-telegram-button/10 flex items-center justify-center">
          <Users size={18} className="text-telegram-button" />
        </div>
        <div>
          <div className="text-xl font-bold text-telegram-text">
            {currentMode.respondent_count.toLocaleString()}
          </div>
          <div className="text-xs text-telegram-hint">
            {currentMode.icon} {currentMode.display_name} {t('admin.respondents')}
          </div>
        </div>
      </div>

      {/* Questions */}
      {currentMode.questions.length === 0 ? (
        <div className="bg-telegram-secondaryBg rounded-xl p-6 text-center">
          <p className="text-sm text-telegram-hint">{t('admin.noResponseData')}</p>
        </div>
      ) : (
        currentMode.questions.map((q) => (
          <AnswerChart
            key={q.key}
            question={q}
            isExpanded={expandedQ === q.key}
            onToggle={() => onToggleQuestion(q.key)}
          />
        ))
      )}
    </motion.div>
  );
}
