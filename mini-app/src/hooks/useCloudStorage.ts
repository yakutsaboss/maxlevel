import WebApp from '@twa-dev/sdk';

const CS_AVAILABLE = typeof WebApp?.CloudStorage?.setItem === 'function';

export function useCloudStorage() {
  const setItem = async (key: string, value: string): Promise<void> => {
    if (!CS_AVAILABLE) return;
    return new Promise((resolve, reject) => {
      WebApp.CloudStorage.setItem(key, value, (err) => err ? reject(err) : resolve());
    });
  };

  const getItem = async (key: string): Promise<string | null> => {
    if (!CS_AVAILABLE) return localStorage.getItem(key);
    return new Promise((resolve, reject) => {
      WebApp.CloudStorage.getItem(key, (err, val) => err ? reject(err) : resolve(val ?? null));
    });
  };

  const getItems = async (keys: string[]): Promise<Record<string, string>> => {
    if (!CS_AVAILABLE) {
      const result: Record<string, string> = {};
      keys.forEach(k => { const v = localStorage.getItem(k); if (v) result[k] = v; });
      return result;
    }
    return new Promise((resolve, reject) => {
      WebApp.CloudStorage.getItems(keys, (err, vals) => err ? reject(err) : resolve(vals ?? {}));
    });
  };

  const removeItem = async (key: string): Promise<void> => {
    if (!CS_AVAILABLE) { localStorage.removeItem(key); return; }
    return new Promise((resolve, reject) => {
      WebApp.CloudStorage.removeItem(key, (err) => err ? reject(err) : resolve());
    });
  };

  return { setItem, getItem, getItems, removeItem, isAvailable: CS_AVAILABLE };
}
