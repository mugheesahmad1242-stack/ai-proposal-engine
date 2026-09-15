import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../lib/auth/server';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, response } = await requireUser(); if (!user) return response!;
  const { id } = await params;
  const { data: proposal } = await supabase.from('proposals').select('id,prospects!inner(user_id)').eq('id', id).eq('prospects.user_id', user.id).single();
  if (!proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  const { data, error } = await supabase.from('proposal_shares').insert({ proposal_id: id }).select().single();
  if (!error) await supabase.from('proposal_events').insert({ proposal_id: id, event_type: 'share', metadata: {} });
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ share: data });
}
