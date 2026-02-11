import '@testing-library/jest-dom';

// Mock window.Telegram.WebApp
Object.defineProperty(window, 'Telegram', {
  value: {
    WebApp: {
      initData: 'test',
      initDataUnsafe: {
        user: { id: 123, first_name: 'Test' },
      },
      ready: vi.fn(),
      expand: vi.fn(),
      close: vi.fn(),
      enableClosingConfirmation: vi.fn(),
      disableClosingConfirmation: vi.fn(),
      disableVerticalSwipes: vi.fn(),
      enableVerticalSwipes: vi.fn(),
      colorScheme: 'dark',
      themeParams: {},
      platform: 'tdesktop',
      version: '7.0',
      HapticFeedback: {
        impactOccurred: vi.fn(),
        notificationOccurred: vi.fn(),
        selectionChanged: vi.fn(),
      },
      BackButton: {
        show: vi.fn(),
        hide: vi.fn(),
        onClick: vi.fn(),
        offClick: vi.fn(),
      },
      MainButton: {
        show: vi.fn(),
        hide: vi.fn(),
        enable: vi.fn(),
        disable: vi.fn(),
        setText: vi.fn(),
        onClick: vi.fn(),
        offClick: vi.fn(),
        showProgress: vi.fn(),
        hideProgress: vi.fn(),
        color: '',
        textColor: '',
      },
      showAlert: vi.fn(),
      showConfirm: vi.fn(),
      showPopup: vi.fn(),
      openLink: vi.fn(),
      openTelegramLink: vi.fn(),
      sendData: vi.fn(),
    },
  },
  writable: true,
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn().mockReturnValue([]);
}

Object.defineProperty(window, 'IntersectionObserver', {
  value: MockIntersectionObserver,
  writable: true,
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});
