ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

UPDATE public.profiles p
SET avatar_url = u.raw_user_meta_data->>'avatar_url'
FROM auth.users u
WHERE p.id = u.id;
