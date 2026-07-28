interface Props {
  value: number;
  onChange: (v: number) => void;
  label?: string;
  className?: string;
}

export default function VolumeSlider({ value, onChange, label, className = '' }: Props) {
  const pct = Math.max(0, Math.min(100, value));

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <span className="text-sm select-none w-4 text-center">
        {pct === 0 ? '🔇' : pct < 50 ? '🔉' : '🔊'}
      </span>

      {/* Custom track */}
      <div className="relative flex-1 h-3 flex items-center group">
        {/* Track bg */}
        <div className="absolute inset-0 rounded-full bg-stone-700" />
        {/* Fill */}
        <div
          className="absolute left-0 top-0 bottom-0 rounded-full bg-amber-600/80 transition-all"
          style={{ width: `${pct}%` }}
        />
        {/* Thumb */}
        <div
          className="absolute w-4 h-4 rounded-full bg-amber-400 border-2 border-amber-200 shadow-lg shadow-amber-900/40 pointer-events-none transition-all group-hover:scale-110"
          style={{ left: `calc(${pct}% - 8px)` }}
        />
        {/* Native input sits on top, invisible — handles all interaction */}
        <input
          type="range"
          min={0}
          max={100}
          value={pct}
          onChange={(e) => onChange(Number(e.target.value))}
          title={label ?? `Volume: ${pct}%`}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      <span className="text-xs text-stone-400 w-7 text-right font-sans tabular-nums">
        {pct}%
      </span>
    </div>
  );
}
