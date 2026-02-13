import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { QuestTemplate } from '@/components/admin/quest-editor/types';
import { EMPTY_FORM } from '@/components/admin/quest-editor/types';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock API_BASE_URL
vi.mock('@/api/adminClient', () => ({
  API_BASE_URL: 'http://test-api/api',
}));

import { useQuestEditor } from '@/components/admin/quest-editor/useQuestEditor';

const credentials = 'dGVzdDp0ZXN0'; // base64 "test:test"

const makeQuest = (overrides: Partial<QuestTemplate> = {}): QuestTemplate => ({
  id: 1,
  mode_id: 1,
  title: 'Test Quest',
  description: 'A test quest',
  quest_type: 'daily',
  xp_reward: 50,
  difficulty: 'medium',
  requires_timer: false,
  timer_window_start: null,
  timer_window_end: null,
  readiness_check_enabled: false,
  readiness_check_time: null,
  is_mandatory: false,
  mode_name: 'fitness',
  mode_display_name: 'Fitness',
  mode_icon: null,
  ...overrides,
});

function mockFetchResponses(questsData: QuestTemplate[] = [], modesData: { id: number; name: string; display_name: string; icon_emoji: string }[] = []) {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes('/admin/quests')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ quests: questsData }),
      });
    }
    if (url.includes('/admin/modes')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ modes: modesData }),
      });
    }
    return Promise.resolve({ ok: false, status: 404 });
  });
}

describe('useQuestEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in loading state with empty data', () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // never resolves

    const { result } = renderHook(() => useQuestEditor(credentials));

    expect(result.current.loading).toBe(true);
    expect(result.current.quests).toEqual([]);
    expect(result.current.modes).toEqual([]);
    expect(result.current.saving).toBe(false);
    expect(result.current.toast).toBeNull();
    expect(result.current.showForm).toBe(false);
    expect(result.current.editingId).toBeNull();
  });

  it('fetches quests and modes on mount', async () => {
    const quests = [makeQuest({ id: 1 }), makeQuest({ id: 2, title: 'Quest 2' })];
    const modes = [{ id: 1, name: 'fitness', display_name: 'Fitness', icon_emoji: '' }];
    mockFetchResponses(quests, modes);

    const { result } = renderHook(() => useQuestEditor(credentials));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.quests).toHaveLength(2);
    expect(result.current.modes).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://test-api/api/admin/quests',
      expect.objectContaining({ headers: { Authorization: `Basic ${credentials}` } }),
    );
  });

  it('openAddForm resets form and shows it', async () => {
    mockFetchResponses();

    const { result } = renderHook(() => useQuestEditor(credentials));

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.openAddForm();
    });

    expect(result.current.showForm).toBe(true);
    expect(result.current.editingId).toBeNull();
    expect(result.current.form).toEqual({ ...EMPTY_FORM });
  });

  it('openEditForm populates form with quest data', async () => {
    const quest = makeQuest({
      id: 5,
      title: 'Edit Me',
      description: 'Desc',
      quest_type: 'weekly',
      xp_reward: 100,
      difficulty: 'hard',
      requires_timer: true,
      timer_window_start: '09:00:00',
      timer_window_end: '10:30:00',
    });
    mockFetchResponses([quest]);

    const { result } = renderHook(() => useQuestEditor(credentials));

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.openEditForm(quest);
    });

    expect(result.current.showForm).toBe(true);
    expect(result.current.editingId).toBe(5);
    expect(result.current.form.title).toBe('Edit Me');
    expect(result.current.form.quest_type).toBe('weekly');
    expect(result.current.form.xp_reward).toBe(100);
    expect(result.current.form.difficulty).toBe('hard');
    expect(result.current.form.requires_timer).toBe(true);
    expect(result.current.form.timer_window_start).toBe('09:00');
    expect(result.current.form.timer_window_end).toBe('10:30');
  });

  it('closeForm hides form and resets state', async () => {
    mockFetchResponses();

    const { result } = renderHook(() => useQuestEditor(credentials));

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.openAddForm();
    });
    expect(result.current.showForm).toBe(true);

    act(() => {
      result.current.closeForm();
    });

    expect(result.current.showForm).toBe(false);
    expect(result.current.editingId).toBeNull();
    expect(result.current.form).toEqual({ ...EMPTY_FORM });
  });

  it('updateField changes a single form field', async () => {
    mockFetchResponses();

    const { result } = renderHook(() => useQuestEditor(credentials));

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.openAddForm();
    });

    act(() => {
      result.current.updateField('title', 'New Title');
    });
    expect(result.current.form.title).toBe('New Title');

    act(() => {
      result.current.updateField('xp_reward', 200);
    });
    expect(result.current.form.xp_reward).toBe(200);
  });

  it('handleSave shows error toast when title is empty', async () => {
    mockFetchResponses();

    const { result } = renderHook(() => useQuestEditor(credentials));

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.openAddForm();
    });

    // title is empty by default from EMPTY_FORM
    await act(async () => {
      await result.current.handleSave();
    });

    expect(result.current.toast).toEqual({
      message: 'Title is required',
      variant: 'error',
    });
    // Should NOT have made a fetch call for save
    const saveCalls = mockFetch.mock.calls.filter(
      (call) => call[1]?.method === 'POST' || call[1]?.method === 'PATCH',
    );
    expect(saveCalls).toHaveLength(0);
  });

  it('handleSave creates a new quest via POST', async () => {
    mockFetchResponses();

    const { result } = renderHook(() => useQuestEditor(credentials));

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.openAddForm();
      result.current.updateField('title', 'New Quest');
    });

    // Mock the POST response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    // Mock the subsequent fetchQuests refetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ quests: [makeQuest({ id: 10, title: 'New Quest' })] }),
    });

    await act(async () => {
      await result.current.handleSave();
    });

    // Find the POST call
    const postCall = mockFetch.mock.calls.find(
      (call) => call[1]?.method === 'POST',
    );
    expect(postCall).toBeDefined();
    expect(postCall![0]).toBe('http://test-api/api/admin/quests');
    expect(JSON.parse(postCall![1].body)).toMatchObject({ title: 'New Quest' });

    expect(result.current.toast?.variant).toBe('success');
    expect(result.current.showForm).toBe(false);
  });

  it('handleSave updates an existing quest via PATCH', async () => {
    const quest = makeQuest({ id: 7, title: 'Old Title' });
    mockFetchResponses([quest]);

    const { result } = renderHook(() => useQuestEditor(credentials));

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.openEditForm(quest);
      result.current.updateField('title', 'Updated Title');
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ quests: [makeQuest({ id: 7, title: 'Updated Title' })] }),
    });

    await act(async () => {
      await result.current.handleSave();
    });

    const patchCall = mockFetch.mock.calls.find(
      (call) => call[1]?.method === 'PATCH',
    );
    expect(patchCall).toBeDefined();
    expect(patchCall![0]).toBe('http://test-api/api/admin/quests/7');
    expect(result.current.toast?.variant).toBe('success');
  });

  it('handleSave shows error toast on API failure', async () => {
    mockFetchResponses();

    const { result } = renderHook(() => useQuestEditor(credentials));

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.openAddForm();
      result.current.updateField('title', 'Failing Quest');
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Internal server error' }),
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(result.current.toast).toEqual({
      message: 'Internal server error',
      variant: 'error',
    });
    expect(result.current.saving).toBe(false);
  });

  it('handleSave shows connection error on network failure', async () => {
    mockFetchResponses();

    const { result } = renderHook(() => useQuestEditor(credentials));

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.openAddForm();
      result.current.updateField('title', 'Network Fail');
    });

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await act(async () => {
      await result.current.handleSave();
    });

    expect(result.current.toast).toEqual({
      message: 'Connection failed',
      variant: 'error',
    });
  });

  it('handleDelete deletes quest after confirmation', async () => {
    const quest = makeQuest({ id: 3, title: 'Delete Me' });
    mockFetchResponses([quest]);

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    const { result } = renderHook(() => useQuestEditor(credentials));

    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ quests: [] }),
    });

    await act(async () => {
      await result.current.handleDelete(quest);
    });

    expect(confirmSpy).toHaveBeenCalled();
    const deleteCall = mockFetch.mock.calls.find(
      (call) => call[1]?.method === 'DELETE',
    );
    expect(deleteCall).toBeDefined();
    expect(deleteCall![0]).toBe('http://test-api/api/admin/quests/3');
    expect(result.current.toast?.variant).toBe('success');

    confirmSpy.mockRestore();
  });

  it('handleDelete does nothing when confirmation is cancelled', async () => {
    const quest = makeQuest({ id: 3, title: 'Keep Me' });
    mockFetchResponses([quest]);

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    const { result } = renderHook(() => useQuestEditor(credentials));

    await waitFor(() => expect(result.current.loading).toBe(false));

    const fetchCountBefore = mockFetch.mock.calls.length;

    await act(async () => {
      await result.current.handleDelete(quest);
    });

    // No additional fetch calls should have been made
    const deleteCall = mockFetch.mock.calls.slice(fetchCountBefore).find(
      (call) => call[1]?.method === 'DELETE',
    );
    expect(deleteCall).toBeUndefined();

    confirmSpy.mockRestore();
  });
});
