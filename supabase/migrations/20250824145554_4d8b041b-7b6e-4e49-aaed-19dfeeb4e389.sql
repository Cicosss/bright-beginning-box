-- Add columns to track who modified the note last
ALTER TABLE public.notes 
ADD COLUMN IF NOT EXISTS last_modified_by uuid,
ADD COLUMN IF NOT EXISTS last_modified_at timestamp with time zone DEFAULT now();

-- Update existing notes to set last_modified_by to created_by and last_modified_at to updated_at
UPDATE public.notes 
SET last_modified_by = created_by, last_modified_at = updated_at 
WHERE last_modified_by IS NULL;

-- Create trigger to automatically update last_modified_at
CREATE OR REPLACE FUNCTION public.update_note_modified_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    NEW.last_modified_at = NOW();
    RETURN NEW;
END;
$$;

-- Create trigger for notes table
DROP TRIGGER IF EXISTS update_notes_last_modified ON public.notes;
CREATE TRIGGER update_notes_last_modified
    BEFORE UPDATE ON public.notes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_note_modified_timestamp();