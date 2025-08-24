-- Create a secure view for customer selection (only basic info, no sensitive data)
-- This allows non-admin users to select customers for shipments without seeing contact info
CREATE OR REPLACE VIEW public.customers_basic AS
SELECT 
  id,
  name,
  address,
  created_at,
  updated_at
FROM public.customers;

-- Apply RLS to the view - allow all authenticated users to see basic customer info
ALTER VIEW public.customers_basic SET (security_barrier = true);
CREATE POLICY "Authenticated users can view basic customer info" 
ON public.customers_basic 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Note: Views inherit RLS from base tables, but we need to ensure the policy works
-- The view excludes email and phone (sensitive data) but keeps name/address for business operations