import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { requireUser } from '../../../../lib/auth/server';

export async function GET(_r: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params; const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return NextResponse.json({ error: 'Share service is not configured' }, { status: 503 });
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key); const { data, error } = await db.from('proposal_shares').select('proposal_id,proposals(*)').eq('token', token).maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'Share not found' }, { status: 404 });
  await db.from('proposal_events').insert({ proposal_id: data.proposal_id, event_type: 'view', metadata: { token } }); return NextResponse.json({ proposal: data.proposals });
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { supabase, user, response } = await requireUser(); if (!user) return response!;
  const { token } = await params; z.string().min(20).max(100).parse(token);
  const body = z.object({ proposal_id: z.string().uuid() }).parse(await req.json());
  const { data: proposal } = await supabase.from('proposals').select('id,prospects!inner(user_id)').eq('id', body.proposal_id).eq('prospects.user_id', user.id).single();
  if (!proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  const { data, error } = await supabase.from('proposal_shares').insert({ proposal_id: body.proposal_id }).select().single();
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ share: data });
}
