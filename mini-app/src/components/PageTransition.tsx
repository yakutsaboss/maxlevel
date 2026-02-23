import { type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

interface PageTransitionProps {
  children: ReactNode;
  onExitComplete?: () => void;
}

const variants = {
  initial: { opacity: 0, y: 6, scale: 0.99 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 30,
      duration: 0.25,
    },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.1 },
  },
};

export function PageTransition({ children, onExitComplete }: PageTransitionProps) {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" onExitComplete={onExitComplete}>
      <motion.div
        key={location.pathname}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{ width: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
