'use client';

import { FormEvent, useState } from 'react';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '../../lib/supabase-browser';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setMessage('');
    const s = supabaseBrowser();
    const result = mode === 'signin'
      ? await s.auth.signInWithPassword({ email, password })
      : await s.auth.signUp({ email, password });
    if (result.error) setError(result.error.message);
    else if (mode === 'signup' && !result.data.session) setMessage('Account created. Check your email to confirm your account, then sign in.');
    else { router.push('/'); router.refresh(); }
    setBusy(false);
  }

  return <main className="login-page">
    <section className="card login-card">
      <div className="login-brand"><div className="brand-mark"><Sparkles size={19} /></div><div><strong>Proposal AI</strong><span>AI Proposal Automation Engine</span></div></div>
      <p className="eyebrow">Secure workspace</p>
      <h1>{mode === 'signin' ? 'Welcome back' : 'Create your workspace'}</h1>
      <p className="page-subtitle">{mode === 'signin' ? 'Sign in to manage prospects, proposals and follow-ups.' : 'Create an account to start building proposals.'}</p>
      <form onSubmit={submit}>
        <div className="field"><label>Email address</label><input className="input" type="email" required autoComplete="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div className="field" style={{marginTop:13}}><label>Password</label><input className="input" type="password" required minLength={6} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} /></div>
        {error && <div className="error-box">{error}</div>}
        {message && <div className="success-box" style={{marginTop:14}}>{message}</div>}
        <button className="btn" style={{width:'100%',marginTop:18}} disabled={busy}>{busy ? <Loader2 size={16} className="spin" /> : <ArrowRight size={16} />}{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}</button>
      </form>
      <div className="login-switch">{mode === 'signin' ? 'New to Proposal AI? ' : 'Already have an account? '}<button onClick={() => {setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setMessage('');}}>{mode === 'signin' ? 'Create account' : 'Sign in'}</button></div>
    </section>
  </main>;
}
