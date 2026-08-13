// public/sw.js

// Empfangen von Push-Benachrichtigungen
self.addEventListener('push', function(event) {
    const data = event.data ? event.data.json() : { 
        title: '🔴 KrachGarten Radio Live!', 
        body: 'Ein DJ ist jetzt On Air! Schalte jetzt ein.' 
    };

    const options = {
        body: data.body,
        icon: '/logo.png', // Optional: Pfad zu eurem Sender-Logo
        badge: '/logo.png',
        vibrate: [100, 50, 100],
        data: {
            url: '/' // Öffnet eure Radio-Seite beim Klick auf die Nachricht
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Klick auf die Benachrichtigung öffnet die Webseite
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});