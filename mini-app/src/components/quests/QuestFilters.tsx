import { Mode } from '@/types';
import { ArrowUpDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type SortOption = 'newest' | 'xp_reward' | 'progress';

interface QuestFiltersProps {
  modes: Mode[];
  selectedModeId: number | null;
  onModeSelect: (modeId: number | null) => void;
  selectedDifficulty: string | null;
  onDifficultySelect: (difficulty: string | null) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  haptic: { selection: () => void };
}

const SORT_LABEL_KEYS: Record<SortOption, string> = {
  newest: 'quests.sortNewest',
  xp_reward: 'quests.sortXpReward',
  progress: 'quests.sortProgress',
};

const SORT_OPTIONS: SortOption[] = ['newest', 'xp_reward', 'progress'];

const DIFFICULTY_OPTIONS: { value: string | null; labelKey: string; activeColor: string }[] = [
  { value: null, labelKey: 'quests.filterAll', activeColor: 'bg-telegram-link text-white shadow-sm' },
  { value: 'easy', labelKey: 'quests.filterEasy', activeColor: 'bg-green-500 text-white shadow-sm' },
  { value: 'medium', labelKey: 'quests.filterMedium', activeColor: 'bg-yellow-500 text-white shadow-sm' },
  { value: 'hard', labelKey: 'quests.filterHard', activeColor: 'bg-red-500 text-white shadow-sm' },
];

export function QuestFilters({ modes, selectedModeId, onModeSelect, selectedDifficulty, onDifficultySelect, sortBy, onSortChange, haptic }: QuestFiltersProps) {
  const { t } = useTranslation();
  const cycleSortOption = () => {
    const currentIndex = SORT_OPTIONS.indexOf(sortBy);
    const nextIndex = (currentIndex + 1) % SORT_OPTIONS.length;
    haptic.selection();
    onSortChange(SORT_OPTIONS[nextIndex]);
  };

  return (
    <div className="px-4 mt-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 pb-1">
            <button
              onClick={() => { haptic.selection(); onModeSelect(null); }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                selectedModeId === null
                  ? 'bg-telegram-link text-white shadow-sm'
                  : 'bg-telegram-secondaryBg text-telegram-hint'
              }`}
            >
              {t('quests.filtersAll')}
            </button>
            {modes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => { haptic.selection(); onModeSelect(mode.id); }}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  selectedModeId === mode.id
                    ? 'bg-telegram-link text-white shadow-sm'
                    : 'bg-telegram-secondaryBg text-telegram-hint'
                }`}
              >
                {mode.icon} {mode.display_name}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={cycleSortOption}
          className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-medium bg-telegram-secondaryBg text-telegram-hint transition-all active:scale-95"
        >
          <ArrowUpDown className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{t(SORT_LABEL_KEYS[sortBy])}</span>
        </button>
      </div>
      <div className="flex gap-2 pb-1">
        {DIFFICULTY_OPTIONS.map((opt) => (
          <button
            key={opt.value ?? 'all'}
            onClick={() => { haptic.selection(); onDifficultySelect(opt.value); }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
              selectedDifficulty === opt.value
                ? opt.activeColor
                : 'bg-telegram-secondaryBg text-telegram-hint'
            }`}
          >
            {t(opt.labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}
