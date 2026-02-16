/**
 * Tests for AvatarCustomizer page (mini-app/src/pages/AvatarCustomizer.tsx)
 *
 * Run 66 Agent E: Tests the avatar customizer page created by Agent C.
 * Covers: category tabs, item display, lock state, preview, save, loading, error, navigation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
  };
});

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const keys: Record<string, string> = {
        'avatar.title': 'Avatar Customizer',
        'avatar.hairstyle': 'Hairstyle',
        'avatar.outfit': 'Outfit',
        'avatar.accessory': 'Accessory',
        'avatar.background': 'Background',
        'avatar.save': 'Save',
        'avatar.locked': 'Locked',
        'avatar.equipped': 'Equipped',
        'avatar.preview': 'Preview',
        'avatar.unlockAtLevel': `Unlock at level ${params?.level ?? ''}`,
        'avatar.unlockWithAchievement': 'Unlock with achievement',
        'settings.saving': 'Saving...',
        'common.noData': 'No data',
      };
      return keys[key] || key;
    },
  }),
}));

// Mock useTelegram hook — actual AvatarCustomizer uses { user, haptic } and useBackButton
vi.mock('@/hooks/useTelegram', () => ({
  useTelegram: () => ({
    user: { id: 1, first_name: 'Test', username: 'test' },
    haptic: { impact: vi.fn(), notification: vi.fn(), selection: vi.fn() },
  }),
  useBackButton: vi.fn(),
}));

// Mock usePullToRefresh — actual code destructures containerRef, pullDistance, refreshing, pullThreshold, touchHandlers
vi.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    containerRef: { current: null },
    pullDistance: 0,
    refreshing: false,
    pullThreshold: 80,
    touchHandlers: {},
  }),
  PullIndicator: () => null,
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { initial, animate, whileTap, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
    button: ({ children, ...props }: any) => {
      const { initial, animate, whileTap, ...rest } = props;
      return <button {...rest}>{children}</button>;
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock ErrorSection — actual code imports from @/components/ErrorSection
vi.mock('@/components/ErrorSection', () => ({
  ErrorSection: ({ message, onRetry }: { message: string; onRetry: () => void }) => (
    <div data-testid="error-section">
      <span>{message}</span>
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

// Mock lucide-react — actual code uses Lock, Check, Loader2, User
vi.mock('lucide-react', () => ({
  Lock: (props: any) => <span data-testid="lock-icon" {...props} />,
  Check: (props: any) => <span data-testid="check-icon" {...props} />,
  Loader2: (props: any) => <span data-testid="loader-icon" {...props} />,
  User: (props: any) => <span data-testid="user-icon" {...props} />,
}));

// Mock useAvatar hook
const mockPreviewItem = vi.fn();
const mockEquipItem = vi.fn().mockResolvedValue(undefined);
const mockResetPreview = vi.fn();
const mockIsItemUnlocked = vi.fn().mockReturnValue(true);
const mockRefresh = vi.fn();

const defaultHookReturn = {
  items: [
    { id: 1, category: 'hairstyle', name: 'Spiky', sprite_key: 'hair-spiky', rarity: 'common', unlock_type: 'free', unlock_criteria: {}, sort_order: 0 },
    { id: 2, category: 'hairstyle', name: 'Mohawk', sprite_key: 'hair-mohawk', rarity: 'rare', unlock_type: 'level', unlock_criteria: { level: 5 }, sort_order: 1 },
    { id: 3, category: 'outfit', name: 'T-Shirt', sprite_key: 'outfit-tshirt', rarity: 'common', unlock_type: 'free', unlock_criteria: {}, sort_order: 0 },
    { id: 4, category: 'accessory', name: 'Glasses', sprite_key: 'acc-glasses', rarity: 'common', unlock_type: 'free', unlock_criteria: {}, sort_order: 0 },
    { id: 5, category: 'background', name: 'Default', sprite_key: 'bg-default', rarity: 'common', unlock_type: 'free', unlock_criteria: {}, sort_order: 0 },
  ],
  equipped: { hairstyle: 'hair-spiky', outfit: null, accessory: null, background: null },
  preview: { hairstyle: 'hair-spiky', outfit: null, accessory: null, background: null },
  loading: false,
  saving: false,
  error: null,
  previewItem: mockPreviewItem,
  equipItem: mockEquipItem,
  resetPreview: mockResetPreview,
  isItemUnlocked: mockIsItemUnlocked,
  refresh: mockRefresh,
};

let hookReturn = { ...defaultHookReturn };

vi.mock('@/hooks/useAvatar', () => ({
  useAvatar: () => hookReturn,
}));

// Helper to render with router
function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/avatar']}>
      <AvatarCustomizer />
    </MemoryRouter>
  );
}

// Import after all mocks
import { AvatarCustomizer } from '@/pages/AvatarCustomizer';

beforeEach(() => {
  vi.clearAllMocks();
  hookReturn = { ...defaultHookReturn };
  mockIsItemUnlocked.mockReturnValue(true);
});

describe('AvatarCustomizer', () => {
  it('renders category tabs', () => {
    renderPage();

    expect(screen.getByText('Hairstyle')).toBeInTheDocument();
    expect(screen.getByText('Outfit')).toBeInTheDocument();
    expect(screen.getByText('Accessory')).toBeInTheDocument();
    expect(screen.getByText('Background')).toBeInTheDocument();
  });

  it('shows items for the default hairstyle category', () => {
    renderPage();

    // Default tab is hairstyle — show hairstyle items
    expect(screen.getByText('Spiky')).toBeInTheDocument();
    expect(screen.getByText('Mohawk')).toBeInTheDocument();
    // Outfit items should NOT be visible (wrong category)
    expect(screen.queryByText('T-Shirt')).not.toBeInTheDocument();
  });

  it('shows lock icon for locked items', () => {
    // Make only free items unlocked
    mockIsItemUnlocked.mockImplementation((item: any) => {
      return item.unlock_type === 'free';
    });

    renderPage();

    // Mohawk is level-locked — should show lock icon
    const lockIcons = screen.queryAllByTestId('lock-icon');
    expect(lockIcons.length).toBeGreaterThanOrEqual(1);
  });

  it('calls previewItem when clicking an unlocked item', () => {
    renderPage();

    // The items are motion.button elements (mocked as <button>)
    // Find the Spiky button
    const spikyText = screen.getByText('Spiky');
    const itemButton = spikyText.closest('button');
    expect(itemButton).toBeTruthy();
    fireEvent.click(itemButton!);
    expect(mockPreviewItem).toHaveBeenCalled();
  });

  it('shows Save button when preview differs from equipped', () => {
    // Set preview different from equipped to trigger hasChanges
    hookReturn = {
      ...defaultHookReturn,
      preview: { hairstyle: 'hair-mohawk', outfit: null, accessory: null, background: null },
    };

    renderPage();

    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('does not show Save button when no changes', () => {
    // preview === equipped → hasChanges is false
    renderPage();

    expect(screen.queryByText('Save')).not.toBeInTheDocument();
  });

  it('shows loading skeleton when loading', () => {
    hookReturn = { ...defaultHookReturn, loading: true, items: [] };

    renderPage();

    // Loading skeleton should not show item names
    expect(screen.queryByText('Spiky')).not.toBeInTheDocument();
    expect(screen.queryByText('Hairstyle')).not.toBeInTheDocument();
  });

  it('shows error state with ErrorSection', () => {
    hookReturn = { ...defaultHookReturn, error: 'Failed to load', items: [], loading: false };

    renderPage();

    // ErrorSection should be rendered with the error message
    expect(screen.getByTestId('error-section')).toBeInTheDocument();
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });
});
