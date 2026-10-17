# Furnímetro — precios del Marketplace de Habbo

Web para seguir el **Marketplace de furnis de Habbo**: precio mínimo publicado, cuántos hay a la venta, promedios,
evolución del precio, rankings (más vendidos, mayores subas y bajas, más publicados) y **alertas** cuando un furni
aparece por debajo de su precio normal.

> Sitio de fans, gratuito y sin fines comerciales. No es oficial y no está afiliado, patrocinado ni aprobado por
> Sulake Oy ni Azerion. Habbo es una marca registrada de Sulake Oy.

## Qué hace

- **Buscador** de los ~13.700 furnis intercambiables de cada hotel (sin importar acentos).
- **Ficha de cada furni**: precio mínimo publicado y ofertas abiertas **consultados en vivo**, promedio de 7 y 30 días,
  variación semanal, gráfico de precio (promedio diario + precio mínimo publicado), gráfico de unidades vendidas y tabla.
- **Rankings**: más vendidos, más créditos movidos, mayores subas, mayores bajas, más caros y más publicados.
- **Ofertas detectadas**: furnis cuyo precio mínimo está al menos 25 % por debajo de su promedio reciente, con botón para
  verificarlas en vivo.
- **Alertas**: lista de furnis a vigilar con un umbral (% bajo el promedio o precio máximo). Avisa con notificaciones
  del navegador, y opcionalmente por **Discord** o **Telegram** desde el servidor.
- Hoteles **.es**, **.com** y **.com.br** por defecto (se pueden sumar .de, .fr, .it, .nl, .fi y .com.tr).
- Tema oscuro, responsive, identidad propia.

## Qué datos son reales (y qué no)

Todo sale de la **API pública y documentada de Habbo** y del **furnidata** público. No se usan cuentas, contraseñas ni
scraping. El detalle completo, con lo que se probó y lo que no se pudo verificar, está en
[docs/INVESTIGACION.md](docs/INVESTIGACION.md). En resumen:

| Dato | De dónde sale | Qué tan actual |
| --- | --- | --- |
| Precio mínimo y ofertas abiertas (ficha) | API de Habbo, consultada desde el navegador | en el momento (se reutiliza 1 min) |
| Historial diario (promedio, vendidos) | API de Habbo | hasta ayer, últimos 30 días |
| Historial de más de 30 días y del precio mínimo | guardado por el recolector de este proyecto | desde que empezó a correr |
| Rankings y ofertas detectadas | recolector | último escaneo de cada furni (se muestra "hace X") |

**Límites importantes:**

- La API **no muestra cada publicación** (ni vendedor, ni hora): solo el precio mínimo y la cantidad de ofertas al
  consultar. Las alertas detectan "el precio mínimo bajó del umbral en el último chequeo"; si alguien publica barato y
  otro compra entre dos chequeos, no se ve.
- La API **limita los pedidos** (medido: ~15-20 por minuto por IP, 25 + 25 furnis por pedido). Un recorrido completo
  de un hotel son ~523 pedidos (~45 min). Por eso el recolector es **rotativo**: cada corrida actualiza primero lo más
  activo y lo más desactualizado.
- En el plan gratuito de Vercel los cron corren **una vez por día** y cada función dura como máximo 5 minutos.

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

Abrí <http://localhost:3000> (redirige a `/es`). Los datos quedan en `.data/` (comprimidos). Para otros hoteles:
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
4. Desplegá. `vercel.json` ya trae un cron diario por hotel (`/api/cron/scan?hotel=...`) y uno de alertas. Si cambiás
   `NEXT_PUBLIC_HOTELS`, ajustá también esos cron.
5. Para no esperar días a que se llene, juntá los datos en tu PC (`npm run collect -- es --full`, etc.) y subilos al
   Blob: `vercel env pull .env.vercel` y después `npm run push-data`. (`.env.vercel` queda fuera de git.)

Cada corrida escribe 2 archivos por hotel; con un cron por día y por hotel se usan ~200 de las 2.000 escrituras
mensuales gratuitas de Vercel Blob. Si sumás más cron jobs o un cron externo, tenelo en cuenta.

## Alertas

### En el navegador (sin configurar nada)

En **Alertas** (o con el botón **Vigilar precio** de cada furni) armás tu lista. La pestaña del sitio revisa la lista
cada 2 a 30 minutos (elegís vos), directo contra la API de Habbo, y avisa con una **notificación del navegador** y un
aviso en la página. La lista y las detecciones quedan solo en tu navegador. Funciona mientras haya una pestaña del
sitio abierta (puede estar en segundo plano).

### Desde el servidor: Discord o Telegram (opcional)

Sirve para recibir avisos con el navegador cerrado, en tu propia copia del sitio:

1. En la página **Alertas**, copiá el JSON de la sección "Avisos con la pestaña cerrada" y guardalo en la variable
   `ALERTS_RULES`.
2. Elegí un canal:
   - **Discord** (el más simple): en tu servidor, *Editar canal → Integraciones → Webhooks → Nuevo webhook*, copiá la
     URL y guardala en `DISCORD_WEBHOOK_URL`.
   - **Telegram**: creá un bot con [@BotFather](https://t.me/BotFather), guardá el token en `TELEGRAM_BOT_TOKEN`,
     escribile al bot y poné tu `chat_id` en `TELEGRAM_CHAT_ID`.
3. Opcional: `ALERTS_DEALS_MIN_DISCOUNT=40` avisa también de cualquier oferta 40 % o más por debajo del promedio que
   aparezca en un escaneo.

Las alertas del servidor se revisan después de cada corrida del recolector y en `/api/cron/alerts` (consulta solo los
furnis de tus reglas: 1 o 2 pedidos). En el plan gratuito ese cron corre una vez por día; para revisarlas más seguido
podés llamar a `/api/cron/alerts` desde un servicio de cron externo con el encabezado
`Authorization: Bearer <CRON_SECRET>`, o correr `npm run alerts` en tu PC.

El service worker (`public/sw.js`) ya maneja mensajes **Web Push**; para usarlos con la pestaña cerrada faltaría
guardar las suscripciones en el servidor.

## Variables de entorno

Todas están explicadas en [.env.example](.env.example).

## Estructura

```
src/
  app/                 páginas (/[hotel], /[hotel]/furni/[classname], rankings, ofertas, alertas, acerca) y rutas API
  components/          interfaz, gráficos SVG y alertas del navegador
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
