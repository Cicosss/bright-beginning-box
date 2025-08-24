-- Create note_mentions table to track user mentions in notes
CREATE TABLE public.note_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  mentioned_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(note_id, mentioned_user_id)
);

-- Enable RLS
ALTER TABLE public.note_mentions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view note mentions" 
ON public.note_mentions 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert note mentions" 
ON public.note_mentions 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete mentions from their own notes" 
ON public.note_mentions 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.notes 
  WHERE notes.id = note_mentions.note_id 
  AND notes.created_by = auth.uid()
));

-- Create index for better performance
CREATE INDEX idx_note_mentions_note_id ON public.note_mentions(note_id);
CREATE INDEX idx_note_mentions_user_id ON public.note_mentions(mentioned_user_id);