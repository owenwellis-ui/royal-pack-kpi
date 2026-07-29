import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabaseServer';
import { buildWeekRow, toCamel } from '../../../lib/weekRow';

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

  if (body.editPassword !== process.env.EDIT_PASSWORD) {
    return NextResponse.json({ error: 'Incorrect edit password' }, { status: 401 });
  }

  if (!(body.week || '').trim()) {
    return NextResponse.json({ error: 'Week label is required' }, { status: 400 });
  }

  const row = { ...buildWeekRow(body), source: 'added' };

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from('weekly_kpi').insert(row).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ week: toCamel(data) });
}
