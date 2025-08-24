-- Create task mentions table
CREATE TABLE IF NOT EXISTS public.task_mentions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL,
  mentioned_user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(task_id, mentioned_user_id)
);

-- Enable RLS
ALTER TABLE public.task_mentions ENABLE ROW LEVEL SECURITY;

-- Create policies for task mentions
CREATE POLICY "Authenticated users can view task mentions" 
ON public.task_mentions 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert task mentions" 
ON public.task_mentions 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete mentions from their own tasks" 
ON public.task_mentions 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM tasks 
  WHERE tasks.id = task_mentions.task_id 
  AND tasks.created_by = auth.uid()
));

-- Create function to insert task mentions
CREATE OR REPLACE FUNCTION public.insert_task_mentions(mentions_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  mention_record record;
BEGIN
  FOR mention_record IN SELECT * FROM jsonb_to_recordset(mentions_data) AS x(task_id uuid, mentioned_user_id uuid)
  LOOP
    INSERT INTO task_mentions (task_id, mentioned_user_id)
    VALUES (mention_record.task_id, mention_record.mentioned_user_id)
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

-- Create function to delete task mentions
CREATE OR REPLACE FUNCTION public.delete_task_mentions(task_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM task_mentions WHERE task_mentions.task_id = $1;
END;
$$;