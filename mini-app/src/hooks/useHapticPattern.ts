import { useTelegram } from '@/hooks/useTelegram';

export function useHapticPattern() {
  const { haptic } = useTelegram();

  return {
    tap: () => haptic.impact('light'),
    toggle: () => haptic.selection(),
    success: () => haptic.notification('success'),
    error: () => haptic.notification('error'),
    delete: () => haptic.impact('medium'),
    celebrate: () => haptic.impact('heavy'),
  };
}
