import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Star, Zap } from 'lucide-react';

interface Friend {
  id: number;
  username: string | null;
  first_name: string;
  current_level: number;
  total_xp: number;
  is_active: boolean;
  friends_since: string;
}

interface FriendsListProps {
  friends: Friend[];
}

export const FriendsList = memo(function FriendsList({ friends }: FriendsListProps) {
  const { t } = useTranslation();

  if (friends.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-12 h-12 text-telegram-hint mx-auto mb-3" />
        <p className="text-telegram-hint text-sm">{t('social.noFriends')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {friends.map((friend) => (
        <div
          key={friend.id}
          className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-full bg-telegram-link/20 flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-bold text-telegram-link">
              {friend.first_name.charAt(0).toUpperCase()}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="font-medium text-telegram-text truncate">
              {friend.first_name}
              {friend.username && (
                <span className="text-telegram-hint text-xs ml-1">@{friend.username}</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-telegram-hint mt-0.5">
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3" />
                {t('social.level')}{friend.current_level}
              </span>
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {friend.total_xp.toLocaleString()} XP
              </span>
            </div>
          </div>

          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${friend.is_active ? 'bg-green-400' : 'bg-telegram-hint/30'}`} />
        </div>
      ))}
    </div>
  );
});
