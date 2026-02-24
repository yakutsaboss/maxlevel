/**
 * Sticker configuration for celebrations.
 * Lists known public sticker packs and default celebration stickers.
 */

export interface StickerPackInfo {
  name: string;
  category: 'emoji' | 'celebration' | 'general';
}

/** Known public sticker packs for celebrations */
export const CELEBRATION_STICKER_PACKS: StickerPackInfo[] = [
  { name: 'AnimatedEmojis', category: 'emoji' },
  { name: 'HotCherry', category: 'celebration' },
  { name: 'CatStickers', category: 'general' },
];

/**
 * Default sticker file_ids for celebrations (fallback when user hasn't chosen).
 * Empty strings = no sticker sent (will be populated after testing with real sticker sets).
 */
export const DEFAULT_CELEBRATION_STICKERS: Record<string, string> = {
  level_up: '',
  quest_complete: '',
  achievement: '',
  payment: '',
};
