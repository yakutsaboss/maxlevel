import { memo } from 'react';
import { Target, Zap, Clock, Calendar } from 'lucide-react';

interface TodaysProgressProps {
  completedToday: number;
  xpGainedToday: number;
  activeQuestsCount: number;
}

export const TodaysProgress = memo(function TodaysProgress({ completedToday, xpGainedToday, activeQuestsCount }: TodaysProgressProps) {
  return (
    <div className="px-4 mt-6">
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-telegram-link" />Today's Progress
      </h2>
      <div className={`rounded-2xl p-4 shadow-sm ${completedToday > 0 ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20' : 'bg-telegram-secondaryBg border border-telegram-hint/10'}`}>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 ${completedToday > 0 ? 'bg-green-500' : 'bg-telegram-hint/30'}`}>
              <Target className={`w-5 h-5 ${completedToday > 0 ? 'text-white' : 'text-telegram-hint'}`} />
            </div>
            <div className={`text-xl font-bold ${completedToday > 0 ? 'text-green-600' : 'text-telegram-text'}`}>{completedToday}</div>
            <div className="text-xs text-telegram-hint">Completed</div>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 bg-yellow-500">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="text-xl font-bold text-yellow-600">+{xpGainedToday}</div>
            <div className="text-xs text-telegram-hint">XP Earned</div>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 bg-blue-500">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div className="text-xl font-bold text-telegram-text">{activeQuestsCount}</div>
            <div className="text-xs text-telegram-hint">Remaining</div>
          </div>
        </div>
      </div>
    </div>
  );
});
