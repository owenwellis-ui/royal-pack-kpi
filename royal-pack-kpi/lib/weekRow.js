export function numOrNull(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

export function pctOrNull(v) {
  const n = numOrNull(v);
  return n === null ? null : n / 100;
}

// Builds the DB-shaped row (snake_case) from form input (camelCase), computing
// the derived fields (profit, hours_target, labor_pct_box_weight) the same
// way for both new weeks and edits to existing weeks.
export function buildWeekRow(body) {
  const week = (body.week || '').trim();
  const sales = numOrNull(body.sales);
  const cattlePurchase = numOrNull(body.cattlePurchase);
  const laborCost = numOrNull(body.laborCost);
  const supplyCost = numOrNull(body.supplyCost);
  const regHours = numOrNull(body.regHours) || 0;
  const otHours = numOrNull(body.otHours) || 0;
  const boxWeight = numOrNull(body.boxWeight);

  const profit =
    sales !== null && cattlePurchase !== null && laborCost !== null && supplyCost !== null
      ? sales - cattlePurchase - laborCost - supplyCost
      : null;

  return {
    week,
    sales,
    cattle_purchase: cattlePurchase,
    labor_cost: laborCost,
    supply_cost: supplyCost,
    profit,
    graded_cattle: numOrNull(body.gradedCattle),
    hospital_cows: numOrNull(body.hospitalCows),
    employees: numOrNull(body.employees),
    box_weight: boxWeight,
    reg_hours: regHours,
    ot_hours: otHours,
    hours_target: regHours + otHours,
    live_hot_yield: pctOrNull(body.liveHotYield),
    fab_box_yield: pctOrNull(body.fabBoxYield),
    live_to_box_yield: pctOrNull(body.liveToBoxYield),
    labor_pct_box_weight: laborCost !== null && boxWeight ? laborCost / boxWeight : null,
  };
}

export function toCamel(row) {
  return {
    id: row.id,
    week: row.week,
    sales: row.sales,
    cattlePurchase: row.cattle_purchase,
    laborCost: row.labor_cost,
    supplyCost: row.supply_cost,
    profit: row.profit,
    gradedCattle: row.graded_cattle,
    hospitalCows: row.hospital_cows,
    employees: row.employees,
    boxWeight: row.box_weight,
    regHours: row.reg_hours,
    otHours: row.ot_hours,
    hoursTarget: row.hours_target,
    liveHotYield: row.live_hot_yield,
    fabBoxYield: row.fab_box_yield,
    liveToBoxYield: row.live_to_box_yield,
    laborPctBoxWeight: row.labor_pct_box_weight,
    source: row.source,
  };
}
