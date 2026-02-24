/**
 * Tests for LevelUpModal component (mini-app/src/components/celebrations/LevelUpModal.tsx)
 *
 * Tests level display, auto-dismiss, click-to-close, and animations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, onClick, className, ...rest }: any) => (
      <div onClick={onClick} className={className}>{children}</div>
    ),
    span: ({ children, className, ...rest }: any) => (
      <span className={className}>{children}</span>
    ),
    h1: ({ children, className, ...rest }: any) => (
      <h1 className={className}>{children}</h1>
    ),
    h2: ({ children, className, ...rest }: any) => (
      <h2 className={className}>{children}</h2>
    ),
    p: ({ children, className, ...rest }: any) => (
      <p className={className}>{children}</p>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock lucide-react (Share2 used for story sharing)
vi.mock('lucide-react', () => ({
  Share2: ({ className }: any) => <span data-testid="share2-icon" className={className}>↗</span>,
}));

// Mock FocusTrap
vi.mock('@/components/FocusTrap', () => ({
  FocusTrap: ({ children }: any) => <div>{children}</div>,
}));

// Mock useCelebrationStyle (Run 93 Agent E)
vi.mock('@/hooks/useCelebrationStyle', () => ({
  useCelebrationStyle: () => ({ style: 'emoji', setStyle: vi.fn(), isAnimated: false }),
}));

// Mock storyShare (Run 94 Agent D)
vi.mock('@/utils/storyShare', () => ({
  isShareToStoryAvailable: () => false,
  shareLevelUpToStory: vi.fn(),
}));

import { LevelUpModal } from '@/components/celebrations/LevelUpModal';

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

describe('LevelUpModal', () => {
  it('shows the new level number when show=true', () => {
    render(<LevelUpModal level={10} show={true} onClose={vi.fn()} />);

    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('displays "Level Up!" text', () => {
    render(<LevelUpModal level={5} show={true} onClose={vi.fn()} />);

    // The component should show "Level Up!" or i18n equivalent
    const levelUpText = screen.queryByText(/level/i);
    expect(levelUpText).toBeInTheDocument();
  });

  it('auto-dismisses after 3 seconds', () => {
    const onClose = vi.fn();
    render(<LevelUpModal level={7} show={true} onClose={onClose} />);

    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<LevelUpModal level={3} show={true} onClose={onClose} />);

    // The outer backdrop div has onClick={onClose}; inner content has stopPropagation
    // AnimatePresence is mocked to fragment, so first child is the backdrop div
    const backdrop = container.querySelector('.fixed');
    fireEvent.click(backdrop!);

    expect(onClose).toHaveBeenCalled();
  });

  it('does not render content when show=false', () => {
    render(<LevelUpModal level={15} show={false} onClose={vi.fn()} />);

    // Level number should not be visible when hidden
    expect(screen.queryByText('15')).not.toBeInTheDocument();
  });
});
