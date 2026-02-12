import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { QuestsSkeleton } from '@/components/quests/QuestsSkeleton';

describe('QuestsSkeleton', () => {
  it('renders skeleton cards', () => {
    const { container } = render(<QuestsSkeleton />);

    // Should render 3 skeleton quest cards
    const cards = container.querySelectorAll('.bg-telegram-secondaryBg.rounded-2xl');
    expect(cards).toHaveLength(3);
  });

  it('matches expected structure with header and card elements', () => {
    const { container } = render(<QuestsSkeleton />);

    // Header gradient section
    const header = container.querySelector('.bg-gradient-to-r');
    expect(header).toBeTruthy();

    // Skeleton placeholder elements exist
    const skeletonElements = container.querySelectorAll('.skeleton, .skeleton-text');
    expect(skeletonElements.length).toBeGreaterThan(0);

    // Each card has skeleton-text elements for title and description
    const skeletonTexts = container.querySelectorAll('.skeleton-text');
    // 3 cards × 2 skeleton-text each = 6
    expect(skeletonTexts).toHaveLength(6);
  });
});
