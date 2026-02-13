/**
 * Tests for Confetti component (mini-app/src/components/celebrations/Confetti.tsx)
 *
 * Tests rendering particles, show/hide behavior, and onComplete callback.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

// Mock framer-motion — render motion.div as a plain div with data-testid
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, 'data-testid': testId, ...rest }: any) => (
      <div className={className} data-testid={testId}>{children}</div>
    ),
    span: ({ children, className, 'data-testid': testId, ...rest }: any) => (
      <span className={className} data-testid={testId}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import { Confetti } from '@/components/celebrations/Confetti';

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

describe('Confetti', () => {
  it('renders particles when show=true', () => {
    const { container } = render(<Confetti show={true} />);

    // Confetti should render some particle elements
    // Agent C creates 30-50 particles — check that at least some rendered
    const elements = container.querySelectorAll('div, span');
    expect(elements.length).toBeGreaterThan(0);
  });

  it('does not render when show=false', () => {
    const { container } = render(<Confetti show={false} />);

    // With show=false, nothing should render (or minimal wrapper only)
    // The component uses AnimatePresence so it should not render children
    const innerElements = container.innerHTML;
    // Either empty or just the wrapper — no particle elements
    expect(innerElements.length).toBeLessThan(100);
  });

  it('calls onComplete after auto-dismiss timeout', () => {
    const onComplete = vi.fn();
    render(<Confetti show={true} onComplete={onComplete} />);

    // Confetti auto-dismisses after 2-3 seconds per spec
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onComplete).toHaveBeenCalled();
  });

  it('does not call onComplete when show=false', () => {
    const onComplete = vi.fn();
    render(<Confetti show={false} onComplete={onComplete} />);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onComplete).not.toHaveBeenCalled();
  });
});
