/**
 * SkipLink — "Skip to main content" link for keyboard users.
 * Visually hidden until focused, then appears at the top of the viewport.
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-telegram-link focus:text-white focus:text-sm focus:font-semibold focus:shadow-lg focus:outline-none"
    >
      Skip to main content
    </a>
  );
}
