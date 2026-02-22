// Medication types

export type MedicationFrequency = 'daily' | 'twice_daily' | 'three_times' | 'weekly' | 'as_needed';
export type MedicationLogStatus = 'taken' | 'skipped' | 'postponed';

export interface Medication {
  id: number;
  user_id: number;
  name: string;
  dosage?: string;
  frequency: MedicationFrequency;
  time_of_day: string[]; // TIME[] from DB, e.g. ["08:00", "20:00"]
  color: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MedicationLog {
  id: number;
  medication_id: number;
  user_id: number;
  scheduled_date: string; // DATE
  scheduled_time: string; // TIME
  status: MedicationLogStatus;
  logged_at: string;
}

export interface TodayScheduleItem {
  medication_id: number;
  name: string;
  dosage?: string;
  color: string;
  scheduled_time: string;
  status: MedicationLogStatus | 'pending';
}

export interface MedicationHistoryDay {
  date: string;
  logs: Array<MedicationLog & { medication_name: string }>;
  adherence_rate: number;
}

export interface MedicationHistoryResponse {
  days: MedicationHistoryDay[];
  overall_adherence: number;
}

export interface AddMedicationData {
  telegram_id: number;
  name: string;
  dosage?: string;
  frequency: MedicationFrequency;
  time_of_day: string[];
  color?: string;
  notes?: string;
}

export interface LogMedicationData {
  telegram_id: number;
  medication_id: number;
  scheduled_time: string;
  status: MedicationLogStatus;
}
