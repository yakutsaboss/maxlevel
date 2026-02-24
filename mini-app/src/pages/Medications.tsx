import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Pill, Plus, Calendar, BarChart3 } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';
import { usePullToRefresh, PullIndicator } from '@/hooks/usePullToRefresh';
import { ErrorSection } from '@/components/ErrorSection';
import { DailyMedTracker } from '@/components/medication/DailyMedTracker';
import { MedicationCard } from '@/components/medication/MedicationCard';
import { MedicationForm } from '@/components/medication/MedicationForm';
import { useMedicationData } from '@/hooks/useMedicationData';
import { useToastContext } from '@/contexts/ToastContext';
import type { Medication, AddMedicationData } from '@/types';
import type { MedicationLogStatus } from '@/types/medication';

function MedicationsSkeleton() {
  return (
    <div className="min-h-screen bg-telegram-bg pb-20" role="status" aria-label="Loading medications">
      {/* Header skeleton */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-600 p-6 rounded-b-3xl safe-area-top">
        <div className="flex items-center gap-3 mb-4">
          <div className="skeleton w-10 h-10 rounded-xl" />
          <div className="skeleton-text h-7 w-40">&nbsp;</div>
        </div>
      </div>

      {/* Today's schedule skeleton */}
      <div className="px-4 mt-4">
        <div className="skeleton-text h-5 w-36 mb-3">&nbsp;</div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-telegram-secondaryBg rounded-xl p-3 border border-telegram-hint/10">
              <div className="flex items-center gap-3">
                <div className="skeleton w-3 h-3 rounded-full" />
                <div className="flex-1"><div className="skeleton-text h-4 w-24 mb-1">&nbsp;</div><div className="skeleton-text h-3 w-16">&nbsp;</div></div>
                <div className="flex gap-1.5"><div className="skeleton w-8 h-8 rounded-full" /><div className="skeleton w-8 h-8 rounded-full" /></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* My medications skeleton */}
      <div className="px-4 mt-6">
        <div className="skeleton-text h-5 w-36 mb-3">&nbsp;</div>
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10">
              <div className="flex items-start gap-3">
                <div className="skeleton w-4 h-4 rounded-full mt-0.5" />
                <div className="flex-1">
                  <div className="skeleton-text h-5 w-32 mb-2">&nbsp;</div>
                  <div className="skeleton-text h-3 w-20 mb-2">&nbsp;</div>
                  <div className="flex gap-1.5"><div className="skeleton w-16 h-5 rounded-full" /><div className="skeleton w-16 h-5 rounded-full" /></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type MedicationTab = 'today' | 'history' | 'analytics';

export function Medications() {
  const { t } = useTranslation();
  const { user, haptic } = useTelegram();
  const { showToast } = useToastContext();
  const [formOpen, setFormOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<MedicationTab>('today');

  const {
    medications, todaySchedule, loading, error,
    addMedication, updateMedication, deleteMedication, logMedication, refresh,
  } = useMedicationData(user?.id);

  const handleRefresh = useCallback(async () => {
    refresh();
  }, [refresh]);

  const { containerRef, pullDistance, refreshing, pullThreshold, touchHandlers } = usePullToRefresh(handleRefresh, haptic);

  const handleSave = async (data: Omit<AddMedicationData, 'telegram_id'>) => {
    if (!user?.id) return;
    if (editingMed) {
      await updateMedication(editingMed.id, data);
      showToast(t('medication.updated', 'Medication updated'), 'success');
    } else {
      await addMedication(data);
      showToast(t('medication.added', 'Medication added'), 'success');
    }
    setFormOpen(false);
    setEditingMed(null);
  };

  const handleEdit = (med: Medication) => {
    setEditingMed(med);
    setFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirmDelete === id) {
      await deleteMedication(id);
      setConfirmDelete(null);
      showToast(t('medication.deleted', 'Medication removed'), 'info');
    } else {
      haptic.impact('light');
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  const handleLog = async (medicationId: number, scheduledTime: string, status: MedicationLogStatus) => {
    await logMedication(medicationId, scheduledTime, status);
    if (status === 'taken') {
      showToast(t('medication.markedTaken', 'Marked as taken'), 'success');
    } else if (status === 'skipped') {
      showToast(t('medication.markedSkipped', 'Marked as skipped'), 'info');
    }
  };

  if (loading) {
    return <MedicationsSkeleton />;
  }

  if (error) {
    return <ErrorSection message={t('dashboard.couldNotLoad')} onRetry={() => refresh()} />;
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-telegram-bg text-telegram-text pb-20 overflow-y-auto"
      {...touchHandlers}
    >
      <PullIndicator pullDistance={pullDistance} refreshing={refreshing} pullThreshold={pullThreshold} />

      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-600 p-6 rounded-b-3xl shadow-lg safe-area-top">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <Pill className="w-6 h-6 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-white">{t('medication.title')}</h1>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 px-4 mt-3 mb-2">
        {(['today', 'history', 'analytics'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { haptic.impact('light'); setActiveTab(tab); }}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-emerald-600 text-white'
                : 'bg-telegram-secondaryBg text-telegram-hint'
            }`}
          >
            {t(`medication.${tab}Tab`)}
          </button>
        ))}
      </div>

      {/* Today tab */}
      {activeTab === 'today' && (
        <>
          {/* Today's Schedule */}
          <div className="px-4 mt-4" role="region" aria-label="Today's schedule">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-telegram-link" aria-hidden="true" />
              {t('medication.todaySchedule')}
            </h2>
            <DailyMedTracker
              schedule={todaySchedule}
              onLog={handleLog}
            />
          </div>

          {/* My Medications */}
          <div className="px-4 mt-6" role="region" aria-label="My medications">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Pill className="w-5 h-5 text-telegram-link" aria-hidden="true" />
              {t('medication.myMedications')}
            </h2>

            {medications.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-10 bg-telegram-secondaryBg rounded-2xl border border-telegram-hint/10"
              >
                <Pill className="w-14 h-14 text-telegram-hint mx-auto mb-3" aria-hidden="true" />
                <p className="text-telegram-text font-medium mb-1">{t('medication.emptyState')}</p>
                <p className="text-telegram-hint text-sm mb-4">{t('medication.emptyHint')}</p>
                <button
                  onClick={() => { haptic.impact('light'); setFormOpen(true); }}
                  className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-medium px-5 py-2.5 rounded-full active:scale-95 transition-transform"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  {t('medication.addMedication')}
                </button>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {medications.map((med, index) => (
                  <MedicationCard
                    key={med.id}
                    medication={med}
                    index={index}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* History tab (placeholder — Agent E will build real component) */}
      {activeTab === 'history' && (
        <div className="px-4 mt-4 text-center py-16">
          <Calendar className="w-12 h-12 text-telegram-hint mx-auto mb-3" />
          <p className="text-telegram-hint text-sm">{t('medication.historyComingSoon', 'History view loading...')}</p>
        </div>
      )}

      {/* Analytics tab (placeholder — Agent F will build real component) */}
      {activeTab === 'analytics' && (
        <div className="px-4 mt-4 text-center py-16">
          <BarChart3 className="w-12 h-12 text-telegram-hint mx-auto mb-3" />
          <p className="text-telegram-hint text-sm">{t('medication.analyticsComingSoon', 'Analytics loading...')}</p>
        </div>
      )}

      {/* Delete confirmation toast */}
      {confirmDelete !== null && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-24 left-4 right-4 z-40 bg-red-500 rounded-2xl px-4 py-3 shadow-lg flex items-center gap-3"
          role="alert"
        >
          <span className="text-white text-sm font-medium flex-1">{t('medication.deleteConfirm')}</span>
          <button
            onClick={() => handleDelete(confirmDelete)}
            className="px-3 py-1.5 bg-white text-red-500 rounded-xl text-sm font-bold active:scale-95 transition-transform"
          >
            {t('medication.delete')}
          </button>
        </motion.div>
      )}

      {/* FAB — add medication */}
      {medications.length > 0 && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 20 }}
          onClick={() => { haptic.impact('light'); setEditingMed(null); setFormOpen(true); }}
          className="fixed bottom-24 right-4 w-14 h-14 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform z-30"
          aria-label={t('medication.addMedication')}
        >
          <Plus className="w-7 h-7 text-white" />
        </motion.button>
      )}

      {/* Medication form modal */}
      <MedicationForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingMed(null); }}
        onSave={handleSave}
        editingMedication={editingMed}
      />
    </div>
  );
}
