import { Info, BookOpen, Bug } from 'lucide-react';
import { motion } from 'framer-motion';

const APP_VERSION = '1.0.0';

interface AboutSectionProps {
  onOpenTelegramLink: (url: string) => void;
}

export function AboutSection({ onOpenTelegramLink }: AboutSectionProps) {
  return (
    <div className="px-4 mt-6 mb-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-gray-500 w-10 h-10 rounded-xl flex items-center justify-center text-white">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">About</h3>
            <p className="text-xs text-telegram-hint">Version {APP_VERSION}</p>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => onOpenTelegramLink('https://t.me/maxlevelapp')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-telegram-bg border border-telegram-hint/10 active:scale-[0.98] transition-transform"
          >
            <BookOpen className="w-4 h-4 text-telegram-link flex-shrink-0" />
            <span className="text-sm text-telegram-text">How it works</span>
            <span className="ml-auto text-telegram-hint text-xs">&rsaquo;</span>
          </button>

          <button
            onClick={() => onOpenTelegramLink('https://t.me/maxlevelapp')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-telegram-bg border border-telegram-hint/10 active:scale-[0.98] transition-transform"
          >
            <Bug className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-sm text-telegram-text">Report a bug</span>
            <span className="ml-auto text-telegram-hint text-xs">&rsaquo;</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
