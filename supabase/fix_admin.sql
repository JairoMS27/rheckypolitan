-- Ejecuta esto en Supabase SQL Editor si ves "Sección sólo para admin"

-- 1. Permiso para leer roles (suele faltar si creaste el schema a mano)
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- 2. Ver usuarios y sus roles actuales
SELECT u.id, u.email, ur.role
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
ORDER BY u.created_at DESC;

-- 3. Asignar admin por email (cambia el email)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'TU-EMAIL@ejemplo.com'
ON CONFLICT (user_id, role) DO NOTHING;