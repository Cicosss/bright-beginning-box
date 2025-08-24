-- Drop the failed view
DROP VIEW IF EXISTS public.customers_basic;

-- Create security definer function to get customer data based on user role
CREATE OR REPLACE FUNCTION public.get_customers_by_role()
RETURNS TABLE (
  id uuid,
  name text,
  address text, 
  email text,
  phone text,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  -- Admin/Manager get full customer data
  IF is_admin_or_manager() THEN
    RETURN QUERY
    SELECT c.id, c.name, c.address, c.email, c.phone, c.created_at, c.updated_at
    FROM customers c;
  ELSE
    -- Regular users get limited data (no contact info)
    RETURN QUERY  
    SELECT c.id, c.name, c.address, NULL::text as email, NULL::text as phone, c.created_at, c.updated_at
    FROM customers c;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path TO 'public';

-- Create function to get customer basic info for dropdowns (all users)
CREATE OR REPLACE FUNCTION public.get_customers_for_selection()
RETURNS TABLE (
  id uuid,
  name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name
  FROM customers c;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path TO 'public';