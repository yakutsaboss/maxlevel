import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className}>{children}</div>
    ),
  },
}));

import { SummaryStats } from '@/components/onboarding/summary/SummaryStats';

describe('SummaryStats', () => {
  it('renders player name', () => {
    render(<SummaryStats name="TestPlayer" />);

    expect(screen.getByText('TestPlayer')).toBeInTheDocument();
  });

  it('renders level 1 and XP progress', () => {
    render(<SummaryStats name="Hero" />);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Level')).toBeInTheDocument();
    expect(screen.getByText('0 / 500 XP')).toBeInTheDocument();
  });

  it('renders known avatar label for gym_warrior', () => {
    render(<SummaryStats name="Player" gender="gym_warrior" />);

    expect(screen.getByText('Gym Warrior')).toBeInTheDocument();
  });

  it('renders known avatar label for office_boss', () => {
    render(<SummaryStats name="Player" gender="office_boss" />);

    expect(screen.getByText('Office Boss')).toBeInTheDocument();
  });

  it('renders known avatar label for magic_pet', () => {
    render(<SummaryStats name="Player" gender="magic_pet" />);

    expect(screen.getByText('Magic Pet')).toBeInTheDocument();
  });

  it('renders known avatar label for night_owl', () => {
    render(<SummaryStats name="Player" gender="night_owl" />);

    expect(screen.getByText('Night Owl')).toBeInTheDocument();
  });

  it('renders known avatar label for couch_hero', () => {
    render(<SummaryStats name="Player" gender="couch_hero" />);

    expect(screen.getByText('Couch Hero')).toBeInTheDocument();
  });

  it('renders legacy avatar labels', () => {
    render(<SummaryStats name="Player" gender="male" />);
    expect(screen.getByText('Warrior')).toBeInTheDocument();
  });

  it('renders "Unknown" when gender is undefined', () => {
    render(<SummaryStats name="Player" />);

    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('renders gender string as fallback for unknown values', () => {
    render(<SummaryStats name="Player" gender="custom_avatar" />);

    expect(screen.getByText('custom_avatar')).toBeInTheDocument();
  });

  it('renders empty string gender as "Unknown"', () => {
    render(<SummaryStats name="Player" gender="" />);

    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });
});
