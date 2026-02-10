import { memo } from 'react';
import { motion } from 'framer-motion';

export const StatCard = memo(function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <motion.div className="bg-telegram-secondaryBg rounded-2xl p-4 shadow-sm border border-telegram-hint/10" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
      <div className={`${color} w-10 h-10 rounded-xl flex items-center justify-center text-white mb-2`}>{icon}</div>
      <div className="text-xs text-telegram-hint">{label}</div>
      <div className="text-xl font-bold text-telegram-text mt-1">{value}</div>
    </motion.div>
  );
});
