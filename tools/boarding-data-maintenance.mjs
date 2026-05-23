#!/usr/bin/env node

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const args = new Set(process.argv.slice(2));
const APPLY = args.has("--apply");
const MERGE_PROFILES = !args.has("--no-merge-profiles");
const JSON_OUTPUT = args.has("--json");

if (args.has("--help")) {
  console.log(`Usage:
  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node tools/boarding-data-maintenance.mjs [--apply] [--no-merge-profiles] [--json]

Default mode is dry-run. --apply soft-merges duplicate boarding dog profiles and duplicate logical stays.
No rows are deleted; duplicate profiles are marked removed and retained for rollback/audit.`);
  process.exit(0);
}

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const REST_URL = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/kennel_records`;
const headers = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
};

const lifecycleStatuses = ["Pending", "Approved", "Checked In", "In Kennel", "Ready For Pickup", "Checked Out", "Cancelled"];
const statusPriority = {
  "In Kennel": 70,
  "Checked In": 60,
  "Ready For Pickup": 50,
  Approved: 40,
  Pending: 30,
  "Checked Out": 20,
  Cancelled: 10,
};

const arrayValue = (value) => Array.isArray(value) ? value : [];
const normalizeEmail = (value = "") => String(value || "").trim().toLowerCase();
const normalizedPhoneToken = (value = "") => String(value || "").replace(/\D/g, "");
const normalizeDogName = (record = {}) => String(record.dogName || record.callName || record.showName || "").trim().toLowerCase();

function normalizeBoardingStatus(value = "") {
  const status = String(value || "").trim();
  if (lifecycleStatuses.includes(status)) return status;
  const lower = status.toLowerCase();
  if (lower.includes("ready")) return "Ready For Pickup";
  if (lower.includes("checked out") || lower.includes("complete")) return "Checked Out";
  if (lower.includes("checked in")) return "Checked In";
  if (lower.includes("kennel")) return "In Kennel";
  if (lower.includes("approved")) return "Approved";
  if (lower.includes("cancel")) return "Cancelled";
  return status ? "Pending" : "";
}

function boardingOwnerEmails(record = {}) {
  return [
    record.ownerEmail,
    record.customerEmail,
    record.linkedOwnerEmail,
    record.secondaryOwnerEmail,
    record.requestedByEmail,
  ].map(normalizeEmail).filter(Boolean);
}

function boardingDogIdentityTokens(record = {}) {
  const dogName = normalizeDogName(record);
  if (!dogName) return [];
  const tokens = new Set();
  const addScoped = (kind, value) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized) tokens.add(`${dogName}|${kind}:${normalized}`);
  };
  const addPhone = (kind, value) => {
    const phone = normalizedPhoneToken(value);
    if (phone) addScoped(kind, phone);
  };
  [
    record.linkedCustomerDogId,
    record.sourceCustomerDogId,
    record.customerDogId,
    record.dogId,
    record.canonicalDogId,
    ...arrayValue(record.legacyCustomerDogIds),
  ].forEach((id) => addScoped("customer-dog", id));
  [
    record.linkedBoardingDogId,
    record.sourceBoardingDogId,
    ...arrayValue(record.sourceRecordIds),
    ...arrayValue(record.duplicateProfileIds),
    ...arrayValue(record.legacyBoardingDogIds),
  ].forEach((id) => addScoped("boarding-dog", id));
  boardingOwnerEmails(record).forEach((email) => addScoped("email", email));
  [record.ownerPhone, record.phone, record.customerPhone, record.requestedByPhone, record.emergencyPhone].forEach((phone) => addPhone("phone", phone));
  if (!tokens.size) addScoped("owner-name", record.ownerName);
  return [...tokens];
}

function groupedBoardingDogProfiles(records = []) {
  const groups = new Map();
  const tokenToGroup = new Map();
  let groupIndex = 0;
  const createGroup = () => {
    const key = `boarding-profile-${groupIndex += 1}`;
    groups.set(key, []);
    return key;
  };
  const mergeGroups = (targetKey, sourceKey) => {
    if (!targetKey || !sourceKey || targetKey === sourceKey || !groups.has(sourceKey)) return targetKey;
    groups.set(targetKey, [...groups.get(targetKey), ...groups.get(sourceKey)]);
    groups.delete(sourceKey);
    tokenToGroup.forEach((groupKey, token) => {
      if (groupKey === sourceKey) tokenToGroup.set(token, targetKey);
    });
    return targetKey;
  };
  records.forEach((record) => {
    const tokens = boardingDogIdentityTokens(record);
    const existingGroups = [...new Set(tokens.map((token) => tokenToGroup.get(token)).filter(Boolean))];
    const groupKey = existingGroups.reduce((targetKey, sourceKey) => mergeGroups(targetKey, sourceKey), existingGroups[0] || createGroup());
    groups.set(groupKey, [...groups.get(groupKey), record]);
    tokens.forEach((token) => tokenToGroup.set(token, groupKey));
  });
  return [...groups.values()];
}

function boardingStaySourceIds(stay = {}) {
  return [...new Set([stay.id, ...arrayValue(stay.sourceStayIds), ...arrayValue(stay.duplicateStayIds)].filter(Boolean).map(String))];
}

function boardingStayRequestsKey(stay = {}) {
  return [...new Set(arrayValue(stay.requests)
    .map((item) => typeof item === "string" ? item : item?.serviceName || item?.label || JSON.stringify(item))
    .map((item) => String(item || "").trim().toLowerCase())
    .filter(Boolean))]
    .sort()
    .join("|");
}

function boardingStayMergeKey(record = {}, stay = {}) {
  const requestCode = String(stay.requestCode || stay.requestId || stay.reservationId || "").trim();
  const ids = boardingStaySourceIds(stay);
  if (record.customerRequest || stay.source === "customer-request" || stay.source === "customer") {
    const dropoff = String(stay.dropoffTime || "").trim();
    const pickup = String(stay.pickupTime || "").trim();
    if (dropoff || pickup) {
      return ["customer-request", dropoff, pickup, String(stay.stayType || record.stayType || "").trim().toLowerCase(), boardingStayRequestsKey(stay)].join("|");
    }
  }
  if (ids.length) return `id:${ids.sort().join("|")}`;
  if (requestCode) return `code:${requestCode}`;
  return `time:${String(stay.dropoffTime || "").trim()}|${String(stay.pickupTime || "").trim()}|${boardingStayRequestsKey(stay)}`;
}

function stayStatus(record = {}, stay = {}) {
  return normalizeBoardingStatus(stay.status || record.boardingStatus || record.status || (record.customerRequest ? "Pending" : ""));
}

function staySortTime(record = {}, stay = {}) {
  const values = [
    stay.updatedAt,
    stay.statusUpdatedAt,
    stay.actualDropoffAt,
    stay.kennelAssignedAt,
    stay.readyForPickupAt,
    stay.actualPickupAt,
    stay.approvedAt,
    stay.cancelledAt,
    stay.createdAt,
    record.updatedAt,
    record.submittedAt,
    stay.dropoffTime,
  ].map((value) => new Date(value || 0).getTime()).filter((value) => !Number.isNaN(value));
  return values.length ? Math.max(...values) : 0;
}

function chooseBestStay(items = []) {
  return [...items].sort((a, b) => {
    const timeDiff = staySortTime(b.record, b.stay) - staySortTime(a.record, a.stay);
    if (timeDiff) return timeDiff;
    return (statusPriority[stayStatus(b.record, b.stay)] || 0) - (statusPriority[stayStatus(a.record, a.stay)] || 0);
  })[0];
}

function mergePrimitiveList(items, property) {
  return [...new Set(items.flatMap((item) => arrayValue(item[property])).filter(Boolean))];
}

function mergeObjectList(records, property) {
  const byKey = new Map();
  records.forEach((record) => {
    arrayValue(record[property]).forEach((item) => {
      const key = item.id || item.storagePath || item.url || item.dataUrl || item.name || JSON.stringify(item);
      if (key && (!byKey.has(key) || new Date(item.updatedAt || item.createdAt || item.savedAt || 0) >= new Date(byKey.get(key).updatedAt || byKey.get(key).createdAt || byKey.get(key).savedAt || 0))) {
        byKey.set(key, item);
      }
    });
  });
  return [...byKey.values()];
}

function shortStableHash(value = "", length = 5) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36).toUpperCase().padStart(length, "0").slice(-length);
}

function requestCodeFor(record = {}, stay = {}) {
  const existing = String(stay.requestCode || stay.requestId || stay.reservationId || "").trim();
  if (existing) return existing;
  const dateKey = String(stay.dropoffTime || record.submittedAt || "request").slice(0, 10).replaceAll("-", "") || "request";
  const seed = [record.id, record.linkedCustomerDogId, record.ownerEmail || record.customerEmail || record.ownerPhone, record.dogName, ...boardingStaySourceIds(stay), stay.dropoffTime, stay.pickupTime, stay.createdAt].filter(Boolean).join("|");
  return `BR-${dateKey.toUpperCase()}-${shortStableHash(seed || JSON.stringify(stay || record))}`;
}

function choosePrimaryProfile(records = []) {
  return [...records].sort((a, b) => {
    const statusDiff = (statusPriority[stayStatus(b, arrayValue(b.stays)[0] || {})] || 0) - (statusPriority[stayStatus(a, arrayValue(a.stays)[0] || {})] || 0);
    if (statusDiff) return statusDiff;
    return new Date(b.updatedAt || b.submittedAt || 0) - new Date(a.updatedAt || a.submittedAt || 0);
  })[0];
}

function canonicalProfileFromGroup(records = []) {
  const primary = choosePrimaryProfile(records);
  const stayGroups = new Map();
  records.forEach((record) => {
    arrayValue(record.stays).forEach((stay) => {
      const key = boardingStayMergeKey(record, stay);
      stayGroups.set(key, [...(stayGroups.get(key) || []), { record, stay }]);
    });
  });
  const stays = [...stayGroups.values()].map((items) => {
    const best = chooseBestStay(items);
    const sourceStayIds = [...new Set(items.flatMap(({ stay }) => boardingStaySourceIds(stay)))];
    const sourceRecordIds = [...new Set(items.map(({ record }) => record.id).filter(Boolean))];
    const merged = {
      ...best.stay,
      id: best.stay.id || sourceStayIds[0] || `stay-${shortStableHash(JSON.stringify(best.stay))}`,
      status: stayStatus(best.record, best.stay),
      requestCode: requestCodeFor(best.record, best.stay),
      sourceStayIds,
      duplicateStayIds: sourceStayIds.filter((id) => id !== best.stay.id),
      sourceRecordIds,
      updatedAt: new Date().toISOString(),
    };
    merged.requests = mergePrimitiveList(items.map(({ stay }) => stay), "requests");
    if (merged.status !== "In Kennel") {
      merged.kennelLocationId = "";
      merged.kennelLocationName = "";
      merged.kennelBuilding = "";
      merged.kennelAssignedAt = "";
    }
    return merged;
  }).sort((a, b) => new Date(b.dropoffTime || b.updatedAt || 0) - new Date(a.dropoffTime || a.updatedAt || 0));

  const merged = {
    ...primary,
    sourceRecordIds: [...new Set(records.map((record) => record.id).filter(Boolean))],
    duplicateProfileIds: records.map((record) => record.id).filter((id) => id && id !== primary.id),
    stays,
    documents: mergeObjectList(records, "documents"),
    vaccinationRecords: mergeObjectList(records, "vaccinationRecords"),
    customerUpdates: mergeObjectList(records, "customerUpdates"),
    requestedServices: mergeObjectList(records, "requestedServices"),
    flags: mergePrimitiveList(records, "flags"),
    updatedAt: new Date().toISOString(),
    maintenanceLastRunAt: new Date().toISOString(),
  };
  ["dogName", "breedDescription", "dateOfBirth", "profilePhotoUrl", "profilePhotoPath", "profilePhotoData", "sex", "spayNeuterStatus", "ownerName", "ownerPhone", "ownerEmail", "customerEmail", "linkedOwnerEmail", "secondaryOwnerEmail", "emergencyName", "emergencyPhone", "vetInfo", "foodInstructions", "specialCare", "boardingHistory", "rabiesDate", "dhppDate", "bordetellaDate", "heartwormDate", "vaccinationFiles"].forEach((field) => {
    if (merged[field]) return;
    const fallback = records.find((record) => record[field]);
    if (fallback) merged[field] = fallback[field];
  });
  return merged;
}

async function request(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function fetchBoardingDogRows() {
  const rows = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const page = await request(`${REST_URL}?type=eq.boardingDog&select=id,type,payload,helper_email,user_id,submitted_at,updated_at&order=updated_at.desc`, {
      headers: { Range: `${from}-${from + pageSize - 1}` },
    });
    rows.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function upsertRow(row) {
  return request(`${REST_URL}?on_conflict=id`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(row),
  });
}

async function main() {
  const rows = await fetchBoardingDogRows();
  const records = rows
    .map((row) => ({ ...row.payload, id: row.id, type: row.type, submittedAt: row.submitted_at, updatedAt: row.updated_at, _row: row }))
    .filter((record) => !record.removed);
  const groups = groupedBoardingDogProfiles(records);
  const plans = groups
    .map((recordsInGroup) => {
      const canonical = canonicalProfileFromGroup(recordsInGroup);
      const duplicateStayCount = recordsInGroup.reduce((count, record) => count + arrayValue(record.stays).length, 0) - canonical.stays.length;
      return {
        primaryId: canonical.id,
        dogName: canonical.dogName || "",
        owner: canonical.ownerName || canonical.ownerEmail || canonical.customerEmail || "",
        sourceRecordIds: canonical.sourceRecordIds,
        duplicateProfileIds: canonical.duplicateProfileIds,
        duplicateStayCount,
        canonical,
      };
    })
    .filter((plan) => plan.duplicateProfileIds.length || plan.duplicateStayCount > 0);

  if (APPLY) {
    for (const plan of plans) {
      const primaryRow = rows.find((row) => row.id === plan.primaryId);
      await upsertRow({
        id: plan.primaryId,
        type: "boardingDog",
        payload: plan.canonical,
        helper_email: primaryRow?.helper_email || normalizeEmail(plan.canonical.ownerEmail || plan.canonical.customerEmail) || null,
        user_id: primaryRow?.user_id || null,
        submitted_at: primaryRow?.submitted_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (MERGE_PROFILES) {
        for (const duplicateId of plan.duplicateProfileIds) {
          const duplicateRow = rows.find((row) => row.id === duplicateId);
          const duplicatePayload = duplicateRow?.payload || {};
          await upsertRow({
            id: duplicateId,
            type: "boardingDog",
            payload: {
              ...duplicatePayload,
              removed: true,
              mergedIntoBoardingDogId: plan.primaryId,
              removedReason: "Merged duplicate boarding dog profile by boarding-data-maintenance.",
              removedAt: new Date().toISOString(),
            },
            helper_email: duplicateRow?.helper_email || null,
            user_id: duplicateRow?.user_id || null,
            submitted_at: duplicateRow?.submitted_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }
    }
    await upsertRow({
      id: `boarding-maintenance-${new Date().toISOString()}`,
      type: "boardingDataMaintenance",
      payload: {
        id: `boarding-maintenance-${Date.now()}`,
        type: "boardingDataMaintenance",
        appliedAt: new Date().toISOString(),
        plans: plans.map(({ canonical, ...summary }) => summary),
        mergeProfiles: MERGE_PROFILES,
      },
      helper_email: null,
      user_id: null,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  const summary = {
    mode: APPLY ? "apply" : "dry-run",
    boardingDogRecords: records.length,
    affectedDogGroups: plans.length,
    duplicateProfiles: plans.reduce((sum, plan) => sum + plan.duplicateProfileIds.length, 0),
    duplicateLogicalStays: plans.reduce((sum, plan) => sum + plan.duplicateStayCount, 0),
    plans: plans.map(({ canonical, ...plan }) => plan),
  };
  if (JSON_OUTPUT) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(`Mode: ${summary.mode}`);
    console.log(`Boarding dog records scanned: ${summary.boardingDogRecords}`);
    console.log(`Affected dog groups: ${summary.affectedDogGroups}`);
    console.log(`Duplicate profiles: ${summary.duplicateProfiles}`);
    console.log(`Duplicate logical stays: ${summary.duplicateLogicalStays}`);
    summary.plans.forEach((plan) => {
      console.log(`- ${plan.dogName || plan.primaryId}: keep ${plan.primaryId}; duplicate profiles ${plan.duplicateProfileIds.join(", ") || "none"}; duplicate stays ${plan.duplicateStayCount}`);
    });
    if (!APPLY && summary.affectedDogGroups) console.log("Dry-run only. Re-run with --apply after reviewing the plan.");
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
