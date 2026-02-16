import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './AvatarAnimations.css';

export type AvatarAnimation = 'idle' | 'celebrate' | 'levelup' | 'walk' | 'none';

export interface AvatarAnimatorProps {
  animation: AvatarAnimation;
  children: React.ReactNode;
  loop?: boolean;
}

const CONFETTI_COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4'];

function CelebrateAnimation({ children, loop }: { children: React.ReactNode; loop?: boolean }) {
  const particles = useMemo(
    () =>
      CONFETTI_COLORS.map((color, i) => ({
        color,
        x: (i - 1) * 12,
        delay: i * 0.1,
      })),
    [],
  );

  return (
    <div style={{ position: 'relative' }}>
      <motion.div
        animate={{
          y: [0, -8, 0],
        }}
        transition={{
          duration: 0.5,
          ease: 'easeOut',
          repeat: loop ? Infinity : 0,
          repeatDelay: loop ? 1.5 : 0,
        }}
        style={{ imageRendering: 'pixelated' }}
      >
        {children}
      </motion.div>

      <AnimatePresence>
        {particles.map((p, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 1, y: 0, x: p.x, scale: 1 }}
            animate={{
              opacity: [1, 1, 0],
              y: [0, -16, -24],
              scale: [1, 1.2, 0.6],
            }}
            transition={{
              duration: 0.8,
              delay: p.delay,
              ease: 'easeOut',
              repeat: loop ? Infinity : 0,
              repeatDelay: loop ? 1.5 : 0,
            }}
            style={{
              position: 'absolute',
              top: '20%',
              left: '50%',
              width: 4,
              height: 4,
              borderRadius: '50%',
              backgroundColor: p.color,
              pointerEvents: 'none',
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

export function AvatarAnimator({ animation, children, loop = true }: AvatarAnimatorProps) {
  if (animation === 'none') {
    return <>{children}</>;
  }

  if (animation === 'celebrate') {
    return <CelebrateAnimation loop={loop}>{children}</CelebrateAnimation>;
  }

  const cssClass =
    animation === 'idle'
      ? 'avatar-anim-idle'
      : animation === 'levelup'
        ? 'avatar-anim-levelup'
        : animation === 'walk'
          ? 'avatar-anim-walk'
          : '';

  return (
    <div
      className={cssClass}
      style={{
        imageRendering: 'pixelated',
        animationIterationCount: loop ? 'infinite' : '1',
      }}
    >
      {children}
    </div>
  );
}
