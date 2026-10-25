# Stats — precios del Marketplace de Habbo

Web para seguir el **Marketplace de furnis de Habbo**: precio mínimo publicado, cuántos hay a la venta, promedios,
evolución del precio, rankings (más vendidos, mayores subas y bajas, más publicados) y **alertas** cuando un furni
aparece por debajo de su precio normal.

**Sitio publicado:** <https://habbo-marketplace-three.vercel.app>

> En construcción. Gratuito y sin fines comerciales. No es oficial y no está afiliado, patrocinado ni aprobado por
> Sulake Oy ni Azerion. Habbo es una marca registrada de Sulake Oy.

## Qué hace

- **Buscador** de los ~13.700 furnis intercambiables de cada hotel (sin importar acentos).
- **Ficha de cada furni**: precio mínimo publicado y ofertas abiertas **consultados en vivo**, promedio de 7 y 30 días,
  variación semanal, gráfico de precio (promedio diario + precio mínimo publicado), gráfico de unidades vendidas y tabla.
- **Rankings**: más vendidos, más créditos movidos, mayores subas, mayores bajas, más caros y más publicados.
- **Categorías**: los furnis por tipo, uso o colección, con subcategorías (Asientos → sofás, sillas, tronos;
  Pisos → alfombras, baldosas; Rares → clásicos, LTD; Colecciones → Pura, Iced, Mode...). El buscador las entiende:
  escribir "pisos" o "sofás" ofrece ver todos.
- **Ofertas detectadas**: furnis cuyo precio mínimo está al menos 25 % por debajo de su promedio reciente, con botón para
  verificarlas en vivo.
- **Alertas**: lista de furnis a vigilar con un umbral (% bajo el promedio o precio máximo). Avisa con notificaciones
  del navegador, y opcionalmente por **Discord** o **Telegram** desde el servidor. La lista queda guardada en el
  navegador y, con una **cuenta** (usuario y contraseña), en cualquier dispositivo.
- Hoteles **.es**, **.com** y **.com.br** por defecto (se pueden sumar .de, .fr, .it, .nl, .fi y .com.tr).
- **Tres idiomas:** español, portugués e inglés; cada visitante elige con el selector ES · PT · EN.
- **Cielo de estrellas** de fondo: titilan, se unen al mouse con líneas y **explotan al tocarlas**. Se puede apagar desde
  el pie de página y respeta la opción "reducir movimiento" del sistema.
- **Aviso de cookies** y página de privacidad: lo necesario siempre, las preferencias solo si la persona acepta.
- Tema oscuro (créditos en violeta, NFT en dorado), responsive, identidad propia.
- **Gratis:** todo entra en los planes gratuitos; ver [docs/COSTOS.md](docs/COSTOS.md) (cuánta gente aguanta y qué pasa
  si se pasa).

## Sección NFT (separada)

En `/nft` hay una sección aparte para los **coleccionables NFT oficiales de Habbo** (Furni, Clothes, Pets, Tokens y
Add-ons en la blockchain Immutable zkEVM). Tiene su propio color (dorado; el Marketplace es violeta), su propio menú y un aviso fijo; arriba de todo
hay un selector "Marketplace · créditos | NFT · blockchain" para que nunca se mezclen.

- Precio piso, mejor oferta de compra, última venta y publicaciones más baratas **en vivo** (desde el navegador).
- Ventas por día y promedio en USD, rankings (más vendidos, dólares movidos, subas, bajas, ofertas, más caros) por
  colección o en total, y buscador.
- **Movimiento de cada colección**: cuántas se venden, se acuñan (nuevas) y se queman por día, y cuántas existen
  (suma de las unidades de todos sus modelos), con gráficos de 30 días y una tabla comparativa en el inicio NFT. Se
  cuenta en el cron diario: la primera vez carga 7 días (con tope de páginas; en Furnis, que se mueve mucho, puede
  quedar menos) y después suma día a día.
- Datos: API pública de Immutable (sin clave, máx. 5 pedidos por segundo) y cotizaciones de su servicio de conversión.
  El recolector (`npm run collect:nft`, cron diario `/api/cron/nft`) guarda historial de ventas y del piso.
- No incluye Immutable X (su API ya no responde) ni los avatares en Ethereum (requieren servicios con clave).
- No es asesoramiento financiero; los dólares son aproximados.

## Idiomas

| Idioma | Direcciones | Ejemplo |
| --- | --- | --- |
| Español | sin prefijo (como siempre) | `/es`, `/com/furni/throne`, `/nft` |
| Português | `/pt/...` | `/pt/br`, `/pt/nft` |
| English | `/en/...` | `/en/com`, `/en/nft/rankings` |

- Cada idioma tiene sus propias páginas estáticas, así el CDN las sirve sin ejecutar código (importante para el plan
  gratis). Internamente las páginas viven en `src/app/[lang]/...`; el español se sirve sin prefijo con una reescritura
  en `next.config.ts` (`src/lib/i18n/routing.ts`).
- La portada `/` lleva al idioma elegido antes (cookie `fm_lang`, solo guarda `es`, `pt` o `en`) o, si no hay, al del
  navegador. Español → hotel .es, português → .com.br, English → .com.
- Se traduce la interfaz. Los nombres de furnis vienen del furnidata de cada hotel (en el idioma de ese hotel) y los de
  los NFT, de Immutable (en inglés).
- Los textos están en `src/lib/i18n/ui/` (los que usa el navegador) y `src/lib/i18n/pages/` (los de cada página). Una
  prueba verifica que los tres idiomas tengan exactamente las mismas claves.

## SEO

- Cada página tiene título y descripción propios (con el hotel y el idioma), dirección canónica, sus versiones en los
  otros idiomas (`hreflang`) y tarjeta para compartir (Open Graph). Todo sale de `pageMeta()` en `src/lib/i18n/seo.ts`.
- Imágenes para compartir en `public/og/` (Marketplace y NFT, en los 3 idiomas). Se regeneran con `npm run og-images`.
- `/sitemap.xml`: páginas principales y los 500 furnis y 200 NFT más activos, en los 3 idiomas (unas 5.300 direcciones).
  No van todos los furnis a propósito: Google encuentra el resto siguiendo enlaces, sin gastar de golpe el plan gratis.
- `/robots.txt`: todo indexable menos `/api/`, las búsquedas internas y la página del dueño.
- Para Google Search Console: verificá el sitio con la etiqueta HTML y cargá su código en `GOOGLE_SITE_VERIFICATION`;
  después enviá `https://<tu-dominio>/sitemap.xml`.

## Cuentas (opcional)

Con una cuenta, la lista de alertas se guarda también en el servidor y aparece en cualquier dispositivo. Sin cuentas
configuradas, la web funciona igual (la lista queda en el navegador) y el botón "Entrar" no aparece.

- **Usuario, email y contraseña.** El email se confirma con un enlace (vence en 24 h) y sirve para recuperar la cuenta:
  "¿Te olvidaste el usuario o la contraseña?" manda el usuario y un enlace de un solo uso (vence en 1 hora) para elegir
  una contraseña nueva. Cambiar el email pide la contraseña.
- Contraseñas cifradas con scrypt (sal propia por cuenta), sesión en una cookie firmada `HttpOnly`/`SameSite=Lax` de
  30 días, bloqueo por intentos fallidos (por conexión y por cuenta), límite de registros y de correos, protección
  contra CSRF (solo pedidos del propio sitio) y nombres reservados (admin, bomhams, habbo...). Cambiar o recuperar la
  contraseña cierra las otras sesiones; la cuenta se puede borrar desde "Mi cuenta".
- **Base de datos**: Upstash Redis, gratis (500.000 operaciones y 250 MB por mes). En Vercel: *Storage → Create
  Database → Upstash for Redis* (plan gratis) y conectarla al proyecto: agrega `KV_REST_API_URL` y `KV_REST_API_TOKEN`.
  Después, volver a desplegar. Quien entra a la web sin haber usado nunca una cuenta no gasta operaciones de la base.
- **Correos**: por SMTP, con cualquier servicio gratis. Lo más simple: una cuenta de Gmail solo para el sitio, con
  verificación en dos pasos y una "contraseña de aplicación" (hasta ~500 correos por día):
  `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER`, `SMTP_PASS` y `MAIL_FROM`. Sin esto, las cuentas funcionan
  pero no se puede confirmar el email ni recuperar la cuenta.
- **Panel de administración** (`/admin`): estado de los escaneos, configuración (sin mostrar secretos), cuentas (con el
  email oculto en parte), bloquear, destrabar o borrar cuentas, actualizar páginas, probar los canales y un registro de
  acciones. Solo lo ven las cuentas de `ADMIN_USERS` (separadas por coma) y, con los correos activos, con el email
  confirmado. Primero creá tu cuenta y después poné tu usuario en `ADMIN_USERS`.
- Opcional: `SESSION_SECRET` (32 caracteres o más) para firmar las sesiones; si no está, se deriva del token de la base.
- Para probar en la PC sin base: `ACCOUNTS_DEV_STORE=1` guarda las cuentas en `.data/accounts-dev.json` y los correos en
  `.data/mail-outbox.json` (nunca se usa en Vercel).

## Qué datos son reales (y qué no)

Todo sale de la **API pública y documentada de Habbo** y del **furnidata** público. No se usan cuentas, contraseñas ni
scraping. El detalle completo, con lo que se probó y lo que no se pudo verificar, está en
[docs/INVESTIGACION.md](docs/INVESTIGACION.md). En resumen:

| Dato | De dónde sale | Qué tan actual |
| --- | --- | --- |
| Precio mínimo y ofertas abiertas (ficha) | API de Habbo, consultada desde el navegador | en el momento (se reutiliza 1 min) |
| Historial diario (promedio, vendidos) | API de Habbo | hasta ayer, últimos 30 días |
| Historial de más de 30 días y del precio mínimo | guardado por el recolector de este proyecto | desde que empezó a correr |
| Precio mínimo y ofertas en categorías y rankings | API de Habbo, desde el navegador, solo lo que está en pantalla | en el momento (punto verde; se actualiza cada 90 s) |
| Rankings y ofertas detectadas | recolector, cada 3 horas por hotel | último escaneo de cada furni (se muestra "hace X") |

**Límites importantes:**

- La API **no muestra cada publicación** (ni vendedor, ni hora): solo el precio mínimo y la cantidad de ofertas al
  consultar. Las alertas detectan "el precio mínimo bajó del umbral en el último chequeo"; si alguien publica barato y
  otro compra entre dos chequeos, no se ve.
- La API **limita los pedidos** (medido: ~15-20 por minuto por IP, 25 + 25 furnis por pedido). Un recorrido completo
  de un hotel son ~523 pedidos (~45 min). Por eso el recolector es **rotativo**: cada corrida actualiza primero lo más
  activo y lo más desactualizado.
- En el plan gratuito de Vercel cada cron corre **una vez por día** (hasta 100 por proyecto) y cada función dura como
  máximo 5 minutos. Por eso `vercel.json` tiene 24 cron de escaneo: 8 por hotel, uno cada 3 horas.
- El límite real es el de **Vercel Blob: 2.000 escrituras por mes** (si se pasa, el almacenamiento queda bloqueado 30
  días). Cada escaneo escribe solo el resumen; el historial se guarda como mucho cada 8 horas
  (`SCAN_HISTORY_EVERY_MINUTES`). Con eso se usan unas 1.240 escrituras por mes; `tests/unit/limits.test.ts` hace la
  cuenta y falla si un cambio en `vercel.json` se pasa de 1.500.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, Cache Components) + React 19 + TypeScript
- Tailwind CSS 4
- Gráficos SVG propios (sin librerías de gráficos)
- Vercel Blob para guardar los datos en producción; carpeta `.data/` en local
- Vitest (unitarias y contrato con la API real) y Playwright (punta a punta)

## Correr en local

Requisitos: Node.js 22 o más nuevo.

```bash
npm install
```

Juntar datos reales del hotel .es. Una corrida rápida (~4 minutos, ~1.200 furnis):

```bash
npm run collect -- es
```

O el catálogo completo (~45 minutos, a 12 pedidos por minuto):

```bash
npm run collect -- es --full
```

Levantar la web:

```bash
npm run dev
```

Abrí <http://localhost:3000> (redirige según tu idioma: `/es`, `/pt/br` o `/en/com`). Los datos quedan en `.data/` (comprimidos). Para otros hoteles:
`npm run collect -- com br`.

Si querés que se actualice solo en tu PC, podés programar `npm run collect` en el Programador de tareas de Windows
(por ejemplo, cada 2 horas).

## Pruebas

```bash
npm test               # unitarias (lógica, API simulada)
npm run test:live      # contrato con la API real de Habbo (4 pedidos)
npm run typecheck
npm run lint
npm run build
npm run test:e2e       # punta a punta con Playwright, sobre el build y los datos de .data/
```

Para `test:e2e` hace falta el navegador de Playwright una vez: `npx playwright install chromium`.

## Publicar en Vercel (gratis)

1. Importá el repositorio en Vercel (framework: Next.js; no hace falta configurar nada más para compilar).
2. En **Storage**, creá un **Blob store privado** y conectalo al proyecto: se agrega solo la variable
   `BLOB_READ_WRITE_TOKEN`. (Si lo creás público, agregá `BLOB_ACCESS=public`.)
3. En **Settings → Environment Variables** agregá:
   - `CRON_SECRET`: un texto largo al azar (protege `/api/cron/*`; Vercel lo manda solo en sus cron jobs).
   - `SITE_URL`: la URL pública (para los enlaces de los avisos).
   - Opcional: `NEXT_PUBLIC_HOTELS` (por defecto `es,com,br`).
4. Desplegá. `vercel.json` ya trae 8 escaneos por día por hotel (`/api/cron/scan?hotel=...`; el marcado con
   `&avisos=1` es el que publica las ofertas en los canales), uno de alertas y uno de NFT. Si cambiás
   `NEXT_PUBLIC_HOTELS`, ajustá también esos cron.
5. Para no esperar días a que se llene, juntá los datos en tu PC (`npm run collect -- es --full`, etc.) y subilos al
   Blob: `vercel env pull .env.vercel` y después `npm run push-data`. (`.env.vercel` queda fuera de git.) Para la sección NFT: `npm run collect:nft -- --dias 14` y
   `npm run push-data -- nft`.

Si desplegás con el CLI (`vercel deploy --prod`), `.vercelignore` evita que se suban `.env*` y `.data/`: el CLI de
Vercel **no** respeta `.gitignore`. Para que cada push a GitHub se despliegue solo, conectá el repositorio en
*Settings → Git* del proyecto (la app de Vercel en GitHub tiene que tener acceso al repo).

Cada escaneo escribe 1 archivo (y el historial, como mucho cada 8 horas): con los cron de `vercel.json` se usan unas
1.240 de las 2.000 escrituras mensuales gratuitas de Vercel Blob. No sumes cron externos sin rehacer esa cuenta.

## Alertas

### En el navegador (sin configurar nada)

En **Alertas** (o con el botón **Vigilar precio** de cada furni) armás tu lista. La pestaña del sitio revisa la lista
cada 2 a 30 minutos (elegís vos), directo contra la API de Habbo, y avisa con una **notificación del navegador** y un
aviso en la página. La lista y las detecciones quedan solo en tu navegador. Funciona mientras haya una pestaña del
sitio abierta (puede estar en segundo plano).

### Canales públicos: Discord, Telegram y WhatsApp

Los visitantes ven botones para unirse con un toque. Después de cada escaneo, el servidor publica en Discord y Telegram
las ofertas más fuertes (por defecto, 30 % o más por debajo de lo que se pagó esa semana; hasta 10 por vez y sin
repetir). Los pasos están en `/es/alertas/servidor` (página sin enlaces desde el sitio):

1. **Telegram:** canal público + bot creado con [@BotFather](https://t.me/BotFather), agregado al canal como
   administrador. Variables: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (ej. `@TuCanalDeOfertas`) y
   `NEXT_PUBLIC_TELEGRAM_URL` (ej. `https://t.me/TuCanalDeOfertas`).
2. **Discord:** webhook del canal de ofertas (`DISCORD_WEBHOOK_URL`) e invitación que no venza (`NEXT_PUBLIC_DISCORD_URL`).
3. **WhatsApp:** enlace del canal (`NEXT_PUBLIC_WHATSAPP_URL`). WhatsApp no ofrece una forma oficial de publicar en canales
   automáticamente (los servicios que lo hacen usan sesiones no oficiales y pueden bloquear el número), así que ahí se
   publica a mano.
4. Volvé a desplegar y probá con `/api/cron/alerts?prueba=1` (encabezado `Authorization: Bearer <CRON_SECRET>`).

`ALERTS_DEALS_MIN_DISCOUNT` cambia el umbral (0 desactiva la publicación). Aunque haya escaneos cada 3 horas, las
ofertas se publican en los canales una vez por día por hotel (en el escaneo marcado con `&avisos=1`).

**Tu lista personal (opcional):** armá tu lista en **Alertas**, abrí `/es/alertas/servidor`, tocá **Copiar mi lista** y
guardala en `ALERTS_RULES`. Esos avisos salen por los mismos canales. `/api/cron/alerts` revisa solo esos furnis (1 o 2
pedidos); para que corra más seguido que una vez por día podés llamarlo desde un servicio de cron externo con el
encabezado `Authorization: Bearer <CRON_SECRET>`, o correr `npm run alerts` en tu PC.

El service worker (`public/sw.js`) ya maneja mensajes **Web Push**; para usarlos con la pestaña cerrada faltaría
guardar las suscripciones en el servidor.

## Seguridad

- **Cuentas mínimas:** usuario, email, contraseña cifrada (scrypt) y la lista de alertas. Sesión firmada `HttpOnly`,
  bloqueo por intentos fallidos, enlaces de un solo uso, protección CSRF y borrado de cuenta (ver "Cuentas"). La
  auditoría completa está en [docs/SEGURIDAD.md](docs/SEGURIDAD.md).
- **Secretos solo en el servidor:** `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET` y los de Discord/Telegram nunca llegan al
  navegador (solo las variables `NEXT_PUBLIC_*` se publican). `.env*` está fuera de git y de los despliegues
  (`.gitignore` y `.vercelignore`).
- **Rutas del recolector protegidas:** `/api/cron/*` exigen `Authorization: Bearer <CRON_SECRET>` (comparación en
  tiempo constante); en producción, sin secreto configurado, responden 401.
- **Encabezados:** CSP que solo permite el propio sitio, la API de Habbo y su CDN de imágenes; `frame-ancestors 'none'`
  y `X-Frame-Options: DENY` (no se puede embeber en otro sitio), `nosniff`, `Referrer-Policy`, `Permissions-Policy` y
  HTTPS forzado (HSTS de 2 años). No se anuncia el framework (`X-Powered-By`).
- **Entradas validadas:** hoteles contra una lista fija, búsquedas recortadas a 60 caracteres, classnames con formato
  estricto (sin `__proto__` ni caracteres raros), reglas de alerta validadas. React escapa todo el texto; no hay HTML
  sin escapar.
- **Sin SSRF:** el servidor solo se conecta a los dominios de Habbo, Discord (webhook validado) y Telegram.
- **Límite de búsquedas:** 60 por minuto por IP en `/api/search`; las repetidas las sirve la caché del CDN.
- **Notificaciones:** el service worker solo abre páginas del propio sitio.
- **Dependencias:** `npm audit --omit=dev` sin vulnerabilidades (las que marca `npm audit` completo son de ESLint, que
  no se publica).
- **Enlaces y redirecciones:** las direcciones por idioma se arman siempre como rutas del propio sitio (nunca `//otro`),
  y las redirecciones tienen destinos fijos: no se pueden usar para mandar a alguien a otro sitio.
- **Sin secretos filtrados:** revisado el repositorio, todo el historial de git y lo que se compila (lo que baja el
  navegador y lo del servidor): no aparece ningún token ni clave.
- **Ataques de tráfico:** Vercel los bloquea solo y no cuenta ese tráfico; si hiciera falta, en *Firewall* se prende
  **Attack Mode** (gratis). Detalle en [docs/COSTOS.md](docs/COSTOS.md).

Recomendado en tus cuentas: verificación en dos pasos en GitHub y Vercel, y las alertas de Dependabot activadas en el
repositorio. Si alguna vez sospechás que se filtró un token, rotalo en Vercel (Storage → Blob → token, y la variable
`CRON_SECRET`) y volvé a desplegar.

## Variables de entorno

Todas están explicadas en [.env.example](.env.example).

## Estructura

```
src/
  app/[lang]/          páginas por idioma: [hotel] (inicio, furni, categorías, rankings, ofertas, alertas, cuenta,
                       privacidad, acerca) y nft/
  app/api/             rutas API (búsqueda, cuentas y cron)
  lib/accounts/        cuentas: base de datos, contraseñas, sesión y sincronización de alertas
  components/          interfaz, gráficos SVG, alertas del navegador y fondo de estrellas
  lib/i18n/            idiomas: textos, direcciones y formatos de números y fechas
  lib/habbo/           cliente de la API (servidor y navegador), furnidata e imágenes
  lib/market/          escaneo rotativo, resúmenes, historial, rankings y ofertas
  lib/alerts/          reglas, avisos del navegador, Discord y Telegram
  lib/storage/         almacenamiento local o Vercel Blob
scripts/               recolector y chequeo de alertas por línea de comandos
tests/                 unit, live (API real) y e2e (Playwright)
docs/INVESTIGACION.md  qué se verificó de la API, límites y términos de uso
```

## Licencia

MIT. Ver [LICENSE](LICENSE). Los nombres e imágenes de los furnis pertenecen a Sulake Oy.
