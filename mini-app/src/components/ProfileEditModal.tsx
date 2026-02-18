import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, Check, Loader2, AlertCircle, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '@/api/client';
import { AvatarRenderer, type EquippedItems } from '@/components/avatar';
import { FocusTrap } from '@/components/FocusTrap';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  telegramId: number;
  currentName: string;
  currentAvatarId: number;
  equippedItems?: EquippedItems;
  haptic: {
    impact: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notification: (type: 'error' | 'success' | 'warning') => void;
    selection: () => void;
  };
}

const AVATAR_KEYS = [
  { icon: '⚔️', color: 'bg-red-500', labelKey: 'profile.avatarWarrior' },
  { icon: '🧙', color: 'bg-purple-500', labelKey: 'profile.avatarMage' },
  { icon: '🛡️', color: 'bg-blue-500', labelKey: 'profile.avatarGuardian' },
  { icon: '🏹', color: 'bg-green-500', labelKey: 'profile.avatarRanger' },
  { icon: '🔥', color: 'bg-orange-500', labelKey: 'profile.avatarPyro' },
  { icon: '💎', color: 'bg-cyan-500', labelKey: 'profile.avatarMystic' },
  { icon: '🌟', color: 'bg-yellow-500', labelKey: 'profile.avatarStar' },
  { icon: '🦊', color: 'bg-amber-500', labelKey: 'profile.avatarFox' },
  { icon: '🐉', color: 'bg-emerald-500', labelKey: 'profile.avatarDragon' },
  { icon: '🦅', color: 'bg-sky-500', labelKey: 'profile.avatarEagle' },
  { icon: '🐺', color: 'bg-slate-500', labelKey: 'profile.avatarWolf' },
  { icon: '🎯', color: 'bg-rose-500', labelKey: 'profile.avatarHunter' },
  { icon: '👑', color: 'bg-yellow-600', labelKey: 'profile.avatarRoyal' },
  { icon: '🗡️', color: 'bg-zinc-500', labelKey: 'profile.avatarRogue' },
  { icon: '🌙', color: 'bg-indigo-500', labelKey: 'profile.avatarNight' },
  { icon: '☀️', color: 'bg-orange-400', labelKey: 'profile.avatarDawn' },
];

export const AVATAR_OPTIONS = AVATAR_KEYS.map(a => ({ icon: a.icon, color: a.color, label: a.labelKey }));

export function ProfileEditModal({ isOpen, onClose, onSaved, telegramId, currentName, currentAvatarId, equippedItems, haptic }: ProfileEditModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState(currentName);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNickname(currentName);
      setErrorMsg('');
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, currentName]);

  const handleSave = async () => {
    haptic.impact('medium');
    setSaving(true);
    setErrorMsg('');
    try {
      await apiClient.updateUserProfile(telegramId, {
        first_name: nickname.trim() || currentName,
        avatar_id: currentAvatarId,
      });
      haptic.notification('success');
      onSaved();
      onClose();
    } catch {
      setErrorMsg(t('profile.saveFailed'));
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

  const handleOpenAvatarStudio = () => {
    haptic.impact('light');
    onClose();
    navigate('/avatar');
  };

  const currentAvatar = AVATAR_KEYS[Math.min(Math.max(0, currentAvatarId - 1), AVATAR_KEYS.length - 1)];

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
          <FocusTrap onEscape={handleCancel}>
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
              <h2 className="text-xl font-bold">{t('profile.editProfile')}</h2>
              <button onClick={handleCancel} className="p-2 rounded-xl bg-telegram-hint/10 active:scale-95 transition-transform">
                <X className="w-5 h-5 text-telegram-hint" />
              </button>
            </div>

            <div className="mb-6">
              <label className="text-sm text-telegram-hint mb-2 block">{t('profile.nickname')}</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={32}
                className="w-full bg-telegram-bg border border-telegram-hint/20 rounded-xl px-4 py-3 text-telegram-text focus:outline-none focus:border-telegram-link transition-colors"
                placeholder={t('profile.enterNickname')}
              />
              <span className="text-xs text-telegram-hint mt-1 block">{nickname.length}/32</span>
            </div>

            {/* Avatar Section — preview + link to Avatar Studio */}
            <div className="mb-6">
              <label className="text-sm text-telegram-hint mb-3 block">{t('profile.chooseAvatar')}</label>
              <button
                onClick={handleOpenAvatarStudio}
                className="w-full flex items-center gap-4 bg-telegram-bg rounded-2xl p-4 border border-telegram-hint/20 active:scale-[0.98] transition-transform"
              >
                {equippedItems ? (
                  <AvatarRenderer equipped={equippedItems} size="lg" />
                ) : (
                  <div className={`w-12 h-12 rounded-full ${currentAvatar.color} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-2xl">{currentAvatar.icon}</span>
                  </div>
                )}
                <div className="flex-1 text-left">
                  <span className="font-semibold text-sm flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-purple-500" />
                    {t('profile.openAvatarStudio')}
                  </span>
                  <p className="text-xs text-telegram-hint mt-0.5">{t('profile.customizeAvatarDesc')}</p>
                </div>
                <span className="text-telegram-hint text-lg">&rsaquo;</span>
              </button>
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
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-70 bg-telegram-link text-white"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />{t('settings.saving')}</>
                ) : (
                  <><Check className="w-4 h-4" />{t('common.save')}</>
                )}
              </button>
            </div>
          </motion.div>
          </FocusTrap>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
