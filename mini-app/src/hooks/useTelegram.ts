import { useEffect, useMemo } from 'react';
import WebApp from '@twa-dev/sdk';

/**
 * Hook for accessing Telegram WebApp SDK
 */
export function useTelegram() {
  const tg = useMemo(() => WebApp, []);

  useEffect(() => {
    // Initialize Telegram WebApp
    tg.ready();
    tg.expand();

    // Enable closing confirmation
    tg.enableClosingConfirmation();

    // Disable vertical swipes so barrel wheels / scrollable elements
    // don't trigger Telegram's swipe-to-close gesture
    if ('disableVerticalSwipes' in tg && typeof tg.disableVerticalSwipes === 'function') {
      tg.disableVerticalSwipes();
    }

    return () => {
      tg.disableClosingConfirmation();
      if ('enableVerticalSwipes' in tg && typeof tg.enableVerticalSwipes === 'function') {
        tg.enableVerticalSwipes();
      }
    };
  }, [tg]);

  return {
    // Core WebApp instance
    tg,

    // User data
    user: tg.initDataUnsafe?.user,
    queryId: tg.initDataUnsafe?.query_id,
    initData: tg.initData,

    // Theme
    colorScheme: tg.colorScheme,
    themeParams: tg.themeParams,

    // Platform info
    platform: tg.platform,
    version: tg.version,

    // Methods
    ready: () => tg.ready(),
    expand: () => tg.expand(),
    close: () => tg.close(),

    // Haptic feedback
    haptic: {
      impact: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium') =>
        tg.HapticFeedback.impactOccurred(style),
      notification: (type: 'error' | 'success' | 'warning') =>
        tg.HapticFeedback.notificationOccurred(type),
      selection: () => tg.HapticFeedback.selectionChanged(),
    },

    // Popups
    showAlert: (message: string) => tg.showAlert(message),
    showConfirm: (message: string) =>
      new Promise<boolean>((resolve) => {
        tg.showConfirm(message, resolve);
      }),
    showPopup: (
      params: {
        title?: string;
        message: string;
        buttons?: Array<{ id?: string; type: 'default' | 'destructive'; text: string }>;
      }
    ) =>
      new Promise<string>((resolve) => {
        tg.showPopup(params, (id) => resolve(id ?? ''));
      }),

    // Navigation
    openLink: (url: string) => tg.openLink(url),
    openTelegramLink: (url: string) => tg.openTelegramLink(url),

    // Buttons
    BackButton: tg.BackButton,
    MainButton: tg.MainButton,

    // Send data to bot
    sendData: (data: string) => tg.sendData(data),
  };
}

/**
 * Hook for managing Telegram MainButton
 */
export function useMainButton(
  text: string,
  onClick: () => void,
  options?: {
    color?: string;
    textColor?: string;
    isActive?: boolean;
    isVisible?: boolean;
  }
) {
  const { MainButton, haptic } = useTelegram();

  useEffect(() => {
    // When text is empty, hide the button and skip setup
    if (!text) {
      MainButton.hide();
      return () => {
        MainButton.hide();
      };
    }

    // Set button text
    MainButton.setText(text);

    // Set colors
    if (options?.color) {
      MainButton.color = options.color as `#${string}`;
    }
    if (options?.textColor) {
      MainButton.textColor = options.textColor as `#${string}`;
    }

    // Set visibility
    if (options?.isVisible !== false) {
      MainButton.show();
    } else {
      MainButton.hide();
    }

    // Set active state
    if (options?.isActive !== false) {
      MainButton.enable();
    } else {
      MainButton.disable();
    }

    // Set click handler with haptic feedback
    const handleClick = () => {
      haptic.impact('medium');
      onClick();
    };

    MainButton.onClick(handleClick);

    return () => {
      MainButton.offClick(handleClick);
      MainButton.hide();
    };
  }, [MainButton, text, onClick, options, haptic]);

  return {
    show: () => MainButton.show(),
    hide: () => MainButton.hide(),
    enable: () => MainButton.enable(),
    disable: () => MainButton.disable(),
    showProgress: () => MainButton.showProgress(false),
    hideProgress: () => MainButton.hideProgress(),
    setText: (newText: string) => MainButton.setText(newText),
  };
}

/**
 * Hook for managing Telegram BackButton
 */
export function useBackButton(onClick: () => void, isVisible: boolean = true) {
  const { BackButton, haptic } = useTelegram();

  useEffect(() => {
    if (!isVisible) {
      BackButton.hide();
      return;
    }

    const handleClick = () => {
      haptic.impact('light');
      onClick();
    };

    BackButton.onClick(handleClick);
    BackButton.show();

    return () => {
      BackButton.offClick(handleClick);
      BackButton.hide();
    };
  }, [BackButton, onClick, haptic, isVisible]);

  return {
    show: () => BackButton.show(),
    hide: () => BackButton.hide(),
  };
}
