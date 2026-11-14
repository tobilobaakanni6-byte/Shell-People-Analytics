import { useMemo } from 'react';
import type { ChartConfiguration, ChartType } from 'chart.js';
import type { ScoredEmployee } from '../types/employee';
import { computeOverviewMetrics } from '../utils/analytics';
import { ChartCard } from './ChartCard';
import { KpiCard } from './KpiCard';
import { ShellChart } from './ShellChart';

interface OverviewTabProps {
  employees: ScoredEmployee[];
  isDark: boolean;
}

export function OverviewTab({ employees, isDark }: OverviewTabProps) {
  const metrics = useMemo(() => computeOverviewMetrics(employees), [employees]);

  const activeBarColor = '#FFC800';
  const attritionBarColor = '#F58220';
  const neutralSeriesColor = isDark ? '#D4D4D8' : '#18181B';
  const secondaryNeutral = isDark ? '#71717A' : '#A1A1AA';

  const departmentConfig = useMemo<ChartConfiguration<ChartType>>(() => {
    const labels = metrics.departmentBreakdown.map((d) => d.label);
    return {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Active',
            data: metrics.departmentBreakdown.map((d) => d.active),
            backgroundColor: activeBarColor,
            borderRadius: 4,
          },
          {
            label: 'Exited (Attrition)',
            data: metrics.departmentBreakdown.map((d) => d.attrition),
            backgroundColor: attritionBarColor,
            borderRadius: 4,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        scales: {
          x: {
            stacked: true,
            beginAtZero: true,
            ticks: { precision: 0 },
          },
          y: {
            stacked: true,
            grid: { display: false },
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              afterBody: (items) => {
                const idx = items[0]?.dataIndex;
                if (idx === undefined) return '';
                const row = metrics.departmentBreakdown[idx];
                return `Total: ${row.total}  |  Attrition: ${row.attritionRate.toFixed(1)}%`;
              },
            },
          },
        },
      },
    };
  }, [metrics.departmentBreakdown]);

  const locationConfig = useMemo<ChartConfiguration<ChartType>>(() => {
    const labels = metrics.locationBreakdown.map((l) => l.label);
    return {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Active',
            data: metrics.locationBreakdown.map((l) => l.active),
            backgroundColor: neutralSeriesColor,
            borderRadius: 4,
          },
          {
            label: 'Exited (Attrition)',
            data: metrics.locationBreakdown.map((l) => l.attrition),
            backgroundColor: attritionBarColor,
            borderRadius: 4,
          },
        ],
      },
      options: {
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
          },
          y: {
            stacked: true,
            beginAtZero: true,
            ticks: { precision: 0 },
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              afterBody: (items) => {
                const idx = items[0]?.dataIndex;
                if (idx === undefined) return '';
                const row = metrics.locationBreakdown[idx];
                return `Total: ${row.total}  |  Attrition: ${row.attritionRate.toFixed(1)}%`;
              },
            },
          },
        },
      },
    };
  }, [metrics.locationBreakdown, neutralSeriesColor]);

  const genderConfig = useMemo<ChartConfiguration<ChartType>>(() => {
    return {
      type: 'doughnut',
      data: {
        labels: metrics.genderBreakdown.map((g) => g.label),
        datasets: [
          {
            data: metrics.genderBreakdown.map((g) => g.count),
            backgroundColor: [neutralSeriesColor, activeBarColor, attritionBarColor],
            borderColor: isDark ? '#141417' : '#FFFFFF',
            borderWidth: 2,
          },
        ],
      },
      options: {
        cutout: '62%',
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const row = metrics.genderBreakdown[ctx.dataIndex];
                if (!row) return '';
                return ` ${row.label}: ${row.count} (${row.share.toFixed(1)}%) · Attrition ${row.attritionRate.toFixed(1)}%`;
              },
            },
          },
        },
      },
    };
  }, [metrics.genderBreakdown, neutralSeriesColor, isDark]);

  const employmentTypeConfig = useMemo<ChartConfiguration<ChartType>>(() => {
    return {
      type: 'bar',
      data: {
        labels: metrics.employmentTypeBreakdown.map((e) => e.label),
        datasets: [
          {
            label: 'Headcount',
            data: metrics.employmentTypeBreakdown.map((e) => e.count),
            backgroundColor: [activeBarColor, attritionBarColor, secondaryNeutral],
            borderRadius: 6,
          },
        ],
      },
      options: {
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, ticks: { precision: 0 } },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const row = metrics.employmentTypeBreakdown[ctx.dataIndex];
                if (!row) return '';
                return ` ${row.count} staff (${row.share.toFixed(1)}%) · Attrition ${row.attritionRate.toFixed(1)}%`;
              },
            },
          },
        },
      },
    };
  }, [metrics.employmentTypeBreakdown, secondaryNeutral]);

  const hiringTrendConfig = useMemo<ChartConfiguration<ChartType>>(() => {
    return {
      type: 'line',
      data: {
        labels: metrics.hiringTrend.map((h) => h.year),
        datasets: [
          {
            label: 'Total Hires',
            data: metrics.hiringTrend.map((h) => h.hires),
            borderColor: activeBarColor,
            backgroundColor: isDark ? 'rgba(255, 200, 0, 0.14)' : 'rgba(255, 200, 0, 0.22)',
            borderWidth: 2.5,
            pointRadius: 3.5,
            pointBackgroundColor: activeBarColor,
            fill: true,
            tension: 0.25,
          },
          {
            label: 'Cohort Exits',
            data: metrics.hiringTrend.map((h) => h.attrited),
            borderColor: attritionBarColor,
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [4, 4],
            pointRadius: 3,
            pointBackgroundColor: attritionBarColor,
            fill: false,
            tension: 0.25,
          },
        ],
      },
      options: {
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, ticks: { precision: 0 } },
        },
      },
    };
  }, [metrics.hiringTrend, isDark]);

  return (
    <div className="space-y-6">
      <section aria-label="Overview KPIs" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label="Headcount"
          value={metrics.headcount.toLocaleString('en-GB')}
          context={`${metrics.departmentBreakdown.length} departments · ${metrics.locationBreakdown.length} UK hubs`}
        />
        <KpiCard
          label="Attrition Rate"
          value={`${metrics.attritionRate.toFixed(1)}%`}
          context={`${metrics.attritionCount.toLocaleString('en-GB')} exited employees`}
          tone={metrics.attritionRate >= 20 ? 'alert' : 'default'}
        />
        <KpiCard
          label="Active Employees"
          value={metrics.activeEmployees.toLocaleString('en-GB')}
          context={`${metrics.headcount > 0 ? ((metrics.activeEmployees / metrics.headcount) * 100).toFixed(1) : '0.0'}% retained workforce`}
          tone="accent"
        />
        <KpiCard
          label="Average Income"
          value={`£${Math.round(metrics.averageIncome).toLocaleString('en-GB')}`}
          context="Monthly gross GBP per employee"
        />
        <KpiCard
          label="Monthly Payroll"
          value={`£${Math.round(metrics.monthlyPayroll).toLocaleString('en-GB')}`}
          context={`£${((metrics.monthlyPayroll * 12) / 1_000_000).toFixed(2)}M annualised`}
        />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <ChartCard
          title="Headcount & Attrition by Department"
          subtitle="Active employees vs. historical exits across business units"
          heightClass="h-[340px]"
          className="lg:col-span-7"
        >
          <ShellChart
            config={departmentConfig}
            isDark={isDark}
            ariaLabel="Department headcount and attrition bar chart"
          />
        </ChartCard>

        <ChartCard
          title="Workforce by UK Location"
          subtitle="Active vs. exited headcount across UK operational hubs"
          heightClass="h-[340px]"
          className="lg:col-span-5"
        >
          <ShellChart
            config={locationConfig}
            isDark={isDark}
            ariaLabel="Location headcount and attrition bar chart"
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12">
        <ChartCard
          title="Gender Distribution"
          subtitle="Workforce split and cohort attrition"
          heightClass="h-[260px]"
          className="lg:col-span-3"
        >
          <ShellChart
            config={genderConfig}
            isDark={isDark}
            ariaLabel="Gender distribution doughnut chart"
          />
        </ChartCard>

        <ChartCard
          title="Employment Type"
          subtitle="Contract mix across Full-Time, Part-Time, and Contract"
          heightClass="h-[260px]"
          className="lg:col-span-4"
        >
          <ShellChart
            config={employmentTypeConfig}
            isDark={isDark}
            ariaLabel="Employment type bar chart"
          />
        </ChartCard>

        <ChartCard
          title="Annual Hiring Trend"
          subtitle="Intake volume by hire year alongside subsequent exits"
          heightClass="h-[260px]"
          className="lg:col-span-5"
        >
          <ShellChart
            config={hiringTrendConfig}
            isDark={isDark}
            ariaLabel="Annual hiring trend line chart"
          />
        </ChartCard>
      </div>
    </div>
  );
}
