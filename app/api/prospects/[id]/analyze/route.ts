import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { analyzeContent, htmlToText } from '../../../../../lib/analysis/ai';
import type { BusinessAnalysis } from '../../../../../lib/types';
import { analyzeSocial } from '../../../../../lib/social';
import { requireUser } from '../../../../../lib/auth/server';

// 1. Vercel max execution time limit (60 seconds)
export const maxDuration = 60;

// 2. Updated Timeouts to match long scraping cycles
const WEBSITE_FETCH_TIMEOUT_MS = Number(process.env.FIRECRAWL_TIMEOUT_MS || 30000);
const SOURCE_TIMEOUT_MS = Number(process.env.SOURCE_ANALYSIS_TIMEOUT_MS || 55000);

const emptyAnalysis = (name: string): BusinessAnalysis => ({
  businessName: name,
  services: [],
  targetAudience: [],
  onlinePresence: [],
  strengths: [],
  weaknesses: [],
  missingFeatures: [],
  painPoints: [],
  opportunities: [],
  recommendedServices: [],
  facts: [],
  sources: [],
});

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

type Source = { id: string; url: string; platform: string };

async function processSource(
  businessName: string,
  s: Source
): Promise<{ id: string; ok: true; analysis: BusinessAnalysis } | { id: string; ok: false; error: string }> {
  try {
    const result = await withTimeout(
      (async () => {
        let content = `Manual source URL: ${s.url}`;
        if (s.platform === 'Website') {
          let r: Response;
          try {
            r = await fetch(s.url, { signal: AbortSignal.timeout(WEBSITE_FETCH_TIMEOUT_MS) });
          } catch (e) {
            throw new Error(
              e instanceof Error && e.name === 'TimeoutError'
                ? `Website did not respond within ${WEBSITE_FETCH_TIMEOUT_MS}ms`
                : `Could not reach website: ${e instanceof Error ? e.message : 'network error'}`
            );
          }
          if (r.ok) content = htmlToText(await r.text());
          else throw new Error(`Website returned ${r.status}`);
        } else {
          // Wrapped inside a fallback so social scraping delays don't throw an unhandled timeout
          try {
            const social = await analyzeSocial(s.platform, s.url);
            content = social.verified ? social.content : `Manual source URL: ${s.url} (${social.content})`;
          } catch (err) {
            content = `Manual source URL: ${s.url} (Social scrape failed/timed out, proceeding with URL extraction)`;
          }
        }
        return analyzeContent(businessName, content, s.url);
      })(),
      SOURCE_TIMEOUT_MS,
      `Analysis of ${s.url}`
    );
    return { id: s.id, ok: true, analysis: result };
  } catch (e) {
    return { id: s.id, ok: false, error: e instanceof Error ? e.message : 'Source analysis failed' };
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, response } = await requireUser();
  if (!user) return response!;
  const { id } = await params;

  const { data: p, error: prospectError } = await supabase
    .from('prospects')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (prospectError)
    return NextResponse.json({ error: `Could not load prospect: ${prospectError.message}` }, { status: 500 });
  if (!p) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });

  const { data: sourceRows, error: sourceError } = await supabase
    .from('prospect_sources')
    .select('*')
    .eq('prospect_id', id);

  if (sourceError)
    return NextResponse.json({ error: `Could not load sources: ${sourceError.message}` }, { status: 500 });
  const sources: Source[] = sourceRows || [];
  if (!sources.length)
    return NextResponse.json({ error: 'Add at least one source URL before running analysis.' }, { status: 400 });

  await supabase
    .from('prospects')
    .update({ analysis_status: 'running', analysis_error: null })
    .eq('id', id)
    .eq('user_id', user.id);

  await Promise.allSettled(
    sources.map((s) =>
      supabase
        .from('prospect_sources')
        .update({ analysis_status: 'running', analysis_error: null })
        .eq('id', s.id)
    )
  );

  try {
    const settled = await Promise.allSettled(sources.map((s) => processSource(p.business_name, s)));

    const analyses: BusinessAnalysis[] = [];
    const failureMessages: string[] = [];
    await Promise.allSettled(
      settled.map((r, i) => {
        const s = sources[i];
        if (r.status === 'fulfilled' && r.value.ok) {
          analyses.push(r.value.analysis);
          return supabase
            .from('prospect_sources')
            .update({ analysis_status: 'completed', analysis_error: null, analyzed_at: new Date().toISOString() })
            .eq('id', s.id);
        }
        const message =
          r.status === 'fulfilled'
            ? r.value.ok
              ? ''
              : r.value.error
            : r.reason instanceof Error
            ? r.reason.message
            : 'Source analysis failed';
        failureMessages.push(message);
        return supabase
          .from('prospect_sources')
          .update({ analysis_status: 'failed', analysis_error: message, analyzed_at: new Date().toISOString() })
          .eq('id', s.id);
      })
    );

    const succeeded = analyses.length;
    const failed = sources.length - succeeded;

    if (!succeeded) {
      const detail = [...new Set(failureMessages)].slice(0, 3).join(' | ');
      const message = `No source could be analyzed.${
        detail ? ` Reason: ${detail}` : ' Check the URLs, provider credentials, or try again.'
      }`;
      await supabase
        .from('prospects')
        .update({ analysis_status: 'failed', analysis_error: message })
        .eq('id', id)
        .eq('user_id', user.id);
      revalidatePath(`/prospects/${id}`);
      return NextResponse.json(
        { error: message, sourcesTotal: sources.length, sourcesSucceeded: succeeded, sourcesFailed: failed },
        { status: 502 }
      );
    }

    const merged = analyses.reduce<BusinessAnalysis>(
      (a, x) => ({
        businessName: p.business_name,
        services: [...new Set([...a.services, ...x.services])],
        targetAudience: [...new Set([...a.targetAudience, ...x.targetAudience])],
        onlinePresence: [...new Set([...a.onlinePresence, ...x.onlinePresence])],
        strengths: [...new Set([...a.strengths, ...x.strengths])],
        weaknesses: [...new Set([...a.weaknesses, ...x.weaknesses])],
        missingFeatures: [...new Set([...a.missingFeatures, ...x.missingFeatures])],
        painPoints: [...new Set([...a.painPoints, ...x.painPoints])],
        opportunities: [...new Set([...a.opportunities, ...x.opportunities])],
        recommendedServices: [...new Set([...a.recommendedServices, ...x.recommendedServices])],
        facts: [...a.facts, ...x.facts],
        sources: [...a.sources, ...x.sources],
      }),
      emptyAnalysis(p.business_name)
    );

    const partialWarning =
      failed > 0 ? `${failed} of ${sources.length} source(s) could not be analyzed and were excluded.` : null;
    const noAiKeyWarning = !process.env.GEMINI_API_KEY
      ? 'GEMINI_API_KEY is not configured, so AI extraction is disabled — only source URLs were recorded, with no services/audience/etc. detected. Set GEMINI_API_KEY to enable full analysis.'
      : null;
    const combinedWarning = [noAiKeyWarning, partialWarning].filter(Boolean).join(' ') || null;
    await supabase
      .from('prospects')
      .update({
        analysis_data: merged,
        analysis_status: 'completed',
        analysis_analyzed_at: new Date().toISOString(),
        analysis_error: combinedWarning,
      })
      .eq('id', id)
      .eq('user_id', user.id);
    revalidatePath(`/prospects/${id}`);
    return NextResponse.json({
      analysis: merged,
      sourcesTotal: sources.length,
      sourcesSucceeded: succeeded,
      sourcesFailed: failed,
      warning: combinedWarning,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Analysis failed';
    await supabase
      .from('prospects')
      .update({ analysis_status: 'failed', analysis_error: message })
      .eq('id', id)
      .eq('user_id', user.id);
    revalidatePath(`/prospects/${id}`);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}