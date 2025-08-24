-- Add role field to profiles table for company role information
ALTER TABLE public.profiles 
ADD COLUMN role TEXT DEFAULT 'Dipendente';

-- Add comment to describe the role field
COMMENT ON COLUMN public.profiles.role IS 'Role within RM Multimedia company';