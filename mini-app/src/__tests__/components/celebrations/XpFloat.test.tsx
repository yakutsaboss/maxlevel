/**
 * Tests for XpFloat component (mini-app/src/components/celebrations/XpFloat.tsx)
 *
 * Tests XP amount display, show/hide behavior, and onComplete callback.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...rest }: any) => (
      <div className={className}>{children}</div>
    ),
    span: ({ children, className, ...rest }: any) => (
      <span className={className}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import { XpFloat } from '@/components/celebrations/XpFloat';

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

describe('XpFloat', () => {
  it('shows "+X XP" text when show=true', () => {
    render(<XpFloat amount={50} show={true} />);

    // Should display the XP amount with + prefix
    expect(screen.getByText(/\+50/)).toBeInTheDocument();
  });

  it('shows different amounts correctly', () => {
    const { rerender } = render(<XpFloat amount={100} show={true} />);
    expect(screen.getByText(/\+100/)).toBeInTheDocument();

    rerender(<XpFloat amount={25} show={true} />);
    expect(screen.getByText(/\+25/)).toBeInTheDocument();
  });

  it('does not render when show=false', () => {
    render(<XpFloat amount={50} show={false} />);

    expect(screen.queryByText(/\+50/)).not.toBeInTheDocument();
  });

  it('calls onComplete after animation duration (~1.5s)', () => {
    const onComplete = vi.fn();
    render(<XpFloat amount={30} show={true} onComplete={onComplete} />);

    expect(onComplete).not.toHaveBeenCalled();

    // XpFloat animation is ~1.5 seconds per spec
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(onComplete).toHaveBeenCalled();
  });

  it('does not call onComplete when show=false', () => {
    const onComplete = vi.fn();
    render(<XpFloat amount={30} show={false} onComplete={onComplete} />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onComplete).not.toHaveBeenCalled();
  });
});
