import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { SliderInput } from '@/components/onboarding/ui/SliderInput';

describe('SliderInput', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with value and suffix', () => {
    render(
      <SliderInput min={1} max={5} step={1} value={3} onChange={mockOnChange} />
    );
    // Default suffix is 'x'
    expect(screen.getByText('3x')).toBeInTheDocument();
  });

  it('calls onChange when range input changes', () => {
    render(
      <SliderInput min={1} max={5} step={1} value={3} onChange={mockOnChange} />
    );
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '4' } });
    expect(mockOnChange).toHaveBeenCalledWith(4);
  });

  it('displays min/max range labels and flavor text', () => {
    render(
      <SliderInput
        min={1}
        max={5}
        step={1}
        value={3}
        onChange={mockOnChange}
        flavorText={{ '3': 'Balanced' }}
        valueSuffix="/day"
      />
    );
    expect(screen.getByText('Less')).toBeInTheDocument();
    expect(screen.getByText('More')).toBeInTheDocument();
    expect(screen.getByText('Balanced')).toBeInTheDocument();
    expect(screen.getByText('3/day')).toBeInTheDocument();
  });
});
