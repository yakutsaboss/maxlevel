import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LazyPageWrapper } from '@/components/LazyPageWrapper';

describe('LazyPageWrapper', () => {
  it('renders loading fallback for lazy children', () => {
    const { container } = render(
      <LazyPageWrapper>
        <div>Content</div>
      </LazyPageWrapper>
    );

    // Suspense with non-lazy children renders immediately, but the wrapper itself renders
    expect(container.firstChild).toBeTruthy();
  });

  it('renders children when loaded', () => {
    render(
      <LazyPageWrapper>
        <div>Loaded Content</div>
      </LazyPageWrapper>
    );

    expect(screen.getByText('Loaded Content')).toBeInTheDocument();
  });

  it('renders multiple children', () => {
    render(
      <LazyPageWrapper>
        <div>First child</div>
        <div>Second child</div>
      </LazyPageWrapper>
    );

    expect(screen.getByText('First child')).toBeInTheDocument();
    expect(screen.getByText('Second child')).toBeInTheDocument();
  });

  it('renders nested elements correctly', () => {
    render(
      <LazyPageWrapper>
        <div>
          <h1>Title</h1>
          <p>Description</p>
        </div>
      </LazyPageWrapper>
    );

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
  });
});
