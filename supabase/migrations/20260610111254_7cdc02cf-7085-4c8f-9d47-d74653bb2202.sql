
-- 1. Add 'redactor' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'redactor';
