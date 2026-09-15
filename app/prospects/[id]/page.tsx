import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle2, ExternalLink, FileText, Globe2, Sparkles, Target, TriangleAlert } from 'lucide-react';
import { notFound, redirect } from 'next/navigation';
import { supabaseServer } from '../../../lib/supabase-server';
import AnalyzeButton from '../../../components/AnalyzeButton';

export default async function Prospect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await supabaseServer();
  
  // 1. Authenticate user; redirect to login instead of returning null
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  // 2. Fetch Prospect Data
  const { data: p, error: prospectError } = await db
    .from('prospects')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (prospectError) {
    throw new Error(`Could not load this prospect: ${prospectError.message}`);
  }

  // 3. Fallback UI if prospect doesn't exist
  if (!p) {
    return (
      <div className="card" style={{ padding: 32, textAlign: 'center', margin: '24px 0' }}>
        <TriangleAlert size={32} color="#f04438" style={{ margin: '0 auto 12px' }} />
        <h2>Prospect Not Found</h2>
        <p className="entity-sub" style={{ marginTop: 8 }}>
          The prospect ID <code>{id}</code> does not exist or you do not have permission to view it.
        </p>
        <Link href="/prospects" className="btn primary" style={{ display: 'inline-flex', marginTop: 16 }}>
          <ArrowLeft size={14} /> Back to All Prospects
        </Link>
      </div>
    );
  }

  // 4. Fetch Prospect Sources
  const { data: sources, error: sourcesError } = await db
    .from('prospect_sources')
    .select('*')
    .eq('prospect_id', id);

  if (sourcesError) {
    throw new Error(`Could not load sources for this prospect: ${sourcesError.message}`);
  }

  p.prospect_sources = sources || [];
  const a: any = p.analysis_data || {};
  const list = (v: any) => (Array.isArray(v) ? v : []);

  return (
    <>
      <div className="detail-header">
        <div className="detail-title">
          <div className="detail-avatar">
            {(p.business_name || 'B').slice(0, 1).toUpperCase()}
          </div>
          <div>
            <Link
              href="/prospects"
              className="entity-sub"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 5 }}
            >
              <ArrowLeft size={12} /> All prospects
            </Link>
            <h1>{p.business_name || 'Unnamed Prospect'}</h1>
            <div className="detail-meta">
              {p.business_type || 'Business'}
              {p.location ? ` · ${p.location}` : ''} · Added{' '}
              {p.created_at ? new Date(p.created_at).toLocaleDateString() : 'N/A'}
            </div>
          </div>
        </div>
        <div className="page-actions">
          <span
            className={`badge ${
              p.status === 'Won'
                ? 'success'
                : p.status === 'Lost'
                ? 'danger'
                : p.status === 'Follow-up'
                ? 'warning'
                : 'primary'
            }`}
          >
            {p.status || 'New'}
          </span>
          <Link className="btn" href={`/prospects/${id}/proposals`}>
            <FileText size={15} /> Proposals <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      <div className="kpi-strip">
        <div className="kpi">
          <div className="kpi-label">Analysis</div>
          <div className="kpi-value">
            {p.analysis_status === 'completed'
              ? 'Complete'
              : p.analysis_status === 'failed'
              ? 'Failed'
              : 'Pending'}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Sources</div>
          <div className="kpi-value">{(p.prospect_sources || []).length}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Opportunities</div>
          <div className="kpi-value">{list(a.opportunities).length}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Recommendations</div>
          <div className="kpi-value">{list(a.recommendedServices).length}</div>
        </div>
      </div>

      {p.analysis_status === 'failed' && (
        <div className="error-box" style={{ marginBottom: 16 }}>
          <strong>Analysis failed.</strong> {p.analysis_error}
        </div>
      )}

      <div className="dashboard-grid">
        <section className="card">
          <div className="card-header">
            <div>
              <h2>Business intelligence</h2>
              <p>What the analysis found about this prospect.</p>
            </div>
            <Sparkles size={17} color="#5b5ce2" />
          </div>
          {p.analysis_status === 'running' ? (
            <div className="empty">
              <strong>Analysis in progress…</strong>
              <p>This can take a moment while sources are researched.</p>
            </div>
          ) : p.analysis_status === 'completed' ? (
            <>
              <div className="analysis-grid" style={{ padding: 16 }}>
                {[
                  ['Services', a.services, Globe2],
                  ['Target audience', a.targetAudience, Target],
                  ['Strengths', a.strengths, CheckCircle2],
                  ['Weaknesses', a.weaknesses, TriangleAlert],
                  ['Pain points', a.painPoints, TriangleAlert],
                  ['Opportunities', a.opportunities, Sparkles],
                ].map(([title, values, Icon]: any) => (
                  <div className="card analysis-card" key={title}>
                    <h3>
                      <Icon size={15} color="#5b5ce2" />
                      {title}
                    </h3>
                    {list(values).length ? (
                      <ul>
                        {list(values)
                          .slice(0, 8)
                          .map((x: any, i: number) => (
                            <li key={i}>{typeof x === 'string' ? x : JSON.stringify(x)}</li>
                          ))}
                      </ul>
                    ) : (
                      <span className="entity-sub">No data found.</span>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ padding: '0 16px 16px' }}>
                <AnalyzeButton id={id} label="Re-run analysis" />
              </div>
            </>
          ) : (
            <div className="empty">
              <strong>Analysis not completed</strong>
              <p>Run analysis from this prospect to populate business intelligence.</p>
              <AnalyzeButton id={id} />
            </div>
          )}
        </section>

        <aside className="card">
          <div className="card-header">
            <div>
              <h2>Sources</h2>
              <p>URLs used for research</p>
            </div>
          </div>
          <div style={{ padding: '8px 18px 16px' }}>
            {(p.prospect_sources || []).length ? (
              (p.prospect_sources || []).map((s: any) => (
                <div
                  className="list-row"
                  key={s.id}
                  style={{ flexDirection: 'column', alignItems: 'stretch' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div className="entity" style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                        <Globe2 size={13} color="#667085" />
                        {s.platform}
                        {s.analysis_status === 'running' && (
                          <span className="badge primary" style={{ fontSize: 9 }}>
                            Analyzing…
                          </span>
                        )}
                        {s.analysis_status === 'completed' && (
                          <span className="badge success" style={{ fontSize: 9 }}>
                            Analyzed
                          </span>
                        )}
                        {s.analysis_status === 'failed' && (
                          <span className="badge warning" style={{ fontSize: 9 }}>
                            Failed
                          </span>
                        )}
                      </div>
                      <div
                        className="entity-sub"
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: 260,
                        }}
                      >
                        {s.url}
                      </div>
                    </div>
                    <a className="icon-btn" href={s.url} target="_blank" rel="noreferrer">
                      <ExternalLink size={14} />
                    </a>
                  </div>
                  {s.analysis_status === 'failed' && s.analysis_error && (
                    <div className="entity-sub" style={{ color: '#b42318', marginTop: 4 }}>
                      {s.analysis_error}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="empty">No sources added.</div>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}