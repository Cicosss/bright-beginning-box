-- Fix function search_path for security (no app behavior change)
CREATE OR REPLACE FUNCTION public.insert_note_mentions(mentions_data jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.delete_note_mentions(note_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM note_mentions WHERE note_mentions.note_id = $1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.insert_task_mentions(mentions_data jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.delete_task_mentions(task_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM task_mentions WHERE task_mentions.task_id = $1;
END;
$function$;