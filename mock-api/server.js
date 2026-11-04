/**
 * Mock of the Prior Authorization API (same routes and response shapes as the sample responses).
 * For local UI development without the real backend:   npm run mock   (listens on :8000)
 * In-memory only. Analysis takes ~3s to mimic the real, slower AI call.
 */
const http = require('http');

const PORT = Number(process.env.PORT || 8000);
const BASE = '/api/authorization';
const ANALYZE_DELAY_MS = Number(process.env.ANALYZE_DELAY_MS || 3000);

const req = (o = {}) => ({
  plan_id: 'NW-PPO-GOLD', payer_id: 'NORTHWIND', order_date: '2026-10-27', patient_id: 'P-1002', encounter_id: '',
  service_code: 'MRI-LSPINE-001', diagnosis_code: 'M54.16', diagnosis_text: 'Radiculopathy, lumbar region',
  ordering_provider: 'Dr. Demo Clinician', service_description: 'MRI lumbar spine without contrast', ...o,
});

const crit = (id, text, status, rationale, refs = [], missing = null) => ({
  text, status, rationale, criterion_id: id, model_status: status, evidence_refs: refs, reference_status: status, missing_information: missing,
});

const C1 = 'Red-flag findings documented (suspected cauda equina syndrome, progressive neurological deficit, or suspected malignancy or infection)';
const C2A = 'Low back pain with radiculopathy documented and persisting at least 6 weeks';
const C2B = 'Conservative therapy (physical therapy or NSAIDs) documented over at least 6 weeks';
const C2C = 'No prior lumbar spine MRI in the last 12 months';

const goodCriteria = () => [
  crit('C1', C1, 'Unknown', 'No explicit documentation of red-flag findings is present in the evidence.', [],
    'Clinical notes explicitly documenting suspected cauda equina syndrome, progressive neurological deficit, or suspected malignancy or infection'),
  crit('C2a', C2A, 'Met', 'Radiculopathy is documented with onset over 10 weeks ago, exceeding the 6-week minimum.', ['Condition/C-P-1002-1']),
  crit('C2b', C2B, 'Met', 'Physical therapy was completed over 7 weeks and NSAID medication is active, satisfying the 6-week conservative therapy requirement.',
    ['MedicationRequest/M-P-1002-1', 'Procedure/PR-P-1002-1', 'Procedure/PR-P-1002-2']),
  crit('C2c', C2C, 'Met', 'No prior lumbar spine MRI in the last 12 months is documented; only an X-ray was performed.', ['DiagnosticReport/D-P-1002-1']),
];

const cases = new Map();
const jobs = new Map();
const audits = new Map();

function seed(c) { cases.set(c.case_id, c); }
function audit(id, action, detail = {}, actor = 'dev.user') {
  const list = audits.get(id) || [];
  list.push({
    event_id: 'AU-' + Math.random().toString(16).slice(2, 12).toUpperCase(), case_id: id, actor, action,
    correlation_id: Math.random().toString(16).slice(2, 18), detail, ts: new Date().toISOString(),
  });
  audits.set(id, list);
}

seed({
  case_id: 'PA-E349E637A5', status: 'DRAFT_REQUIRES_REVIEW', patient_id: 'P-1002', request: req(), created_by: 'dev.user',
  created_at: '2026-10-28T06:24:52.782109+00:00', updated_at: '2026-10-29T05:24:58.787212+00:00', analyzed: true,
  overall: 'ReadyForReview', policy_id: 'NW-MRI-LSPINE-v3', criteria: goodCriteria(),
  open_items: ['Neurological exam findings not found in the retrieved data'], notes: [],
  verifier: { ok: false, problems: ['Unknown reference removed: '], corrections: [] },
  human_review: { required: true, review_status: 'PENDING' }, submission: { status: 'NOT_SUBMITTED' },
});
seed({
  case_id: 'PA-6ED33603D4', status: 'REVIEWED_CORRECTED', patient_id: 'P-1002', request: req(), created_by: 'dev.user',
  created_at: '2026-10-28T11:58:53.668897+00:00', updated_at: '2026-10-28T11:59:44.048654+00:00', analyzed: true,
  overall: 'ReadyForReview', policy_id: 'NW-MRI-LSPINE-v3', criteria: goodCriteria(),
  open_items: ['Neurological exam findings not found in the retrieved data'], notes: ['Using evidence taken directly from the tool results.'],
  verifier: { ok: true, problems: [], corrections: [] },
  human_review: { required: true, review_status: 'CORRECTED', reviewer_id: 'dev.user', reviewed_at: '2026-10-28T11:59:41.078496+00:00' },
  submission: { status: 'NOT_SUBMITTED' },
});
seed({
  case_id: 'PA-A5938CFECB', status: 'REVIEWED_ACCEPTED', patient_id: 'P-1010',
  request: req({ patient_id: 'P-1010', diagnosis_code: '', diagnosis_text: '', ordering_provider: '', service_description: '' }),
  created_by: 'dev.user', created_at: '2026-10-28T10:41:11.659765+00:00', updated_at: '2026-10-28T10:47:08.916843+00:00', analyzed: true,
  overall: 'NeedsInformation', policy_id: 'NW-MRI-LSPINE-v3',
  criteria: [
    crit('C1', C1, 'Unknown', 'No red-flag finding is documented in the retrieved records.', [], 'A documented red-flag finding, if one exists'),
    crit('C2a', C2A, 'Met', 'Radiculopathy onset 2026-08-12 is 10.9 weeks before the order date.', ['Condition/C-P-1010-1']),
    crit('C2b', C2B, 'Conflicting', 'Completed therapy covers -7.4 weeks.', ['MedicationRequest/M-P-1010-1', 'Procedure/PR-P-1010-2'],
      'Resolve the conflicting records: Procedure/PR-P-1010-2: End date is before the start date'),
    crit('C2c', C2C, 'Met', 'No lumbar MRI was performed in the last 12 months.', ['DiagnosticReport/D-P-1010-1']),
  ],
  open_items: ['Neurological exam findings not found in the retrieved data', 'Conflicting records for C2b: Procedure/PR-P-1010-2: End date is before the start date'],
  notes: ['DEMO MODE: no AI model was used. These results are for demonstration only.', 'Using evidence taken directly from the tool results.'],
  verifier: { ok: true, problems: [] },
  human_review: { required: true, review_status: 'ACCEPTED', reviewer_id: 'dev.user', reviewed_at: '2026-10-28T10:47:06.418728+00:00' },
  submission: { status: 'NOT_SUBMITTED' },
});
seed({
  case_id: 'PA-0F188997C5', status: 'REVIEWED_CORRECTED', patient_id: 'P-1002', request: req(), created_by: 'dev.user',
  created_at: '2026-10-28T07:24:15.749489+00:00', updated_at: '2026-10-28T07:24:59.012293+00:00', analyzed: true,
  overall: 'ReadyForReview', policy_id: 'NW-MRI-LSPINE-v3', criteria: goodCriteria(),
  open_items: ['Neurological exam findings not found in the retrieved data'], notes: ['Using evidence taken directly from the tool results.'],
  verifier: { ok: true, problems: [] },
  human_review: { required: true, review_status: 'CORRECTED', reviewer_id: 'dev.user', reviewed_at: '2026-10-28T07:24:56.545940+00:00' },
  submission: { status: 'NOT_SUBMITTED' },
});
seed({
  case_id: 'PA-1A1D8B570A', status: 'FAILED', patient_id: 'P-1002', request: req(), created_by: 'dev.user',
  created_at: '2026-10-28T06:13:52.863712+00:00', updated_at: '2026-10-28T16:15:40.642455+00:00', analyzed: true,
  overall: null, policy_id: null, criteria: [], open_items: [], notes: [], verifier: null,
  human_review: { required: true, review_status: 'CORRECTED', reviewer_id: 'dev.user', reviewed_at: '2026-10-28T06:15:08.911816+00:00' },
  submission: { status: 'NOT_SUBMITTED' },
});
[['PA-E349E637A5', 'CASE_CREATED'], ['PA-E349E637A5', 'ANALYZE_STARTED'], ['PA-E349E637A5', 'ANALYZE_COMPLETED', { status: 'DRAFT_REQUIRES_REVIEW', overall: 'ReadyForReview', verifier_problems: 1 }]]
  .forEach(([id, a, d]) => audit(id, a, d || {}));

const evidenceFor = (id) => ({
  case_id: id, policy_id: 'NW-MRI-LSPINE-v3',
  evidence: [
    { end: null, kind: 'condition', start: '2026-08-12', status: 'active', summary: 'Radiculopathy, lumbar region', reference: 'Condition/C-P-1002-1', criterion_id: 'C2a', cited_by_criteria: ['C2a'] },
    { end: null, kind: 'medication', start: '2026-08-20', status: 'active', summary: 'Ibuprofen 600 mg tablet', reference: 'MedicationRequest/M-P-1002-1', criterion_id: 'C2b', cited_by_criteria: ['C2b'] },
    { end: null, kind: 'procedure', start: '2026-08-28', status: 'preparation', summary: 'Physical therapy referral, lumbar', reference: 'Procedure/PR-P-1002-1', criterion_id: 'C2b', cited_by_criteria: ['C2b'] },
    { end: '2026-10-23', kind: 'procedure', start: '2026-09-01', status: 'completed', summary: 'Physical therapy, lumbar (16 visits over 7 weeks)', reference: 'Procedure/PR-P-1002-2', criterion_id: 'C2b', cited_by_criteria: ['C2b'] },
    { end: null, kind: 'imaging', start: '2026-08-20', status: 'final', summary: 'X-ray lumbar spine, 2 views', reference: 'DiagnosticReport/D-P-1002-1', region_hint: 'lumbar spine', criterion_id: 'C2c', modality_hint: 'X-ray', cited_by_criteria: ['C2c'] },
  ],
});

const NARRATIVE = (id) => `PRIOR AUTHORIZATION REQUEST (DRAFT - FOR STAFF REVIEW)
Payer: Northwind Health (fictional) | Plan: NW-PPO-GOLD
Patient: Test Patient Two, 1975-02-03 | Ordering provider: Dr. Demo Clinician
Service requested: MRI lumbar spine without contrast (MRI-LSPINE-001)
Diagnosis: M54.16 Radiculopathy, lumbar region
Policy applied: NW-MRI-LSPINE-v3

Criteria summary
- C1: Unknown
- C2a: Met [Condition/C-P-1002-1]
- C2b: Met [MedicationRequest/M-P-1002-1, Procedure/PR-P-1002-1, Procedure/PR-P-1002-2]
- C2c: Met [DiagnosticReport/D-P-1002-1]

Clinical summary
The patient has documented radiculopathy in the lumbar region persisting for over 10 weeks, which exceeds the 6-week minimum requirement [Condition/C-P-1002-1]. Conservative therapy including physical therapy over 7 weeks and active NSAID medication (Ibuprofen 600 mg) has been documented [MedicationRequest/M-P-1002-1, Procedure/PR-P-1002-1, Procedure/PR-P-1002-2]. No prior lumbar spine MRI in the last 12 months is documented; only a lumbar spine X-ray was performed [DiagnosticReport/D-P-1002-1]. There is no explicit documentation of red-flag findings such as suspected cauda equina syndrome, progressive neurological deficit, or suspected malignancy or infection [UNVERIFIED].

Open items
- Neurological exam findings not found in the retrieved data

Generated by AI for staff review. Verify all statements before submission.`;

const draftFor = (id) => {
  const ev = evidenceFor(id).evidence.map((e, i) => ({
    date: e.start, kind: e.kind, endDate: e.end, summary: e.summary, reference: e.reference, evidenceId: 'EV-00' + (i + 1),
  }));
  return {
    draft_id: 'DR-06224A2AF1', case_id: id, version: 1,
    packet: {
      draft: {
        clinicalSummary: NARRATIVE(id), sourceReferences: ev, supportingEvidence: ev,
        missingDocumentation: [
          'Neurological exam findings not found in the retrieved data',
          'Clinical notes explicitly documenting suspected cauda equina syndrome, progressive neurological deficit, or suspected malignancy or infection',
        ],
      },
      order: { procedure: 'MRI lumbar spine without contrast', encounterId: null, serviceCode: 'MRI-LSPINE-001', serviceDate: '2026-10-27' },
      caseId: id,
      policy: { title: 'Lumbar Spine MRI - Medical Necessity Criteria', source: 'Northwind Health (fictional)', status: 'FOUND', policyId: 'NW-MRI-LSPINE-v3', effective: '2026-01-01' },
      status: 'DRAFT_REQUIRES_REVIEW',
      criteria: [
        { status: 'MISSING', rationale: 'No explicit documentation of red-flag findings is present in the evidence.', criterionId: 'C1', evidenceIds: [], requirement: C1, checkerStatus: 'Unknown' },
        { status: 'SUPPORTED', rationale: 'Radiculopathy is documented with onset over 10 weeks ago.', criterionId: 'C2a', evidenceIds: ['EV-001'], requirement: C2A, checkerStatus: 'Met' },
        { status: 'SUPPORTED', rationale: 'Physical therapy was completed over 7 weeks and NSAID medication is active.', criterionId: 'C2b', evidenceIds: ['EV-002', 'EV-003', 'EV-004'], requirement: C2B, checkerStatus: 'Met' },
        { status: 'SUPPORTED', rationale: 'No prior lumbar spine MRI documented; only an X-ray was performed.', criterionId: 'C2c', evidenceIds: ['EV-005'], requirement: C2C, checkerStatus: 'Met' },
      ],
      submission: { status: 'NOT_SUBMITTED' },
      humanReview: { required: true, reviewStatus: 'PENDING' },
    },
    narrative: NARRATIVE(id), created_by: 'system:ai-draft', created_at: new Date().toISOString(), submission: { status: 'NOT_SUBMITTED' },
  };
};

// ---------------------------------------------------------------- plumbing
const send = (res, code, body) => {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' });
  res.end(JSON.stringify(body));
};
const notFound = (res, what = 'Case not found.') => send(res, 404, { detail: what });
const readBody = (r) => new Promise((ok) => { let s = ''; r.on('data', (c) => (s += c)); r.on('end', () => { try { ok(JSON.parse(s || '{}')); } catch { ok(null); } }); });

// ---------------------------------------------------------------- auth (mock)
const EXPIRES_IN = 28800;
const users = new Map();
const sessions = new Map(); // token -> { user, exp }
const addUser = (email, password, full_name, roles) => users.set(email, { user_id: 'USR-' + Math.random().toString(36).slice(2, 12).toUpperCase(), email, password, full_name, roles, allowed_patients: ['*'] });
addUser('admin@xtglobal.com', 'Welcome123', 'Admin User', ['requester', 'reviewer']);
addUser('requester@xtglobal.com', 'Welcome123', 'Rita Requester', ['requester']);
addUser('reviewer@xtglobal.com', 'Welcome123', 'Ravi Reviewer', ['reviewer']);
users.get('reviewer@xtglobal.com').allowed_patients = ['P-1002'];
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const publicUser = (u) => ({ user_id: u.user_id, email: u.email, full_name: u.full_name, roles: u.roles, allowed_patients: u.allowed_patients });
const issue = (u) => { const exp = Date.now() + EXPIRES_IN * 1000; const token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: u.user_id, exp })}.${Math.random().toString(36).slice(2)}`; sessions.set(token, { user: u, exp }); return { access_token: token, token_type: 'bearer', expires_in: EXPIRES_IN, user: publicUser(u) }; };
const pwProblem = (pw) => (typeof pw !== 'string' || pw.length < 8 || pw.length > 128) ? 'Password must be 8-128 characters.' : !/[A-Za-z]/.test(pw) || !/\d/.test(pw) ? 'Password needs at least one letter and one number.' : !/^[A-Za-z0-9@#$%^&*!?\-_.]+$/.test(pw) ? 'Password contains characters that are not allowed.' : null;
const v422 = (loc, msg, type = 'value_error') => ({ detail: [{ type, loc: ['body', ...loc], msg, input: null }] });

http.createServer(async (rq, res) => {
  const url = new URL(rq.url, 'http://x');
  if (rq.method === 'OPTIONS') return send(res, 204, {});
  if (url.pathname.startsWith('/api/auth/')) {
    const route = url.pathname.slice('/api/auth/'.length);
    if (route === 'me' && rq.method === 'GET') {
      const t = (rq.headers.authorization || '').replace(/^Bearer /, ''); const sess = sessions.get(t);
      return sess && sess.exp > Date.now() ? send(res, 200, publicUser(sess.user)) : send(res, 401, { detail: 'Not authenticated' });
    }
    const b = await readBody(rq);
    if (!b) return send(res, 422, v422([], 'Input should be a valid dictionary'));
    if (route === 'signup' && rq.method === 'POST') {
      const allowed = ['email', 'password', 'confirm_password', 'full_name', 'roles'];
      const extra = Object.keys(b).filter((k) => !allowed.includes(k));
      if (extra.length) return send(res, 422, { detail: extra.map((k) => ({ type: 'extra_forbidden', loc: ['body', k], msg: 'Extra inputs are not permitted', input: b[k] })) });
      if (!Array.isArray(b.roles) || !b.roles.length || b.roles.some((r) => !['requester', 'reviewer'].includes(r))) return send(res, 422, v422(['roles'], 'Value error, roles must be 1 or 2 of requester, reviewer'));
      if (pwProblem(b.password)) return send(res, 422, v422(['password'], 'Value error, ' + pwProblem(b.password)));
      if (b.password !== b.confirm_password) return send(res, 422, v422([], 'Value error, passwords do not match'));
      if (typeof b.email !== 'string' || !/^[^\s@]+@[^\s@]+$/.test(b.email)) return send(res, 422, v422(['email'], 'value is not a valid email address'));
      const email = b.email.toLowerCase();
      if (!/@([a-z0-9-]+\.)*xtglobal\.com$/.test(email)) return send(res, 400, { detail: 'Email must be an @xtglobal.com address.' });
      if (users.has(email)) return send(res, 409, { detail: 'An account with this email already exists.' });
      addUser(email, b.password, b.full_name || null, [...new Set(b.roles)]);
      return send(res, 201, issue(users.get(email)));
    }
    if (route === 'login' && rq.method === 'POST') {
      const u = users.get(String(b.email || '').toLowerCase());
      return u && u.password === b.password ? send(res, 200, issue(u)) : send(res, 401, { detail: 'Invalid email or password.' });
    }
    if (route === 'password' && rq.method === 'POST') {
      if (pwProblem(b.new_password)) return send(res, 422, v422(['new_password'], 'Value error, ' + pwProblem(b.new_password)));
      if (b.new_password !== b.confirm_password) return send(res, 422, v422([], 'Value error, passwords do not match'));
      const u = users.get(String(b.email || '').toLowerCase()); if (u) u.password = b.new_password;
      return send(res, 200, { status: 'ok', message: 'If the account exists, the password has been updated.' });
    }
    return notFound(res, 'Not Found');
  }
  if (!url.pathname.startsWith(BASE)) return notFound(res, 'Not Found');
  const authUser = (() => { const t = (rq.headers.authorization || '').replace(/^Bearer /, ''); const s2 = sessions.get(t); return s2 && s2.exp > Date.now() ? s2.user : null; })();
  if (!authUser) return send(res, 401, { detail: 'Not authenticated' });
  const parts = url.pathname.slice(BASE.length).split('/').filter(Boolean); // ['cases', id, action]
  if (parts[0] === 'policies' && rq.method === 'GET') {
    const pol = { policy_id: 'NW-MRI-LSPINE-v3', title: 'Lumbar Spine MRI - Medical Necessity Criteria', payer: 'Northwind Health (fictional)', effective: '2026-01-01', effective_to: null, criteria_count: 4, criteria_ids: ['C1', 'C2a', 'C2b', 'C2c'] };
    const all = [
      { rule_reference: 'NORTHWIND|NW-PPO-GOLD|MRI-LSPINE-001', payer_id: 'NORTHWIND', plan_id: 'NW-PPO-GOLD', service_code: 'MRI-LSPINE-001', pa_required: 'yes', policy_id: pol.policy_id, policy_summary: pol },
      { rule_reference: 'NORTHWIND|NW-HMO-BASIC|MRI-LSPINE-001', payer_id: 'NORTHWIND', plan_id: 'NW-HMO-BASIC', service_code: 'MRI-LSPINE-001', pa_required: 'yes', policy_id: pol.policy_id, policy_summary: pol },
      { rule_reference: 'NORTHWIND|NW-PPO-GOLD|XRAY-LSPINE-001', payer_id: 'NORTHWIND', plan_id: 'NW-PPO-GOLD', service_code: 'XRAY-LSPINE-001', pa_required: 'no', policy_id: null },
    ];
    const g = (k) => (url.searchParams.get(k) || '').toLowerCase();
    const items = all.filter((i) => (!g('payer_id') || i.payer_id.toLowerCase() === g('payer_id')) && (!g('plan_id') || i.plan_id.toLowerCase() === g('plan_id')) && (!g('service_code') || i.service_code.toLowerCase() === g('service_code')));
    return send(res, 200, items.length ? { status: 'FOUND', count: items.length, items, message: null } : { status: 'NOT_FOUND', count: 0, items: [], message: 'No matching policy rules.' });
  }
  if (parts[0] !== 'cases') return notFound(res, 'Not Found');
  const [, id, action] = parts;
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---- bulk upload (mock): POST /cases/upload?analyze=  and  GET /cases/upload/jobs/:id
  if (id === 'upload' && rq.method === 'POST' && !parts[2]) {
    if (!authUser.roles.includes('requester')) return send(res, 403, { detail: 'Requires role: requester' });
    const raw = await new Promise((ok) => { let s = ''; rq.on('data', (c) => (s += c)); rq.on('end', () => ok(s)); });
    const m = raw.match(/name="file"[^\r\n]*\r?\n(?:[^\r\n]+\r?\n)*\r?\n([\s\S]*?)\r?\n--/);
    const lines = (m ? m[1] : '').split(/\r?\n/).filter(Boolean);
    const cols = (lines.shift() || '').split(',').map((s) => s.trim());
    const created = []; const errors = [];
    lines.forEach((ln, i) => {
      const v = ln.split(','); const r = Object.fromEntries(cols.map((c, j) => [c, (v[j] || '').trim()]));
      const miss = ['patient_id', 'payer_id', 'plan_id', 'service_code', 'order_date'].filter((f) => !r[f]);
      if (miss.length) return errors.push({ row: i + 2, message: 'Missing: ' + miss.join(', ') });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(r.order_date)) return errors.push({ row: i + 2, message: 'order_date must be YYYY-MM-DD' });
      const case_id = 'PA-' + Math.random().toString(16).slice(2, 12).toUpperCase(); const now = new Date().toISOString();
      cases.set(case_id, { case_id, status: 'CREATED', patient_id: r.patient_id, request: { encounter_id: '', service_description: '', diagnosis_code: '', diagnosis_text: '', ordering_provider: '', ...r }, created_by: 'dev.user', created_at: now, updated_at: now, analyzed: false, overall: null, policy_id: null, criteria: [], open_items: [], notes: [], verifier: null, human_review: { required: true, review_status: 'PENDING' }, submission: { status: 'NOT_SUBMITTED' } });
      audit(case_id, 'CASE_CREATED'); created.push({ case_id });
    });
    if (url.searchParams.get('analyze') === 'true') {
      const job_id = 'job-' + Date.now(); jobs.set(job_id, { at: Date.now() + 5000, created, errors });
      return send(res, 202, { job_id, status: 'queued' });
    }
    return send(res, 200, { created, errors });
  }
  if (id === 'upload' && parts[2] === 'jobs' && rq.method === 'GET') {
    const j = jobs.get(parts[3]); if (!j) return notFound(res, 'Job not found.');
    return send(res, 200, Date.now() >= j.at ? { job_id: parts[3], status: 'completed', created: j.created, errors: j.errors } : { job_id: parts[3], status: 'running' });
  }

  if (!id && rq.method === 'GET') {
    return send(res, 200, [...cases.values()].sort((a, b) => b.created_at.localeCompare(a.created_at)));
  }

  if (!id && rq.method === 'POST') {
    const b = await readBody(rq);
    const errs = [];
    ['patient_id', 'payer_id', 'plan_id', 'service_code', 'order_date'].forEach((f) => {
      if (!b || !b[f]) errs.push({ type: 'missing', loc: ['body', f], msg: 'Field required', input: null });
    });
    if (b && b.order_date && !/^\d{4}-\d{2}-\d{2}$/.test(b.order_date)) {
      errs.push({ type: 'value_error', loc: ['body', 'order_date'], msg: 'Value error, order_date must be YYYY-MM-DD', input: b.order_date, ctx: { error: {} } });
    }
    if (errs.length) return send(res, 422, { detail: errs });
    const now = new Date().toISOString();
    const case_id = 'PA-' + Math.random().toString(16).slice(2, 12).toUpperCase();
    const c = {
      case_id, status: 'CREATED', patient_id: b.patient_id,
      request: { encounter_id: '', service_description: '', diagnosis_code: '', diagnosis_text: '', ordering_provider: '', ...b },
      created_by: 'dev.user', created_at: now, updated_at: now, analyzed: false, overall: null, policy_id: null, criteria: [],
      open_items: [], notes: [], verifier: null, human_review: { required: true, review_status: 'PENDING' }, submission: { status: 'NOT_SUBMITTED' },
    };
    cases.set(case_id, c); audit(case_id, 'CASE_CREATED');
    return send(res, 201, c);
  }

  const c = cases.get(id);
  if (!c) return notFound(res);

  if (!action && rq.method === 'GET') return send(res, 200, c);

  if (action === 'analyze' && rq.method === 'POST') {
    if (!authUser.roles.includes('requester')) return send(res, 403, { detail: 'Requires role: requester' });
    audit(id, 'ANALYZE_STARTED');
    await delay(ANALYZE_DELAY_MS);
    Object.assign(c, { analyzed: true, status: 'DRAFT_REQUIRES_REVIEW', overall: 'ReadyForReview', policy_id: 'NW-MRI-LSPINE-v3', criteria: goodCriteria(),
      open_items: ['Neurological exam findings not found in the retrieved data'], verifier: { ok: true, problems: [], corrections: [] }, updated_at: new Date().toISOString() });
    audit(id, 'ANALYZE_COMPLETED', { status: c.status, overall: c.overall, verifier_problems: 0 });
    return send(res, 200, c);
  }

  if (action === 'evidence' && rq.method === 'GET') return c.analyzed && c.policy_id ? send(res, 200, evidenceFor(id)) : notFound(res, 'No evidence for this case.');
  if (action === 'draft' && rq.method === 'GET') return c.analyzed && c.policy_id ? send(res, 200, draftFor(id)) : notFound(res, 'Draft not found.');
  if (action === 'audit' && rq.method === 'GET') return send(res, 200, { case_id: id, events: audits.get(id) || [] });

  if (action === 'review' && rq.method === 'POST') {
    if (!authUser.roles.includes('reviewer')) return send(res, 403, { detail: 'Requires role: reviewer' });
    const b = await readBody(rq);
    const decision = b && (b.decision || b.review_status);
    if (!['ACCEPTED', 'CORRECTED', 'REJECTED'].includes(decision)) {
      return send(res, 422, { detail: [{ type: 'literal_error', loc: ['body', 'decision'], msg: "Input should be 'ACCEPTED', 'CORRECTED' or 'REJECTED'", input: decision }] });
    }
    c.human_review = { required: true, review_status: decision, reviewer_id: 'dev.user', reviewed_at: new Date().toISOString(), ...(b.comment ? { comment: b.comment } : {}) };
    c.status = 'REVIEWED_' + decision; c.updated_at = new Date().toISOString();
    (b.corrections || []).forEach((k) => { const t = c.criteria.find((x) => x.criterion_id === k.criterion_id); if (t) { t.status = k.status; t.rationale = k.rationale; } });
    audit(id, 'REVIEW_' + decision, { comment: b.comment || '' });
    return send(res, 200, c);
  }

  return notFound(res, 'Not Found');
}).listen(PORT, () => console.log(`Mock PA API on http://127.0.0.1:${PORT}${BASE}`));
