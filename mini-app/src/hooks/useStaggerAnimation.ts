import { useMemo } from 'react';
import type { Variants } from 'framer-motion';

export function useStaggerAnimation(_itemCount: number, delay = 0.05) {
  const containerVariants: Variants = useMemo(
    () => ({
      hidden: {},
      visible: {
        transition: {
          staggerChildren: delay,
          delayChildren: 0,
        },
      },
    }),
    [delay],
  );

  const itemVariants: Variants = useMemo(
    () => ({
      hidden: { opacity: 0, y: 10 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          type: 'spring',
          stiffness: 300,
          damping: 25,
        },
      },
    }),
    [],
  );

  return { containerVariants, itemVariants };
}
