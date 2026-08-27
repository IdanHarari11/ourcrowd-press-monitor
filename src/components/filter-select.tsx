interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<readonly [string, string]>;
}

export function FilterSelect({ label, value, onChange, options }: FilterSelectProps) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-[11px] font-medium tracking-[0.06em] text-text-secondary uppercase lg:min-w-40">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 max-w-full cursor-pointer rounded-sm border border-border bg-background px-2.5 font-sans text-[13px] tracking-normal text-text-primary normal-case"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
