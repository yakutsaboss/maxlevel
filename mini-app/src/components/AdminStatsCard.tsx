import { Users, UserCheck, ScrollText, Trophy, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

interface AdminStats {
  total_users: number;
  active_users_7d: number;
  total_quests_completed: number;
  total_achievements_unlocked: number;
}

interface AdminStatsCardProps {
  stats: AdminStats | null;
  credentials: string;
  onRefresh: (creds: string) => void;
}

const statCards = [
  { key: 'total_users' as const, labelKey: 'admin.totalUsers', icon: Users, color: 'text-blue-500 bg-blue-500/10' },
  { key: 'active_users_7d' as const, labelKey: 'admin.active7d', icon: UserCheck, color: 'text-green-500 bg-green-500/10' },
  { key: 'total_quests_completed' as const, labelKey: 'admin.questsDone', icon: ScrollText, color: 'text-purple-500 bg-purple-500/10' },
  { key: 'total_achievements_unlocked' as const, labelKey: 'admin.achievements', icon: Trophy, color: 'text-yellow-500 bg-yellow-500/10' },
];

export function AdminStatsCard({ stats, credentials, onRefresh }: AdminStatsCardProps) {
  const { t } = useTranslation();
  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-telegram-secondaryBg rounded-xl p-4 h-24 skeleton" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-telegram-hint uppercase tracking-wide">{t('admin.overview')}</h2>
        <button
          onClick={() => onRefresh(credentials)}
          className="text-telegram-hint hover:text-telegram-link transition-colors"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          const value = stats[card.key];
          return (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-telegram-secondaryBg rounded-xl p-4 space-y-2"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.color}`}>
                <Icon size={16} />
              </div>
              <div>
                <div className="text-2xl font-bold text-telegram-text">{value.toLocaleString()}</div>
                <div className="text-xs text-telegram-hint">{t(card.labelKey)}</div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
