import { Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDate } from '@/utils/formatDate';

interface PunishmentSettings {
  consent_given: boolean;
  intensity_level: string;
  safe_mode: boolean;
}

interface PunishmentEntry {
  xp_deducted: number;
  punishment_type: string;
  applied_at: string;
  notes: string;
}

interface ProfileAccountabilityProps {
  punishmentSettings: PunishmentSettings | null;
  punishmentHistory: PunishmentEntry[];
  haptic: { impact: (...args: any[]) => void };
  onNavigateSettings: () => void;
}

export function ProfileAccountability({ punishmentSettings, punishmentHistory, haptic, onNavigateSettings }: ProfileAccountabilityProps) {
  return (
    <>
      <div className="px-4 mt-6" role="region" aria-label="Accountability settings">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Shield className="w-5 h-5 text-telegram-link" aria-hidden="true" />Accountability
        </h2>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10"
        >
          {punishmentSettings && punishmentSettings.consent_given ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-green-500" />
                </div>
                <span className="text-sm font-semibold text-green-500">Accountability Active</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-telegram-hint">Intensity</span>
                  <span className="font-medium capitalize">{punishmentSettings.intensity_level}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-telegram-hint">Safe mode</span>
                  <span className="font-medium">{punishmentSettings.safe_mode ? 'ON' : 'OFF'}</span>
                </div>
              </div>
              <button
                onClick={() => { haptic.impact('light'); onNavigateSettings(); }}
                className="mt-3 text-xs text-telegram-link font-medium active:opacity-70 transition-opacity"
              >
                Edit in Settings →
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="flex items-center gap-3 cursor-pointer active:opacity-70 transition-opacity w-full text-left"
              onClick={() => { haptic.impact('light'); onNavigateSettings(); }}
              aria-label="Accountability is off. Tap to enable in Settings"
            >
              <div className="w-8 h-8 rounded-full bg-telegram-hint/20 flex items-center justify-center" aria-hidden="true">
                <Shield className="w-4 h-4 text-telegram-hint" />
              </div>
              <div>
                <span className="text-sm font-medium text-telegram-hint">Accountability Off</span>
                <p className="text-xs text-telegram-link">Tap to enable in Settings →</p>
              </div>
            </button>
          )}
        </motion.div>
      </div>

      {punishmentSettings?.consent_given && (
        <div className="px-4 mt-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10"
          >
            <h3 className="text-sm font-semibold mb-3 text-telegram-hint">Recent Penalties</h3>
            {punishmentHistory.length > 0 ? (
              <div className="space-y-2.5">
                {punishmentHistory.slice(0, 5).map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{p.notes || p.punishment_type}</p>
                      <p className="text-[11px] text-telegram-hint">{formatDate(p.applied_at)}</p>
                    </div>
                    <span className="text-sm font-semibold text-red-500 ml-3 shrink-0">-{p.xp_deducted} XP</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-telegram-hint">No penalties yet — keep it up!</p>
            )}
          </motion.div>
        </div>
      )}
    </>
  );
}
