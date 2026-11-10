import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const embedded = fs.readFileSync('js/shared.js', 'utf8').match(/const __snuggleStayModuleSource = (`[\s\S]*`);\n\(0, eval\)/);
const source = vm.runInNewContext(embedded[1]);
const start = source.indexOf('async function writeCustomerDogRemoteRow(');
const end = source.indexOf('async function sendPayloadBatchIndividually(', start);
assert(start > 0 && end > start);

async function run({ exists = true, scope = 'member', savedScope = 'member', fail = '', type = 'customerDog', local = false } = {}) {
  const calls = [], signals = [], timeouts = [];
  const row = { id: 'customer-qa', type, payload: { pricingScopeOverride: scope, vaccinationRecords: [{ storagePath: 'qa/existing.pdf' }, { storagePath: 'qa/new.pdf' }] }, user_id: 'customer-user' };
  let saved = exists ? structuredClone({ ...row, payload: { ...row.payload, pricingScopeOverride: savedScope } }) : null;
  const context = {
    localTestMode: local, supabaseClient: {}, modeLabel: {},
    canWriteRemoteRecord: () => true,
    boardingPayloadForRemoteWrite: async value => value,
    remoteWriteIdentity: async () => ({ userId: row.user_id }),
    remoteWriteRow: () => row,
    remoteRequestAbortSignal: () => 'qa-abort-signal',
    withRemoteRequestTimeout: async request => { timeouts.push('request'); return request; },
    remoteSaveErrorMessage: error => error.message,
    showToast() {},
    cuddleStayRequest: async factory => factory({ from: table => {
      assert.equal(table, 'kennel_records');
      const build = operation => value => {
        const filters = [], entry = { operation, row: value, filters };
        calls.push(entry);
        const query = {
          eq: (key, val) => { filters.push([key, val]); return query; },
          select: value => { assert.equal(value, 'id'); return query; },
          maybeSingle: () => query, single: () => query,
          abortSignal: signal => { signals.push(signal); return query; },
          then: (resolve, reject) => Promise.resolve().then(() => {
            if (fail === operation) return { error: { message: operation + ' failed', code: '42501' } };
            if (operation === 'update') {
              assert.deepEqual(filters, [['id', row.id], ['type', 'customerDog']]);
              if (!saved || fail === 'inaccessible') return { data: null, error: null };
              if (fail === 'wrong-id') return { data: { id: 'other-dog' }, error: null };
              if (saved.payload.pricingScopeOverride !== value.payload.pricingScopeOverride) return { error: { message: 'Only staff can change customer dog pricing eligibility.' } };
              saved = structuredClone(value);
              return { data: { id: value.id }, error: null };
            }
            if (operation === 'insert') {
              if (scope === 'member') return { error: { message: 'Only staff can change customer dog pricing eligibility.' } };
              if (saved) return { error: { message: 'duplicate key' } };
              saved = structuredClone(value);
              return { data: fail === 'confirm' ? null : { id: value.id }, error: null };
            }
            assert.notEqual(type, 'customerDog', 'Customer dog saves must not use upsert');
            return { data: null, error: null };
          }).then(resolve, reject),
        };
        return query;
      };
      return { update: build('update'), insert: build('insert'), upsert: build('upsert') };
    } }),
  };
  vm.runInNewContext(source.slice(start, end), context);
  let result, error;
  try { result = await context.sendPayload({ id: row.id, type }); } catch (err) { error = err; }
  return { calls, signals, timeouts, saved, result, error, status: context.modeLabel.textContent };
}

const member = await run();
assert.equal(member.result.ok, true);
assert.deepEqual(member.calls.map(c => c.operation), ['update']);
assert.equal(member.saved.payload.pricingScopeOverride, 'member');
assert.equal(member.saved.payload.vaccinationRecords.length, 2);
assert.deepEqual(member.signals, ['qa-abort-signal']);
assert.equal(member.timeouts.length, 1, 'No outer timeout may leave a save running after reported failure');
const regular = await run({ scope: 'regular', savedScope: 'regular' });
assert.equal(regular.result.ok, true);
const added = await run({ exists: false, scope: 'regular' });
assert.deepEqual(added.calls.map(c => c.operation), ['update', 'insert']);
assert.equal(added.result.ok, true);
assert.equal(added.timeouts.length, 2, 'Each network request has exactly one timeout');
for (const options of [
  { scope: 'regular' },
  { fail: 'update' },
  { fail: 'wrong-id' },
  { fail: 'inaccessible', scope: 'regular', savedScope: 'regular' },
  { exists: false },
  { exists: false, scope: 'regular', fail: 'insert' },
  { exists: false, scope: 'regular', fail: 'confirm' },
]) {
  const result = await run(options);
  assert(result.error, JSON.stringify(options) + ' must not report success');
  assert.equal(result.status, 'Save failed');
  if (['update', 'wrong-id'].includes(options.fail) || options.scope === 'regular' && options.exists === undefined && !options.fail) {
    assert.equal(result.calls.length, 1, 'Never insert after an update error');
  }
}
const local = await run({ local: true });
assert.equal(local.result.local, true);
assert.equal(local.calls.length, 0);
const other = await run({ type: 'request' });
assert.equal(other.result.ok, true);
assert.deepEqual(other.calls.map(c => c.operation), ['upsert']);
assert(fs.readFileSync('js/main.js', 'utf8').includes('customer-member-save-20261110'));
assert(fs.readFileSync('index.html', 'utf8').includes('customer-member-save-20261110'));
console.log('Customer member save checks passed: existing member/regular updates, new regular inserts, retained files, pricing protection, failed writes, confirmation, local mode and unrelated records.');
