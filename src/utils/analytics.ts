import type {
  ActionRecommendation,
  DeepDiveMetrics,
  EmployeeRecord,
  FilterState,
  InsightItem,
  OverviewMetrics,
  RiskFactor,
  RiskTier,
  ScoredEmployee,
} from '../types/employee';

export const HIGH_RISK_THRESHOLD = 50;
export const ELEVATED_RISK_THRESHOLD = 30;

export const FLIGHT_RISK_RUBRIC = [
  {
    criterion: 'Non-Full-Time Status',
    rule: 'Part-Time (+25 pts) · Contract (+20 pts) · Full-Time (0 pts)',
    maxPoints: 25,
  },
  {
    criterion: 'Promotion Stagnation',
    rule: '≥ 6 yrs since promotion (+20) · 3–5 yrs (+12) · 1–2 yrs (+5)',
    maxPoints: 20,
  },
  {
    criterion: 'Pay & Grade Exposure',
    rule: 'Job Level 1 (+12 pts) + Monthly Income < £3,200 (+8 pts)',
    maxPoints: 20,
  },
  {
    criterion: 'Travel & Commute Load',
    rule: 'Frequent Travel (+10 pts) + Commute ≥ 25 km (+10) or 15–24 km (+5)',
    maxPoints: 20,
  },
  {
    criterion: 'Early-Tenure Vulnerability',
    rule: '≤ 2 yrs at Shell (+15 pts) · 3–5 yrs (+8 pts) · > 5 yrs (0 pts)',
    maxPoints: 15,
  },
] as const;

export function calculateFlightRisk(emp: EmployeeRecord): {
  score: number;
  tier: RiskTier;
  factors: RiskFactor[];
} {
  const factors: RiskFactor[] = [];

  if (emp.employmentType === 'Part-Time') {
    factors.push({ label: 'Part-Time contract', points: 25 });
  } else if (emp.employmentType === 'Contract') {
    factors.push({ label: 'Fixed-term contract', points: 20 });
  }

  if (emp.yearsSinceLastPromotion >= 6) {
    factors.push({ label: `${emp.yearsSinceLastPromotion} yrs since promotion`, points: 20 });
  } else if (emp.yearsSinceLastPromotion >= 3) {
    factors.push({ label: `${emp.yearsSinceLastPromotion} yrs since promotion`, points: 12 });
  } else if (emp.yearsSinceLastPromotion >= 1) {
    factors.push({ label: `${emp.yearsSinceLastPromotion} yr since promotion`, points: 5 });
  }

  if (emp.jobLevel === 1) {
    factors.push({ label: 'Entry Grade (Level 1)', points: 12 });
  }
  if (emp.monthlyIncomeGbp < 3200) {
    factors.push({ label: `Lower pay band (£${emp.monthlyIncomeGbp.toLocaleString('en-GB')})`, points: 8 });
  }

  if (emp.yearsAtCompany <= 2) {
    factors.push({ label: `Early tenure (${emp.yearsAtCompany} yrs)`, points: 15 });
  } else if (emp.yearsAtCompany <= 5) {
    factors.push({ label: `Mid-early tenure (${emp.yearsAtCompany} yrs)`, points: 8 });
  }

  if (emp.businessTravel === 'Travel_Frequently') {
    factors.push({ label: 'Frequent travel', points: 10 });
  }
  if (emp.distanceFromHomeKm >= 25) {
    factors.push({ label: `Long commute (${emp.distanceFromHomeKm} km)`, points: 10 });
  } else if (emp.distanceFromHomeKm >= 15) {
    factors.push({ label: `Moderate commute (${emp.distanceFromHomeKm} km)`, points: 5 });
  }

  const score = Math.min(
    100,
    factors.reduce((sum, item) => sum + item.points, 0),
  );

  const tier: RiskTier =
    score >= HIGH_RISK_THRESHOLD ? 'High' : score >= ELEVATED_RISK_THRESHOLD ? 'Elevated' : 'Low';

  return { score, tier, factors };
}

export function scoreEmployees(employees: EmployeeRecord[]): ScoredEmployee[] {
  return employees.map((emp) => {
    const risk = calculateFlightRisk(emp);
    return {
      ...emp,
      flightRiskScore: risk.score,
      flightRiskTier: risk.tier,
      riskFactors: risk.factors,
    };
  });
}

export function filterEmployees(employees: ScoredEmployee[], filters: FilterState): ScoredEmployee[] {
  return employees.filter((emp) => {
    if (filters.department !== 'All' && emp.department !== filters.department) return false;
    if (filters.location !== 'All' && emp.location !== filters.location) return false;
    if (filters.employmentType !== 'All' && emp.employmentType !== filters.employmentType) return false;
    if (filters.gender !== 'All' && emp.gender !== filters.gender) return false;
    if (filters.attrition !== 'All' && emp.attrition !== filters.attrition) return false;
    return true;
  });
}

export function formatTravelLabel(raw: string): string {
  if (raw === 'Travel_Frequently') return 'Frequent Travel';
  if (raw === 'Travel_Rarely') return 'Rare Travel';
  if (raw === 'Non-Travel') return 'Non-Travel';
  return raw.replace(/_/g, ' ');
}

export function computeOverviewMetrics(employees: ScoredEmployee[]): OverviewMetrics {
  const headcount = employees.length;
  const attritionCount = employees.filter((e) => e.attrition === 'Yes').length;
  const activeEmployees = headcount - attritionCount;
  const attritionRate = headcount > 0 ? (attritionCount / headcount) * 100 : 0;
  const monthlyPayroll = employees.reduce((sum, e) => sum + e.monthlyIncomeGbp, 0);
  const averageIncome = headcount > 0 ? monthlyPayroll / headcount : 0;

  const groupBy = (getter: (e: ScoredEmployee) => string) => {
    const map = new Map<string, { active: number; attrition: number }>();
    for (const emp of employees) {
      const key = getter(emp);
      const bucket = map.get(key) ?? { active: 0, attrition: 0 };
      if (emp.attrition === 'Yes') bucket.attrition += 1;
      else bucket.active += 1;
      map.set(key, bucket);
    }
    return Array.from(map.entries())
      .map(([label, counts]) => {
        const total = counts.active + counts.attrition;
        return {
          label,
          active: counts.active,
          attrition: counts.attrition,
          total,
          attritionRate: total > 0 ? (counts.attrition / total) * 100 : 0,
        };
      })
      .sort((a, b) => b.total - a.total);
  };

  const departmentBreakdown = groupBy((e) => e.department);
  const locationBreakdown = groupBy((e) => e.location);

  const genderBreakdown = groupBy((e) => e.gender).map((item) => ({
    label: item.label,
    count: item.total,
    share: headcount > 0 ? (item.total / headcount) * 100 : 0,
    attritionRate: item.attritionRate,
  }));

  const employmentTypeBreakdown = groupBy((e) => e.employmentType).map((item) => ({
    label: item.label,
    count: item.total,
    share: headcount > 0 ? (item.total / headcount) * 100 : 0,
    attritionRate: item.attritionRate,
  }));

  const yearMap = new Map<number, { stillActive: number; attrited: number }>();
  for (const emp of employees) {
    if (emp.hireYear === null) continue;
    const entry = yearMap.get(emp.hireYear) ?? { stillActive: 0, attrited: 0 };
    if (emp.attrition === 'Yes') entry.attrited += 1;
    else entry.stillActive += 1;
    yearMap.set(emp.hireYear, entry);
  }

  const hiringTrend = Array.from(yearMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, counts]) => ({
      year: String(year),
      hires: counts.stillActive + counts.attrited,
      stillActive: counts.stillActive,
      attrited: counts.attrited,
    }));

  return {
    headcount,
    activeEmployees,
    attritionCount,
    attritionRate,
    averageIncome,
    monthlyPayroll,
    departmentBreakdown,
    locationBreakdown,
    genderBreakdown,
    employmentTypeBreakdown,
    hiringTrend,
  };
}

export function computeDeepDiveMetrics(employees: ScoredEmployee[]): DeepDiveMetrics {
  const count = employees.length;
  const averageTenure =
    count > 0 ? employees.reduce((sum, e) => sum + e.yearsAtCompany, 0) / count : 0;
  const femaleCount = employees.filter((e) => e.gender.toLowerCase() === 'female').length;
  const femaleShare = count > 0 ? (femaleCount / count) * 100 : 0;
  const nonFullTimeCount = employees.filter((e) => e.employmentType !== 'Full-Time').length;
  const nonFullTimeShare = count > 0 ? (nonFullTimeCount / count) * 100 : 0;
  const avgYearsSincePromotion =
    count > 0 ? employees.reduce((sum, e) => sum + e.yearsSinceLastPromotion, 0) / count : 0;
  const highFlightRiskCount = employees.filter(
    (e) => e.attrition === 'No' && e.flightRiskScore >= HIGH_RISK_THRESHOLD,
  ).length;

  const ageBandDefs = [
    { band: '21–29', min: 0, max: 29 },
    { band: '30–39', min: 30, max: 39 },
    { band: '40–49', min: 40, max: 49 },
    { band: '50+', min: 50, max: 120 },
  ];
  const ageBands = ageBandDefs.map((def) => {
    const subset = employees.filter((e) => e.age >= def.min && e.age <= def.max);
    const attrition = subset.filter((e) => e.attrition === 'Yes').length;
    return {
      band: def.band,
      total: subset.length,
      attrition,
      attritionRate: subset.length > 0 ? (attrition / subset.length) * 100 : 0,
    };
  });

  const tenureBandDefs = [
    { band: '0–2 yrs', min: 0, max: 2 },
    { band: '3–5 yrs', min: 3, max: 5 },
    { band: '6–10 yrs', min: 6, max: 10 },
    { band: '11–19 yrs', min: 11, max: 19 },
    { band: '20+ yrs', min: 20, max: 99 },
  ];
  const tenureBands = tenureBandDefs.map((def) => {
    const subset = employees.filter(
      (e) => e.yearsAtCompany >= def.min && e.yearsAtCompany <= def.max,
    );
    const attrition = subset.filter((e) => e.attrition === 'Yes').length;
    return {
      band: def.band,
      total: subset.length,
      attrition,
      attritionRate: subset.length > 0 ? (attrition / subset.length) * 100 : 0,
    };
  });

  const levelMap = new Map<number, { sum: number; count: number }>();
  for (const emp of employees) {
    const cur = levelMap.get(emp.jobLevel) ?? { sum: 0, count: 0 };
    cur.sum += emp.monthlyIncomeGbp;
    cur.count += 1;
    levelMap.set(emp.jobLevel, cur);
  }
  const incomeByLevel = Array.from(levelMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([level, v]) => ({
      level: `Level ${level}`,
      avgIncome: v.count > 0 ? Math.round(v.sum / v.count) : 0,
      count: v.count,
    }));

  const deptIncomeMap = new Map<string, { sum: number; count: number }>();
  for (const emp of employees) {
    const cur = deptIncomeMap.get(emp.department) ?? { sum: 0, count: 0 };
    cur.sum += emp.monthlyIncomeGbp;
    cur.count += 1;
    deptIncomeMap.set(emp.department, cur);
  }
  const incomeByDepartment = Array.from(deptIncomeMap.entries())
    .map(([department, v]) => ({
      department,
      avgIncome: v.count > 0 ? Math.round(v.sum / v.count) : 0,
      count: v.count,
    }))
    .sort((a, b) => b.avgIncome - a.avgIncome);

  const eduOrder = ['Below College', 'College', "Bachelor's", "Master's", 'Doctorate'];
  const eduMap = new Map<string, { total: number; attrition: number }>();
  for (const emp of employees) {
    const cur = eduMap.get(emp.education) ?? { total: 0, attrition: 0 };
    cur.total += 1;
    if (emp.attrition === 'Yes') cur.attrition += 1;
    eduMap.set(emp.education, cur);
  }
  const educationBreakdown = Array.from(eduMap.entries())
    .sort((a, b) => {
      const ia = eduOrder.indexOf(a[0]);
      const ib = eduOrder.indexOf(b[0]);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return b[1].total - a[1].total;
    })
    .map(([label, v]) => ({
      label,
      total: v.total,
      attritionRate: v.total > 0 ? (v.attrition / v.total) * 100 : 0,
    }));

  const travelMap = new Map<string, { total: number; attrition: number }>();
  for (const emp of employees) {
    const cur = travelMap.get(emp.businessTravel) ?? { total: 0, attrition: 0 };
    cur.total += 1;
    if (emp.attrition === 'Yes') cur.attrition += 1;
    travelMap.set(emp.businessTravel, cur);
  }
  const travelBreakdown = Array.from(travelMap.entries())
    .map(([rawLabel, v]) => ({
      label: formatTravelLabel(rawLabel),
      rawLabel,
      total: v.total,
      attritionRate: v.total > 0 ? (v.attrition / v.total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const scatterPoints = employees.map((emp) => ({
    x: emp.yearsAtCompany,
    y: emp.monthlyIncomeGbp,
    name: emp.fullName,
    id: emp.employeeId,
    department: emp.department,
    level: emp.jobLevel,
    attrition: emp.attrition,
  }));

  return {
    averageTenure,
    femaleShare,
    nonFullTimeShare,
    avgYearsSincePromotion,
    highFlightRiskCount,
    ageBands,
    tenureBands,
    incomeByLevel,
    incomeByDepartment,
    educationBreakdown,
    travelBreakdown,
    scatterPoints,
  };
}

export function generateInsights(
  filtered: ScoredEmployee[],
  allEmployees: ScoredEmployee[],
): {
  findings: InsightItem[];
  watchlist: ScoredEmployee[];
  actions: ActionRecommendation[];
} {
  if (filtered.length === 0) {
    return {
      findings: [],
      watchlist: [],
      actions: [],
    };
  }

  const findings: InsightItem[] = [];
  const overallAttritionRate =
    allEmployees.length > 0
      ? (allEmployees.filter((e) => e.attrition === 'Yes').length / allEmployees.length) * 100
      : 0;

  const filteredAttrited = filtered.filter((e) => e.attrition === 'Yes');
  const filteredActive = filtered.filter((e) => e.attrition === 'No');
  const filteredAttritionRate = (filteredAttrited.length / filtered.length) * 100;

  // 1. Overall attrition benchmark comparison
  const delta = filteredAttritionRate - overallAttritionRate;
  const isFilteredSubset = filtered.length < allEmployees.length;
  findings.push({
    id: 'attrition-benchmark',
    category: 'Workforce Stability',
    severity:
      filteredAttritionRate >= 25
        ? 'critical'
        : filteredAttritionRate >= 18
          ? 'warning'
          : 'positive',
    headline: isFilteredSubset
      ? `Filtered attrition sits at ${filteredAttritionRate.toFixed(1)}% (${delta >= 0 ? '+' : ''}${delta.toFixed(1)} pp vs. Shell UK average)`
      : `Overall UK attrition stands at ${filteredAttritionRate.toFixed(1)}% (${filteredAttrited.length} of ${filtered.length} employees)`,
    detail: isFilteredSubset
      ? `${filteredAttrited.length} exits recorded out of ${filtered.length} filtered staff compared with the ${overallAttritionRate.toFixed(1)}% UK baseline.`
      : `${filteredActive.length} active staff remain on payroll; retention pressure concentrates in non-permanent contracts and Level 1 roles.`,
    metric: `${filteredAttritionRate.toFixed(1)}%`,
  });

  // 2. Highest-attrition Department (min sample >= 3 if available)
  const deptStats = new Map<string, { total: number; exits: number }>();
  for (const e of filtered) {
    const d = deptStats.get(e.department) ?? { total: 0, exits: 0 };
    d.total += 1;
    if (e.attrition === 'Yes') d.exits += 1;
    deptStats.set(e.department, d);
  }
  const deptEntries = Array.from(deptStats.entries())
    .map(([name, s]) => ({ name, ...s, rate: (s.exits / s.total) * 100 }))
    .filter((d) => d.total >= 3 || deptStats.size === 1)
    .sort((a, b) => b.rate - a.rate || b.exits - a.exits);

  if (deptEntries.length > 0 && deptEntries[0].exits > 0) {
    const topDept = deptEntries[0];
    const lowDept = deptEntries[deptEntries.length - 1];
    findings.push({
      id: 'department-hotspot',
      category: 'Department Hotspot',
      severity: topDept.rate >= 24 ? 'critical' : 'warning',
      headline: `${topDept.name} records the highest attrition at ${topDept.rate.toFixed(1)}%`,
      detail:
        deptEntries.length > 1 && lowDept.name !== topDept.name
          ? `${topDept.exits} of ${topDept.total} staff exited in ${topDept.name}, over ${(topDept.rate / Math.max(1, lowDept.rate)).toFixed(1)}× the rate of ${lowDept.name} (${lowDept.rate.toFixed(1)}%).`
          : `${topDept.exits} of ${topDept.total} staff in this department have left the business.`,
      metric: `${topDept.exits}/${topDept.total}`,
    });
  }

  // 3. Employment Type risk differential
  const ft = filtered.filter((e) => e.employmentType === 'Full-Time');
  const nft = filtered.filter((e) => e.employmentType !== 'Full-Time');
  if (ft.length > 0 && nft.length > 0) {
    const ftRate = (ft.filter((e) => e.attrition === 'Yes').length / ft.length) * 100;
    const nftRate = (nft.filter((e) => e.attrition === 'Yes').length / nft.length) * 100;
    findings.push({
      id: 'contract-gap',
      category: 'Contract Structure',
      severity: nftRate > ftRate + 10 ? 'critical' : 'warning',
      headline: `Non-full-time staff exit at ${nftRate.toFixed(1)}% vs. ${ftRate.toFixed(1)}% for Full-Time`,
      detail: `Part-Time and Contract staff represent ${((nft.length / filtered.length) * 100).toFixed(1)}% of this selection (${nft.length} employees) but experience markedly higher turnover.`,
      metric: `${nftRate.toFixed(1)}%`,
    });
  }

  // 4. Location dispersion
  const locStats = new Map<string, { total: number; exits: number }>();
  for (const e of filtered) {
    const l = locStats.get(e.location) ?? { total: 0, exits: 0 };
    l.total += 1;
    if (e.attrition === 'Yes') l.exits += 1;
    locStats.set(e.location, l);
  }
  const locEntries = Array.from(locStats.entries())
    .map(([name, s]) => ({ name, ...s, rate: (s.exits / s.total) * 100 }))
    .filter((l) => l.total >= 3)
    .sort((a, b) => b.rate - a.rate);
  if (locEntries.length >= 2) {
    const highLoc = locEntries[0];
    const lowLoc = locEntries[locEntries.length - 1];
    findings.push({
      id: 'location-spread',
      category: 'Regional Variance',
      severity: highLoc.rate >= 22 ? 'warning' : 'neutral',
      headline: `${highLoc.name} shows ${highLoc.rate.toFixed(1)}% attrition while ${lowLoc.name} holds at ${lowLoc.rate.toFixed(1)}%`,
      detail: `Site-level turnover varies by ${(highLoc.rate - lowLoc.rate).toFixed(1)} percentage points across UK hubs, highlighting local retention differences.`,
      metric: `${(highLoc.rate - lowLoc.rate).toFixed(1)} pp`,
    });
  }

  // 5. Pay & Grade / Promotion lag insight
  const lvl1 = filtered.filter((e) => e.jobLevel === 1);
  if (lvl1.length >= 3) {
    const lvl1Rate = (lvl1.filter((e) => e.attrition === 'Yes').length / lvl1.length) * 100;
    const avgLvl1Pay = lvl1.reduce((s, e) => s + e.monthlyIncomeGbp, 0) / lvl1.length;
    findings.push({
      id: 'level1-exposure',
      category: 'Pay & Progression',
      severity: lvl1Rate >= 28 ? 'critical' : 'warning',
      headline: `Entry-tier (Level 1) turnover hits ${lvl1Rate.toFixed(1)}% on £${Math.round(avgLvl1Pay).toLocaleString('en-GB')}/mo average pay`,
      detail: `${lvl1.filter((e) => e.attrition === 'Yes').length} of ${lvl1.length} Level 1 employees left; early career progression and pay benchmarking are key levers.`,
      metric: `£${Math.round(avgLvl1Pay).toLocaleString('en-GB')}`,
    });
  } else if (filteredActive.length > 0) {
    const stagnant = filteredActive.filter((e) => e.yearsSinceLastPromotion >= 5);
    const avgPromo =
      filteredActive.reduce((s, e) => s + e.yearsSinceLastPromotion, 0) / filteredActive.length;
    findings.push({
      id: 'promo-stagnation',
      category: 'Career Progression',
      severity: stagnant.length / filteredActive.length > 0.3 ? 'warning' : 'neutral',
      headline: `${stagnant.length} active staff (${((stagnant.length / filteredActive.length) * 100).toFixed(1)}%) have gone 5+ years without promotion`,
      detail: `Active employees average ${avgPromo.toFixed(1)} years since their last grade change.`,
      metric: `${avgPromo.toFixed(1)} yrs`,
    });
  }

  // 6. Active high flight-risk summary
  const highRiskActive = filteredActive.filter((e) => e.flightRiskScore >= HIGH_RISK_THRESHOLD);
  if (filteredActive.length > 0) {
    findings.push({
      id: 'flight-risk-pool',
      category: 'Forward Risk',
      severity: highRiskActive.length >= 10 ? 'critical' : highRiskActive.length > 0 ? 'warning' : 'positive',
      headline: `${highRiskActive.length} active employee${highRiskActive.length === 1 ? '' : 's'} score ≥ ${HIGH_RISK_THRESHOLD}/100 on flight risk`,
      detail: `Representing ${((highRiskActive.length / filteredActive.length) * 100).toFixed(1)}% of active headcount in this view, led by overlapping contract, progression, and commute pressures.`,
      metric: `${highRiskActive.length} active`,
    });
  }

  // Top-10 Watchlist: active employees sorted by flightRiskScore desc, then yearsSinceLastPromotion desc, then lower income
  const watchlist = [...filteredActive]
    .sort(
      (a, b) =>
        b.flightRiskScore - a.flightRiskScore ||
        b.yearsSinceLastPromotion - a.yearsSinceLastPromotion ||
        a.monthlyIncomeGbp - b.monthlyIncomeGbp,
    )
    .slice(0, 10);

  // Recommended actions tailored dynamically to filtered slice
  const actions: ActionRecommendation[] = [];

  if (nft.length > 0) {
    const nftActive = nft.filter((e) => e.attrition === 'No').length;
    actions.push({
      id: 'convert-contracts',
      priority: 'Immediate',
      targetGroup: `${nftActive} active Part-Time & Contract staff`,
      title: 'Review conversion pathways and benefit parity for non-full-time staff',
      rationale:
        'Part-Time and Contract employees exhibit roughly double the attrition rate of Full-Time colleagues.',
      actionStep:
        'Launch 90-day stay interviews with line managers and offer permanent or pro-rata progression tracks for high performers.',
    });
  }

  const promoStuck = filteredActive.filter((e) => e.yearsSinceLastPromotion >= 4);
  if (promoStuck.length > 0) {
    actions.push({
      id: 'progression-calibration',
      priority: 'Immediate',
      targetGroup: `${promoStuck.length} active staff with 4+ yrs since promotion`,
      title: 'Run targeted career-band & promotion calibration reviews',
      rationale: `Active staff with stagnant progression carry up to +20 flight-risk points and represent key institutional knowledge.`,
      actionStep:
        'Require HR Business Partners to review every employee on the Top-10 watchlist and above 4 years without promotion before the next pay cycle.',
    });
  }

  if (lvl1.length > 0 || filteredActive.some((e) => e.monthlyIncomeGbp < 3200)) {
    const lowPayActive = filteredActive.filter(
      (e) => e.jobLevel === 1 || e.monthlyIncomeGbp < 3200,
    ).length;
    actions.push({
      id: 'entry-pay-review',
      priority: 'Near-Term',
      targetGroup: `${lowPayActive} active Level 1 & <£3,200/mo staff`,
      title: 'Benchmark entry-grade compensation against UK regional energy peers',
      rationale:
        'Level 1 roles show the steepest exit rate across job grades, compounded by cost-of-living sensitivity.',
      actionStep:
        'Conduct a Level 1–2 market pay audit in higher-attrition hubs and introduce structured 12-month skill-milestone uplifts.',
    });
  }

  const travelHeavyActive = filteredActive.filter(
    (e) => e.businessTravel === 'Travel_Frequently' && e.distanceFromHomeKm >= 20,
  );
  if (travelHeavyActive.length > 0) {
    actions.push({
      id: 'commute-flex',
      priority: 'Near-Term',
      targetGroup: `${travelHeavyActive.length} active high-travel / long-commute staff`,
      title: 'Introduce hybrid flexibility and travel rotation caps',
      rationale:
        'Employees combining frequent business travel with ≥ 20 km commutes face compounding burnout risk.',
      actionStep:
        'Approve compressed or hybrid schedules on non-site weeks and audit travel cadence across field teams.',
    });
  }

  if (deptEntries.length > 0 && deptEntries[0].exits > 0) {
    actions.push({
      id: 'dept-stay-program',
      priority: 'Sustained',
      targetGroup: `${deptEntries[0].name} (${deptEntries[0].rate.toFixed(1)}% attrition)`,
      title: `Deploy manager retention coaching in ${deptEntries[0].name}`,
      rationale: `${deptEntries[0].name} leads departmental exits in the current selection (${deptEntries[0].exits} of ${deptEntries[0].total}).`,
      actionStep:
        'Pair HRBP quarterly pulse check-ins with manager workload reviews and cross-hub mentoring from lower-attrition teams.',
    });
  }

  return {
    findings,
    watchlist,
    actions: actions.slice(0, 5),
  };
}
