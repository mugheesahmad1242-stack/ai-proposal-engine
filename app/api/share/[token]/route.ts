import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Public, unauthenticated read of a shared proposal by its share token.
// Share tokens are created via POST /api/proposals/[id]/share (authenticated).
export async function GET(_r: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params; const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return NextResponse.json({ error: 'Share service is not configured' }, { status: 503 });
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key); const { data, error } = await db.from('proposal_shares').select('proposal_id,proposals(*)').eq('token', token).maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'Share not found' }, { status: 404 });
  await db.from('proposal_events').insert({ proposal_id: data.proposal_id, event_type: 'view', metadata: { token } }); return NextResponse.json({ proposal: data.proposals });
}
