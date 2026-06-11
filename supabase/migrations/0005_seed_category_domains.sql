insert into public.category_domains (category_id, user_id, domain)
select c.id, c.user_id, d.domain
from public.categories c
join (values
  ('YouTube',   'youtube.com'),
  ('YouTube',   'youtu.be'),
  ('Instagram', 'instagram.com'),
  ('TikTok',    'tiktok.com'),
  ('TikTok',    'vm.tiktok.com'),
  ('Tweet',     'twitter.com'),
  ('Tweet',     'x.com'),
  ('Tweet',     't.co'),
  ('GitHub',    'github.com')
) as d(category_name, domain) on c.name = d.category_name
on conflict (user_id, domain) do nothing;
