import { motion } from 'framer-motion';
import { useTelegram } from '@/hooks/useTelegram';
import { ProgressBar } from './ui/ProgressBar';
import { SummaryStats } from './summary/SummaryStats';
import { SummaryFocusAreas, SummaryModeCards } from './summary/SummaryModeCard';
import { SummarySchedule } from './summary/SummarySchedule';
import type { OnboardingData } from '@/hooks/useOnboarding';

interface SummaryProps {
  progress: number;
  stepLabel?: string;
  data: OnboardingData;
  onEdit: (step: string) => void;
  onNext: () => void;
}

export function Summary({ progress, stepLabel, data, onEdit, onNext }: SummaryProps) {
  const { user, haptic } = useTelegram();
  const name = data.nickname || user?.first_name || 'Friend';

  return (
    <div className="min-h-screen flex flex-col bg-telegram-bg">
      <ProgressBar progress={progress} stepLabel={stepLabel} />

      <div className="flex-1 flex flex-col px-6 pt-6 pb-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <h2 className="text-2xl font-bold text-telegram-text mb-1">Almost Done!</h2>
          <p className="text-telegram-hint text-sm">Review your setup before we begin</p>
        </motion.div>

        <SummaryStats name={name} gender={data.gender} />
        <SummaryFocusAreas data={data} onEdit={onEdit} />
        <SummaryModeCards data={data} onEdit={onEdit} />
        <SummarySchedule data={data} onEdit={onEdit} />
      </div>

      <div className="px-6 pb-8">
        <motion.button
          onClick={() => { haptic.notification('success'); onNext(); }}
          className="w-full py-4 rounded-2xl text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg"
          whileTap={{ scale: 0.97 }}
          animate={{
            boxShadow: [
              '0 0 0 0 rgba(168, 85, 247, 0)',
              '0 0 20px 4px rgba(168, 85, 247, 0.3)',
              '0 0 0 0 rgba(168, 85, 247, 0)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Let's Start!
        </motion.button>
      </div>
    </div>
  );
}
