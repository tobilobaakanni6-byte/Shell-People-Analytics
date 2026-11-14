import type { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  heightClass?: string;
  className?: string;
  children: ReactNode;
}

export function ChartCard({
  title,
  subtitle,
  heightClass = 'h-[280px]',
  className = '',
  children,
}: ChartCardProps) {
  return (
    <section
      className={`rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-[#141417] ${className}`}
    >
      <div className="mb-4 flex flex-col gap-0.5">
        <h3 className="text-sm font-semibold tracking-tight text-neutral-950 dark:text-neutral-100">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-neutral-600 dark:text-neutral-400">{subtitle}</p>
        )}
      </div>
      <div className={`w-full ${heightClass}`}>{children}</div>
    </section>
  );
}
