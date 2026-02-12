import { motion } from 'framer-motion';

interface SectionCardProps {
  title: string;
  onEdit: () => void;
  delay: number;
  children: React.ReactNode;
}

export function SectionCard({ title, onEdit, delay, children }: SectionCardProps) {
  return (
    <motion.div
      className="bg-telegram-secondaryBg rounded-2xl p-4 mb-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-telegram-text text-sm">{title}</h4>
        <button onClick={onEdit} className="text-xs text-telegram-link font-medium">
          Edit
        </button>
      </div>
      {children}
    </motion.div>
  );
}
