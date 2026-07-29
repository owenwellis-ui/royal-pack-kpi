import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabaseServer';

function toCamel(row) {
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

export async function GET() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('weekly_kpi')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ weeks: data.map(toCamel) });
}

export async function POST(request) {
  const body = await request.json();

  const week = (body.week || '').trim();
  if (!week) {
    return NextResponse.json({ error: 'Week label is required' }, { status: 400 });
  }

  const sales = numOrNull(body.sales);
  const cattlePurchase = numOrNull(body.cattlePurchase);
  const laborCost = numOrNull(body.laborCost);
  const supplyCost = numOrNull(body.supplyCost);
  const regHours = numOrNull(body.regHours) || 0;
  const otHours = numOrNull(body.otHours) || 0;
  const boxWeight = numOrNull(body.boxWeight);
  const laborPctBoxWeightPct = numOrNull(body.livePctFields); // unused placeholder guard

  const profit =
    sales !== null && cattlePurchase !== null && laborCost !== null && supplyCost !== null
      ? sales - cattlePurchase - laborCost - supplyCost
      : null;

  const row = {
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
    source: 'added',
  };

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from('weekly_kpi').insert(row).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ week: toCamel(data) });
}

function numOrNull(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function pctOrNull(v) {
  const n = numOrNull(v);
  return n === null ? null : n / 100;
}
