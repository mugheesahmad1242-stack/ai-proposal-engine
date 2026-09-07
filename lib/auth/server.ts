import { NextResponse } from 'next/server';
import { supabaseServer } from '../supabase-server';

export async function requireUser() {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, user: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  return { supabase, user: data.user, response: null };
}
