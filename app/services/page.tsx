'use client';

import { Boxes, Check, DollarSign, Loader2, Package, Percent, Plus, RefreshCw, Wrench } from 'lucide-react';
import { useEffect, useState } from 'react';

type S = { id: string; name: string; description: string; price: number; currency: string };
type Pkg = { id: string; name: string; description: string; discount_type: string; discount_value: number; package_services: { service_id: string; services: S }[] };

export default function Services() {
  const [s, setS] = useState<S[]>([]);
  const [pkgs, setPkgs] = useState<Pkg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [name, setName] = useState(''); const [description, setD] = useState(''); const [price, setP] = useState(''); const [busy, setBusy] = useState(false); const [svcError, setSvcError] = useState('');

  const [pkgName, setPkgName] = useState(''); const [pkgDesc, setPkgDesc] = useState(''); const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent'); const [discountValue, setDiscountValue] = useState(''); const [selected, setSelected] = useState<string[]>([]); const [pkgBusy, setPkgBusy] = useState(false); const [pkgError, setPkgError] = useState('');

  function load() {
    setLoading(true); setError('');
    Promise.all([
      fetch('/api/services').then(r => r.json()),
      fetch('/api/packages').then(r => r.json()),
    ]).then(([svc, pk]) => { setS(svc.services || []); setPkgs(pk.packages || []); })
      .catch(() => setError('Could not load services and packages. Check your connection and try again.'))
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    Promise.all([
      fetch('/api/services').then(r => r.json()),
      fetch('/api/packages').then(r => r.json()),
    ]).then(([svc, pk]) => { setS(svc.services || []); setPkgs(pk.packages || []); })
      .catch(() => setError('Could not load services and packages. Check your connection and try again.'))
      .finally(() => setLoading(false));
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setSvcError('');
    try {
      const r = await fetch('/api/services', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, description, price: Number(price), currency: 'USD' }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Could not save service');
      setName(''); setD(''); setP(''); load();
    } catch (e) { setSvcError(e instanceof Error ? e.message : 'Could not save service'); } finally { setBusy(false); }
  }

  function toggleSelected(id: string) { setSelected(x => x.includes(id) ? x.filter(v => v !== id) : [...x, id]); }

  async function addPackage(e: React.FormEvent) {
    e.preventDefault(); setPkgBusy(true); setPkgError('');
    try {
      const r = await fetch('/api/packages', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: pkgName, description: pkgDesc, discount_type: discountType, discount_value: Number(discountValue || 0), service_ids: selected }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Could not save package');
      setPkgName(''); setPkgDesc(''); setDiscountValue(''); setSelected([]); load();
    } catch (e) { setPkgError(e instanceof Error ? e.message : 'Could not save package'); } finally { setPkgBusy(false); }
  }

  return <>
    <div className="page-head"><div><p className="eyebrow">Offer catalog</p><h1>Services & packages</h1><p className="page-subtitle">Maintain the services and pricing the proposal engine can recommend.</p></div><button className="btn secondary" onClick={load}><RefreshCw size={14} /> Refresh</button></div>
    {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}

    <div className="two-col">
      <section className="card">
        <div className="card-header"><div><h2>Add a service</h2><p>Use server-side pricing in generated proposals.</p></div><Wrench size={17} color="#5b5ce2" /></div>
        <form className="card-body" onSubmit={add}>
          <div className="form-grid">
            <div className="field"><label>Service name *</label><input className="input" required placeholder="Website redesign" value={name} onChange={e => setName(e.target.value)} /></div>
            <div className="field"><label>Price *</label><div style={{ position: 'relative' }}><DollarSign size={14} color="#98a2b3" style={{ position: 'absolute', left: 11, top: 12 }} /><input className="input" style={{ paddingLeft: 30 }} type="number" min="0" step="0.01" required placeholder="1500" value={price} onChange={e => setP(e.target.value)} /></div></div>
            <div className="field full"><label>Description</label><textarea className="textarea" placeholder="What is included in this service?" value={description} onChange={e => setD(e.target.value)} /></div>
          </div>
          {svcError && <div className="error-box">{svcError}</div>}
          <div className="form-footer"><button className="btn" disabled={busy}>{busy ? <Loader2 size={15} className="spin" /> : <Plus size={15} />} {busy ? 'Saving…' : 'Save service'}</button></div>
        </form>
      </section>
      <section className="card">
        <div className="card-header"><div><h2>Service catalog</h2><p>{loading ? '…' : s.length} services available</p></div><Package size={17} color="#5b5ce2" /></div>
        {loading ? <div className="empty">Loading…</div> : s.length ? <div style={{ padding: '6px 20px 15px' }}>{s.map(x => <div className="list-row" key={x.id}><div className="list-left"><div className="avatar"><Wrench size={15} /></div><div><div className="entity">{x.name}</div><div className="entity-sub">{x.description || 'No description'}</div></div></div><div style={{ textAlign: 'right' }}><strong>{x.currency} {Number(x.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong><div><span className="badge success"><Check size={10} /> Available</span></div></div></div>)}</div> : <div className="empty"><strong>No services yet</strong><p>Add your first service to enable server-side quote resolution.</p></div>}
      </section>
    </div>

    <div className="two-col" style={{ marginTop: 16 }}>
      <section className="card">
        <div className="card-header"><div><h2>Add a package</h2><p>Bundle services together with a discount.</p></div><Boxes size={17} color="#5b5ce2" /></div>
        <form className="card-body" onSubmit={addPackage}>
          <div className="form-grid">
            <div className="field"><label>Package name *</label><input className="input" required placeholder="Growth bundle" value={pkgName} onChange={e => setPkgName(e.target.value)} /></div>
            <div className="field"><label>Discount</label><div style={{ display: 'flex', gap: 8 }}>
              <select className="select" value={discountType} onChange={e => setDiscountType(e.target.value as 'percent' | 'fixed')} style={{ maxWidth: 110 }}><option value="percent">Percent</option><option value="fixed">Fixed</option></select>
              <div style={{ position: 'relative', flex: 1 }}><Percent size={14} color="#98a2b3" style={{ position: 'absolute', left: 11, top: 12 }} /><input className="input" style={{ paddingLeft: 30 }} type="number" min="0" step="0.01" placeholder="0" value={discountValue} onChange={e => setDiscountValue(e.target.value)} /></div>
            </div></div>
            <div className="field full"><label>Description</label><textarea className="textarea" placeholder="What does this package include?" value={pkgDesc} onChange={e => setPkgDesc(e.target.value)} /></div>
            <div className="field full"><label>Included services</label>
              {s.length ? <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>{s.map(x => <label key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><input type="checkbox" checked={selected.includes(x.id)} onChange={() => toggleSelected(x.id)} /> {x.name} — {x.currency} {Number(x.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</label>)}</div> : <span className="field-hint">Add a service first to include it in a package.</span>}
            </div>
          </div>
          {pkgError && <div className="error-box">{pkgError}</div>}
          <div className="form-footer"><button className="btn" disabled={pkgBusy || !s.length}>{pkgBusy ? <Loader2 size={15} className="spin" /> : <Plus size={15} />} {pkgBusy ? 'Saving…' : 'Save package'}</button></div>
        </form>
      </section>
      <section className="card">
        <div className="card-header"><div><h2>Packages</h2><p>{loading ? '…' : pkgs.length} packages available</p></div><Boxes size={17} color="#5b5ce2" /></div>
        {loading ? <div className="empty">Loading…</div> : pkgs.length ? <div style={{ padding: '6px 20px 15px' }}>{pkgs.map(p => <div className="list-row" key={p.id}><div className="list-left"><div className="avatar"><Boxes size={15} /></div><div><div className="entity">{p.name}</div><div className="entity-sub">{p.description || 'No description'}{p.package_services?.length ? ` · ${p.package_services.length} service(s)` : ''}</div></div></div><div style={{ textAlign: 'right' }}><span className="badge primary">{p.discount_type === 'percent' ? `${p.discount_value}% off` : `${p.discount_value} off`}</span></div></div>)}</div> : <div className="empty"><strong>No packages yet</strong><p>Bundle services together to offer package pricing.</p></div>}
      </section>
    </div>
  </>;
}
