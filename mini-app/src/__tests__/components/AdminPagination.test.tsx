import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('lucide-react', () => ({
  ChevronLeft: (props: any) => <span data-testid="chevron-left" {...props} />,
  ChevronRight: (props: any) => <span data-testid="chevron-right" {...props} />,
}));

import { AdminPagination } from '@/components/AdminPagination';

describe('AdminPagination', () => {
  const defaultProps = {
    page: 2,
    totalPages: 5,
    onPageChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders current page info', () => {
    render(<AdminPagination {...defaultProps} />);

    expect(screen.getByText('Page 2 of 5')).toBeInTheDocument();
  });

  it('prev and next buttons trigger onPageChange', () => {
    const onPageChange = vi.fn();
    render(<AdminPagination {...defaultProps} onPageChange={onPageChange} />);

    const buttons = screen.getAllByRole('button');
    const prevButton = buttons[0];
    const nextButton = buttons[1];

    fireEvent.click(prevButton);
    expect(onPageChange).toHaveBeenCalledWith(1);

    fireEvent.click(nextButton);
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('disables prev on first page and next on last page', () => {
    const { rerender } = render(
      <AdminPagination page={1} totalPages={5} onPageChange={vi.fn()} />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toBeDisabled(); // prev disabled on page 1
    expect(buttons[1]).not.toBeDisabled(); // next enabled

    rerender(
      <AdminPagination page={5} totalPages={5} onPageChange={vi.fn()} />
    );

    const buttonsAfter = screen.getAllByRole('button');
    expect(buttonsAfter[0]).not.toBeDisabled(); // prev enabled
    expect(buttonsAfter[1]).toBeDisabled(); // next disabled on last page
  });
});
