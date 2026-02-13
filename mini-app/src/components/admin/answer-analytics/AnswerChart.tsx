import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { formatLabel, getBarColor } from '@/components/admin/answer-analytics/useAnswerAnalytics';
import type { QuestionStat } from '@/components/admin/answer-analytics/useAnswerAnalytics';

interface AnswerChartProps {
  question: QuestionStat;
  isExpanded: boolean;
  onToggle: () => void;
}

export function AnswerChart({ question, isExpanded, onToggle }: AnswerChartProps) {
  const totalResponses = Object.values(question.responses).reduce((a, b) => a + b, 0);
  const entries = Object.entries(question.responses).sort(([, a], [, b]) => b - a);
  const topEntries = isExpanded ? entries : entries.slice(0, 4);
  const hasMore = entries.length > 4;

  return (
    <div className="bg-telegram-secondaryBg rounded-xl p-4 space-y-2.5">
      {/* Question header */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-telegram-text">
          {question.label || formatLabel(question.key)}
        </div>
        <div className="text-[10px] text-telegram-hint px-2 py-0.5 bg-telegram-bg rounded-full">
          {totalResponses} answers
        </div>
      </div>

      {/* Most common answer */}
      {question.most_common && (
        <div className="text-xs text-telegram-hint">
          Most common: <span className="text-telegram-link font-medium">{formatLabel(question.most_common)}</span>
        </div>
      )}

      {/* Distribution bars */}
      <div className="space-y-1.5">
        {topEntries.map(([answer, count], idx) => {
          const pct = totalResponses > 0 ? (count / totalResponses) * 100 : 0;
          return (
            <div key={answer} className="space-y-0.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-telegram-text truncate max-w-[60%]">
                  {formatLabel(answer)}
                </span>
                <span className="text-telegram-hint flex-shrink-0 ml-2">
                  {count} ({Math.round(pct)}%)
                </span>
              </div>
              <div className="h-2 bg-telegram-bg rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${getBarColor(idx)}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Show more/less */}
      {hasMore && (
        <button
          onClick={onToggle}
          className="flex items-center gap-1 text-xs text-telegram-link hover:underline"
        >
          <ChevronDown
            size={12}
            className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
          {isExpanded ? 'Show less' : `Show all ${entries.length} options`}
        </button>
      )}
    </div>
  );
}
