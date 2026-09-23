/* Admin App PWA Service Worker
 * Served at /admin-app/sw.js → default scope is /admin-app/
 * Does not intercept network requests. Push handlers only.
 */

const DEFAULT_URL = "/admin-app"

self.addEventListener("install", (event) => {
    event.waitUntil(self.skipWaiting())
})

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim())
})

self.addEventListener("push", (event) => {
    /** @type {{ title?: string, body?: string, url?: string }} */
    let payload = {
        title: "Smart Option Academy",
        body: "",
        url: DEFAULT_URL,
    }

    try {
        if (event.data) {
            const parsed = event.data.json()
            if (parsed && typeof parsed === "object") {
                payload = {
                    title:
                        typeof parsed.title === "string" && parsed.title.trim()
                            ? parsed.title.trim()
                            : payload.title,
                    body: typeof parsed.body === "string" ? parsed.body : "",
                    url:
                        typeof parsed.url === "string" && parsed.url.startsWith("/admin-app")
                            ? parsed.url
                            : DEFAULT_URL,
                }
            }
        }
    } catch {
        try {
            const text = event.data ? event.data.text() : ""
            if (text) payload = { ...payload, body: text }
        } catch {
            // keep defaults
        }
    }

    event.waitUntil(
        self.registration.showNotification(payload.title, {
            body: payload.body,
            icon: "/admin-app-apple-touch-icon.png",
            badge: "/admin-app-apple-touch-icon.png",
            data: { url: payload.url },
        })
    )
})

self.addEventListener("notificationclick", (event) => {
    event.notification.close()
    const rawUrl =
        event.notification.data && typeof event.notification.data.url === "string"
            ? event.notification.data.url
            : DEFAULT_URL
    const targetUrl = rawUrl.startsWith("/admin-app") ? rawUrl : DEFAULT_URL

    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if ("focus" in client && client.url.includes("/admin-app")) {
                    return client.focus()
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow(targetUrl)
            }
            return undefined
        })
    )
})
