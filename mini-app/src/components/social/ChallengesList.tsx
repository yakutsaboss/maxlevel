import { memo } from 'react';
import { Swords } from 'lucide-react';
import { ChallengeCard } from './ChallengeCard';

interface Challenge {
  id: number;
  title: string;
  description: string | null;
  mode: string | null;
  target_value: number | null;
  start_date: string;
  end_date: string | null;
  status: string;
  progress: number;
  participant_count: number;
}

interface ChallengesListProps {
  challenges: Challenge[];
}

export const ChallengesList = memo(function ChallengesList({ challenges }: ChallengesListProps) {
  if (challenges.length === 0) {
    return (
      <div className="text-center py-12">
        <Swords className="w-12 h-12 text-telegram-hint mx-auto mb-3" />
        <p className="text-telegram-hint text-sm">No challenges yet. Create one!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {challenges.map((challenge) => (
        <ChallengeCard key={challenge.id} challenge={challenge} />
      ))}
    </div>
  );
});
