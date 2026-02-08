import { useRef, useEffect, useState, useCallback } from 'react';

interface DrumRollerProps {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  formatLabel?: (value: number) => string;
}

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;
const CENTER_INDEX = Math.floor(VISIBLE_ITEMS / 2);

export function DrumRoller({ min, max, value, onChange, formatLabel }: DrumRollerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startScroll = useRef(0);
  const velocity = useRef(0);
  const lastY = useRef(0);
  const lastTime = useRef(0);
  const animFrame = useRef<number>(0);
  const [scrollOffset, setScrollOffset] = useState((value - min) * ITEM_HEIGHT);

  const items = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  const clampOffset = useCallback(
    (offset: number) => Math.max(0, Math.min(offset, (items.length - 1) * ITEM_HEIGHT)),
    [items.length]
  );

  const snapToNearest = useCallback(
    (offset: number) => {
      const index = Math.round(offset / ITEM_HEIGHT);
      const snapped = clampOffset(index * ITEM_HEIGHT);
      setScrollOffset(snapped);
      const newValue = min + Math.round(snapped / ITEM_HEIGHT);
      if (newValue !== value) {
        onChange(newValue);
      }
    },
    [clampOffset, min, onChange, value]
  );

  useEffect(() => {
    setScrollOffset((value - min) * ITEM_HEIGHT);
  }, [value, min]);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    startY.current = e.clientY;
    startScroll.current = scrollOffset;
    velocity.current = 0;
    lastY.current = e.clientY;
    lastTime.current = Date.now();
    cancelAnimationFrame(animFrame.current);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;

    const now = Date.now();
    const dt = now - lastTime.current;
    const dy = e.clientY - lastY.current;

    if (dt > 0) {
      velocity.current = dy / dt;
    }

    lastY.current = e.clientY;
    lastTime.current = now;

    const delta = startY.current - e.clientY;
    const newOffset = clampOffset(startScroll.current + delta);
    setScrollOffset(newOffset);
  };

  const handlePointerUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    // Apply momentum
    const v = velocity.current;
    if (Math.abs(v) > 0.3) {
      const momentum = -v * 150;
      const targetOffset = clampOffset(scrollOffset + momentum);
      setScrollOffset(targetOffset);
      requestAnimationFrame(() => snapToNearest(targetOffset));
    } else {
      snapToNearest(scrollOffset);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div
        ref={containerRef}
        className="relative overflow-hidden select-none touch-none"
        style={{ height: VISIBLE_ITEMS * ITEM_HEIGHT }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Highlight band for center item */}
        <div
          className="absolute left-0 right-0 bg-telegram-link/10 border-y border-telegram-link/30 rounded-lg z-0 pointer-events-none"
          style={{
            top: CENTER_INDEX * ITEM_HEIGHT,
            height: ITEM_HEIGHT,
          }}
        />

        {/* Fade overlays */}
        <div
          className="absolute top-0 left-0 right-0 z-10 pointer-events-none"
          style={{
            height: CENTER_INDEX * ITEM_HEIGHT,
            background: 'linear-gradient(to bottom, var(--tg-theme-bg-color) 0%, transparent 100%)',
          }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none"
          style={{
            height: CENTER_INDEX * ITEM_HEIGHT,
            background: 'linear-gradient(to top, var(--tg-theme-bg-color) 0%, transparent 100%)',
          }}
        />

        {/* Items */}
        <div
          className="w-48 transition-transform"
          style={{
            transform: `translateY(${CENTER_INDEX * ITEM_HEIGHT - scrollOffset}px)`,
            transitionDuration: isDragging.current ? '0ms' : '200ms',
          }}
        >
          {items.map((item, i) => {
            const distFromCenter = Math.abs(i * ITEM_HEIGHT - scrollOffset) / ITEM_HEIGHT;
            const opacity = Math.max(0.2, 1 - distFromCenter * 0.3);
            const scale = Math.max(0.75, 1 - distFromCenter * 0.08);
            const rotateX = distFromCenter * 12 * (i * ITEM_HEIGHT < scrollOffset ? 1 : -1);

            return (
              <div
                key={item}
                className="flex items-center justify-center text-telegram-text font-semibold"
                style={{
                  height: ITEM_HEIGHT,
                  opacity,
                  transform: `scale(${scale}) perspective(300px) rotateX(${rotateX}deg)`,
                  fontSize: distFromCenter < 0.5 ? '28px' : '20px',
                }}
              >
                {formatLabel ? formatLabel(item) : item}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
