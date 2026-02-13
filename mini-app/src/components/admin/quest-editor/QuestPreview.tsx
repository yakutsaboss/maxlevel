import { Pencil, Trash2, Clock } from 'lucide-react';
import type { QuestTemplate } from '@/components/admin/quest-editor/types';
import { DIFFICULTY_COLORS } from '@/components/admin/quest-editor/types';

interface QuestPreviewProps {
  quest: QuestTemplate;
  onEdit: (quest: QuestTemplate) => void;
  onDelete: (quest: QuestTemplate) => void;
}

export function QuestPreview({ quest, onEdit, onDelete }: QuestPreviewProps) {
  return (
    <div className="bg-telegram-secondaryBg rounded-xl p-4 space-y-2">
      {/* Top row: title + actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm text-telegram-text truncate">
            {quest.title}
          </div>
          {quest.description && (
            <div className="text-xs text-telegram-hint mt-0.5 line-clamp-2">
              {quest.description}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(quest)}
            className="p-1.5 text-telegram-hint hover:text-telegram-button transition-colors rounded-lg"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(quest)}
            className="p-1.5 text-telegram-hint hover:text-red-400 transition-colors rounded-lg"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Tags row */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Mode badge */}
        {quest.mode_icon && quest.mode_display_name && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-telegram-button/10 text-telegram-button text-xs rounded-full">
            {quest.mode_icon} {quest.mode_display_name}
          </span>
        )}

        {/* Quest type */}
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded-full">
          {quest.quest_type}
        </span>

        {/* Difficulty */}
        {quest.difficulty && (
          <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full ${DIFFICULTY_COLORS[quest.difficulty]}`}>
            {quest.difficulty}
          </span>
        )}

        {/* XP */}
        <span className="inline-flex items-center px-2 py-0.5 bg-purple-500/10 text-purple-400 text-xs rounded-full">
          {quest.xp_reward} XP
        </span>

        {/* Timer */}
        {quest.requires_timer && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-500/10 text-orange-400 text-xs rounded-full">
            <Clock size={10} />
            {quest.timer_window_start?.slice(0, 5)}–{quest.timer_window_end?.slice(0, 5)}
          </span>
        )}
      </div>
    </div>
  );
}
