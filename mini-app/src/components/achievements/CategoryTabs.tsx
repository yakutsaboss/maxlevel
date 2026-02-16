import { useTranslation } from 'react-i18next';
import type { HapticImpactOnly } from '@/types/telegram';

const CATEGORY_ICONS: Record<string, string> = {
  all: '',
  fitness: '',
  hydration: '',
  finance: '',
  learning: '',
  medication: '',
  habits: '',
  social: '',
  streak: '',
  xp: '',
  quest: '',
  special: '',
  general: '',
};

const CATEGORY_I18N: Record<string, string> = {
  all: 'achievements.categoryAll',
  fitness: 'achievements.categoryFitness',
  hydration: 'achievements.categoryHydration',
  finance: 'achievements.categoryFinance',
  learning: 'achievements.categoryLearning',
  medication: 'achievements.categoryMedication',
  habits: 'achievements.categoryHabits',
  social: 'achievements.categorySocial',
  streak: 'achievements.categoryStreak',
  xp: 'achievements.categoryXp',
  quest: 'achievements.categoryQuest',
  special: 'achievements.categorySpecial',
  general: 'achievements.categoryGeneral',
};

interface CategoryCounts {
  earned: number;
  total: number;
}

interface CategoryTabsProps {
  categories: string[];
  activeCategory: string;
  onSelect: (cat: string) => void;
  counts: Record<string, CategoryCounts>;
  haptic: HapticImpactOnly;
}

export function CategoryTabs({ categories, activeCategory, onSelect, counts, haptic }: CategoryTabsProps) {
  const { t } = useTranslation();

  return (
    <div
      className="flex gap-2 overflow-x-auto hide-scrollbar mt-3 -mx-1 px-1 pb-1"
      role="tablist"
      aria-label="Achievement category filter"
    >
      {categories.map(cat => {
        const isActive = activeCategory === cat;
        const count = counts[cat];
        const icon = CATEGORY_ICONS[cat] || '';
        const label = CATEGORY_I18N[cat] ? t(CATEGORY_I18N[cat]) : cat;

        return (
          <button
            key={cat}
            role="tab"
            aria-selected={isActive}
            aria-label={`Filter by ${label}`}
            onClick={() => {
              haptic.impact('light');
              onSelect(cat);
            }}
            className={`shrink-0 flex items-center gap-1.5 py-1.5 px-3 rounded-xl font-medium text-sm transition-all ${
              isActive
                ? 'bg-white text-orange-600 shadow-lg'
                : 'bg-white/20 text-white/70'
            }`}
          >
            {icon && <span className="text-sm">{icon}</span>}
            <span>{label}</span>
            {count && (
              <span className={`text-[10px] font-bold ml-0.5 ${
                isActive ? 'text-orange-400' : 'text-white/50'
              }`}>
                {count.earned}/{count.total}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Derive which category an achievement belongs to based on its criteria */
export function getAchievementCategory(criteria?: Record<string, unknown>): string {
  if (!criteria || !criteria.type) return 'general';

  const type = criteria.type as string;
  const mode = criteria.mode as string | undefined;

  // If criteria has a mode field, use it as category
  if (mode) {
    // Streak with a mode is still the mode category
    if (type === 'streak' || type === 'quest_complete' || type === 'quest_complete_consecutive') {
      return mode;
    }
    return mode;
  }

  // Social achievements
  if (['friend_count', 'challenge_created', 'challenge_completed'].includes(type)) {
    return 'social';
  }

  // Global streak (no mode)
  if (type === 'streak') {
    return 'streak';
  }

  // XP/Level milestones
  if (['level', 'level_reached', 'total_xp'].includes(type)) {
    return 'xp';
  }

  // Quest count
  if (type === 'quest_count') {
    return 'quest';
  }

  // Special achievements
  if (['night_quest', 'early_quest', 'weekend_quests', 'all_daily_complete', 'multi_mode_active', 'streak_rebuild'].includes(type)) {
    return 'special';
  }

  return 'general';
}
