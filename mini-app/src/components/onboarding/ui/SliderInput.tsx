interface SliderInputProps {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  flavorText?: Record<string, string>;
  valueLabel?: (v: number) => string;
  valueSuffix?: string;
}

export function SliderInput({ min, max, step, value, onChange, flavorText, valueLabel, valueSuffix = 'x' }: SliderInputProps) {
  const flavor = flavorText?.[String(value)] || '';
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="px-2">
      <div className="text-center mb-6">
        <span className="text-6xl font-bold text-telegram-text">{value}{valueSuffix}</span>
        {flavor && (
          <p className="text-sm text-telegram-link mt-2 font-medium">{flavor}</p>
        )}
        {valueLabel && (
          <p className="text-xs text-telegram-hint mt-1">{valueLabel(value)}</p>
        )}
      </div>

      <div className="relative">
        {/* Track background */}
        <div className="h-1.5 bg-telegram-hint/20 rounded-full">
          <div
            className="h-full bg-telegram-link rounded-full transition-all duration-150"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Dots */}
        <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-between px-0">
          {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((v) => (
            <button
              key={v}
              onClick={() => onChange(v)}
              className={`w-3 h-3 rounded-full transition-all ${
                v === value
                  ? 'w-6 h-6 bg-telegram-link shadow-lg shadow-telegram-link/40 -mt-0.5'
                  : v <= value
                  ? 'bg-telegram-link'
                  : 'bg-telegram-hint/40'
              }`}
            />
          ))}
        </div>

        {/* Range input (invisible, for touch interaction) */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
          style={{ height: '40px', marginTop: '-16px' }}
        />
      </div>

      <div className="flex justify-between mt-4">
        <span className="text-xs text-telegram-hint">Less</span>
        <span className="text-xs text-telegram-hint">More</span>
      </div>
    </div>
  );
}
