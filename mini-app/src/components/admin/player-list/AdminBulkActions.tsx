import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminBulkActionsProps {
  selectedCount: number;
  onClearSelection: () => void;
}

export const AdminBulkActions = memo(function AdminBulkActions({
  selectedCount,
  onClearSelection,
}: AdminBulkActionsProps) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="flex items-center justify-between bg-telegram-button/10 border border-telegram-button/20 rounded-xl px-3 py-2"
        >
          <span className="text-xs text-telegram-button font-medium">
            {t('admin.players.selectedCount', '{{count}} selected', { count: selectedCount })}
          </span>
          <button onClick={onClearSelection} className="text-[10px] text-telegram-hint hover:text-telegram-text">
            {t('admin.players.clearSelection', 'Clear')}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
