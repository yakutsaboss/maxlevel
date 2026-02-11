import { Trash2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface DangerZoneProps {
  deleting: boolean;
  onDelete: () => void;
}

export function DangerZone({ deleting, onDelete }: DangerZoneProps) {
  return (
    <div className="px-4 mt-10 mb-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-telegram-secondaryBg rounded-2xl p-4 border border-red-500/20"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-red-500 w-10 h-10 rounded-xl flex items-center justify-center text-white" aria-hidden="true">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-red-500">Delete Account</h3>
            <p className="text-xs text-telegram-hint" id="delete-account-warning">Permanently remove your account and all data</p>
          </div>
        </div>
        <button
          onClick={onDelete}
          disabled={deleting}
          aria-describedby="delete-account-warning"
          className="w-full py-3 rounded-xl border-2 border-red-500 text-red-500 font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          {deleting ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Deleting...</>
          ) : (
            <><Trash2 className="w-4 h-4" />Delete Account</>
          )}
        </button>
      </motion.div>
    </div>
  );
}
