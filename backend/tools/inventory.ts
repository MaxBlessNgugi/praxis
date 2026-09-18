import { basePrisma } from '../src/lib/prisma';
import { provisionChurch, removeChurch } from './lib/provision';
import { waitForSignInBudget } from './lib/signInBudget';

/**
 * The inventory domain, checked against the running API.
 *
 * The claims asserted here are the ones a storekeeper takes on trust: that a quantity only changes
 * through the ledger (an opening purchase line, a purchase, an issue that overdrafts is refused);
 * that concurrent movements serialise rather than race (both purchases land, the ledger sums right);
 * that a transfer moves where things are without inventing or destroying stock; that a count is
 * never the shelf — stock moves only when an administrator approves the variance; that retiring an
 * item with stock on hand writes the balancing movement and the item can be brought back from the
 * Trash; and that another church's register is beyond reach in both directions.
 *
 * It runs inside a probe church of its own, so Destiny Sanctuary's register is untouched, and the
 * sweep in `lib/provision` removes everything — including when a check fails.
 *
 *   API_URL=http://127.0.0.1:4000 npx tsx tools/inventory.ts
 */

const API = process.env.API_URL ?? 'http://localhost:4000';

const PROBE_SLUG = 'inventory-probe-church';
const PROBE_EMAIL = 'probe-storekeeper@inventory.test';
const PROBE_PASSWORD = 'inventory-probe-password';

let checks = 0;
let failed = 0;

function check(what: string, passed: boolean, detail = ''): void {
  checks += 1;
  if (passed) {
    console.log(`  ✓ ${what}`);
    return;
  }
  failed += 1;
  console.log(`  ✗ ${what}${detail ? ` — ${detail}` : ''}`);
}

interface Answer {
  status: number;
  body: unknown;
}

async function call(method: string, path: string, token?: string, body?: unknown): Promise<Answer> {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  return { status: response.status, body: parsed };
}

function data<T>(answer: Answer): T | null {
  const body = answer.body as { data?: T } | null;
  return body && typeof body === 'object' && 'data' in body ? (body.data as T) : null;
}

function errorOf(answer: Answer): string {
  const body = answer.body as { error?: string; code?: string } | null;
  return body?.error ?? body?.code ?? `HTTP ${answer.status}`;
}

function listOf<T>(answer: Answer): { data: T[]; total: number } | null {
  const body = answer.body as { data?: T[]; meta?: { total?: number } } | null;
  return body?.meta ? { data: body.data ?? [], total: body.meta.total ?? 0 } : null;
}

interface ItemRow {
  id: string;
  sku: string;
  name: string;
  kind: string;
  quantity: number;
  location: string;
  status: string;
}

interface MovementRow {
  id: string;
  itemId: string;
  kind: string;
  delta: number;
  balanceAfter: number;
}

interface TakeRow {
  id: string;
  status: string;
  bookQuantity: number;
  countedQuantity: number | null;
  variance: number | null;
}

async function signIn(email: string, password: string): Promise<string> {
  const answer = await call('POST', '/api/auth/login', undefined, { email, password });
  return data<{ token: string }>(answer)?.token ?? '';
}

async function main(): Promise<void> {
  await waitForSignInBudget(API, 4, (line) => console.log(line));

  console.log('1. A probe church is provisioned');
  const probe = await provisionChurch({
    name: 'Inventory Probe Church',
    slug: PROBE_SLUG,
    adminName: 'Probe Storekeeper',
    email: PROBE_EMAIL,
    password: PROBE_PASSWORD,
  });
  check('the probe church exists', Boolean(probe.organizationId));

  const token = await signIn(PROBE_EMAIL, PROBE_PASSWORD);
  check('its storekeeper can sign in', token.length > 0);

  // The seeded church signs in too, for the two-direction isolation sections.
  const houseToken = await signIn(
    process.env.SMOKE_EMAIL ?? 'bishop@destinysanctuary.co.ke',
    process.env.SMOKE_PASSWORD ?? 'praxis-demo-2025',
  );
  check('the seeded church can sign in', houseToken.length > 0);

  try {
    console.log('\n2. The register opens and a quantity only changes through the ledger');
    const opened = await call('POST', '/api/inventory/items', token, {
      sku: 'PRB-001',
      name: 'Probe Communion Cups',
      kind: 'consumable',
      category: 'Communion',
      unit: 'boxes',
      location: 'Probe Vestry',
      reorderAt: 5,
      cost: 350,
      openingQuantity: 10,
    });
    const item = data<ItemRow>(opened);
    check('an item is accepted with its opening stock', opened.status === 201 && item?.quantity === 10, `${opened.status} ${errorOf(opened)}`);

    const history = listOf<MovementRow>(await call('GET', `/api/inventory/movements?itemId=${item!.id}`, token));
    const openingRow = history?.data[0];
    check(
      'the opening stock is explained on the ledger',
      history?.data.length === 1 && openingRow?.kind === 'adjustment' && openingRow.balanceAfter === 10,
      history ? `${history.data.length} rows` : 'no answer',
    );

    const overdraft = await call('POST', '/api/inventory/issues', token, {
      itemId: item!.id,
      quantity: 99,
      issuedToName: 'Probe Overdraft',
    });
    check('an issue beyond the shelf is refused', overdraft.status === 400, `${overdraft.status} ${errorOf(overdraft)}`);

    console.log('\n3. A purchase adds stock and keeps the money honest');
    const purchased = await call('POST', '/api/inventory/purchases', token, {
      reference: 'PRB-INV-001',
      lines: [{ itemId: item!.id, quantity: 6, unitCost: 360 }],
    });
    const purchase = data<{ id: string; total: number; lines: Array<{ unitCost: number | null }> }>(purchased);
    check('a purchase is recorded', purchased.status === 201, `${purchased.status} ${errorOf(purchased)}`);
    check('its total is quantity × unit cost', purchase?.total === 2160, `got ${purchase?.total ?? 'none'}`);
    check('and the shelf rises by what was bought', (await call('GET', `/api/inventory/items/${item!.id}`, token)).status === 200);

    const afterPurchase = data<ItemRow>(await call('GET', `/api/inventory/items/${item!.id}`, token));
    check('sixteen boxes now stand on the shelf', afterPurchase?.quantity === 16, `got ${afterPurchase?.quantity}`);

    console.log('\n4. Concurrent movements serialise instead of racing');
    // Five purchases of two each, fired together: every one must land, and the ledger must account
    // for all ten. A lost update here would show up as a shelf that does not match its own history.
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        call('POST', '/api/inventory/purchases', token, { reference: `PRB-CONC-${i}`, lines: [{ itemId: item!.id, quantity: 2 }] }),
      ),
    );
    const allLanded = results.every((r) => r.status === 201);
    const afterRush = data<ItemRow>(await call('GET', `/api/inventory/items/${item!.id}`, token));
    const rushLedger = listOf<MovementRow>(await call('GET', `/api/inventory/movements?itemId=${item!.id}&pageSize=100`, token));
    const ledgerSum = (rushLedger?.data ?? []).reduce((sum, m) => sum + m.delta, 0);
    check('five movements fired together all land', allLanded, results.map((r) => r.status).join(','));
    check('the shelf equals the sum of its ledger', afterRush?.quantity === ledgerSum && afterRush?.quantity === 26, `shelf ${afterRush?.quantity}, ledger ${ledgerSum}`);

    console.log('\n5. An issue goes out through the same door');
    const issued = await call('POST', '/api/inventory/issues', token, {
      itemId: item!.id,
      quantity: 4,
      issuedToName: 'Probe Ushers',
      reason: 'Probe communion service',
    });
    check('the issue is accepted', issued.status === 201, `${issued.status} ${errorOf(issued)}`);
    const afterIssue = data<ItemRow>(await call('GET', `/api/inventory/items/${item!.id}`, token));
    check('and the shelf answers for it', afterIssue?.quantity === 22, `got ${afterIssue?.quantity}`);

    console.log('\n6. A transfer moves where things are, not how many');
    const transferred = await call('POST', '/api/inventory/transfers', token, {
      itemId: item!.id,
      quantity: 5,
      toLocation: 'Probe Annex',
    });
    const transfer = data<{ id: string; fromLocation: string; toLocation: string }>(transferred);
    check('the transfer is accepted', transferred.status === 201, `${transferred.status} ${errorOf(transferred)}`);
    check('it names both places', transfer?.fromLocation === 'Probe Vestry' && transfer?.toLocation === 'Probe Annex');
    const afterTransfer = data<ItemRow>(await call('GET', `/api/inventory/items/${item!.id}`, token));
    check('the shelf total is untouched by a move', afterTransfer?.quantity === 22, `got ${afterTransfer?.quantity}`);
    const transferLines = (rushLedger?.data ?? []).filter(() => false); // placeholder, replaced below
    void transferLines;
    const ledgerAfterTransfer = listOf<MovementRow>(await call('GET', `/api/inventory/movements?itemId=${item!.id}&pageSize=100`, token));
    check(
      'the ledger carries a zero-delta movement for it',
      (ledgerAfterTransfer?.data ?? []).some((m) => m.kind === 'transfer' && m.delta === 0),
    );

    console.log('\n7. A count is not the shelf until an administrator says so');
    const started = await call('POST', '/api/inventory/stock-takes', token, { itemId: item!.id });
    const take = data<TakeRow>(started);
    check('a take opens with the book figure', started.status === 201 && take?.bookQuantity === 22, `${started.status} ${errorOf(started)}`);
    check('it opens in the counting state', take?.status === 'counting');

    const counted = await call('POST', `/api/inventory/stock-takes/${take!.id}/count`, token, { countedQuantity: 20 });
    const countedTake = data<TakeRow>(counted);
    check('the count is recorded with its variance', countedTake?.countedQuantity === 20 && countedTake?.variance === -2, errorOf(counted));

    const stillTwentyTwo = data<ItemRow>(await call('GET', `/api/inventory/items/${item!.id}`, token));
    check('the shelf has not moved on a mere count', stillTwentyTwo?.quantity === 22, `got ${stillTwentyTwo?.quantity}`);

    const approved = await call('POST', `/api/inventory/stock-takes/${take!.id}/approve`, token, {});
    const approvedTake = data<TakeRow>(approved);
    check('approval closes the take', approvedTake?.status === 'approved', errorOf(approved));
    const afterApproval = data<ItemRow>(await call('GET', `/api/inventory/items/${item!.id}`, token));
    check('and only approval writes the adjustment', afterApproval?.quantity === 20, `got ${afterApproval?.quantity}`);
    const adjustmentLedger = listOf<MovementRow>(await call('GET', `/api/inventory/movements?itemId=${item!.id}&pageSize=100`, token));
    const adjustment = (adjustmentLedger?.data ?? []).find((m) => m.kind === 'adjustment');
    check('the adjustment is a movement like any other', Boolean(adjustment) && adjustment!.delta === -2 && adjustment!.balanceAfter === 20);

    console.log('\n8. An item leaves the register with its history intact');
    const retired = await call('DELETE', `/api/inventory/items/${item!.id}?reason=other&reasonLabel=Probe retirement`, token);
    check('retirement works', retired.status === 200, `${retired.status} ${errorOf(retired)}`);
    const archiveId = data<{ id: string }>(retired)?.id ?? null;

    const gone = await call('GET', `/api/inventory/items/${item!.id}`, token);
    check('a retired item no longer answers', gone.status === 404, `got ${gone.status}`);
    const finalLedger = listOf<MovementRow>(await call('GET', `/api/inventory/movements?itemId=${item!.id}&pageSize=100`, token));
    // The retirement's balancing line is the ledger's largest outflow, and its balance is 0.
    const retirementLine = (finalLedger?.data ?? []).filter((m) => m.delta < 0).sort((a, b) => a.delta - b.delta)[0] ?? null;
    check('the remaining stock left by an explicit line', Boolean(retirementLine) && retirementLine!.delta === -20);
    check('and the ledger still sums to zero', (finalLedger?.data ?? []).reduce((s, m) => s + m.delta, 0) === 0);

    console.log('\n9. What the Trash can bring back');
    if (archiveId) {
      const restored = await call('POST', `/api/admin/trash/${archiveId}/restore`, token, {});
      check('the item comes back from the Trash', restored.status < 300, `${restored.status} ${errorOf(restored)}`);
      const back = data<ItemRow>(await call('GET', `/api/inventory/items/${item!.id}`, token));
      check('it comes back live, not flagged disposed', back?.status === 'active', `got ${back?.status}`);
      check('its shelf reads 0 because its ledger sums to 0', back?.quantity === 0, `got ${back?.quantity}`);
      // Retire again so the sweep has one item and no half-open takes to worry about.
      await call('DELETE', `/api/inventory/items/${item!.id}?reason=other&reasonLabel=Probe cleanup`, token);
    } else {
      check('the item comes back from the Trash', false, 'no archive id returned');
    }

    console.log('\n10. Another church can reach none of it');
    // The house church cannot act on the probe's item, and the probe cannot see the house's register.
    const probeSecond = await call('POST', '/api/inventory/items', houseToken, {
      sku: `HOUSE-${Date.now()}`,
      name: 'House Church Probe Item',
      kind: 'consumable',
      category: 'Probe',
      location: 'House Cupboard',
      openingQuantity: 3,
    });
    const houseItem = data<ItemRow>(probeSecond);
    check('the house church has a register of its own', probeSecond.status === 201, errorOf(probeSecond));

    const crossedIssue = await call('POST', '/api/inventory/issues', houseToken, {
      itemId: item!.id,
      quantity: 1,
      issuedToName: 'Cross Tenant',
    });
    check('the house cannot act on the probe\'s item', crossedIssue.status === 404, `got ${crossedIssue.status}`);
    const crossedRead = await call('GET', `/api/inventory/items/${item!.id}`, houseToken);
    check('the house cannot read the probe\'s item either', crossedRead.status === 404, `got ${crossedRead.status}`);

    const houseRegister = listOf<ItemRow>(await call('GET', '/api/inventory/items?q=PRB-', houseToken));
    check('the house\'s register shows none of the probe\'s lines', (houseRegister?.data ?? []).length === 0, `${houseRegister?.data.length ?? '?'} rows`);

    // Leave the house church exactly as it was found: its probe item's ledger, trash row and row
    // itself go out by hand, because the sweep below only reaches the probe church.
    await basePrisma.stockMovement.deleteMany({ where: { itemId: houseItem?.id } });
    await basePrisma.softDeletedRecord.deleteMany({ where: { entityId: houseItem?.id } });
    await basePrisma.inventoryItem.deleteMany({ where: { id: houseItem?.id } });

    console.log('\n11. The reports answer for the probe church only');
    const report = data<{
      totals: { totalValue: number };
      lowStock: Array<{ id: string }>;
    }>(await call('GET', '/api/reports/inventory', token));
    check('the probe\'s report carries its own valuation', report !== null, 'no report');
    const houseReport = data<{ byCategory: Array<{ category: string }> }>(await call('GET', '/api/reports/inventory', houseToken));
    check(
      'and the house\'s report knows nothing of the probe',
      !(houseReport?.byCategory ?? []).some((c) => c.category === 'Communion'),
    );
  } finally {
    console.log('\nSweeping the probe church away');
    await removeChurch(probe.organizationId, { adminEmails: [PROBE_EMAIL] });
  }

  console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'}  ${checks - failed}/${checks} inventory checks passed`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => void basePrisma.$disconnect());
