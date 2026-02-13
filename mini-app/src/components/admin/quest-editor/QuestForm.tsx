import { X, Save, Timer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { QuestFormData, ModeOption } from '@/components/admin/quest-editor/types';

interface QuestFormProps {
  form: QuestFormData;
  modes: ModeOption[];
  editingId: number | null;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  onUpdateField: <K extends keyof QuestFormData>(key: K, value: QuestFormData[K]) => void;
}

export function QuestForm({ form, modes, editingId, saving, onClose, onSave, onUpdateField }: QuestFormProps) {
  const { t } = useTranslation();
  return (
    <div className="bg-telegram-secondaryBg rounded-xl p-4 space-y-3 border border-telegram-button/30">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-telegram-text">
          {editingId ? t('admin.editQuest') : t('admin.newQuest')}
        </h4>
        <button onClick={onClose} className="text-telegram-hint hover:text-telegram-text">
          <X size={18} />
        </button>
      </div>

      {/* Title */}
      <div>
        <label className="text-xs text-telegram-hint block mb-1">{t('admin.title')} *</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => onUpdateField('title', e.target.value)}
          placeholder={t('admin.titlePlaceholder')}
          className="w-full bg-telegram-bg text-telegram-text text-sm rounded-lg px-3 py-2 border border-white/10 focus:border-telegram-button outline-none"
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-xs text-telegram-hint block mb-1">{t('admin.description')}</label>
        <textarea
          value={form.description}
          onChange={(e) => onUpdateField('description', e.target.value)}
          placeholder={t('admin.descriptionPlaceholder')}
          rows={2}
          className="w-full bg-telegram-bg text-telegram-text text-sm rounded-lg px-3 py-2 border border-white/10 focus:border-telegram-button outline-none resize-none"
        />
      </div>

      {/* Mode + Type row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-telegram-hint block mb-1">{t('admin.mode')}</label>
          <select
            value={form.mode_id ?? ''}
            onChange={(e) => onUpdateField('mode_id', e.target.value ? parseInt(e.target.value) : null)}
            className="w-full bg-telegram-bg text-telegram-text text-sm rounded-lg px-3 py-2 border border-white/10 focus:border-telegram-button outline-none"
          >
            <option value="">{t('admin.modeNone')}</option>
            {modes.map((m) => (
              <option key={m.id} value={m.id}>
                {m.icon_emoji} {m.display_name || m.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-telegram-hint block mb-1">{t('admin.type')}</label>
          <select
            value={form.quest_type}
            onChange={(e) => onUpdateField('quest_type', e.target.value as 'daily' | 'weekly')}
            className="w-full bg-telegram-bg text-telegram-text text-sm rounded-lg px-3 py-2 border border-white/10 focus:border-telegram-button outline-none"
          >
            <option value="daily">{t('admin.daily')}</option>
            <option value="weekly">{t('admin.weekly')}</option>
          </select>
        </div>
      </div>

      {/* XP + Difficulty row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-telegram-hint block mb-1">{t('admin.xpReward')}</label>
          <input
            type="number"
            min={0}
            value={form.xp_reward}
            onChange={(e) => onUpdateField('xp_reward', parseInt(e.target.value) || 0)}
            className="w-full bg-telegram-bg text-telegram-text text-sm rounded-lg px-3 py-2 border border-white/10 focus:border-telegram-button outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-telegram-hint block mb-1">{t('admin.difficulty')}</label>
          <select
            value={form.difficulty}
            onChange={(e) => onUpdateField('difficulty', e.target.value as 'easy' | 'medium' | 'hard')}
            className="w-full bg-telegram-bg text-telegram-text text-sm rounded-lg px-3 py-2 border border-white/10 focus:border-telegram-button outline-none"
          >
            <option value="easy">{t('admin.easy')}</option>
            <option value="medium">{t('admin.medium')}</option>
            <option value="hard">{t('admin.hard')}</option>
          </select>
        </div>
      </div>

      {/* Timer toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer size={14} className="text-telegram-hint" />
          <span className="text-sm text-telegram-text">{t('admin.requiresTimer')}</span>
        </div>
        <button
          onClick={() => onUpdateField('requires_timer', !form.requires_timer)}
          className={`w-10 h-6 rounded-full transition-colors relative ${
            form.requires_timer ? 'bg-telegram-button' : 'bg-white/20'
          }`}
        >
          <div
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
              form.requires_timer ? 'translate-x-5' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Timer windows (shown when timer enabled) */}
      {form.requires_timer && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-telegram-hint block mb-1">{t('admin.windowStart')}</label>
            <input
              type="time"
              value={form.timer_window_start}
              onChange={(e) => onUpdateField('timer_window_start', e.target.value)}
              className="w-full bg-telegram-bg text-telegram-text text-sm rounded-lg px-3 py-2 border border-white/10 focus:border-telegram-button outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-telegram-hint block mb-1">{t('admin.windowEnd')}</label>
            <input
              type="time"
              value={form.timer_window_end}
              onChange={(e) => onUpdateField('timer_window_end', e.target.value)}
              className="w-full bg-telegram-bg text-telegram-text text-sm rounded-lg px-3 py-2 border border-white/10 focus:border-telegram-button outline-none"
            />
          </div>
        </div>
      )}

      {/* Save button */}
      <button
        onClick={onSave}
        disabled={saving || !form.title.trim()}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-telegram-button text-telegram-buttonText rounded-lg text-sm font-medium disabled:opacity-50 transition-opacity"
      >
        {saving ? (
          <div className="w-4 h-4 border-2 border-telegram-buttonText/30 border-t-telegram-buttonText rounded-full animate-spin" />
        ) : (
          <Save size={16} />
        )}
        {editingId ? t('admin.updateQuest') : t('admin.createQuest')}
      </button>
    </div>
  );
}
