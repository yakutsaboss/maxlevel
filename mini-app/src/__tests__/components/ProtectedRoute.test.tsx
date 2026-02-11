import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { framerMotionMock } from '@/test/mocks/framer-motion';

vi.mock('framer-motion', () => framerMotionMock);

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  Navigate: ({ to, replace }: { to: string; replace?: boolean }) => (
    <div data-testid="navigate" data-to={to} data-replace={String(replace)} />
  ),
}));

vi.mock('@/components/LazyPageWrapper', () => ({
  LazyPageWrapper: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="lazy-wrapper">{children}</div>
  ),
}));

import { ProtectedRoute } from '@/components/ProtectedRoute';

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children when needsOnboarding is false', () => {
    render(
      <ProtectedRoute needsOnboarding={false}>
        <div>Protected content</div>
      </ProtectedRoute>
    );
    expect(screen.getByText('Protected content')).toBeInTheDocument();
    expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
  });

  it('redirects to onboarding when needsOnboarding is true', () => {
    render(
      <ProtectedRoute needsOnboarding={true}>
        <div>Protected content</div>
      </ProtectedRoute>
    );
    const nav = screen.getByTestId('navigate');
    expect(nav).toHaveAttribute('data-to', '/onboarding');
    expect(nav).toHaveAttribute('data-replace', 'true');
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('wraps content in LazyPageWrapper when lazy prop is true', () => {
    render(
      <ProtectedRoute needsOnboarding={false} lazy>
        <div>Lazy content</div>
      </ProtectedRoute>
    );
    expect(screen.getByTestId('lazy-wrapper')).toBeInTheDocument();
    expect(screen.getByText('Lazy content')).toBeInTheDocument();
  });
});
