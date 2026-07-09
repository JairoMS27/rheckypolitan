-- ============================================================
-- OPCIONAL: cron en Supabase (pg_cron)
-- Solo funciona si tienes la extensión pg_cron habilitada.
-- Dashboard → Database → Extensions → busca "pg_cron" y actívala.
-- En el plan Free a veces NO está disponible → usa Vercel Cron (ver abajo).
-- ============================================================

-- Extensiones necesarias (ejecuta solo si el Dashboard no las activó)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS supabase_vault;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- 1) Guardar service role en vault (pega tu key real)
SELECT vault.create_secret(
  'TU_SERVICE_ROLE_KEY',
  'email_queue_service_role_key',
  'Service role for email queue processor'
);

-- 2) Programar el worker cada minuto
SELECT cron.schedule(
  'process-email-queue',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://rheckypolitan.es/email/queue/process',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'email_queue_service_role_key'
      )
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Para borrar el cron si hace falta:
-- SELECT cron.unschedule('process-email-queue');