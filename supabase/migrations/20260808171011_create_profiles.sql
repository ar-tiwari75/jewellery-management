create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,

    full_name text not null,

    role text not null default 'STAFF'
        check (role in ('ADMIN', 'MANAGER', 'STAFF')),

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

grant select, insert, update
on public.profiles
to authenticated;

create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (
        id,
        full_name
    )
    values (
        new.id,
        coalesce(new.raw_user_meta_data ->> 'full_name', 'User')
    );

    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute procedure public.handle_new_user();