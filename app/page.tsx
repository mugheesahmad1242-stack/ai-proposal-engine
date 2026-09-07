'use client';

import Link from 'next/link';
import { ArrowUpRight, BarChart3, BriefcaseBusiness, Clock3, FileText, Plus, Sparkles, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';

type Prospect = { id:string; business_name:string; business_type?:string; status:string; analysis_status?:string; created_at:string };
type Analytics = { metrics?: { views:number; shares:number; responses:number; conversions:number; conversionRate:number } };

export default function Dashboard() {
  const [prospects,setProspects] = useState<Prospect[]>([]); const [analytics,setAnalytics] = useState<Analytics>(); const [loading,setLoading] = useState(true);
  useEffect(() => { Promise.all([fetch('/api/prospects').then(r=>r.json()), fetch('/api/analytics').then(r=>r.json())]).then(([p,a])=>{setProspects(p.prospects||[]);setAnalytics(a)}).finally(()=>setLoading(false)); },[]);
  const recent = prospects.slice(0,5);
  return <>
    <div className="page-head"><div><p className="eyebrow">Overview</p><h1>Good to see you.</h1><p className="page-subtitle">Turn business research into polished proposals with a single workflow.</p></div><div className="page-actions"><Link className="btn" href="/prospects/new"><Plus size={16}/> New prospect</Link></div></div>
    <div className="hero-card card" style={{marginBottom:18}}><p className="eyebrow">Proposal workflow</p><h2>Research, write, price and follow up — without leaving your workspace.</h2><p>Capture a prospect, analyze its online presence, generate a tailored proposal and track what happens next.</p><div className="hero-actions"><Link className="btn" href="/prospects/new"><Plus size={16}/> Add prospect</Link><Link className="btn secondary" href="/analytics"><BarChart3 size={16}/> View analytics</Link></div></div>
    <div className="stats-grid">
      <Stat icon={<BriefcaseBusiness size={16}/>} label="Prospects" value={loading?'—':prospects.length} meta="In your workspace" />
      <Stat icon={<FileText size={16}/>} label="Proposal views" value={loading?'—':analytics?.metrics?.views ?? 0} meta="Tracked events" />
      <Stat icon={<TrendingUp size={16}/>} label="Conversions" value={loading?'—':analytics?.metrics?.conversions ?? 0} meta="Accepted / converted" />
      <Stat icon={<Clock3 size={16}/>} label="Conversion rate" value={loading?'—':`${analytics?.metrics?.conversionRate ?? 0}%`} meta="Based on proposal views" />
    </div>
    <div className="dashboard-grid">
      <section className="card"><div className="card-header"><div><h2>Recent prospects</h2><p>Your latest opportunities</p></div><Link className="btn secondary" href="/prospects">View all <ArrowUpRight size={14}/></Link></div>{recent.length ? <div className="section-list" style={{padding:'4px 20px 10px'}}>{recent.map(p=><Link className="list-row" key={p.id} href={`/prospects/${p.id}`}><div className="list-left"><div className="avatar">{p.business_name.slice(0,1).toUpperCase()}</div><div><div className="entity">{p.business_name}</div><div className="entity-sub">{p.business_type || 'Business'} · {new Date(p.created_at).toLocaleDateString()}</div></div></div><Badge status={p.status}/></Link>)}</div> : <div className="empty"><strong>No prospects yet</strong><p>Create your first prospect to start the workflow.</p><Link className="btn" href="/prospects/new">Create prospect</Link></div>}</section>
      <section className="card"><div className="card-header"><div><h2>Workflow</h2><p>Recommended next steps</p></div><Sparkles size={17} color="#5b5ce2"/></div><div className="section-list" style={{padding:'8px 20px 16px'}}>{[['01','Create prospect','Add business and source URLs','/prospects/new'],['02','Run analysis','Understand strengths, gaps and opportunities',recent[0]?`/prospects/${recent[0].id}`:'/prospects'],['03','Generate proposal','Turn intelligence into a tailored offer',recent[0]?`/prospects/${recent[0].id}/proposals`:'/prospects']].map(([n,title,desc,href])=><Link href={href} className="list-row" key={n}><div className="list-left"><div className="avatar" style={{background:'#f2f4f7',color:'#667085'}}>{n}</div><div><div className="entity">{title}</div><div className="entity-sub">{desc}</div></div></div><ArrowUpRight size={15} color="#98a2b3"/></Link>)}</div></section>
    </div>
  </>;
}
function Stat({icon,label,value,meta}:{icon:React.ReactNode;label:string;value:React.ReactNode;meta:string}){return <div className="card stat-card"><div className="stat-top"><span className="stat-label">{label}</span><span className="stat-icon">{icon}</span></div><div className="stat-value">{value}</div><div className="stat-meta">{meta}</div></div>}
function Badge({status}:{status:string}){const cls=status==='Won'||status==='Accepted'?'success':status==='Lost'||status==='rejected'?'danger':status==='Proposal Sent'||status==='Negotiating'?'primary':status==='Follow-up'?'warning':'neutral';return <span className={`badge ${cls}`}>{status}</span>}
