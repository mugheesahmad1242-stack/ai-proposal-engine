'use client';

import { CircleCheck, Loader2, Sparkles, TriangleAlert } from 'lucide-react';
import { useState } from 'react';

type Result = { error?: string; warning?: string | null; sourcesTotal?: number; sourcesSucceeded?: number; sourcesFailed?: number };

export default function AnalyzeButton({ id, label = 'Run analysis' }: { id: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function run() {
    setBusy(true); setError(''); setNotice('');
    try {
      const r = await fetch(`/api/prospects/${id}/analyze`);
      const j: Result = await r.json().catch(() => ({}));
      if (!r.ok) {
        const suffix = j.sourcesTotal ? ` (0 of ${j.sourcesTotal} sources succeeded)` : '';
        throw new Error((j.error || 'Analysis failed') + suffix);
      }
      // A full reload (rather than router.refresh()) guarantees the page shows the freshly
      // saved analysis — router.refresh() re-renders the current route, but has been
      // unreliable for some users in dev mode and can appear to silently do nothing.
      if (j.warning) {
        setNotice(`Analysis completed. ${j.warning}`);
        setTimeout(() => window.location.reload(), 1400); // brief pause so the message is actually readable before the reload
      } else {
        window.location.reload();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
      setBusy(false);
    }
  }

  return <>
    <button type="button" className="btn" onClick={run} disabled={busy}>
      {busy ? <Loader2 size={15} className="spin" /> : <Sparkles size={15} />} {busy ? 'Analyzing sources…' : label}
    </button>
    {error && <div className="error-box" style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}><TriangleAlert size={15} style={{ flexShrink: 0, marginTop: 1 }} />{error}</div>}
    {!error && notice && <div className="success-box" style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}><CircleCheck size={15} style={{ flexShrink: 0, marginTop: 1 }} />{notice}</div>}
  </>;
}
