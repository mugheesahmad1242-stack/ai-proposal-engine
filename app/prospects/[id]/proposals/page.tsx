'use client';

import Link from 'next/link';
import { ArrowLeft, Check, Copy, Download, FileText, Loader2, RefreshCw, Share2, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

type Section = { heading: string; content: string; evidence?: 'verified' | 'inference' };
type ProposalContent = {
  title?: string;
  businessName?: string;
  sections?: Record<string, Section>;
  warnings?: string[];
  qualityMetrics?: { wordCount: number; readabilityScore: number; naturalnessScore: number };
};
type Proposal = { id: string; title: string; content: ProposalContent; status: string; version_number: number; created_at: string; updated_at: string; selected_settings?: any };

const SECTION_ORDER = ['businessUnderstanding', 'problemsOpportunities', 'recommendedSolution', 'deliverables', 'benefits', 'timeline', 'investment', 'cta'];

export default function ProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('');
  const [items, setItems] = useState<Proposal[]>([]);
  const [busy, setBusy] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { params.then(x => { setId(x.id); load(x.id); }); }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load(pid = id) {
    if (!pid) return;
    const r = await fetch(`/api/prospects/${pid}/proposals`);
    const j = await r.json();
    setItems(j.proposals || []);
  }

  async function gen() {
    setBusy(true); setError('');
    try {
      const r = await fetch(`/api/prospects/${id}/proposals`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ settings: { tone: 'Professional', length: 'medium', personalizationLevel: 'high' } }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Generation failed');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Generation failed'); } finally { setBusy(false); }
  }

  async function regenerate() {
    if (!p) return;
    setRegenerating(true); setError('');
    try {
      const r = await fetch(`/api/proposals/${p.id}/regenerate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Regeneration failed');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Regeneration failed'); } finally { setRegenerating(false); }
  }

  async function share() {
    if (!p) return;
    setSharing(true); setError(''); setShareUrl('');
    try {
      const r = await fetch(`/api/proposals/${p.id}/share`, { method: 'POST' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Could not create share link');
      setShareUrl(`${window.location.origin}/share/${j.share.token}`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not create share link'); } finally { setSharing(false); }
  }

  async function copyLink() {
    if (!shareUrl) return;
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* ignore clipboard errors */ }
  }

  const p = items[0];
  const content = p?.content || {};
  const sections = content.sections || {};

  return <>
    <div className="page-head">
      <div>
        <Link href={`/prospects/${id}`} className="btn secondary" style={{ marginBottom: 12 }}><ArrowLeft size={14} /> Back to prospect</Link>
        <p className="eyebrow">Proposal studio</p>
        <h1>Proposals</h1>
        <p className="page-subtitle">Generate and review tailored proposals for this prospect.</p>
      </div>
      <div className="page-actions">
        <button className="btn secondary" onClick={() => load()}><RefreshCw size={14} /> Refresh</button>
        <button className="btn" onClick={gen} disabled={busy}>{busy ? <Loader2 size={15} className="spin" /> : <Sparkles size={15} />} {busy ? 'Generating…' : 'Generate proposal'}</button>
      </div>
    </div>
    {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}
    {p ? <div className="proposal-layout">
      <article className="card proposal-paper">
        <div className="badge primary" style={{ marginBottom: 12 }}>Version {p.version_number} · {p.status}</div>
        <div className="proposal-title">{content.title || p.title || 'Business Proposal'}</div>
        <div className="entity-sub" style={{ marginTop: 6 }}>Generated {new Date(p.created_at).toLocaleString()}</div>
        {!!content.warnings?.length && <div className="error-box" style={{ marginTop: 14 }}>{content.warnings.join(' ')}</div>}
        {SECTION_ORDER.map(key => {
          const s = sections[key];
          if (!s || !s.content) return null;
          return <Block key={key} title={s.heading} evidence={s.evidence}>{s.content}</Block>;
        })}
        <div className="success-box" style={{ marginTop: 22 }}><Check size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} /> Proposal is stored in your workspace.</div>
      </article>
      <aside className="card settings-panel">
        <h3>Proposal details</h3>
        <div className="setting-row"><label>STATUS</label><span className="badge primary">{p.status}</span></div>
        <div className="setting-row"><label>VERSION</label><strong>{p.version_number}</strong></div>
        <div className="setting-row"><label>TONE</label><span>{p.selected_settings?.tone || 'Professional'}</span></div>
        <div className="setting-row"><label>LENGTH</label><span>{p.selected_settings?.length || 'Medium'}</span></div>
        <div className="setting-row"><label>PERSONALIZATION</label><span>{p.selected_settings?.personalizationLevel || 'High'}</span></div>
        {content.qualityMetrics && <div className="setting-row"><label>QUALITY</label><span>{content.qualityMetrics.wordCount} words · readability {content.qualityMetrics.readabilityScore}</span></div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
          <a className="btn secondary" href={`/api/proposals/${p.id}/pdf`} target="_blank" rel="noreferrer"><Download size={14} /> Download PDF</a>
          <button className="btn secondary" onClick={regenerate} disabled={regenerating}>{regenerating ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />} {regenerating ? 'Regenerating…' : 'Regenerate'}</button>
          <button className="btn secondary" onClick={share} disabled={sharing}>{sharing ? <Loader2 size={14} className="spin" /> : <Share2 size={14} />} {sharing ? 'Creating link…' : 'Create share link'}</button>
          {shareUrl && <div className="field" style={{ marginTop: 4 }}>
            <label>Share link</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="input" readOnly value={shareUrl} style={{ fontSize: 11 }} />
              <button type="button" className="icon-btn" onClick={copyLink} aria-label="Copy link"><Copy size={14} /></button>
            </div>
            {copied && <span className="field-hint">Copied to clipboard.</span>}
          </div>}
        </div>
      </aside>
    </div> : <section className="card"><div className="empty"><FileText size={28} color="#98a2b3" /><strong style={{ marginTop: 8 }}>No proposal yet</strong><p>Generate the first proposal from this prospect.</p><button className="btn" onClick={gen} disabled={busy}><Sparkles size={15} /> Generate proposal</button></div></section>}
  </>;
}

function Block({ title, evidence, children }: { title: string; evidence?: 'verified' | 'inference'; children: React.ReactNode }) {
  return <section className="proposal-block">
    <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{title}{evidence === 'inference' && <span className="badge warning" style={{ fontSize: 9 }}>Inference</span>}</h3>
    {typeof children === 'string' ? <p>{children}</p> : children}
  </section>;
}
