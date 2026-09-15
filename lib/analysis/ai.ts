import type { BusinessAnalysis } from '../types';

const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 20000);

const stringArray = { type: 'ARRAY', items: { type: 'STRING' } };
const responseSchema = {
  type: 'OBJECT',
  properties: {
    services: stringArray,
    targetAudience: stringArray,
    onlinePresence: stringArray,
    strengths: stringArray,
    weaknesses: stringArray,
    missingFeatures: stringArray,
    painPoints: stringArray,
    opportunities: stringArray,
    recommendedServices: stringArray,
    facts: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          text: { type: 'STRING' },
          evidence: { type: 'STRING', enum: ['verified', 'inference'] },
          source: { type: 'STRING' },
        },
        required: ['text', 'evidence'],
      },
    },
  },
  required: [
    'services',
    'targetAudience',
    'onlinePresence',
    'strengths',
    'weaknesses',
    'missingFeatures',
    'painPoints',
    'opportunities',
    'recommendedServices',
    'facts',
  ],
};

export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export async function analyzeContent(
  name: string,
  content: string,
  source: string
): Promise<BusinessAnalysis> {
  const base: BusinessAnalysis = {
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
    sources: [source],
  };

  if (!process.env.GEMINI_API_KEY) {
    return {
      ...base,
      onlinePresence: [`Source available: ${source}`],
      facts: [
        {
          text: `AI-powered extraction is disabled (no GEMINI_API_KEY configured); only the source URL was recorded.`,
          evidence: 'verified',
          source,
        },
      ],
    };
  }

  const trimmed = content.trim();
  if (trimmed.length < 40) {
    return {
      ...base,
      facts: [
        {
          text: `This source returned little to no readable content, so no business details could be extracted.`,
          evidence: 'verified',
          source,
        },
      ],
    };
  }

  const prompt = `Analyze business "${name}" using ONLY the source content below. Do not invent facts that are not supported by the content. Extract services, target audience, online presence, strengths, weaknesses, missing features, pain points, opportunities and recommended services as short string arrays (empty array if none are evident). For "facts", list concrete statements you found, each marked evidence:"verified" if directly stated in the content or evidence:"inference" if reasonably inferred. If the content has no useful business information, return empty arrays and an empty facts list rather than guessing. Respond with JSON only, matching this shape exactly: {"services":[],"targetAudience":[],"onlinePresence":[],"strengths":[],"weaknesses":[],"missingFeatures":[],"painPoints":[],"opportunities":[],"recommendedServices":[],"facts":[{"text":"","evidence":"verified|inference","source":""}]}\n\nSource content:\n${trimmed.slice(0, 15000)}`;

  // Updated fallback model to gemini-1.5-flash for stable rate limits
  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  const call = async (withSchema: boolean) =>
    fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY!,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: withSchema
            ? { responseMimeType: 'application/json', responseSchema }
            : { responseMimeType: 'application/json' },
        }),
        signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
      }
    );

  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

  const describeError = (e: unknown) => {
    const cause =
      e instanceof Error && 'cause' in e
        ? (e.cause as { name?: string; code?: string; message?: string } | undefined)
        : undefined;
    const isTimeout =
      (e instanceof Error && e.name === 'TimeoutError') ||
      cause?.name === 'TimeoutError' ||
      cause?.name === 'AbortError';
    const causeDetail = cause
      ? ` (${cause.code || cause.name || ''}${cause.message ? `: ${cause.message}` : ''})`
      : '';
    return {
      isTimeout,
      message: e instanceof Error ? `AI analysis request failed: ${e.message}${causeDetail}` : 'AI analysis request failed',
    };
  };

  const RETRYABLE = new Set([429, 500, 502, 503, 504]);
  let r: Response | undefined;
  let withSchema = true;
  let lastError: { isTimeout: boolean; message: string } | undefined;

  for (let attempt = 0; attempt <= 2; attempt++) {
    // Exponential backoff to avoid instant quota hit (1.5s, 3s)
    if (attempt > 0) await sleep(1500 * attempt);
    try {
      r = await call(withSchema);
      if (r.status === 400 && withSchema) {
        withSchema = false;
        r = await call(withSchema);
      }
      if (!RETRYABLE.has(r.status)) break;
      lastError = { isTimeout: false, message: `AI analysis failed (${r.status}): rate limited or overloaded` };
    } catch (e) {
      lastError = describeError(e);
      if (lastError.isTimeout) throw new Error(`AI analysis timed out after ${GEMINI_TIMEOUT_MS}ms`);
      r = undefined;
    }
  }

  if (!r) throw new Error(lastError?.message || 'AI analysis request failed');
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    const suffix = RETRYABLE.has(r.status)
      ? ' (Gemini is temporarily overloaded/rate limited; try again shortly.)'
      : '';
    throw new Error(`AI analysis failed (${r.status})${detail ? `: ${detail.slice(0, 200)}` : ''}${suffix}`);
  }

  const j = await r.json();
  if (j.promptFeedback?.blockReason)
    throw new Error(`AI analysis was blocked (${j.promptFeedback.blockReason})`);
  const candidate = j.candidates?.[0];
  if (candidate?.finishReason && !['STOP', 'MAX_TOKENS'].includes(candidate.finishReason))
    throw new Error(`AI analysis did not complete (${candidate.finishReason})`);

  const t = candidate?.content?.parts?.[0]?.text || '';
  if (!t.trim()) throw new Error('AI analysis returned an empty response');

  let parsed: Partial<BusinessAnalysis>;
  try {
    parsed = JSON.parse(t.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim());
  } catch {
    throw new Error('AI response could not be parsed as structured data');
  }

  return {
    businessName: name,
    services: Array.isArray(parsed.services) ? parsed.services : [],
    targetAudience: Array.isArray(parsed.targetAudience) ? parsed.targetAudience : [],
    onlinePresence: Array.isArray(parsed.onlinePresence) ? parsed.onlinePresence : [],
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
    missingFeatures: Array.isArray(parsed.missingFeatures) ? parsed.missingFeatures : [],
    painPoints: Array.isArray(parsed.painPoints) ? parsed.painPoints : [],
    opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities : [],
    recommendedServices: Array.isArray(parsed.recommendedServices) ? parsed.recommendedServices : [],
    facts: Array.isArray(parsed.facts) ? parsed.facts : [],
    sources: [source],
  };
}