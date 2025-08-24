-- Update the RLS policy for SELECT on notes table to allow all authenticated users to view all notes
DROP POLICY IF EXISTS "Users can view shared notes and own notes" ON public.notes;

CREATE POLICY "All authenticated users can view all notes" 
ON public.notes 
FOR SELECT 
USING (auth.uid() IS NOT NULL);