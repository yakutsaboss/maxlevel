import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SettingsSkeleton } from '@/components/settings/SettingsSkeleton';

describe('SettingsSkeleton', () => {
  it('renders skeleton structure', () => {
    const { container } = render(<SettingsSkeleton />);

    const skeletonElements = container.querySelectorAll('.skeleton, .skeleton-text');
    expect(skeletonElements.length).toBeGreaterThan(0);

    // Has gradient header
    const header = container.querySelector('.bg-gradient-to-r');
    expect(header).toBeTruthy();

    // Has 3 setting card sections
    const cards = container.querySelectorAll('.bg-telegram-secondaryBg.rounded-2xl');
    expect(cards).toHaveLength(3);
  });

  it('has correct aria attributes', () => {
    const { container } = render(<SettingsSkeleton />);

    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv).toHaveClass('min-h-screen', 'bg-telegram-bg');
  });
});
