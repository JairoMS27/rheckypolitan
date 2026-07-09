-- ============================================================
-- OPCIONAL (respaldo): cron en Supabase (pg_cron)
-- La app procesa la cola en background al encolar correos (Next.js after()).
-- Usa este script solo si quieres reintentos periódicos de mensajes atascados.
-- Dashboard → Database → Extensions → busca "pg_cron" y actívala.
-- Alternativa gratuita: cron-job.org llamando POST /email/queue/process con CRON_SECRET.
-- ============================================================

-- Extensiones necesarias (ejecuta solo si el Dashboard no las activó)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS supabase_vault;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- 1) Guardar CRON_SECRET en vault (mismo valor que en Vercel → CRON_SECRET)
SELECT vault.create_secret(
  'TU_CRON_SECRET',
  'email_queue_cron_secret',
  'Bearer token for email queue processor'
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
        WHERE name = 'email_queue_cron_secret'
      )
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Para borrar el cron si hace falta:
-- SELECT cron.unschedule('process-email-queue');