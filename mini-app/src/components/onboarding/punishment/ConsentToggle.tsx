interface ConsentToggleProps {
  consent: boolean;
  onToggle: () => void;
}

export function ConsentToggle({ consent, onToggle }: ConsentToggleProps) {
  return (
    <div className="bg-telegram-secondaryBg rounded-2xl p-4 mb-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-telegram-text text-sm">Enable accountability</p>
          <p className="text-xs text-telegram-hint mt-0.5">Choose a real punishment you'll actually do</p>
          <p className="text-xs text-telegram-hint/70 mt-0.5">
            Skipped quests already reduce your XP. This adds stronger consequences.
          </p>
        </div>
        <button
          onClick={onToggle}
          className={`w-12 h-7 rounded-full transition-all ${
            consent ? 'bg-red-500' : 'bg-telegram-hint/30'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-transform mx-1 ${
              consent ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
