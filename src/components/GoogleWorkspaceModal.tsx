import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  FolderSearch,
  LogOut,
  X,
} from 'lucide-react';
import type { EmployeeRecord, ScoredEmployee } from '../types/employee';
import {
  createWorkforceSnapshotSheet,
  DEFAULT_SHELL_SHEET_GID,
  DEFAULT_SHELL_SPREADSHEET_ID,
  type DriveSpreadsheetItem,
  extractSpreadsheetTarget,
  fetchSheetEmployeesViaApi,
  fetchSpreadsheetMeta,
  listDriveSpreadsheets,
  type SpreadsheetMeta,
} from '../services/googleSheetsApi';
import { GoogleSignInButton } from './GoogleSignInButton';

interface GoogleWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  accessToken: string | null;
  isSigningIn: boolean;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onLoadRecords: (
    records: EmployeeRecord[],
    sourceLabel: string,
    activeSheet: { spreadsheetId: string; tabTitle: string; gid?: number },
  ) => void;
  filteredEmployees: ScoredEmployee[];
  currentSpreadsheetId: string;
}

export function GoogleWorkspaceModal({
  isOpen,
  onClose,
  user,
  accessToken,
  isSigningIn,
  onSignIn,
  onSignOut,
  onLoadRecords,
  filteredEmployees,
  currentSpreadsheetId,
}: GoogleWorkspaceModalProps) {
  const [driveFiles, setDriveFiles] = useState<DriveSpreadsheetItem[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [sheetUrlInput, setSheetUrlInput] = useState('');
  const [selectedMeta, setSelectedMeta] = useState<SpreadsheetMeta | null>(null);
  const [selectedTabTitle, setSelectedTabTitle] = useState<string>('');
  const [isInspecting, setIsInspecting] = useState(false);
  const [isLoadingSheetData, setIsLoadingSheetData] = useState(false);

  const [snapshotTitle, setSnapshotTitle] = useState(
    `Shell People Snapshot - ${new Date().toISOString().slice(0, 10)}`,
  );
  const [confirmingExport, setConfirmingExport] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{
    spreadsheetUrl: string;
    rowCount: number;
    title: string;
  } | null>(null);

  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setModalError(null);
    setConfirmingExport(false);
    setExportResult(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !accessToken) return;
    let cancelled = false;

    const loadFiles = async () => {
      setIsLoadingDrive(true);
      setModalError(null);
      try {
        const files = await listDriveSpreadsheets(accessToken);
        if (!cancelled) setDriveFiles(files);
      } catch (err) {
        if (!cancelled) {
          setModalError(err instanceof Error ? err.message : 'Unable to list Google Drive spreadsheets.');
        }
      } finally {
        if (!cancelled) setIsLoadingDrive(false);
      }
    };

    void loadFiles();
    return () => {
      cancelled = true;
    };
  }, [isOpen, accessToken]);

  if (!isOpen) return null;

  const inspectSpreadsheet = async (spreadsheetId: string, preferredGid?: number) => {
    if (!accessToken) return;
    setIsInspecting(true);
    setModalError(null);
    try {
      const meta = await fetchSpreadsheetMeta(accessToken, spreadsheetId);
      setSelectedMeta(meta);
      const matchingTab =
        preferredGid !== undefined
          ? meta.sheets.find((s) => s.sheetId === preferredGid)
          : undefined;
      setSelectedTabTitle(matchingTab?.title ?? meta.sheets[0]?.title ?? '');
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to inspect spreadsheet tabs.');
    } finally {
      setIsInspecting(false);
    }
  };

  const handleInspectUrl = async () => {
    const parsed = extractSpreadsheetTarget(sheetUrlInput);
    if (!parsed) {
      setModalError('Enter a valid Google Sheets URL or spreadsheet ID.');
      return;
    }
    await inspectSpreadsheet(parsed.spreadsheetId, parsed.gid);
  };

  const handleLoadSelectedTab = async () => {
    if (!accessToken || !selectedMeta || !selectedTabTitle) return;
    setIsLoadingSheetData(true);
    setModalError(null);
    try {
      const result = await fetchSheetEmployeesViaApi(
        accessToken,
        selectedMeta.spreadsheetId,
        undefined,
        selectedTabTitle,
      );
      onLoadRecords(
        result.records,
        `Google Sheets API (${result.spreadsheetTitle} · ${result.tabTitle})`,
        {
          spreadsheetId: result.spreadsheetId,
          tabTitle: result.tabTitle,
        },
      );
      onClose();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to load worksheet data.');
    } finally {
      setIsLoadingSheetData(false);
    }
  };

  const handleLoadDefaultShellSheet = async () => {
    if (!accessToken) return;
    setIsLoadingSheetData(true);
    setModalError(null);
    try {
      const result = await fetchSheetEmployeesViaApi(
        accessToken,
        DEFAULT_SHELL_SPREADSHEET_ID,
        DEFAULT_SHELL_SHEET_GID,
      );
      onLoadRecords(
        result.records,
        `Google Sheets API (${result.spreadsheetTitle} · ${result.tabTitle})`,
        {
          spreadsheetId: result.spreadsheetId,
          tabTitle: result.tabTitle,
          gid: DEFAULT_SHELL_SHEET_GID,
        },
      );
      onClose();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to read default Shell UK sheet.');
    } finally {
      setIsLoadingSheetData(false);
    }
  };

  const handleConfirmExport = async () => {
    if (!accessToken) return;
    const cleanTitle = snapshotTitle.trim() || 'Shell People Snapshot';
    setIsExporting(true);
    setModalError(null);
    try {
      const res = await createWorkforceSnapshotSheet(accessToken, cleanTitle, filteredEmployees);
      setExportResult({
        spreadsheetUrl: res.spreadsheetUrl,
        rowCount: res.rowCount,
        title: cleanTitle,
      });
      setConfirmingExport(false);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Could not export snapshot to Google Sheets.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="workspace-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-neutral-200 bg-white text-neutral-950 shadow-xl dark:border-neutral-800 dark:bg-[#141417] dark:text-neutral-100">
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="h-5 w-5 text-[#F58220]" aria-hidden="true" />
            <h2 id="workspace-modal-title" className="text-base font-bold tracking-tight">
              Google Sheets Workspace
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Google Sheets dialog"
            className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {modalError && (
            <div
              role="alert"
              className="rounded-lg border border-[#F58220] bg-[#FFF7ED] px-4 py-3 text-xs leading-relaxed text-neutral-900 dark:border-[#F58220]/70 dark:bg-[#2A180D] dark:text-neutral-100"
            >
              {modalError}
            </div>
          )}

          {!accessToken ? (
            <div className="space-y-4 rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-center dark:border-neutral-800 dark:bg-[#1A1A1E]">
              <h3 className="text-sm font-semibold">
                Connect Google Workspace to browse, sync, and export Sheets
              </h3>
              <p className="mx-auto max-w-md text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                Sign in with your Google account to read private Shell spreadsheets directly through the Google Sheets API, switch tabs from Drive, or export filtered snapshots.
              </p>
              <div className="flex justify-center pt-1">
                <GoogleSignInButton
                  onClick={() => void onSignIn()}
                  disabled={isSigningIn}
                  label={isSigningIn ? 'Signing in...' : 'Sign in with Google'}
                />
              </div>
            </div>
          ) : (
            <>
              {/* Account header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-4 dark:border-neutral-800">
                <div className="text-xs">
                  <div className="font-semibold text-neutral-950 dark:text-white">
                    {user?.displayName || 'Google Workspace Connected'}
                  </div>
                  <div className="text-neutral-600 dark:text-neutral-400">
                    {user?.email}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleLoadDefaultShellSheet()}
                    disabled={isLoadingSheetData}
                    className="min-h-[36px] rounded-lg bg-[#FFC800] px-3 py-1.5 text-xs font-semibold text-[#111113] transition-colors hover:bg-[#F5B800] disabled:opacity-60 whitespace-nowrap"
                  >
                    Sync Shell UK Sheet via API
                  </button>
                  <button
                    type="button"
                    onClick={() => void onSignOut()}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 whitespace-nowrap"
                  >
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                    Sign out
                  </button>
                </div>
              </div>

              {/* Open by URL or ID */}
              <div className="space-y-2.5">
                <label
                  htmlFor="sheet-url-input"
                  className="block text-xs font-semibold text-neutral-900 dark:text-neutral-100"
                >
                  Open Any Google Sheet by URL or Spreadsheet ID
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    id="sheet-url-input"
                    type="text"
                    value={sheetUrlInput}
                    onChange={(e) => setSheetUrlInput(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="min-h-[40px] flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#111113] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC800] dark:border-neutral-700 dark:bg-[#1C1C21] dark:text-neutral-100"
                  />
                  <button
                    type="button"
                    onClick={() => void handleInspectUrl()}
                    disabled={isInspecting || !sheetUrlInput.trim()}
                    className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-900 transition-colors hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:bg-[#1C1C21] dark:text-neutral-100 dark:hover:bg-neutral-800 whitespace-nowrap"
                  >
                    <FolderSearch className="h-3.5 w-3.5" aria-hidden="true" />
                    {isInspecting ? 'Inspecting...' : 'Inspect Tabs'}
                  </button>
                </div>
              </div>

              {/* Selected spreadsheet tab picker */}
              {selectedMeta && (
                <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-[#1A1A1E]">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-neutral-950 dark:text-white">
                        {selectedMeta.title}
                      </div>
                      <div className="font-mono-tabular text-[11px] text-neutral-500 dark:text-neutral-400">
                        {selectedMeta.spreadsheetId}
                      </div>
                    </div>
                    <span className="text-xs text-neutral-600 dark:text-neutral-400">
                      {selectedMeta.sheets.length} tab{selectedMeta.sheets.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <select
                      aria-label="Select worksheet tab"
                      value={selectedTabTitle}
                      onChange={(e) => setSelectedTabTitle(e.target.value)}
                      className="min-h-[40px] flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-[#141417] dark:text-neutral-100"
                    >
                      {selectedMeta.sheets.map((tab) => (
                        <option key={tab.sheetId} value={tab.title}>
                          {tab.title} (gid {tab.sheetId})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void handleLoadSelectedTab()}
                      disabled={isLoadingSheetData || !selectedTabTitle}
                      className="min-h-[40px] rounded-lg bg-[#FFC800] px-4 py-2 text-xs font-semibold text-[#111113] transition-colors hover:bg-[#F5B800] disabled:opacity-60 whitespace-nowrap"
                    >
                      {isLoadingSheetData ? 'Loading...' : 'Load Worksheet'}
                    </button>
                  </div>
                </div>
              )}

              {/* Drive spreadsheets browser */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                    Recent Google Spreadsheets in Drive
                  </h3>
                  {isLoadingDrive && (
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      Loading Drive...
                    </span>
                  )}
                </div>

                {!isLoadingDrive && driveFiles.length === 0 ? (
                  <p className="rounded-lg border border-neutral-200 px-4 py-3 text-xs text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
                    No spreadsheets found in your Google Drive, or paste a shared sheet URL above.
                  </p>
                ) : (
                  <div className="max-h-48 divide-y divide-neutral-200 overflow-y-auto rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                    {driveFiles.map((file) => {
                      const isCurrent = file.id === currentSpreadsheetId;
                      return (
                        <div
                          key={file.id}
                          className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs hover:bg-neutral-50 dark:hover:bg-[#1A1A1E]"
                        >
                          <div className="min-w-0">
                            <div className="truncate font-medium text-neutral-950 dark:text-neutral-100">
                              {file.name}
                              {isCurrent ? ' (Active)' : ''}
                            </div>
                            <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                              Modified {new Date(file.modifiedTime).toLocaleDateString('en-GB')}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => void inspectSpreadsheet(file.id)}
                            disabled={isInspecting}
                            className="min-h-[32px] rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-800 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
                          >
                            Select Tab
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Export filtered view to a new Google Sheet (with mandatory explicit confirmation) */}
              <div className="space-y-3 border-t border-neutral-200 pt-5 dark:border-neutral-800">
                <div>
                  <h3 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                    Export Filtered Workforce Snapshot to Google Sheets
                  </h3>
                  <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">
                    Creates a new spreadsheet in your Google Drive containing the {filteredEmployees.length.toLocaleString('en-GB')} currently filtered employee records and flight-risk scores.
                  </p>
                </div>

                {exportResult && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-600/30 bg-emerald-50 px-4 py-3 text-xs text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                      <span>
                        Created "{exportResult.title}" with {exportResult.rowCount} rows.
                      </span>
                    </div>
                    <a
                      href={exportResult.spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold underline"
                    >
                      Open Sheet
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  </div>
                )}

                {!confirmingExport ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      aria-label="New Google Sheet snapshot title"
                      value={snapshotTitle}
                      onChange={(e) => setSnapshotTitle(e.target.value)}
                      className="min-h-[40px] flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-[#111113] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC800] dark:border-neutral-700 dark:bg-[#1C1C21] dark:text-neutral-100"
                    />
                    <button
                      type="button"
                      disabled={filteredEmployees.length === 0}
                      onClick={() => setConfirmingExport(true)}
                      className="min-h-[40px] rounded-lg bg-[#111113] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-[#111113] dark:hover:bg-neutral-200 whitespace-nowrap"
                    >
                      Create Snapshot Sheet
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 rounded-xl border border-[#F58220] bg-[#FFF7ED] p-4 dark:border-[#F58220]/70 dark:bg-[#2A180D]">
                    <p className="text-xs font-semibold text-neutral-950 dark:text-white">
                      Confirm Google Drive write action
                    </p>
                    <p className="text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
                      This will create a new Google Spreadsheet named "{snapshotTitle.trim() || 'Shell People Snapshot'}" in your Google Drive and write {filteredEmployees.length.toLocaleString('en-GB')} employee rows (including calculated FlightRiskScore and FlightRiskTier).
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={isExporting}
                        onClick={() => void handleConfirmExport()}
                        className="min-h-[36px] rounded-lg bg-[#FFC800] px-3.5 py-1.5 text-xs font-semibold text-[#111113] hover:bg-[#F5B800] disabled:opacity-60"
                      >
                        {isExporting ? 'Creating Sheet...' : 'Confirm & Create Sheet'}
                      </button>
                      <button
                        type="button"
                        disabled={isExporting}
                        onClick={() => setConfirmingExport(false)}
                        className="min-h-[36px] rounded-lg border border-neutral-300 bg-white px-3.5 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-[#1C1C21] dark:text-neutral-200 dark:hover:bg-neutral-800"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
