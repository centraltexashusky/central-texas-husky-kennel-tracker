import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

function handlerSource(path) {
  let source = fs.readFileSync(path, 'utf8');
  if (path.startsWith('js/')) {
    const embedded = source.match(/const __snuggleStayModuleSource = (`[\s\S]*`);\n\(0, eval\)/);
    source = vm.runInNewContext(embedded[1]);
  }
  const start = source.indexOf('$("#customerDogForm").addEventListener("submit"');
  const end = source.indexOf('$("#openCustomerDogModalButton")', start);
  return source.slice(start, end);
}

async function run(path, { role = 'customer', failure = '', status = 'Checked Out' } = {}) {
  const customer = { id: 'qa-customer', type: 'customerDog', dogName: 'QA Mango', sourceBoardingDogId: 'qa-boarding', vaccinationRecords: [{ name: 'old.pdf' }] };
  const boarding = { id: 'qa-boarding', type: 'boardingDog', boardingStatus: status, stays: [{ status }], vaccinationRecords: [{ name: 'old.pdf' }] };
  const writes = [], alerts = [], dialogs = [];
  let handler, closed = false, reset = false, saving = false;
  const form = { addEventListener: (_, fn) => { handler = fn; } };
  const elements = {};
  const context = {
    $: selector => selector === '#customerDogForm' ? form : (elements[selector] ||= {}),
    currentUser: { email: 'upload-qa@example.invalid', name: 'QA Owner' },
    currentRole: () => role, validateForm: () => true,
    customerVaccinationDateRangeError: () => null,
    customerDogsForCurrentUser: () => [customer],
    formPayload: () => ({ id: customer.id, dogName: customer.dogName }),
    readRecords: type => type === 'customerDog' ? [customer] : type === 'boardingDog' ? [boarding] : [],
    boardingDogIdFromCustomerDogValue: value => value,
    resolveCanonicalBoardingDogForSave: async () => boarding,
    normalizeEmail: value => value || '', uid: () => 'qa-new',
    durableDogPhoto: async () => ({}),
    uploadVaccinationFiles: async () => {
      if (failure === 'upload') throw new Error('Upload failed');
      return [{ name: 'new.pdf', storagePath: 'qa/new.pdf' }];
    },
    upsertRecord: (type, record) => ({ ...record, type }),
    sendPayload: async record => {
      writes.push(record);
      if (failure === record.type || (role === 'customer' && record.type === 'boardingDog')) throw new Error('new row violates row-level security policy for table kennel_records');
      return { ok: true };
    },
    notifyIfNeeded: async (record, event) => {
      alerts.push({ record, event });
      if (failure === 'alert') throw new Error('Alert unavailable');
    },
    customerDogVisibleToCustomer: () => true, boardingDogVisibleToCustomer: () => true,
    boardingDogWithCustomerProfilePatch: (record, dog) => ({ ...record, vaccinationRecords: dog.vaccinationRecords }),
    ensureCustomerAccessProfile: async () => { if (failure === 'access') throw new Error('Follow-up unavailable'); },
    resetCustomerDogForm: () => { reset = true; },
    closeCustomerDogModal: () => { closed = true; },
    renderCustomerDogs() {}, renderCustomerFiles() {}, renderBoardingDogs() {},
    escapeHtml: value => value, showToast() {},
    showDetailDialog: (title, body) => dialogs.push({ title, body }),
    setSubmitState: (_, value) => { saving = value; },
  };
  vm.runInNewContext(handlerSource(path), context);
  await handler({ preventDefault() {}, currentTarget: form });
  assert.equal(saving, false, 'Submit button must always be released');
  return { writes, alerts, dialogs, reset, closed };
}

for (const path of ['js/shared.js', 'script.js']) {
  for (const status of ['Pending', 'Approved', 'In Kennel', 'Ready For Pickup', 'Checked Out']) {
    const result = await run(path, { status });
    assert.deepEqual(result.writes.map(row => row.type), ['customerDog']);
    assert.equal(result.writes[0].vaccinationRecords.length, 2);
    assert.equal(result.alerts.length, 1);
    assert.equal(result.dialogs.at(-1).title, 'Dog Updated');
    assert.match(result.dialogs.at(-1).body, /1 vaccination file\(s\) uploaded/);
    assert(result.closed && result.reset);
  }
  const admin = await run(path, { role: 'admin' });
  assert.deepEqual(admin.writes.map(row => row.type), ['customerDog', 'boardingDog']);
  assert.equal(admin.dialogs.at(-1).title, 'Dog Updated');
  for (const failure of ['upload', 'customerDog']) {
    const result = await run(path, { failure });
    assert.equal(result.dialogs.at(-1).title, 'Dog Not Saved');
    assert.equal(result.alerts.length, 0);
    assert.equal(result.closed, false);
  }
  for (const failure of ['alert', 'access']) {
    const result = await run(path, { failure });
    assert.equal(result.dialogs.at(-1).title, 'Dog Saved — Follow-up Needed');
    assert.match(result.dialogs.at(-1).body, /Please do not upload the same files again/);
    assert(result.closed && result.reset);
  }
}
const main = fs.readFileSync('js/main.js', 'utf8');
for (const route of ['customerPage', 'customerRequestsPage', 'customerUpdatesPage', 'customerFilesPage']) {
  assert(main.includes(`${route}: ["customer", "boarding"]`), 'Customer route must load linked-profile helpers before first render');
}
assert(main.includes('customer-upload-save-v116'));
assert(fs.readFileSync('index.html', 'utf8').includes('customer-upload-save-v116'));
console.log('Customer upload save checks passed: customer/admin permissions, five stay statuses, retained files, alerts, genuine failures and durable-save follow-up failures.');
