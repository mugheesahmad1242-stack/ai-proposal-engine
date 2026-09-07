'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, BriefcaseBusiness, ChevronRight, LayoutDashboard, LogOut, Menu, Plus, Settings, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { supabaseBrowser } from '../lib/supabase-browser';

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/prospects', label: 'Prospects', icon: BriefcaseBusiness },
  { href: '/services', label: 'Services & packages', icon: Settings },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (pathname === '/login') return <>{children}</>;

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-mark"><Sparkles size={18} /></div>
          <div><strong>Proposal AI</strong><span>Automation Engine</span></div>
          <button className="icon-btn mobile-close" onClick={() => setOpen(false)} aria-label="Close menu"><X size={20} /></button>
        </div>

        <nav className="sidebar-nav">
          <p className="nav-label">Workspace</p>
          {nav.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return <Link key={href} href={href} className={`nav-item ${active ? 'active' : ''}`} onClick={() => setOpen(false)}><Icon size={18} /><span>{label}</span>{active && <ChevronRight size={15} className="nav-arrow" />}</Link>;
          })}
        </nav>

        <div className="sidebar-bottom">
          <Link href="/prospects/new" className="sidebar-cta" onClick={() => setOpen(false)}><Plus size={17} /> New prospect</Link>
          <button className="nav-item logout" onClick={signOut}><LogOut size={18} /><span>Sign out</span></button>
          <div className="sidebar-footnote">AI Proposal Engine<br /><span>Production workspace</span></div>
        </div>
      </aside>

      {open && <button className="sidebar-overlay" onClick={() => setOpen(false)} aria-label="Close navigation" />}
      <div className="main-shell">
        <header className="topbar">
          <button className="icon-btn mobile-menu" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={22} /></button>
          <div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14} /><strong>{nav.find(n => pathname === n.href || (n.href !== '/' && pathname.startsWith(n.href)))?.label || 'Proposal Engine'}</strong></div>
          <Link href="/prospects/new" className="topbar-action"><Plus size={17} /> <span>New prospect</span></Link>
        </header>
        <main className="content-wrap">{children}</main>
      </div>
    </div>
  );
}
