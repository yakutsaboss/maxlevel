import Lottie from 'lottie-react';

interface LottieStickerProps {
  animationData: object;
  size?: number;
  loop?: boolean;
  className?: string;
}

export function LottieSticker({ animationData, size = 120, loop = false, className }: LottieStickerProps) {
  return (
    <Lottie
      animationData={animationData}
      loop={loop}
      style={{ width: size, height: size }}
      className={className}
    />
  );
}
