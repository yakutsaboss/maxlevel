import { useState, useEffect } from 'react';
import { X, Check, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '@/api/client';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  telegramId: number;
  currentName: string;
  currentAvatarId: number;
  haptic: {
    impact: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notification: (type: 'error' | 'success' | 'warning') => void;
    selection: () => void;
  };
}

export const AVATAR_OPTIONS = [
  { icon: '⚔️', color: 'bg-red-500', label: 'Warrior' },
  { icon: '🧙', color: 'bg-purple-500', label: 'Mage' },
  { icon: '🛡️', color: 'bg-blue-500', label: 'Guardian' },
  { icon: '🏹', color: 'bg-green-500', label: 'Ranger' },
  { icon: '🔥', color: 'bg-orange-500', label: 'Pyro' },
  { icon: '💎', color: 'bg-cyan-500', label: 'Mystic' },
  { icon: '🌟', color: 'bg-yellow-500', label: 'Star' },
  { icon: '🦊', color: 'bg-amber-500', label: 'Fox' },
  { icon: '🐉', color: 'bg-emerald-500', label: 'Dragon' },
  { icon: '🦅', color: 'bg-sky-500', label: 'Eagle' },
  { icon: '🐺', color: 'bg-slate-500', label: 'Wolf' },
  { icon: '🎯', color: 'bg-rose-500', label: 'Hunter' },
  { icon: '👑', color: 'bg-yellow-600', label: 'Royal' },
  { icon: '🗡️', color: 'bg-zinc-500', label: 'Rogue' },
  { icon: '🌙', color: 'bg-indigo-500', label: 'Night' },
  { icon: '☀️', color: 'bg-orange-400', label: 'Dawn' },
];

export function ProfileEditModal({ isOpen, onClose, onSaved, telegramId, currentName, currentAvatarId, haptic }: ProfileEditModalProps) {
  const [nickname, setNickname] = useState(currentName);
  const [selectedAvatar, setSelectedAvatar] = useState(Math.min(Math.max(0, currentAvatarId - 1), AVATAR_OPTIONS.length - 1));
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNickname(currentName);
      setSelectedAvatar(Math.min(Math.max(0, currentAvatarId - 1), AVATAR_OPTIONS.length - 1));
      setErrorMsg('');
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, currentName, currentAvatarId]);

  const handleSave = async () => {
    haptic.impact('medium');
    setSaving(true);
    setErrorMsg('');
    try {
      await apiClient.updateUserProfile(telegramId, {
        first_name: nickname.trim() || currentName,
        avatar_id: selectedAvatar + 1,
      });
      haptic.notification('success');
      onSaved();
      onClose();
    } catch {
      setErrorMsg('Failed to save profile. Tap Save to retry.');
      haptic.notification('error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (saving) return;
    haptic.impact('light');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end"
          onClick={handleCancel}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="bg-telegram-secondaryBg rounded-t-3xl w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-telegram-hint/30 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Edit Profile</h2>
              <button onClick={handleCancel} className="p-2 rounded-xl bg-telegram-hint/10 active:scale-95 transition-transform">
                <X className="w-5 h-5 text-telegram-hint" />
              </button>
            </div>

            <div className="mb-6">
              <label className="text-sm text-telegram-hint mb-2 block">Nickname</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={32}
                className="w-full bg-telegram-bg border border-telegram-hint/20 rounded-xl px-4 py-3 text-telegram-text focus:outline-none focus:border-telegram-link transition-colors"
                placeholder="Enter your nickname"
              />
              <span className="text-xs text-telegram-hint mt-1 block">{nickname.length}/32</span>
            </div>

            <div className="mb-6">
              <label className="text-sm text-telegram-hint mb-3 block">Choose Avatar</label>
              <div className="grid grid-cols-4 gap-3">
                {AVATAR_OPTIONS.map((avatar, index) => (
                  <button
                    key={index}
                    onClick={() => { setSelectedAvatar(index); haptic.selection(); }}
                    className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all active:scale-95 ${
                      selectedAvatar === index
                        ? 'border-telegram-link bg-telegram-link/10'
                        : 'border-transparent bg-telegram-bg'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full ${avatar.color} flex items-center justify-center mb-1`}>
                      <span className="text-xl">{avatar.icon}</span>
                    </div>
                    <span className="text-xs text-telegram-hint">{avatar.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 text-red-500 text-sm mb-4 bg-red-50 rounded-xl px-3 py-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex-1 py-3 rounded-xl border border-telegram-hint/20 text-telegram-hint font-medium active:scale-95 transition-transform disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-70 bg-telegram-link text-white"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
                ) : (
                  <><Check className="w-4 h-4" />Save</>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
