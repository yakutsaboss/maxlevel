import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LeaderboardSkeleton } from '@/components/leaderboard/LeaderboardSkeleton';

describe('LeaderboardSkeleton', () => {
  it('renders skeleton placeholders', () => {
    const { container } = render(<LeaderboardSkeleton />);

    // Header skeleton elements (title + subtitle)
    const skeletonElements = container.querySelectorAll('.skeleton, .skeleton-text');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it('renders exactly 6 skeleton rows', () => {
    const { container } = render(<LeaderboardSkeleton />);

    // Each row has a rounded-2xl card wrapper with border
    const rows = container.querySelectorAll('.bg-telegram-secondaryBg.rounded-2xl');
    expect(rows).toHaveLength(6);
  });
});
