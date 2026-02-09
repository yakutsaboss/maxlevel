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

export function AdminStatsCard({ stats }: AdminStatsCardProps) {
  if (!stats) {
    return <div className="text-telegram-hint text-center py-8">Loading stats...</div>;
  }

  return (
    <div className="text-telegram-hint text-center py-8">Stats component — Task 2</div>
  );
}
