import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuestDifficultyBadge } from '@/components/QuestDifficultyBadge';

describe('QuestDifficultyBadge', () => {
  it('renders easy difficulty with green colors', () => {
    const { container } = render(<QuestDifficultyBadge difficulty="easy" />);

    const badge = container.querySelector('span');
    expect(badge).toBeTruthy();
    expect(badge!.textContent).toBe('easy');
    expect(badge!.className).toContain('bg-green-100');
    expect(badge!.className).toContain('text-green-700');
  });

  it('renders medium difficulty with yellow colors', () => {
    const { container } = render(<QuestDifficultyBadge difficulty="medium" />);

    const badge = container.querySelector('span');
    expect(badge!.textContent).toBe('medium');
    expect(badge!.className).toContain('bg-yellow-100');
    expect(badge!.className).toContain('text-yellow-700');
  });

  it('renders hard difficulty with red colors and capitalizes in md size', () => {
    const { container } = render(<QuestDifficultyBadge difficulty="hard" size="md" />);

    const badge = container.querySelector('span');
    // md size capitalizes the label
    expect(badge!.textContent).toBe('Hard');
    expect(badge!.className).toContain('bg-red-100');
    expect(badge!.className).toContain('text-red-700');
    // md size uses larger classes
    expect(badge!.className).toContain('text-sm');
    expect(badge!.className).toContain('font-semibold');
  });
});
