"use client";

/**
 * Notificaciones del navegador. No necesitan cuenta ni servidor: funcionan
 * mientras haya una pestaña del sitio abierta. El service worker (/sw.js) se
 * registra solo para poder mostrarlas también en Android y para abrir la ficha
 * al tocar el aviso; ya trae preparado el manejo de mensajes push para una
 * futura versión con avisos aunque la pestaña esté cerrada.
 */

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  return notificationsSupported() ? Notification.permission : "unsupported";
}

/** Registra /sw.js si hace falta y espera a que esté activo (como mucho 5 s). */
async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    if (!(await navigator.serviceWorker.getRegistration("/"))) await navigator.serviceWorker.register("/sw.js");
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
    return await Promise.race([navigator.serviceWorker.ready, timeout]);
  } catch {
    return null;
  }
}

export async function enableNotifications(): Promise<NotificationPermission | "unsupported"> {
  if (!notificationsSupported()) return "unsupported";
  const result = await Notification.requestPermission();
  if (result === "granted") await registration();
  return result;
}

export async function showNotification(title: string, body: string, url: string) {
  if (!notificationsSupported() || Notification.permission !== "granted") return false;
  const options: NotificationOptions = { body, icon: "/icon.svg", badge: "/icon.svg", tag: url, data: { url } };
  const reg = await registration();
  if (reg) {
    try {
      await reg.showNotification(title, options);
      return true;
    } catch {
      // sigue con la notificación común
    }
  }
  try {
    const n = new Notification(title, options);
    n.onclick = () => {
      window.focus();
      window.location.href = url;
    };
    return true;
  } catch {
    return false;
  }
}
