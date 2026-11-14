interface KpiCardProps {
  label: string;
  value: string;
  context: string;
  tone?: 'default' | 'accent' | 'alert';
}

export function KpiCard({ label, value, context, tone = 'default' }: KpiCardProps) {
  const valueClass =
    tone === 'alert'
      ? 'text-[#D9531E] dark:text-[#FF8A4C]'
      : tone === 'accent'
        ? 'text-neutral-950 dark:text-[#FFC800]'
        : 'text-neutral-950 dark:text-white';

  return (
    <div className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-[#141417]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
          {label}
        </span>
        {tone === 'accent' && (
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full bg-[#FFC800]"
          />
        )}
        {tone === 'alert' && (
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full bg-[#F58220]"
          />
        )}
      </div>
      <div className={`mt-2.5 text-2xl font-bold tracking-tight tabular-nums sm:text-[1.75rem] ${valueClass}`}>
        {value}
      </div>
      <p className="mt-1.5 text-xs text-neutral-600 dark:text-neutral-400 tabular-nums">
        {context}
      </p>
    </div>
  );
}
