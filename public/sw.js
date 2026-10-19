// Service worker mínimo de Bomhams Market: abre la ficha al tocar una notificación.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Solo se abren páginas del propio sitio: nunca un enlace externo que venga en la notificación.
function safeUrl(raw) {
  try {
    const url = new URL(typeof raw === "string" ? raw : "/", self.location.origin);
    return url.origin === self.location.origin ? url.pathname + url.search : "/";
  } catch {
    return "/";
  }
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = safeUrl(event.notification.data && event.notification.data.url);
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

// Preparado para Web Push: si un servidor envía {title, body, url}, se muestra igual.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const url = safeUrl(data.url);
  const title = typeof data.title === "string" ? data.title.slice(0, 120) : "Bomhams Market";
  const body = typeof data.body === "string" ? data.body.slice(0, 300) : "";
  event.waitUntil(
    self.registration.showNotification(title, { body, icon: "/icon.svg", tag: url, data: { url } }),
  );
});
