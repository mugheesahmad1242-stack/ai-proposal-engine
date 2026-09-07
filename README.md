# AI Proposal Automation Engine

Features 1–80 architecture: authentication, prospects, source analysis, business intelligence, proposal generation, pricing/services/packages, PDF/export/share, communication, follow-ups, social API adapters, analytics, conversion tracking, recommendations and end-to-end workflow.

## Local setup
1. Copy `.env.example` to `.env.local`.
2. Fill Supabase URL/key and server-only AI/provider credentials.
3. Run the SQL migration in Supabase.
4. `npm install`
5. `npm run typecheck`
6. `npm run lint`
7. `npm run build`

The app never invents configured pricing or business facts. Official social API integrations require valid credentials and permissions; otherwise source/manual fallback is retained.
