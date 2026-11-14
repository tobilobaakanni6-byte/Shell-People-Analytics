import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { AlertCircle, FileSpreadsheet, Moon, RefreshCw, Sun, Upload } from 'lucide-react';
import { DeepDiveTab } from './components/DeepDiveTab';
import { FilterBar } from './components/FilterBar';
import { GoogleSignInButton } from './components/GoogleSignInButton';
import { GoogleWorkspaceModal } from './components/GoogleWorkspaceModal';
import { InsightsTab } from './components/InsightsTab';
import { OverviewTab } from './components/OverviewTab';
import {
  clearAccessToken,
  googleSignIn,
  googleSignOut,
  initGoogleAuth,
} from './services/googleAuth';
import {
  DEFAULT_SHELL_SHEET_GID,
  DEFAULT_SHELL_SPREADSHEET_ID,
  fetchSheetEmployeesViaApi,
} from './services/googleSheetsApi';
import type {
  DashboardTab,
  DataSourceMeta,
  EmployeeRecord,
  FilterState,
  ScoredEmployee,
} from './types/employee';
import { filterEmployees, scoreEmployees } from './utils/analytics';
import { fetchGoogleSheetCsv, parseEmployeeCsv } from './utils/csvParser';

const INITIAL_FILTERS: FilterState = {
  department: 'All',
  location: 'All',
  employmentType: 'All',
  gender: 'All',
  attrition: 'All',
};

function ShellPectenMark() {
  return (
    <svg
      width="28"
      height="26"
      viewBox="0 0 28 26"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M14 2C7.4 2 2 7.2 2 13.6C2 16.5 3.2 19.2 5.2 21.1L7.8 24H20.2L22.8 21.1C24.8 19.2 26 16.5 26 13.6C26 7.2 20.6 2 14 2Z"
        fill="#FFC800"
        stroke="#F58220"
        strokeWidth="2"
      />
      <path
        d="M14 4.5V22M14 22L8.2 7.4M14 22L19.8 7.4M14 22L5.2 12.6M14 22L22.8 12.6"
        stroke="#F58220"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function App() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem('shell-pa-theme') === 'dark';
    } catch {
      return false;
    }
  });

  const [employees, setEmployees] = useState<ScoredEmployee[]>([]);
  const [sourceMeta, setSourceMeta] = useState<DataSourceMeta | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);

  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState<boolean>(false);
  const [activeSheet, setActiveSheet] = useState<{
    spreadsheetId: string;
    tabTitle?: string;
    gid?: number;
  }>({
    spreadsheetId: DEFAULT_SHELL_SPREADSHEET_ID,
    gid: DEFAULT_SHELL_SHEET_GID,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('shell-pa-theme', isDark ? 'dark' : 'light');
    } catch {
      // Ignore storage write errors in restricted frames
    }
  }, [isDark]);

  useEffect(() => {
    const unsubscribe = initGoogleAuth(
      (user, token) => {
        setGoogleUser(user);
        setAccessToken(token);
      },
      (user) => {
        setGoogleUser(user);
        setAccessToken(null);
      },
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = useCallback(async () => {
    setIsSigningIn(true);
    setErrorMessage(null);
    try {
      const result = await googleSignIn();
      setGoogleUser(result.user);
      setAccessToken(result.accessToken);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Google Sign-In failed or was cancelled.';
      setErrorMessage(msg);
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const handleGoogleSignOut = useCallback(async () => {
    await googleSignOut();
    setGoogleUser(null);
    setAccessToken(null);
  }, []);

  const handleLoadWorkspaceRecords = useCallback(
    (
      rawRecords: EmployeeRecord[],
      sourceLabel: string,
      sheetInfo: { spreadsheetId: string; tabTitle: string; gid?: number },
    ) => {
      const scored = scoreEmployees(rawRecords);
      setEmployees(scored);
      setFilters(INITIAL_FILTERS);
      setActiveSheet(sheetInfo);
      setErrorMessage(null);
      setSourceMeta({
        sourceType: 'google-sheet',
        sourceLabel,
        syncedAt: new Date(),
        totalRows: scored.length,
      });
    },
    [],
  );

  const syncSheet = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        if (accessToken) {
          const apiRes = await fetchSheetEmployeesViaApi(
            accessToken,
            activeSheet.spreadsheetId,
            activeSheet.gid,
            activeSheet.tabTitle,
          );
          const scored = scoreEmployees(apiRes.records);
          setEmployees(scored);
          setSourceMeta({
            sourceType: 'google-sheet',
            sourceLabel: `Google Sheets API (${apiRes.spreadsheetTitle} · ${apiRes.tabTitle})`,
            syncedAt: new Date(),
            totalRows: scored.length,
          });
          return;
        }

        const rawRecords = await fetchGoogleSheetCsv(signal);
        const scored = scoreEmployees(rawRecords);
        setEmployees(scored);
        setSourceMeta({
          sourceType: 'google-sheet',
          sourceLabel: 'Google Sheets (Shell UK Dataset)',
          syncedAt: new Date(),
          totalRows: scored.length,
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        const msg =
          err instanceof Error
            ? err.message
            : 'Unexpected error while reading the Google Sheet.';
        if (msg.toLowerCase().includes('token expired')) {
          clearAccessToken();
          setAccessToken(null);
        }
        setErrorMessage(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [accessToken, activeSheet],
  );

  useEffect(() => {
    const controller = new AbortController();
    void syncSheet(controller.signal);
    return () => controller.abort();
  }, [syncSheet]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleCsvFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const text = await file.text();
      const rawRecords = parseEmployeeCsv(text);
      const scored = scoreEmployees(rawRecords);
      setEmployees(scored);
      setFilters(INITIAL_FILTERS);
      setSourceMeta({
        sourceType: 'csv-upload',
        sourceLabel: `Uploaded CSV (${file.name})`,
        syncedAt: new Date(),
        totalRows: scored.length,
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : `Could not parse "${file.name}". Please ensure it is a valid Shell UK employee CSV.`;
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const filterOptions = useMemo(() => {
    const uniqueSorted = (getter: (e: ScoredEmployee) => string) =>
      Array.from(new Set(employees.map(getter)))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

    return {
      departments: uniqueSorted((e) => e.department),
      locations: uniqueSorted((e) => e.location),
      employmentTypes: uniqueSorted((e) => e.employmentType),
      genders: uniqueSorted((e) => e.gender),
    };
  }, [employees]);

  const handleFilterChange = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleResetFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
  }, []);

  const filteredEmployees = useMemo(
    () => filterEmployees(employees, filters),
    [employees, filters],
  );

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#111113] transition-colors dark:bg-[#0B0B0D] dark:text-[#F8F8FA]">
      <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#141417]">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 shrink-0">
            <ShellPectenMark />
            <h1 className="text-lg font-bold tracking-tight text-neutral-950 dark:text-white whitespace-nowrap">
              Shell People Analytics
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => void syncSheet()}
              disabled={isLoading}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[#FFC800] px-4 py-2 text-xs font-semibold text-[#111113] transition-colors hover:bg-[#F5B800] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F58220] whitespace-nowrap shrink-0"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>{isLoading ? 'Syncing...' : 'Sync Sheet'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsWorkspaceOpen(true)}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-900 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC800] dark:border-neutral-700 dark:bg-[#1C1C21] dark:text-neutral-100 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-[#F58220]" aria-hidden="true" />
              <span>{accessToken ? 'Drive & Export' : 'Google Sheets'}</span>
            </button>

            {!accessToken && (
              <GoogleSignInButton
                onClick={() => void handleGoogleSignIn()}
                disabled={isSigningIn}
                label={isSigningIn ? 'Signing in...' : 'Sign in with Google'}
              />
            )}

            <button
              type="button"
              onClick={handleUploadClick}
              disabled={isLoading}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-900 transition-colors hover:bg-neutral-100 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC800] dark:border-neutral-700 dark:bg-[#1C1C21] dark:text-neutral-100 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
            >
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Upload CSV</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleCsvFileChange}
              className="hidden"
              aria-label="Upload employee CSV fallback file"
            />

            <button
              type="button"
              onClick={() => setIsDark((prev) => !prev)}
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-900 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC800] dark:border-neutral-700 dark:bg-[#1C1C21] dark:text-neutral-100 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
            >
              {isDark ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-[#FFC800]" aria-hidden="true" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-neutral-700" aria-hidden="true" />
                  <span>Dark</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        {/* Clean unboxed data provenance line */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-600 dark:text-neutral-400">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-neutral-800 dark:text-neutral-200">
              Shell UK Workforce Intelligence
            </span>
            {sourceMeta && (
              <>
                <span aria-hidden="true">·</span>
                <span>{sourceMeta.sourceLabel}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  {sourceMeta.totalRows.toLocaleString('en-GB')} employee records
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  Updated{' '}
                  {sourceMeta.syncedAt.toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Clear Error Banner */}
        {errorMessage && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-xl border border-[#F58220] bg-[#FFF7ED] p-4 text-sm text-neutral-900 sm:flex-row sm:items-center sm:justify-between dark:border-[#F58220]/70 dark:bg-[#2A180D] dark:text-neutral-100"
          >
            <div className="flex items-start gap-3">
              <AlertCircle
                className="mt-0.5 h-5 w-5 shrink-0 text-[#D9531E] dark:text-[#FF8A4C]"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold text-neutral-950 dark:text-white">
                  Could not load Google Sheet data
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
                  {errorMessage}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => void syncSheet()}
                className="min-h-[36px] rounded-lg bg-[#FFC800] px-3 py-1.5 text-xs font-semibold text-[#111113] hover:bg-[#F5B800] whitespace-nowrap"
              >
                Retry Sync
              </button>
              <button
                type="button"
                onClick={handleUploadClick}
                className="min-h-[36px] rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-900 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-[#1C1C21] dark:text-neutral-100 dark:hover:bg-neutral-800 whitespace-nowrap"
              >
                Upload CSV
              </button>
            </div>
          </div>
        )}

        {/* Loading skeleton when initial fetch is running and no rows loaded yet */}
        {isLoading && employees.length === 0 ? (
          <div className="space-y-5" aria-busy="true" aria-label="Loading workforce dataset">
            <div className="h-[110px] animate-pulse rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#141417]" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[116px] animate-pulse rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#141417]"
                />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="h-[380px] animate-pulse rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#141417]" />
              <div className="h-[380px] animate-pulse rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#141417]" />
            </div>
          </div>
        ) : employees.length > 0 ? (
          <>
            <FilterBar
              filters={filters}
              options={filterOptions}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              filteredCount={filteredEmployees.length}
              totalCount={employees.length}
            />

            {filteredEmployees.length === 0 ? (
              <section className="rounded-xl border border-neutral-200 bg-white p-10 text-center dark:border-neutral-800 dark:bg-[#141417]">
                <h2 className="text-base font-semibold text-neutral-950 dark:text-neutral-100">
                  No employees match the selected filters
                </h2>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                  Adjust one or more filters above or reset to inspect the full Shell UK workforce.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-4 min-h-[40px] rounded-lg bg-[#FFC800] px-4 py-2 text-xs font-semibold text-[#111113] hover:bg-[#F5B800]"
                >
                  Reset All Filters
                </button>
              </section>
            ) : (
              <>
                {activeTab === 'overview' && (
                  <OverviewTab employees={filteredEmployees} isDark={isDark} />
                )}
                {activeTab === 'deep-dive' && (
                  <DeepDiveTab employees={filteredEmployees} isDark={isDark} />
                )}
                {activeTab === 'insights' && (
                  <InsightsTab
                    filteredEmployees={filteredEmployees}
                    allEmployees={employees}
                  />
                )}
              </>
            )}
          </>
        ) : (
          !isLoading && (
            <section className="rounded-xl border border-neutral-200 bg-white p-10 text-center dark:border-neutral-800 dark:bg-[#141417]">
              <h2 className="text-base font-semibold text-neutral-950 dark:text-neutral-100">
                Workforce dataset unavailable
              </h2>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                Retry syncing the Google Sheet or upload a local CSV export to view the analytics dashboard.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => void syncSheet()}
                  className="min-h-[40px] rounded-lg bg-[#FFC800] px-4 py-2 text-xs font-semibold text-[#111113] hover:bg-[#F5B800]"
                >
                  Sync Sheet
                </button>
                <button
                  type="button"
                  onClick={handleUploadClick}
                  className="min-h-[40px] rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-900 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-[#1C1C21] dark:text-neutral-100 dark:hover:bg-neutral-800"
                >
                  Upload CSV
                </button>
              </div>
            </section>
          )
        )}
      </main>

      <GoogleWorkspaceModal
        isOpen={isWorkspaceOpen}
        onClose={() => setIsWorkspaceOpen(false)}
        user={googleUser}
        accessToken={accessToken}
        isSigningIn={isSigningIn}
        onSignIn={handleGoogleSignIn}
        onSignOut={handleGoogleSignOut}
        onLoadRecords={handleLoadWorkspaceRecords}
        filteredEmployees={filteredEmployees}
        currentSpreadsheetId={activeSheet.spreadsheetId}
      />
    </div>
  );
}
