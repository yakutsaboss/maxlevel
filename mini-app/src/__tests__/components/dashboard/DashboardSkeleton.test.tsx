import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';

describe('DashboardSkeleton', () => {
  it('renders skeleton structure with stat cards and sections', () => {
    const { container } = render(<DashboardSkeleton />);

    // 4 stat card skeletons in the grid
    const statSkeletons = container.querySelectorAll('.grid.grid-cols-2 > div');
    expect(statSkeletons).toHaveLength(4);

    // 3 mode skeletons
    const modeSkeletons = container.querySelectorAll('.flex.gap-2 > div');
    expect(modeSkeletons).toHaveLength(3);

    // 2 quest skeletons
    const questSkeletons = container.querySelectorAll('.space-y-3 > div');
    expect(questSkeletons).toHaveLength(2);
  });

  it('matches snapshot', () => {
    const { container } = render(<DashboardSkeleton />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
