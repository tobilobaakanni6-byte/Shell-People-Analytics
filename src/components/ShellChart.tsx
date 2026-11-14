import { useEffect, useRef } from 'react';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  type ChartConfiguration,
  type ChartType,
  DoughnutController,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  ScatterController,
  Tooltip,
} from 'chart.js';

Chart.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  DoughnutController,
  ArcElement,
  ScatterController,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
);

interface ShellChartProps {
  config: ChartConfiguration<ChartType>;
  isDark: boolean;
  ariaLabel: string;
}

export function ShellChart({ config, isDark, ariaLabel }: ShellChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart<ChartType> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const tickColor = isDark ? '#A1A1AA' : '#52525B';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(17, 17, 19, 0.08)';
    const legendColor = isDark ? '#E4E4E7' : '#27272A';
    const tooltipBg = isDark ? '#1C1C21' : '#111113';
    const tooltipBorder = isDark ? '#3F3F46' : '#27272A';

    const mergedOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 240,
      },
      ...config.options,
      plugins: {
        ...config.options?.plugins,
        legend: {
          ...config.options?.plugins?.legend,
          labels: {
            color: legendColor,
            boxWidth: 12,
            boxHeight: 12,
            padding: 14,
            font: {
              family: "'Plus Jakarta Sans', sans-serif",
              size: 12,
              weight: 500,
            },
            ...(config.options?.plugins?.legend?.labels ?? {}),
          },
        },
        tooltip: {
          backgroundColor: tooltipBg,
          borderColor: tooltipBorder,
          borderWidth: 1,
          titleColor: '#FFC800',
          bodyColor: '#F8F8FA',
          padding: 10,
          cornerRadius: 8,
          titleFont: {
            family: "'Plus Jakarta Sans', sans-serif",
            size: 12,
            weight: 600,
          },
          bodyFont: {
            family: "'JetBrains Mono', monospace",
            size: 12,
          },
          ...(config.options?.plugins?.tooltip ?? {}),
        },
      },
    } as ChartConfiguration<ChartType>['options'];

    const rawScales = (config.options?.scales ?? {}) as Record<string, Record<string, unknown>>;
    const themedScales: Record<string, Record<string, unknown>> = {};

    for (const [axisKey, axisVal] of Object.entries(rawScales)) {
      const existingTicks = (axisVal.ticks as Record<string, unknown>) ?? {};
      const existingGrid = (axisVal.grid as Record<string, unknown>) ?? {};
      const existingTitle = (axisVal.title as Record<string, unknown>) ?? undefined;

      themedScales[axisKey] = {
        ...axisVal,
        ticks: {
          color: tickColor,
          font: {
            family: "'Plus Jakarta Sans', sans-serif",
            size: 11,
          },
          ...existingTicks,
        },
        grid: {
          color: gridColor,
          ...existingGrid,
        },
        ...(existingTitle
          ? {
              title: {
                color: tickColor,
                font: {
                  family: "'Plus Jakarta Sans', sans-serif",
                  size: 11,
                  weight: 600,
                },
                ...existingTitle,
              },
            }
          : {}),
      };
    }

    if (Object.keys(themedScales).length > 0 && mergedOptions) {
      mergedOptions.scales = themedScales as ChartConfiguration<ChartType>['options'] extends {
        scales?: infer S;
      }
        ? S
        : never;
    }

    chartRef.current = new Chart(canvas, {
      type: config.type,
      data: config.data,
      options: mergedOptions,
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [config, isDark]);

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} aria-label={ariaLabel} role="img" />
    </div>
  );
}
