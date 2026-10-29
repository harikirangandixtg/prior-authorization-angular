export const environment = {
  /**
   * Base URL of the Authorization API.
   * Dev: relative, so `ng serve` forwards /api to the backend via proxy.conf.json (no CORS setup needed).
   * Production: use the full URL (e.g. 'https://pa-api.example.com/api/authorization') or keep it relative
   * behind a reverse proxy that forwards /api to the backend.
   */
  apiBaseUrl: '/api/authorization',
};
