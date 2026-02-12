import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className}>{children}</div>
    ),
  },
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Sun: ({ className }: any) => <span data-testid="sun-icon" className={className} />,
  Moon: ({ className }: any) => <span data-testid="moon-icon" className={className} />,
  Monitor: ({ className }: any) => <span data-testid="monitor-icon" className={className} />,
  Palette: ({ className }: any) => <span data-testid="palette-icon" className={className} />,
}));

import { ThemeSettings } from '@/components/settings/ThemeSettings';

describe('ThemeSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders theme header and three options', () => {
    render(<ThemeSettings colorScheme="light" themeParams={undefined} />);

    expect(screen.getByText('Theme')).toBeInTheDocument();
    expect(screen.getByText('Auto')).toBeInTheDocument();
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
  });

  it('shows option descriptions', () => {
    render(<ThemeSettings colorScheme="light" themeParams={undefined} />);

    expect(screen.getByText('Follow Telegram')).toBeInTheDocument();
    expect(screen.getByText('Always light')).toBeInTheDocument();
    expect(screen.getByText('Always dark')).toBeInTheDocument();
  });

  it('defaults to auto mode showing Light when colorScheme is light', () => {
    render(<ThemeSettings colorScheme="light" themeParams={undefined} />);

    expect(screen.getByText(/Light mode/)).toBeInTheDocument();
    expect(screen.getByText(/\(auto\)/)).toBeInTheDocument();
  });

  it('shows Dark mode when colorScheme is dark', () => {
    render(<ThemeSettings colorScheme="dark" themeParams={undefined} />);

    expect(screen.getByText(/Dark mode/)).toBeInTheDocument();
  });

  it('switches preference when a theme option is clicked', () => {
    render(<ThemeSettings colorScheme="light" themeParams={undefined} />);

    fireEvent.click(screen.getByText('Dark'));
    expect(screen.getByText(/Dark mode/)).toBeInTheDocument();
    expect(localStorage.setItem).toHaveBeenCalledWith('theme_preference', 'dark');
  });

  it('calls haptic feedback on selection', () => {
    const mockHaptic = { selection: vi.fn() };
    render(<ThemeSettings colorScheme="light" themeParams={undefined} haptic={mockHaptic} />);

    fireEvent.click(screen.getByText('Light'));
    expect(mockHaptic.selection).toHaveBeenCalledTimes(1);
  });

  it('renders theme colors preview when themeParams are provided', () => {
    const themeParams = {
      bg_color: '#ffffff',
      text_color: '#000000',
      link_color: '#0088cc',
    };
    render(<ThemeSettings colorScheme="light" themeParams={themeParams} />);

    expect(screen.getByText('Telegram Theme Colors')).toBeInTheDocument();
    expect(screen.getByText('BG')).toBeInTheDocument();
    expect(screen.getByText('Text')).toBeInTheDocument();
    expect(screen.getByText('Link')).toBeInTheDocument();
  });

  it('hides theme colors preview when no themeParams', () => {
    render(<ThemeSettings colorScheme="light" themeParams={undefined} />);

    expect(screen.queryByText('Telegram Theme Colors')).not.toBeInTheDocument();
  });
});
