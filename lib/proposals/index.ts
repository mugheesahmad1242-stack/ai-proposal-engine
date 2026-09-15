import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProposalSettings } from './types';

export async function resolveQuote(db: SupabaseClient, userId: string, settings: ProposalSettings) {
  if (!settings.selectedService) return { settings: { ...settings, pricing: undefined }, warnings: ['No service selected; no price was invented.'] };
  const { data: service, error } = await db.from('services').select('id,name,price,currency').eq('id', settings.selectedService).eq('user_id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!service) throw new Error('Selected service is not available for this account.');
  const resolved = { ...settings, pricing: { amount: Number(service.price), currency: service.currency, label: service.name } };
  return { settings: resolved, warnings: [] as string[] };
}
