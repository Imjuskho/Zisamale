

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  label?: string;
}

export function Stepper({ value, onChange, min = 0, max = 999, step = 1, unit, label }: StepperProps) {
  const decrement = () => onChange(Math.max(min, value - step));
  const increment = () => onChange(Math.min(max, value + step));

  return (
    <div className="mb-4">
      {label && (
        <label className="text-caption font-medium text-neutral mb-2 block">{label}</label>
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={decrement}
          disabled={value <= min}
          className="w-12 h-12 rounded-lg bg-zisamale-teal text-white font-bold text-xl
                     flex items-center justify-center
                     hover:bg-zisamale-teal-dark active:scale-95
                     disabled:bg-neutral disabled:cursor-not-allowed transition-all"
        >
          −
        </button>
        <div className="flex-1 text-center">
          <input
            type="number"
            value={value}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
            }}
            className="w-full text-center text-title font-bold bg-transparent border-none outline-none"
          />
          {unit && <span className="text-caption text-neutral">{unit}</span>}
        </div>
        <button
          onClick={increment}
          disabled={value >= max}
          className="w-12 h-12 rounded-lg bg-zisamale-teal text-white font-bold text-xl
                     flex items-center justify-center
                     hover:bg-zisamale-teal-dark active:scale-95
                     disabled:bg-neutral disabled:cursor-not-allowed transition-all"
        >
          +
        </button>
      </div>
    </div>
  );
}
