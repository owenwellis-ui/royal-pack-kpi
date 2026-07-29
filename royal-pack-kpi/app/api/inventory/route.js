import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabaseServer';

function toCamel(row) {
  return {
    id: row.id,
    product: row.product,
    location: row.location,
    dateLabel: row.date_label,
    quantity: row.quantity,
    unit: row.unit,
    createdAt: row.created_at,
  };
}

export async function GET() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('inventory_snapshots')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ snapshots: data.map(toCamel) });
}

export async function POST(request) {
  const body = await request.json();

  if (body.editPassword !== process.env.EDIT_PASSWORD) {
    return NextResponse.json({ error: 'Incorrect edit password' }, { status: 401 });
  }

  const product = (body.product || '').trim();
  const location = (body.location || '').trim();
  const dateLabel = (body.dateLabel || '').trim();
  const quantity = Number(body.quantity);
  const unit = (body.unit || 'lbs').trim() || 'lbs';

  const ALLOWED_LOCATIONS = ['Freezer 1', 'Freezer 2', 'Freezer 3', 'Frontier'];
  if (!product) {
    return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
  }
  if (!ALLOWED_LOCATIONS.includes(location)) {
    return NextResponse.json({ error: 'Location must be one of: ' + ALLOWED_LOCATIONS.join(', ') }, { status: 400 });
  }
  if (!dateLabel) {
    return NextResponse.json({ error: 'Date is required' }, { status: 400 });
  }
  if (isNaN(quantity)) {
    return NextResponse.json({ error: 'Quantity must be a number' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('inventory_snapshots')
    .insert({ product, location, date_label: dateLabel, quantity, unit })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ snapshot: toCamel(data) });
}
