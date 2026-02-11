import { useState } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Check } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';
import { ProgressBar } from './ui/ProgressBar';

interface HeroIntroProps {
  progress: number;
  stepLabel?: string;
  nickname?: string;
  onNicknameChange: (name: string) => void;
  onNext: () => void;
}

export function HeroIntro({ progress, stepLabel, nickname, onNicknameChange, onNext }: HeroIntroProps) {
  const { user, haptic } = useTelegram();
  const displayName = nickname || user?.first_name || 'Friend';
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(displayName);

  const handleStartEdit = () => {
    haptic.selection();
    setEditValue(displayName);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed) {
      haptic.notification('success');
      onNicknameChange(trimmed);
    }
    setIsEditing(false);
  };

  const handleAccept = () => {
    haptic.notification('success');
    onNext();
  };

  return (
    <div className="min-h-screen flex flex-col bg-telegram-bg">
      <ProgressBar progress={progress} stepLabel={stepLabel} />

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <motion.div
          className="relative w-full max-w-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Main card */}
          <div
            className="rounded-3xl p-6 border-2 border-purple-400 bg-telegram-secondaryBg"
            style={{
              boxShadow: '0 0 20px rgba(168, 85, 247, 0.3), inset 0 0 20px rgba(168, 85, 247, 0.05)',
            }}
          >
            <div className="bg-telegram-bg rounded-2xl p-5 text-center">
              <p className="text-sm text-telegram-hint mb-1">Your Name</p>

              {isEditing ? (
                <div className="flex items-center gap-2 justify-center mb-4">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    maxLength={20}
                    className="text-2xl font-bold text-telegram-text bg-transparent border-b-2 border-purple-400 text-center outline-none w-40"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                  />
                  <button
                    onClick={handleSaveEdit}
                    className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0"
                  >
                    <Check className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 justify-center mb-4">
                  <h2 className="text-2xl font-bold text-telegram-text">{displayName}</h2>
                  <button
                    onClick={handleStartEdit}
                    className="w-7 h-7 rounded-full bg-telegram-hint/15 flex items-center justify-center flex-shrink-0"
                  >
                    <Pencil className="w-3.5 h-3.5 text-telegram-hint" />
                  </button>
                </div>
              )}

              <p className="text-telegram-text leading-relaxed">
                Ready to improve your life? Let's set up your personal plan!
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="px-6 pb-8">
        <motion.button
          onClick={handleAccept}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-lg font-bold shadow-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          whileTap={{ scale: 0.97 }}
        >
          Let's Go!
        </motion.button>
      </div>
    </div>
  );
}
