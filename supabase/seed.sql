-- ============================================================
-- RHECKYPOLITAN — Seed data
-- Ejecutar DESPUÉS de 01_schema.sql y 01_schema_part2.sql
-- ============================================================

-- ------------------------------------------------------------
-- Revista: número 1 de ejemplo
-- (sube la portada y páginas desde /admin después)
-- ------------------------------------------------------------
INSERT INTO public.issues (
  id,
  number,
  title,
  subtitle,
  published_at,
  page_count,
  summary,
  quotes,
  credits,
  show_quotes
)
VALUES (
  'a1111111-1111-4111-8111-111111111101',
  1,
  'Cartas desde Kentucky — Número 1',
  'Crónicas, ensayos y postales editoriales',
  '2026-01-15',
  0,
  '["La llegada a Louisville","El supermercado como catedral","Notas sobre el invierno"]'::jsonb,
  '[{"text":"Kentucky no es un lugar, es una frecuencia.","author":"Rhecky"}]'::jsonb,
  '[{"role":"Dirección","name":"Rheckypolitan"}]'::jsonb,
  true
)
ON CONFLICT (number) DO NOTHING;

-- ------------------------------------------------------------
-- Artículos de ejemplo (una por sección)
-- ------------------------------------------------------------
INSERT INTO public.posts (
  section, slug, title, excerpt, content_html, author, published, published_at
) VALUES
(
  'actualidad',
  'bienvenida-a-rheckypolitan',
  'Bienvenida a Rheckypolitan',
  'El archivo digital de crónicas desde Kentucky ya está en marcha.',
  '<p>Este es el primer artículo de <strong>Actualidad</strong>. Sustituye este texto desde el panel de administración.</p>',
  'Redacción',
  true,
  now() - interval '2 days'
),
(
  'entretenimiento',
  'fanta-azul-y-coleccionables',
  'Fanta Azul y coleccionables',
  'Notas desde Louisville sobre cultura pop y estanterías llenas.',
  '<p>Artículo de ejemplo en <strong>Entretenimiento</strong>.</p>',
  'Iván',
  true,
  now() - interval '3 days'
),
(
  'conspiracion',
  'la-thermomix-y-las-contrasenas',
  'La Thermomix y las contraseñas',
  'Teorías domésticas con sabor a Kentucky.',
  '<p>Artículo de ejemplo en <strong>Conspiración</strong>.</p>',
  'Luis Lastra',
  true,
  now() - interval '4 days'
),
(
  'gastronomia',
  'bourbon-y-pan-de-maiz',
  'Bourbon y pan de maíz',
  'Sabores del sur en una postal culinaria.',
  '<p>Artículo de ejemplo en <strong>Gastronomía</strong>.</p>',
  'Redacción',
  true,
  now() - interval '5 days'
),
(
  'entrevistas',
  'conversacion-en-louisville',
  'Conversación en Louisville',
  'Una entrevista ficticia para probar la sección.',
  '<p>Artículo de ejemplo en <strong>Entrevistas</strong>.</p>',
  'Redacción',
  true,
  now() - interval '6 days'
),
(
  'pasatiempos',
  'crucigrama-de-prueba',
  'Crucigrama de prueba',
  'Pasatiempos editoriales para lectores insomnes.',
  '<p>Artículo de ejemplo en <strong>Pasatiempos</strong>.</p>',
  'Redacción',
  true,
  now() - interval '7 days'
)
ON CONFLICT (section, slug) DO NOTHING;

-- ------------------------------------------------------------
-- Admin: crear usuario en Authentication primero, luego descomenta
-- Dashboard → Authentication → Users → Add user
-- Copia el UUID y sustitúyelo abajo:
-- ------------------------------------------------------------
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('TU-UUID-DE-AUTH-USERS', 'admin')
-- ON CONFLICT (user_id, role) DO NOTHING;