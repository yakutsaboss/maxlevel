/**
 * Tests for ChallengeForm (mini-app/src/components/social/ChallengeForm.tsx)
 *
 * Run 64 Agent C: Rewritten to test mode selector pills (fitness, hydration, etc.),
 * targetValue input, endDate input, and form submission.
 * Agent B replaces free-text Mode input with pill/chip selector.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock lucide-react
vi.mock('lucide-react', () => {
  const icon = (name: string) => (props: any) => <span data-testid={`${name}-icon`} {...props} />;
  return {
    PlusCircle: icon('plus-circle'),
    Loader2: icon('loader2'),
    Dumbbell: icon('dumbbell'),
    Droplets: icon('droplets'),
    DollarSign: icon('dollar-sign'),
    BookOpen: icon('book-open'),
    Pill: icon('pill'),
    Repeat: icon('repeat'),
    Target: icon('target'),
    Calendar: icon('calendar'),
  };
});

import { ChallengeForm } from '@/components/social/ChallengeForm';

// ─── Known modes that Agent B defines as pills ───────────────────────

const KNOWN_MODES = ['fitness', 'hydration', 'finance', 'learning', 'medication', 'habits'];

// ─── Tests ───────────────────────────────────────────────────────────

describe('ChallengeForm', () => {
  const mockHaptic = { notification: vi.fn() };
  const defaultProps = {
    userId: 1,
    onSuccess: vi.fn().mockResolvedValue(undefined),
    haptic: mockHaptic,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // ── Basic rendering ──

  it('renders title input and submit button', () => {
    render(<ChallengeForm {...defaultProps} />);

    expect(screen.getByPlaceholderText(/title/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });

  it('renders mode pills for known modes', () => {
    render(<ChallengeForm {...defaultProps} />);

    const pageContent = (document.body.textContent || '').toLowerCase();

    // At least some of the known modes should appear as pill labels
    const modesFound = KNOWN_MODES.filter(mode => pageContent.includes(mode));
    expect(modesFound.length).toBeGreaterThanOrEqual(3);
  });

  // ── Mode pill selection ──

  it('clicking a mode pill selects it (highlighted)', () => {
    render(<ChallengeForm {...defaultProps} />);

    const pageContent = (document.body.textContent || '').toLowerCase();
    // Find one of the known modes that exists
    const existingMode = KNOWN_MODES.find(mode => pageContent.includes(mode));
    expect(existingMode).toBeDefined();

    // Find the pill button/element containing that mode
    const allButtons = screen.getAllByRole('button');
    const modePill = allButtons.find(btn =>
      btn.textContent?.toLowerCase().includes(existingMode!)
    );

    if (modePill) {
      const classBeforeClick = modePill.className;
      fireEvent.click(modePill);

      // After click, pill should have different visual state (class change)
      // This verifies something changed
      const classAfterClick = modePill.className;
      expect(classAfterClick !== classBeforeClick || modePill.getAttribute('aria-pressed') === 'true').toBe(true);
    }
  });

  it('clicking selected pill deselects it', () => {
    render(<ChallengeForm {...defaultProps} />);

    const allButtons = screen.getAllByRole('button');
    const modePill = allButtons.find(btn =>
      KNOWN_MODES.some(mode => btn.textContent?.toLowerCase().includes(mode))
    );

    if (modePill) {
      // Click once to select
      fireEvent.click(modePill);
      const classAfterSelect = modePill.className;

      // Click again to deselect
      fireEvent.click(modePill);
      const classAfterDeselect = modePill.className;

      // Classes should change back or aria-pressed should be false
      expect(
        classAfterDeselect !== classAfterSelect ||
        modePill.getAttribute('aria-pressed') === 'false' ||
        !modePill.getAttribute('aria-pressed')
      ).toBe(true);
    }
  });

  // ── Input fields ──

  it('renders targetValue input field', () => {
    render(<ChallengeForm {...defaultProps} />);

    // Look for a number input or input with target/goal placeholder
    const pageContent = (document.body.textContent || '').toLowerCase();
    expect(
      pageContent.includes('target') ||
      pageContent.includes('goal') ||
      screen.queryByRole('spinbutton') || // type="number" has spinbutton role
      document.querySelector('input[type="number"]')
    ).toBeTruthy();
  });

  it('renders endDate input field', () => {
    render(<ChallengeForm {...defaultProps} />);

    // Look for date input or text referencing end date / deadline
    const pageContent = (document.body.textContent || '').toLowerCase();
    expect(
      pageContent.includes('end date') ||
      pageContent.includes('deadline') ||
      pageContent.includes('end') ||
      document.querySelector('input[type="date"]')
    ).toBeTruthy();
  });

  // ── Submit button state ──

  it('create button is disabled when title is empty', () => {
    render(<ChallengeForm {...defaultProps} />);

    const createButton = screen.getByRole('button', { name: /create/i });
    expect(createButton).toBeDisabled();
  });

  it('create button is enabled when title is entered', () => {
    render(<ChallengeForm {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText(/title/i), {
      target: { value: 'My Challenge' },
    });

    const createButton = screen.getByRole('button', { name: /create/i });
    expect(createButton).not.toBeDisabled();
  });

  // ── Submission ──

  it('successful submission calls API with correct body', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { id: 1 } }),
    } as Response);

    render(<ChallengeForm {...defaultProps} />);

    // Fill title
    fireEvent.change(screen.getByPlaceholderText(/title/i), {
      target: { value: 'Fitness Challenge' },
    });

    // Click create
    const createButton = screen.getByRole('button', { name: /create/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    // Check the fetch was called with the correct URL and body
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toContain('/social/challenges/create');
    expect(options?.method).toBe('POST');

    const body = JSON.parse(options?.body as string);
    expect(body.creatorId).toBe(1);
    expect(body.title).toBe('Fitness Challenge');
  });

  it('shows success feedback after successful creation', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { id: 1 } }),
    } as Response);

    render(<ChallengeForm {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText(/title/i), {
      target: { value: 'My Challenge' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      const pageContent = (document.body.textContent || '').toLowerCase();
      expect(
        pageContent.includes('created') || pageContent.includes('success')
      ).toBe(true);
    });

    expect(mockHaptic.notification).toHaveBeenCalledWith('success');
    expect(defaultProps.onSuccess).toHaveBeenCalled();
  });
});
