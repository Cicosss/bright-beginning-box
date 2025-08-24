-- Add message_mentions table for user tagging
CREATE TABLE public.message_mentions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  mentioned_user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.message_mentions ENABLE ROW LEVEL SECURITY;

-- Create policies for message_mentions
CREATE POLICY "Authenticated users can view mentions" 
ON public.message_mentions 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert mentions" 
ON public.message_mentions 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own message mentions" 
ON public.message_mentions 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.messages 
    WHERE messages.id = message_mentions.message_id 
    AND messages.sender_id = auth.uid()
  )
);

-- Enable real-time for messages table
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Enable real-time for message_mentions table
ALTER TABLE public.message_mentions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_mentions;