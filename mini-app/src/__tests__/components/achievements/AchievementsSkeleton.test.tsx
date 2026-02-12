import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { AchievementsSkeleton } from '@/components/achievements/AchievementsSkeleton';

describe('AchievementsSkeleton', () => {
  it('renders skeleton grid with 6 placeholders', () => {
    const { container } = render(<AchievementsSkeleton />);

    // Should render 6 skeleton achievement cards in a grid
    const cards = container.querySelectorAll('.bg-telegram-secondaryBg.rounded-2xl');
    expect(cards).toHaveLength(6);
  });

  it('matches expected structure with header and grid', () => {
    const { container } = render(<AchievementsSkeleton />);

    // Header gradient section
    const header = container.querySelector('.bg-gradient-to-br');
    expect(header).toBeTruthy();

    // 2-column grid
    const grid = container.querySelector('.grid.grid-cols-2');
    expect(grid).toBeTruthy();

    // Skeleton elements exist
    const skeletonElements = container.querySelectorAll('.skeleton, .skeleton-text');
    expect(skeletonElements.length).toBeGreaterThan(0);

    // Each card has icon skeleton + text skeletons
    const skeletonTexts = container.querySelectorAll('.skeleton-text');
    // 6 cards × 2 skeleton-text each = 12
    expect(skeletonTexts).toHaveLength(12);
  });
});
