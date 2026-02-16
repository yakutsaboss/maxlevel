export interface AvatarItemDef {
  spriteKey: string;
  name: string;
  category: AvatarCategory;
  colors: string[];
  zIndex: number;
}

export type AvatarCategory = 'hairstyle' | 'outfit' | 'accessory' | 'background';

export const AVATAR_LAYER_ORDER: AvatarCategory[] = ['background', 'outfit', 'hairstyle', 'accessory'];

export const SPRITE_REGISTRY: Record<string, AvatarItemDef> = {
  // Hairstyles (zIndex: 30)
  'hair-spiky': { spriteKey: 'hair-spiky', name: 'Spiky', category: 'hairstyle', colors: ['#FFD700', '#FFA500'], zIndex: 30 },
  'hair-long': { spriteKey: 'hair-long', name: 'Long Flow', category: 'hairstyle', colors: ['#8B4513', '#A0522D'], zIndex: 30 },
  'hair-mohawk': { spriteKey: 'hair-mohawk', name: 'Mohawk', category: 'hairstyle', colors: ['#FF1493', '#FF69B4'], zIndex: 30 },
  'hair-crown': { spriteKey: 'hair-crown', name: 'Crown Braid', category: 'hairstyle', colors: ['#DAA520', '#B8860B'], zIndex: 30 },
  'hair-flame': { spriteKey: 'hair-flame', name: 'Flame Hair', category: 'hairstyle', colors: ['#FF4500', '#FF6347'], zIndex: 30 },

  // Outfits (zIndex: 10)
  'outfit-tshirt': { spriteKey: 'outfit-tshirt', name: 'T-Shirt', category: 'outfit', colors: ['#4169E1', '#6495ED'], zIndex: 10 },
  'outfit-hoodie': { spriteKey: 'outfit-hoodie', name: 'Hoodie', category: 'outfit', colors: ['#696969', '#808080'], zIndex: 10 },
  'outfit-armor': { spriteKey: 'outfit-armor', name: 'Armor', category: 'outfit', colors: ['#C0C0C0', '#A9A9A9'], zIndex: 10 },
  'outfit-wizard': { spriteKey: 'outfit-wizard', name: 'Wizard Robe', category: 'outfit', colors: ['#9370DB', '#8B008B'], zIndex: 10 },
  'outfit-golden': { spriteKey: 'outfit-golden', name: 'Golden Suit', category: 'outfit', colors: ['#FFD700', '#DAA520'], zIndex: 10 },

  // Accessories (zIndex: 40)
  'acc-none': { spriteKey: 'acc-none', name: 'None', category: 'accessory', colors: [], zIndex: 40 },
  'acc-glasses': { spriteKey: 'acc-glasses', name: 'Glasses', category: 'accessory', colors: ['#1C1C1C', '#333333'], zIndex: 40 },
  'acc-headband': { spriteKey: 'acc-headband', name: 'Headband', category: 'accessory', colors: ['#FF0000', '#CC0000'], zIndex: 40 },
  'acc-wings': { spriteKey: 'acc-wings', name: 'Wings', category: 'accessory', colors: ['#87CEEB', '#ADD8E6'], zIndex: 40 },
  'acc-halo': { spriteKey: 'acc-halo', name: 'Halo', category: 'accessory', colors: ['#FFD700', '#FFFACD'], zIndex: 40 },

  // Backgrounds (zIndex: 0)
  'bg-default': { spriteKey: 'bg-default', name: 'Default', category: 'background', colors: ['#1a1a2e', '#16213e'], zIndex: 0 },
  'bg-sunset': { spriteKey: 'bg-sunset', name: 'Sunset', category: 'background', colors: ['#FF6B35', '#F7C59F'], zIndex: 0 },
  'bg-galaxy': { spriteKey: 'bg-galaxy', name: 'Galaxy', category: 'background', colors: ['#0D0221', '#0A0A23', '#150050'], zIndex: 0 },
};

export function getItemsByCategory(category: AvatarCategory): AvatarItemDef[] {
  return Object.values(SPRITE_REGISTRY).filter(item => item.category === category);
}

export function getItemDef(spriteKey: string): AvatarItemDef | undefined {
  return SPRITE_REGISTRY[spriteKey];
}
