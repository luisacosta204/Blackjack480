-- Users table with default starting credits (500)
create table if not exists public.users (
  id serial primary key,
  username text not null unique,
  email text not null unique,
  password_hash text not null,
  credits int not null default 500,
  created_at timestamptz not null default now()
);