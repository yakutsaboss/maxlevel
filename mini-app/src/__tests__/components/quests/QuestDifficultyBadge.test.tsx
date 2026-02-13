import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { QuestDifficultyBadge } from '@/components/QuestDifficultyBadge';

describe('QuestDifficultyBadge', () => {
  it('renders "easy" with green styling', () => {
    const { container } = render(<QuestDifficultyBadge difficulty="easy" />);
    const badge = container.querySelector('span')!;
    expect(badge.textContent).toBe('easy');
    expect(badge.className).toContain('bg-green-100');
    expect(badge.className).toContain('text-green-700');
  });

  it('renders "medium" with yellow styling', () => {
    const { container } = render(<QuestDifficultyBadge difficulty="medium" />);
    const badge = container.querySelector('span')!;
    expect(badge.textContent).toBe('medium');
    expect(badge.className).toContain('bg-yellow-100');
    expect(badge.className).toContain('text-yellow-700');
  });

  it('renders "hard" with red styling', () => {
    const { container } = render(<QuestDifficultyBadge difficulty="hard" />);
    const badge = container.querySelector('span')!;
    expect(badge.textContent).toBe('hard');
    expect(badge.className).toContain('bg-red-100');
    expect(badge.className).toContain('text-red-700');
  });

  it('falls back to hard colors for unknown difficulty', () => {
    const { container } = render(<QuestDifficultyBadge difficulty="legendary" />);
    const badge = container.querySelector('span')!;
    expect(badge.textContent).toBe('legendary');
    expect(badge.className).toContain('bg-red-100');
    expect(badge.className).toContain('text-red-700');
  });

  it('applies sm size classes by default', () => {
    const { container } = render(<QuestDifficultyBadge difficulty="easy" />);
    const badge = container.querySelector('span')!;
    expect(badge.className).toContain('text-xs');
    expect(badge.className).toContain('px-2');
    expect(badge.className).toContain('rounded-full');
  });

  it('applies md size classes and capitalizes label', () => {
    const { container } = render(<QuestDifficultyBadge difficulty="medium" size="md" />);
    const badge = container.querySelector('span')!;
    expect(badge.textContent).toBe('Medium');
    expect(badge.className).toContain('text-sm');
    expect(badge.className).toContain('px-3');
    expect(badge.className).toContain('rounded-xl');
    expect(badge.className).toContain('font-semibold');
  });
});
