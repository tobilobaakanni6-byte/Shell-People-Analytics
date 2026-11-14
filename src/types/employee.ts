export type AttritionStatus = 'Yes' | 'No';

export interface EmployeeRecord {
  employeeId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  gender: string;
  age: number;
  maritalStatus: string;
  department: string;
  jobTitle: string;
  jobLevel: number;
  employmentType: string;
  location: string;
  hireDate: string;
  hireYear: number | null;
  yearsAtCompany: number;
  yearsInCurrentRole: number;
  yearsSinceLastPromotion: number;
  yearsWithCurrManager: number;
  education: string;
  distanceFromHomeKm: number;
  businessTravel: string;
  monthlyIncomeGbp: number;
  attrition: AttritionStatus;
}

export interface RiskFactor {
  label: string;
  points: number;
}

export type RiskTier = 'High' | 'Elevated' | 'Low';

export interface ScoredEmployee extends EmployeeRecord {
  flightRiskScore: number;
  flightRiskTier: RiskTier;
  riskFactors: RiskFactor[];
}

export interface FilterState {
  department: string;
  location: string;
  employmentType: string;
  gender: string;
  attrition: string;
}

export type DashboardTab = 'overview' | 'deep-dive' | 'insights';

export interface DataSourceMeta {
  sourceType: 'google-sheet' | 'csv-upload';
  sourceLabel: string;
  syncedAt: Date;
  totalRows: number;
}

export interface OverviewMetrics {
  headcount: number;
  activeEmployees: number;
  attritionCount: number;
  attritionRate: number;
  averageIncome: number;
  monthlyPayroll: number;
  departmentBreakdown: Array<{
    label: string;
    active: number;
    attrition: number;
    total: number;
    attritionRate: number;
  }>;
  locationBreakdown: Array<{
    label: string;
    active: number;
    attrition: number;
    total: number;
    attritionRate: number;
  }>;
  genderBreakdown: Array<{
    label: string;
    count: number;
    share: number;
    attritionRate: number;
  }>;
  employmentTypeBreakdown: Array<{
    label: string;
    count: number;
    share: number;
    attritionRate: number;
  }>;
  hiringTrend: Array<{
    year: string;
    hires: number;
    stillActive: number;
    attrited: number;
  }>;
}

export interface DeepDiveMetrics {
  averageTenure: number;
  femaleShare: number;
  nonFullTimeShare: number;
  avgYearsSincePromotion: number;
  highFlightRiskCount: number;
  ageBands: Array<{
    band: string;
    total: number;
    attrition: number;
    attritionRate: number;
  }>;
  tenureBands: Array<{
    band: string;
    total: number;
    attrition: number;
    attritionRate: number;
  }>;
  incomeByLevel: Array<{
    level: string;
    avgIncome: number;
    count: number;
  }>;
  incomeByDepartment: Array<{
    department: string;
    avgIncome: number;
    count: number;
  }>;
  educationBreakdown: Array<{
    label: string;
    total: number;
    attritionRate: number;
  }>;
  travelBreakdown: Array<{
    label: string;
    rawLabel: string;
    total: number;
    attritionRate: number;
  }>;
  scatterPoints: Array<{
    x: number;
    y: number;
    name: string;
    id: string;
    department: string;
    level: number;
    attrition: AttritionStatus;
  }>;
}

export interface InsightItem {
  id: string;
  category: string;
  severity: 'critical' | 'warning' | 'positive' | 'neutral';
  headline: string;
  detail: string;
  metric: string;
}

export interface ActionRecommendation {
  id: string;
  priority: 'Immediate' | 'Near-Term' | 'Sustained';
  targetGroup: string;
  title: string;
  rationale: string;
  actionStep: string;
}
