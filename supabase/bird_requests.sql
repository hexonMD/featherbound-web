-- "Request this bird" — when a user photographs a species we don't have a plate/card for yet, the app
-- records a request here. One row per species (count = how many people asked); the admin dashboard at
-- /admin/requests ranks by demand and drives the add pipeline. Run via the Supabase Management API query
-- endpoint (POST https://api.supabase.com/v1/projects/unwoxwbnisehfytuzouo/database/query, sbp_ token) —
-- NOT `supabase db push` (the remote has no migration history). Idempotent.

create table if not exists public.bird_requests (
  species_sci   text primary key,                    -- eBird/catalog scientific name (the join key to catches + plates)
  common_name   text,
  count         integer     not null default 1,      -- how many distinct requests
  status        text        not null default 'requested',  -- requested | generating | in_review | live | rejected
  sample_photo_url text,                              -- a representative user photo (first requester's), for the dashboard
  first_user_id text,                                 -- who found it first (credited when it goes live)
  last_region   text,                                 -- where it was last requested from
  note          text,                                 -- admin note
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists bird_requests_status_idx on public.bird_requests (status);
create index if not exists bird_requests_count_idx  on public.bird_requests (count desc);

-- All writes go through the Next.js API with the service key, so no anon RLS policy is needed. Keep RLS
-- ON with no public policy => anon/authenticated clients cannot read or write directly (defense in depth).
alter table public.bird_requests enable row level security;
