import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const raw = fs.readFileSync("js/notifications.js", "utf8");
const literal = raw.match(/const __snuggleStayModuleSource = (`[\s\S]*`);\n\(0, eval\)\(__snuggleStayModuleSource\);/);
const source = vm.runInNewContext(literal[1]);
const reader = "staff@example.invalid";
const records = { notificationLog: [], notificationRead: [], boardingDog: [{ id: "pending-dog", status: "Pending" }] };
const button = { disabled: false };
const messages = [], writes = [];
let failures = new Set(), unconfirmed = false, fallbackFailure = false, skipRemote = false, held;
const context = {
  currentUser: { email: reader }, localTestMode: false, supabaseClient: {}, notificationReadSyncAvailable: true,
  currentUserNotificationKey: () => reader,
  normalizeEmail: value => String(value).toLowerCase().trim(),
  readRecords: type => structuredClone(records[type] || []),
  notificationVisibleToCurrentUser: item => item.audienceEmails.includes(reader),
  $: () => button,
  setSubmitState: (_button, busy) => { button.disabled = busy; },
  showToast: message => messages.push(message), renderNotifications() {},
  upsertRecord: (type, item) => {
    records[type] = records[type].map(existing => existing.id === item.id ? structuredClone(item) : existing);
    return item;
  },
  sendPayload: async item => {
    if (fallbackFailure) throw new Error("Offline");
    if (skipRemote) return { skippedRemote: true };
    writes.push(item.id);
    return { ok: true };
  },
  mergeNotificationReadRows: rows => rows.forEach(row => records.notificationRead.push({ notificationId: row.notification_id, readerKey: row.reader_key })),
  cuddleStayRequest: callback => callback({ from: table => {
    assert.equal(table, "notification_reads", "Only receipts, never booking or financial data, are written");
    return { upsert: (row, options) => {
      assert.equal(options.onConflict, "notification_id,reader_key");
      writes.push(row.notification_id);
      return { select: () => ({ maybeSingle: async () => {
        if (held) await held;
        return failures.has(row.notification_id)
          ? { data: null, error: { message: "Network unavailable" } }
          : { data: unconfirmed ? null : { id: "receipt-" + row.notification_id, ...row }, error: null };
      } }) };
    } };
  } }),
};
vm.createContext(context);
for (const name of ["notificationIsRead", "markNotificationRead", "markAllNotificationsRead", "saveNotificationReadReceipt"]) {
  const start = source.indexOf((name === "notificationIsRead" ? "" : "async ") + "function " + name + "(");
  assert.notEqual(start, -1, name);
  vm.runInContext(source.slice(start, source.indexOf("\n}", start) + 2), context);
}

const alert = (id, eventName = "customerBoardingRequestUpdated") => ({
  id, eventName, sourceId: "deleted-qa-dog", audienceEmails: [reader], readBy: [],
  sourceSnapshot: { id: "deleted-qa-dog", type: "boardingDog", status: "Pending" },
});
records.notificationLog = [alert("one"), alert("two"), alert("three", "customerBoardingRequestCreated")];
const originalBookings = JSON.stringify(records.boardingDog);
assert.equal(context.notificationIsRead(records.notificationLog[0]), false);
records.notificationRead = [{ notificationId: "one", readerKey: reader }];
assert.equal(context.notificationIsRead(records.notificationLog[0]), true, "Persisted receipt wins over a deleted dog's Pending snapshot, even without boarding helpers loaded");
assert.equal(context.notificationIsRead({ ...alert("legacy"), readBy: [reader] }), true, "Legacy acknowledgements still work");
assert.equal(context.notificationIsRead({ ...alert("other"), readBy: ["someone@example.invalid"] }), false, "Read state remains reader-specific");
records.notificationRead = [];
records.notificationLog.push({ ...alert("removed"), removed: true }, { ...alert("private"), audienceEmails: ["someone@example.invalid"] });
failures.add("two");
await context.markAllNotificationsRead();
assert.deepEqual(writes, ["one", "two", "three"]);
assert.equal(context.notificationIsRead(records.notificationLog[0]), true);
assert.equal(context.notificationIsRead(records.notificationLog[1]), false, "A failed save stays unread");
assert.match(messages.at(-1), /1 alert\(s\) could not/);
assert.equal(button.disabled, false);
failures.clear();
await context.markAllNotificationsRead();
assert.equal(writes.at(-1), "two", "Retry only resends the failed receipt");
assert.equal(records.notificationLog.slice(0, 3).every(context.notificationIsRead), true);
assert.match(messages.at(-1), /All alerts marked as read/);
const confirmed = structuredClone(records.notificationRead);
records.notificationRead = JSON.parse(JSON.stringify(confirmed));
assert.equal(records.notificationLog.slice(0, 3).every(context.notificationIsRead), true, "Rehydrated server receipts stay read");
await context.markAllNotificationsRead();
assert.match(messages.at(-1), /No unread alerts/);

records.notificationLog = [alert("single")];
await context.markNotificationRead("single");
assert.equal(context.notificationIsRead(records.notificationLog[0]), true, "Opening one alert marks it read");
unconfirmed = true;
await assert.rejects(context.saveNotificationReadReceipt("unconfirmed"), /could not be confirmed/);
assert.equal(context.notificationIsRead(alert("unconfirmed")), false);
unconfirmed = false;
records.notificationLog = [alert("busy")];
let release;
held = new Promise(resolve => { release = resolve; });
const inFlight = context.markAllNotificationsRead();
assert.equal(button.disabled, true);
await context.markAllNotificationsRead();
assert.equal(writes.filter(id => id === "busy").length, 1, "Repeated clicks do not duplicate writes");
release();
await inFlight;
held = null;

context.localTestMode = true;
records.notificationLog = [alert("fallback")];
fallbackFailure = true;
await assert.rejects(context.saveNotificationReadReceipt("fallback"), /Offline/);
assert.equal(context.notificationIsRead(records.notificationLog[0]), false, "Failed legacy saves do not leave a false local acknowledgement");
fallbackFailure = false;
skipRemote = true;
await assert.rejects(context.saveNotificationReadReceipt("fallback"), /could not be saved/);
skipRemote = false;
await context.saveNotificationReadReceipt("fallback");
assert.equal(context.notificationIsRead(records.notificationLog[0]), true);
assert.equal(JSON.stringify(records.boardingDog), originalBookings, "Marking read never approves or changes a booking");
assert.match(fs.readFileSync("js/main.js", "utf8"), /notifications\.js\?[^"\n]*notification-read-receipts-v105/);
assert.match(fs.readFileSync("index.html", "utf8"), /js\/main\.js\?[^"\n]*notification-read-receipts-v105/);
console.log("Notification read receipt checks passed (pending/deleted sources, persistence, reader isolation, partial failure/retry, duplicate clicks, fallback failures, no booking changes).");
