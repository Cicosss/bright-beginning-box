-- Update SELECT policy for customers table to restrict sensitive data access
-- Only admin/manager roles can view customer contact information
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;

-- Create role-based policy for customer data access
CREATE POLICY "Only authorized users can view customer data" 
ON public.customers 
FOR SELECT 
USING (is_admin_or_manager());

-- Alternative: If some users need to see customer names/addresses but not contact info,
-- we could create a view with limited data, but for maximum security we restrict all access