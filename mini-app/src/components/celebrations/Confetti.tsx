import { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfettiProps {
  show: boolean;
  onComplete?: () => void;
}

interface Particle {
  id: number;
  x: number;
  color: string;
  size: number;
  rotation: number;
  delay: number;
}

const COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#F7DC6F', '#BB8FCE', '#85C1E9', '#F1948A'];

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: 6 + Math.random() * 6,
    rotation: Math.random() * 360,
    delay: Math.random() * 0.3,
  }));
}

export function Confetti({ show, onComplete }: ConfettiProps) {
  const particles = useMemo(() => generateParticles(40), []);

  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(() => onComplete?.(), 2500);
    return () => clearTimeout(timer);
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{
                x: `${p.x}vw`,
                y: '-5vh',
                rotate: 0,
                opacity: 1,
              }}
              animate={{
                y: '110vh',
                rotate: p.rotation + 720,
                opacity: [1, 1, 0.8, 0],
              }}
              transition={{
                duration: 2 + Math.random() * 0.8,
                delay: p.delay,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              style={{
                position: 'absolute',
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
