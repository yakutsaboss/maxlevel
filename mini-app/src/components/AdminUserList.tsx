interface AdminUserListProps {
  credentials: string;
}

export function AdminUserList({ credentials }: AdminUserListProps) {
  return (
    <div className="text-telegram-hint text-center py-8">User list — Task 3</div>
  );
}
