-- Create functions to handle note mentions
CREATE OR REPLACE FUNCTION insert_note_mentions(mentions_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  mention_record record;
BEGIN
  FOR mention_record IN SELECT * FROM jsonb_to_recordset(mentions_data) AS x(note_id uuid, mentioned_user_id uuid)
  LOOP
    INSERT INTO note_mentions (note_id, mentioned_user_id)
    VALUES (mention_record.note_id, mention_record.mentioned_user_id)
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

-- Create function to delete note mentions
CREATE OR REPLACE FUNCTION delete_note_mentions(note_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM note_mentions WHERE note_mentions.note_id = $1;
END;
$$;