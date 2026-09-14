// Enhanced Service Worker for PWA with Push Notifications
const CACHE_NAME = 'ressichem-admin-v1';
const urlsToCache = [
  '/',
  '/admin/dashboard',
  '/manifest.json'
];

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cache opened');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache');
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  if (event.data) {
    try {
      const data = event.data.json();
      console.log('Push notification data:', data);
      
      const options = {
        body: data.message || data.body || 'You have a new notification',
        icon: '/images/logo/logo-icon.svg',
        badge: '/images/logo/logo-icon.svg',
        image: data.image || undefined,
        data: data.data || {},
        actions: [
          {
            action: 'view',
            title: 'View',
            icon: '/images/icon/icon-arrow-down.svg'
          },
          {
            action: 'dismiss',
            title: 'Dismiss',
            icon: '/images/icon/icon-arrow-down.svg'
          }
        ],
        requireInteraction: data.priority === 'high',
        silent: false,
        tag: data.tag || 'notification',
        timestamp: Date.now(),
        vibrate: [200, 100, 200],
        renotify: true
      };

      event.waitUntil(
        self.registration.showNotification(data.title || 'Ressichem Notification', options)
      );
    } catch (error) {
      console.error('Error parsing push notification data:', error);
      
      // Fallback notification
      const options = {
        body: 'You have a new notification',
        icon: '/images/logo/logo-icon.svg',
        badge: '/images/logo/logo-icon.svg'
      };

      event.waitUntil(
        self.registration.showNotification('Ressichem Notification', options)
      );
    }
  } else {
    // Fallback for notifications without data
    const options = {
      body: 'You have a new notification',
      icon: '/images/logo/logo-icon.svg',
      badge: '/images/logo/logo-icon.svg'
    };

    event.waitUntil(
      self.registration.showNotification('Ressichem Notification', options)
    );
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  // Get the URL from notification data
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no existing window, open a new one
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Background sync for offline notifications
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync');
  if (event.tag === 'notification-sync') {
    event.waitUntil(
      // Handle offline notification sync
      console.log('Syncing notifications...')
    );
  }
});

// Message event for communication with main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});