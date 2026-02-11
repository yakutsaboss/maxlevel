import React from 'react';

/**
 * Shared framer-motion mock for tests.
 *
 * `motion.div`, `motion.button`, etc. render plain HTML elements,
 * forwarding children, className, onClick, disabled, aria-*, and other
 * standard DOM attributes while dropping framer-specific animation props
 * (initial, animate, exit, transition, whileHover, whileTap, variants, etc.).
 *
 * Usage in individual test files:
 *   vi.mock('framer-motion', () => framerMotionMock);
 */

// Framer-specific props that should NOT be forwarded to the DOM element
const FRAMER_PROPS = new Set([
  'initial',
  'animate',
  'exit',
  'transition',
  'variants',
  'whileHover',
  'whileTap',
  'whileInView',
  'whileFocus',
  'whileDrag',
  'drag',
  'dragConstraints',
  'dragElastic',
  'dragMomentum',
  'dragTransition',
  'layout',
  'layoutId',
  'onAnimationStart',
  'onAnimationComplete',
  'custom',
  'style', // often contains MotionValue objects that break in tests
]);

function filterProps(props: Record<string, unknown>): Record<string, unknown> {
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!FRAMER_PROPS.has(key)) {
      filtered[key] = value;
    }
  }
  return filtered;
}

// Proxy that creates a plain HTML element for any motion.* tag
const motionProxy = new Proxy(
  {},
  {
    get(_target, tag: string) {
      return React.forwardRef(
        ({ children, ...props }: Record<string, unknown>, ref: unknown) =>
          React.createElement(tag, { ...filterProps(props), ref }, children as React.ReactNode),
      );
    },
  },
);

export const framerMotionMock = {
  motion: motionProxy,
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => children,
  useAnimation: () => ({ start: () => Promise.resolve(), stop: () => {} }),
  useMotionValue: (initial: number) => ({ get: () => initial, set: () => {} }),
  useTransform: (value: unknown, input: unknown, output: unknown[]) => ({
    get: () => output?.[0] ?? 0,
    set: () => {},
  }),
  useSpring: (initial: number) => ({ get: () => initial, set: () => {} }),
  useInView: () => true,
  useScroll: () => ({
    scrollX: { get: () => 0 },
    scrollY: { get: () => 0 },
    scrollXProgress: { get: () => 0 },
    scrollYProgress: { get: () => 0 },
  }),
};
