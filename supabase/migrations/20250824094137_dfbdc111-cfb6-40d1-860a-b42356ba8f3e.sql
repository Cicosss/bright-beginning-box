-- Enable real-time for shipments table
ALTER TABLE public.shipments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipments;

-- Enable real-time for tasks table  
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;

-- Enable real-time for sub_tasks table
ALTER TABLE public.sub_tasks REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sub_tasks;

-- Enable real-time for notes table
ALTER TABLE public.notes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;

-- Enable real-time for comments table
ALTER TABLE public.comments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;

-- Enable real-time for profiles table
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;