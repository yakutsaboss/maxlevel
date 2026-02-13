import { QuestPreview } from '@/components/admin/quest-editor/QuestPreview';
import type { QuestTemplate } from '@/components/admin/quest-editor/types';

interface QuestListProps {
  quests: QuestTemplate[];
  onEdit: (quest: QuestTemplate) => void;
  onDelete: (quest: QuestTemplate) => void;
}

export function QuestList({ quests, onEdit, onDelete }: QuestListProps) {
  if (quests.length === 0) {
    return (
      <div className="bg-telegram-secondaryBg rounded-xl p-8 text-center">
        <p className="text-telegram-hint text-sm">No quest templates yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {quests.map((quest) => (
        <QuestPreview
          key={quest.id}
          quest={quest}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
