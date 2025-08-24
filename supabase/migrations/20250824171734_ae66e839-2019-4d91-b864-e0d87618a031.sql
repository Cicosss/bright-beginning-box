-- Fix foreign key relationship for notes.last_modified_by
ALTER TABLE notes 
ADD CONSTRAINT notes_last_modified_by_fkey 
FOREIGN KEY (last_modified_by) 
REFERENCES profiles(id);

-- Enable REPLICA IDENTITY FULL for real-time updates
ALTER TABLE notes REPLICA IDENTITY FULL;
ALTER TABLE profiles REPLICA IDENTITY FULL;
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER TABLE tasks REPLICA IDENTITY FULL;
ALTER TABLE shipments REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE notes;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE shipments;