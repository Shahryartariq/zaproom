import "server-only";
import postgres from "postgres";

/**
 * Postgres for the visitor log. On Vercel this is Neon (added from the Vercel
 * Marketplace, which sets DATABASE_URL). Without a database the site still runs;
 * visits just aren't recorded and the admin panel says how to switch it on.
 */
export function databaseUrl(): string | null {
  const url = (process.env.DATABASE_URL ?? process.env.POSTGRES_URL)?.trim();
  return url && /^postgres(ql)?:\/\//.test(url) ? url : null;
}

type Sql = postgres.Sql;
let client: Sql | null = null;
let schema: Promise<void> | null = null;

const SCHEMA = /* sql */ `
create table if not exists zr_visitors (
  id uuid primary key,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  ip text,
  ips text[] not null default '{}',
  country text,
  region text,
  city text,
  latitude double precision,
  longitude double precision,
  timezone text,
  user_agent text,
  browser text,
  browser_version text,
  os text,
  os_version text,
  device text,
  device_vendor text,
  device_model text,
  is_bot boolean not null default false,
  language text,
  languages text,
  screen text,
  viewport text,
  color_scheme text,
  client_timezone text,
  first_referrer text,
  first_landing text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  sessions integer not null default 0,
  page_views integer not null default 0,
  seconds integer not null default 0,
  messages integer not null default 0,
  names text[] not null default '{}'
);
create index if not exists zr_visitors_last_seen on zr_visitors (last_seen desc);

create table if not exists zr_page_views (
  id bigserial primary key,
  visitor_id uuid not null references zr_visitors (id) on delete cascade,
  session_id uuid not null,
  at timestamptz not null default now(),
  path text not null,
  title text,
  referrer text,
  seconds integer,
  messages integer not null default 0,
  ip text,
  country text,
  city text
);
create index if not exists zr_page_views_visitor on zr_page_views (visitor_id, at desc);
create index if not exists zr_page_views_at on zr_page_views (at desc);

create table if not exists zr_events (
  id bigserial primary key,
  visitor_id uuid references zr_visitors (id) on delete cascade,
  at timestamptz not null default now(),
  type text not null,
  room text,
  name text,
  identity text,
  ip text,
  detail jsonb
);
create index if not exists zr_events_visitor on zr_events (visitor_id, at desc);
create index if not exists zr_events_at on zr_events (at desc);
create index if not exists zr_events_identity on zr_events (identity);
`;

/** The shared connection, with the tables created on first use. Null when there's no database. */
export async function db(): Promise<Sql | null> {
  const url = databaseUrl();
  if (!url) return null;
  client ??= postgres(url, {
    // Serverless functions: one connection each, through Neon's pooler.
    max: 1,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: () => {},
  });
  schema ??= client.unsafe(SCHEMA).then(
    () => undefined,
    (e: unknown) => {
      schema = null;
      throw e;
    },
  );
  await schema;
  return client;
}

/** For tests: close the connection so the process can exit. */
export async function closeDb(): Promise<void> {
  await client?.end({ timeout: 1 });
  client = null;
  schema = null;
}
