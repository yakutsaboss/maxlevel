import { AdminStatsCard } from '@/components/AdminStatsCard';

interface AdminStats {
  total_users: number;
  active_users_7d: number;
  total_quests_completed: number;
  total_achievements_unlocked: number;
}

interface AdminOverviewProps {
  stats: AdminStats | null;
  credentials: string;
  onRefresh: (creds: string) => void;
}

export function AdminOverview({ stats, credentials, onRefresh }: AdminOverviewProps) {
  return <AdminStatsCard stats={stats} credentials={credentials} onRefresh={onRefresh} />;
}
