import { BarChart3, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAnswerAnalytics, MODE_TABS } from '@/components/admin/answer-analytics/useAnswerAnalytics';
import { AnswerTable } from '@/components/admin/answer-analytics/AnswerTable';

interface AnswerAnalyticsProps {
  credentials: string;
}

export function AnswerAnalytics({ credentials }: AnswerAnalyticsProps) {
  const { t } = useTranslation();
  const {
    data,
    loading,
    error,
    selectedMode,
    expandedQ,
    currentMode,
    fetchData,
    selectMode,
    toggleQuestion,
  } = useAnswerAnalytics(credentials);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-telegram-hint uppercase tracking-wide">
            {t('admin.answerAnalytics')}
          </h3>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-telegram-secondaryBg rounded-xl p-4 h-24 skeleton" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-telegram-hint uppercase tracking-wide">
            {t('admin.answerAnalytics')}
          </h3>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-telegram-secondaryBg rounded-lg text-xs text-telegram-hint hover:text-telegram-text transition-colors"
          >
            <RefreshCw size={14} />
            {t('common.retry')}
          </button>
        </div>
        <div className="bg-telegram-secondaryBg rounded-xl p-6 text-center space-y-2">
          <BarChart3 size={32} className="text-telegram-hint mx-auto" />
          <p className="text-sm text-telegram-hint">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-telegram-hint uppercase tracking-wide">
          Answer Analytics
        </h3>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-telegram-secondaryBg rounded-lg text-xs text-telegram-hint hover:text-telegram-text transition-colors"
        >
          <RefreshCw size={14} />
          {t('common.refresh')}
        </button>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {MODE_TABS.map(tab => {
          const modeData = data.find(m => m.mode_name === tab.name);
          const isActive = selectedMode === tab.name;
          return (
            <button
              key={tab.name}
              onClick={() => selectMode(tab.name)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-telegram-button text-telegram-buttonText'
                  : 'bg-telegram-secondaryBg text-telegram-hint hover:text-telegram-text'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.display}</span>
              {modeData && (
                <span className={`ml-0.5 text-[10px] ${isActive ? 'opacity-80' : 'opacity-60'}`}>
                  ({modeData.respondent_count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Mode content */}
      <AnswerTable
        currentMode={currentMode}
        expandedQ={expandedQ}
        onToggleQuestion={toggleQuestion}
      />
    </div>
  );
}
