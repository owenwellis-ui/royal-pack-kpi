import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../lib/supabaseServer';
import { buildWeekRow, toCamel } from '../../../../lib/weekRow';

export async function PATCH(request, { params }) {
  const { id } = params;
  const body = await request.json();

  if (!(body.week || '').trim()) {
    return NextResponse.json({ error: 'Week label is required' }, { status: 400 });
  }

  // Note: source (ledger vs added) is intentionally left untouched here —
  // editing a week's numbers doesn't change where it originally came from.
  const row = buildWeekRow(body);

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('weekly_kpi')
    .update(row)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ week: toCamel(data) });
}
