import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AdminUserSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function AdminUserSearch({ value, onChange }: AdminUserSearchProps) {
  const { t } = useTranslation();
  return (
    <div className="relative">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-telegram-hint" />
      <input
        type="text"
        placeholder={t('admin.searchPlaceholder')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-9 pr-4 py-2.5 bg-telegram-secondaryBg rounded-xl text-sm text-telegram-text placeholder-telegram-hint border border-telegram-hint/10 focus:border-telegram-button focus:outline-none transition-colors"
      />
    </div>
  );
}
