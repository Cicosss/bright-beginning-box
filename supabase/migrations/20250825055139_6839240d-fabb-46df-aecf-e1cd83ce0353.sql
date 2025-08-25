-- Create a secure function to delete all messages (admin only)
CREATE OR REPLACE FUNCTION public.delete_all_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  -- Remove mentions first (if present), then messages
  DELETE FROM public.message_mentions;
  DELETE FROM public.messages;
END;
$$;