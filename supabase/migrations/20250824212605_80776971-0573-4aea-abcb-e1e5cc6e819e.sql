-- Create security definer function to get current user role (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path TO 'public';

-- Create function to check if user is admin/manager 
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS BOOLEAN AS $$
  SELECT get_current_user_role() IN ('Admin', 'Manager', 'Amministratore', 'Responsabile');
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path TO 'public';

-- Update DELETE policies for critical business data tables
-- Only admin/manager can delete customers
DROP POLICY IF EXISTS "Authenticated users can delete customers" ON public.customers;
CREATE POLICY "Only admins can delete customers" 
ON public.customers 
FOR DELETE 
USING (is_admin_or_manager());

-- Only admin/manager can delete products  
DROP POLICY IF EXISTS "Authenticated users can delete products" ON public.products;
CREATE POLICY "Only admins can delete products"
ON public.products 
FOR DELETE 
USING (is_admin_or_manager());

-- Only admin/manager can delete shipments
DROP POLICY IF EXISTS "Authenticated users can delete shipments" ON public.shipments;
CREATE POLICY "Only admins can delete shipments"
ON public.shipments 
FOR DELETE 
USING (is_admin_or_manager());

-- Users can only delete their own tasks OR admins can delete any
DROP POLICY IF EXISTS "Authenticated users can delete tasks" ON public.tasks;
CREATE POLICY "Users can delete own tasks or admins can delete any"
ON public.tasks 
FOR DELETE 
USING (created_by = auth.uid() OR is_admin_or_manager());

-- Users can only delete their own calendar events OR admins can delete any  
DROP POLICY IF EXISTS "Authenticated users can delete calendar events" ON public.calendar_events;
CREATE POLICY "Users can delete own events or admins can delete any"
ON public.calendar_events 
FOR DELETE 
USING (created_by = auth.uid() OR is_admin_or_manager());