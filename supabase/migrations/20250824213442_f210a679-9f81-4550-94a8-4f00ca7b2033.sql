-- Make luca.litti@gmail.com system administrator
UPDATE profiles 
SET role = 'Amministratore' 
WHERE id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'luca.litti@gmail.com'
);

-- Create user_bans table for banning users
CREATE TABLE public.user_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  banned_user_id uuid NOT NULL,
  banned_by uuid NOT NULL,
  reason text,
  banned_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Create user_mutes table for chat muting
CREATE TABLE public.user_mutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  muted_user_id uuid NOT NULL,
  muted_by uuid NOT NULL,
  reason text,
  muted_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_mutes ENABLE ROW LEVEL SECURITY;

-- Only system admin can manage bans/mutes
CREATE POLICY "Only system admin can manage bans"
ON public.user_bans
FOR ALL
USING (get_current_user_role() = 'Amministratore');

CREATE POLICY "Only system admin can manage mutes" 
ON public.user_mutes
FOR ALL
USING (get_current_user_role() = 'Amministratore');

-- Function to check if user is banned
CREATE OR REPLACE FUNCTION public.is_user_banned(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_bans 
    WHERE banned_user_id = user_id 
    AND is_active = true 
    AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path TO 'public';

-- Function to check if user is muted
CREATE OR REPLACE FUNCTION public.is_user_muted(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_mutes 
    WHERE muted_user_id = user_id 
    AND is_active = true 
    AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path TO 'public';

-- Function to get system admin status
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS boolean AS $$
BEGIN
  RETURN get_current_user_role() = 'Amministratore';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path TO 'public';