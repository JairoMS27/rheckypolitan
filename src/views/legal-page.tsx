"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

type Props = {
  kind: "terminos" | "privacidad";
};

export function LegalPage({ kind }: Props) {
  const isTerms = kind === "terminos";
  const title = isTerms ? "Términos de uso" : "Política de privacidad";
  const kicker = isTerms ? "★ Condiciones" : "★ Datos y cookies";
  const updated = "11 de julio de 2026";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader compact />

      <main className="mx-auto max-w-[900px] px-5 py-12 md:px-8 md:py-16">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234]">{kicker}</p>
        <h1 className="mt-2 font-display text-4xl leading-tight md:text-5xl">{title}</h1>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Última actualización · {updated}
        </p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground/85 md:text-base">
          {isTerms ? <TermsBody /> : <PrivacyBody />}
        </div>

        <p className="mt-12 border-t border-foreground/10 pt-6 text-sm text-muted-foreground">
          ¿Dudas? Escríbenos desde el flujo de contacto del sitio o responde a un correo de
          Rheckypolitan.
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}

function TermsBody() {
  return (
    <>
      <section>
        <h2 className="font-display text-2xl">1. Qué es esto</h2>
        <p className="mt-3">
          Rheckypolitan es una revista digital y archivo de crónicas, ensayos y postales
          editoriales. Al usar rheckypolitan.es aceptas estas condiciones. Si no estás de acuerdo,
          no uses el sitio.
        </p>
      </section>
      <section>
        <h2 className="font-display text-2xl">2. Cuentas y acceso</h2>
        <p className="mt-3">
          Puedes leer el archivo sin cuenta. Para comentar, publicar artículos o usar el feed
          personal necesitas registrarte con un correo válido y confirmarlo. Eres responsable de la
          confidencialidad de tu contraseña y de lo que se haga con tu cuenta.
        </p>
      </section>
      <section>
        <h2 className="font-display text-2xl">3. Contenido de usuarios</h2>
        <p className="mt-3">
          Si publicas textos o comentarios, garantizas que tienes derecho a hacerlo y que no
          infringen derechos de terceros ni la ley. Nos reservamos el derecho a moderar, editar o
          retirar contenido que sea abusivo, ilegal o incompatible con el tono del proyecto.
        </p>
      </section>
      <section>
        <h2 className="font-display text-2xl">4. Propiedad intelectual</h2>
        <p className="mt-3">
          Las revistas, diseño, marca Rheckypolitan y materiales editoriales propios están
          protegidos. Puedes enlazar y citar con atribución razonable; no redistribuyas números
          completos sin permiso.
        </p>
      </section>
      <section>
        <h2 className="font-display text-2xl">5. Disponibilidad</h2>
        <p className="mt-3">
          Intentamos que el archivo esté online, pero puede haber mantenimiento, errores o cambios.
          El servicio se ofrece «tal cual», sin garantías de disponibilidad continua.
        </p>
      </section>
      <section>
        <h2 className="font-display text-2xl">6. Limitación</h2>
        <p className="mt-3">
          En la medida permitida por la ley, Rheckypolitan no responde por daños indirectos
          derivados del uso del sitio. El humor y las opiniones de colaboradores no constituyen
          asesoramiento legal, médico ni financiero (ni de Thermomix).
        </p>
      </section>
      <section>
        <h2 className="font-display text-2xl">7. Cambios</h2>
        <p className="mt-3">
          Podemos actualizar estos términos. La fecha de «última actualización» indica la versión
          vigente. El uso continuado tras un cambio implica aceptación.
        </p>
      </section>
    </>
  );
}

function PrivacyBody() {
  return (
    <>
      <section>
        <h2 className="font-display text-2xl">1. Responsable</h2>
        <p className="mt-3">
          El responsable del tratamiento de los datos relacionados con rheckypolitan.es es el
          proyecto Rheckypolitan. Esta política describe qué datos tratamos y por qué.
        </p>
      </section>
      <section>
        <h2 className="font-display text-2xl">2. Datos que tratamos</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            <strong>Cuenta:</strong> correo, nombre de usuario, nombre visible, contraseña (hasheada
            por el proveedor de autenticación).
          </li>
          <li>
            <strong>Contenido:</strong> artículos, comentarios y metadatos de publicación.
          </li>
          <li>
            <strong>Suscripción:</strong> correo si te apuntas a la tirada / newsletter.
          </li>
          <li>
            <strong>Técnicos:</strong> cookies e identificadores de sesión necesarios para el
            funcionamiento del sitio.
          </li>
          <li>
            <strong>Analítica (solo si aceptas):</strong> identificador de visitante y rutas
            visitadas, guardados en base de datos para el panel de administración.
          </li>
        </ul>
      </section>
      <section>
        <h2 className="font-display text-2xl">3. Finalidades y bases</h2>
        <p className="mt-3">
          Prestación del servicio (cuenta, lectura, comentarios), seguridad, envío de la newsletter
          si te suscribes, y —con tu consentimiento— medición agregada de uso. Base legal: ejecución
          del contrato/servicio, interés legítimo en seguridad del sitio, y consentimiento para
          cookies no esenciales.
        </p>
      </section>
      <section>
        <h2 className="font-display text-2xl">4. Cookies</h2>
        <p className="mt-3">Usamos tres capas:</p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            <strong>Esenciales:</strong> sesión de login, preferencia de consentimiento,
            mantenimiento. Sin ellas la web no funciona bien.
          </li>
          <li>
            <strong>Analítica:</strong> cookie de visitante y recuento de páginas. Si das
            consentimiento, las visitas se guardan en nuestra base de datos para el panel admin. No
            vendemos perfiles a redes publicitarias.
          </li>
          <li>
            <strong>Marketing:</strong> categoría reservada; hoy no cargamos píxeles de terceros
            salvo que lo actives y lo indiquemos aquí.
          </li>
        </ul>
        <p className="mt-3">
          Puedes elegir «Solo esenciales», «Aceptar todo» o configurar categorías en el banner de
          cookies (también desde el pie: Cookies).
        </p>
      </section>
      <section>
        <h2 className="font-display text-2xl">5. Conservación</h2>
        <p className="mt-3">
          Los datos de cuenta se conservan mientras la cuenta exista. Los de newsletter hasta que te
          desuscribas. El consentimiento de cookies se guarda hasta unos 13 meses o hasta que lo
          cambies.
        </p>
      </section>
      <section>
        <h2 className="font-display text-2xl">6. Encargados</h2>
        <p className="mt-3">
          Usamos proveedores de infraestructura (hosting, base de datos/auth tipo Supabase, envío de
          correo) que tratan datos bajo contrato y solo para operar el servicio.
        </p>
      </section>
      <section>
        <h2 className="font-display text-2xl">7. Tus derechos</h2>
        <p className="mt-3">
          Según la normativa aplicable puedes solicitar acceso, rectificación, supresión, limitación
          u oposición, y retirar el consentimiento de cookies no esenciales en cualquier momento.
          También puedes reclamar ante la autoridad de protección de datos de tu país (en España, la
          AEPD).
        </p>
      </section>
      <section>
        <h2 className="font-display text-2xl">8. Menores</h2>
        <p className="mt-3">
          El sitio no está dirigido a menores de 14 años. Si detectamos una cuenta de un menor sin
          base legal, la eliminaremos.
        </p>
      </section>
    </>
  );
}
