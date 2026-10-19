# Costos y tráfico: por qué es gratis y cuánto aguanta

Resumen corto: **el sitio no puede generar cobros**. Está en el plan gratuito de Vercel (Hobby), que no tiene tarjeta
cargada ni facturación. Si algún mes se pasara de lo incluido, Vercel **pausa** la parte que se pasó hasta que se
cumplan 30 días; no cobra nada.

Datos de la documentación oficial de Vercel (páginas
[Hobby](https://vercel.com/docs/plans/hobby), [Fair use](https://vercel.com/docs/limits/fair-use-guidelines) y
[DDoS](https://vercel.com/docs/vercel-firewall/ddos-mitigation), revisadas el 17/10/2026).

## Qué incluye gratis Vercel por mes

| Recurso | Incluido | Qué lo usa en este sitio |
| --- | --- | --- |
| Pedidos al CDN | 1.000.000 | cada archivo que baja un visitante (página, código, fuentes) |
| Transferencia | 100 GB | el peso de esos archivos |
| Ejecuciones de funciones | 1.000.000 | regenerar páginas, búsquedas no cacheadas, los cron |
| CPU activa | 4 horas | lo mismo (el cron pasa casi todo el tiempo esperando a Habbo, eso no cuenta) |
| Memoria | 360 GB-hora | lo mismo |
| Vercel Blob | 1 GB guardado, 2.000 escrituras, 10.000 lecturas "simples", 10 GB de descarga | ~10 escrituras por día (escaneos); los archivos pesan ~0,3 MB |

Las lecturas del Blob que salen de la caché del CDN **no cuentan** como lecturas "simples". Por eso los datos se
guardan con caché de 7 días: cuando el recolector los reescribe, Vercel actualiza la caché en menos de 60 segundos, y
mientras tanto cada lectura es gratis. Además el servidor recuerda lo leído unos minutos, y pide "solo si cambió"
(si no cambió, no se descarga de nuevo).

"In most cases, if you exceed your usage limits on the Hobby plan, you will have to wait until 30 days have passed
before you can use the feature again." — documentación de Vercel.

Si se activan las **cuentas**, la base de datos es Upstash Redis en su plan gratis: 500.000 operaciones y 250 MB por
mes. Cada visita de alguien con sesión usa unas 2 operaciones y guardar la lista, 2 más: alcanza para cientos de
personas activas por día. Si algún mes se llegara al tope, fallan solo las cuentas; las alertas siguen funcionando
porque también se guardan en el navegador. No cargues una tarjeta en Upstash: así no hay forma de que cobre.

## Lo que medimos

Con el sitio compilado (pruebas con Playwright, 17/10/2026):

- **Primera visita:** 14 pedidos y unos 250 KB del propio sitio.
- **Cada página siguiente:** 1 o 2 pedidos (el código ya quedó guardado en el navegador).
- Los **íconos de furnis** salen del servidor de imágenes de Habbo, y los **precios en vivo** van del navegador del
  visitante directo a Habbo e Immutable: nada de eso pasa por Vercel ni cuenta.
- Las páginas son **estáticas**: el CDN las entrega sin ejecutar código. Solo se regeneran cuando corre el recolector o,
  como mucho, cada 6 horas.
- Se desactivó la "precarga" automática de enlaces: antes cada página pedía de antemano 13 a 17 páginas vecinas.

## Cuánta gente aguanta

Una visita típica (entrar y mirar 3 o 4 páginas) son unos **20 pedidos**. Con 1.000.000 por mes:

- **≈ 50.000 visitas por mes (≈ 1.600 por día)** antes de llegar al límite de pedidos, que es el primero que se
  alcanzaría.
- La transferencia (100 GB) alcanzaría para ≈ 400.000 primeras visitas, así que no es el problema.
- Las funciones quedan muy lejos del límite: el recolector corre 5 veces por día y las búsquedas repetidas las
  responde la caché del CDN (1 hora).

Si un mes se superara ese tráfico, el sitio quedaría pausado (muestra un error de Vercel) hasta que pasen los 30
días. **No se cobraría nada.** Vercel avisa por correo cuando se está por llegar al límite, y en el panel del
proyecto (**Usage**) se ve el consumo.

## Ataques y tráfico falso

Vercel bloquea solo los ataques de tráfico (DDoS) en todos los planes, y **no cuenta ni cobra el tráfico que
bloquea**. Si hubiera un ataque, en el panel del proyecto, en **Firewall**, se puede prender el **Attack Mode**
(gratis): pide a cada visitante una verificación automática hasta que se apague.

Además, este sitio:

- no tiene login, base de datos ni nada que "romper" desde afuera;
- limita las búsquedas a 60 por minuto por persona;
- protege las rutas del recolector con una clave secreta.

## Para que siga siendo gratis

- **No pasar a Pro** ni cargar una tarjeta en Vercel. Hobby no tiene forma de cobrar.
- **Uso no comercial:** el plan gratis no permite publicidad ni vender cosas en el sitio. Pedir donaciones sí está
  permitido.
- No comprar un dominio propio: la dirección `habbo-marketplace-three.vercel.app` es gratis.
- GitHub (repositorio público), las APIs de Habbo e Immutable, y los canales de Discord, Telegram y WhatsApp también
  son gratis.

## Si un día crece mucho

Pasar las ~1.600 visitas por día sería una buena noticia. En ese caso hay caminos gratuitos para estirar el límite,
sin cambiar de plan; conviene revisarlos en ese momento con números reales del panel de Vercel.
