import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { ConsentToggle } from '@/components/onboarding/punishment/ConsentToggle';

describe('ConsentToggle', () => {
  const mockOnToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders consent text', () => {
    render(<ConsentToggle consent={false} onToggle={mockOnToggle} />);
    expect(screen.getByText('Enable accountability')).toBeInTheDocument();
    expect(screen.getByText('Choose a real punishment you\'ll actually do')).toBeInTheDocument();
  });

  it('calls onToggle when toggle button is clicked', () => {
    render(<ConsentToggle consent={false} onToggle={mockOnToggle} />);
    const wrapper = screen.getByText('Enable accountability').closest('.bg-telegram-secondaryBg')!;
    const toggleButton = wrapper.querySelector('button')!;
    fireEvent.click(toggleButton);
    expect(mockOnToggle).toHaveBeenCalledTimes(1);
  });

  it('reflects consent=true with active styling', () => {
    const { container } = render(<ConsentToggle consent={true} onToggle={mockOnToggle} />);
    const toggleButton = container.querySelector('button')!;
    expect(toggleButton.className).toContain('bg-red-500');
  });

  it('reflects consent=false with inactive styling', () => {
    const { container } = render(<ConsentToggle consent={false} onToggle={mockOnToggle} />);
    const toggleButton = container.querySelector('button')!;
    expect(toggleButton.className).toContain('bg-telegram-hint/30');
  });
});
