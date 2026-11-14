import { RotateCcw } from 'lucide-react';
import type { DashboardTab, FilterState } from '../types/employee';

interface FilterBarProps {
  filters: FilterState;
  options: {
    departments: string[];
    locations: string[];
    employmentTypes: string[];
    genders: string[];
  };
  onFilterChange: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onResetFilters: () => void;
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  filteredCount: number;
  totalCount: number;
}

const TABS: Array<{ id: DashboardTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'deep-dive', label: 'Deep Dive' },
  { id: 'insights', label: 'Insights' },
];

export function FilterBar({
  filters,
  options,
  onFilterChange,
  onResetFilters,
  activeTab,
  onTabChange,
  filteredCount,
  totalCount,
}: FilterBarProps) {
  const hasActiveFilter =
    filters.department !== 'All' ||
    filters.location !== 'All' ||
    filters.employmentType !== 'All' ||
    filters.gender !== 'All' ||
    filters.attrition !== 'All';

  const selectClass =
    'w-full min-h-[40px] rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 transition-colors focus:border-[#111113] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC800] dark:border-neutral-700 dark:bg-[#1C1C21] dark:text-neutral-100 dark:focus:border-[#FFC800]';

  return (
    <div className="space-y-4">
      <section
        aria-label="Workforce filters"
        className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-[#141417]"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">
              Shared Filters
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              Showing {filteredCount.toLocaleString('en-GB')} of{' '}
              {totalCount.toLocaleString('en-GB')} employees
            </span>
          </div>

          {hasActiveFilter && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC800] dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label
              htmlFor="filter-department"
              className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400"
            >
              Department
            </label>
            <select
              id="filter-department"
              value={filters.department}
              onChange={(e) => onFilterChange('department', e.target.value)}
              className={selectClass}
            >
              <option value="All">All Departments</option>
              {options.departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-location"
              className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400"
            >
              Location
            </label>
            <select
              id="filter-location"
              value={filters.location}
              onChange={(e) => onFilterChange('location', e.target.value)}
              className={selectClass}
            >
              <option value="All">All UK Locations</option>
              {options.locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-employment-type"
              className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400"
            >
              Employment Type
            </label>
            <select
              id="filter-employment-type"
              value={filters.employmentType}
              onChange={(e) => onFilterChange('employmentType', e.target.value)}
              className={selectClass}
            >
              <option value="All">All Contract Types</option>
              {options.employmentTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-gender"
              className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400"
            >
              Gender
            </label>
            <select
              id="filter-gender"
              value={filters.gender}
              onChange={(e) => onFilterChange('gender', e.target.value)}
              className={selectClass}
            >
              <option value="All">All Genders</option>
              {options.genders.map((gender) => (
                <option key={gender} value={gender}>
                  {gender}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-attrition"
              className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400"
            >
              Attrition
            </label>
            <select
              id="filter-attrition"
              value={filters.attrition}
              onChange={(e) => onFilterChange('attrition', e.target.value)}
              className={selectClass}
            >
              <option value="All">All Statuses</option>
              <option value="No">Active (No Attrition)</option>
              <option value="Yes">Exited (Attrition = Yes)</option>
            </select>
          </div>
        </div>
      </section>

      <nav
        aria-label="Analytics sections"
        className="flex items-center gap-1.5 overflow-x-auto border-b border-neutral-200 pb-px dark:border-neutral-800"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative min-h-[44px] px-4 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 rounded-t-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC800] ${
                isActive
                  ? 'bg-[#FFC800] text-[#111113]'
                  : 'text-neutral-600 hover:bg-neutral-200/60 hover:text-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-800/70 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
