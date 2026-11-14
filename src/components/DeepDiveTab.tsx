import { useEffect, useMemo, useState } from 'react';
import type { ChartConfiguration, ChartType } from 'chart.js';
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react';
import type { ScoredEmployee } from '../types/employee';
import { computeDeepDiveMetrics, HIGH_RISK_THRESHOLD } from '../utils/analytics';
import { ChartCard } from './ChartCard';
import { KpiCard } from './KpiCard';
import { ShellChart } from './ShellChart';

interface DeepDiveTabProps {
  employees: ScoredEmployee[];
  isDark: boolean;
}

type SortKey =
  | 'employeeId'
  | 'fullName'
  | 'department'
  | 'location'
  | 'jobLevel'
  | 'employmentType'
  | 'yearsAtCompany'
  | 'monthlyIncomeGbp'
  | 'flightRiskScore'
  | 'attrition';

const PAGE_SIZE = 15;

export function DeepDiveTab({ employees, isDark }: DeepDiveTabProps) {
  const metrics = useMemo(() => computeDeepDiveMetrics(employees), [employees]);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('flightRiskScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [employees, searchQuery]);

  const neutralBar = isDark ? '#D4D4D8' : '#18181B';
  const yellow = '#FFC800';
  const orange = '#F58220';

  const ageBandConfig = useMemo<ChartConfiguration<ChartType>>(() => {
    return {
      type: 'bar',
      data: {
        labels: metrics.ageBands.map((b) => b.band),
        datasets: [
          {
            label: 'Headcount',
            data: metrics.ageBands.map((b) => b.total),
            backgroundColor: neutralBar,
            borderRadius: 4,
            yAxisID: 'y',
          },
          {
            label: 'Attrition Rate (%)',
            type: 'line',
            data: metrics.ageBands.map((b) => Number(b.attritionRate.toFixed(1))),
            borderColor: orange,
            backgroundColor: orange,
            borderWidth: 2.5,
            pointRadius: 4,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            ticks: { precision: 0 },
            title: { display: true, text: 'Employees' },
          },
          y1: {
            position: 'right',
            beginAtZero: true,
            max: 60,
            grid: { display: false },
            title: { display: true, text: 'Attrition %' },
          },
        },
      },
    };
  }, [metrics.ageBands, neutralBar]);

  const tenureBandConfig = useMemo<ChartConfiguration<ChartType>>(() => {
    return {
      type: 'bar',
      data: {
        labels: metrics.tenureBands.map((b) => b.band),
        datasets: [
          {
            label: 'Headcount',
            data: metrics.tenureBands.map((b) => b.total),
            backgroundColor: yellow,
            borderRadius: 4,
            yAxisID: 'y',
          },
          {
            label: 'Attrition Rate (%)',
            type: 'line',
            data: metrics.tenureBands.map((b) => Number(b.attritionRate.toFixed(1))),
            borderColor: orange,
            backgroundColor: orange,
            borderWidth: 2.5,
            pointRadius: 4,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            ticks: { precision: 0 },
            title: { display: true, text: 'Employees' },
          },
          y1: {
            position: 'right',
            beginAtZero: true,
            max: 60,
            grid: { display: false },
            title: { display: true, text: 'Attrition %' },
          },
        },
      },
    };
  }, [metrics.tenureBands]);

  const incomeByLevelConfig = useMemo<ChartConfiguration<ChartType>>(() => {
    return {
      type: 'bar',
      data: {
        labels: metrics.incomeByLevel.map((l) => l.level),
        datasets: [
          {
            label: 'Avg Monthly Income (£)',
            data: metrics.incomeByLevel.map((l) => l.avgIncome),
            backgroundColor: yellow,
            borderRadius: 5,
          },
        ],
      },
      options: {
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            ticks: {
              callback: (v) => `£${Number(v).toLocaleString('en-GB')}`,
            },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const row = metrics.incomeByLevel[ctx.dataIndex];
                return ` £${row.avgIncome.toLocaleString('en-GB')}/mo (${row.count} staff)`;
              },
            },
          },
        },
      },
    };
  }, [metrics.incomeByLevel]);

  const incomeByDeptConfig = useMemo<ChartConfiguration<ChartType>>(() => {
    return {
      type: 'bar',
      data: {
        labels: metrics.incomeByDepartment.map((d) => d.department),
        datasets: [
          {
            label: 'Avg Monthly Income (£)',
            data: metrics.incomeByDepartment.map((d) => d.avgIncome),
            backgroundColor: neutralBar,
            borderRadius: 4,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              callback: (v) => `£${Number(v).toLocaleString('en-GB')}`,
            },
          },
          y: { grid: { display: false } },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const row = metrics.incomeByDepartment[ctx.dataIndex];
                return ` £${row.avgIncome.toLocaleString('en-GB')}/mo (${row.count} staff)`;
              },
            },
          },
        },
      },
    };
  }, [metrics.incomeByDepartment, neutralBar]);

  const educationConfig = useMemo<ChartConfiguration<ChartType>>(() => {
    return {
      type: 'bar',
      data: {
        labels: metrics.educationBreakdown.map((e) => e.label),
        datasets: [
          {
            label: 'Headcount',
            data: metrics.educationBreakdown.map((e) => e.total),
            backgroundColor: neutralBar,
            borderRadius: 4,
            yAxisID: 'y',
          },
          {
            label: 'Attrition Rate (%)',
            type: 'line',
            data: metrics.educationBreakdown.map((e) => Number(e.attritionRate.toFixed(1))),
            borderColor: orange,
            backgroundColor: orange,
            borderWidth: 2.5,
            pointRadius: 4,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, ticks: { precision: 0 } },
          y1: { position: 'right', beginAtZero: true, max: 60, grid: { display: false } },
        },
      },
    };
  }, [metrics.educationBreakdown, neutralBar]);

  const travelConfig = useMemo<ChartConfiguration<ChartType>>(() => {
    return {
      type: 'bar',
      data: {
        labels: metrics.travelBreakdown.map((t) => t.label),
        datasets: [
          {
            label: 'Headcount',
            data: metrics.travelBreakdown.map((t) => t.total),
            backgroundColor: yellow,
            borderRadius: 4,
            yAxisID: 'y',
          },
          {
            label: 'Attrition Rate (%)',
            type: 'line',
            data: metrics.travelBreakdown.map((t) => Number(t.attritionRate.toFixed(1))),
            borderColor: orange,
            backgroundColor: orange,
            borderWidth: 2.5,
            pointRadius: 4,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, ticks: { precision: 0 } },
          y1: { position: 'right', beginAtZero: true, max: 60, grid: { display: false } },
        },
      },
    };
  }, [metrics.travelBreakdown]);

  const scatterConfig = useMemo<ChartConfiguration<ChartType>>(() => {
    const activePts = metrics.scatterPoints.filter((p) => p.attrition === 'No');
    const exitedPts = metrics.scatterPoints.filter((p) => p.attrition === 'Yes');

    return {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Active',
            data: activePts,
            backgroundColor: isDark ? 'rgba(255, 200, 0, 0.72)' : 'rgba(17, 17, 19, 0.58)',
            pointRadius: 4.5,
            pointHoverRadius: 6.5,
          },
          {
            label: 'Exited (Attrition)',
            data: exitedPts,
            backgroundColor: 'rgba(245, 130, 32, 0.9)',
            pointRadius: 5.5,
            pointHoverRadius: 7.5,
          },
        ],
      },
      options: {
        scales: {
          x: {
            beginAtZero: true,
            title: { display: true, text: 'Years at Shell' },
          },
          y: {
            beginAtZero: false,
            title: { display: true, text: 'Monthly Income (£ GBP)' },
            ticks: {
              callback: (v) => `£${Number(v).toLocaleString('en-GB')}`,
            },
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const raw = ctx.raw as {
                  x: number;
                  y: number;
                  name: string;
                  id: string;
                  department: string;
                  level: number;
                };
                return ` ${raw.name} (${raw.id}) · L${raw.level} ${raw.department} · ${raw.x} yrs · £${raw.y.toLocaleString('en-GB')}`;
              },
            },
          },
        },
      },
    };
  }, [metrics.scatterPoints, isDark]);

  const searchedAndSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? employees.filter(
          (e) =>
            e.employeeId.toLowerCase().includes(q) ||
            e.fullName.toLowerCase().includes(q) ||
            e.jobTitle.toLowerCase().includes(q) ||
            e.department.toLowerCase().includes(q) ||
            e.location.toLowerCase().includes(q),
        )
      : employees;

    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let cmp = 0;
      if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv));
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [employees, searchQuery, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(searchedAndSorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = searchedAndSorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'fullName' || key === 'employeeId' || key === 'department' || key === 'location' ? 'asc' : 'desc');
    }
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) {
      return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" aria-hidden="true" />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-[#F58220]" aria-hidden="true" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-[#F58220]" aria-hidden="true" />
    );
  };

  return (
    <div className="space-y-6">
      <section aria-label="Deep Dive KPIs" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label="Average Tenure"
          value={`${metrics.averageTenure.toFixed(1)} yrs`}
          context="Mean years at Shell UK"
        />
        <KpiCard
          label="Female Share"
          value={`${metrics.femaleShare.toFixed(1)}%`}
          context="Representation in filtered cohort"
        />
        <KpiCard
          label="Non-Full-Time Share"
          value={`${metrics.nonFullTimeShare.toFixed(1)}%`}
          context="Part-Time & Contract workforce"
        />
        <KpiCard
          label="Years Since Promotion"
          value={`${metrics.avgYearsSincePromotion.toFixed(1)} yrs`}
          context="Mean time since last grade move"
        />
        <KpiCard
          label="High Flight-Risk Count"
          value={metrics.highFlightRiskCount.toLocaleString('en-GB')}
          context={`Active staff scoring ≥ ${HIGH_RISK_THRESHOLD}/100`}
          tone={metrics.highFlightRiskCount > 0 ? 'alert' : 'default'}
        />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Age Bands & Attrition Rate"
          subtitle="Headcount volume paired with attrition percentage per age bracket"
          heightClass="h-[270px]"
        >
          <ShellChart config={ageBandConfig} isDark={isDark} ariaLabel="Age bands and attrition chart" />
        </ChartCard>

        <ChartCard
          title="Tenure Bands & Attrition Rate"
          subtitle="Retention profile across service length cohorts"
          heightClass="h-[270px]"
        >
          <ShellChart config={tenureBandConfig} isDark={isDark} ariaLabel="Tenure bands and attrition chart" />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <ChartCard
          title="Monthly Income by Job Level"
          subtitle="Mean gross GBP pay across Grades 1 to 5"
          heightClass="h-[310px]"
          className="lg:col-span-5"
        >
          <ShellChart config={incomeByLevelConfig} isDark={isDark} ariaLabel="Income by job level chart" />
        </ChartCard>

        <ChartCard
          title="Monthly Income by Department"
          subtitle="Mean monthly pay ranked highest to lowest"
          heightClass="h-[310px]"
          className="lg:col-span-7"
        >
          <ShellChart config={incomeByDeptConfig} isDark={isDark} ariaLabel="Income by department chart" />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <ChartCard
          title="Education & Attrition"
          subtitle="Qualification profile and exit rates"
          heightClass="h-[270px]"
          className="lg:col-span-4"
        >
          <ShellChart config={educationConfig} isDark={isDark} ariaLabel="Education breakdown chart" />
        </ChartCard>

        <ChartCard
          title="Business Travel & Attrition"
          subtitle="Mobility cadence and turnover rate"
          heightClass="h-[270px]"
          className="lg:col-span-3"
        >
          <ShellChart config={travelConfig} isDark={isDark} ariaLabel="Business travel breakdown chart" />
        </ChartCard>

        <ChartCard
          title="Income vs. Tenure Scatter"
          subtitle="Monthly income (£) against years at Shell, highlighted by attrition"
          heightClass="h-[270px]"
          className="lg:col-span-5"
        >
          <ShellChart config={scatterConfig} isDark={isDark} ariaLabel="Income versus tenure scatter plot" />
        </ChartCard>
      </div>

      <section
        aria-label="Employee directory table"
        className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#141417]"
      >
        <div className="flex flex-col gap-3 border-b border-neutral-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-neutral-950 dark:text-neutral-100">
              Employee Directory
            </h3>
            <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400 tabular-nums">
              {searchedAndSorted.length.toLocaleString('en-GB')} matching employees · Click any column header to sort
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ID, name, role, location..."
              aria-label="Search employees"
              className="w-full min-h-[40px] rounded-lg border border-neutral-300 bg-white pl-9 pr-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#111113] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC800] dark:border-neutral-700 dark:bg-[#1C1C21] dark:text-neutral-100 dark:focus:border-[#FFC800]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/80 text-xs font-semibold text-neutral-700 dark:border-neutral-800 dark:bg-[#1A1A1E] dark:text-neutral-300">
                {(
                  [
                    ['employeeId', 'ID', 'left'],
                    ['fullName', 'Employee', 'left'],
                    ['department', 'Department', 'left'],
                    ['location', 'Location', 'left'],
                    ['jobLevel', 'Lvl', 'right'],
                    ['employmentType', 'Contract', 'left'],
                    ['yearsAtCompany', 'Tenure', 'right'],
                    ['monthlyIncomeGbp', 'Monthly Pay', 'right'],
                    ['flightRiskScore', 'Risk Score', 'right'],
                    ['attrition', 'Status', 'left'],
                  ] as Array<[SortKey, string, 'left' | 'right']>
                ).map(([key, label, align]) => (
                  <th key={key} scope="col" className={`px-4 py-3 whitespace-nowrap ${align === 'right' ? 'text-right' : 'text-left'}`}>
                    <button
                      type="button"
                      onClick={() => handleSort(key)}
                      className={`inline-flex items-center gap-1 font-semibold hover:text-neutral-950 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC800] rounded ${
                        align === 'right' ? 'flex-row-reverse' : ''
                      }`}
                    >
                      <span>{label}</span>
                      {renderSortIcon(key)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-sm text-neutral-600 dark:text-neutral-400">
                    No employees match your current search and filter criteria.
                  </td>
                </tr>
              ) : (
                pageRows.map((emp) => {
                  const isHighRisk = emp.attrition === 'No' && emp.flightRiskScore >= HIGH_RISK_THRESHOLD;
                  return (
                    <tr
                      key={emp.employeeId}
                      className="transition-colors hover:bg-neutral-50 dark:hover:bg-[#1A1A1E]/80"
                    >
                      <td className="px-4 py-2.5 font-mono-tabular text-xs text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                        {emp.employeeId}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="font-medium text-neutral-950 dark:text-neutral-100">
                          {emp.fullName}
                        </div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">
                          {emp.jobTitle}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                        {emp.department}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                        {emp.location}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono-tabular text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                        L{emp.jobLevel}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                        {emp.employmentType}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono-tabular text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                        {emp.yearsAtCompany} yrs
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono-tabular font-medium text-neutral-950 dark:text-neutral-100 whitespace-nowrap">
                        £{emp.monthlyIncomeGbp.toLocaleString('en-GB')}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono-tabular whitespace-nowrap">
                        {emp.attrition === 'Yes' ? (
                          <span className="text-xs text-neutral-500 dark:text-neutral-500">—</span>
                        ) : (
                          <span
                            className={`font-semibold ${
                              isHighRisk
                                ? 'text-[#D9531E] dark:text-[#FF8A4C]'
                                : 'text-neutral-900 dark:text-neutral-200'
                            }`}
                          >
                            {emp.flightRiskScore}/100
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span
                          className={`text-xs font-medium ${
                            emp.attrition === 'Yes'
                              ? 'text-[#D9531E] dark:text-[#FF8A4C]'
                              : 'text-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          {emp.attrition === 'Yes' ? 'Exited' : 'Active'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {searchedAndSorted.length > PAGE_SIZE && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 px-5 py-3 text-xs text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
            <span className="tabular-nums">
              Page {safePage} of {totalPages} · Showing {(safePage - 1) * PAGE_SIZE + 1}–
              {Math.min(safePage * PAGE_SIZE, searchedAndSorted.length)} of{' '}
              {searchedAndSorted.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="min-h-[36px] rounded-lg border border-neutral-300 px-3 py-1.5 font-medium text-neutral-800 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="min-h-[36px] rounded-lg border border-neutral-300 px-3 py-1.5 font-medium text-neutral-800 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
