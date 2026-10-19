# Investigación: qué datos del Marketplace se pueden obtener

Fecha de las pruebas: **17 de octubre de 2026**. Todo lo marcado como "verificado" se probó con pedidos reales;
lo que no se pudo confirmar está en la sección [Lo que no se pudo verificar](#lo-que-no-se-pudo-verificar).

## 1. Endpoint oficial del Marketplace

Habbo publica la documentación de su API pública en Swagger: <https://www.habbo.com/api/public/api-docs/>
("Habbo Web API documented with Swagger"). Ahí figura un único endpoint del Marketplace:

```
POST https://www.habbo.<tld>/api/public/marketplace/stats/batch
Content-Type: application/json

{ "roomItems": [{ "item": "throne" }], "wallItems": [{ "item": "poster" }] }
```

`item` es el **classname** del furni (el mismo del furnidata). `roomItems` = furnis de suelo, `wallItems` = de pared.

Respuesta (verificada):

```json
{
  "status": "OK",
  "roomItemData": [{
    "item": "throne", "extraData": null, "statsDate": "2026-10-17",
    "history": [{ "dayOffset": "-1", "averagePrice": "2714", "totalSoldItems": "1",
                  "totalCreditSum": "2714", "totalOpenOffers": "2" }],
    "soldItemCount": 0, "creditSum": 0, "averagePrice": 2842, "totalOpenOffers": 0,
    "currentOpenOffers": 7, "currentPrice": 2849, "historyLimitInDays": 30
  }],
  "wallItemData": []
}
```

| Campo | Qué es |
| --- | --- |
| `currentPrice` | precio más bajo entre las ofertas abiertas en ese momento (0 = no hay) |
| `currentOpenOffers` | cantidad de ofertas abiertas en ese momento |
| `averagePrice` | promedio de venta informado por Habbo; coincide aprox. con el promedio ponderado de los últimos 30 días |
| `history[]` | un registro por **día con ventas**, `dayOffset` de -30 a -1 respecto de `statsDate` (el día de hoy no aparece). Los números vienen como texto |
| `historyLimitInDays` | 30 |

Comportamiento verificado:

- **Máximo 25 furnis de suelo y 25 de pared por pedido.** Con más responde `400 {"status":"NOK","message":"Too many items in the request. The maximum allowed is 25 per type."}`.
- Un furni que no existe (o mandado con el tipo equivocado) **no aparece** en la respuesta; no rompe el resto del lote.
- Funciona igual en los 9 hoteles: `.com`, `.com.br`, `.com.tr`, `.de`, `.es`, `.fi`, `.fr`, `.it`, `.nl`. Cada hotel tiene su propia economía.
- **CORS abierto**: la API responde a la consulta previa (OPTIONS) reflejando el origen, así que se puede llamar desde el navegador de cualquier sitio. No hace falta enviar cookies (`credentials: "omit"`).
- Con `Content-Type: text/plain` la API responde `463`: hay que usar `application/json` (implica una consulta previa OPTIONS desde el navegador).

### Límite de frecuencia (medido)

La API **no documenta** límites ni manda encabezados `X-RateLimit` o `Retry-After`. Medición propia, con un solo furni por pedido:

| Prueba | Resultado |
| --- | --- |
| 1 pedido cada ~1,7 s | `429` en el pedido 16 (a los ~25 s) |
| 1 pedido cada ~2 s (30/min) | `429` en el pedido 22 (a los ~41 s) |
| Tras un `429` | vuelve a responder `200` a los ~15 s |
| Escaneo completo a 15/min | aparecieron 2 respuestas `429` en ~200 pedidos |

Conclusión: el límite ronda los **15-20 pedidos por minuto por IP**. El recolector usa **12 por minuto** (1 cada 5 s),
espera 20 s o más ante un `429` y además baja el ritmo para el resto de la corrida. El `429` llega como página HTML genérica.

## 2. Catálogo de furnis (furnidata)

```
GET https://www.habbo.<tld>/gamedata/hashes2            -> hash vigente de cada archivo
GET https://www.habbo.<tld>/gamedata/furnidata_json/1   -> 307 a /gamedata/furnidata_json/<hash>
```

- ~10 MB de JSON. En `.es`: 17.509 furnis de suelo y 841 de pared.
- Cada furni trae `tradeable`: **13.741 son intercambiables** (13.058 de suelo + 683 de pared). Solo esos pueden estar en el Marketplace.
- Nombres y descripciones vienen en el idioma del hotel.
- No hay classnames repetidos entre suelo y pared.
- El recolector solo vuelve a descargarlo cuando cambia el hash de `hashes2`.

## 3. Imágenes

```
https://images.habbo.com/dcr/hof_furni/<revision>/<classname>_icon.png
```

- Verificado con `throne` (revisión 45512) y `shelves_norja`.
- Variantes de color: el `*` se reemplaza por `_` (`rare_dragonlamp*1` -> `rare_dragonlamp_1_icon.png`).
- El CDN responde con `Access-Control-Allow-Origin: *` y caché de 14 días.
- 5 furnis intercambiables tienen revisión 0 y no tienen ícono: se muestra una caja neutra.
- El sitio **no copia ni aloja** las imágenes: las enlaza al CDN de Habbo. Se pueden apagar con `NEXT_PUBLIC_FURNI_IMAGES=off`.

## 4. Términos de uso y robots.txt

Se leyeron las **Condiciones del servicio de Habbo.es** (versión 13.2.2025). Puntos relevantes:

- **Uso personal y no comercial** del contenido del servicio. → El sitio es gratuito, sin publicidad ni ventas.
- "No debe usar Contenido obtenido de nuestro Servicio, salvo en los casos en los que autoricemos el uso de
  Artículos bajo licencia de Sulake para su uso en determinados fan sites que hayamos aprobado por escrito." → Mostrar
  nombres e íconos de furnis entra en esta zona: **Sulake podría pedir que se retiren**. Por eso el sitio se presenta
  como sitio de fans no oficial, enlaza las imágenes en lugar de copiarlas y deja apagarlas con una variable. Si se va a
  promocionar públicamente, conviene pedir aprobación a Habbo como fansite.
- Los enlaces al servicio no deben usar las marcas ni sugerir asociación con Sulake. → Marca propia ("Bomhams Market"),
  aviso de "no oficial" en todas las páginas y ningún logo de Habbo.
- No se encontró ninguna cláusula específica sobre la API pública ni sobre límites de uso. La API está documentada por
  la propia Habbo en Swagger, lo que indica que está pensada para que la usen terceros.

`robots.txt` de los hoteles tiene `Disallow: /api` y `Disallow: /gamedata` para todos los robots. Eso apunta a
**buscadores y rastreadores**; acá se usan endpoints documentados como cliente de API, a bajo ritmo, sin rastrear páginas.
De todas formas se toma como señal para ser conservador: pocos pedidos, identificados con un User-Agent propio
(`habbo-marketplace/1.0 (+repo)`) y el furnidata solo cuando cambia.

No se usa scraping del sitio ni del cliente del juego, no se necesitan cuentas ni contraseñas, y no se recolectan
datos de usuarios.

## 5. ¿Hay tiempo real?

**No hay tiempo real de cada publicación.** La API da una foto del momento: precio mínimo y cantidad de ofertas, más
el historial diario. No expone cada oferta, ni su vendedor, ni la hora de publicación.

Durante ~25 minutos (8 de la mañana en España) se consultaron 10 furnis cada 3 minutos: los valores casi no cambiaron
(una oferta menos en `club_sofa` en un intervalo). No se pudo determinar si la API tiene caché propia.

Lo que hace el sitio:

- **Ficha de cada furni:** consulta en vivo desde el navegador del visitante (se reutiliza 1 minuto).
- **Rankings y ofertas:** salen del recolector, que corre de a partes (ver abajo) y muestra "último escaneo hace X".
- **Historial propio:** cada corrida guarda el precio mínimo y las ofertas abiertas (dato que la API no conserva) y los
  días de venta, para tener más de 30 días.

## 6. Cuántos pedidos hacen falta

13.741 furnis / 25 por pedido = **~523 pedidos por hotel** para un recorrido completo. A 12 por minuto son **~45 minutos**.
Una función de Vercel (plan Hobby) vive como máximo 300 s y los cron del plan gratuito corren **una vez por día**. Por
eso el recolector es **rotativo**: cada corrida (~4 min, ~48 pedidos, ~1.200 furnis de suelo + pared) elige primero:

1. los furnis de las alertas del servidor,
2. los que nunca se escanearon,
3. los más activos que hace más tiempo que no se actualizan (peso = antigüedad × log2(1 + ventas en 30 días)).

En una PC se puede correr el recorrido completo: `npm run collect -- es --full`.

## 7. Hoteles

Se soportan los 9 hoteles (la API responde en todos). Por defecto se muestran y escanean **.es** (España, en español),
**.com** (internacional, en inglés) y **.com.br** (Brasil). Se cambia con `NEXT_PUBLIC_HOTELS`. Cada hotel suma ~523
pedidos por recorrido completo.

## Lo que no se pudo verificar

- Si `currentPrice` / `currentOpenOffers` tienen caché del lado de Habbo y cada cuánto se actualizan.
- La zona horaria en que Habbo corta el día de `statsDate`.
- Qué significa exactamente `totalOpenOffers` dentro de cada día del historial (se muestra como "ofertas ese día").
- Los campos de primer nivel `soldItemCount`, `creditSum` y `totalOpenOffers` vinieron siempre en 0 en las pruebas.
- Los pósters (`poster`) comparten un classname y se distinguen por `extraData`; la API devuelve `extraData: null` y no
  documenta cómo pedir un póster en particular, así que se muestran agrupados.
- Si el límite de frecuencia es por IP, por endpoint o global (todo indica que es por IP).

## Sección NFT (agregada el 17/10/2026)

Inspirada en securehabbo.com (un marketplace de NFT de Habbo que usa Immutable Passport). Revisando su código público se
ve que toma datos de las APIs públicas de Immutable; acá se usan las mismas fuentes, **solo para leer**:

| Qué | Endpoint (verificado) |
| --- | --- |
| Colección | `GET https://api.immutable.com/v1/chains/imtbl-zkevm-mainnet/collections/{contrato}` |
| Modelos a la venta con piso, mejor oferta y última venta (en USD/ETH/IMX) | `GET .../search/stacks?contract_address=…&only_if_has_active_listings=true&page_size=200` |
| Un modelo puntual (ficha en vivo) | `GET .../stacks?stack_id=…` (varios ids por pedido) |
| Ventas | `GET .../activities?contract_address=…&activity_type=sale&page_size=200` (de la más nueva a la más vieja; el filtro por fecha se ignora) |
| A qué modelo pertenece cada token | `GET .../collections/{contrato}/nfts?token_id=…` (máximo 30 por pedido; `metadata_id` = id del modelo) |
| Cotizaciones | `GET https://checkout-api.immutable.com/v1/fiat/conversion?ids=ethereum,immutable-x,usd-coin,tether&currencies=usd` |

Colecciones oficiales (sus imágenes están en `nft-tokens.habbo.com`):

| Colección | Contrato | Modelos | A la venta (17/10/2026) |
| --- | --- | --- | --- |
| Habbo Furni | `0x33976ee1477c75171b2b34814d75ebc37413e589` | más de 8.000 | 2.161 |
| Habbo Clothes | `0xdbf185750d135ea5581f9853db9f9657fb843a62` | 1.168 | 592 |
| Habbo Pets | `0xb7727da90019d072a5f8fdd58ff4522f796a20c5` | 5 | 5 |
| Habbo Tokens | `0xe06f06a4128373ecc5444881a6a26fc18723487a` | 22 | 21 |
| Habbo Addons | `0x2da5094f8c6cd42f5b3b24803f998a28b40a398f` | 48 | 44 |

- **Límite:** la API informa `x-ratelimit-limit: 5;w=1` (5 pedidos por segundo). El recolector usa 4.
- **CORS:** `Access-Control-Allow-Origin: *`, así que la ficha consulta en vivo desde el navegador.
- **Volumen real:** en 14 días hubo 19.518 ventas (11.309 de furnis y 7.113 de ropa); la primera carga tardó 3 minutos y
  674 pedidos. Casi todas las ventas se pagan en ETH (WETH); algunas en IMX.
- **Immutable X** (red anterior): las 5 colecciones que referencia SecureHabbo responden 404 en `api.x.immutable.com`;
  no se incluyen.
- **Avatares de Habbo en Ethereum:** sus datos de mercado requieren APIs con clave (OpenSea, Alchemy, etc.); no se
  incluyen para no depender de cuentas.
- Hay publicaciones a precios absurdos (por ejemplo, US$ 239.218 por un trofeo que nadie compra): por eso los rankings de
  precio usan ventas reales.
