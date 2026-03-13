/**
 * Service Worker for background receipt scanning.
 * Survives page navigation — if user leaves before scan completes, we show a notification.
 */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', async (event) => {
  const { type, id, payload } = event.data || {};
  if (type !== 'SCAN' || !payload) return;

  try {
    const res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      // Notify page of error
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const c of clients) {
        c.postMessage({ type: 'SCAN_RESULT', id, ok: false, error: data, status: res.status });
      }
      return;
    }

    // Follow-up question: return to page, don't show notification
    if (data.followUpQuestion) {
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const c of clients) {
        c.postMessage({ type: 'SCAN_RESULT', id, ok: true, followUp: data });
      }
      return;
    }

    // Success: notify page and show notification
    const deductCount = Array.isArray(data.line_items)
      ? data.line_items.filter((li) => li && li.is_deductible).length
      : 0;
    const msg =
      deductCount === 0
        ? 'Your receipt has been analyzed — no deductions found'
        : deductCount === 1
          ? 'Your receipt has been analyzed — 1 deduction found'
          : `Your receipt has been analyzed — ${deductCount} deductions found`;

    const clients = await self.clients.matchAll({ type: 'window' });
    const focused = clients.find((c) => c.focused) ?? clients[0];
    if (focused) {
      focused.postMessage({ type: 'SCAN_RESULT', id, ok: true, result: data });
    }

    // Always show notification (user may have navigated away)
    if (self.Notification?.permission === 'granted' && self.registration) {
      await self.registration.showNotification('TaxSnapper', {
        body: msg,
        icon: '/window.svg',
        tag: `scan-${id}`,
        data: { url: '/receipts', result: data },
      });
    }
  } catch (err) {
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const c of clients) {
      c.postMessage({ type: 'SCAN_RESULT', id, ok: false, error: String(err?.message || err) });
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || '/receipts';
  const fullUrl = new URL(url, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.visibilityState === 'visible' && typeof client.navigate === 'function') {
          return client.navigate(fullUrl).then(() => client.focus());
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(fullUrl);
      }
    })
  );
});
