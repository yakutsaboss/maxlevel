import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '@/api/adminClient';
import type { QuestTemplate, ModeOption, QuestFormData } from '@/components/admin/quest-editor/types';
import { EMPTY_FORM } from '@/components/admin/quest-editor/types';

export function useQuestEditor(credentials: string) {
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

  const refresh = () => {
    setLoading(true);
    fetchQuests();
  };

  return {
    // Data
    quests,
    modes,
    loading,
    saving,
    toast,
    setToast,

    // Form
    showForm,
    editingId,
    form,
    openAddForm,
    openEditForm,
    closeForm,
    updateField,

    // Actions
    handleSave,
    handleDelete,
    refresh,
  };
}
