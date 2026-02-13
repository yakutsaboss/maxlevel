/**
 * Run 50 Regression Tests
 *
 * Verifies that bug fixes from Run 50 remain in place.
 * Each describe block maps to one agent's fix.
 *
 * Tests 1-3: Source-level assertions (page components with complex deps)
 * Tests 4-6: Render tests (isolated components)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// --- File path utilities ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SRC_DIR = resolve(__dirname, '../..');

function readSource(relativePath: string): string {
  return readFileSync(resolve(SRC_DIR, relativePath), 'utf-8');
}

// =========================================
// Mocks
// =========================================

vi.mock('@twa-dev/sdk', () => ({
  default: {
    initData: 'test',
    initDataUnsafe: { user: { id: 123, first_name: 'Test' } },
    ready: vi.fn(),
    expand: vi.fn(),
    close: vi.fn(),
    enableClosingConfirmation: vi.fn(),
    disableClosingConfirmation: vi.fn(),
    disableVerticalSwipes: vi.fn(),
    enableVerticalSwipes: vi.fn(),
    colorScheme: 'dark',
    themeParams: {},
    platform: 'tdesktop',
    version: '7.0',
    HapticFeedback: {
      impactOccurred: vi.fn(),
      notificationOccurred: vi.fn(),
      selectionChanged: vi.fn(),
    },
    BackButton: { show: vi.fn(), hide: vi.fn(), onClick: vi.fn(), offClick: vi.fn() },
    MainButton: {
      show: vi.fn(), hide: vi.fn(), enable: vi.fn(), disable: vi.fn(),
      setText: vi.fn(), onClick: vi.fn(), offClick: vi.fn(),
      showProgress: vi.fn(), hideProgress: vi.fn(), color: '', textColor: '',
    },
    showAlert: vi.fn(),
    showConfirm: vi.fn(),
    showPopup: vi.fn(),
    openLink: vi.fn(),
    openTelegramLink: vi.fn(),
    sendData: vi.fn(),
  },
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
  motion: {
    div: ({ children, className, style, role, 'aria-valuenow': avn, 'aria-valuemin': avmin, 'aria-valuemax': avmax, 'aria-label': al, ...rest }: any) => (
      <div className={className} style={style} role={role} aria-valuenow={avn} aria-valuemin={avmin} aria-valuemax={avmax} aria-label={al}>
        {children}
      </div>
    ),
    button: ({ children, onClick, className, 'aria-label': ariaLabel, type }: any) => (
      <button onClick={onClick} className={className} aria-label={ariaLabel} type={type || 'button'}>
        {children}
      </button>
    ),
  },
}));

vi.mock('lucide-react', () => {
  const IconStub = ({ className }: any) => <span data-testid="icon" className={className} />;
  return {
    Star: IconStub,
    Lock: IconStub,
    CheckCircle: IconStub,
    Zap: IconStub,
    Trophy: IconStub,
    Award: IconStub,
    Pencil: IconStub,
    Settings: IconStub,
    Skull: IconStub,
    Info: IconStub,
    AlertTriangle: IconStub,
    Shield: IconStub,
    ShieldAlert: IconStub,
  };
});

vi.mock('@/components/ProfileEditModal', () => ({
  AVATAR_OPTIONS: [
    { icon: '\u2694\uFE0F', color: 'bg-red-500', label: 'Warrior' },
    { icon: '\uD83E\uDDD9', color: 'bg-purple-500', label: 'Mage' },
  ],
}));

vi.mock('@/components/onboarding/ui/ProgressBar', () => ({
  ProgressBar: ({ progress }: { progress: number }) => (
    <div data-testid="progress-bar" data-progress={progress} />
  ),
}));

// =========================================
// Component imports (after mocks)
// =========================================

import { AchievementCard } from '@/components/achievements/AchievementCard';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { PunishmentConfig } from '@/components/onboarding/PunishmentConfig';
import type { Achievement, UserAchievement, UserStats } from '@/types';
import type { OnboardingData } from '@/hooks/useOnboarding';

// =========================================
// Test data
// =========================================

const recentDate = new Date(Date.now() - 1000 * 60 * 30).toISOString();

const mockAchievement: Achievement = {
  id: 1,
  name: 'First Steps',
  description: 'Complete your first quest',
  icon: '\uD83C\uDFAF',
  xp_reward: 50,
  rarity: 'common',
  category: 'general',
};

const mockUserAchievement: UserAchievement = {
  user_id: 1,
  achievement_id: 1,
  unlocked_at: recentDate,
  achievement: mockAchievement,
};

const mockRarityStyle = {
  border: 'border-yellow-400',
  bg: 'bg-yellow-50',
  text: 'text-yellow-700',
  label: 'Common',
};

const mockHaptic = { impact: vi.fn() };

const mockStats: UserStats = {
  user: {
    id: 1,
    telegram_id: 123,
    first_name: 'Test',
    last_name: 'User',
    username: 'testuser',
    level: 5,
    xp: 350,
    xp_to_next_level: 500,
    total_quests_completed: 42,
    current_streak: 7,
    longest_streak: 14,
    avatar_id: 1,
    created_at: '2025-06-15T00:00:00Z',
  },
  modes: [],
  activeQuests: [],
  completedQuestsToday: 0,
  recentAchievements: [],
  xpGainedToday: 0,
  streakData: { current: 7, longest: 14, daysActive: 30 },
};

const mockOnboardingData: OnboardingData = {
  selected_modes: ['fitness'],
};

// =========================================
// 1. Onboarding no-blink (Agent A fix)
// =========================================

describe('Onboarding no-blink (Agent A)', () => {
  const source = readSource('pages/Onboarding.tsx');

  it('AnimatePresence uses mode="sync" for step transitions', () => {
    // After fix, step-transition AnimatePresence must NOT use mode="wait"
    expect(source).not.toMatch(/AnimatePresence\s+mode=["']wait["']/);
  });

  it('step transition motion.div is opacity-only (no x movement)', () => {
    // The motion.div keyed by store.currentStep should not animate x position
    const hasXAnimation = /key=\{store\.currentStep\}[\s\S]{0,200}initial=\{[^}]*\bx\s*:/.test(source);
    expect(hasXAnimation).toBe(false);
  });

  it('step transition exit does not use x movement', () => {
    const hasXExit = /key=\{store\.currentStep\}[\s\S]{0,300}exit=\{[^}]*\bx\s*:/.test(source);
    expect(hasXExit).toBe(false);
  });
});

// =========================================
// 2. Dashboard no-overlap (Agent B fix)
// =========================================

describe('Dashboard no-overlap (Agent B)', () => {
  const source = readSource('pages/Dashboard.tsx');

  it('stat grid container does not use -mt-8', () => {
    const gridClassMatch = source.match(/className="([^"]*grid grid-cols-2[^"]*)"/);
    expect(gridClassMatch).not.toBeNull();
    expect(gridClassMatch![1]).not.toContain('-mt-8');
  });

  it('stat grid does not use any negative top margin', () => {
    const gridClassMatch = source.match(/className="([^"]*grid grid-cols-2[^"]*)"/);
    expect(gridClassMatch).not.toBeNull();
    expect(gridClassMatch![1]).not.toMatch(/-mt-\d/);
  });
});

// =========================================
// 3. Social header spacing (Agent C fix)
// =========================================

describe('Social header spacing (Agent C)', () => {
  const source = readSource('pages/Social.tsx');

  it('Social page has safe-area-top class', () => {
    expect(source).toContain('safe-area-top');
  });
});

// =========================================
// 4. Achievement badge visibility (Agent D fix)
// =========================================

describe('Achievement badge visibility (Agent D)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('outer card container does NOT have overflow-hidden', () => {
    const { container } = render(
      <AchievementCard
        achievement={mockAchievement}
        userAchievement={mockUserAchievement}
        isUnlocked={true}
        rarityStyle={mockRarityStyle}
        index={0}
        haptic={mockHaptic}
      />
    );

    const card = container.querySelector('button');
    expect(card).not.toBeNull();
    expect(card!.className).not.toContain('overflow-hidden');
  });

  it('NEW badge is rendered for recently unlocked achievements', () => {
    render(
      <AchievementCard
        achievement={mockAchievement}
        userAchievement={mockUserAchievement}
        isUnlocked={true}
        rarityStyle={mockRarityStyle}
        index={0}
        haptic={mockHaptic}
      />
    );

    expect(screen.getByText('NEW')).toBeInTheDocument();
  });

  it('NEW badge parent does not clip overflow', () => {
    render(
      <AchievementCard
        achievement={mockAchievement}
        userAchievement={mockUserAchievement}
        isUnlocked={true}
        rarityStyle={mockRarityStyle}
        index={0}
        haptic={mockHaptic}
      />
    );

    const newBadge = screen.getByText('NEW');
    const parentButton = newBadge.closest('button');
    expect(parentButton).not.toBeNull();
    expect(parentButton!.className).not.toContain('overflow-hidden');
  });
});

// =========================================
// 5. Avatar centering (Agent E fix)
// =========================================

describe('Avatar centering (Agent E)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('avatar wrapper has flex and justify-center classes', () => {
    const { container } = render(
      <ProfileHeader
        stats={mockStats}
        achievementCount={10}
        onEdit={vi.fn()}
        onSettingsClick={vi.fn()}
        haptic={mockHaptic}
      />
    );

    const avatarImg = container.querySelector('[role="img"]');
    expect(avatarImg).not.toBeNull();

    // The grandparent of the avatar circle is the flex centering wrapper
    // Structure: div.flex.justify-center > motion.div.relative > div[role="img"]
    const motionWrapper = avatarImg!.parentElement!;
    const flexWrapper = motionWrapper.parentElement!;
    expect(flexWrapper.className).toContain('flex');
    expect(flexWrapper.className).toContain('justify-center');
  });
});

// =========================================
// 6. Punishment transparency (Agent G fix)
// =========================================

describe('Punishment transparency (Agent G)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders info about XP consequences', () => {
    render(
      <PunishmentConfig
        progress={0.8}
        data={mockOnboardingData}
        onUpdate={vi.fn()}
        onNext={vi.fn()}
      />
    );

    // Agent G adds an info box explaining XP depreciation as a consequence
    const bodyText = document.body.textContent || '';
    const hasXPInfo = /xp/i.test(bodyText) || /depreciat/i.test(bodyText) || /penalty/i.test(bodyText);
    expect(hasXPInfo).toBe(true);
  });

  it('info box is visible without toggling consent', () => {
    render(
      <PunishmentConfig
        progress={0.8}
        data={mockOnboardingData}
        onUpdate={vi.fn()}
        onNext={vi.fn()}
      />
    );

    // The XP info should be visible by default (not hidden behind consent toggle)
    const bodyText = document.body.textContent || '';
    expect(bodyText.toLowerCase()).toMatch(/xp|experience|depreciat/);
  });
});
