import { Plus, RefreshCw } from 'lucide-react';
import { Toast } from '@/components/Toast';
import { useQuestEditor } from '@/components/admin/quest-editor/useQuestEditor';
import { QuestForm } from '@/components/admin/quest-editor/QuestForm';
import { QuestList } from '@/components/admin/quest-editor/QuestList';

interface AdminQuestEditorProps {
  credentials: string;
}

export function AdminQuestEditor({ credentials }: AdminQuestEditorProps) {
  const {
    quests,
    modes,
    loading,
    saving,
    toast,
    setToast,
    showForm,
    editingId,
    form,
    openAddForm,
    openEditForm,
    closeForm,
    updateField,
    handleSave,
    handleDelete,
    refresh,
  } = useQuestEditor(credentials);

  // ── Loading skeleton ──

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-telegram-hint uppercase tracking-wide">Quest Templates</h3>
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-telegram-secondaryBg rounded-xl p-4 h-20 skeleton" />
        ))}
      </div>
    );
  }

  // ── Render ──

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-telegram-hint uppercase tracking-wide">
          Quest Templates ({quests.length})
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-telegram-secondaryBg rounded-lg text-xs text-telegram-hint hover:text-telegram-text transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            onClick={openAddForm}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-telegram-button text-telegram-buttonText rounded-lg text-xs font-medium"
          >
            <Plus size={14} />
            Add Quest
          </button>
        </div>
      </div>

      {/* Inline Form */}
      {showForm && (
        <QuestForm
          form={form}
          modes={modes}
          editingId={editingId}
          saving={saving}
          onClose={closeForm}
          onSave={handleSave}
          onUpdateField={updateField}
        />
      )}

      {/* Quest list */}
      <QuestList
        quests={quests}
        onEdit={openEditForm}
        onDelete={handleDelete}
      />

      {toast && (
        <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
