import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';

describe('useServiceWorker', () => {
  let mockRegister: ReturnType<typeof vi.fn>;
  let mockAddControllerChangeListener: ReturnType<typeof vi.fn>;
  let mockRemoveControllerChangeListener: ReturnType<typeof vi.fn>;
  let windowListeners: Map<string, Set<EventListener>>;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    windowListeners = new Map();

    // Mock window.addEventListener/removeEventListener for online/offline
    vi.spyOn(window, 'addEventListener').mockImplementation((type, listener) => {
      if (!windowListeners.has(type)) windowListeners.set(type, new Set());
      windowListeners.get(type)!.add(listener as EventListener);
    });
    vi.spyOn(window, 'removeEventListener').mockImplementation((type, listener) => {
      windowListeners.get(type)?.delete(listener as EventListener);
    });

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });

    // Mock service worker registration
    mockAddControllerChangeListener = vi.fn();
    mockRemoveControllerChangeListener = vi.fn();
    mockRegister = vi.fn().mockResolvedValue({
      waiting: null,
      installing: null,
      addEventListener: vi.fn(),
    });

    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: mockRegister,
        controller: null,
        addEventListener: mockAddControllerChangeListener,
        removeEventListener: mockRemoveControllerChangeListener,
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // Cleanup React tree BEFORE restoring navigator mocks.
    // This ensures useEffect cleanup can call navigator.serviceWorker.removeEventListener
    // while the mock is still in place.
    cleanup();
    vi.restoreAllMocks();
  });

  async function importAndRenderHook() {
    const mod = await import('@/hooks/useServiceWorker');
    return renderHook(() => mod.useServiceWorker());
  }

  it('initializes with online status from navigator.onLine', async () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    const { result } = await importAndRenderHook();
    expect(result.current.isOffline).toBe(false);
  });

  it('initializes as offline when navigator.onLine is false', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const { result } = await importAndRenderHook();
    expect(result.current.isOffline).toBe(true);
  });

  it('tracks online/offline events', async () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    const { result } = await importAndRenderHook();
    expect(result.current.isOffline).toBe(false);

    // Simulate going offline
    act(() => {
      const listeners = windowListeners.get('offline');
      listeners?.forEach(fn => fn(new Event('offline')));
    });
    expect(result.current.isOffline).toBe(true);

    // Simulate going back online
    act(() => {
      const listeners = windowListeners.get('online');
      listeners?.forEach(fn => fn(new Event('online')));
    });
    expect(result.current.isOffline).toBe(false);
  });

  it('registers service worker at /levelapp/sw.js', async () => {
    await importAndRenderHook();
    expect(mockRegister).toHaveBeenCalledWith('/levelapp/sw.js');
  });

  it('sets isUpdateAvailable when registration has waiting worker', async () => {
    const waitingWorker = { state: 'installed', postMessage: vi.fn() };
    mockRegister.mockResolvedValue({
      waiting: waitingWorker,
      installing: null,
      addEventListener: vi.fn(),
    });

    // Need a controller for the update detection logic
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: mockRegister,
        controller: {}, // existing controller means this is an update
        addEventListener: mockAddControllerChangeListener,
        removeEventListener: mockRemoveControllerChangeListener,
      },
      configurable: true,
    });

    const { result } = await importAndRenderHook();

    // Wait for the async register to complete
    await vi.waitFor(() => {
      expect(result.current.isUpdateAvailable).toBe(true);
    });
  });

  it('updateServiceWorker sends SKIP_WAITING message', async () => {
    const waitingWorker = { state: 'installed', postMessage: vi.fn() };
    mockRegister.mockResolvedValue({
      waiting: waitingWorker,
      installing: null,
      addEventListener: vi.fn(),
    });

    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: mockRegister,
        controller: {},
        addEventListener: mockAddControllerChangeListener,
        removeEventListener: mockRemoveControllerChangeListener,
      },
      configurable: true,
    });

    const { result } = await importAndRenderHook();

    await vi.waitFor(() => {
      expect(result.current.isUpdateAvailable).toBe(true);
    });

    act(() => {
      result.current.updateServiceWorker();
    });

    expect(waitingWorker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  });

  it('listens for controllerchange event', async () => {
    await importAndRenderHook();
    expect(mockAddControllerChangeListener).toHaveBeenCalledWith(
      'controllerchange',
      expect.any(Function),
    );
  });

  it('cleans up event listeners on unmount', async () => {
    const { unmount } = await importAndRenderHook();
    unmount();

    // Should have removed controllerchange listener
    expect(mockRemoveControllerChangeListener).toHaveBeenCalledWith(
      'controllerchange',
      expect.any(Function),
    );

    // Should have removed online/offline listeners
    expect(window.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
  });
});
