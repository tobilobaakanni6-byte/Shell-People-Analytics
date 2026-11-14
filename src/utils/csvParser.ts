import type { AttritionStatus, EmployeeRecord } from '../types/employee';

export const SHELL_SHEET_GVIZ_URL =
  'https://docs.google.com/spreadsheets/d/1mn-JjjLFei3oD0ZEI5mDWKM12_zFQU8Y9kBTCEOppiE/gviz/tq?tqx=out:csv&gid=276867269';

const REQUIRED_COLUMNS = [
  'EmployeeID',
  'FirstName',
  'LastName',
  'Gender',
  'Age',
  'Department',
  'JobTitle',
  'JobLevel',
  'EmploymentType',
  'Location',
  'HireDate',
  'YearsAtCompany',
  'YearsSinceLastPromotion',
  'Education',
  'BusinessTravel',
  'MonthlyIncome_GBP',
  'Attrition',
] as const;

export function parseCsvMatrix(rawText: string): string[][] {
  const text = rawText.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field.trim());
      field = '';
    } else if (char === '\r' || char === '\n') {
      if (char === '\r' && next === '\n') {
        i += 1;
      }
      row.push(field.trim());
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    if (row.some((cell) => cell.length > 0)) {
      rows.push(row);
    }
  }

  return rows;
}

function toNumber(raw: string | undefined, fallback = 0): number {
  if (!raw) return fallback;
  const cleaned = raw.replace(/[£$€,\s]/g, '');
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeAttrition(raw: string | undefined): AttritionStatus {
  const val = (raw ?? '').trim().toLowerCase();
  if (val === 'yes' || val === 'true' || val === '1' || val === 'left') {
    return 'Yes';
  }
  return 'No';
}

function extractHireYear(hireDate: string): number | null {
  const isoMatch = hireDate.match(/^(\d{4})[-/]/);
  if (isoMatch) {
    return Number(isoMatch[1]);
  }
  const tailMatch = hireDate.match(/(\d{4})$/);
  if (tailMatch) {
    return Number(tailMatch[1]);
  }
  return null;
}

export function parseEmployeeMatrix(matrix: string[][]): EmployeeRecord[] {
  if (matrix.length < 2) {
    throw new Error('No employee data rows were found after the header row.');
  }

  const headers = matrix[0].map((h) => String(h ?? '').trim());
  const headerIndex = new Map<string, number>();
  headers.forEach((h, idx) => {
    headerIndex.set(h.toLowerCase(), idx);
  });

  const missing = REQUIRED_COLUMNS.filter((col) => !headerIndex.has(col.toLowerCase()));
  if (missing.length > 0) {
    throw new Error(
      `Schema mismatch — missing required column(s): ${missing.join(', ')}. Please verify the worksheet headers or upload a compatible CSV.`,
    );
  }

  const getCell = (row: string[], colName: string): string => {
    const idx = headerIndex.get(colName.toLowerCase());
    if (idx === undefined) return '';
    return String(row[idx] ?? '').trim();
  };

  const records: EmployeeRecord[] = [];
  for (let i = 1; i < matrix.length; i += 1) {
    const row = matrix[i];
    if (!row || row.every((cell) => String(cell ?? '').trim().length === 0)) {
      continue;
    }

    const employeeId = getCell(row, 'EmployeeID');
    const firstName = getCell(row, 'FirstName');
    const lastName = getCell(row, 'LastName');

    if (!employeeId && !firstName && !lastName) {
      continue;
    }

    const hireDate = getCell(row, 'HireDate');
    records.push({
      employeeId: employeeId || `ROW-${i}`,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim() || employeeId,
      gender: getCell(row, 'Gender') || 'Unknown',
      age: toNumber(getCell(row, 'Age')),
      maritalStatus: getCell(row, 'MaritalStatus') || 'Unknown',
      department: getCell(row, 'Department') || 'Unassigned',
      jobTitle: getCell(row, 'JobTitle') || 'Unknown',
      jobLevel: Math.max(1, Math.round(toNumber(getCell(row, 'JobLevel'), 1))),
      employmentType: getCell(row, 'EmploymentType') || 'Full-Time',
      location: getCell(row, 'Location') || 'Unknown',
      hireDate,
      hireYear: extractHireYear(hireDate),
      yearsAtCompany: toNumber(getCell(row, 'YearsAtCompany')),
      yearsInCurrentRole: toNumber(getCell(row, 'YearsInCurrentRole')),
      yearsSinceLastPromotion: toNumber(getCell(row, 'YearsSinceLastPromotion')),
      yearsWithCurrManager: toNumber(getCell(row, 'YearsWithCurrManager')),
      education: getCell(row, 'Education') || 'Unknown',
      distanceFromHomeKm: toNumber(getCell(row, 'DistanceFromHome_km')),
      businessTravel: getCell(row, 'BusinessTravel') || 'Non-Travel',
      monthlyIncomeGbp: toNumber(getCell(row, 'MonthlyIncome_GBP')),
      attrition: normalizeAttrition(getCell(row, 'Attrition')),
    });
  }

  if (records.length === 0) {
    throw new Error('The worksheet contained headers but zero valid employee rows.');
  }

  return records;
}

export function parseEmployeeCsv(rawCsv: string): EmployeeRecord[] {
  const trimmed = rawCsv.trim();
  if (!trimmed) {
    throw new Error('The CSV response is empty. Check that the worksheet contains employee rows or upload a CSV file.');
  }

  if (/^<!doctype html|<html/i.test(trimmed)) {
    throw new Error(
      'Google Sheets returned a web page instead of CSV data. Sign in with Google to read private sheets via the Sheets API, or use Upload CSV.',
    );
  }

  const matrix = parseCsvMatrix(trimmed);
  return parseEmployeeMatrix(matrix);
}

export async function fetchGoogleSheetCsv(signal?: AbortSignal): Promise<EmployeeRecord[]> {
  let response: Response;
  try {
    response = await fetch(SHELL_SHEET_GVIZ_URL, {
      method: 'GET',
      cache: 'no-store',
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    throw new Error(
      'Unable to reach Google Sheets (network or CORS restriction). Check your internet connection or use Upload CSV as a fallback.',
    );
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `Google Sheets denied access (HTTP ${response.status}). Ensure the spreadsheet is shared publicly ("Anyone with the link"), or use Upload CSV.`,
      );
    }
    if (response.status === 404) {
      throw new Error(
        'Google Sheet or worksheet gid=276867269 was not found (HTTP 404). Verify the sheet URL or use Upload CSV.',
      );
    }
    throw new Error(
      `Failed to read Google Sheet (HTTP ${response.status} ${response.statusText}). Try syncing again or upload a local CSV export.`,
    );
  }

  const text = await response.text();
  return parseEmployeeCsv(text);
}
