import { useState } from 'react';
import { X, Check, User, Sword, Shield, Heart, Flame, Star, Crown, Gem } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (nickname: string, avatarIndex: number) => void;
  currentName: string;
  haptic: {
    impact: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    selection: () => void;
  };
}

const AVATAR_OPTIONS = [
  { icon: <User className="w-6 h-6" />, color: 'bg-purple-500', label: 'Adventurer' },
  { icon: <Sword className="w-6 h-6" />, color: 'bg-red-500', label: 'Warrior' },
  { icon: <Shield className="w-6 h-6" />, color: 'bg-blue-500', label: 'Guardian' },
  { icon: <Heart className="w-6 h-6" />, color: 'bg-pink-500', label: 'Healer' },
  { icon: <Flame className="w-6 h-6" />, color: 'bg-orange-500', label: 'Mage' },
  { icon: <Star className="w-6 h-6" />, color: 'bg-yellow-500', label: 'Ranger' },
  { icon: <Crown className="w-6 h-6" />, color: 'bg-amber-500', label: 'Royal' },
  { icon: <Gem className="w-6 h-6" />, color: 'bg-cyan-500', label: 'Mystic' },
];

export function ProfileEditModal({ isOpen, onClose, onSave, currentName, haptic }: ProfileEditModalProps) {
  const [nickname, setNickname] = useState(currentName);
  const [selectedAvatar, setSelectedAvatar] = useState(0);

  const handleSave = () => {
    haptic.impact('medium');
    onSave(nickname.trim() || currentName, selectedAvatar);
    // TODO: call profile update API when endpoint exists
  };

  const handleCancel = () => {
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
                    <div className={`w-10 h-10 rounded-full ${avatar.color} flex items-center justify-center text-white mb-1`}>
                      {avatar.icon}
                    </div>
                    <span className="text-xs text-telegram-hint">{avatar.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 py-3 rounded-xl border border-telegram-hint/20 text-telegram-hint font-medium active:scale-95 transition-transform"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3 rounded-xl bg-telegram-link text-white font-medium flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <Check className="w-4 h-4" />Save
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
