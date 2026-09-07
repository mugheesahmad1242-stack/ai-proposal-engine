import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '../../../lib/auth/server';
const schema = z.object({ name: z.string().trim().min(1).max(160), description: z.string().max(1000).default(''), price: z.number().nonnegative(), currency: z.string().length(3).toUpperCase() });
export async function GET() { const { supabase, user, response } = await requireUser(); if (!user) return response!; const { data, error } = await supabase.from('services').select('*').eq('user_id', user.id).order('created_at', { ascending: false }); return NextResponse.json({ services: data || [], error: error?.message }); }
export async function POST(req: Request) { const { supabase, user, response } = await requireUser(); if (!user) return response!; const b = schema.parse(await req.json()); const { data, error } = await supabase.from('services').insert({ ...b, user_id: user.id }).select().single(); return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ service: data }); }
