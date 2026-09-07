'use client';

import Link from 'next/link';
import { Plus, Search, ArrowUpRight, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type Prospect = {
  id: string;
  business_name: string;
  business_type?: string;
  contact_name?: string;
  location?: string;
  status: string;
  analysis_status?: string;
  created_at: string;
};

export default function Prospects() {
  const [items, setItems] = useState<Prospect[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch('/api/prospects')
      .then((r) => r.json())
      .then((x) => setItems(x.prospects || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return items.filter(
      (p) =>
        (status === 'All' || p.status === status) &&
        `${p.business_name || ''} ${p.business_type || ''} ${p.location || ''}`
          .toLowerCase()
          .includes(q.toLowerCase())
    );
  }, [items, q, status]);

  const statusOptions = ['New', 'Contacted', 'Proposal Sent', 'Follow-up', 'Negotiating', 'Won', 'Lost'];

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Pipeline</p>
          <h1>Prospects</h1>
          <p className="page-subtitle">Manage businesses from first research through proposal and follow-up.</p>
        </div>
        <Link className="btn" href="/prospects/new">
          <Plus size={16} /> New prospect
        </Link>
      </div>

      <section className="card">
        <div className="card-header">
          <div>
            <h2>Prospect pipeline</h2>
            <p>{items.length} total prospects</p>
          </div>
          <button className="btn secondary" onClick={load}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <div
          style={{
            padding: '15px 18px',
            display: 'flex',
            gap: 9,
            flexWrap: 'wrap',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ position: 'relative', flex: '1 1 250px' }}>
            <Search size={15} color="#98a2b3" style={{ position: 'absolute', left: 11, top: 12 }} />
            <input
              className="input"
              style={{ paddingLeft: 34 }}
              placeholder="Search prospects…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select
            className="select"
            style={{ maxWidth: 190 }}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="All">All</option>
            {statusOptions.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="empty">Loading prospects…</div>
        ) : filtered.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Analysis</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="entity">{p.business_name}</div>
                      <div className="entity-sub">
                        {p.business_type || 'Business'}
                        {p.location ? ` · ${p.location}` : ''}
                      </div>
                    </td>
                    <td>{p.contact_name || <span style={{ color: '#98a2b3' }}>—</span>}</td>
                    <td>
                      <span
                        className={`badge ${
                          p.status === 'Won'
                            ? 'success'
                            : p.status === 'Lost'
                            ? 'danger'
                            : p.status === 'Follow-up'
                            ? 'warning'
                            : 'neutral'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          p.analysis_status === 'completed'
                            ? 'success'
                            : p.analysis_status === 'failed'
                            ? 'danger'
                            : 'primary'
                        }`}
                      >
                        {p.analysis_status || 'Not started'}
                      </span>
                    </td>
                    <td>{p.created_at ? new Date(p.created_at).toLocaleDateString() : 'N/A'}</td>
                    <td>
                      <Link className="btn secondary" href={`/prospects/${p.id}`}>
                        Open <ArrowUpRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <strong>No matching prospects</strong>
            <p>Try another search or create a new prospect.</p>
            <Link className="btn" href="/prospects/new">
              Create prospect
            </Link>
          </div>
        )}
      </section>
    </>
  );
}