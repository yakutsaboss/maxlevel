/**
 * Tests for AvatarRenderer component (mini-app/src/components/avatar/AvatarRenderer.tsx)
 *
 * Run 66 Agent E: Tests the pixel-art avatar renderer created by Agent B.
 * Covers: rendering, size variants, equipped items, defaults, click handler.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock the AvatarSprites module (Agent B creates it)
vi.mock('@/components/avatar/AvatarSprites', () => ({
  renderSprite: (spriteKey: string, size: number) => (
    <div data-testid={`sprite-${spriteKey}`} data-size={size} />
  ),
  renderBaseBody: (size: number) => (
    <div data-testid="base-body" data-size={size} />
  ),
}));

// Mock the avatarItems data module
vi.mock('@/data/avatarItems', () => ({
  SPRITE_REGISTRY: {
    'hair-spiky': { spriteKey: 'hair-spiky', name: 'Spiky', category: 'hairstyle', colors: ['#FFD700', '#FFA500'], zIndex: 30 },
    'hair-long': { spriteKey: 'hair-long', name: 'Long Flow', category: 'hairstyle', colors: ['#8B4513', '#A0522D'], zIndex: 30 },
    'outfit-tshirt': { spriteKey: 'outfit-tshirt', name: 'T-Shirt', category: 'outfit', colors: ['#4169E1', '#6495ED'], zIndex: 10 },
    'outfit-armor': { spriteKey: 'outfit-armor', name: 'Armor', category: 'outfit', colors: ['#C0C0C0', '#A9A9A9'], zIndex: 10 },
    'acc-glasses': { spriteKey: 'acc-glasses', name: 'Glasses', category: 'accessory', colors: ['#1C1C1C', '#333'], zIndex: 40 },
    'acc-none': { spriteKey: 'acc-none', name: 'None', category: 'accessory', colors: [], zIndex: 40 },
    'bg-default': { spriteKey: 'bg-default', name: 'Default', category: 'background', colors: ['#1a1a2e', '#16213e'], zIndex: 0 },
    'bg-sunset': { spriteKey: 'bg-sunset', name: 'Sunset', category: 'background', colors: ['#FF6B35', '#F7C59F'], zIndex: 0 },
  },
  AVATAR_LAYER_ORDER: ['background', 'outfit', 'hairstyle', 'accessory'],
}));

import { AvatarRenderer } from '@/components/avatar/AvatarRenderer';
import type { EquippedItems } from '@/components/avatar/AvatarRenderer';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AvatarRenderer', () => {
  it('renders with default items when no equipment is specified', () => {
    const equipped: EquippedItems = {
      hairstyle: null,
      outfit: null,
      accessory: null,
      background: null,
    };

    const { container } = render(<AvatarRenderer equipped={equipped} />);

    // Should render a container element
    expect(container.firstChild).toBeTruthy();
  });

  it('renders with specified equipped items', () => {
    const equipped: EquippedItems = {
      hairstyle: 'hair-spiky',
      outfit: 'outfit-armor',
      accessory: 'acc-glasses',
      background: 'bg-sunset',
    };

    const { container } = render(<AvatarRenderer equipped={equipped} />);

    expect(container.firstChild).toBeTruthy();
  });

  it('applies correct size for sm (32px)', () => {
    const equipped: EquippedItems = {
      hairstyle: null,
      outfit: null,
      accessory: null,
      background: null,
    };

    const { container } = render(<AvatarRenderer equipped={equipped} size="sm" />);

    const root = container.firstChild as HTMLElement;
    // AvatarRenderer uses inline style width/height
    expect(root.style.width).toBe('32px');
    expect(root.style.height).toBe('32px');
  });

  it('applies correct size for xl (96px)', () => {
    const equipped: EquippedItems = {
      hairstyle: null,
      outfit: null,
      accessory: null,
      background: null,
    };

    const { container } = render(<AvatarRenderer equipped={equipped} size="xl" />);

    const root = container.firstChild as HTMLElement;
    expect(root.style.width).toBe('96px');
    expect(root.style.height).toBe('96px');
  });

  it('defaults to md size (48px) when no size prop', () => {
    const equipped: EquippedItems = {
      hairstyle: null,
      outfit: null,
      accessory: null,
      background: null,
    };

    const { container } = render(<AvatarRenderer equipped={equipped} />);

    const root = container.firstChild as HTMLElement;
    expect(root.style.width).toBe('48px');
    expect(root.style.height).toBe('48px');
  });

  it('handles null items gracefully', () => {
    const equipped: EquippedItems = {
      hairstyle: null,
      outfit: null,
      accessory: null,
      background: null,
    };

    // Should not throw
    const { container } = render(<AvatarRenderer equipped={equipped} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('fires onClick when clicked', () => {
    const onClick = vi.fn();
    const equipped: EquippedItems = {
      hairstyle: 'hair-spiky',
      outfit: 'outfit-tshirt',
      accessory: null,
      background: 'bg-default',
    };

    const { container } = render(
      <AvatarRenderer equipped={equipped} onClick={onClick} />
    );

    const root = container.firstChild as HTMLElement;
    fireEvent.click(root);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('accepts className prop', () => {
    const equipped: EquippedItems = {
      hairstyle: null,
      outfit: null,
      accessory: null,
      background: null,
    };

    const { container } = render(
      <AvatarRenderer equipped={equipped} className="custom-class" />
    );

    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('custom-class');
  });
});
