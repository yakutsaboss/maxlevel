import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { DrumRoller } from '@/components/onboarding/ui/DrumRoller';

describe('DrumRoller', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with initial value displayed', () => {
    render(
      <DrumRoller min={1} max={10} value={5} onChange={mockOnChange} />
    );
    // The current value should be visible as text content
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders items with formatLabel', () => {
    render(
      <DrumRoller
        min={1}
        max={3}
        value={2}
        onChange={mockOnChange}
        formatLabel={(v) => `${v}x`}
      />
    );
    expect(screen.getByText('1x')).toBeInTheDocument();
    expect(screen.getByText('2x')).toBeInTheDocument();
    expect(screen.getByText('3x')).toBeInTheDocument();
  });

  it('renders all items from min to max', () => {
    render(
      <DrumRoller min={1} max={5} value={3} onChange={mockOnChange} />
    );
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByText(String(i))).toBeInTheDocument();
    }
  });
});
