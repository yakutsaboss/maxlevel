interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}

export function TabButton({ active, onClick, icon, label, count }: TabButtonProps) {
  return (
    <button role="tab" aria-selected={active} onClick={onClick} className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-medium transition-all ${active ? 'bg-white text-blue-600 shadow-lg' : 'text-white/70 hover:text-white'}`}>
      {icon}<span>{label}</span>
      <span className={`text-xs px-2 py-0.5 rounded-full ${active ? 'bg-blue-100' : 'bg-white/20'}`} aria-label={`${count} quests`}>{count}</span>
    </button>
  );
}
