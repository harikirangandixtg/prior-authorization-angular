# Prior Authorization Assistant (Angular 19)

Header + main content UI for the Authorization API (`/api/authorization`). No footer.

## Run
Requires Node 18.19+ (20+ recommended). Use two terminals:

    npm install
    npm start            # http://localhost:4200, proxies /api to http://127.0.0.1:8000

Your real API must be running on port 8000. To try the UI without it:

    npm run mock         # fake API on port 8000 (separate terminal)

Change the API address in `proxy.conf.json` (`target`). For production builds set
`apiBaseUrl` in `src/environments/environment.ts`.

## Screens
Dashboard, New request (create + analyze, ~30s progress overlay), Cases list,
Case detail (Criteria / Evidence / Draft packet / Audit trail, review panel).

## Things to confirm
- `POST /cases/{id}/review` request body was not in the spec. Assumed
  `{decision: 'ACCEPTED'|'CORRECTED', comment, corrections:[{criterion_id,status,rationale}]}`.
  Change only `toReviewPayload()` in `src/app/core/api.service.ts` if the real schema differs.
- Case creation is implemented as `POST /cases` (the spec labelled it GET).
- Policy Search is not included (no API for it).
