-- `generate_widget_key()` calls pgcrypto's `gen_random_bytes`, which Supabase
-- installs in the extensions schema. Keep lookup deterministic without hiding
-- the extension required by the historical function body.

alter function public.generate_widget_key()
  set search_path = public, extensions, pg_temp;
