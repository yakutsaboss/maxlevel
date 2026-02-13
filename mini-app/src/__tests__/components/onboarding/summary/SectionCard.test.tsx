import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className}>{children}</div>
    ),
  },
}));

import { SectionCard } from '@/components/onboarding/summary/SectionCard';

describe('SectionCard', () => {
  const mockOnEdit = vi.fn();

  it('renders title and children', () => {
    render(
      <SectionCard title="Test Section" onEdit={mockOnEdit} delay={0.1}>
        <p>Child content</p>
      </SectionCard>
    );

    expect(screen.getByText('Test Section')).toBeInTheDocument();
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders Edit button', () => {
    render(
      <SectionCard title="My Section" onEdit={mockOnEdit} delay={0}>
        <span>Content</span>
      </SectionCard>
    );

    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('calls onEdit when Edit button is clicked', () => {
    render(
      <SectionCard title="Editable" onEdit={mockOnEdit} delay={0}>
        <div>Body</div>
      </SectionCard>
    );

    fireEvent.click(screen.getByText('Edit'));
    expect(mockOnEdit).toHaveBeenCalledTimes(1);
  });

  it('renders multiple children', () => {
    render(
      <SectionCard title="Multi" onEdit={mockOnEdit} delay={0}>
        <span>First</span>
        <span>Second</span>
      </SectionCard>
    );

    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });
});
