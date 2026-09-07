create extension if not exists pgcrypto;
create table if not exists profiles(id uuid primary key references auth.users(id) on delete cascade,full_name text,created_at timestamptz default now());
create table if not exists prospects(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id) on delete cascade,business_name text not null,business_type text,contact_name text,contact_email text,contact_phone text,location text,status text default 'New',analysis_status text,analysis_error text,analysis_data jsonb,analysis_analyzed_at timestamptz,created_at timestamptz default now(),updated_at timestamptz default now());
create table if not exists prospect_sources(id uuid primary key default gen_random_uuid(),prospect_id uuid references prospects(id) on delete cascade,url text not null,platform text not null,analysis_status text,analysis_error text,analysis_title text,analysis_content text,analysis_metadata jsonb,analyzed_at timestamptz,created_at timestamptz default now());
create table if not exists services(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id) on delete cascade,name text not null,description text default '',price numeric(12,2) not null check(price>=0),currency char(3) not null,created_at timestamptz default now(),updated_at timestamptz default now());
create table if not exists packages(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id) on delete cascade,name text not null,description text default '',discount_type text default 'percent',discount_value numeric(12,2) default 0 check(discount_value>=0),created_at timestamptz default now());
create table if not exists package_services(package_id uuid references packages(id) on delete cascade,service_id uuid references services(id) on delete cascade,primary key(package_id,service_id));
create table if not exists proposals(id uuid primary key default gen_random_uuid(),prospect_id uuid references prospects(id) on delete cascade,title text,content jsonb,selected_settings jsonb,version_number int default 1,status text default 'draft',created_at timestamptz default now(),updated_at timestamptz default now());
create table if not exists proposal_versions(id uuid primary key default gen_random_uuid(),proposal_id uuid references proposals(id) on delete cascade,version_number int not null,content jsonb,generation_type text,created_at timestamptz default now(),unique(proposal_id,version_number));
create table if not exists communications(id uuid primary key default gen_random_uuid(),prospect_id uuid references prospects(id) on delete cascade,proposal_id uuid references proposals(id) on delete set null,channel text not null,subject text,body text not null,direction text default 'outbound',status text default 'draft',created_at timestamptz default now());
create table if not exists follow_ups(id uuid primary key default gen_random_uuid(),prospect_id uuid references prospects(id) on delete cascade,proposal_id uuid references proposals(id) on delete set null,channel text not null,body text not null,scheduled_for timestamptz not null,status text default 'scheduled',created_at timestamptz default now());
create table if not exists proposal_shares(id uuid primary key default gen_random_uuid(),proposal_id uuid references proposals(id) on delete cascade,token text unique not null default encode(gen_random_bytes(18),'hex'),created_at timestamptz default now());
create table if not exists proposal_events(id uuid primary key default gen_random_uuid(),proposal_id uuid references proposals(id) on delete cascade,event_type text not null,metadata jsonb,created_at timestamptz default now());
create table if not exists ai_recommendations(id uuid primary key default gen_random_uuid(),prospect_id uuid references prospects(id) on delete cascade,title text not null,description text,priority text,reason text,evidence text,created_at timestamptz default now());
create table if not exists business_analyses(id uuid primary key default gen_random_uuid(),prospect_id uuid unique references prospects(id) on delete cascade,analysis_data jsonb,created_at timestamptz default now(),updated_at timestamptz default now());

alter table profiles enable row level security;alter table prospects enable row level security;alter table prospect_sources enable row level security;alter table services enable row level security;alter table packages enable row level security;alter table package_services enable row level security;alter table proposals enable row level security;alter table proposal_versions enable row level security;alter table communications enable row level security;alter table follow_ups enable row level security;alter table proposal_shares enable row level security;alter table proposal_events enable row level security;alter table ai_recommendations enable row level security;alter table business_analyses enable row level security;
create policy p_own on prospects for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy s_own on services for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy pk_own on packages for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy src_own on prospect_sources for all using(exists(select 1 from prospects p where p.id=prospect_sources.prospect_id and p.user_id=auth.uid())) with check(exists(select 1 from prospects p where p.id=prospect_sources.prospect_id and p.user_id=auth.uid()));
create policy pr_own on proposals for all using(exists(select 1 from prospects p where p.id=proposals.prospect_id and p.user_id=auth.uid())) with check(exists(select 1 from prospects p where p.id=proposals.prospect_id and p.user_id=auth.uid()));
create policy pv_own on proposal_versions for all using(exists(select 1 from proposals pr join prospects p on p.id=pr.prospect_id where pr.id=proposal_versions.proposal_id and p.user_id=auth.uid()));
create policy c_own on communications for all using(exists(select 1 from prospects p where p.id=communications.prospect_id and p.user_id=auth.uid()));
create policy f_own on follow_ups for all using(exists(select 1 from prospects p where p.id=follow_ups.prospect_id and p.user_id=auth.uid()));
create policy bs_own on business_analyses for all using(exists(select 1 from prospects p where p.id=business_analyses.prospect_id and p.user_id=auth.uid()));

-- Prompt 81 hardening: constrained workflow states and missing ownership policies.
alter table prospects drop constraint if exists prospects_status_check;
alter table prospects add constraint prospects_status_check check(status in ('New','Contacted','Proposal Sent','Follow-up','Negotiating','Won','Lost'));
alter table proposals drop constraint if exists proposals_status_check;
alter table proposals add constraint proposals_status_check check(status in ('draft','sent','viewed','follow-up','accepted','rejected','expired'));
alter table communications drop constraint if exists communications_status_check;
alter table communications add constraint communications_status_check check(status in ('draft','sent','received'));
alter table follow_ups drop constraint if exists follow_ups_status_check;
alter table follow_ups add constraint follow_ups_status_check check(status in ('scheduled','sent','cancelled','failed'));

create policy profile_own on profiles for all using(auth.uid()=id) with check(auth.uid()=id);
create policy ps_own on proposal_shares for all using(exists(select 1 from proposals pr join prospects p on p.id=pr.prospect_id where pr.id=proposal_shares.proposal_id and p.user_id=auth.uid())) with check(exists(select 1 from proposals pr join prospects p on p.id=pr.prospect_id where pr.id=proposal_shares.proposal_id and p.user_id=auth.uid()));
create policy pe_own on proposal_events for all using(exists(select 1 from proposals pr join prospects p on p.id=pr.prospect_id where pr.id=proposal_events.proposal_id and p.user_id=auth.uid())) with check(exists(select 1 from proposals pr join prospects p on p.id=pr.prospect_id where pr.id=proposal_events.proposal_id and p.user_id=auth.uid()));
create policy ar_own on ai_recommendations for all using(exists(select 1 from prospects p where p.id=ai_recommendations.prospect_id and p.user_id=auth.uid())) with check(exists(select 1 from prospects p where p.id=ai_recommendations.prospect_id and p.user_id=auth.uid()));

create index if not exists prospects_user_id_idx on prospects(user_id);
create index if not exists prospect_sources_prospect_id_idx on prospect_sources(prospect_id);
create index if not exists proposals_prospect_id_idx on proposals(prospect_id);
create index if not exists proposal_events_proposal_id_idx on proposal_events(proposal_id);
create index if not exists follow_ups_prospect_id_idx on follow_ups(prospect_id);
