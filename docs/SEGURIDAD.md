# Auditoría de seguridad — octubre de 2026

Revisión completa de Stats después de sumar el email a las cuentas y el panel de administración.

**Resultado:** no se encontró ninguna falla grave. Se arreglaron 8 puntos mejorables (abajo). No hay claves filtradas
en el código ni en el historial de git, y las dependencias que se publican no tienen vulnerabilidades conocidas.

## Qué se revisó

- Cuentas: registro, ingreso, sesión, cambio de contraseña y de email, borrado.
- Email: confirmación, recuperación de usuario y contraseña, contenido de los correos.
- Panel de administración y su API.
- Todas las rutas de la API (`/api/account`, `/api/admin`, `/api/search`, `/api/nft/search`, `/api/cron/*`).
- Encabezados de seguridad, cookies, redirecciones y enlaces por idioma.
- Secretos: el repositorio, todo el historial de git y lo que se sube a Vercel.
- Dependencias (`npm audit`).
- Gasto: que nadie pueda agotar los planes gratis a propósito.

## Lo que se encontró y se arregló

| # | Qué pasaba | Cómo quedó |
|---|---|---|
| 1 | Con una sesión robada (por ejemplo, una computadora prestada sin cerrar sesión) se podían probar contraseñas sin límite en "cambiar email", "cambiar contraseña" o "borrar cuenta". | Esas acciones cuentan los intentos fallidos igual que el ingreso: a los 10 se bloquea esa conexión 15 minutos. |
| 2 | Alguien podía crear muchas cuentas con el email de otra persona para llenarle la casilla de correos. | Máximo 5 correos de confirmación por hora a una misma dirección, sin importar cuántas cuentas la usen. |
| 3 | En "¿Te olvidaste…?", la respuesta tardaba más cuando el email tenía cuenta (porque se mandaba el correo), y eso dejaba averiguar quién está registrado. | El correo sale después de responder: la respuesta es igual y tarda lo mismo siempre. |
| 4 | Un enlace para cambiar la contraseña seguía sirviendo aunque la persona hubiera cambiado su email después. | Cada enlace queda atado al email al que se mandó: si el email cambia, los enlaces viejos dejan de servir. |
| 5 | Si alguien registraba el nombre de usuario del dueño antes que él, y ese nombre estaba en `ADMIN_USERS`, entraba al panel. | Con los correos activos, el panel exige además el email confirmado. Y la guía dice crear la cuenta antes de poner `ADMIN_USERS`. |
| 6 | Los respaldos `PortfolioLC-*.bundle` de la carpeta no van a GitHub, pero sí se subían a Vercel al publicar. | Quedan fuera de lo que se sube (`.vercelignore`). |
| 7 | El HTTPS forzado (HSTS) dependía de lo que pone Vercel por su cuenta. | El sitio lo manda siempre: 2 años, también para subdominios. |
| 8 | Cada visita consultaba la cuenta en el servidor, aunque la persona nunca hubiera creado una. Un ataque de tráfico podía gastar el cupo gratis de la base. | Quien no usó nunca una cuenta en ese navegador solo pide una respuesta fija que guarda el CDN: no gasta la base ni el servidor. |

## Cómo está protegido

**Contraseñas y sesión**
- Cifradas con scrypt y una sal distinta por cuenta: nadie puede leerlas, ni quien administra el sitio.
- Mínimo 10 caracteres; se rechazan las muy comunes y las que contienen el nombre de usuario.
- La sesión es una cookie firmada (HMAC-SHA256), `HttpOnly` (la página no la puede leer), `SameSite=Lax`, `Secure` en
  HTTPS, de 30 días. Cambiar o recuperar la contraseña, o que la cuenta sea bloqueada, cierra todas las sesiones.
- Ingreso: el mismo mensaje para "no existe" y "contraseña incorrecta", y el mismo tiempo de respuesta.
- Bloqueos: 10 fallos desde una conexión (15 min), 100 fallos de una cuenta desde muchas conexiones (15 min; el dueño
  lo destraba recuperando la cuenta por email o desde el panel), 30 intentos por conexión, 5 registros por hora.

**Email y enlaces**
- Los enlaces llevan un código aleatorio de 32 bytes. En la base se guarda solo su huella (SHA-256), no el código.
- Confirmar el email vence en 24 horas; cambiar la contraseña, en 1 hora y sirve una sola vez.
- Al abrir el enlace, el código se saca enseguida de la dirección y la página no se lo pasa a otros sitios
  (`Referrer-Policy: no-referrer`).
- Los enlaces se arman con la dirección oficial del sitio, nunca con la que mande el navegador.
- En los correos todo lo variable se escapa (no se puede meter HTML) y nunca se pide la contraseña.
- La recuperación solo funciona con email confirmado, responde siempre lo mismo y tiene límites: 3 pedidos por hora
  por email y 10 por conexión.
- La conexión con el servidor de correo es siempre cifrada (TLS).

**Panel de administración**
- Solo para las cuentas de `ADMIN_USERS`. A cualquier otra persona le responde "no existe" (ni confirma que haya panel).
- Cada pedido vuelve a comprobar la sesión. Las acciones solo se aceptan desde el propio sitio.
- Muestra los emails ocultos en parte (`lu***@gmail.com`) y la configuración solo como "sí / no", nunca los valores.
- No se puede bloquear ni borrar la propia cuenta; borrar pide escribir el nombre de la cuenta.
- Todo queda anotado en el registro de acciones (últimas 200).

**Sitio y API**
- Contra CSRF: las acciones solo aceptan pedidos JSON que vienen del propio sitio.
- Encabezados: CSP (solo el propio sitio, Habbo e Immutable), no se puede embeber en otros sitios, `nosniff`,
  `Referrer-Policy`, `Permissions-Policy`, HSTS y sin `X-Powered-By`.
- Las respuestas con datos de una cuenta nunca se guardan en caché (`no-store`).
- Entradas validadas: usuarios con formato fijo, emails sin espacios ni caracteres raros (no se pueden inyectar
  encabezados en los correos), hoteles contra una lista fija, búsquedas recortadas, cuerpos de hasta 64 KB.
- La base solo se usa por HTTPS y solo con dominios de Upstash; los comandos no se arman con texto suelto.
- Los escaneos (`/api/cron/*`) exigen `CRON_SECRET`, comparado en tiempo constante.

**Secretos**
- Revisados el código, todo el historial de git y lo que se publica: no aparece ningún token ni clave.
- `.env*` y `.data/` están fuera de git y de lo que se sube a Vercel.

## Riesgos que se aceptan (y por qué)

- **ESLint usa una librería (`braces`) con un aviso** de que un patrón muy raro la puede colgar. Es una herramienta
  para revisar el código en la PC: no forma parte de la web publicada y todavía no hay versión arreglada.
- **La CSP permite scripts en línea.** Las páginas son estáticas (por eso son rápidas y gratis) y Next.js necesita esos
  scripts. React escapa todo el texto, así que no hay por dónde meter código.
- **El registro dice "ese nombre ya existe".** Es inevitable para elegir un nombre de usuario.
- **Un ataque muy grande podría agotar el cupo gratis de Upstash (500.000 operaciones por mes).** Las cuentas dejarían
  de andar hasta el mes siguiente, pero la web sigue funcionando y nunca se cobra nada.
- **Los límites rápidos viven en la memoria de cada servidor.** Los importantes (contraseñas, registros, correos) se
  guardan en la base y valen para todos.

## Recomendaciones para vos

1. Verificación en dos pasos en GitHub, Vercel, Upstash y en la cuenta de Gmail del sitio.
2. La contraseña de aplicación de Gmail, solo en Vercel y marcada como *Sensitive*.
3. Crear tu cuenta en la web **antes** de poner tu usuario en `ADMIN_USERS`, y confirmar tu email.
4. Agregar `SESSION_SECRET` (32 caracteres o más) en Vercel, para no depender del token de la base.
5. Si sospechás que se filtró algo: cambiá ese valor en Vercel (y la contraseña de aplicación en Google) y volvé a
   publicar. Cambiar `SESSION_SECRET` cierra todas las sesiones.

## Cómo se probó

- Pruebas automáticas de las cuentas: registro, ingreso, bloqueos, sesión robada, recuperación, enlaces de un solo
  uso, límites de correos, escape del HTML de los correos y permisos del panel.
- Pruebas en el navegador (computadora y celular): crear cuenta, confirmar el email con el enlace del correo,
  recuperar la cuenta desde otro navegador, panel de administración (bloquear, borrar con confirmación, registro),
  pedidos desde otros sitios rechazados y encabezados de seguridad.
