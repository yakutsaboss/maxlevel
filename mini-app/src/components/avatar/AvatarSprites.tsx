import { useMemo } from 'react';
import { SPRITE_REGISTRY } from '@/data/avatarItems';

const GRID = 8;

function px(size: number): number {
  return Math.floor(size / GRID);
}

function PixelGrid({ pixels, size, colors }: { pixels: [number, number][]; size: number; colors: string[] }) {
  const cellSize = px(size);
  const primary = colors[0] || '#888';
  const secondary = colors[1] || colors[0] || '#666';

  return (
    <>
      {pixels.map(([col, row], i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: col * cellSize,
            top: row * cellSize,
            width: cellSize,
            height: cellSize,
            backgroundColor: i % 3 === 0 ? secondary : primary,
          }}
        />
      ))}
    </>
  );
}

// --- Background sprites ---

function BgDefault(_props: { size: number }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
      borderRadius: 'inherit',
    }} />
  );
}

function BgSunset(_props: { size: number }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'linear-gradient(180deg, #FF6B35 0%, #F7C59F 60%, #FFE4C4 100%)',
      borderRadius: 'inherit',
    }} />
  );
}

function BgGalaxy({ size }: { size: number }) {
  const cellSize = px(size);
  const stars = useMemo(() => {
    const s: { x: number; y: number; o: number }[] = [];
    for (let i = 0; i < 12; i++) {
      s.push({
        x: ((i * 37 + 13) % GRID) * cellSize,
        y: ((i * 23 + 7) % GRID) * cellSize,
        o: 0.4 + (i % 3) * 0.3,
      });
    }
    return s;
  }, [cellSize]);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'linear-gradient(180deg, #0D0221 0%, #0A0A23 50%, #150050 100%)',
      borderRadius: 'inherit',
    }}>
      {stars.map((star, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: star.x,
          top: star.y,
          width: Math.max(2, cellSize / 2),
          height: Math.max(2, cellSize / 2),
          borderRadius: '50%',
          backgroundColor: '#fff',
          opacity: star.o,
        }} />
      ))}
    </div>
  );
}

// --- Hairstyle sprites (top ~30%) ---

const HAIR_SPIKY_PIXELS: [number, number][] = [
  [2,0],[3,0],[4,0],[5,0],
  [1,1],[2,1],[3,1],[4,1],[5,1],[6,1],
  [2,2],[3,2],[4,2],[5,2],
];

const HAIR_LONG_PIXELS: [number, number][] = [
  [2,0],[3,0],[4,0],[5,0],
  [1,1],[2,1],[3,1],[4,1],[5,1],[6,1],
  [1,2],[2,2],[3,2],[4,2],[5,2],[6,2],
  [1,3],[6,3],
];

const HAIR_MOHAWK_PIXELS: [number, number][] = [
  [3,0],[4,0],
  [3,1],[4,1],
  [2,2],[3,2],[4,2],[5,2],
  [2,3],[3,3],[4,3],[5,3],
];

const HAIR_CROWN_PIXELS: [number, number][] = [
  [2,0],[4,0],[6,0],
  [1,1],[2,1],[3,1],[4,1],[5,1],[6,1],
  [2,2],[3,2],[4,2],[5,2],
];

const HAIR_FLAME_PIXELS: [number, number][] = [
  [3,0],[5,0],
  [2,0],[4,0],[6,0],
  [1,1],[2,1],[3,1],[4,1],[5,1],[6,1],
  [2,2],[3,2],[4,2],[5,2],
];

// --- Outfit sprites (lower ~60%) ---

const OUTFIT_TSHIRT_PIXELS: [number, number][] = [
  [2,4],[3,4],[4,4],[5,4],
  [1,5],[2,5],[3,5],[4,5],[5,5],[6,5],
  [2,6],[3,6],[4,6],[5,6],
  [2,7],[3,7],[4,7],[5,7],
];

const OUTFIT_HOODIE_PIXELS: [number, number][] = [
  [2,3],[3,3],[4,3],[5,3],
  [1,4],[2,4],[3,4],[4,4],[5,4],[6,4],
  [1,5],[2,5],[3,5],[4,5],[5,5],[6,5],
  [2,6],[3,6],[4,6],[5,6],
  [2,7],[3,7],[4,7],[5,7],
];

const OUTFIT_ARMOR_PIXELS: [number, number][] = [
  [2,3],[3,3],[4,3],[5,3],
  [1,4],[2,4],[3,4],[4,4],[5,4],[6,4],
  [0,5],[1,5],[2,5],[3,5],[4,5],[5,5],[6,5],[7,5],
  [1,6],[2,6],[3,6],[4,6],[5,6],[6,6],
  [2,7],[3,7],[4,7],[5,7],
];

const OUTFIT_WIZARD_PIXELS: [number, number][] = [
  [2,3],[3,3],[4,3],[5,3],
  [1,4],[2,4],[3,4],[4,4],[5,4],[6,4],
  [1,5],[2,5],[3,5],[4,5],[5,5],[6,5],
  [1,6],[2,6],[3,6],[4,6],[5,6],[6,6],
  [0,7],[1,7],[2,7],[3,7],[4,7],[5,7],[6,7],[7,7],
];

const OUTFIT_GOLDEN_PIXELS: [number, number][] = [
  [2,3],[3,3],[4,3],[5,3],
  [1,4],[2,4],[3,4],[4,4],[5,4],[6,4],
  [0,5],[1,5],[2,5],[3,5],[4,5],[5,5],[6,5],[7,5],
  [1,6],[2,6],[3,6],[4,6],[5,6],[6,6],
  [2,7],[3,7],[4,7],[5,7],
];

// --- Accessory sprites (overlay) ---

const ACC_GLASSES_PIXELS: [number, number][] = [
  [2,3],[3,3],[5,3],[6,3],
  [2,4],[3,4],[4,4],[5,4],[6,4],
];

const ACC_HEADBAND_PIXELS: [number, number][] = [
  [1,2],[2,2],[3,2],[4,2],[5,2],[6,2],
];

const ACC_WINGS_PIXELS: [number, number][] = [
  [0,4],[0,5],[0,6],
  [7,4],[7,5],[7,6],
  [0,3],[7,3],
];

const ACC_HALO_PIXELS: [number, number][] = [
  [2,0],[3,0],[4,0],[5,0],
  [1,0],[6,0],
];

// --- Sprite lookup ---

const PIXEL_SPRITES: Record<string, [number, number][]> = {
  'hair-spiky': HAIR_SPIKY_PIXELS,
  'hair-long': HAIR_LONG_PIXELS,
  'hair-mohawk': HAIR_MOHAWK_PIXELS,
  'hair-crown': HAIR_CROWN_PIXELS,
  'hair-flame': HAIR_FLAME_PIXELS,
  'outfit-tshirt': OUTFIT_TSHIRT_PIXELS,
  'outfit-hoodie': OUTFIT_HOODIE_PIXELS,
  'outfit-armor': OUTFIT_ARMOR_PIXELS,
  'outfit-wizard': OUTFIT_WIZARD_PIXELS,
  'outfit-golden': OUTFIT_GOLDEN_PIXELS,
  'acc-glasses': ACC_GLASSES_PIXELS,
  'acc-headband': ACC_HEADBAND_PIXELS,
  'acc-wings': ACC_WINGS_PIXELS,
  'acc-halo': ACC_HALO_PIXELS,
};

const BG_RENDERERS: Record<string, React.FC<{ size: number }>> = {
  'bg-default': BgDefault,
  'bg-sunset': BgSunset,
  'bg-galaxy': BgGalaxy,
};

export function renderSprite(spriteKey: string, size: number): React.ReactNode {
  // Background sprites use gradient fills
  const BgRenderer = BG_RENDERERS[spriteKey];
  if (BgRenderer) {
    return <BgRenderer size={size} />;
  }

  // acc-none renders nothing
  if (spriteKey === 'acc-none') {
    return null;
  }

  // Pixel-based sprites
  const pixels = PIXEL_SPRITES[spriteKey];
  if (!pixels) {
    return null;
  }

  const def = SPRITE_REGISTRY[spriteKey];
  if (!def) {
    return null;
  }

  return <PixelGrid pixels={pixels} size={size} colors={def.colors} />;
}

// Base body: skin-toned character silhouette (always rendered)
const BASE_BODY_PIXELS: [number, number][] = [
  // Head
  [3,2],[4,2],
  [2,3],[3,3],[4,3],[5,3],
  // Eyes
  [3,3],[4,3],
  // Body
  [3,4],[4,4],
  [2,5],[3,5],[4,5],[5,5],
  [2,6],[3,6],[4,6],[5,6],
  // Legs
  [2,7],[3,7],[4,7],[5,7],
];

const SKIN_COLOR = '#FFCC99';
const SKIN_SHADOW = '#E8B584';

export function renderBaseBody(size: number): React.ReactNode {
  const cellSize = px(size);

  return (
    <>
      {BASE_BODY_PIXELS.map(([col, row], i) => (
        <div
          key={`body-${i}`}
          style={{
            position: 'absolute',
            left: col * cellSize,
            top: row * cellSize,
            width: cellSize,
            height: cellSize,
            backgroundColor: i % 4 === 0 ? SKIN_SHADOW : SKIN_COLOR,
          }}
        />
      ))}
      {/* Eyes */}
      <div style={{
        position: 'absolute',
        left: 3 * cellSize + cellSize * 0.2,
        top: 3 * cellSize + cellSize * 0.2,
        width: Math.max(2, cellSize * 0.4),
        height: Math.max(2, cellSize * 0.4),
        borderRadius: '50%',
        backgroundColor: '#333',
      }} />
      <div style={{
        position: 'absolute',
        left: 4 * cellSize + cellSize * 0.4,
        top: 3 * cellSize + cellSize * 0.2,
        width: Math.max(2, cellSize * 0.4),
        height: Math.max(2, cellSize * 0.4),
        borderRadius: '50%',
        backgroundColor: '#333',
      }} />
    </>
  );
}
