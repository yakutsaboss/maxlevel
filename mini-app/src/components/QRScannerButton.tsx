import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ScanLine } from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import { useToastContext } from '@/contexts/ToastContext';

const SCAN_AVAILABLE =
  typeof WebApp !== 'undefined' &&
  typeof WebApp.showScanQrPopup === 'function' &&
  WebApp.isVersionAtLeast('6.4');

function parseQrResult(text: string): { path: string } | null {
  // Try "profile_123" or "challenge_456" format
  const shortMatch = text.match(/^(profile|challenge)_(\d+)$/);
  if (shortMatch) {
    const [, type, id] = shortMatch;
    if (type === 'profile') return { path: `/profile?viewUser=${id}` };
    return { path: `/social?challenge=${id}` };
  }

  // Try full URL with startapp param
  try {
    const url = new URL(text);
    const startapp = url.searchParams.get('startapp');
    if (startapp) {
      const paramMatch = startapp.match(/^(profile|challenge)_(\d+)$/);
      if (paramMatch) {
        const [, type, id] = paramMatch;
        if (type === 'profile') return { path: `/profile?viewUser=${id}` };
        return { path: `/social?challenge=${id}` };
      }
    }
  } catch {
    // not a URL, continue
  }

  // Try t.me link format
  const tmeMatch = text.match(/startapp=(profile|challenge)_(\d+)/);
  if (tmeMatch) {
    const [, type, id] = tmeMatch;
    if (type === 'profile') return { path: `/profile?viewUser=${id}` };
    return { path: `/social?challenge=${id}` };
  }

  return null;
}

interface QRScannerButtonProps {
  className?: string;
}

export function QRScannerButton({ className }: QRScannerButtonProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToastContext();

  const handleScan = useCallback(() => {
    if (!SCAN_AVAILABLE) return;

    try {
      WebApp.showScanQrPopup(
        { text: t('qr.scanHint') },
        (result: string) => {
          const parsed = parseQrResult(result);
          if (parsed) {
            WebApp.closeScanQrPopup();
            navigate(parsed.path);
            return true;
          }
          showToast(t('qr.invalidCode'), 'error');
          return true;
        },
      );
    } catch {
      showToast(t('qr.invalidCode'), 'error');
    }
  }, [t, navigate, showToast]);

  if (!SCAN_AVAILABLE) return null;

  return (
    <button
      onClick={handleScan}
      className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-xl active:scale-95 transition-transform ${className ?? 'bg-telegram-link/10 text-telegram-link'}`}
      aria-label={t('qr.scanTitle')}
    >
      <ScanLine className="w-4 h-4" aria-hidden="true" />
      {t('qr.scanTitle')}
    </button>
  );
}
