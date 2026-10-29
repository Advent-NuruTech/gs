-- The existing public-read/admin-update policy also protects these messages.
alter table public_display_settings add column if not exists mascot_messages text[] not null default array[
  'Welcome to AdventSkool!', 'Invite a friend to learn and grow!', 'Learn something. Earn something.',
  'Your next big idea starts here.', 'Explore something new today!', 'Small steps lead to big things.',
  'Create, share, and inspire.', 'There''s always something new to learn.', 'Turn your skills into opportunities.',
  'Let''s grow together!', 'Find a course that sparks your curiosity.', 'Your creativity belongs here.',
  'Learn at your own pace.', 'Every great journey starts somewhere.', 'Discover resources made for you.',
  'Share what you know with the world.', 'Make room for your next idea.', 'Together, we can do more.',
  'Keep learning, keep growing!', 'Ready for your next move?'
];

create or replace function public.valid_mascot_messages(messages text[])
returns boolean language sql immutable as $$
  select coalesce(array_ndims(messages) = 1 and cardinality(messages) between 1 and 20
    and not exists (select 1 from unnest(messages) as message where message is null or length(btrim(message)) = 0 or length(message) > 80), false);
$$;

alter table public_display_settings drop constraint if exists valid_homepage_mascot_messages;
alter table public_display_settings add constraint valid_homepage_mascot_messages check (public.valid_mascot_messages(mascot_messages));
