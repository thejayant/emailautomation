alter table public.profiles
add column if not exists product_tour_version integer;

alter table public.profiles
add column if not exists product_tour_completed_at timestamptz;
