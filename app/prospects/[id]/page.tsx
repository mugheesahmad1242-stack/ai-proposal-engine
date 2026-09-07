import { supabaseServer } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Globe2, ExternalLink, Mail, Phone, Plus } from "lucide-react";

export default async function ProspectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();

  const { data: p } = await supabase
    .from("prospects")
    .select("*, prospect_sources(*), proposals(*)")
    .eq("id", id)
    .single();

  if (!p) notFound();

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ marginBottom: 20 }}>
        <Link href="/prospects" className="btn secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <ArrowLeft size={16} /> Back to Prospects
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        <main className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{p.business_name || p.company_name || "Unnamed Company"}</h1>
              <p style={{ color: '#667085', margin: '4px 0 0 0' }}>{p.contact_name || "No contact person"}</p>
            </div>
            <span className={`badge ${p.status === 'Won' ? 'success' : p.status === 'Lost' ? 'danger' : 'neutral'}`}>{p.status || 'New'}</span>
          </div>

          <div style={{ padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Business Intelligence</h3>
            <p style={{ color: '#344054', lineHeight: 1.6 }}>{p.summary || p.business_overview || "No research summary available for this prospect."}</p>

            <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href={`/prospects/${id}/proposals/new`} className="btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Plus size={16} /> Create Proposal
              </Link>
            </div>
          </div>
        </main>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div className="card-header">
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Contact Info</h2>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Mail size={16} color="#667085" />
                <span>{p.email || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Phone size={16} color="#667085" />
                <span>{p.phone || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Globe2 size={16} color="#667085" />
                <span>{p.website || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Sources</h2>
                <p style={{ fontSize: 12, color: '#667085', margin: 0 }}>URLs used for research</p>
              </div>
            </div>
            <div style={{ padding: '8px 18px 16px' }}>
              {(p.prospect_sources || []).length ? (
                (p.prospect_sources || []).map((s: any) => (
                  <div className="list-row" key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="entity" style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                        <Globe2 size={13} color="#667085" />
                        {s.platform}
                      </div>
                      <div className="entity-sub" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>
                        {s.url}
                      </div>
                    </div>
                    <a className="icon-btn" href={s.url} target="_blank" rel="noreferrer">
                      <ExternalLink size={14} />
                    </a>
                  </div>
                ))
              ) : (
                <div className="empty" style={{ color: '#667085', fontSize: 14 }}>No sources added.</div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}