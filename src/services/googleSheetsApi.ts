import type { EmployeeRecord, ScoredEmployee } from '../types/employee';
import { parseEmployeeMatrix } from '../utils/csvParser';

export const DEFAULT_SHELL_SPREADSHEET_ID = '1mn-JjjLFei3oD0ZEI5mDWKM12_zFQU8Y9kBTCEOppiE';
export const DEFAULT_SHELL_SHEET_GID = 276867269;

export interface DriveSpreadsheetItem {
  id: string;
  name: string;
  modifiedTime: string;
  webViewLink?: string;
}

export interface SheetTabMeta {
  sheetId: number;
  title: string;
  rowCount?: number;
  columnCount?: number;
}

export interface SpreadsheetMeta {
  spreadsheetId: string;
  title: string;
  spreadsheetUrl?: string;
  sheets: SheetTabMeta[];
}

export function extractSpreadsheetTarget(input: string): {
  spreadsheetId: string;
  gid?: number;
} | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch) {
    const gidMatch = trimmed.match(/[?&#]gid=(\d+)/);
    return {
      spreadsheetId: urlMatch[1],
      gid: gidMatch ? Number(gidMatch[1]) : undefined,
    };
  }

  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return { spreadsheetId: trimmed };
  }

  return null;
}

async function parseGoogleApiError(res: Response, fallback: string): Promise<Error> {
  try {
    const payload = (await res.json()) as {
      error?: { message?: string; status?: string; code?: number };
    };
    const msg = payload?.error?.message;
    if (res.status === 401) {
      return new Error('Google access token expired or missing. Please sign in with Google again.');
    }
    if (res.status === 403) {
      return new Error(
        msg
          ? `Permission denied by Google API: ${msg}`
          : 'Permission denied. Ensure your Google account has access to this spreadsheet.',
      );
    }
    if (msg) {
      return new Error(msg);
    }
  } catch {
    // Ignore non-JSON error body
  }
  return new Error(`${fallback} (HTTP ${res.status})`);
}

export async function listDriveSpreadsheets(accessToken: string): Promise<DriveSpreadsheetItem[]> {
  const q = encodeURIComponent(
    "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
  );
  const fields = encodeURIComponent('files(id,name,modifiedTime,webViewLink)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=modifiedTime%20desc&pageSize=25`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw await parseGoogleApiError(res, 'Could not list spreadsheets from Google Drive');
  }

  const data = (await res.json()) as { files?: DriveSpreadsheetItem[] };
  return data.files ?? [];
}

export async function fetchSpreadsheetMeta(
  accessToken: string,
  spreadsheetId: string,
): Promise<SpreadsheetMeta> {
  const fields = encodeURIComponent(
    'spreadsheetId,spreadsheetUrl,properties.title,sheets.properties(sheetId,title,gridProperties(rowCount,columnCount))',
  );
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=${fields}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw await parseGoogleApiError(res, 'Could not read spreadsheet metadata');
  }

  const data = (await res.json()) as {
    spreadsheetId: string;
    spreadsheetUrl?: string;
    properties?: { title?: string };
    sheets?: Array<{
      properties?: {
        sheetId?: number;
        title?: string;
        gridProperties?: { rowCount?: number; columnCount?: number };
      };
    }>;
  };

  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title ?? 'Untitled Spreadsheet',
    spreadsheetUrl: data.spreadsheetUrl,
    sheets: (data.sheets ?? []).map((s) => ({
      sheetId: s.properties?.sheetId ?? 0,
      title: s.properties?.title ?? 'Sheet1',
      rowCount: s.properties?.gridProperties?.rowCount,
      columnCount: s.properties?.gridProperties?.columnCount,
    })),
  };
}

export async function fetchSheetEmployeesViaApi(
  accessToken: string,
  spreadsheetId: string,
  preferredGid?: number,
  preferredTabTitle?: string,
): Promise<{
  records: EmployeeRecord[];
  spreadsheetTitle: string;
  tabTitle: string;
  spreadsheetId: string;
}> {
  const meta = await fetchSpreadsheetMeta(accessToken, spreadsheetId);
  if (meta.sheets.length === 0) {
    throw new Error('This Google Spreadsheet has no worksheet tabs.');
  }

  let targetTab = meta.sheets[0];
  if (preferredTabTitle) {
    const byTitle = meta.sheets.find((s) => s.title === preferredTabTitle);
    if (byTitle) targetTab = byTitle;
  } else if (preferredGid !== undefined) {
    const byGid = meta.sheets.find((s) => s.sheetId === preferredGid);
    if (byGid) targetTab = byGid;
  }

  const escapedTitle = targetTab.title.replace(/'/g, "''");
  const range = encodeURIComponent(`'${escapedTitle}'`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${range}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw await parseGoogleApiError(res, `Could not read tab "${targetTab.title}"`);
  }

  const data = (await res.json()) as { values?: string[][] };
  const values = data.values ?? [];
  const records = parseEmployeeMatrix(values);

  return {
    records,
    spreadsheetTitle: meta.title,
    tabTitle: targetTab.title,
    spreadsheetId: meta.spreadsheetId,
  };
}

export async function createWorkforceSnapshotSheet(
  accessToken: string,
  title: string,
  employees: ScoredEmployee[],
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; rowCount: number }> {
  const tabTitle = 'Shell People Snapshot';

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [{ properties: { title: tabTitle } }],
    }),
  });

  if (!createRes.ok) {
    throw await parseGoogleApiError(createRes, 'Could not create snapshot spreadsheet');
  }

  const created = (await createRes.json()) as {
    spreadsheetId: string;
    spreadsheetUrl: string;
  };

  const headerRow = [
    'EmployeeID',
    'FirstName',
    'LastName',
    'Gender',
    'Age',
    'MaritalStatus',
    'Department',
    'JobTitle',
    'JobLevel',
    'EmploymentType',
    'Location',
    'HireDate',
    'YearsAtCompany',
    'YearsInCurrentRole',
    'YearsSinceLastPromotion',
    'YearsWithCurrManager',
    'Education',
    'DistanceFromHome_km',
    'BusinessTravel',
    'MonthlyIncome_GBP',
    'Attrition',
    'FlightRiskScore',
    'FlightRiskTier',
  ];

  const dataRows = employees.map((e) => [
    e.employeeId,
    e.firstName,
    e.lastName,
    e.gender,
    String(e.age),
    e.maritalStatus,
    e.department,
    e.jobTitle,
    String(e.jobLevel),
    e.employmentType,
    e.location,
    e.hireDate,
    String(e.yearsAtCompany),
    String(e.yearsInCurrentRole),
    String(e.yearsSinceLastPromotion),
    String(e.yearsWithCurrManager),
    e.education,
    String(e.distanceFromHomeKm),
    e.businessTravel,
    String(e.monthlyIncomeGbp),
    e.attrition,
    String(e.flightRiskScore),
    e.flightRiskTier,
  ]);

  const escapedTab = tabTitle.replace(/'/g, "''");
  const range = encodeURIComponent(`'${escapedTab}'!A1`);
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(created.spreadsheetId)}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [headerRow, ...dataRows],
      }),
    },
  );

  if (!updateRes.ok) {
    throw await parseGoogleApiError(updateRes, 'Created sheet, but failed to write employee rows');
  }

  return {
    spreadsheetId: created.spreadsheetId,
    spreadsheetUrl: created.spreadsheetUrl,
    rowCount: dataRows.length,
  };
}
