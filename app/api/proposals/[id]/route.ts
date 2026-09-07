import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '../../../../lib/auth/server';

const statuses = ['draft','sent','viewed','follow-up','accepted','rejected','expired'] as const;
const updateSchema = z.object({ content: z.unknown().optional(), selected_settings: z.unknown().optional(), status: z.enum(statuses).optional() });

export async function GET(_r: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, response } = await requireUser(); if (!user) return response!;
  const { id } = await params;
  const { data, error } = await supabase.from('proposals').select('*,prospects!inner(user_id)').eq('id', id).eq('prospects.user_id', user.id).single();
  return error ? NextResponse.json({ error: 'Proposal not found' }, { status: 404 }) : NextResponse.json({ proposal: data });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, response } = await requireUser(); if (!user) return response!;
  const { id } = await params; const b = updateSchema.parse(await req.json());
  const { data, error } = await supabase.from('proposals').update(b).eq('id', id).select('*,prospects!inner(user_id)').eq('prospects.user_id', user.id).single();
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ proposal: data });
}
