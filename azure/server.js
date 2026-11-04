/**
 * Web server for Azure App Service.
 *  - serves the Angular build from ./public (with the index.html fallback a single-page app needs)
 *  - forwards every /api/... request to the backend, so the browser only ever talks to this site (no CORS setup)
 *
 * Settings (Azure: App Service > Environment variables > App settings):
 *   API_TARGET   required. Backend root URL, no trailing slash, e.g. https://pa-api.azurewebsites.net
 *   PORT         set by Azure. Defaults to 8080 locally.
 */
const path = require('path');
const express = require('express');
const compression = require('compression');
const { createProxyMiddleware } = require('http-proxy-middleware');

const PORT = process.env.PORT || 8080;
const API_TARGET = (process.env.API_TARGET || '').trim().replace(/\/+$/, '');
const PUBLIC_DIR = path.join(__dirname, 'public');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // Azure terminates HTTPS in front of the app

app.use(compression());
app.use((_req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  });
  next();
});

// Health check (use /healthz in App Service > Health check)
app.get('/healthz', (_req, res) => res.json({ status: 'ok', apiConfigured: Boolean(API_TARGET) }));

// ---- backend forwarding (no body parser before this: uploads are streamed through untouched)
if (API_TARGET) {
  app.use(
    createProxyMiddleware({
      pathFilter: '/api',
      target: API_TARGET,
      changeOrigin: true, // sends the backend's own host name, which most hosts require
      proxyTimeout: 180000, // analysis calls take 30s+; Azure's own front end allows up to ~230s
      timeout: 180000,
      on: {
        error: (err, _req, res) => {
          console.error('API proxy error:', err.message);
          if (res.writeHead && !res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ detail: 'The Authorization API is not reachable.' }));
          }
        },
      },
    }),
  );
} else {
  console.error('API_TARGET is not set. The site will load, but API calls will fail until it is configured.');
  app.use('/api', (_req, res) => res.status(503).json({ detail: 'API_TARGET is not configured on the web server.' }));
}

// ---- the Angular app
app.use(
  express.static(PUBLIC_DIR, {
    index: false,
    setHeaders(res, file) {
      // file names contain a content hash, so they can be cached for a year; index.html must never be cached
      if (/\.(js|css|woff2?|png|jpg|svg|ico)$/.test(file) && !file.endsWith('index.html')) {
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }),
);
app.get('*', (_req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, () => console.log(`Web server on port ${PORT}. API_TARGET = ${API_TARGET || '(not set)'}`));
