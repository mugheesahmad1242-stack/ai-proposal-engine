import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateWithAI } from '../../../../../lib/proposals/ai';
import { updateProposalMetrics } from '../../../../../lib/proposals/quality';
import type { ProposalSettings } from '../../../../../lib/proposals/types';
import { resolveQuote } from '../../../../../lib/proposals';
import { requireUser } from '../../../../../lib/auth/server';

const schema = z.object({ settings: z.object({ selectedService: z.string().uuid().optional(), pricing: z.never().optional(), timeline: z.string().max(200).optional(), tone: z.string().optional(), length: z.string().optional(), customWordCount: z.number().int().min(100).max(5000).optional(), audience: z.string().optional(), customAudience: z.string().max(200).optional(), personalizationLevel: z.string().optional(), humanizationEnabled: z.boolean().optional(), humanizationIntensity: z.string().optional() }).default({}) });

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, response } = await requireUser(); if (!user) return response!;
  const { id } = await params;
  const { data: prospect } = await supabase.from('prospects').select('id').eq('id', id).eq('user_id', user.id).single();
  if (!prospect) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
  const { data, error } = await supabase.from('proposals').select('*').eq('prospect_id', id).order('created_at', { ascending: false });
  return NextResponse.json({ proposals: data || [], error: error?.message });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, response } = await requireUser(); if (!user) return response!;
  const { id } = await params; const b = schema.parse(await req.json());
  const { data: p } = await supabase.from('prospects').select('*').eq('id', id).eq('user_id', user.id).single();
  if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  try {
    const quote = await resolveQuote(supabase, user.id, b.settings as ProposalSettings);
    const proposal = updateProposalMetrics(await generateWithAI(p.business_name, p.analysis_data || { services: [], targetAudience: [], onlinePresence: [], strengths: [], weaknesses: [], missingFeatures: [], painPoints: [], opportunities: [], recommendedServices: [], facts: [], sources: [] }, quote.settings));
    proposal.warnings = [...new Set([...(proposal.warnings || []), ...quote.warnings])];
    const { data: saved, error } = await supabase.from('proposals').insert({ prospect_id: id, title: proposal.title, content: proposal, selected_settings: quote.settings, version_number: 1, status: 'draft' }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await supabase.from('proposal_versions').insert({ proposal_id: saved.id, version_number: 1, content: proposal, generation_type: 'generated' });
    return NextResponse.json({ proposal: { ...proposal, id: saved.id } });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Proposal generation failed' }, { status: 400 }); }
}
