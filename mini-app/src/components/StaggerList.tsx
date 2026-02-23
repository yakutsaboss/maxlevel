import { type ReactNode, Children } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface StaggerListProps {
  children: ReactNode[];
  staggerDelay?: number;
  className?: string;
}

export function StaggerList({ children, staggerDelay = 0.05, className }: StaggerListProps) {
  const items = Children.toArray(children);

  return (
    <div className={className}>
      <AnimatePresence mode="sync">
        {items.map((child, i) => (
          <motion.div
            key={(child as any).key ?? i}
            custom={i}
            variants={{
              hidden: { opacity: 0, y: 10 },
              visible: {
                opacity: 1,
                y: 0,
                transition: {
                  type: 'spring',
                  stiffness: 300,
                  damping: 25,
                  delay: i * staggerDelay,
                },
              },
            }}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
          >
            {child}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
