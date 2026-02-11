import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, onClick, className, ...props }: any) => (
      <div onClick={onClick} className={className}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
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

describe('ProfileEditModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders edit form with current values when open', () => {
    render(<ProfileEditModal {...defaultProps} />);

    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
    expect(screen.getByDisplayValue('TestUser')).toBeInTheDocument();
    expect(screen.getByText('Nickname')).toBeInTheDocument();
    expect(screen.getByText('Choose Avatar')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<ProfileEditModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();
  });

  it('save button calls API with updated data', async () => {
    mockUpdateUserProfile.mockResolvedValueOnce({});

    render(<ProfileEditModal {...defaultProps} />);

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
    render(<ProfileEditModal {...defaultProps} />);

    fireEvent.click(screen.getByText('Cancel'));

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('shows error message when save fails', async () => {
    mockUpdateUserProfile.mockRejectedValueOnce(new Error('Network error'));

    render(<ProfileEditModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText('Failed to save profile. Tap Save to retry.')).toBeInTheDocument();
    });

    expect(mockHaptic.notification).toHaveBeenCalledWith('error');
  });
});
