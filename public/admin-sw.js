// ============================================================
// App « Emerald Beauty Pro » : notifications de l'espace de gestion.
// Ce fichier ne met AUCUNE donnée en mémoire sur le téléphone (pas de cache) :
// il affiche seulement les notifications envoyées par le site.
// ============================================================
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let m = { titre: "Emerald Beauty Pro", corps: "Nouvelle activité", tag: "emerald", url: "/admin" };
  try {
    if (event.data) m = { ...m, ...event.data.json() };
  } catch (e) {
    // message illisible : notification générique
  }
  event.waitUntil(
    self.registration.showNotification(m.titre, {
      body: m.corps,
      tag: m.tag,
      renotify: true,
      icon: "/pro/icone-192.png",
      badge: "/pro/badge-96.png",
      lang: "fr",
      data: { url: m.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const cible = new URL((event.notification.data && event.notification.data.url) || "/admin", self.location.origin);
  // Seules les pages de l'espace de gestion peuvent être ouvertes.
  if (!cible.pathname.startsWith("/admin") || cible.origin !== self.location.origin) cible.pathname = "/admin";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((fenetres) => {
      for (const f of fenetres) {
        if (new URL(f.url).pathname.startsWith("/admin") && "focus" in f) {
          f.navigate(cible.href).catch(() => undefined);
          return f.focus();
        }
      }
      return self.clients.openWindow(cible.href);
    }),
  );
});
