import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Save, X, RefreshCw, Clock, Timer } from 'lucide-react';
import { Toast } from '@/components/Toast';
import { API_BASE_URL } from '@/api/adminClient';

// ── Types ──────────────────────────────────────────────────────────

interface QuestTemplate {
  id: number;
  mode_id: number | null;
  title: string;
  description: string | null;
  quest_type: 'daily' | 'weekly';
  xp_reward: number;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  requires_timer: boolean;
  timer_window_start: string | null;
  timer_window_end: string | null;
  readiness_check_enabled: boolean;
  readiness_check_time: string | null;
  is_mandatory: boolean;
  mode_name: string | null;
  mode_display_name: string | null;
  mode_icon: string | null;
}

interface ModeOption {
  id: number;
  name: string;
  display_name: string;
  icon_emoji: string;
}

interface QuestFormData {
  mode_id: number | null;
  title: string;
  description: string;
  quest_type: 'daily' | 'weekly';
  xp_reward: number;
  difficulty: 'easy' | 'medium' | 'hard';
  requires_timer: boolean;
  timer_window_start: string;
  timer_window_end: string;
}

interface AdminQuestEditorProps {
  credentials: string;
}

const EMPTY_FORM: QuestFormData = {
  mode_id: null,
  title: '',
  description: '',
  quest_type: 'daily',
  xp_reward: 50,
  difficulty: 'medium',
  requires_timer: false,
  timer_window_start: '',
  timer_window_end: '',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'text-green-400 bg-green-500/10',
  medium: 'text-yellow-400 bg-yellow-500/10',
  hard: 'text-red-400 bg-red-500/10',
};

// ── Component ──────────────────────────────────────────────────────

export function AdminQuestEditor({ credentials }: AdminQuestEditorProps) {
  const [quests, setQuests] = useState<QuestTemplate[]>([]);
  const [modes, setModes] = useState<ModeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' | 'info' } | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<QuestFormData>({ ...EMPTY_FORM });

  // ── Data fetching ──

  const fetchQuests = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/quests`, {
        headers: { 'Authorization': `Basic ${credentials}` },
      });
      if (res.ok) {
        const data = await res.json();
        setQuests(data.data?.quests || data.quests || []);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [credentials]);

  const fetchModes = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/modes`, {
        headers: { 'Authorization': `Basic ${credentials}` },
      });
      if (res.ok) {
        const data = await res.json();
        setModes(data.data?.modes || data.modes || []);
      }
    } catch {
      // Silent fail
    }
  }, [credentials]);

  useEffect(() => {
    fetchQuests();
    fetchModes();
  }, [fetchQuests, fetchModes]);

  // ── Form helpers ──

  const openAddForm = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  };

  const openEditForm = (quest: QuestTemplate) => {
    setEditingId(quest.id);
    setForm({
      mode_id: quest.mode_id,
      title: quest.title,
      description: quest.description || '',
      quest_type: quest.quest_type,
      xp_reward: quest.xp_reward,
      difficulty: quest.difficulty || 'medium',
      requires_timer: quest.requires_timer,
      timer_window_start: quest.timer_window_start ? quest.timer_window_start.slice(0, 5) : '',
      timer_window_end: quest.timer_window_end ? quest.timer_window_end.slice(0, 5) : '',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  };

  const updateField = <K extends keyof QuestFormData>(key: K, value: QuestFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // ── API actions ──

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) {
      setToast({ message: 'Title is required', variant: 'error' });
      return;
    }

    setSaving(true);
    try {
      const body = {
        ...form,
        mode_id: form.mode_id || null,
        description: form.description || null,
        timer_window_start: form.requires_timer && form.timer_window_start ? form.timer_window_start + ':00' : null,
        timer_window_end: form.requires_timer && form.timer_window_end ? form.timer_window_end + ':00' : null,
      };

      const isEdit = editingId !== null;
      const url = isEdit
        ? `${API_BASE_URL}/admin/quests/${editingId}`
        : `${API_BASE_URL}/admin/quests`;

      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setToast({
          message: isEdit ? 'Quest updated' : 'Quest created',
          variant: 'success',
        });
        closeForm();
        setLoading(true);
        fetchQuests();
      } else {
        const err = await res.json().catch(() => null);
        setToast({
          message: err?.error || `Failed: ${res.status}`,
          variant: 'error',
        });
      }
    } catch {
      setToast({ message: 'Connection failed', variant: 'error' });
    } finally {
      setSaving(false);
    }
  }, [form, editingId, credentials, fetchQuests]);

  const handleDelete = useCallback(async (quest: QuestTemplate) => {
    const confirmed = window.confirm(`Delete quest "${quest.title}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE_URL}/admin/quests/${quest.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Basic ${credentials}` },
      });

      if (res.ok) {
        setToast({ message: 'Quest deleted', variant: 'success' });
        setLoading(true);
        fetchQuests();
      } else {
        const err = await res.json().catch(() => null);
        setToast({
          message: err?.error || `Delete failed: ${res.status}`,
          variant: 'error',
        });
      }
    } catch {
      setToast({ message: 'Connection failed', variant: 'error' });
    }
  }, [credentials, fetchQuests]);

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
            onClick={() => { setLoading(true); fetchQuests(); }}
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
        <div className="bg-telegram-secondaryBg rounded-xl p-4 space-y-3 border border-telegram-button/30">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-telegram-text">
              {editingId ? 'Edit Quest' : 'New Quest'}
            </h4>
            <button onClick={closeForm} className="text-telegram-hint hover:text-telegram-text">
              <X size={18} />
            </button>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs text-telegram-hint block mb-1">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="e.g. Morning Workout"
              className="w-full bg-telegram-bg text-telegram-text text-sm rounded-lg px-3 py-2 border border-white/10 focus:border-telegram-button outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-telegram-hint block mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="What the user needs to do..."
              rows={2}
              className="w-full bg-telegram-bg text-telegram-text text-sm rounded-lg px-3 py-2 border border-white/10 focus:border-telegram-button outline-none resize-none"
            />
          </div>

          {/* Mode + Type row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-telegram-hint block mb-1">Mode</label>
              <select
                value={form.mode_id ?? ''}
                onChange={(e) => updateField('mode_id', e.target.value ? parseInt(e.target.value) : null)}
                className="w-full bg-telegram-bg text-telegram-text text-sm rounded-lg px-3 py-2 border border-white/10 focus:border-telegram-button outline-none"
              >
                <option value="">— None —</option>
                {modes.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.icon_emoji} {m.display_name || m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-telegram-hint block mb-1">Type</label>
              <select
                value={form.quest_type}
                onChange={(e) => updateField('quest_type', e.target.value as 'daily' | 'weekly')}
                className="w-full bg-telegram-bg text-telegram-text text-sm rounded-lg px-3 py-2 border border-white/10 focus:border-telegram-button outline-none"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>

          {/* XP + Difficulty row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-telegram-hint block mb-1">XP Reward</label>
              <input
                type="number"
                min={0}
                value={form.xp_reward}
                onChange={(e) => updateField('xp_reward', parseInt(e.target.value) || 0)}
                className="w-full bg-telegram-bg text-telegram-text text-sm rounded-lg px-3 py-2 border border-white/10 focus:border-telegram-button outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-telegram-hint block mb-1">Difficulty</label>
              <select
                value={form.difficulty}
                onChange={(e) => updateField('difficulty', e.target.value as 'easy' | 'medium' | 'hard')}
                className="w-full bg-telegram-bg text-telegram-text text-sm rounded-lg px-3 py-2 border border-white/10 focus:border-telegram-button outline-none"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          {/* Timer toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer size={14} className="text-telegram-hint" />
              <span className="text-sm text-telegram-text">Requires Timer</span>
            </div>
            <button
              onClick={() => updateField('requires_timer', !form.requires_timer)}
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
                <label className="text-xs text-telegram-hint block mb-1">Window Start</label>
                <input
                  type="time"
                  value={form.timer_window_start}
                  onChange={(e) => updateField('timer_window_start', e.target.value)}
                  className="w-full bg-telegram-bg text-telegram-text text-sm rounded-lg px-3 py-2 border border-white/10 focus:border-telegram-button outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-telegram-hint block mb-1">Window End</label>
                <input
                  type="time"
                  value={form.timer_window_end}
                  onChange={(e) => updateField('timer_window_end', e.target.value)}
                  className="w-full bg-telegram-bg text-telegram-text text-sm rounded-lg px-3 py-2 border border-white/10 focus:border-telegram-button outline-none"
                />
              </div>
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving || !form.title.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-telegram-button text-telegram-buttonText rounded-lg text-sm font-medium disabled:opacity-50 transition-opacity"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-telegram-buttonText/30 border-t-telegram-buttonText rounded-full animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {editingId ? 'Update Quest' : 'Create Quest'}
          </button>
        </div>
      )}

      {/* Quest list */}
      {quests.length === 0 ? (
        <div className="bg-telegram-secondaryBg rounded-xl p-8 text-center">
          <p className="text-telegram-hint text-sm">No quest templates yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {quests.map((quest) => (
            <div
              key={quest.id}
              className="bg-telegram-secondaryBg rounded-xl p-4 space-y-2"
            >
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
                    onClick={() => openEditForm(quest)}
                    className="p-1.5 text-telegram-hint hover:text-telegram-button transition-colors rounded-lg"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(quest)}
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
          ))}
        </div>
      )}

      {toast && (
        <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
