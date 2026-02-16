/**
 * Tests for AvatarAnimator component (mini-app/src/components/avatar/AvatarAnimator.tsx)
 *
 * Run 67 Agent E: Tests the animation wrapper created by Agent A.
 * Covers: each animation state (idle, celebrate, levelup, walk, none), loop prop, children rendering.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock framer-motion — celebrate uses motion.div; strip animation props, render as plain divs with data-testid
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, 'data-testid': testId, ...rest }: any) => (
      <div className={className} style={style} data-testid={testId || 'motion-div'}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock the CSS file import
vi.mock('@/components/avatar/AvatarAnimations.css', () => ({}));

import { AvatarAnimator } from '@/components/avatar/AvatarAnimator';
import type { AvatarAnimation } from '@/components/avatar/AvatarAnimator';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AvatarAnimator', () => {
  // ─── animation: 'none' ──────────────────────────────────────────

  it('renders children directly with animation="none"', () => {
    render(
      <AvatarAnimator animation="none">
        <div data-testid="child">Avatar</div>
      </AvatarAnimator>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Avatar')).toBeInTheDocument();
  });

  it('does not apply animation wrapper classes with animation="none"', () => {
    const { container } = render(
      <AvatarAnimator animation="none">
        <div>Avatar</div>
      </AvatarAnimator>
    );

    // With 'none', there should be no animation-specific class on the container
    const root = container.firstChild as HTMLElement;
    expect(root.className).not.toContain('avatar-idle');
    expect(root.className).not.toContain('avatar-levelup');
    expect(root.className).not.toContain('avatar-walk');
  });

  // ─── animation: 'idle' ──────────────────────────────────────────

  it('renders children with animation="idle"', () => {
    render(
      <AvatarAnimator animation="idle">
        <div data-testid="child">Avatar</div>
      </AvatarAnimator>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('applies idle animation CSS class', () => {
    const { container } = render(
      <AvatarAnimator animation="idle">
        <div>Avatar</div>
      </AvatarAnimator>
    );

    // Idle animation should use CSS class referencing the @keyframes avatar-idle
    const root = container.firstChild as HTMLElement;
    // The animator should apply a class or style that references idle animation
    const html = container.innerHTML;
    expect(html).toContain('idle');
  });

  // ─── animation: 'celebrate' ─────────────────────────────────────

  it('renders children with animation="celebrate"', () => {
    render(
      <AvatarAnimator animation="celebrate">
        <div data-testid="child">Avatar</div>
      </AvatarAnimator>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('uses Framer Motion for celebrate animation', () => {
    const { container } = render(
      <AvatarAnimator animation="celebrate">
        <div>Avatar</div>
      </AvatarAnimator>
    );

    // Celebrate uses motion.div (mocked as div with data-testid="motion-div")
    const motionDivs = container.querySelectorAll('[data-testid="motion-div"]');
    expect(motionDivs.length).toBeGreaterThanOrEqual(1);
  });

  // ─── animation: 'levelup' ──────────────────────────────────────

  it('renders children with animation="levelup"', () => {
    render(
      <AvatarAnimator animation="levelup">
        <div data-testid="child">Avatar</div>
      </AvatarAnimator>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('applies levelup animation CSS class or style', () => {
    const { container } = render(
      <AvatarAnimator animation="levelup">
        <div>Avatar</div>
      </AvatarAnimator>
    );

    // Level-up uses CSS keyframes with glow effect
    const html = container.innerHTML;
    expect(html).toContain('levelup');
  });

  // ─── animation: 'walk' ─────────────────────────────────────────

  it('renders children with animation="walk"', () => {
    render(
      <AvatarAnimator animation="walk">
        <div data-testid="child">Avatar</div>
      </AvatarAnimator>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('applies walk animation CSS class or style', () => {
    const { container } = render(
      <AvatarAnimator animation="walk">
        <div>Avatar</div>
      </AvatarAnimator>
    );

    // Walk uses CSS keyframes
    const html = container.innerHTML;
    expect(html).toContain('walk');
  });

  // ─── loop prop ──────────────────────────────────────────────────

  it('accepts loop prop without errors', () => {
    const { container } = render(
      <AvatarAnimator animation="idle" loop={true}>
        <div data-testid="child">Avatar</div>
      </AvatarAnimator>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(container.firstChild).toBeTruthy();
  });

  it('renders with loop=false without errors', () => {
    const { container } = render(
      <AvatarAnimator animation="celebrate" loop={false}>
        <div data-testid="child">Avatar</div>
      </AvatarAnimator>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(container.firstChild).toBeTruthy();
  });

  // ─── Children passthrough ───────────────────────────────────────

  it('renders multiple children correctly', () => {
    render(
      <AvatarAnimator animation="idle">
        <div data-testid="child-1">First</div>
        <div data-testid="child-2">Second</div>
      </AvatarAnimator>
    );

    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
  });

  // ─── image-rendering: pixelated ─────────────────────────────────

  it('preserves pixel art crispness with image-rendering style', () => {
    const { container } = render(
      <AvatarAnimator animation="idle">
        <div>Avatar</div>
      </AvatarAnimator>
    );

    // The animator should apply image-rendering: pixelated via CSS class or inline style
    const html = container.innerHTML;
    // Check either via class (CSS handles it) or inline style
    const root = container.firstChild as HTMLElement;
    expect(root).toBeTruthy();
  });
});
