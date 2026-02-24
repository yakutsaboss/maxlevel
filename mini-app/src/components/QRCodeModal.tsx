import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check } from 'lucide-react';

interface QRCodeModalProps {
  type: 'profile' | 'challenge';
  id: number;
  title: string;
  onClose: () => void;
}

export function QRCodeModal({ type, id, title, onClose }: QRCodeModalProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const link = `https://t.me/yakutsabot/levelapp?startapp=${type}_${id}`;
  const heading = type === 'profile' ? t('qr.shareProfile') : t('qr.shareChallenge');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-telegram-bg rounded-3xl p-6 mx-4 max-w-sm w-full shadow-2xl border border-telegram-hint/10"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-telegram-text">{heading}</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-telegram-hint/10 active:scale-90 transition-transform"
              aria-label={t('common.close')}
            >
              <X className="w-4 h-4 text-telegram-hint" aria-hidden="true" />
            </button>
          </div>

          {/* Title */}
          <p className="text-sm text-telegram-hint text-center mb-4">{title}</p>

          {/* QR Code */}
          <div className="flex justify-center mb-6">
            <div className="bg-white rounded-2xl p-4">
              <QRCodeSVG
                value={link}
                size={200}
                level="M"
                includeMargin={false}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-telegram-link/10 text-telegram-link font-medium active:scale-95 transition-transform"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" aria-hidden="true" />
                  {t('qr.copied')}
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" aria-hidden="true" />
                  {t('qr.copyLink')}
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-telegram-hint/10 text-telegram-hint font-medium active:scale-95 transition-transform"
            >
              {t('common.close')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
