/**
 * Tests for useMedicationData hook (mini-app/src/hooks/useMedicationData.ts)
 *
 * Run 87 Agent H: Tests the medication data management hook created by Agent E.
 * Covers: loading, fetching medications + schedule, addMedication mutation,
 * logMedication mutation, error states.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

// ─── Mock the apiClient ─────────────────────────────────────────────

const mockGetMedications = vi.fn();
const mockAddMedication = vi.fn();
const mockUpdateMedication = vi.fn();
const mockDeleteMedication = vi.fn();
const mockGetTodaySchedule = vi.fn();
const mockLogMedication = vi.fn();
const mockGetMedicationHistory = vi.fn();

vi.mock('@/api/client', () => ({
  apiClient: {
    getMedications: (...args: unknown[]) => mockGetMedications(...args),
    addMedication: (...args: unknown[]) => mockAddMedication(...args),
    updateMedication: (...args: unknown[]) => mockUpdateMedication(...args),
    deleteMedication: (...args: unknown[]) => mockDeleteMedication(...args),
    getTodaySchedule: (...args: unknown[]) => mockGetTodaySchedule(...args),
    logMedication: (...args: unknown[]) => mockLogMedication(...args),
    getMedicationHistory: (...args: unknown[]) => mockGetMedicationHistory(...args),
  },
}));

// ─── Mock logger ────────────────────────────────────────────────────

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

// ─── Import hook after mocks ────────────────────────────────────────

import { useMedicationData } from '@/hooks/useMedicationData';

// ─── Test data ──────────────────────────────────────────────────────

const mockMedications = [
  {
    id: 1,
    name: 'Aspirin',
    dosage: '100mg',
    frequency: 'daily',
    time_of_day: ['08:00', '20:00'],
    color: '#FF5733',
    notes: 'Take with food',
    is_active: true,
  },
  {
    id: 2,
    name: 'Vitamin D',
    dosage: '1000IU',
    frequency: 'daily',
    time_of_day: ['09:00'],
    color: '#33FF57',
    notes: null,
    is_active: true,
  },
];

const mockSchedule = [
  {
    id: 1,
    name: 'Aspirin',
    dosage: '100mg',
    scheduled_time: '08:00',
    status: 'taken',
    color: '#FF5733',
  },
  {
    id: 1,
    name: 'Aspirin',
    dosage: '100mg',
    scheduled_time: '20:00',
    status: 'pending',
    color: '#FF5733',
  },
  {
    id: 2,
    name: 'Vitamin D',
    dosage: '1000IU',
    scheduled_time: '09:00',
    status: 'pending',
    color: '#33FF57',
  },
];

// ─── Tests ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useMedicationData', () => {
  it('starts in loading state', () => {
    mockGetMedications.mockReturnValue(new Promise(() => {})); // never resolves
    mockGetTodaySchedule.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useMedicationData(123), { wrapper: createWrapper() });

    expect(result.current.loading).toBe(true);
  });

  it('loads medications successfully', async () => {
    mockGetMedications.mockResolvedValueOnce({ success: true, data: mockMedications });
    mockGetTodaySchedule.mockResolvedValueOnce({ success: true, data: mockSchedule });

    const { result } = renderHook(() => useMedicationData(123), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.medications).toHaveLength(2);
    expect(result.current.medications[0].name).toBe('Aspirin');
  });

  it('loads today schedule successfully', async () => {
    mockGetMedications.mockResolvedValueOnce({ success: true, data: mockMedications });
    mockGetTodaySchedule.mockResolvedValueOnce({ success: true, data: mockSchedule });

    const { result } = renderHook(() => useMedicationData(123), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.todaySchedule).toHaveLength(3);
  });

  it('handles error when API fails', async () => {
    mockGetMedications.mockRejectedValueOnce(new Error('Network error'));
    mockGetTodaySchedule.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useMedicationData(123), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });

  it('does not fetch when userId is undefined', () => {
    const { result } = renderHook(() => useMedicationData(undefined), { wrapper: createWrapper() });

    expect(mockGetMedications).not.toHaveBeenCalled();
    expect(mockGetTodaySchedule).not.toHaveBeenCalled();
  });

  it('addMedication mutation calls API correctly', async () => {
    mockGetMedications.mockResolvedValue({ success: true, data: mockMedications });
    mockGetTodaySchedule.mockResolvedValue({ success: true, data: mockSchedule });
    mockAddMedication.mockResolvedValueOnce({ success: true, data: { id: 3, name: 'Ibuprofen' } });

    const { result } = renderHook(() => useMedicationData(123), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.addMedication({
        telegram_id: 123,
        name: 'Ibuprofen',
        frequency: 'daily',
        time_of_day: ['12:00'],
      });
    });

    expect(mockAddMedication).toHaveBeenCalledWith({
      telegram_id: 123,
      name: 'Ibuprofen',
      frequency: 'daily',
      time_of_day: ['12:00'],
    });
  });

  it('logMedication mutation calls API correctly', async () => {
    mockGetMedications.mockResolvedValue({ success: true, data: mockMedications });
    mockGetTodaySchedule.mockResolvedValue({ success: true, data: mockSchedule });
    mockLogMedication.mockResolvedValueOnce({ success: true, data: { id: 1, status: 'taken' } });

    const { result } = renderHook(() => useMedicationData(123), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.logMedication({
        telegram_id: 123,
        medication_id: 1,
        scheduled_time: '08:00',
        status: 'taken',
      });
    });

    expect(mockLogMedication).toHaveBeenCalledWith({
      telegram_id: 123,
      medication_id: 1,
      scheduled_time: '08:00',
      status: 'taken',
    });
  });
});
