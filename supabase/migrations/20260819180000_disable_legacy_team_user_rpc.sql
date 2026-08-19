/* Team invitations now use the server-side Supabase Auth invite flow. */
revoke execute on function public.create_shop_user(text, text, text)
from authenticated;
