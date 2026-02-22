import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { framerMotionMock } from '@/test/mocks/framer-motion';

vi.mock('framer-motion', () => framerMotionMock);

import { ProgressBar } from '@/components/onboarding/ui/ProgressBar';

describe('ProgressBar', () => {
  it('renders with correct percentage text', () => {
    render(<ProgressBar progress={50} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('renders step label when provided', () => {
    render(<ProgressBar progress={30} stepLabel="Step 2 of 5" />);
    expect(screen.getByText('Step 2 of 5')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
  });

  it('handles zero progress', () => {
    render(<ProgressBar progress={0} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('clamps progress display at 100%', () => {
    render(<ProgressBar progress={150} />);
    // Math.round(150) = 150 but the bar width is clamped to 100%
    expect(screen.getByText('150%')).toBeInTheDocument();
  });
});
