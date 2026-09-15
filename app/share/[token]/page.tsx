'use client';

import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

type Section = { heading: string; content: string; evidence?: 'verified' | 'inference' };
type ProposalContent = { title?: string; businessName?: string; sections?: Record<string, Section> };
type Proposal = { title: string; content: ProposalContent; status: string; created_at: string };

const SECTION_ORDER = ['businessUnderstanding', 'problemsOpportunities', 'recommendedSolution', 'deliverables', 'benefits', 'timeline', 'investment', 'cta'];

export default function SharedProposal({ params }: { params: Promise<{ token: string }> }) {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(({ token }) => {
      fetch(`/api/share/${token}`).then(async r => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'Share not found');
        setProposal(j.proposal);
      }).catch(e => setError(e instanceof Error ? e.message : 'Share not found')).finally(() => setLoading(false));
    });
  }, [params]);

  const content = proposal?.content || {};
  const sections = content.sections || {};

  return <main className="login-page" style={{ alignItems: 'flex-start', padding: '40px 22px' }}>
    <section className="card proposal-paper" style={{ width: 'min(760px,100%)' }}>
      <div className="login-brand" style={{ marginBottom: 20 }}><div className="brand-mark"><Sparkles size={18} /></div><div><strong>Proposal AI</strong><span>Shared proposal</span></div></div>
      {loading && <div className="empty">Loading proposal…</div>}
      {!loading && error && <div className="error-box">{error}</div>}
      {!loading && proposal && <>
        <div className="proposal-title">{content.title || proposal.title || 'Business Proposal'}</div>
        <div className="entity-sub" style={{ marginTop: 6 }}>Shared {new Date(proposal.created_at).toLocaleString()}</div>
        {SECTION_ORDER.map(key => {
          const s = sections[key];
          if (!s || !s.content) return null;
          return <section className="proposal-block" key={key}><h3>{s.heading}</h3><p>{s.content}</p></section>;
        })}
      </>}
    </section>
  </main>;
}
