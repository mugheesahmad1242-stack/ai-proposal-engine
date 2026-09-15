# AI Proposal Automation Engine

Authentication, prospects, source analysis, business intelligence, proposal generation, pricing/services/packages, PDF export, share links, communications, follow-ups, social API adapters, analytics and conversion tracking.

## Local setup
1. Copy `.env.example` to `.env.local`.
2. Fill in the Supabase URL/keys (see below) and any optional AI/provider credentials.
3. Run `supabase/migration.sql` in the Supabase SQL editor for your project.
4. `npm install`
5. `npm run typecheck`
6. `npm run lint`
7. `npm run build`

## Supabase keys — which one goes where
Supabase projects expose two client-facing keys, in either the legacy JWT
format or the newer prefixed format:

| Purpose | Legacy name | New name | Env var | Exposed to browser? |
|---|---|---|---|---|
| Public/anon key, used with Row Level Security | `anon` `public` | `sb_publishable_...` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes — this is the only Supabase key allowed to be `NEXT_PUBLIC_` |
| Service-role key, bypasses RLS | `service_role` | `sb_secret_...` | `SUPABASE_SERVICE_ROLE_KEY` | **Never.** Server-only, used only by the share-link API routes. |

Both `@supabase/supabase-js` and `@supabase/ssr` accept either key format, so
whichever your project shows under **Settings → API** will work — just put
it in the matching env var above. Never put the service-role/secret key in a
`NEXT_PUBLIC_` variable.

## Required Vercel environment variables
Set these under Project → Settings → Environment Variables for every
environment (Production, Preview, Development) you deploy:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (optional — only needed for share links)
- `NEXT_PUBLIC_SITE_URL` (your deployed URL)
- `GEMINI_API_KEY` / `GEMINI_MODEL` (optional — without it, proposal/analysis
  generation falls back to deterministic, fact-only content instead of AI)
- `FIRECRAWL_API_KEY` / `FIRECRAWL_TIMEOUT_MS` (optional)
- `META_ACCESS_TOKEN` / `LINKEDIN_ACCESS_TOKEN` / `TIKTOK_ACCESS_TOKEN` (optional)
- `SOCIAL_API_TIMEOUT_MS` (optional)

After adding or changing env vars on Vercel you must **redeploy** — env var
changes do not apply to already-built deployments.

## Troubleshooting

**"Invalid API key" on login** — `NEXT_PUBLIC_SUPABASE_ANON_KEY` is missing,
mistyped, or belongs to a different Supabase project than
`NEXT_PUBLIC_SUPABASE_URL`. Re-copy both values from the same project's
**Settings → API** page and redeploy.

**"Could not find the table 'public.prospects' in the schema cache"** — the
migration hasn't been run against this Supabase project yet, or PostgREST's
schema cache is stale after running it. Run `supabase/migration.sql` in the
SQL editor; it ends with `notify pgrst, 'reload schema';` which forces an
immediate cache refresh so the API picks up the new tables right away.

**Login works but every request 401s** — check that `NEXT_PUBLIC_SUPABASE_URL`
matches on both the client and server (a mismatch across environments causes
the browser and server clients to disagree about the session cookie's
project).

The app never invents configured pricing or business facts. Official social
API integrations require valid credentials and permissions; otherwise
source/manual fallback content is used instead.
