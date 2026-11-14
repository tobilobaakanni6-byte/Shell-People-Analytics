import type { ScoredEmployee } from '../types/employee';
import {
  FLIGHT_RISK_RUBRIC,
  generateInsights,
  HIGH_RISK_THRESHOLD,
} from '../utils/analytics';

interface InsightsTabProps {
  filteredEmployees: ScoredEmployee[];
  allEmployees: ScoredEmployee[];
}

export function InsightsTab({ filteredEmployees, allEmployees }: InsightsTabProps) {
  const { findings, watchlist, actions } = generateInsights(filteredEmployees, allEmployees);

  return (
    <div className="space-y-6">
      {/* Auto-generated findings */}
      <section aria-label="Auto-generated executive findings" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold tracking-tight text-neutral-950 dark:text-neutral-100">
            Executive Workforce Findings
          </h2>
          <span className="text-xs text-neutral-600 dark:text-neutral-400 tabular-nums">
            Computed dynamically across {filteredEmployees.length.toLocaleString('en-GB')} filtered records
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {findings.map((item) => {
            const metricColor =
              item.severity === 'critical'
                ? 'text-[#D9531E] dark:text-[#FF8A4C]'
                : item.severity === 'warning'
                  ? 'text-[#B45309] dark:text-[#FFC800]'
                  : item.severity === 'positive'
                    ? 'text-[#15803D] dark:text-[#4ADE80]'
                    : 'text-neutral-950 dark:text-neutral-100';

            return (
              <article
                key={item.id}
                className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-[#141417]"
              >
                <div>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                      {item.category}
                    </span>
                    <span className={`font-mono-tabular text-sm font-bold ${metricColor}`}>
                      {item.metric}
                    </span>
                  </div>
                  <h3 className="mt-2 text-sm font-semibold leading-snug text-neutral-950 dark:text-neutral-100">
                    {item.headline}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                    {item.detail}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Transparent scoring rule + Top-10 Watchlist */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section
          aria-label="Top 10 flight-risk watchlist"
          className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#141417] lg:col-span-8"
        >
          <div className="border-b border-neutral-200 p-5 dark:border-neutral-800">
            <h2 className="text-base font-semibold tracking-tight text-neutral-950 dark:text-neutral-100">
              Top-10 Active Flight-Risk Watchlist
            </h2>
            <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">
              Active employees ranked highest on the 100-point retention risk rubric (High Risk ≥ {HIGH_RISK_THRESHOLD} pts)
            </p>
          </div>

          {watchlist.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-600 dark:text-neutral-400">
              No active employees appear in the current filter selection. Set Attrition to All or Active to inspect retention risk.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50/80 text-xs font-semibold text-neutral-700 dark:border-neutral-800 dark:bg-[#1A1A1E] dark:text-neutral-300">
                    <th scope="col" className="px-4 py-3 whitespace-nowrap">#</th>
                    <th scope="col" className="px-4 py-3 whitespace-nowrap">Employee</th>
                    <th scope="col" className="px-4 py-3 whitespace-nowrap">Department · Hub</th>
                    <th scope="col" className="px-4 py-3 whitespace-nowrap text-right">Score</th>
                    <th scope="col" className="px-4 py-3 whitespace-nowrap">Score Drivers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {watchlist.map((emp, idx) => {
                    const isHigh = emp.flightRiskScore >= HIGH_RISK_THRESHOLD;
                    return (
                      <tr
                        key={emp.employeeId}
                        className="transition-colors hover:bg-neutral-50 dark:hover:bg-[#1A1A1E]/80"
                      >
                        <td className="px-4 py-3 font-mono-tabular text-xs text-neutral-500 dark:text-neutral-400">
                          {String(idx + 1).padStart(2, '0')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-medium text-neutral-950 dark:text-neutral-100">
                            {emp.fullName}
                          </div>
                          <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono-tabular">
                            {emp.employeeId} · {emp.jobTitle} · L{emp.jobLevel}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-neutral-700 dark:text-neutral-300">
                          <div>{emp.department}</div>
                          <div className="text-neutral-500 dark:text-neutral-400">{emp.location}</div>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <span
                            className={`font-mono-tabular text-sm font-bold ${
                              isHigh
                                ? 'text-[#D9531E] dark:text-[#FF8A4C]'
                                : 'text-[#B45309] dark:text-[#FFC800]'
                            }`}
                          >
                            {emp.flightRiskScore}
                          </span>
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">/100</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-300">
                          {emp.riskFactors.map((f) => `${f.label} (+${f.points})`).join(' · ')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside
          aria-label="Flight-risk scoring rubric"
          className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-[#141417] lg:col-span-4"
        >
          <h2 className="text-base font-semibold tracking-tight text-neutral-950 dark:text-neutral-100">
            Transparent Scoring Rule
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
            Every active employee is scored out of 100 points using five deterministic criteria calibrated to Shell UK exit drivers. Scores ≥ {HIGH_RISK_THRESHOLD} indicate High Flight Risk.
          </p>

          <dl className="mt-4 divide-y divide-neutral-200 dark:divide-neutral-800">
            {FLIGHT_RISK_RUBRIC.map((item) => (
              <div key={item.criterion} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-xs font-semibold text-neutral-950 dark:text-neutral-100">
                    {item.criterion}
                  </dt>
                  <dd className="font-mono-tabular text-xs font-semibold text-[#B45309] dark:text-[#FFC800] whitespace-nowrap">
                    Max {item.maxPoints} pts
                  </dd>
                </div>
                <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                  {item.rule}
                </p>
              </div>
            ))}
          </dl>
        </aside>
      </div>

      {/* Recommended Actions */}
      <section aria-label="Recommended HR retention actions" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold tracking-tight text-neutral-950 dark:text-neutral-100">
            Recommended Retention Actions
          </h2>
          <span className="text-xs text-neutral-600 dark:text-neutral-400">
            Prioritised interventions tailored to current filter selection
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {actions.map((action, index) => {
            const priorityColor =
              action.priority === 'Immediate'
                ? 'text-[#D9531E] dark:text-[#FF8A4C]'
                : action.priority === 'Near-Term'
                  ? 'text-[#B45309] dark:text-[#FFC800]'
                  : 'text-neutral-700 dark:text-neutral-300';

            return (
              <article
                key={action.id}
                className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-[#141417]"
              >
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="font-semibold text-neutral-500 dark:text-neutral-400">
                    0{index + 1}. {action.targetGroup}
                  </span>
                  <span className={`font-semibold whitespace-nowrap ${priorityColor}`}>
                    {action.priority}
                  </span>
                </div>
                <h3 className="mt-2 text-sm font-semibold text-neutral-950 dark:text-neutral-100">
                  {action.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                  {action.rationale}
                </p>
                <p className="mt-2.5 border-t border-neutral-200 pt-2.5 text-xs font-medium text-neutral-900 dark:border-neutral-800 dark:text-neutral-200">
                  Next step: {action.actionStep}
                </p>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
