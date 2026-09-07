import { NextResponse } from 'next/server';
import { generateWithAI } from '../../../../../lib/proposals/ai';
import { updateProposalMetrics } from '../../../../../lib/proposals/quality';
import type { ProposalSettings } from '../../../../../lib/proposals/types';
import { resolveQuote } from '../../../../../lib/proposals';
import { requireUser } from '../../../../../lib/auth/server';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, response } = await requireUser(); if (!user) return response!;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { data: proposal } = await supabase.from('proposals').select('*,prospects!inner(*)').eq('id', id).eq('prospects.user_id', user.id).single();
  if (!proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  const rawSettings = (body.settings || proposal.selected_settings || {}) as ProposalSettings;
  try {
    const quote = await resolveQuote(supabase, user.id, rawSettings);
    const generated = updateProposalMetrics(await generateWithAI(proposal.prospects.business_name, proposal.prospects.analysis_data || { services: [], targetAudience: [], onlinePresence: [], strengths: [], weaknesses: [], missingFeatures: [], painPoints: [], opportunities: [], recommendedServices: [], facts: [], sources: [] }, quote.settings));
    generated.warnings = [...new Set([...(generated.warnings || []), ...quote.warnings])];
    const nextVersion = (proposal.version_number || 1) + 1;
    const { data: updated, error } = await supabase.from('proposals').update({ content: generated, selected_settings: quote.settings, version_number: nextVersion }).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    await supabase.from('proposal_versions').insert({ proposal_id: id, version_number: nextVersion, content: generated, generation_type: 'regenerated' });
    return NextResponse.json({ proposal: updated });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Regeneration failed' }, { status: 400 }); }
}
