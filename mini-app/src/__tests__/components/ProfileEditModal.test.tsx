import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'profile.editProfile': 'Edit Profile',
        'profile.nickname': 'Nickname',
        'profile.chooseAvatar': 'Choose Avatar',
        'profile.customizeAvatar': 'Customize in Avatar Studio',
        'settings.saving': 'Saving...',
        'common.save': 'Save',
        'common.cancel': 'Cancel',
        'profile.saveFailed': 'Failed to save profile. Tap Save to retry.',
      };
      return translations[key] ?? key;
    },
  }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, onClick, className, ...props }: any) => (
      <div onClick={onClick} className={className}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  X: (props: any) => <span data-testid="icon-x" {...props} />,
  Check: (props: any) => <span data-testid="icon-check" {...props} />,
  Loader2: (props: any) => <span data-testid="icon-loader" {...props} />,
  AlertCircle: (props: any) => <span data-testid="icon-alert" {...props} />,
  Palette: (props: any) => <span data-testid="icon-palette" {...props} />,
}));

// Mock avatar component
vi.mock('@/components/avatar', () => ({
  AvatarRenderer: ({ size }: any) => <div data-testid="avatar-renderer" data-size={size} />,
}));

// Mock apiClient
const mockUpdateUserProfile = vi.fn();
vi.mock('@/api/client', () => ({
  apiClient: {
    updateUserProfile: (...args: any[]) => mockUpdateUserProfile(...args),
  },
}));

import { ProfileEditModal } from '@/components/ProfileEditModal';

const mockHaptic = {
  impact: vi.fn(),
  notification: vi.fn(),
  selection: vi.fn(),
};

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSaved: vi.fn(),
  telegramId: 123,
  currentName: 'TestUser',
  currentAvatarId: 1,
  haptic: mockHaptic,
};

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('ProfileEditModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders edit form with current values when open', () => {
    renderWithRouter(<ProfileEditModal {...defaultProps} />);

    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
    expect(screen.getByDisplayValue('TestUser')).toBeInTheDocument();
    expect(screen.getByText('Nickname')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    renderWithRouter(<ProfileEditModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();
  });

  it('save button calls API with updated data', async () => {
    mockUpdateUserProfile.mockResolvedValueOnce({});

    renderWithRouter(<ProfileEditModal {...defaultProps} />);

    // Change nickname
    const input = screen.getByDisplayValue('TestUser');
    fireEvent.change(input, { target: { value: 'NewName' } });

    // Click save
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockUpdateUserProfile).toHaveBeenCalledWith(123, {
        first_name: 'NewName',
        avatar_id: 1,
      });
    });

    await waitFor(() => {
      expect(defaultProps.onSaved).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('cancel closes modal', () => {
    renderWithRouter(<ProfileEditModal {...defaultProps} />);

    fireEvent.click(screen.getByText('Cancel'));

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('shows error message when save fails', async () => {
    mockUpdateUserProfile.mockRejectedValueOnce(new Error('Network error'));

    renderWithRouter(<ProfileEditModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText('Failed to save profile. Tap Save to retry.')).toBeInTheDocument();
    });

    expect(mockHaptic.notification).toHaveBeenCalledWith('error');
  });
});
