interface Props {
  value: number;
  onChange: (v: number) => void;
  label?: string;
  className?: string;
}

export default function VolumeSlider({ value, onChange, label, className = '' }: Props) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-xs text-stone-500 select-none">
        {value === 0 ? '🔇' : value < 50 ? '🔉' : '🔊'}
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        title={label ?? `Volume: ${value}%`}
      />
      <span className="text-xs text-stone-500 w-7 text-right font-sans tabular-nums">
        {value}%
      </span>
    </div>
  );
}
