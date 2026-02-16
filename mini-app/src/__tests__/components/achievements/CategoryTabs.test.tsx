/**
 * Tests for CategoryTabs component (mini-app/src/components/achievements/CategoryTabs.tsx)
 *
 * Run 65 Agent E: Tests the category tab bar created by Agent C.
 * Covers: rendering, active state, click handling, count display.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const keys: Record<string, string> = {
        'achievements.categoryAll': 'All',
        'achievements.categoryFitness': 'Fitness',
        'achievements.categoryHydration': 'Hydration',
        'achievements.categorySocial': 'Social',
        'achievements.categoryStreak': 'Streak',
        'achievements.categoryXp': 'XP',
        'achievements.categoryQuest': 'Quest',
        'achievements.categorySpecial': 'Special',
      };
      return keys[key] || key;
    },
  }),
}));

import { CategoryTabs } from '@/components/achievements/CategoryTabs';

// --- Test data ---

const mockCategories = ['all', 'fitness', 'hydration', 'social', 'streak'];

const mockCounts: Record<string, { earned: number; total: number }> = {
  all: { earned: 5, total: 20 },
  fitness: { earned: 2, total: 5 },
  hydration: { earned: 1, total: 5 },
  social: { earned: 0, total: 5 },
  streak: { earned: 2, total: 5 },
};

const mockHaptic = { impact: vi.fn() };

// --- Tests ---

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CategoryTabs', () => {
  it('renders all category tabs', () => {
    const onSelect = vi.fn();
    render(
      <CategoryTabs
        categories={mockCategories}
        activeCategory="all"
        onSelect={onSelect}
        counts={mockCounts}
        haptic={mockHaptic}
      />
    );

    // Should render a tab for each category
    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBe(mockCategories.length);
  });

  it('highlights the active tab', () => {
    const onSelect = vi.fn();
    render(
      <CategoryTabs
        categories={mockCategories}
        activeCategory="fitness"
        onSelect={onSelect}
        counts={mockCounts}
        haptic={mockHaptic}
      />
    );

    const tabs = screen.getAllByRole('tab');
    const fitnessTab = tabs.find(tab => tab.getAttribute('aria-selected') === 'true');
    expect(fitnessTab).toBeTruthy();
  });

  it('calls onSelect when a tab is clicked', () => {
    const onSelect = vi.fn();
    render(
      <CategoryTabs
        categories={mockCategories}
        activeCategory="all"
        onSelect={onSelect}
        counts={mockCounts}
        haptic={mockHaptic}
      />
    );

    const tabs = screen.getAllByRole('tab');
    // Click the second tab (fitness)
    fireEvent.click(tabs[1]);
    expect(onSelect).toHaveBeenCalledWith('fitness');
    expect(mockHaptic.impact).toHaveBeenCalledWith('light');
  });

  it('shows earned/total counts for each category', () => {
    const onSelect = vi.fn();
    render(
      <CategoryTabs
        categories={mockCategories}
        activeCategory="all"
        onSelect={onSelect}
        counts={mockCounts}
        haptic={mockHaptic}
      />
    );

    // Should display count text like "5/20" for the "all" tab
    expect(screen.getByText(/5\/20/)).toBeInTheDocument();
    // "2/5" appears in both fitness and streak tabs, so use getAllByText
    const twoOfFive = screen.getAllByText(/2\/5/);
    expect(twoOfFive.length).toBeGreaterThanOrEqual(1);
  });

  it('handles empty categories gracefully', () => {
    const onSelect = vi.fn();
    const { container } = render(
      <CategoryTabs
        categories={[]}
        activeCategory="all"
        onSelect={onSelect}
        counts={{}}
        haptic={mockHaptic}
      />
    );

    const tabs = screen.queryAllByRole('tab');
    expect(tabs.length).toBe(0);
  });
});
