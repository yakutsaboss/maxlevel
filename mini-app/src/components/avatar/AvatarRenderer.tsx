import { AVATAR_LAYER_ORDER, SPRITE_REGISTRY } from '@/data/avatarItems';
import { renderSprite, renderBaseBody } from './AvatarSprites';
import { AvatarAnimator, type AvatarAnimation } from './AvatarAnimator';

export interface EquippedItems {
  hairstyle: string | null;
  outfit: string | null;
  accessory: string | null;
  background: string | null;
}

export interface AvatarRendererProps {
  equipped: EquippedItems;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
  animation?: AvatarAnimation;
}

const SIZE_MAP: Record<string, number> = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
};

const DEFAULT_EQUIPPED: EquippedItems = {
  background: 'bg-default',
  outfit: 'outfit-tshirt',
  hairstyle: 'hair-spiky',
  accessory: 'acc-none',
};

export function AvatarRenderer({ equipped, size = 'md', className = '', onClick, animation }: AvatarRendererProps) {
  const px = SIZE_MAP[size] ?? 48;

  const resolved: EquippedItems = {
    background: equipped.background || DEFAULT_EQUIPPED.background,
    outfit: equipped.outfit || DEFAULT_EQUIPPED.outfit,
    hairstyle: equipped.hairstyle || DEFAULT_EQUIPPED.hairstyle,
    accessory: equipped.accessory || DEFAULT_EQUIPPED.accessory,
  };

  const content = (
    <div
      className={className}
      onClick={onClick}
      style={{
        position: 'relative',
        width: px,
        height: px,
        borderRadius: px * 0.15,
        overflow: 'hidden',
        flexShrink: 0,
        cursor: onClick ? 'pointer' : undefined,
      }}
    >
      {AVATAR_LAYER_ORDER.map((category) => {
        const spriteKey = resolved[category];
        if (!spriteKey) return null;

        const def = SPRITE_REGISTRY[spriteKey];
        if (!def) return null;

        return (
          <div
            key={category}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: def.zIndex,
            }}
          >
            {renderSprite(spriteKey, px)}
          </div>
        );
      })}

      {/* Base body always renders between outfit and hairstyle */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 20 }}>
        {renderBaseBody(px)}
      </div>
    </div>
  );

  if (animation) {
    return <AvatarAnimator animation={animation}>{content}</AvatarAnimator>;
  }

  return content;
}
