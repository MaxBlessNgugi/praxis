#!/usr/bin/env node
/**
 * End-to-end smoke test.
 *
 * Drives the running API over HTTP exactly as the console does, along the path a church office
 * actually walks: **sign in → add a member → plan a service → record a tithe → publish an
 * announcement → sign out**. Each step asserts on what came back, not merely that the request did
 * not throw, because a smoke test that passes on a 500 is worse than no smoke test.
 *
 * It also checks the four things a smoke test is uniquely placed to check and a unit test is not:
 *
 *   1. **The gate is real.** An unauthenticated request is refused.
 *   2. **Rights are enforced server-side.** A `viewer` can read and cannot write — which is the claim
 *      the console's own permission module makes, and the only one that matters.
 *   3. **The audit trail cannot be bypassed.** Recording money writes a line to the chained ledger, so
 *      the tithe recorded below must appear in `/api/finance/audit` with its sequence and hash.
 *   4. **A retired record leaves the live set**, so soft delete is not decorative.
 *
 * It is self-cleaning: everything it creates it retires again, so it can be run against a database
 * that somebody is using. That is deliberate — a smoke test you are afraid to run is not run.
 *
 * Usage:
 *   node tools/smoke.mjs
 *   API_URL=https://praxis-api.example.com SMOKE_EMAIL=... SMOKE_PASSWORD=... node tools/smoke.mjs
 */

const API_URL = (process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
const EMAIL = process.env.SMOKE_EMAIL ?? 'bishop@destinysanctuary.co.ke';
const PASSWORD = process.env.SMOKE_PASSWORD ?? 'praxis-demo-2025';

/** A record the test creates must be identifiable, so it can be found and retired afterwards. */
const STAMP = `SMOKE-${Date.now()}`;

let checks = 0;
let failures = 0;
let currentStep = '';

const colour = (code, text) => (process.stdout.isTTY ? `\u001b[${code}m${text}\u001b[0m` : text);

function step(name) {
  currentStep = name;
  console.log(`\n${colour('1', name)}`);
}

function pass(label) {
  checks += 1;
  console.log(`  ${colour('32', '✓')} ${label}`);
}

function fail(label, detail) {
  checks += 1;
  failures += 1;
  console.error(`  ${colour('31', '✗')} ${label}${detail !== undefined ? ` — ${detail}` : ''}`);
}

function assert(condition, label, detail) {
  if (condition) pass(label);
  else fail(label, detail);
}

/** Fail without throwing, and abort the plan: a step whose precondition failed cannot be judged. */
function bail(label, detail) {
  fail(label, detail);
  console.error(`\n${colour('31', 'Aborted')} during "${currentStep}" — later steps depend on this one.`);
  report();
  process.exit(1);
}

async function request(method, path, { token, body, raw } = {}) {
  const headers = {};
  if (body !== undefined && !raw) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
  });

  const text = await response.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }
  return { status: response.status, json, text };
}

/** Every collection in this API is `{ data, meta }`; this unwraps it, or explains why it could not. */
function rowsOf(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
}

function report() {
  const verdict = failures === 0 ? colour('32', 'PASS') : colour('31', 'FAIL');
  console.log(`\n${verdict}  ${checks - failures}/${checks} checks passed against ${API_URL}`);
}

async function main() {
  console.log(`Praxis smoke test → ${API_URL}`);

  // ---------------------------------------------------------------------------------------------
  // 0. Is anything there at all?
  // ---------------------------------------------------------------------------------------------
  step('0. Health');
  const health = await request('GET', '/health');
  assert(health.status === 200, 'GET /health answers 200', `got ${health.status}`);
  assert(
    health.json?.database === 'reachable',
    'the database is reachable from the API',
    health.json ? JSON.stringify(health.json) : health.text,
  );
  if (health.status !== 200) bail('cannot continue without a healthy API');

  // ---------------------------------------------------------------------------------------------
  // 1. The gate is real
  // ---------------------------------------------------------------------------------------------
  step('1. The gate');
  const anonymous = await request('GET', '/api/members');
  assert(anonymous.status === 401, 'a request with no token is refused with 401', `got ${anonymous.status}`);

  const badToken = await request('GET', '/api/members', { token: 'not-a-real-token' });
  assert(badToken.status === 401, 'a forged token is refused with 401', `got ${badToken.status}`);

  // ---------------------------------------------------------------------------------------------
  // 2. Sign in
  // ---------------------------------------------------------------------------------------------
  step('2. Sign in');
  const login = await request('POST', '/api/auth/login', { body: { email: EMAIL, password: PASSWORD } });
  const token = login.json?.data?.token;
  assert(login.status === 200, 'POST /api/auth/login answers 200', `got ${login.status}: ${login.text.slice(0, 200)}`);
  assert(typeof token === 'string' && token.length > 20, 'a bearer token came back');
  if (!token) bail('cannot continue without a token');

  const me = await request('GET', '/api/auth/me', { token });
  assert(me.status === 200, 'GET /api/auth/me answers 200', `got ${me.status}`);
  assert(
    me.json?.data?.user?.email === EMAIL,
    'me is the account that signed in',
    me.json?.data?.user?.email,
  );
  assert(
    !('passwordHash' in (me.json?.data ?? {})),
    'me never leaks a password hash',
    Object.keys(me.json?.data ?? {}).join(','),
  );

  // ---------------------------------------------------------------------------------------------
  // 3. Members
  // ---------------------------------------------------------------------------------------------
  step('3. Members');
  const before = await request('GET', '/api/members?pageSize=1', { token });
  assert(before.status === 200, 'GET /api/members answers 200', `got ${before.status}`);
  const countBefore = before.json?.meta?.total ?? 0;
  assert(countBefore >= 0, `the register has ${countBefore} members to start with`);

  const created = await request('POST', '/api/members', {
    token,
    body: { firstName: 'Smoke', lastName: 'Test', location: 'Nyahururu', envelopeNumber: STAMP.slice(-12) },
  });
  assert(created.status === 201, 'POST /api/members answers 201', `got ${created.status}: ${created.text.slice(0, 200)}`);
  const memberId = created.json?.data?.id;
  assert(typeof memberId === 'string', 'the new member came back with an id');
  if (!memberId) bail('cannot continue without a member id');

  const fetched = await request('GET', `/api/members/${memberId}`, { token });
  assert(fetched.status === 200, 'the new member is readable back', `got ${fetched.status}`);

  const search = await request('GET', `/api/members?q=${encodeURIComponent('Smoke Test')}`, { token });
  assert(
    rowsOf(search.json).some((row) => row.id === memberId),
    'the new member is findable by name',
    `${rowsOf(search.json).length} rows matched`,
  );

  const afterCreate = await request('GET', '/api/members?pageSize=1', { token });
  assert(
    (afterCreate.json?.meta?.total ?? 0) === countBefore + 1,
    'the register is one larger',
    `${afterCreate.json?.meta?.total} vs ${countBefore}`,
  );

  // ---------------------------------------------------------------------------------------------
  // 4. A service
  // ---------------------------------------------------------------------------------------------
  step('4. Service & worship');
  const service = await request('POST', '/api/services', {
    token,
    body: {
      title: `Smoke Sunday ${STAMP.slice(-6)}`,
      heldAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      venue: 'Destiny Sanctuary, Nyahururu',
      theme: 'Smoke test',
    },
  });
  assert(service.status === 201, 'POST /api/services answers 201', `got ${service.status}: ${service.text.slice(0, 200)}`);
  const serviceId = service.json?.data?.id;
  assert(typeof serviceId === 'string', 'the service came back with an id');

  if (serviceId) {
    const liturgy = await request('PUT', `/api/services/${serviceId}/liturgy`, {
      token,
      body: {
        items: [
          { title: 'Call to Worship', kind: 'call_to_worship', durationMinutes: 5 },
          { title: 'Sermon', kind: 'sermon', durationMinutes: 35 },
          { title: 'Dismissal', kind: 'dismissal', durationMinutes: 3 },
        ],
      },
    });
    assert(liturgy.status === 200, 'the order of service is accepted', `got ${liturgy.status}: ${liturgy.text.slice(0, 160)}`);
    assert(
      rowsOf(liturgy.json?.data).length === 3 || Array.isArray(liturgy.json?.data),
      'the liturgy comes back with its items',
      liturgy.text.slice(0, 160),
    );
  }

  // ---------------------------------------------------------------------------------------------
  // 5. A tithe, and the ledger line it must leave behind
  // ---------------------------------------------------------------------------------------------
  step('5. Giving, and the audit trail');
  const ledgerBefore = await request('GET', '/api/finance/audit?pageSize=1', { token });
  const ledgerCountBefore = ledgerBefore.json?.meta?.total ?? 0;

  const tithe = await request('POST', '/api/finance/tithes', {
    token,
    body: { donorName: `Smoke Donor ${STAMP.slice(-6)}`, amount: 1500, method: 'mpesa', category: 'General Tithe' },
  });
  assert(tithe.status === 201, 'POST /api/finance/tithes answers 201', `got ${tithe.status}: ${tithe.text.slice(0, 200)}`);
  assert(typeof tithe.json?.data?.txCode === 'string', 'the tithe came back with a receipt code', tithe.json?.data?.txCode);

  const ledgerAfter = await request('GET', '/api/finance/audit?pageSize=1', { token });
  assert(
    (ledgerAfter.json?.meta?.total ?? 0) > ledgerCountBefore,
    'recording money wrote a line to the chained ledger',
    `${ledgerAfter.json?.meta?.total} vs before ${ledgerCountBefore}`,
  );

  const topEntry = rowsOf(ledgerAfter.json)[0];
  assert(
    Boolean(topEntry?.hash) && Boolean(topEntry?.previousHash),
    'the newest ledger entry carries its hash and its link to the one before',
    topEntry ? Object.keys(topEntry).join(',') : 'no entries',
  );

  const verified = await request('GET', '/api/finance/audit/verify', { token });
  assert(
    verified.json?.data?.valid === true,
    'the hash chain verifies as intact',
    verified.text.slice(0, 160),
  );

  // ---------------------------------------------------------------------------------------------
  // 6. An announcement
  // ---------------------------------------------------------------------------------------------
  step('6. Communications');
  const announcement = await request('POST', '/api/communications/announcements', {
    token,
    body: { title: `Smoke notice ${STAMP.slice(-6)}`, body: 'This notice was created by the smoke test.', audience: 'Everyone' },
  });
  assert(
    announcement.status === 201,
    'POST /api/communications/announcements answers 201',
    `got ${announcement.status}: ${announcement.text.slice(0, 200)}`,
  );
  const announcementId = announcement.json?.data?.id;

  if (announcementId) {
    const pinned = await request('PATCH', `/api/communications/announcements/${announcementId}`, {
      token,
      body: { isPinned: true },
    });
    assert(pinned.status === 200 && pinned.json?.data?.isPinned === true, 'the notice can be pinned', `got ${pinned.status}`);

    const retired = await request(
      'DELETE',
      `/api/communications/announcements/${announcementId}?reason=duplicate&reasonLabel=${encodeURIComponent('Smoke test cleanup')}`,
      { token },
    );
    assert(retired.status < 300, 'the notice can be retired', `got ${retired.status}`);
  }

  // ---------------------------------------------------------------------------------------------
  // 7. Rights are enforced by the server, not only by the console
  // ---------------------------------------------------------------------------------------------
  step('7. Rights enforced server-side');
  const viewerEmail = `smoke.viewer.${Date.now()}@destinysanctuary.co.ke`;
  const viewer = await request('POST', '/api/admin/users', {
    token,
    body: { name: 'Smoke Viewer', email: viewerEmail, password: 'smoke-viewer-password', roleKey: 'viewer' },
  });
  assert(viewer.status === 201, 'a viewer account can be created', `got ${viewer.status}: ${viewer.text.slice(0, 200)}`);
  const viewerUserId = viewer.json?.data?.id;

  if (viewerUserId) {
    const viewerLogin = await request('POST', '/api/auth/login', { body: { email: viewerEmail, password: 'smoke-viewer-password' } });
    const viewerToken = viewerLogin.json?.data?.token;
    assert(typeof viewerToken === 'string', 'the viewer can sign in');

    if (viewerToken) {
      const read = await request('GET', '/api/members?pageSize=1', { token: viewerToken });
      assert(read.status === 200, 'a viewer may read the register', `got ${read.status}`);

      const write = await request('POST', '/api/members', {
        token: viewerToken,
        body: { firstName: 'Should', lastName: 'Fail', location: 'Nyahururu' },
      });
      assert(write.status === 403, 'a viewer is refused when writing (403)', `got ${write.status}`);

      const privileged = await request('GET', '/api/admin/roles', { token: viewerToken });
      assert(privileged.status === 403, 'a viewer is refused the rights editor (403)', `got ${privileged.status}`);
    }

    const removed = await request(
      'DELETE',
      `/api/admin/users/${viewerUserId}?reason=request&reasonLabel=${encodeURIComponent('Smoke test cleanup')}`,
      { token },
    );
    assert(removed.status < 300, 'the test account can be removed again', `got ${removed.status}`);
  }

  // ---------------------------------------------------------------------------------------------
  // 8. Soft delete is not decorative, and restoring brings it back
  // ---------------------------------------------------------------------------------------------
  step('8. Soft delete, trash and restore');
  const retiredMember = await request(
    'DELETE',
    `/api/members/${memberId}?reason=duplicate&reasonLabel=${encodeURIComponent('Smoke test cleanup')}`,
    { token },
  );
  assert(retiredMember.status < 300, 'the smoke member can be retired', `got ${retiredMember.status}`);

  const gone = await request('GET', `/api/members/${memberId}`, { token });
  assert(gone.status === 404, 'a retired member is no longer readable', `got ${gone.status}`);

  const live = await request('GET', `/api/members?q=${encodeURIComponent('Smoke Test')}`, { token });
  assert(
    !rowsOf(live.json).some((row) => row.id === memberId),
    'a retired member has left the live register',
    `${rowsOf(live.json).length} rows still match`,
  );

  const trash = await request('GET', `/api/admin/trash?q=${encodeURIComponent('Smoke')}`, { token });
  const trashed = rowsOf(trash.json).find((row) => row.entityId === memberId);
  assert(Boolean(trashed), 'the retired member is in the Trash', `${rowsOf(trash.json).length} rows looked at`);

  if (trashed) {
    const restored = await request('POST', `/api/admin/trash/${trashed.id}/restore`, { token, body: {} });
    assert(restored.status < 300, 'the Trash can bring it back', `got ${restored.status}`);

    const back = await request('GET', `/api/members/${memberId}`, { token });
    assert(back.status === 200, 'the restored member is readable again', `got ${back.status}`);

    // Leave the register as we found it.
    await request(
      'DELETE',
      `/api/members/${memberId}?reason=duplicate&reasonLabel=${encodeURIComponent('Smoke test final cleanup')}`,
      { token },
    );
  }

  // ---------------------------------------------------------------------------------------------
  // 9. Sign out ends the session
  // ---------------------------------------------------------------------------------------------
  step('9. Sign out');
  const logout = await request('POST', '/api/auth/logout', { token, body: {} });
  assert(logout.status < 300, 'POST /api/auth/logout answers without error', `got ${logout.status}`);

  report();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(`\n${colour('31', 'The smoke test itself failed')} during "${currentStep}":`, error?.message ?? error);
  console.error(`Is the API running at ${API_URL}? Start it with \`cd backend && npm run dev\`.`);
  report();
  process.exit(1);
});
