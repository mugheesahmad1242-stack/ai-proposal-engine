import { NextResponse } from 'next/server';
import { analyzeContent } from '../../../../../lib/analysis/ai';
import type { BusinessAnalysis } from '../../../../../lib/types';
import { analyzeSocial } from '../../../../../lib/social';
import { requireUser } from '../../../../../lib/auth/server';

const emptyAnalysis = (name: string): BusinessAnalysis => ({ businessName: name, services: [], targetAudience: [], onlinePresence: [], strengths: [], weaknesses: [], missingFeatures: [], painPoints: [], opportunities: [], recommendedServices: [], facts: [], sources: [] });

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, response } = await requireUser(); if (!user) return response!;
  const { id } = await params;
  const { data: p, error: prospectError } = await supabase.from('prospects').select('*,prospect_sources(*)').eq('id', id).eq('user_id', user.id).single();
  if (prospectError || !p) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
  await supabase.from('prospects').update({ analysis_status: 'running', analysis_error: null }).eq('id', id).eq('user_id', user.id);
  try {
    const analyses: BusinessAnalysis[] = [];
    for (const s of p.prospect_sources || []) {
      try {
        let content = `Manual source URL: ${s.url}`;
        if (s.platform === 'Website') {
          const r = await fetch(s.url, { signal: AbortSignal.timeout(Number(process.env.FIRECRAWL_TIMEOUT_MS || 60000)) });
          if (r.ok) content = await r.text(); else throw new Error(`Website returned ${r.status}`);
        } else content = (await analyzeSocial(s.platform, s.url)).content;
        analyses.push(await analyzeContent(p.business_name, content, s.url));
      } catch (e) {
        await supabase.from('prospect_sources').update({ analysis_status: 'failed', analysis_error: e instanceof Error ? e.message : 'Source analysis failed' }).eq('id', s.id);
      }
    }
    if (!analyses.length) throw new Error('No source could be analyzed. Check the URLs or provider configuration.');
    const merged = analyses.reduce<BusinessAnalysis>((a, x) => ({ businessName: p.business_name, services: [...new Set([...a.services, ...x.services])], targetAudience: [...new Set([...a.targetAudience, ...x.targetAudience])], onlinePresence: [...new Set([...a.onlinePresence, ...x.onlinePresence])], strengths: [...new Set([...a.strengths, ...x.strengths])], weaknesses: [...new Set([...a.weaknesses, ...x.weaknesses])], missingFeatures: [...new Set([...a.missingFeatures, ...x.missingFeatures])], painPoints: [...new Set([...a.painPoints, ...x.painPoints])], opportunities: [...new Set([...a.opportunities, ...x.opportunities])], recommendedServices: [...new Set([...a.recommendedServices, ...x.recommendedServices])], facts: [...a.facts, ...x.facts], sources: [...a.sources, ...x.sources] }), emptyAnalysis(p.business_name));
    const { error } = await supabase.from('prospects').update({ analysis_data: merged, analysis_status: 'completed', analysis_analyzed_at: new Date().toISOString(), analysis_error: null }).eq('id', id).eq('user_id', user.id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ analysis: merged });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Analysis failed';
    await supabase.from('prospects').update({ analysis_status: 'failed', analysis_error: message }).eq('id', id).eq('user_id', user.id);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
