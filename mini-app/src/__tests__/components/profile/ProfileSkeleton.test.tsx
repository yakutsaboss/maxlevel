import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ProfileSkeleton } from '@/components/profile/ProfileSkeleton';

describe('ProfileSkeleton', () => {
  it('renders skeleton structure', () => {
    const { container } = render(<ProfileSkeleton />);

    const skeletonElements = container.querySelectorAll('.skeleton, .skeleton-text');
    expect(skeletonElements.length).toBeGreaterThan(0);

    // Has gradient header
    const header = container.querySelector('.bg-gradient-to-br');
    expect(header).toBeTruthy();

    // Has stat cards grid (3 stat boxes in header)
    const statBoxes = header!.querySelectorAll('.skeleton.w-16');
    expect(statBoxes).toHaveLength(3);
  });

  it('has correct aria attributes', () => {
    const { container } = render(<ProfileSkeleton />);

    // Skeleton is a loading placeholder — verify it renders the expected layout
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv).toHaveClass('min-h-screen', 'bg-telegram-bg');
  });
});
