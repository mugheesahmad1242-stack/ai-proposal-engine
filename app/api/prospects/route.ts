import { NextResponse } from 'next/server';
import { z } from 'zod';
import { detectPlatform } from '../../../lib/platform';
import { requireUser } from '../../../lib/auth/server';

const schema = z.object({
  business_name: z.string().trim().min(1).max(200), business_type: z.string().trim().max(120).optional(),
  contact_name: z.string().trim().max(160).optional(), contact_email: z.string().email().optional().or(z.literal('')),
  contact_phone: z.string().trim().max(60).optional(), location: z.string().trim().max(200).optional(),
  urls: z.array(z.string().url()).max(20).default([])
});

export async function GET() {
  const { supabase, user, response } = await requireUser(); if (!user) return response!;
  const { data, error } = await supabase.from('prospects').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  return NextResponse.json({ prospects: data || [], error: error?.message });
}

export async function POST(req: Request) {
  const { supabase, user, response } = await requireUser(); if (!user) return response!;
  const b = schema.parse(await req.json());
  const { data: p, error } = await supabase.from('prospects').insert({ ...b, urls: undefined, user_id: user.id }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (b.urls.length) {
    const { error: sourceError } = await supabase.from('prospect_sources').insert(b.urls.map(url => ({ prospect_id: p.id, url, platform: detectPlatform(url) })));
    if (sourceError) return NextResponse.json({ error: sourceError.message }, { status: 400 });
  }
  return NextResponse.json({ prospect: p });
}
