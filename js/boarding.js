// === MODULE: BOARDING ===
const __snuggleStayModuleSource = `function statusChipHtml(label, className = "") {
  return \`<span class="status-chip \${escapeHtml(className)}">\${escapeHtml(label)}</span>\`;
}

var boardingCalendarMonth = todayDate().slice(0, 7);
var boardingCalendarInactiveStatuses = new Set(["Cancelled", "Checked Out"]);
var boardingCalendarHiddenLegendStatuses = new Set(["Cancelled"]);

function dogTypeBadgeHtml(type) {
  const labels = {
    ownedDog: "Our Dog",
    boardingDog: "Boarding Dog",
    customerDog: "Customer Dog",
  };
  return statusChipHtml(labels[type] || "Dog", \`dog-type-chip \${type}\`);
}

function normalizeBoardingStatus(record = {}) {
  const status = String(record.boardingStatus || record.status || "").trim();
  if (boardingLifecycleStatuses.includes(status)) return status;
  if (/cancel/i.test(status)) return "Cancelled";
  if (/check(ed)? out/i.test(status)) return "Checked Out";
  if (/ready/i.test(status)) return "Ready For Pickup";
  if (/kennel|active|current/i.test(status)) return "In Kennel";
  if (/check(ed)? in/i.test(status)) return "Checked In";
  if (/approve/i.test(status)) return "Approved";
  if (/pending|request/i.test(status) || record.customerRequest) return "Pending";
  if (isCurrentlyBoarding(record)) return "In Kennel";
  return "Approved";
}

function statusClassForBoardingStatus(status = "") {
  const normalized = String(status).toLowerCase().replace(/\\s+/g, "-");
  return \`is-status-\${normalized}\`;
}

function boardingStatusChipHtml(record = {}) {
  const stay = boardingPrimaryStay(record);
  if (stay?.id) return boardingStayStatusChipHtml(record, stay);
  const status = boardingDisplayStatus(record);
  const kennelLabel = status === "In Kennel" ? boardingKennelLocationLabel(record) : "";
  const label = kennelLabel ? \`\${status} - \${kennelLabel}\` : status;
  return statusChipHtml(label, \`boarding-status-chip \${statusClassForBoardingStatus(status)}\`);
}

function boardingStayStatusChipHtml(record = {}, stay = {}) {
  const status = boardingStayDisplayStatus(record, stay);
  const kennelLabel = status === "In Kennel" ? boardingKennelLocationLabel(record, stay) : "";
  const label = kennelLabel ? \`\${status} - \${kennelLabel}\` : status;
  return statusChipHtml(label, \`boarding-status-chip \${statusClassForBoardingStatus(status)}\`);
}

function boardingStayRequestCodeChipHtml(record = {}, stay = {}, options = {}) {
  const requestCode = boardingStayRequestCode(record, stay);
  if (!requestCode) return "";
  const label = options.labelPrefix ? \`\${options.labelPrefix}: \${requestCode}\` : requestCode;
  return statusChipHtml(label, "boarding-request-code-chip");
}

function boardingStayDataAttrs(record = {}, stay = {}) {
  if (!stay?.id) return "";
  const requestCode = boardingStayRequestCode(record, stay);
  return \` data-stay-id="\${escapeHtml(stay.id)}" data-request-code="\${escapeHtml(requestCode)}"\`;
}

function boardingStayBelongings(stay = {}) {
  return String(stay.belongings || stay.belongingsInfo || stay.checkIn?.belongings || "").trim();
}

function boardingStayBelongingsHtml(stay = {}, options = {}) {
  const belongings = boardingStayBelongings(stay);
  if (!belongings && !options.showEmpty) return "";
  const label = options.label || "Belongings";
  const text = belongings || options.emptyText || "No belongings listed";
  const extraClass = options.className ? \` \${escapeHtml(options.className)}\` : "";
  return \`<article class="record-card compact-record-card\${extraClass}"><strong>\${escapeHtml(label)}</strong><p>\${escapeHtml(text)}</p></article>\`;
}

function boardingStayBelongingsLineHtml(stay = {}, options = {}) {
  const belongings = boardingStayBelongings(stay);
  if (!belongings && !options.showEmpty) return "";
  const label = options.label || "Belongings";
  const text = belongings || options.emptyText || "No belongings listed";
  return \`<p><strong>\${escapeHtml(label)}:</strong> \${escapeHtml(text)}</p>\`;
}

function boardingStayStatusButtonHtml(record = {}, stay = {}, action = "change-stay-status") {
  const requestCode = stay?.id ? boardingStayRequestCode(record, stay) : "";
  return \`<button type="button" class="status-chip-button" data-action="\${escapeHtml(action)}" data-dog-id="\${escapeHtml(record.id || "")}" data-id="\${escapeHtml(stay.id || "")}" data-request-code="\${escapeHtml(requestCode)}">\${boardingStayStatusChipHtml(record, stay)}</button>\`;
}

function boardingRecordStatusButtonHtml(record = {}, action = "open-mobile-stay-status-menu") {
  const stay = boardingPrimaryStay(record) || {};
  const chip = stay.id ? boardingStayStatusChipHtml(record, stay) : boardingStatusChipHtml(record);
  const stayAttrs = stay.id ? boardingStayDataAttrs(record, stay) : "";
  return \`<button type="button" class="status-chip-button" data-action="\${escapeHtml(action)}" data-id="\${escapeHtml(record.id || "")}"\${stayAttrs}>\${chip}</button>\`;
}

function boardingKennelLocationLabel(record = {}, stayOverride = null) {
  const stay = stayOverride || currentOrNextStay(record) || (record.stays || [])[0] || {};
  const building = String(stay.kennelBuilding || record.kennelBuilding || "").trim();
  const name = String(stay.kennelLocationName || record.kennelLocationName || "").trim();
  if (!building) return name;
  if (!name) return building;
  return name.toLowerCase().includes(building.toLowerCase()) ? name : \`\${building} \${name}\`;
}

function transitionLabel(status) {
  return {
    Approved: "Approve Request",
    Cancelled: "Cancel Request",
    "Checked In": "Check In",
    "In Kennel": "Mark In Kennel",
    "Ready For Pickup": "Ready For Pickup",
    "Checked Out": "Check Out",
  }[status] || status;
}

function stayTransitionLabel(currentStatus = "", nextStatus = "") {
  if (currentStatus === "Checked In" && nextStatus === "Approved") return "Move Back to Approved";
  if (currentStatus === "In Kennel" && nextStatus === "Approved") return "Move Back to Approved";
  if (currentStatus === "In Kennel" && nextStatus === "Checked In") return "Move Back to Checked In";
  if (currentStatus === "Ready For Pickup" && nextStatus === "In Kennel") return "Move Back to In Kennel";
  return transitionLabel(nextStatus);
}

function boardingCustomerRequestStatusEventName(record = {}, nextStatus = "", options = {}) {
  if (!["Approved", "Cancelled"].includes(nextStatus)) return "";
  if (currentRole() === "customer" || options.source === "customer" || options.role === "customer") return "";
  const targetStay = (options.stayId || options.requestCode)
    ? boardingStayByReference(record, options)
    : boardingStatusTargetStay(record, nextStatus, options) || boardingPrimaryStay(record) || {};
  const currentStatus = targetStay?.id ? boardingStayDisplayStatus(record, targetStay) : normalizeBoardingStatus(record);
  const customerRequested = Boolean(record.customerRequest || targetStay?.source === "customer-request" || targetStay?.requestGroupId || record.requestGroupId);
  if (!customerRequested) return "";
  if (nextStatus === "Approved" && ["Pending", "Cancelled"].includes(currentStatus)) return "boardingCustomerRequestApproved";
  if (nextStatus === "Cancelled" && ["Pending", "Approved"].includes(currentStatus)) {
    return currentStatus === "Pending" || normalizedBoardingDeclineNote(options.declineNote) ? "boardingCustomerRequestDeclined" : "boardingCustomerRequestCancelled";
  }
  return "";
}

function serviceRequestReadyForPickupEventName(record = {}, nextStatus = "", options = {}) {
  if (nextStatus !== "Ready For Pickup") return "";
  if (currentRole() === "customer" || options.source === "customer" || options.role === "customer") return "";
  const targetStay = (options.stayId || options.requestCode)
    ? boardingStayByReference(record, options)
    : boardingStatusTargetStay(record, nextStatus, options) || boardingPrimaryStay(record) || {};
  if (!isServiceRequestStay(record, targetStay)) return "";
  const currentStatus = targetStay?.id ? boardingStayDisplayStatus(record, targetStay) : normalizeBoardingStatus(record);
  return currentStatus === "Ready For Pickup" ? "" : "serviceRequestReadyForPickup";
}

function serviceRequestReadyForPickupNotificationRecord(record = {}, options = {}) {
  const targetStay = (options.stayId || options.requestCode)
    ? boardingStayByReference(record, options)
    : boardingStatusTargetStay(record, "Ready For Pickup", options) || boardingPrimaryStay(record) || {};
  if (!isServiceRequestStay(record, targetStay)) return record;
  const requestCode = targetStay.id ? boardingStayRequestCode(record, targetStay) : record.requestCode || "";
  return {
    ...record,
    latestServiceReadyForPickup: {
      dogName: record.dogName || "",
      requestCode,
      stayId: targetStay.id || "",
      requestedTime: targetStay.dropoffTime || targetStay.requestedDropoffTime || "",
      readyAt: new Date().toISOString(),
    },
  };
}

function customerRequestStatusNotificationRecord(record = {}, nextStatus = "", options = {}) {
  const targetStay = (options.stayId || options.requestCode)
    ? boardingStayByReference(record, options)
    : boardingStatusTargetStay(record, nextStatus, options) || boardingPrimaryStay(record) || {};
  if (!targetStay?.id) return record;
  const requestCode = boardingStayRequestCode(record, targetStay);
  const transitionActor = boardingTransitionActorPayload(options);
  return {
    ...record,
    latestCustomerRequestStatus: {
      dogName: record.dogName || "",
      requestCode,
      requestType: isServiceRequestStay(record, targetStay) ? "service request" : "boarding request",
      requestedDropoffTime: targetStay.requestedDropoffTime || targetStay.dropoffTime || "",
      requestedPickupTime: targetStay.requestedPickupTime || targetStay.pickupTime || "",
      requestedTime: targetStay.dropoffTime || targetStay.requestedDropoffTime || "",
      scheduledDropoffTime: targetStay.scheduledDropoffTime || targetStay.dropoffTime || targetStay.requestedDropoffTime || "",
      scheduledPickupTime: targetStay.scheduledPickupTime || targetStay.pickupTime || targetStay.requestedPickupTime || "",
      status: nextStatus,
      statusLabel: String(nextStatus || "").toLowerCase(),
      stayId: targetStay.id || "",
      stayType: targetStay.stayType || record.stayType || "",
      updatedAt: new Date().toISOString(),
      updatedBy: transitionActor.name,
      updatedByEmail: transitionActor.email,
      updatedByRole: transitionActor.role,
    },
  };
}

function normalizedBoardingDeclineNote(note = "") {
  return String(note || "").trim();
}

function boardingDeclineNotePayload(note = "", record = {}, stay = {}, timestamp = new Date().toISOString()) {
  const cleanNote = normalizedBoardingDeclineNote(note);
  if (!cleanNote) return null;
  return {
    note: cleanNote,
    createdAt: timestamp,
    createdBy: currentUser?.name || helperName?.value || "Staff",
    createdByEmail: currentUser?.email || helperEmail?.value || "",
    requestId: stay.id || "",
    requestCode: stay.id ? boardingStayRequestCode(record, stay) : record.requestCode || record.id || "",
  };
}

function boardingDeclineNoteMatchesStay(note = {}, record = {}, stay = {}) {
  if (!stay?.id) return true;
  const requestId = String(note.requestId || "").trim();
  const requestCode = String(note.requestCode || "").trim();
  const stayCode = boardingStayRequestCode(record, stay);
  return requestId === stay.id || Boolean(requestCode && requestCode === stayCode);
}

function boardingDeclineNoteFor(record = {}, stay = {}) {
  const stayNote = stay.declineNote || null;
  if (stayNote?.note) return stayNote;
  const recordNote = record.declineNote || null;
  if (recordNote?.note && boardingDeclineNoteMatchesStay(recordNote, record, stay)) return recordNote;
  const legacy = normalizedBoardingDeclineNote(stay.declineReason || stay.customerDeclineNote || (!stay?.id ? record.declineReason || record.customerDeclineNote : "") || "");
  return legacy ? { note: legacy, createdAt: stay.declinedAt || record.declinedAt || stay.cancelledAt || record.cancelledAt || "", createdBy: stay.declinedBy || record.declinedBy || "" } : null;
}

function boardingDeclineNoteHtml(record = {}, stay = {}) {
  const note = boardingDeclineNoteFor(record, stay);
  if (!note?.note) return "";
  const meta = [formatDateTime(note.createdAt), note.createdBy].filter(Boolean).join(" | ");
  return \`<div class="boarding-decline-note"><strong>Decline note for customer</strong>\${meta ? \`<span>\${escapeHtml(meta)}</span>\` : ""}<p>\${escapeHtml(note.note)}</p></div>\`;
}

function boardingTransitionActorPayload(options = {}) {
  const role = options.role || currentRole();
  const name = options.name || currentUser?.name || helperName?.value || (role === "customer" ? "Customer" : role ? roleLabel(role) : "Staff");
  const source = options.source || (role === "customer" ? "customer" : role === "admin" ? "admin" : role === "helper" ? "staff" : "staff");
  return {
    name,
    email: options.email || currentUser?.email || helperEmail?.value || "",
    role,
    source,
  };
}

function boardingCancellationHistoryEntry(record = {}, stay = {}) {
  const stayIds = new Set(boardingStaySourceIds(stay));
  const requestCode = stay?.id ? boardingStayRequestCode(record, stay) : "";
  const hasSingleStay = arrayValue(record.stays).length <= 1;
  return arrayValue(record.statusHistory)
    .filter((entry) => normalizeBoardingStatus({ boardingStatus: entry.to || entry.toStatus || entry.status }) === "Cancelled")
    .filter((entry) => {
      const entryStayId = String(entry.stayId || entry.requestId || "").trim();
      const entryRequestCode = String(entry.requestCode || "").trim();
      if (!stay?.id) return true;
      if (entryStayId && stayIds.has(entryStayId)) return true;
      if (entryRequestCode && entryRequestCode === requestCode) return true;
      return !entryStayId && !entryRequestCode && hasSingleStay;
    })
    .sort((a, b) => new Date(b.date || b.changedAt || 0) - new Date(a.date || a.changedAt || 0))[0] || null;
}

function boardingCancellationAudit(record = {}, stay = {}) {
  const status = stay?.id ? boardingStayDisplayStatus(record, stay) : normalizeBoardingStatus(record);
  if (status !== "Cancelled") return null;
  const history = boardingCancellationHistoryEntry(record, stay) || {};
  const declineNote = boardingDeclineNoteFor(record, stay) || {};
  const cancelledAt = stay.cancelledAt || history.date || history.changedAt || stay.declinedAt || declineNote.createdAt || record.cancelledAt || record.declinedAt || "";
  const cancelledBy = stay.cancelledBy || history.by || history.changedBy || stay.declinedBy || declineNote.createdBy || record.cancelledBy || record.declinedBy || "";
  return {
    cancelledAt,
    cancelledBy,
    cancelledByEmail: stay.cancelledByEmail || history.byEmail || history.changedByEmail || stay.declinedByEmail || declineNote.createdByEmail || record.cancelledByEmail || record.declinedByEmail || "",
    cancelledByRole: stay.cancelledByRole || history.byRole || history.role || record.cancelledByRole || "",
    cancelledSource: stay.cancelledSource || history.source || record.cancelledSource || "",
  };
}

function boardingLatestCustomerCancellationMatchesStay(record = {}, stay = {}) {
  const latest = record.latestCustomerCancellation || {};
  if (!latest.reason && !latest.stayId && !latest.requestCode) return false;
  if (!stay?.id) return true;
  const latestStay = boardingStayByReference(record, { stayId: latest.stayId || "", requestCode: latest.requestCode || "" });
  return latestStay ? boardingStayMatchesIdentity(stay, latestStay) : false;
}

function boardingCancellationReasonFor(record = {}, stay = {}) {
  const history = boardingCancellationHistoryEntry(record, stay) || {};
  const latest = boardingLatestCustomerCancellationMatchesStay(record, stay) ? record.latestCustomerCancellation || {} : {};
  return normalizedBoardingDeclineNote(
    stay.customerCancellationReason
      || stay.cancellationReason
      || history.customerCancellationReason
      || history.cancellationReason
      || latest.reason
      || (!stay?.id ? record.customerCancellationReason || record.cancellationReason : "")
      || "",
  );
}

function boardingCancellationReasonHtml(record = {}, stay = {}, options = {}) {
  const reason = boardingCancellationReasonFor(record, stay);
  if (!reason) return "";
  const label = options.customer ? "Your cancellation reason" : "Customer cancellation reason";
  return \`<p class="boarding-cancellation-reason"><strong>\${escapeHtml(label)}:</strong> \${escapeHtml(reason)}</p>\`;
}

function boardingCancellationAuditHtml(record = {}, stay = {}, options = {}) {
  const audit = boardingCancellationAudit(record, stay);
  if (!audit) return "";
  const customerFacing = Boolean(options.customer);
  const actor = String(audit.cancelledBy || "").trim();
  const role = audit.cancelledByRole && !customerFacing ? \` (\${roleLabel(audit.cancelledByRole)})\` : "";
  const date = audit.cancelledAt ? \` on \${formatDateTime(audit.cancelledAt)}\` : "";
  const email = audit.cancelledByEmail && !customerFacing ? \` | \${audit.cancelledByEmail}\` : "";
  const source = audit.cancelledSource && !customerFacing && !audit.cancelledByRole ? \` | Source: \${audit.cancelledSource}\` : "";
  const label = actor ? \`Cancelled by \${actor}\${role}\${date}\${email}\${source}\` : \`Cancellation actor not recorded\${date}\${source}\`;
  return \`<p class="boarding-cancellation-audit"><strong>Cancellation:</strong> \${escapeHtml(label)}</p>\`;
}

function shouldPromptBoardingDecline(record = {}, nextStatus = "", options = {}) {
  if (nextStatus !== "Cancelled" || options.declineSubmitted || currentRole() === "customer") return false;
  if (!isStaffRole()) return false;
  const targetStay = (options.stayId || options.requestCode) ? boardingStayByReference(record, options) : boardingStatusTargetStay(record, nextStatus, options);
  const status = targetStay ? boardingStayDisplayStatus(record, targetStay) : normalizeBoardingStatus(record);
  const customerRequest = Boolean(record.customerRequest || targetStay?.source === "customer-request" || targetStay?.source === "customer");
  return customerRequest && status === "Pending";
}

function boardingDeclineRequestFormHtml(record = {}, nextStatus = "Cancelled", options = {}) {
  const stay = (options.stayId || options.requestCode) ? boardingStayByReference(record, options) : boardingStatusTargetStay(record, nextStatus, options) || {};
  const requestCode = stay.id ? boardingStayRequestCode(record, stay) : record.requestCode || record.id || "";
  return \`<form id="boardingDeclineRequestForm" class="tracker-form" data-id="\${escapeHtml(record.id || "")}" data-next-status="\${escapeHtml(nextStatus)}"\${stay.id ? boardingStayDataAttrs(record, stay) : ""}>
    <article class="record-card compact-record-card">
      <strong>\${escapeHtml(record.dogName || "Boarding request")}</strong>
      <p>\${requestCode ? \`Stay ID: \${escapeHtml(requestCode)}. \` : ""}This note will be visible to the customer and saved with this request.</p>
    </article>
    <label>Reason for declining
      <textarea name="declineNote" rows="4" required placeholder="Explain why this request is being declined and what the customer should do next."></textarea>
    </label>
    <div class="button-row">
      <button type="submit" class="danger-button">Decline Request</button>
      <button type="button" class="secondary-button" data-action="close-dialog">Cancel</button>
    </div>
  </form>\`;
}

function openBoardingDeclineRequestPopup(record = {}, nextStatus = "Cancelled", options = {}) {
  showDetailDialog("Decline Boarding Request", boardingDeclineRequestFormHtml(record, nextStatus, options));
}

async function submitBoardingDeclineRequest(formEl) {
  const record = boardingDogRecordForDisplay(formEl.dataset.id);
  if (!record) {
    showToast("This boarding request could not be found.");
    return null;
  }
  const note = normalizedBoardingDeclineNote(formEl.elements.declineNote?.value || "");
  if (!note) {
    showToast("Enter a note before declining this request.");
    return null;
  }
  const reference = boardingStayReferenceFromAction(formEl);
  const options = {
    ...reference,
    declineSubmitted: true,
    declineNote: note,
  };
  const updated = reference.stayId
    ? await saveBoardingStayStatusTransition(record, reference.stayId, "Cancelled", options)
    : await saveBoardingStatusTransition(record, "Cancelled", options);
  if (!updated) return null;
  const updatedStay = reference.stayId ? boardingStayByReference(updated, reference) : boardingStatusTargetStay(updated, "Cancelled", options) || {};
  await addAuditLog("Declined customer boarding request", "boardingDog", updated, \`\${updated.dogName || "Dog"}\${updatedStay?.id ? \` stay \${boardingStayRequestCode(updated, updatedStay)}\` : ""}: \${note}\`);
  showDetailDialog("Request Declined", \`<p>The decline note was saved with this request and will be visible to the customer.</p>\${boardingDeclineNoteHtml(updated, updatedStay)}\`);
  return updated;
}

function canTransitionBoardingStatus(record = {}, nextStatus, options = {}) {
  const targetStay = (options.stayId || options.requestCode) ? boardingStayByReference(record, options) : null;
  const currentStatus = targetStay ? boardingStayDisplayStatus(record, targetStay) : normalizeBoardingStatus(record);
  if (options.allowEarly && nextStatus === "Checked In" && ["Pending", "Approved"].includes(currentStatus)) return true;
  if (options.allowEarly && nextStatus === "Checked Out" && ["Checked In", "In Kennel", "Ready For Pickup"].includes(currentStatus)) return true;
  return (boardingStatusTransitions[currentStatus] || []).includes(nextStatus);
}

function boardingTransitionActions(record = {}) {
  const currentStatus = boardingDisplayStatus(record);
  const nextStatuses = boardingStatusTransitions[currentStatus] || [];
  return nextStatuses.length
    ? \`<div class="record-actions lifecycle-actions">\${nextStatuses.map((nextStatus) => \`<button type="button" class="secondary-button" data-action="transition-boarding" data-next-status="\${escapeHtml(nextStatus)}" data-id="\${escapeHtml(record.id)}">\${escapeHtml(transitionLabel(nextStatus))}</button>\`).join("")}</div>\`
    : "";
}

function boardingOwnerUpdateButtonHtml(record = {}, stay = {}, options = {}) {
  const displayRecord = boardingDogWithStayStatus(record || {});
  const targetStay = stay?.id ? boardingStayByReference(displayRecord, { stayId: stay.id, requestCode: stay.requestCode || "" }) || stay : ownerUpdateStayForRecord(displayRecord);
  if (!ownerUpdateStayIsAvailable(displayRecord, targetStay)) return "";
  const stayAttrs = boardingStayDataAttrs(displayRecord, targetStay);
  const label = options.label || "Update Owner";
  const hasTodayUpdate = boardingOwnerUpdateLoggedToday(displayRecord, targetStay);
  const statusClass = hasTodayUpdate ? "boarding-owner-update-current" : "boarding-owner-update-needed";
  const statusLabel = hasTodayUpdate ? "Owner update sent today" : "No owner update sent today";
  const className = [options.className || "secondary-button", statusClass].filter(Boolean).join(" ");
  return \`<button type="button" class="\${escapeHtml(className)}" data-action="open-owner-update-for-stay" data-id="\${escapeHtml(displayRecord.id || "")}" data-dog-id="\${escapeHtml(displayRecord.id || "")}" title="\${escapeHtml(statusLabel)}" aria-label="\${escapeHtml(label + ": " + statusLabel)}"\${stayAttrs}>\${escapeHtml(label)}</button>\`;
}

function boardingOwnerUpdateLoggedToday(record = {}, stay = {}, date = todayDate()) {
  if (!stay?.id) return false;
  const requestCode = boardingStayRequestCode(record, stay);
  return arrayValue(record.customerUpdates).some((update) => {
    const updateDate = dateOnly(update.createdAt || update.submittedAt || update.updatedAt || update.savedAt);
    if (updateDate !== date) return false;
    if (update.stayId && update.stayId === stay.id) return true;
    if (requestCode && update.requestCode === requestCode) return true;
    if (stay.dropoffTime && stay.pickupTime && update.stayDropoffTime === stay.dropoffTime && update.stayPickupTime === stay.pickupTime) return true;
    return false;
  });
}

function boardingStayTransitionActions(record = {}, stay = {}, options = {}) {
  const currentStatus = boardingStayDisplayStatus(record, stay);
  const nextStatuses = boardingStatusTransitions[currentStatus] || [];
  const stayAttrs = stay.id ? boardingStayDataAttrs(record, stay) : "";
  const ownerUpdateButton = options.includeOwnerUpdate === false ? "" : boardingOwnerUpdateButtonHtml(record, stay);
  const buttons = [
    ownerUpdateButton,
    ...nextStatuses.map((nextStatus) => \`<button type="button" class="secondary-button" data-action="transition-boarding" data-next-status="\${escapeHtml(nextStatus)}" data-id="\${escapeHtml(record.id)}"\${stayAttrs}>\${escapeHtml(stayTransitionLabel(currentStatus, nextStatus))}</button>\`),
  ].filter(Boolean);
  return buttons.length
    ? \`<div class="record-actions lifecycle-actions">\${buttons.join("")}</div>\`
    : "";
}

function boardingStatusTargetStay(record = {}, nextStatus = "", options = {}) {
  if (options.stayId || options.requestCode) return boardingStayByReference(record, options);
  if (nextStatus === "Checked Out") return activeBoardingStay(record) || currentOrNextStay(record);
  return currentOrNextStay(record);
}

function boardingStatusScopedStays(record = {}, nextStatus = "", timestamp = new Date().toISOString(), options = {}) {
  const targetStay = (options.stayId || options.requestCode) ? boardingStayByReference(record, options) : boardingStatusTargetStay(record, nextStatus);
  const targetStayId = targetStay?.id || "";
  const declineNoteText = nextStatus === "Cancelled" ? normalizedBoardingDeclineNote(options.declineNote) : "";
  const customerCancellationReason = nextStatus === "Cancelled" ? normalizedBoardingDeclineNote(options.customerCancellationReason || options.cancellationReason) : "";
  const transitionActor = boardingTransitionActorPayload(options);
  return (record.stays || []).map((stay) => {
    if (!targetStayId || !boardingStayMatchesIdentity(stay, targetStay)) return stay;
    const checkInDetails = nextStatus === "Checked In" ? options.checkInDetails || null : null;
    const scheduledDropoffTime = stay.scheduledDropoffTime || stay.requestedDropoffTime || stay.dropoffTime || checkInDetails?.scheduledDropoffTime || "";
    const scheduledPickupTime = stay.scheduledPickupTime || stay.requestedPickupTime || stay.pickupTime || checkInDetails?.scheduledPickupTime || "";
    const actualCheckInAt = checkInDetails?.actualCheckInAt || timestamp;
    const clearsActiveStayState = nextStatus === "Approved" || nextStatus === "Checked In";
    const declineNote = declineNoteText ? boardingDeclineNotePayload(declineNoteText, record, stay, timestamp) : null;
    const nextStay = {
      ...stay,
      requestCode: stay.requestCode || boardingStayRequestCode(record, stay),
      status: nextStatus,
      dropoffTime: stay.dropoffTime || scheduledDropoffTime,
      pickupTime: stay.pickupTime || scheduledPickupTime,
      scheduledDropoffTime,
      requestedDropoffTime: stay.requestedDropoffTime || scheduledDropoffTime,
      scheduledPickupTime,
      requestedPickupTime: stay.requestedPickupTime || scheduledPickupTime,
      updatedAt: timestamp,
      actualCheckInAt: nextStatus === "Approved" ? "" : nextStatus === "Checked In" ? stay.actualCheckInAt || actualCheckInAt : stay.actualCheckInAt || "",
      actualDropoffAt: nextStatus === "Approved" ? "" : nextStatus === "Checked In" ? stay.actualDropoffAt || actualCheckInAt : stay.actualDropoffAt || "",
      actualPickupAt: nextStatus === "Checked Out" ? stay.actualPickupAt || timestamp : stay.actualPickupAt || "",
      belongings: nextStatus === "Checked In" ? checkInDetails?.belongings || stay.belongings || "" : stay.belongings || stay.checkIn?.belongings || "",
      billingStartPolicy: nextStatus === "Checked In" ? checkInDetails?.billingStartPolicy || stay.billingStartPolicy || "scheduled" : stay.billingStartPolicy || "",
      billingStartTime: nextStatus === "Checked In" ? checkInDetails?.billingStartTime || stay.billingStartTime || scheduledDropoffTime : stay.billingStartTime || "",
      readyForPickupAt: ["Approved", "Checked In", "In Kennel"].includes(nextStatus) ? "" : stay.readyForPickupAt || "",
      cancelledAt: nextStatus === "Cancelled" ? timestamp : stay.cancelledAt || "",
      cancelledBy: nextStatus === "Cancelled" ? transitionActor.name : clearsActiveStayState ? "" : stay.cancelledBy || "",
      cancelledByEmail: nextStatus === "Cancelled" ? transitionActor.email : clearsActiveStayState ? "" : stay.cancelledByEmail || "",
      cancelledByRole: nextStatus === "Cancelled" ? transitionActor.role : clearsActiveStayState ? "" : stay.cancelledByRole || "",
      cancelledSource: nextStatus === "Cancelled" ? transitionActor.source : clearsActiveStayState ? "" : stay.cancelledSource || "",
      customerCancellationReason: customerCancellationReason || stay.customerCancellationReason || "",
      customerCancellationAt: customerCancellationReason ? timestamp : stay.customerCancellationAt || "",
      customerCancellationBy: customerCancellationReason ? transitionActor.name : stay.customerCancellationBy || "",
      customerCancellationByEmail: customerCancellationReason ? transitionActor.email : stay.customerCancellationByEmail || "",
      declineNote: declineNote || stay.declineNote || null,
      declineReason: declineNote?.note || stay.declineReason || "",
      declinedAt: declineNote?.createdAt || stay.declinedAt || "",
      declinedBy: declineNote?.createdBy || stay.declinedBy || "",
      declinedByEmail: declineNote?.createdByEmail || stay.declinedByEmail || "",
      kennelLocationId: clearsActiveStayState ? "" : stay.kennelLocationId || "",
      kennelLocationName: clearsActiveStayState ? "" : stay.kennelLocationName || "",
      kennelBuilding: clearsActiveStayState ? "" : stay.kennelBuilding || "",
      kennelAssignedAt: clearsActiveStayState ? "" : stay.kennelAssignedAt || "",
      requests: checkInDetails?.addedServiceLabels?.length ? mergeStayRequestLabels(stay.requests, checkInDetails.addedServiceLabels) : stay.requests || [],
      checkIn: nextStatus === "Approved"
        ? null
        : checkInDetails
        ? {
            ...(stay.checkIn || {}),
            ...checkInDetails,
            verifiedAt: checkInDetails.verifiedAt || timestamp,
            verifiedBy: checkInDetails.verifiedBy || currentUser?.name || helperName?.value || "",
            verifiedByEmail: checkInDetails.verifiedByEmail || currentUser?.email || helperEmail?.value || "",
          }
        : stay.checkIn || null,
    };
    if (nextStatus !== "Checked In") return nextStay;
    const pricingSnapshot = boardingPricingSnapshotForStay(record, nextStay, {
      forceCurrentPricing: true,
      preferCatalogPricing: true,
      currentDogRole: boardingCurrentDogRoleForStay(nextStay, boardingRatePlanForRecord(record)),
      sharedCrateRequested: Boolean(nextStay.pricingSnapshot?.sharedCrateRequested),
    });
    const pricedStay = {
      ...nextStay,
      billingDays: pricingSnapshot.billingDays,
      pricingSnapshot,
      estimatedTotal: pricingSnapshot.total,
    };
    return {
      ...pricedStay,
      bathPlan: bathPlanForStay(pricedStay),
      serviceTasks: boardingStayServiceTasks(record, pricedStay),
    };
  });
}

function boardingSummaryStatusFromStays(record = {}, stays = record.stays || [], fallbackStatus = "") {
  const scopedRecord = { ...record, stays };
  const targetStay = activeBoardingStay(scopedRecord) || currentOrNextStay(scopedRecord) || stays[0] || null;
  return targetStay ? boardingStayDisplayStatus(scopedRecord, targetStay) : fallbackStatus || normalizeBoardingStatus(record);
}

function boardingTransitionIsEarly(record = {}, nextStatus = "", options = {}) {
  const stay = boardingStatusTargetStay(record, nextStatus, options);
  if (nextStatus === "Checked In") return isFutureDateTime(stay?.dropoffTime);
  if (nextStatus === "Checked Out") return isFutureDateTime(stay?.pickupTime);
  return false;
}

function withBoardingStatusTransition(record = {}, nextStatus, options = {}) {
  const targetStay = (options.stayId || options.requestCode) ? boardingStayByReference(record, options) : null;
  const currentStatus = targetStay ? boardingStayDisplayStatus(record, targetStay) : normalizeBoardingStatus(record);
  if (!canTransitionBoardingStatus(record, nextStatus, options) && !options.forceStatusSync) return null;
  const timestamp = new Date().toISOString();
  const early = Boolean(options.early || boardingTransitionIsEarly(record, nextStatus, options));
  const kennelLocation = options.kennelLocation || null;
  const declineNoteText = nextStatus === "Cancelled" ? normalizedBoardingDeclineNote(options.declineNote) : "";
  const declineNote = declineNoteText ? boardingDeclineNotePayload(declineNoteText, record, targetStay || boardingStatusTargetStay(record, nextStatus, options) || {}, timestamp) : null;
  const customerCancellationReason = nextStatus === "Cancelled" ? normalizedBoardingDeclineNote(options.customerCancellationReason || options.cancellationReason) : "";
  const transitionActor = boardingTransitionActorPayload(options);
  const targetRequestCode = targetStay?.id ? boardingStayRequestCode(record, targetStay) : String(options.requestCode || "").trim();
  const latestCustomerCancellation = customerCancellationReason ? {
    stayId: options.stayId || targetStay?.id || "",
    requestCode: targetRequestCode,
    reason: customerCancellationReason,
    cancelledAt: timestamp,
    cancelledBy: transitionActor.name,
    cancelledByEmail: transitionActor.email,
  } : null;
  const scopedStays = boardingStatusScopedStays(record, nextStatus, timestamp, options).map((stay) => {
    if (nextStatus !== "In Kennel" || !kennelLocation) return stay;
    const targetStay = boardingStatusTargetStay(record, nextStatus, options);
    if (targetStay?.id && !boardingStayMatchesIdentity(stay, targetStay)) return stay;
    return {
      ...stay,
      kennelLocationId: kennelLocation.id,
      kennelLocationName: kennelLocation.name,
      kennelBuilding: kennelLocation.building,
      kennelAssignedAt: timestamp,
    };
  });
  const summaryStatus = options.stayId ? boardingSummaryStatusFromStays(record, scopedStays, nextStatus) : nextStatus;
  const clearsDogLocation = summaryStatus === "Approved" || summaryStatus === "Checked In";
  return {
    ...record,
    boardingStatus: summaryStatus,
    statusHistory: [
      ...(record.statusHistory || []),
      {
        from: currentStatus,
        to: nextStatus,
        stayId: options.stayId || "",
        requestCode: targetRequestCode,
        date: timestamp,
        by: transitionActor.name,
        byEmail: transitionActor.email,
        byRole: transitionActor.role,
        source: transitionActor.source,
        early,
        note: declineNote?.note || customerCancellationReason || "",
        customerNote: declineNote?.note || customerCancellationReason || "",
        customerCancellationReason,
      },
    ],
    checkedInAt: summaryStatus === "Approved" ? "" : summaryStatus === "Checked In" ? record.checkedInAt || timestamp : record.checkedInAt || "",
    inKennelAt: summaryStatus === "In Kennel" ? timestamp : clearsDogLocation ? "" : record.inKennelAt || "",
    readyForPickupAt: summaryStatus === "Ready For Pickup" ? timestamp : ["Approved", "Checked In", "In Kennel"].includes(summaryStatus) ? "" : record.readyForPickupAt || "",
    checkedOutAt: summaryStatus === "Checked Out" ? timestamp : record.checkedOutAt || "",
    cancelledAt: summaryStatus === "Cancelled" ? timestamp : record.cancelledAt || "",
    cancelledBy: summaryStatus === "Cancelled" ? transitionActor.name : clearsDogLocation ? "" : record.cancelledBy || "",
    cancelledByEmail: summaryStatus === "Cancelled" ? transitionActor.email : clearsDogLocation ? "" : record.cancelledByEmail || "",
    cancelledByRole: summaryStatus === "Cancelled" ? transitionActor.role : clearsDogLocation ? "" : record.cancelledByRole || "",
    cancelledSource: summaryStatus === "Cancelled" ? transitionActor.source : clearsDogLocation ? "" : record.cancelledSource || "",
    customerCancellationReason: customerCancellationReason || record.customerCancellationReason || "",
    customerCancellationAt: customerCancellationReason ? timestamp : record.customerCancellationAt || "",
    customerCancellationBy: customerCancellationReason ? transitionActor.name : record.customerCancellationBy || "",
    customerCancellationByEmail: customerCancellationReason ? transitionActor.email : record.customerCancellationByEmail || "",
    latestCustomerCancellation: latestCustomerCancellation || record.latestCustomerCancellation || null,
    declineNote: declineNote || record.declineNote || null,
    declineReason: declineNote?.note || record.declineReason || "",
    declinedAt: declineNote?.createdAt || record.declinedAt || "",
    declinedBy: declineNote?.createdBy || record.declinedBy || "",
    declinedByEmail: declineNote?.createdByEmail || record.declinedByEmail || "",
    earlyCheckInAt: nextStatus === "Checked In" && early ? timestamp : record.earlyCheckInAt || "",
    earlyCheckOutAt: nextStatus === "Checked Out" && early ? timestamp : record.earlyCheckOutAt || "",
    kennelLocationId: summaryStatus === "In Kennel" && kennelLocation ? kennelLocation.id : clearsDogLocation ? "" : record.kennelLocationId || "",
    kennelLocationName: summaryStatus === "In Kennel" && kennelLocation ? kennelLocation.name : clearsDogLocation ? "" : record.kennelLocationName || "",
    kennelBuilding: summaryStatus === "In Kennel" && kennelLocation ? kennelLocation.building : clearsDogLocation ? "" : record.kennelBuilding || "",
    kennelAssignedAt: summaryStatus === "In Kennel" && kennelLocation ? timestamp : clearsDogLocation ? "" : record.kennelAssignedAt || "",
    stays: scopedStays,
    flags: nextStatus === "Cancelled" || nextStatus === "Checked Out" ? (record.flags || []).filter((flag) => flag !== "Required update from owner") : record.flags || [],
  };
}

function approveBoardingRecord(record = {}) {
  const currentStatus = normalizeBoardingStatus(record);
  const transitioned = withBoardingStatusTransition(record, "Approved");
  if (transitioned) return transitioned;
  if (currentStatus === "Approved") return record;
  const timestamp = new Date().toISOString();
  const transitionActor = boardingTransitionActorPayload();
  const updatedStays = (record.stays || []).map((stay) => {
    const nextStayStatus = !stay.status || stay.status === "Cancelled" || stay.status === "Pending" ? "Approved" : stay.status;
    const clearCancellation = nextStayStatus === "Approved";
    return {
      ...stay,
      status: nextStayStatus,
      updatedAt: timestamp,
      cancelledAt: clearCancellation ? "" : stay.cancelledAt || "",
      cancelledBy: clearCancellation ? "" : stay.cancelledBy || "",
      cancelledByEmail: clearCancellation ? "" : stay.cancelledByEmail || "",
      cancelledByRole: clearCancellation ? "" : stay.cancelledByRole || "",
      cancelledSource: clearCancellation ? "" : stay.cancelledSource || "",
      customerCancellationReason: clearCancellation ? "" : stay.customerCancellationReason || "",
      customerCancellationAt: clearCancellation ? "" : stay.customerCancellationAt || "",
      customerCancellationBy: clearCancellation ? "" : stay.customerCancellationBy || "",
      customerCancellationByEmail: clearCancellation ? "" : stay.customerCancellationByEmail || "",
    };
  });
  return {
    ...record,
    boardingStatus: "Approved",
    approvedAt: record.approvedAt || timestamp,
    approvedBy: record.approvedBy || currentUser?.name || helperName?.value || "",
    cancelledAt: currentStatus === "Cancelled" ? "" : record.cancelledAt || "",
    cancelledBy: currentStatus === "Cancelled" ? "" : record.cancelledBy || "",
    cancelledByEmail: currentStatus === "Cancelled" ? "" : record.cancelledByEmail || "",
    cancelledByRole: currentStatus === "Cancelled" ? "" : record.cancelledByRole || "",
    cancelledSource: currentStatus === "Cancelled" ? "" : record.cancelledSource || "",
    customerCancellationReason: currentStatus === "Cancelled" ? "" : record.customerCancellationReason || "",
    customerCancellationAt: currentStatus === "Cancelled" ? "" : record.customerCancellationAt || "",
    customerCancellationBy: currentStatus === "Cancelled" ? "" : record.customerCancellationBy || "",
    customerCancellationByEmail: currentStatus === "Cancelled" ? "" : record.customerCancellationByEmail || "",
    latestCustomerCancellation: currentStatus === "Cancelled" ? null : record.latestCustomerCancellation || null,
    stays: updatedStays,
    statusHistory: [
      ...(record.statusHistory || []),
      {
        from: currentStatus,
        to: "Approved",
        date: timestamp,
        by: transitionActor.name,
        byEmail: transitionActor.email,
        byRole: transitionActor.role,
        source: transitionActor.source,
      },
    ],
    flags: (record.flags || []).filter((flag) => flag !== "Required update from owner"),
  };
}

function boardingStayDisplayStatus(record = {}, stay = {}) {
  const stayStatus = String(stay.status || "").trim();
  if (!stayStatus) return chronologicalBoardingStayStatus(record, stay, inferredBoardingStayStatus(record, stay));
  if (stayStatus === "Pending" && !record.customerRequest && (record.entrySource === "staff-admin" || !record.entrySource)) return "Approved";
  const normalized = boardingLifecycleStatuses.includes(stayStatus) ? stayStatus : normalizeBoardingStatus({ boardingStatus: stayStatus });
  return chronologicalBoardingStayStatus(record, stay, normalized);
}

function boardingPrimaryStay(record = {}) {
  const stays = record.stays || [];
  return activeBoardingStay(record)
    || currentOrNextStay(record)
    || stays.find((stay) => !inactiveBoardingStayStatus(stay))
    || stays[0]
    || null;
}

function boardingDisplayStatus(record = {}, stayOverride = null) {
  const stay = stayOverride || boardingPrimaryStay(record);
  return stay ? boardingStayDisplayStatus(record, stay) : normalizeBoardingStatus(record);
}

function boardingDogWithStayStatus(record = {}) {
  const normalizedRecord = boardingDogWithMergedStays(record);
  const stay = boardingPrimaryStay(normalizedRecord);
  if (!stay?.id) return normalizedRecord || {};
  const status = boardingStayDisplayStatus(normalizedRecord, stay);
  const next = {
    ...normalizedRecord,
    boardingStatus: status,
  };
  if (status === "In Kennel") {
    next.kennelLocationId = stay.kennelLocationId || normalizedRecord.kennelLocationId || "";
    next.kennelLocationName = stay.kennelLocationName || normalizedRecord.kennelLocationName || "";
    next.kennelBuilding = stay.kennelBuilding || normalizedRecord.kennelBuilding || "";
    next.kennelAssignedAt = stay.kennelAssignedAt || normalizedRecord.kennelAssignedAt || "";
  } else {
    next.kennelLocationId = "";
    next.kennelLocationName = "";
    next.kennelBuilding = "";
    next.kennelAssignedAt = "";
  }
  return next;
}

function boardingServiceTaskDisplayName(value = "") {
  const item = value && typeof value === "object" ? value : {};
  const raw = typeof value === "string" ? value : item.serviceName || item.label || "Service";
  return String(raw)
    .replace(/\\s+-\\s+\\$[\\d,]+(?:\\.\\d{2})?.*$/i, "")
    .replace(/\\s+requested$/i, "")
    .replace(/\\s+x\\d+$/i, "")
    .trim() || "Service";
}

function boardingStayRequestLabel(value = {}) {
  if (typeof value === "string") return String(value || "").trim();
  const item = value && typeof value === "object" ? value : {};
  const quantity = boardingServiceTaskQuantity(item);
  if (item.label) return String(item.label || "").trim();
  const serviceName = item.serviceName || item.name || "Service";
  return \`\${serviceName}\${quantity > 1 ? \` x\${quantity}\` : ""} requested\`;
}

function stayRequestIsFullBathLike(value = {}) {
  const item = value && typeof value === "object" ? value : {};
  const text = normalizedServiceLookupText(
    item.serviceName || item.name || item.label || item.value || boardingStayRequestLabel(value),
  );
  return text === "bath" || text.startsWith("full bath") || text.startsWith("full premium bath");
}

function serviceIsExplicitlyFree(service = {}) {
  return serviceHasFlag(service, "Explicitly free") || service.explicitlyFree === true || service.explicitlyFree === "true";
}

function servicePriceValue(service = {}) {
  const raw = service.basePrice ?? service.unitPrice ?? "";
  if (raw === "" || raw === null || raw === undefined) return NaN;
  return Number(raw);
}

function servicePriceError(service = {}, context = "service") {
  const name = service.serviceName || service.name || context || "Service";
  if (!service?.id) return \`\${context} is not configured in Services & Pricing.\`;
  if (service.removed) return \`\${name} is removed and cannot be priced.\`;
  if (!serviceHasFlag(service, "Active")) return \`\${name} is not active in Services & Pricing.\`;
  const price = servicePriceValue(service);
  if (!Number.isFinite(price)) return \`\${name} needs a valid price in Services & Pricing.\`;
  if (price < 0) return \`\${name} cannot have a negative price.\`;
  if (price === 0 && !serviceIsExplicitlyFree(service)) return \`\${name} is priced at $0 but is not marked explicitly free.\`;
  return "";
}

function activeAdminPricingRecords() {
  return readRecords("service").filter((service) => !service.removed && serviceHasFlag(service, "Active"));
}

var boardingPricingCatalogOverrideRecords = [];

function setBoardingPricingCatalogOverrideRecords(services = []) {
  boardingPricingCatalogOverrideRecords = arrayValue(services).map(boardingPricingCatalogServiceRecord).filter((service) => service?.id);
}

function applyBoardingPricingCatalogMigrations(options = {}) {
  try {
    if (typeof applyLegacyServiceDependencyMigration === "function") applyLegacyServiceDependencyMigration(options);
    if (typeof applyLegacyBoardingProgramMigration === "function") applyLegacyBoardingProgramMigration(options);
  } catch (error) {
    console.warn("Boarding pricing catalog normalization failed.", error);
  }
}

function boardingPricingCatalogServiceRecord(service = {}) {
  if (!service?.id) return service;
  const flags = serviceRecordFlags(service);
  const normalizedFlags = [...new Set(flags.map((flag) => String(flag || "").trim()).filter(Boolean))];
  const status = String(service.status || service.activeStatus || "").trim().toLowerCase();
  const inactiveSignal = service.removed === true
    || service.archived === true
    || service.hidden === true
    || service.active === false
    || service.enabled === false
    || service.isActive === false
    || ["inactive", "disabled", "archived", "removed", "hidden"].includes(status);
  const activeSignal = service.active === true
    || service.enabled === true
    || service.isActive === true
    || ["active", "enabled", "available", "on"].includes(status);
  const rateType = normalizedBoardingRateType(service.boardingRateType || service.stayRateBehavior || service.boardingProgramType || "");
  const includesBoarding = service.includesBoardingAccommodation === true || service.replacesStandardBoarding === true;
  const name = normalizedServiceLookupText(service.serviceName || service.name || "");
  const unit = service.unit || (rateType ? "per night" : "");
  const looksLikeBoardingRate = rateType || includesBoarding || (name.includes("boarding") && serviceUnitIsStayRate({ ...service, unit }));
  if (!inactiveSignal && looksLikeBoardingRate && !normalizedFlags.some((flag) => flag.toLowerCase() === "active") && (activeSignal || !normalizedFlags.length)) {
    normalizedFlags.push("Active");
  }
  return {
    ...service,
    category: service.category || (looksLikeBoardingRate ? "Boarding" : ""),
    basePrice: service.basePrice ?? service.unitPrice ?? service.rate ?? service.price ?? "",
    unit,
    boardingRateType: rateType || service.boardingRateType || "",
    includesBoardingAccommodation: service.includesBoardingAccommodation === true || rateType === "boarding-program",
    replacesStandardBoarding: service.replacesStandardBoarding === true || rateType === "boarding-program",
    flags: normalizedFlags,
  };
}

function boardingStayProgramServiceFromValue(program = {}, fallback = {}) {
  program = program || {};
  fallback = fallback || {};
  const serviceId = program.serviceId || program.id || fallback.stayProgramId || fallback.id || "";
  const serviceName = program.serviceName || program.name || fallback.stayProgramName || fallback.label || "";
  const rate = Number(program.rate ?? program.basePrice ?? fallback.rate ?? fallback.unitPrice ?? 0);
  if (!serviceId || !serviceName || !rate) return null;
  return {
    id: serviceId,
    serviceName,
    category: "Boarding",
    unit: program.unit || fallback.unit || "per night",
    basePrice: rate,
    boardingRateType: "boarding-program",
    boardingRateRole: "",
    pricingScope: program.pricingScope || fallback.pricingScope || fallback.customerPricingScope || (program.isMemberPricing ? "member" : ""),
    includesBoardingAccommodation: true,
    replacesStandardBoarding: true,
    flags: program.isMemberPricing ? ["Active", "Member Pricing"] : ["Active"],
  };
}

function boardingStayProgramServiceFallbackRecords() {
  const services = [];
  readRecords("boardingDog").forEach((record) => {
    arrayValue(record.stays).forEach((stay) => {
      const snapshot = stay.pricingSnapshot || {};
      [
        boardingStayProgramServiceFromValue(stay.stayProgram, stay),
        boardingStayProgramServiceFromValue(snapshot.stayProgram, snapshot),
        boardingStayProgramServiceFromValue({
          id: stay.stayProgramId || snapshot.stayProgramId,
          serviceName: stay.stayProgramName || snapshot.stayProgramName,
          rate: stay.stayProgramRate || snapshot.stayProgramRate || snapshot.currentDogRate,
          unit: snapshot.unit,
          pricingScope: snapshot.customerPricingScope || snapshot.pricingScope,
          isMemberPricing: snapshot.isMemberPricing,
        }),
        ...arrayValue(snapshot.perDogBreakdown).map((line) => boardingStayProgramServiceFromValue({
          id: line.stayProgramId,
          serviceName: line.stayProgramName,
          rate: line.rate,
          unit: snapshot.unit,
          pricingScope: line.pricingScope || snapshot.customerPricingScope,
          isMemberPricing: snapshot.isMemberPricing,
        })),
      ].filter(Boolean).forEach((service) => services.push(service));
    });
  });
  return services;
}

function liveBoardingPricingCatalogRecordsForSelection() {
  const liveServices = readRecords("service").map(boardingPricingCatalogServiceRecord).filter((service) => service?.id);
  return uniqueBoardingRateSelectionServices([
    ...liveServices,
    ...boardingPricingCatalogOverrideRecords,
  ].map(boardingPricingCatalogServiceRecord));
}

function boardingPricingCatalogRecordsForSelection() {
  return uniqueBoardingRateSelectionServices([
    ...liveBoardingPricingCatalogRecordsForSelection(),
    ...boardingStayProgramServiceFallbackRecords(),
  ].map(boardingPricingCatalogServiceRecord));
}

function activeLiveBoardingPricingRecordsForSelection() {
  return liveBoardingPricingCatalogRecordsForSelection()
    .filter((service) => !service.removed && serviceRecordHasActiveFlag(service));
}

function activeBoardingPricingRecordsForSelection() {
  return boardingPricingCatalogRecordsForSelection()
    .filter((service) => !service.removed && serviceRecordHasActiveFlag(service));
}

function stayRequestServiceUnitPriceForUser(serviceOrRequest = {}, user = currentUser) {
  const error = servicePriceError(serviceOrRequest, serviceOrRequest?.serviceName || serviceOrRequest?.name || "Service");
  if (error) return 0;
  return servicePriceValue(serviceOrRequest);
}

function boardingStayRequestUnitPrice(value = {}, options = {}) {
  const item = value && typeof value === "object" ? value : {};
  const catalogService = serviceCatalogMatchForRequest(value, options);
  const savedPrice = Number(item.unitPrice || item.basePrice || 0);
  if (savedPrice) return savedPrice;
  if (options.preferCatalogPricing && catalogService?.basePrice !== undefined) return stayRequestServiceUnitPriceForUser(catalogService, options.user);
  return catalogService ? stayRequestServiceUnitPriceForUser(catalogService, options.user) : 0;
}

function boardingStayRequestUnit(value = {}, options = {}) {
  const item = value && typeof value === "object" ? value : {};
  return item.unit || serviceCatalogMatchForRequest(value, options)?.unit || "";
}

function boardingStayRequestDisplayText(value = {}, options = {}) {
  const quantity = boardingServiceTaskQuantity(value);
  const label = options.customerFacing ? customerFacingBoardingStayRequestLabel(value, quantity) : boardingStayRequestLabel(value);
  const unitPrice = boardingStayRequestUnitPrice(value, options);
  const unit = boardingStayRequestUnit(value, options);
  const priceText = unitPrice ? \` - \${money(unitPrice * quantity)}\${unit ? \` \${unit}\` : ""}\` : "";
  return \`\${label}\${priceText}\`;
}

function boardingStayServicesText(stay = {}, options = {}) {
  const requests = arrayValue(stay.requests).map((request) => boardingStayRequestDisplayText(request, options)).filter(Boolean);
  return requests.length ? requests.join(", ") : "No service requests";
}

function boardingRequestStayLineTask(record = {}, stay = {}) {
  if (isServiceRequestStay(record, stay)) return null;
  const snapshot = boardingCurrentPricingSnapshotForStay(record, stay) || stay.pricingSnapshot || {};
  const boardingLine = arrayValue(snapshot.lineItems).find((line) => ["boarding", "boarding-program"].includes(line.type));
  const quantity = Number(
    boardingLine?.quantity
    || stay.billingDays
    || snapshot.billingDays
    || boardingDays(boardingBillableDropoffTime(stay), stay.pickupTime)
    || 0
  );
  if (!quantity) return null;
  const stayProgram = stay.stayProgram || snapshot.stayProgram || null;
  const serviceName = boardingLine?.label
    || stayProgram?.serviceName
    || stayProgram?.name
    || stay.stayProgramName
    || snapshot.stayProgramName
    || boardingLineRoleLabel(snapshot.currentDogRole || snapshot.boardingRateRole || "");
  return {
    source: "boarding-stay",
    serviceName: serviceName || "Boarding",
    quantity,
    unit: boardingLine?.unit || stayProgram?.unit || snapshot.unit || "night",
  };
}

function boardingRequestServiceRowMeta(task = {}) {
  const quantity = boardingServiceTaskQuantity(task);
  if (task.source === "boarding-stay") {
    const unit = String(task.unit || "night").replace(/^per\\s+/i, "").trim() || "night";
    const pluralUnit = quantity === 1 || /s$/i.test(unit) ? unit : \`\${unit}s\`;
    return {
      requestMeta: \`\${quantity} x \${pluralUnit}\`,
      rowLabel: \`\${quantity} x \${task.serviceName || boardingServiceTaskDisplayName(task)} stay quantity\`,
    };
  }
  const actionText = task.source === "check-in" ? "added at check-in" : "requested";
  return {
    requestMeta: \`\${quantity} x \${actionText}\`,
    rowLabel: \`\${quantity} x \${task.serviceName || boardingServiceTaskDisplayName(task)} \${actionText}\`,
  };
}

function boardingRequestServiceRowsHtml(record = {}, stay = {}) {
  const tasks = [boardingRequestStayLineTask(record, stay), ...boardingStayServiceTasks(record, stay)].filter(Boolean);
  if (!tasks.length) return \`<p class="boarding-request-empty-services">No service requests</p>\`;
  return \`<div class="boarding-request-service-list" role="list" aria-label="Requested stay services">\${tasks.map((task) => {
    const quantity = boardingServiceTaskQuantity(task);
    const serviceName = task.serviceName || boardingServiceTaskDisplayName(task);
    const requestedMeta = \`\${quantity} x requested\`;
    const checkInMeta = \`\${quantity} x added at check-in\`;
    const { requestMeta, rowLabel } = task.source === "boarding-stay"
      ? boardingRequestServiceRowMeta(task)
      : {
          requestMeta: task.source === "check-in" ? checkInMeta : requestedMeta,
          rowLabel: \`\${quantity} x \${serviceName} \${task.source === "check-in" ? "added at check-in" : "requested"}\`,
        };
    return \`<div class="boarding-request-service-row" role="listitem" aria-label="\${escapeHtml(rowLabel)}">
      <span class="boarding-request-service-quantity" aria-hidden="true">\${escapeHtml(quantity)}</span>
      <span class="boarding-request-service-copy"><strong>\${escapeHtml(serviceName)}</strong><small>\${escapeHtml(requestMeta)}</small></span>
    </div>\`;
  }).join("")}</div>\`;
}

function boardingRequestEstimatedTotalHtml(total = 0) {
  return total ? \`<div class="boarding-request-total-row"><span>Est. Total</span><strong>\${money(total)}</strong></div>\` : "";
}

function boardingStayRequestTotal(requests = [], options = {}) {
  return arrayValue(requests).reduce((total, request) => {
    const unitPrice = boardingStayRequestUnitPrice(request, options);
    const quantity = boardingServiceTaskQuantity(request);
    return total + (unitPrice * quantity);
  }, 0);
}

function activeBoardingPricingServices() {
  return activeAdminPricingRecords().filter((service) => serviceCategoryIsBoarding(service) && serviceIsStandardBoardingRate(service));
}

function serviceCategoryIsBoarding(service = {}) {
  return normalizedServiceLookupText(service.category || "") === "boarding";
}

function serviceUnitIsStayRate(service = {}) {
  const unitTokens = normalizedServiceLookupText(service.unit || "").split(" ").filter(Boolean);
  return ["night", "nights", "day", "days"].some((token) => unitTokens.includes(token));
}

function serviceLooksLikeBoardingStayRate(service = {}) {
  if (!serviceCategoryIsBoarding(service)) return false;
  if (!serviceUnitIsStayRate(service)) return false;
  const name = normalizedServiceLookupText(service.serviceName || service.name || "");
  const rateType = serviceBoardingRateType(service);
  return serviceIsStandardBoardingRate(service)
    || rateType === "boarding-program"
    || service.includesBoardingAccommodation === true
    || service.replacesStandardBoarding === true
    || name.includes("boarding");
}

function serviceIsSelectableBoardingRate(service = {}) {
  if (!serviceCategoryIsBoarding(service)) return false;
  if (serviceIsStandardBoardingRate(service)) return true;
  const rateType = serviceBoardingRateType(service);
  if (rateType && rateType !== "boarding-program") return false;
  return serviceLooksLikeBoardingStayRate(service);
}

function selectableBoardingPricingServices() {
  return activeBoardingPricingRecordsForSelection().filter(serviceIsSelectableBoardingRate);
}

function serviceIsOvernightBoardingRateAlternative(service = {}) {
  if (!serviceCategoryIsBoarding(service)) return false;
  const name = normalizedServiceLookupText(service.serviceName || service.name || "");
  if (!name.includes("overnight") || !name.includes("boarding")) return false;
  return serviceUnitIsStayRate(service);
}

function serviceRecordFlags(service = {}) {
  const flags = service.flags;
  if (Array.isArray(flags)) return flags;
  if (typeof flags === "string") return flags.split(/[,|;]/);
  if (flags && typeof flags === "object") return Object.values(flags);
  return [];
}

function serviceRecordHasFlag(service = {}, flag = "") {
  const target = String(flag || "").trim().toLowerCase();
  return serviceRecordFlags(service).some((item) => {
    const normalized = String(item || "").trim().toLowerCase();
    return normalized === target || (target === "member pricing" && normalized === "alumni only");
  });
}

function serviceRecordHasActiveFlag(service = {}) {
  return serviceRecordHasFlag(service, "Active");
}

function selectableOvernightBoardingPricingServices() {
  return activeBoardingPricingRecordsForSelection().filter(serviceIsOvernightBoardingRateAlternative);
}

function customerPricingScopeForUser(user = currentUser) {
  return isMemberUser(user) ? "member" : "non-member";
}

function serviceMatchesPricingScopeForResolution(service = {}, scope = "non-member") {
  const serviceScope = servicePricingScope(service);
  return serviceScope === "all" || serviceScope === scope;
}

function boardingRateServicePricingScope(service = {}) {
  const explicit = normalizedPricingScope(service.pricingScope || service.customerPricingScope || "");
  if (explicit) return explicit;
  if (serviceRecordHasFlag(service, "Member Pricing")) return "member";
  return servicePricingScope(service);
}

function boardingRateServiceMatchesPricingScope(service = {}, scope = "non-member") {
  const serviceScope = boardingRateServicePricingScope(service);
  return serviceScope === "all" || serviceScope === scope;
}

function resolveStandardBoardingRate(options = {}) {
  const user = options.user || currentUser;
  const scope = options.pricingScope || customerPricingScopeForUser(user);
  const role = normalizedBoardingRateRole(options.role || "primary");
  const matches = activeBoardingPricingServices()
    .filter((service) => normalizedBoardingRateRole(service.boardingRateRole || "primary") === role)
    .filter((service) => serviceMatchesPricingScopeForResolution(service, scope));
  const label = role === "shared-crate-additional" ? "shared-crate additional dog boarding rate" : "standard boarding rate";
  if (matches.length !== 1) {
    return {
      ok: false,
      error: matches.length
        ? \`Multiple active \${label}s are configured for \${scope} customers.\`
        : \`No active \${label} is configured for \${scope} customers.\`,
      pricingScope: scope,
      role,
    };
  }
  const service = matches[0];
  const priceError = servicePriceError(service, label);
  if (priceError) return { ok: false, error: priceError, pricingScope: scope, role, service };
  return {
    ok: true,
    service,
    serviceId: service.id,
    serviceName: service.serviceName || "Boarding rate",
    rate: servicePriceValue(service),
    unit: service.unit || "per night",
    depositAmount: Number(service.depositAmount || 0),
    taxRate: Number(service.taxRate || 0),
    pricingScope: servicePricingScope(service),
    customerPricingScope: scope,
    role,
  };
}

function boardingRatePlanForCustomer(user = currentUser) {
  const isMemberPricing = isMemberUser(user);
  const scope = customerPricingScopeForUser(user);
  const primaryRate = resolveStandardBoardingRate({ user, pricingScope: scope, role: "primary" });
  const sharedCrateRate = resolveStandardBoardingRate({ user, pricingScope: scope, role: "shared-crate-additional" });
  const errors = [primaryRate, sharedCrateRate].filter((item) => !item.ok).map((item) => item.error);
  return {
    isMemberPricing,
    customerPricingScope: scope,
    primaryRate: primaryRate.ok ? primaryRate.rate : 0,
    sharedCrateRate: sharedCrateRate.ok ? sharedCrateRate.rate : 0,
    primaryRateConfig: primaryRate,
    sharedCrateRateConfig: sharedCrateRate,
    errors,
    ok: primaryRate.ok,
    maxDogsPerCrate: BOARDING_MAX_DOGS_PER_CRATE,
  };
}

function boardingRatePlanForRecord(record = {}) {
  const owner = ownerAccountForBoarding(record) || savedUserFor({ email: record.ownerEmail || record.customerEmail }) || {};
  return boardingRatePlanForCustomer(owner);
}

function boardingPricingUserForRecord(record = {}, options = {}) {
  return options.user || options.ownerUser || ownerAccountForBoarding(record) || savedUserFor({ email: record.ownerEmail || record.customerEmail }) || null;
}

function boardingBillableDropoffTime(stay = {}) {
  if (stay.billingStartPolicy === "actual" && stay.billingStartTime) return stay.billingStartTime;
  return stay.dropoffTime;
}

function boardingActiveWindowStartTime(stay = {}) {
  if (stayHasActualDropoffEvidence(stay)) {
    return stay.actualDropoffAt
      || stay.actualCheckInAt
      || stay.checkedInAt
      || stay.checkIn?.actualDropoffAt
      || stay.checkIn?.actualCheckInAt
      || stay.checkIn?.verifiedAt
      || stay.billingStartTime
      || stay.dropoffTime;
  }
  return stay.dropoffTime;
}

function boardingStayPricingNeedsBillingStartRefresh(stay = {}) {
  if (stay.billingStartPolicy !== "actual" || !stay.billingStartTime || !stay.pricingSnapshot) return false;
  const billableDropoffTime = boardingBillableDropoffTime(stay);
  const billableDropoffDate = new Date(billableDropoffTime);
  if (Number.isNaN(billableDropoffDate.getTime())) return false;
  const snapshot = stay.pricingSnapshot || {};
  const snapshotBillableTime = snapshot.billableDropoffTime || snapshot.billingStartTime || "";
  const snapshotBillableDate = snapshotBillableTime ? new Date(snapshotBillableTime) : null;
  const snapshotMatchesStart = snapshotBillableDate && !Number.isNaN(snapshotBillableDate.getTime())
    && snapshotBillableDate.getTime() === billableDropoffDate.getTime();
  const expectedDays = boardingDays(billableDropoffTime, stay.pickupTime);
  const snapshotMatchesDays = Number(snapshot.billingDays ?? snapshot.dayCount ?? snapshot.unitCount ?? 0) === expectedDays;
  return !snapshotMatchesStart || !snapshotMatchesDays;
}

function boardingRateSelectionRole(role = "") {
  return normalizedBoardingRateRole(role) === "shared-crate-additional" ? "shared-crate-additional" : "primary";
}

function boardingRateSelectionScope(record = {}, stay = {}, options = {}) {
  const explicitScope = normalizedPricingScope(options.pricingScope || "");
  if (explicitScope) return explicitScope;
  const ratePlan = options.ratePlan || boardingRatePlanForRecord(record);
  const ratePlanScope = normalizedPricingScope(ratePlan.customerPricingScope || "");
  if (ratePlanScope) return ratePlanScope;
  const pricingUser = boardingPricingUserForRecord(record, options);
  const userScope = pricingUser ? customerPricingScopeForUser(pricingUser) : "";
  if (userScope) return userScope;
  return normalizedPricingScope(stay.pricingSnapshot?.customerPricingScope || stay.pricingSnapshot?.pricingScope || "") || "non-member";
}

function boardingRateServiceExplicitRole(service = {}) {
  return String(service.boardingRateRole || "").trim();
}

function boardingRateServiceRoleMatches(service = {}, role = "primary") {
  const explicitRole = boardingRateServiceExplicitRole(service);
  if (!explicitRole) return true;
  const normalizedRole = normalizedBoardingRateRole(explicitRole);
  if (serviceBoardingRateType(service) === "boarding-program") {
    return normalizedRole !== "shared-crate-additional";
  }
  return normalizedRole === role;
}

function serviceHasBoardingRateSelectionMetadata(service = {}) {
  return Boolean(
    serviceBoardingRateType(service)
    || normalizedPricingScope(service.pricingScope || service.customerPricingScope || "")
    || boardingRateServiceExplicitRole(service)
    || service.includesBoardingAccommodation === true
    || service.replacesStandardBoarding === true
  );
}

function serviceIsBoardingRateSelectorCandidate(service = {}) {
  if (!service?.id || !serviceCategoryIsBoarding(service) || !serviceUnitIsStayRate(service)) return false;
  const rateType = serviceBoardingRateType(service);
  if (rateType && !["standard-boarding", "boarding-program"].includes(rateType)) return false;
  return serviceHasBoardingRateSelectionMetadata(service)
    || serviceIsSelectableBoardingRate(service)
    || serviceIsOvernightBoardingRateAlternative(service);
}

function boardingRateSelectionSort(a = {}, b = {}) {
  const priceDelta = servicePriceValue(a) - servicePriceValue(b);
  if (priceDelta) return priceDelta;
  return String(a.serviceName || "").localeCompare(String(b.serviceName || ""));
}

function uniqueBoardingRateSelectionServices(services = []) {
  const seen = new Set();
  return services.filter((service) => {
    const key = service.id || [service.serviceName || service.name || "", service.basePrice || "", service.unit || "", boardingRateServicePricingScope(service)].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function boardingStayHasProgramPricingSignal(stay = {}) {
  const snapshot = stay.pricingSnapshot || {};
  return Boolean(
    stay.stayProgramId
    || snapshot.stayProgramId
    || stay.stayProgramName
    || snapshot.stayProgramName
    || stay.stayProgramRate
    || snapshot.stayProgramRate
    || stay.stayProgram
    || snapshot.stayProgram
    || snapshot.replacesStandardBoarding === true
    || arrayValue(snapshot.lineItems).some((line) => line.type === "boarding-program")
  );
}

function boardingRateSelectionServices(record = {}, stay = {}, options = {}) {
  const scope = boardingRateSelectionScope(record, stay, options);
  const role = boardingRateSelectionRole(options.currentDogRole || stay.pricingSnapshot?.currentDogRole || stay.pricingSnapshot?.boardingRateRole || "");
  const liveSelectable = uniqueBoardingRateSelectionServices(
    activeLiveBoardingPricingRecordsForSelection().filter(serviceIsBoardingRateSelectorCandidate)
  );
  const fallbackSelectable = uniqueBoardingRateSelectionServices(
    activeBoardingPricingRecordsForSelection().filter(serviceIsBoardingRateSelectorCandidate)
  );
  const selectable = liveSelectable.length ? liveSelectable : fallbackSelectable;
  const roleMatches = selectable.filter((service) => boardingRateServiceRoleMatches(service, role));
  const scopedMatches = roleMatches.filter((service) => boardingRateServiceMatchesPricingScope(service, scope));
  const currentServiceId = boardingRateSelectionCurrentServiceId(stay, selectable);
  const currentService = currentServiceId ? selectable.find((service) => service.id === currentServiceId) : null;
  const currentServiceMatchesContext = currentService
    && boardingRateServiceRoleMatches(currentService, role)
    && boardingRateServiceMatchesPricingScope(currentService, scope);
  const candidates = scopedMatches.length
    ? scopedMatches
    : liveSelectable.length
      ? []
      : roleMatches.length ? roleMatches : selectable;
  return uniqueBoardingRateSelectionServices([
    ...(currentServiceMatchesContext ? [currentService] : []),
    ...candidates,
  ]).sort(boardingRateSelectionSort);
}

function boardingRateSelectionCurrentServiceId(stay = {}, services = []) {
  const snapshot = stay.pricingSnapshot || {};
  const hasProgramSignal = boardingStayHasProgramPricingSignal(stay);
  const savedServiceId = stay.stayProgramId
    || snapshot.stayProgramId
    || (!hasProgramSignal ? snapshot.boardingRateServiceId || "" : "");
  if (savedServiceId && services.some((service) => service.id === savedServiceId)) return savedServiceId;
  const boardingLine = arrayValue(snapshot.lineItems).find((line) => ["boarding", "boarding-program"].includes(line.type)) || {};
  const stayProgram = stay.stayProgram || snapshot.stayProgram || {};
  const targetName = normalizedServiceLookupText(hasProgramSignal
    ? stayProgram.serviceName
      || stayProgram.name
      || stay.stayProgramName
      || snapshot.stayProgramName
      || boardingLine.stayProgramName
      || (boardingLine.type === "boarding-program" ? boardingLine.label : "")
      || snapshot.boardingRateServiceName
      || ""
    : snapshot.boardingRateServiceName
      || snapshot.stayProgramName
      || stay.stayProgramName
      || boardingLine.label
      || "");
  const targetRate = Number(hasProgramSignal
    ? stayProgram.rate
      ?? stayProgram.basePrice
      ?? stay.stayProgramRate
      ?? snapshot.stayProgramRate
      ?? boardingLine.unitPrice
      ?? snapshot.currentDogRate
      ?? snapshot.baseRate
      ?? 0
    : snapshot.currentDogRate || snapshot.baseRate || stay.stayProgramRate || boardingLine.unitPrice || 0);
  const nameMatches = services.filter((service) => {
    const serviceName = normalizedServiceLookupText(service.serviceName || service.name || "");
    const priceMatches = !targetRate || servicePriceValue(service) === targetRate;
    return targetName && serviceName === targetName && priceMatches;
  });
  if (nameMatches.length === 1) return nameMatches[0].id;
  const priceMatches = services.filter((service) => targetRate > 0 && servicePriceValue(service) === targetRate);
  return priceMatches.length === 1 ? priceMatches[0].id : "";
}

var boardingPricingCatalogLoadPromise = null;

async function fetchBoardingPricingCatalogServices() {
  if (!supabaseClient) return [];
  const { data, error } = await supabaseClient
    .from("kennel_records")
    .select("id,type,payload,updated_at")
    .eq("type", "service")
    .order("updated_at", { ascending: false })
    .limit(1000);
  if (error) throw error;
  return arrayValue(data)
    .filter((row) => row.type === "service")
    .map((row) => ({
      ...(row.payload || {}),
      id: row.payload?.id || row.id,
      updatedAt: row.payload?.updatedAt || row.updated_at || "",
    }))
    .filter((service) => service?.id);
}

async function refreshBoardingPricingCatalogRecords() {
  const serviceSources = [];
  try {
    serviceSources.push(...await fetchBoardingPricingCatalogServices());
  } catch (error) {
    console.warn("Direct boarding pricing catalog fetch failed.", error);
  }

  if (typeof fetchRemoteRecordRows === "function" && typeof mergeRecords === "function") {
    try {
      const rows = await fetchRemoteRecordRows(["service"]);
      serviceSources.push(...arrayValue(rows).filter((row) => row.type === "service").map((row) => ({
        ...(row.payload || {}),
        id: row.payload?.id || row.id,
        updatedAt: row.payload?.updatedAt || row.updated_at || "",
      })).filter((service) => service?.id));
    } catch (error) {
      console.warn("Remote boarding pricing catalog fetch failed.", error);
    }
  }

  if (serviceSources.length && typeof mergeRecords === "function") {
    const remoteServices = uniqueBoardingRateSelectionServices(serviceSources.map(boardingPricingCatalogServiceRecord).filter((service) => service?.id));
    mergeRecords("service", remoteServices, { replaceLocal: true });
  }

  if (typeof loadRemoteRecords === "function") {
    await loadRemoteRecords({ render: false, types: ["service"] });
  }

  applyBoardingPricingCatalogMigrations({ syncRemote: false });

  const services = uniqueBoardingRateSelectionServices(readRecords("service").map(boardingPricingCatalogServiceRecord).filter((service) => service?.id));
  if (services.length) {
    setBoardingPricingCatalogOverrideRecords(services);
    if (typeof mergeRecords === "function") {
      mergeRecords("service", services, { replaceLocal: true });
    }
  }
}

async function ensureBoardingPricingCatalogLoaded() {
  if (localTestMode || !supabaseClient) return;
  if (!boardingPricingCatalogLoadPromise) {
    boardingPricingCatalogLoadPromise = refreshBoardingPricingCatalogRecords()
      .catch((error) => {
        console.warn("Boarding pricing catalog could not refresh before opening stay editor.", error);
      })
      .finally(() => {
        boardingPricingCatalogLoadPromise = null;
      });
  }
  await boardingPricingCatalogLoadPromise;
}

function boardingRateServiceForSelection(record = {}, stay = {}, serviceId = "", options = {}) {
  const selectedId = String(serviceId || "").trim();
  if (!selectedId) return null;
  return boardingRateSelectionServices(record, stay, options).find((service) => service.id === selectedId) || null;
}

function boardingRateConfigFromService(service = {}, role = "primary", scope = "") {
  const priceError = servicePriceError(service, "selected boarding price");
  if (priceError) return { ok: false, error: priceError, service, role, pricingScope: scope };
  return {
    ok: true,
    service,
    serviceId: service.id,
    serviceName: service.serviceName || "Boarding rate",
    rate: servicePriceValue(service),
    unit: service.unit || "per night",
    depositAmount: Number(service.depositAmount || 0),
    taxRate: Number(service.taxRate || 0),
    pricingScope: servicePricingScope(service),
    customerPricingScope: scope,
    role,
  };
}

function boardingStayProgramSnapshotFromService(service = null) {
  if (!service?.id || serviceBoardingRateType(service) !== "boarding-program") return null;
  if (typeof customerStayProgramSnapshot === "function") return customerStayProgramSnapshot(service);
  const priceError = servicePriceError(service, service.serviceName || "Boarding program");
  const rate = priceError ? 0 : servicePriceValue(service);
  return {
    id: service.id,
    serviceId: service.id,
    serviceName: service.serviceName || "Boarding program",
    name: service.serviceName || "Boarding program",
    rate,
    unit: service.unit || "per night",
    isMemberPricing: serviceHasFlag(service, "Member Pricing"),
    includesBoardingAccommodation: true,
    replacesStandardBoarding: true,
    pricingScope: servicePricingScope(service),
    pricingError: priceError,
  };
}

function boardingPricingDogKey(dog = {}) {
  return customerBookingSelectionKey(dog)
    || dog.id
    || dog.linkedCustomerDogId
    || dog.sourceBoardingDogId
    || boardingDogIdentityKey(dog)
    || normalizedDogIdentityName(dog);
}

function boardingLineRoleLabel(role = "") {
  if (role === "boarding-program") return "Boarding program";
  if (role === "shared-crate-additional") return "Shared crate dog";
  if (role === "non-member") return "Non-member boarding";
  return "Primary crate dog";
}

function boardingLineDisplayLabel(line = {}) {
  return line.stayProgramName || boardingLineRoleLabel(line.role);
}

function boardingDogPricingLines(dogs = [], options = {}) {
  const ratePlan = options.ratePlan || boardingRatePlanForCustomer();
  const stayProgram = options.stayProgram || null;
  const days = Number(options.days || 0);
  const isServiceRequest = Boolean(options.isServiceRequest);
  const sharedCrateRequested = Boolean(options.sharedCrateRequested && ratePlan.isMemberPricing && !stayProgram);
  const programRate = Number(stayProgram?.rate ?? stayProgram?.basePrice ?? 0);
  return uniqueCustomerBookingDogs(dogs).map((dog, index) => {
    const pairIndex = Math.floor(index / ratePlan.maxDogsPerCrate);
    const position = index % ratePlan.maxDogsPerCrate;
    const sharedGroup = sharedCrateRequested && position > 0;
    const role = stayProgram ? "boarding-program" : ratePlan.isMemberPricing
      ? sharedGroup ? "shared-crate-additional" : "primary"
      : "non-member";
    const rateConfig = sharedGroup ? ratePlan.sharedCrateRateConfig : ratePlan.primaryRateConfig;
    const pricingError = isServiceRequest || stayProgram ? "" : !rateConfig?.ok ? rateConfig?.error || "Boarding pricing is not configured." : "";
    const rate = isServiceRequest ? 0 : stayProgram ? programRate : sharedGroup ? ratePlan.sharedCrateRate : ratePlan.primaryRate;
    return {
      dogKey: boardingPricingDogKey(dog),
      dogId: dog.id || "",
      dogName: dog.dogName || "Dog",
      stayProgramId: stayProgram?.id || stayProgram?.serviceId || "",
      stayProgramName: stayProgram?.serviceName || stayProgram?.name || "",
      crateGroupId: sharedCrateRequested ? \`crate-\${pairIndex + 1}\` : \`solo-\${boardingPricingDogKey(dog) || index}\`,
      crateGroupPosition: sharedCrateRequested ? position + 1 : 1,
      role,
      rate,
      days,
      total: pricingError || isServiceRequest ? 0 : days * rate,
      sharedCrateRequested,
      pricingError,
      boardingRateServiceId: rateConfig?.serviceId || "",
      boardingRateServiceName: rateConfig?.serviceName || "",
      pricingScope: rateConfig?.pricingScope || ratePlan.customerPricingScope || "",
    };
  });
}

function boardingPricingSnapshotForStay(record = {}, stay = {}, options = {}) {
  const ratePlan = options.ratePlan || boardingRatePlanForRecord(record);
  const pricingUser = boardingPricingUserForRecord(record, options);
  const customerPricingScope = ratePlan.customerPricingScope || customerPricingScopeForUser(pricingUser);
  const servicePricingOptions = {
    user: pricingUser,
    preferCatalogPricing: Boolean(options.preferCatalogPricing || options.forceCurrentPricing || boardingStayCanUseCurrentPricing(record, stay)),
  };
  const stayType = options.stayType || stay.stayType || record.stayType || "Boarding";
  const isServiceRequest = stayType === "Service Request";
  const billableDropoffTime = boardingBillableDropoffTime(stay);
  const days = isServiceRequest ? 0 : boardingDays(billableDropoffTime, stay.pickupTime);
  const stayProgram = options.stayProgram || stay.stayProgram || stay.pricingSnapshot?.stayProgram || null;
  const stayProgramName = stayProgram?.serviceName || stayProgram?.name || stay.stayProgramName || stay.pricingSnapshot?.stayProgramName || "";
  const stayProgramRate = Number(stayProgram?.rate ?? stayProgram?.basePrice ?? stay.stayProgramRate ?? stay.pricingSnapshot?.stayProgramRate ?? 0);
  const priorRole = stay.pricingSnapshot?.currentDogRole || stay.pricingSnapshot?.role || "";
  const role = options.currentDogRole || priorRole || (stayProgram ? "boarding-program" : ratePlan.isMemberPricing ? "primary" : "non-member");
  const defaultRateConfig = role === "shared-crate-additional" ? ratePlan.sharedCrateRateConfig : ratePlan.primaryRateConfig;
  const selectedRateService = !isServiceRequest && !stayProgram
    ? options.boardingRateService
      || boardingRateServiceForSelection(record, stay, options.boardingRateServiceId || stay.pricingSnapshot?.boardingRateServiceId || "", {
        user: pricingUser,
        pricingScope: customerPricingScope,
        currentDogRole: role,
      })
    : null;
  const selectedRateConfig = selectedRateService
    ? boardingRateConfigFromService(selectedRateService, boardingRateSelectionRole(role), customerPricingScope)
    : null;
  const rateConfig = selectedRateConfig?.ok ? selectedRateConfig : defaultRateConfig;
  const pricingErrors = [
    ...(arrayValue(options.pricingErrors || [])),
    ...(!isServiceRequest && !stayProgram && !rateConfig?.ok ? [rateConfig?.error || "Boarding pricing is not configured."] : []),
  ].filter(Boolean);
  const rate = isServiceRequest ? 0 : stayProgram ? stayProgramRate : Number(rateConfig?.rate || 0);
  const requests = options.requests || stay.requests || [];
  const adjustments = normalizeInvoiceAdjustments(options.invoiceAdjustments || stay.invoiceAdjustments || []);
  const boardingSubtotal = pricingErrors.length || isServiceRequest ? 0 : days * rate;
  const serviceSubtotal = boardingStayRequestTotal(requests, servicePricingOptions);
  const adjustmentsTotal = invoiceAdjustmentsTotal(adjustments);
  const total = Math.max(0, boardingSubtotal + serviceSubtotal + adjustmentsTotal);
  const preserveSavedGroupTotals = !options.forceCurrentPricing;
  return {
    version: "boarding-rate-v2",
    pricingSource: "admin-service-catalog",
    calculatedAt: new Date().toISOString(),
    customerPricingScope,
    scheduledDropoffTime: stay.scheduledDropoffTime || stay.requestedDropoffTime || stay.dropoffTime || "",
    billableDropoffTime,
    billingStartPolicy: stay.billingStartPolicy || "",
    billingStartTime: stay.billingStartTime || "",
    billingUnit: "boarding day/night",
    billingDays: days,
    dayCount: days,
    nightCount: days,
    unitCount: days,
    isMemberPricing: ratePlan.isMemberPricing,
    maxDogsPerCrate: ratePlan.maxDogsPerCrate,
    boardingRateServiceId: rateConfig?.serviceId || "",
    boardingRateServiceName: rateConfig?.serviceName || "",
    boardingRateRole: role,
    baseRate: rate,
    unit: rateConfig?.unit || stayProgram?.unit || "per night",
    dogCount: Number(options.dogCount || stay.pricingSnapshot?.dogCount || 1),
    selectedServiceIds: arrayValue(requests).map((request) => request.serviceId || request.id).filter(Boolean),
    selectedServiceNames: arrayValue(requests).map((request) => boardingServiceTaskDisplayName(request)).filter(Boolean),
    selectedServicePrices: arrayValue(requests).map((request) => ({
      serviceId: request.serviceId || request.id || "",
      serviceName: boardingServiceTaskDisplayName(request),
      quantity: boardingServiceTaskQuantity(request),
      unitPrice: boardingStayRequestUnitPrice(request, servicePricingOptions),
      unit: boardingStayRequestUnit(request, servicePricingOptions),
    })),
    depositAmount: Number(rateConfig?.depositAmount || 0),
    taxRate: Number(rateConfig?.taxRate || 0),
    subtotal: boardingSubtotal + serviceSubtotal + adjustmentsTotal,
    taxAmount: 0,
    depositDue: Number(rateConfig?.depositAmount || 0),
    pricingErrors,
    warning: pricingErrors.join(" "),
    stayProgramId: stayProgram?.id || stayProgram?.serviceId || stay.stayProgramId || stay.pricingSnapshot?.stayProgramId || "",
    stayProgramName,
    stayProgramRate,
    stayProgram: stayProgram ? { ...stayProgram, rate: stayProgramRate, serviceName: stayProgramName || stayProgram.serviceName || stayProgram.name || "Boarding program" } : null,
    replacesStandardBoarding: Boolean(stayProgram),
    currentDogKey: options.currentDogKey || stay.pricingSnapshot?.currentDogKey || record.id || "",
    currentDogName: options.currentDogName || stay.pricingSnapshot?.currentDogName || record.dogName || "",
    currentDogRole: role,
    currentDogRate: rate,
    sharedCrateRequested: Boolean(options.sharedCrateRequested || stay.pricingSnapshot?.sharedCrateRequested),
    crateGroupId: options.crateGroupId || stay.pricingSnapshot?.crateGroupId || "",
    boardingSubtotal,
    serviceSubtotal,
    adjustmentsTotal,
    total,
    groupBoardingSubtotal: options.groupBoardingSubtotal ?? (preserveSavedGroupTotals ? stay.pricingSnapshot?.groupBoardingSubtotal : undefined) ?? boardingSubtotal,
    groupServiceSubtotal: options.groupServiceSubtotal ?? (preserveSavedGroupTotals ? stay.pricingSnapshot?.groupServiceSubtotal : undefined) ?? serviceSubtotal,
    groupTotal: options.groupTotal ?? (preserveSavedGroupTotals ? stay.pricingSnapshot?.groupTotal : undefined) ?? total,
    perDogBreakdown: options.perDogBreakdown || stay.pricingSnapshot?.perDogBreakdown || [],
    lineItems: [
      ...(boardingSubtotal ? [{ type: stayProgram ? "boarding-program" : "boarding", label: stayProgramName || rateConfig?.serviceName || boardingLineRoleLabel(role), quantity: days, unitPrice: rate, amount: boardingSubtotal }] : []),
      ...arrayValue(requests).map((request) => ({
        type: "service",
        label: boardingServiceTaskDisplayName(request),
        quantity: boardingServiceTaskQuantity(request),
        unitPrice: boardingStayRequestUnitPrice(request, servicePricingOptions),
        amount: boardingStayRequestUnitPrice(request, servicePricingOptions) * boardingServiceTaskQuantity(request),
      })),
      ...adjustments.map((adjustment) => ({
        type: adjustment.type,
        label: adjustment.label,
        amount: invoiceAdjustmentSignedAmount(adjustment),
        reason: adjustment.reason,
      })),
    ],
  };
}

var boardingCurrentPricingStatuses = ["Pending", "Approved", "Checked In", "In Kennel", "Ready For Pickup"];

function boardingStayCanUseCurrentPricing(record = {}, stay = {}) {
  const status = stay?.id ? boardingStayDisplayStatus(record, stay) : normalizeBoardingStatus(record);
  const customerRequest = Boolean(record.customerRequest || stay.source === "customer-request" || stay.source === "customer");
  return customerRequest && boardingCurrentPricingStatuses.includes(status);
}

function boardingCurrentDogRoleForStay(stay = {}, ratePlan = {}, options = {}) {
  const stayProgram = options.stayProgram || stay.stayProgram || stay.pricingSnapshot?.stayProgram || null;
  if (stayProgram) return "boarding-program";
  if (!ratePlan.isMemberPricing) return "non-member";
  const requestedRole = options.currentDogRole || stay.pricingSnapshot?.currentDogRole || stay.pricingSnapshot?.role || "";
  return requestedRole === "shared-crate-additional" ? "shared-crate-additional" : "primary";
}

function boardingCurrentPricingSnapshotForStay(record = {}, stay = {}, options = {}) {
  const needsBillingStartRefresh = boardingStayPricingNeedsBillingStartRefresh(stay);
  if (!options.forceCurrentPricing && !needsBillingStartRefresh && stay.pricingSnapshot?.total !== undefined) return stay.pricingSnapshot;
  if (!options.forceCurrentPricing && !needsBillingStartRefresh && boardingStayCanUseCurrentPricing(record, stay)) {
    return {
      version: "missing-pricing-snapshot-v1",
      pricingSource: "admin-service-catalog",
      calculatedAt: "",
      pricingErrors: ["Saved pricing snapshot is missing. Staff/admin must recalculate from current Services & Pricing before confirming this request."],
      warning: "Saved pricing snapshot is missing. Staff/admin must recalculate from current Services & Pricing before confirming this request.",
      lineItems: [],
      total: 0,
      groupTotal: 0,
    };
  }
  if (!boardingStayCanUseCurrentPricing(record, stay) && !options.forceCurrentPricing) return null;
  if (!options.forceCurrentPricing && !options.skipFamilyPricing) {
    const familySnapshot = boardingFamilyPricingSnapshotForStay(record, stay);
    if (familySnapshot) return familySnapshot;
  }
  const ratePlan = options.ratePlan || boardingRatePlanForRecord(record);
  const stayProgram = options.stayProgram || stay.stayProgram || stay.pricingSnapshot?.stayProgram || null;
  const sharedCrateRequested = Boolean(options.sharedCrateRequested ?? (stay.pricingSnapshot?.sharedCrateRequested && ratePlan.isMemberPricing));
  return boardingPricingSnapshotForStay(record, stay, {
    ...options,
    ratePlan,
    stayProgram,
    currentDogRole: boardingCurrentDogRoleForStay(stay, ratePlan, { ...options, stayProgram }),
    sharedCrateRequested,
  });
}

function boardingStayInvoiceTotal(record = {}, stay = {}, options = {}) {
  if (options.forceCurrentPricing && options.pricingSnapshot?.total !== undefined) return Number(options.pricingSnapshot.total || 0);
  if (!options.forceCurrentPricing && !boardingStayPricingNeedsBillingStartRefresh(stay) && stay.pricingSnapshot?.total !== undefined) return Number(stay.pricingSnapshot.total || 0);
  const currentSnapshot = options.pricingSnapshot || boardingCurrentPricingSnapshotForStay(record, stay, options);
  if (currentSnapshot) return Number(currentSnapshot.total || 0);
  if (stay.estimatedTotal !== undefined && stay.estimatedTotal !== "") return Number(stay.estimatedTotal || 0);
  if (record.finalInvoiceTotal !== undefined && record.finalInvoiceTotal !== "") return Number(record.finalInvoiceTotal || 0);
  return Number(record.estimatedTotal || 0);
}

function boardingPositiveAmount(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function boardingSnapshotHasFamilyTotal(snapshot = {}) {
  return Number(snapshot.dogCount || 0) > 1
    || arrayValue(snapshot.perDogBreakdown).length > 1
    || Boolean(snapshot.sharedCrateRequested);
}

function boardingEntrySavedFamilyTotal(entry = {}) {
  const recordTotal = boardingPositiveAmount(entry.record?.requestGroupTotal);
  if (recordTotal) return recordTotal;
  const stay = entry.stay || {};
  const snapshot = stay.pricingSnapshot || {};
  if (!boardingSnapshotHasFamilyTotal(snapshot)) return 0;
  return boardingPositiveAmount(stay.groupTotal ?? snapshot.groupTotal);
}

function boardingStayRateRoleChipHtml(stay = {}, options = {}) {
  const role = stay.pricingSnapshot?.currentDogRole || stay.pricingSnapshot?.boardingRateRole || "";
  if (!role || (!options.familyName && role === "primary")) return "";
  if (!["primary", "shared-crate-additional", "boarding-program", "non-member"].includes(role)) return "";
  return \`<span class="status-chip boarding-rate-role-chip">\${escapeHtml(boardingLineRoleLabel(role))}</span>\`;
}

function boardingStayInvoiceSummaryHtml(record = {}, stay = {}, options = {}) {
  const currentSnapshot = (options.forceCurrentPricing || boardingStayPricingNeedsBillingStartRefresh(stay))
    ? (options.pricingSnapshot || boardingCurrentPricingSnapshotForStay(record, stay, { ...options, forceCurrentPricing: true }))
    : null;
  const snapshot = currentSnapshot || stay.pricingSnapshot || {};
  const hasSnapshot = Boolean(snapshot.version || snapshot.lineItems);
  const adjustments = normalizeInvoiceAdjustments(stay.invoiceAdjustments);
  const lines = hasSnapshot ? arrayValue(snapshot.lineItems).filter((line) => Number(line.amount || 0)) : [];
  const customerAdjustments = adjustments.filter((adjustment) => adjustment.visibleToCustomer !== false);
  const adjustmentLines = customerAdjustments
    .map((adjustment) => \`<div class="estimate-line"><span>\${escapeHtml(adjustment.label)}\${adjustment.reason ? \`: \${escapeHtml(adjustment.reason)}\` : ""}</span><span>\${money(invoiceAdjustmentSignedAmount(adjustment))}</span></div>\`)
    .join("");
  const total = currentSnapshot ? Number(currentSnapshot.total || 0) : boardingStayInvoiceTotal(record, stay);
  const pricingWarnings = [...new Set(arrayValue(snapshot.pricingErrors).filter(Boolean))];
  const warningHtml = pricingWarnings.length
    ? \`<article class="operation-availability-card is-warning"><strong>Pricing needs review</strong><ul class="compact-reason-list">\${pricingWarnings.map((warning) => \`<li>\${escapeHtml(warning)}</li>\`).join("")}</ul></article>\`
    : "";
  if (!lines.length && !adjustmentLines && !total && !warningHtml) return "";
  const lineHtml = lines
    .filter((line) => !["charge", "discount"].includes(line.type))
    .map((line) => \`<div class="estimate-line"><span>\${escapeHtml(line.label || "Invoice item")}</span><span>\${line.quantity ? \`\${escapeHtml(line.quantity)} x \${money(line.unitPrice || 0)} = \` : ""}\${money(line.amount || 0)}</span></div>\`)
    .join("");
  const totalLabel = options.final ? "Final total" : "Estimated total";
  return \`<div class="estimate-box stay-invoice-summary">\${warningHtml}\${lineHtml}\${adjustmentLines}<div class="estimate-total"><strong>\${pricingWarnings.length ? "Estimated total unavailable" : totalLabel}</strong><span>\${pricingWarnings.length ? "Needs pricing review" : money(total)}</span></div></div>\`;
}

function boardingStayHasService(stay = {}, label = "") {
  const normalizedLabel = normalizedServiceLookupText(label);
  return arrayValue(stay.requests).some((request) => {
    const requestLabel = normalizedServiceLookupText(boardingStayRequestLabel(request));
    const requestName = normalizedServiceLookupText(boardingServiceTaskDisplayName(request));
    return requestLabel === normalizedLabel || requestName === normalizedLabel || requestLabel.includes(normalizedLabel) || requestName.includes(normalizedLabel);
  });
}

function boardingServiceTaskQuantity(value = {}) {
  const item = value && typeof value === "object" ? value : {};
  if (item.quantity) return Math.max(1, Number(item.quantity || 1));
  const match = String(value || "").match(/\\sx(\\d+)\\b/i);
  return match ? Math.max(1, Number(match[1] || 1)) : 1;
}

var BOARDING_SERVICE_AUTO_TASK_SOURCE = "boardingServiceRequest";

function boardingServiceTaskKey(task = {}) {
  return [
    String(task.serviceId || "").trim().toLowerCase(),
    boardingServiceTaskDisplayName(task).toLowerCase(),
  ].join("|");
}

function boardingServiceTaskNameKey(task = {}) {
  return boardingServiceTaskDisplayName(task).toLowerCase();
}

function boardingServiceTaskNameFromKey(taskKey = "") {
  return String(taskKey || "").split("|").pop() || "";
}

function boardingServiceTaskUnitIndexValue(value = "") {
  const number = Number(value || 0);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

function boardingServiceTaskUnitCount(task = {}) {
  return Math.max(1, Math.floor(Number(task.quantity || boardingServiceTaskQuantity(task) || 1)));
}

function boardingServiceTaskUnitId(task = {}, unitIndex = 1) {
  return [task.id || boardingServiceTaskKey(task) || boardingServiceTaskDisplayName(task), "unit", unitIndex].filter(Boolean).join("::");
}

function boardingServiceTaskUnits(task = {}) {
  const total = boardingServiceTaskUnitCount(task);
  const previousUnits = arrayValue(task.serviceUnits || task.units || task.completionUnits);
  const previousByIndex = new Map(previousUnits.map((unit, index) => [boardingServiceTaskUnitIndexValue(unit.index || unit.unitIndex || index + 1) || index + 1, unit]));
  const allPreviouslyComplete = task.status === "completed" && !previousUnits.length;
  const units = [];
  for (let index = 1; index <= total; index += 1) {
    const previous = previousByIndex.get(index) || {};
    const completed = previous.status === "completed" || previous.completed === true || allPreviouslyComplete;
    units.push({
      ...previous,
      id: previous.id || boardingServiceTaskUnitId(task, index),
      index,
      unitIndex: index,
      unitCount: total,
      label: previous.label || (boardingServiceTaskDisplayName(task) + (total > 1 ? " " + index + " of " + total : "")),
      status: completed ? "completed" : previous.status || "pending",
      completedAt: completed ? previous.completedAt || task.completedAt || "" : previous.completedAt || "",
      completedBy: completed ? previous.completedBy || task.completedBy || "" : previous.completedBy || "",
      completedByEmail: completed ? previous.completedByEmail || task.completedByEmail || "" : previous.completedByEmail || "",
      completedSource: completed ? previous.completedSource || task.completedSource || "" : previous.completedSource || "",
      scheduledCareTaskId: previous.scheduledCareTaskId || "",
    });
  }
  return units;
}

function boardingServiceTaskWithUnitProgress(task = {}) {
  const units = boardingServiceTaskUnits(task);
  const completedUnits = units.filter((unit) => unit.status === "completed");
  const allComplete = Boolean(units.length && completedUnits.length === units.length);
  return {
    ...task,
    serviceUnits: units,
    completedUnitCount: completedUnits.length,
    remainingUnitCount: Math.max(0, units.length - completedUnits.length),
    status: allComplete ? "completed" : "pending",
    completedAt: allComplete ? task.completedAt || completedUnits[completedUnits.length - 1]?.completedAt || "" : task.completedAt || "",
    completedBy: allComplete ? task.completedBy || completedUnits[completedUnits.length - 1]?.completedBy || "" : task.completedBy || "",
    completedByEmail: allComplete ? task.completedByEmail || completedUnits[completedUnits.length - 1]?.completedByEmail || "" : task.completedByEmail || "",
  };
}

function boardingServiceTaskIsBath(task = {}) {
  const text = normalizedServiceLookupText(boardingServiceTaskDisplayName(task));
  return text === "bath" || text.includes(" bath") || text.startsWith("bath") || text.includes("premium bath");
}

function boardingServiceTaskIsTreadmill(task = {}) {
  return normalizedServiceLookupText(boardingServiceTaskDisplayName(task)).includes("treadmill");
}

function boardingServiceTaskIsBootcampTraining(task = {}) {
  return task.bootcampTraining === true || task.autoGeneratedFromStayProgram === "bootcamp-training";
}

function boardingServicePickupIsAfternoon(stay = {}) {
  const pickup = new Date(stay.pickupTime || stay.scheduledPickupTime || stay.requestedPickupTime || 0);
  return !Number.isNaN(pickup.getTime()) && pickup.getHours() >= 12;
}

function boardingServiceApprovedDate(record = {}, stay = {}) {
  return dateOnly(stay.approvedAt || record.approvedAt || stay.updatedAt || record.updatedAt || stay.createdAt || record.submittedAt || todayDate()) || todayDate();
}

function boardingServiceEligibleDates(record = {}, stay = {}) {
  if (isServiceRequestStay(record, stay)) return [boardingServiceApprovedDate(record, stay)];
  const start = dateOnly(stay.dropoffTime || stay.scheduledDropoffTime || stay.requestedDropoffTime);
  const pickupDate = dateOnly(stay.pickupTime || stay.scheduledPickupTime || stay.requestedPickupTime);
  if (!start) return [boardingServiceApprovedDate(record, stay)];
  const lastDate = pickupDate
    ? boardingServicePickupIsAfternoon(stay) ? pickupDate : addDays(pickupDate, -1)
    : start;
  const dates = [];
  let current = start;
  while (current && current <= lastDate && dates.length < 90) {
    dates.push(current);
    current = addDays(current, 1);
  }
  return dates.length ? dates : [start];
}

function boardingServiceBathScheduleDate(record = {}, stay = {}) {
  if (isServiceRequestStay(record, stay)) return boardingServiceApprovedDate(record, stay);
  const pickupDate = dateOnly(stay.pickupTime || stay.scheduledPickupTime || stay.requestedPickupTime);
  if (!pickupDate) return boardingServiceEligibleDates(record, stay).slice(-1)[0] || boardingServiceApprovedDate(record, stay);
  return boardingServicePickupIsAfternoon(stay) ? pickupDate : addDays(pickupDate, -1);
}

function boardingServiceTaskUnitSourceKey(record = {}, stay = {}, task = {}, unitIndex = 1) {
  const stayIdentity = stay.requestCode || boardingStayRequestCode(record, stay) || stay.id || boardingStayMergeKeyForRecord(record, stay);
  const serviceIdentity = task.id || boardingServiceTaskKey(task) || boardingServiceTaskDisplayName(task);
  return [BOARDING_SERVICE_AUTO_TASK_SOURCE, record.id || "", stayIdentity || "", serviceIdentity || "", boardingServiceTaskUnitIndexValue(unitIndex) || 1].join(":");
}

function boardingServiceTaskStackingAlert(record = {}, stay = {}, task = {}) {
  if (isServiceRequestStay(record, stay)) return "";
  const quantity = boardingServiceTaskUnitCount(task);
  const eligibleDays = boardingServiceEligibleDates(record, stay).length;
  return quantity > eligibleDays
    ? quantity + " " + boardingServiceTaskDisplayName(task) + " units are scheduled across " + eligibleDays + " eligible stay day" + (eligibleDays === 1 ? "" : "s") + ", so some repeat on the same day."
    : "";
}

function boardingStayProgramCandidates(record = {}, stay = {}) {
  const snapshot = stay.pricingSnapshot || {};
  const candidates = [];
  [stay.stayProgram, snapshot.stayProgram].forEach((program) => {
    if (program && typeof program === "object") candidates.push(program);
  });
  const serviceIds = [
    stay.stayProgramId,
    snapshot.stayProgramId,
    stay.boardingRateServiceId,
    snapshot.boardingRateServiceId,
  ].filter(Boolean);
  if (serviceIds.length) {
    readRecords("service").forEach((service) => {
      if (serviceIds.includes(service.id)) candidates.push(boardingPricingCatalogServiceRecord(service));
    });
  }
  arrayValue(snapshot.lineItems).filter((line) => line.type === "boarding-program").forEach((line) => candidates.push({
    id: line.serviceId || line.id || stay.stayProgramId || snapshot.stayProgramId || "",
    serviceId: line.serviceId || line.id || stay.stayProgramId || snapshot.stayProgramId || "",
    serviceName: line.stayProgramName || line.label || stay.stayProgramName || snapshot.stayProgramName || "Boarding program",
    name: line.stayProgramName || line.label || "",
    unitPrice: line.unitPrice || line.rate || "",
    boardingRateType: "boarding-program",
    replacesStandardBoarding: true,
  }));
  if (stay.stayProgramName || snapshot.stayProgramName) {
    candidates.push({
      id: stay.stayProgramId || snapshot.stayProgramId || "",
      serviceId: stay.stayProgramId || snapshot.stayProgramId || "",
      serviceName: stay.stayProgramName || snapshot.stayProgramName || "",
      name: stay.stayProgramName || snapshot.stayProgramName || "",
      boardingRateType: "boarding-program",
      replacesStandardBoarding: true,
    });
  }
  return candidates.filter((program) => program && typeof program === "object");
}

function boardingStayBootcampTrainingProgram(record = {}, stay = {}) {
  if (isServiceRequestStay(record, stay)) return null;
  return boardingStayProgramCandidates(record, stay).find((program) => {
    const rateType = normalizedBoardingRateType(program.boardingRateType || program.stayRateBehavior || program.boardingProgramType || "");
    const isBoardingProgram = rateType === "boarding-program" || program.includesBoardingAccommodation === true || program.replacesStandardBoarding === true;
    if (!isBoardingProgram) return false;
    const text = normalizedServiceLookupText([
      program.serviceName,
      program.name,
      program.label,
      program.itemDescription,
      program.description,
      program.pricingNotes,
    ].filter(Boolean).join(" "));
    return text.includes("bootcamp") || text.includes("boot camp") || text.includes("board and train") || text.includes("board train") || text.includes("board & train") || text.includes("training");
  }) || null;
}

function boardingStayBootcampTrainingTaskSource(record = {}, stay = {}) {
  const program = boardingStayBootcampTrainingProgram(record, stay);
  if (!program) return null;
  const eligibleDates = boardingServiceEligibleDates(record, stay);
  const quantity = eligibleDates.length;
  if (!quantity) return null;
  const programId = program.serviceId || program.id || stay.stayProgramId || stay.pricingSnapshot?.stayProgramId || "bootcamp";
  const programName = program.serviceName || program.name || stay.stayProgramName || stay.pricingSnapshot?.stayProgramName || "Bootcamp";
  return {
    id: "bootcamp-training-" + programId,
    serviceId: "bootcamp-training-" + programId,
    serviceName: "Bootcamp Training",
    label: "Bootcamp Training x" + quantity,
    quantity,
    unit: "daily session",
    unitPrice: 0,
    durationMinutes: 30,
    defaultStartTime: "09:00",
    source: "boarding-program",
    sourceIndex: 0,
    requestedAt: stay.approvedAt || stay.updatedAt || record.updatedAt || record.submittedAt || "",
    bootcampTraining: true,
    autoGeneratedFromStayProgram: "bootcamp-training",
    stayProgramId: programId,
    stayProgramName: programName,
  };
}

function boardingServiceTaskSources(record = {}, stay = {}) {
  const sources = [];
  const seenServiceKeys = new Set();
  const pricingOptions = { user: boardingPricingUserForRecord(record), preferCatalogPricing: true };
  const requestedSource = arrayValue(stay.requests);
  requestedSource.forEach((item, index) => {
    const service = item && typeof item === "object" ? item : {};
    const serviceName = boardingServiceTaskDisplayName(item);
    const quantity = boardingServiceTaskQuantity(item);
    const source = {
      id: service.id || service.serviceId || "",
      serviceId: service.id || service.serviceId || "",
      serviceName,
      label: \`\${serviceName}\${quantity > 1 ? \` x\${quantity}\` : ""}\`,
      quantity,
      unit: service.unit || boardingStayRequestUnit(item, pricingOptions),
      unitPrice: boardingStayRequestUnitPrice(item, pricingOptions),
      source: "requested",
      sourceIndex: index,
      requestedAt: stay.createdAt || record.submittedAt || "",
    };
    const key = boardingServiceTaskNameKey(source);
    if (seenServiceKeys.has(key)) return;
    seenServiceKeys.add(key);
    sources.push(source);
  });
  arrayValue(stay.checkIn?.addedServices).forEach((item, index) => {
    const service = item && typeof item === "object" ? item : {};
    const serviceName = boardingServiceTaskDisplayName(item);
    const quantity = boardingServiceTaskQuantity(service);
    const source = {
      id: service.id || service.serviceId || "",
      serviceId: service.id || service.serviceId || "",
      serviceName,
      label: \`\${serviceName}\${quantity > 1 ? \` x\${quantity}\` : ""}\`,
      quantity,
      unit: service.unit || boardingStayRequestUnit(service, pricingOptions),
      unitPrice: boardingStayRequestUnitPrice(service, pricingOptions),
      source: "check-in",
      sourceIndex: index,
      requestedAt: stay.checkIn?.verifiedAt || stay.updatedAt || "",
    };
    const key = boardingServiceTaskNameKey(source);
    if (seenServiceKeys.has(key)) return;
    seenServiceKeys.add(key);
    sources.push(source);
  });
  const bootcampTrainingSource = boardingStayBootcampTrainingTaskSource(record, stay);
  if (bootcampTrainingSource) {
    const key = boardingServiceTaskNameKey(bootcampTrainingSource);
    if (!seenServiceKeys.has(key)) {
      seenServiceKeys.add(key);
      sources.push(bootcampTrainingSource);
    }
  }
  return sources;
}

function boardingServiceTaskStableId(record = {}, stay = {}, source = {}) {
  const stayIdentity = stay.requestCode || boardingStayRequestCode(record, stay) || stay.id || boardingStayMergeKeyForRecord(record, stay);
  return stableLegacyId("stayServiceTask", stayIdentity, boardingServiceTaskKey(source));
}

function boardingStayServiceTasks(record = {}, stay = {}) {
  if (!stay?.id) return [];
  const existing = arrayValue(stay.serviceTasks);
  const existingTasks = existing.filter((task) => task && typeof task === "object");
  const existingById = new Map(existingTasks.filter((task) => task.id).map((task) => [task.id, task]));
  const existingByKey = new Map(existingTasks.map((task) => [boardingServiceTaskKey(task), task]));
  const existingByName = new Map(existingTasks.map((task) => [boardingServiceTaskNameKey(task), task]));
  return boardingServiceTaskSources(record, stay).map((source) => {
    const id = boardingServiceTaskStableId(record, stay, source);
    const sourceKey = boardingServiceTaskKey(source);
    const previous = existingById.get(id) || existingById.get(source.id) || existingByKey.get(sourceKey) || existingByName.get(boardingServiceTaskNameKey(source)) || {};
    return boardingServiceTaskWithUnitProgress({
      ...previous,
      ...source,
      id,
      status: previous.status || "pending",
      completedAt: previous.completedAt || "",
      completedBy: previous.completedBy || "",
      completedByEmail: previous.completedByEmail || "",
      updatedAt: previous.updatedAt || source.requestedAt || stay.updatedAt || "",
    });
  });
}

function boardingStayServiceStats(record = {}, stay = {}) {
  const tasks = boardingStayServiceTasks(record, stay);
  const completedTasks = tasks.filter((task) => task.status === "completed");
  const incompleteTasks = tasks.filter((task) => task.status !== "completed");
  return {
    tasks,
    total: tasks.length,
    completedTasks,
    incompleteTasks,
    completed: Boolean(tasks.length && incompleteTasks.length === 0),
  };
}

function boardingStayServiceDueInfo(record = {}, stay = {}, now = new Date()) {
  const stats = boardingStayServiceStats(record, stay);
  if (!stats.total) return null;
  if (stats.completed) return { label: "Services Completed", className: "is-service-complete", hoursRemaining: null, stats };
  const status = boardingStayDisplayStatus(record, stay);
  if (status === "Checked Out") return { label: "Services Incomplete", className: "is-service-overdue", hoursRemaining: null, stats };
  if (status === "Cancelled") return null;
  const pickup = new Date(stay.pickupTime || 0);
  if (Number.isNaN(pickup.getTime())) return { label: "Services Pending", className: "is-service-pending", hoursRemaining: null, stats };
  const hoursRemaining = Math.ceil((pickup - now) / 3600000);
  if (hoursRemaining <= 0) return { label: "Service Overdue", className: "is-service-overdue", hoursRemaining, stats };
  if (hoursRemaining <= BOARDING_SERVICE_DUE_WINDOW_HOURS) {
    return { label: \`Service Due [\${hoursRemaining}-hour]\`, className: "is-service-due", hoursRemaining, stats };
  }
  return { label: "Services Pending", className: "is-service-pending", hoursRemaining, stats };
}

function boardingStayServiceFlagHtml(record = {}, stay = {}) {
  const dueInfo = boardingStayServiceDueInfo(record, stay);
  return dueInfo ? statusChipHtml(dueInfo.label, \`boarding-service-chip \${dueInfo.className}\`) : "";
}

function boardingStayServiceTaskListHtml(record = {}, stay = {}, options = {}) {
  const stats = boardingStayServiceStats(record, stay);
  if (!stats.total) return "";
  const stayAttrs = boardingStayDataAttrs(record, stay);
  return \`<div class="boarding-service-task-list">
    <strong>Stay services</strong>
    \${stats.tasks.map((task) => {
      const units = boardingServiceTaskUnits(task);
      const complete = task.status === "completed";
      const progress = (task.completedUnitCount || 0) + " of " + units.length + " completed";
      const meta = complete ? "Completed " + (formatDateTime(task.completedAt) || "") : progress;
      const taskKey = boardingServiceTaskKey(task);
      const alert = boardingServiceTaskStackingAlert(record, stay, task);
      const unitRows = units.map((unit) => {
        const unitComplete = unit.status === "completed";
        const unitMeta = unitComplete
          ? "Completed " + (formatDateTime(unit.completedAt) || "") + (unit.completedBy ? " by " + unit.completedBy : "")
          : "Needs completion before pickup";
        const action = !unitComplete && options.actions
          ? \`<button type="button" class="secondary-button" data-action="complete-stay-service" data-dog-id="\${escapeHtml(record.id || "")}"\${stayAttrs} data-task-id="\${escapeHtml(task.id)}" data-task-key="\${escapeHtml(taskKey)}" data-unit-index="\${escapeHtml(unit.index)}">Mark Done</button>\`
          : "";
        return \`<div class="boarding-service-unit-row \${unitComplete ? "is-service-complete" : ""}">
          <div><strong>\${escapeHtml(unit.label || task.serviceName || "Service")}</strong><span>\${escapeHtml(unitMeta)}</span></div>
          <div class="record-actions">\${unitComplete ? statusChipHtml("Done", "boarding-service-chip is-service-complete") : statusChipHtml("Open", "boarding-service-chip is-service-due")}\${action}</div>
        </div>\`;
      }).join("");
      return \`<article class="record-card compact-record-card boarding-service-task-card \${complete ? "is-service-complete" : ""}">
        <div>
          <strong>\${escapeHtml(task.label || task.serviceName || "Service")}</strong>
          <span>\${escapeHtml(meta)}</span>
          \${alert ? \`<p class="boarding-service-stack-alert">\${escapeHtml(alert)}</p>\` : ""}
        </div>
        <div class="boarding-service-unit-list">\${unitRows}</div>
      </article>\`;
    }).join("")}
  </div>\`;
}

function boardingStayWithServiceTaskStatus(record = {}, stay = {}, taskId = "", status = "completed", targetTask = {}, targetTaskKey = "", unitIndex = "", options = {}) {
  if (!stay?.id || (!taskId && !targetTaskKey)) return stay;
  const timestamp = options.timestamp || new Date().toISOString();
  const staff = options.staff || staffIdentity();
  const requestedUnitIndex = boardingServiceTaskUnitIndexValue(unitIndex);
  const targetKey = targetTaskKey || (targetTask && Object.keys(targetTask).length ? boardingServiceTaskKey(targetTask) : "");
  const targetNameKey = targetTask && Object.keys(targetTask).length ? boardingServiceTaskNameKey(targetTask) : boardingServiceTaskNameFromKey(targetKey);
  const tasks = boardingStayServiceTasks(record, stay).map((task) => {
    const sameTask = task.id === taskId
      || (targetKey && boardingServiceTaskKey(task) === targetKey)
      || (targetNameKey && boardingServiceTaskNameKey(task) === targetNameKey);
    if (!sameTask) return task;
    const units = boardingServiceTaskUnits(task);
    const targetUnitIndex = requestedUnitIndex || units.find((unit) => unit.status !== "completed")?.index || units[0]?.index || 1;
    const nextUnits = units.map((unit) => {
      if (unit.index !== targetUnitIndex) return unit;
      return {
        ...unit,
        status,
        completedAt: status === "completed" ? timestamp : "",
        completedBy: status === "completed" ? staff.name : "",
        completedByEmail: status === "completed" ? staff.email : "",
        completedSource: status === "completed" ? options.source || "boardingDogModal" : "",
        scheduledCareTaskId: options.scheduledCareTaskId || unit.scheduledCareTaskId || "",
      };
    });
    const completedUnits = nextUnits.filter((unit) => unit.status === "completed");
    const allComplete = Boolean(nextUnits.length && completedUnits.length === nextUnits.length);
    return {
      ...task,
      serviceUnits: nextUnits,
      completedUnitCount: completedUnits.length,
      remainingUnitCount: Math.max(0, nextUnits.length - completedUnits.length),
      status: allComplete ? "completed" : "pending",
      completedAt: allComplete ? timestamp : "",
      completedBy: allComplete ? staff.name : "",
      completedByEmail: allComplete ? staff.email : "",
      lastCompletedUnitIndex: status === "completed" ? targetUnitIndex : task.lastCompletedUnitIndex || "",
      updatedAt: timestamp,
    };
  });
  return {
    ...stay,
    serviceTasks: tasks,
    updatedAt: timestamp,
  };
}

function boardingServiceTaskUnitForCompletion(task = {}, unitIndex = "") {
  const units = boardingServiceTaskUnits(task);
  const requestedUnitIndex = boardingServiceTaskUnitIndexValue(unitIndex);
  return units.find((unit) => unit.index === requestedUnitIndex)
    || units.find((unit) => unit.status !== "completed")
    || units[0]
    || {
      id: boardingServiceTaskUnitId(task, 1),
      index: 1,
      unitIndex: 1,
      unitCount: 1,
      label: boardingServiceTaskDisplayName(task),
      status: "pending",
    };
}

function boardingServiceCompletionLogPayload(record = {}, stay = {}, task = {}, unit = {}, options = {}) {
  const timestamp = options.timestamp || new Date().toISOString();
  const staff = options.staff || staffIdentity();
  const requestCode = boardingStayRequestCode(record, stay);
  const serviceName = boardingServiceTaskDisplayName(task);
  const unitLabel = unit.label || serviceName;
  return {
    id: options.careLogId || uid("boardingCareLog"),
    source: options.source || "boardingDogModal",
    scheduledCareTaskId: options.scheduledCareTaskId || unit.scheduledCareTaskId || "",
    dogType: "boardingDog",
    dogId: record.id || "",
    dogName: record.dogName || "Boarding Dog",
    careType: serviceName,
    minutes: options.minutes || task.durationMinutes || "",
    note: [unitLabel + " completed.", options.note || ""].filter(Boolean).join(" "),
    date: options.date || todayDate(),
    loggedAt: timestamp,
    completedBy: staff.name,
    completedEmail: staff.email,
    completedByEmail: staff.email,
    stayId: stay.id || "",
    requestCode,
    serviceTaskId: task.id || "",
    serviceTaskKey: boardingServiceTaskKey(task),
    serviceUnitId: unit.id || boardingServiceTaskUnitId(task, unit.index || 1),
    serviceUnitIndex: unit.index || unit.unitIndex || 1,
    serviceUnitCount: unit.unitCount || boardingServiceTaskUnitCount(task),
  };
}

function boardingServiceCareLogsWithCompletion(record = {}, log = {}) {
  const unitIndex = Number(log.serviceUnitIndex || 0);
  return [
    log,
    ...arrayValue(record.careLogs).filter((item) => {
      if (item.id === log.id) return false;
      const sameServiceUnit = log.serviceTaskId &&
        item.serviceTaskId === log.serviceTaskId &&
        Number(item.serviceUnitIndex || 0) === unitIndex &&
        String(item.requestCode || "") === String(log.requestCode || "") &&
        item.source === log.source;
      return !sameServiceUnit;
    }),
  ];
}

async function retireScheduledCareTasksForBoardingServiceUnit(record = {}, stay = {}, task = {}, unitIndex = "", options = {}) {
  if (options.retireLinkedSchedule === false) return false;
  const unit = boardingServiceTaskUnitForCompletion(task, unitIndex);
  const sourceKey = boardingServiceTaskUnitSourceKey(record, stay, task, unit.index || unitIndex || 1);
  const now = options.timestamp || new Date().toISOString();
  const staff = options.staff || staffIdentity();
  const activeTasks = readRecords("scheduledCareTask").filter((scheduledTask) => {
    if (!scheduledTask || scheduledTask.removed || scheduledTask.status === "Completed" || scheduledTask.status === "Cancelled") return false;
    if (scheduledTask.sourceKey && scheduledTask.sourceKey === sourceKey) return true;
    const sameTask = scheduledTask.boardingServiceTaskId && scheduledTask.boardingServiceTaskId === task.id;
    const sameKey = scheduledTask.boardingServiceTaskKey && scheduledTask.boardingServiceTaskKey === boardingServiceTaskKey(task);
    const sameUnit = Number(scheduledTask.boardingServiceUnitIndex || 0) === Number(unit.index || 0);
    const sameStay = (!scheduledTask.boardingStayId || scheduledTask.boardingStayId === stay.id) &&
      (!scheduledTask.boardingRequestCode || scheduledTask.boardingRequestCode === boardingStayRequestCode(record, stay));
    return sameStay && sameUnit && (sameTask || sameKey);
  });
  if (!activeTasks.length) return false;
  const retired = activeTasks.map((scheduledTask) => upsertRecord("scheduledCareTask", {
    ...scheduledTask,
    removed: true,
    removedAt: now,
    removedBy: staff.name || "Staff",
    removedReason: "boarding service unit completed",
    retiredByBoardingServiceCompletion: true,
    updatedAt: now,
  }));
  if (typeof sendPayloadBatch === "function") {
    await sendPayloadBatch(retired);
  } else {
    for (const payload of retired) await sendPayload(payload);
  }
  return true;
}

async function updateBoardingStayServiceTaskStatus(record = {}, reference = {}, taskId = "", status = "completed", taskKey = "", unitIndex = "", options = {}) {
  const displayRecord = boardingDogRecordForDisplay(record.id || reference.dogId || "") || record;
  const targetStay = boardingStayByReference(displayRecord, reference);
  if (!displayRecord?.id || !targetStay?.id || (!taskId && !taskKey)) {
    showToast("That stay service could not be found.");
    return null;
  }
  const targetRequestCode = boardingStayRequestCode(displayRecord, targetStay);
  const targetTask = boardingStayServiceTasks(displayRecord, targetStay).find((task) => task.id === taskId || (taskKey && boardingServiceTaskKey(task) === taskKey)) || {};
  const targetTaskKey = taskKey || (targetTask && Object.keys(targetTask).length ? boardingServiceTaskKey(targetTask) : "");
  if (!targetTaskKey && !targetTask?.id) {
    showToast("That stay service could not be found.");
    return null;
  }
  const timestamp = options.timestamp || new Date().toISOString();
  const staff = options.staff || staffIdentity();
  const targetUnit = boardingServiceTaskUnitForCompletion(targetTask, unitIndex);
  const completedAlready = status === "completed" && targetUnit.status === "completed";
  const shouldCreateCareLog = status === "completed" && options.createCareLog !== false && !completedAlready;
  const completionCareLogId = shouldCreateCareLog ? options.careLogId || uid("boardingCareLog") : "";
  const statusOptions = {
    ...options,
    timestamp,
    staff,
  };
  const explicitStayIds = new Set([
    reference.stayId,
    reference.id,
    ...boardingStaySourceIds(targetStay),
  ].filter(Boolean).map(String));
  const explicitRequestCode = String(reference.requestCode || targetStay.requestCode || targetStay.requestId || targetStay.reservationId || "").trim();
  const matchingStayIndexes = (rawRecord = {}) => {
    const stays = arrayValue(rawRecord.stays);
    const indexed = stays.map((stay, index) => ({ stay, index }));
    let matches = indexed.filter(({ stay }) => {
      if (explicitStayIds.size && boardingStaySourceIds(stay).some((id) => explicitStayIds.has(id))) return true;
      if (explicitRequestCode && boardingStayRequestCode(rawRecord, stay) === explicitRequestCode) return true;
      return false;
    });
    if (!matches.length && explicitStayIds.size) {
      matches = indexed.filter(({ stay }) => boardingStaySharesExplicitIdentity(stay, targetStay));
    }
    if (!matches.length) {
      const identityMatches = indexed.filter(({ stay }) => boardingStayMatchesIdentity(stay, targetStay));
      if (identityMatches.length === 1) matches = identityMatches;
    }
    return matches.map((match) => match.index);
  };
  const sourceRecordIds = displayRecord.sourceRecordIds?.length ? displayRecord.sourceRecordIds : [displayRecord.id];
  const rawRecords = readRecords("boardingDog")
    .filter((item) => !item.removed && (sourceRecordIds.includes(item.id) || item.id === displayRecord.id));
  const savedRecords = [];
  for (const rawRecord of rawRecords.length ? rawRecords : [displayRecord]) {
    const stays = arrayValue(rawRecord.stays);
    const matchIndexes = new Set(matchingStayIndexes(rawRecord));
    if (!matchIndexes.size) continue;
    const nextStays = stays.map((stay, index) => (matchIndexes.has(index)
      ? boardingStayWithServiceTaskStatus(displayRecord, { ...stay, requestCode: stay.requestCode || targetRequestCode }, taskId, status, targetTask, targetTaskKey, targetUnit.index || unitIndex, statusOptions)
      : stay));
    const completionLog = shouldCreateCareLog
      ? boardingServiceCompletionLogPayload(rawRecord, { ...targetStay, requestCode: targetStay.requestCode || targetRequestCode }, targetTask, targetUnit, {
        ...statusOptions,
        careLogId: completionCareLogId,
      })
      : null;
    const updated = upsertRecord("boardingDog", {
      ...rawRecord,
      stays: nextStays,
      ...(completionLog ? { careLogs: boardingServiceCareLogsWithCompletion(rawRecord, completionLog) } : {}),
      updatedAt: new Date().toISOString(),
    });
    await sendPayload(updated);
    savedRecords.push(updated);
  }
  if (!savedRecords.length) {
    showToast("That stay service could not be matched to this stay.");
    return null;
  }
  const latest = boardingDogRecordForDisplay(displayRecord.id) || savedRecords[0] || displayRecord;
  if (status === "completed" && !completedAlready) {
    await retireScheduledCareTasksForBoardingServiceUnit(displayRecord, targetStay, targetTask, targetUnit.index || unitIndex, statusOptions);
  }
  if (options.syncScheduler !== false && typeof syncBoardingServiceTasksForRecord === "function") {
    await syncBoardingServiceTasksForRecord(latest, { render: false });
  }
  if ($("#boardingDogForm")?.elements.id.value === latest.id || sourceRecordIds.includes($("#boardingDogForm")?.elements.id.value)) {
    renderBoardingStays(latest);
    renderBoardingCustomerUpdates(latest);
    renderBoardingHistory(latest);
  }
  renderBoardingDogs();
  renderBoardingRequests();
  renderCustomerRequests();
  renderDashboard();
  if (typeof renderTaskScheduler === "function" && activePageId() === "taskSchedulerPage") renderTaskScheduler();
  showToast(status === "completed" ? "Stay service marked done." : "Stay service updated.");
  return latest;
}

function boardingStayDetailCardHtml(record = {}, stay = {}, options = {}) {
  const isCustomer = Boolean(options.customer);
  const statusChip = isCustomer ? customerRequestStayStatusChipHtml(record, stay) : boardingStayStatusChipHtml(record, stay);
  const requestCode = stay.id ? (isCustomer ? customerStayIdChipHtml(record, stay) : boardingStayRequestCodeChipHtml(record, stay)) : "";
  const invoiceSummary = options.hideInvoiceSummary ? "" : boardingStayInvoiceSummaryHtml(record, stay);
  return \`<article class="record-card \${options.compact ? "compact-record-card" : ""}">
    <strong>\${escapeHtml(stayScheduleRangeLabel(record, stay) || "Requested stay")}</strong>
    <div class="chip-row">\${requestCode}\${statusChip}\${boardingStayServiceFlagHtml(record, stay)}</div>
    <p>\${escapeHtml(boardingStayServicesText(stay, { customerFacing: isCustomer, user: boardingPricingUserForRecord(record), preferCatalogPricing: true }))}</p>
    \${options.showServiceTasks ? boardingStayServiceTaskListHtml(record, stay, { actions: options.serviceActions }) : ""}
    \${stay.bathPlan ? \`<p>\${escapeHtml(stay.bathPlan)}</p>\` : ""}
    \${boardingStayBelongingsLineHtml(stay)}
    \${stay.stayNotes ? \`<p>\${escapeHtml(stay.stayNotes)}</p>\` : ""}
    \${boardingCancellationAuditHtml(record, stay, { customer: isCustomer })}
    \${boardingCancellationReasonHtml(record, stay, { customer: isCustomer })}
    \${boardingDeclineNoteHtml(record, stay)}
    \${invoiceSummary}
  </article>\`;
}

function boardingDogSummaryHeaderHtml(record = {}, stay = {}) {
  const schedule = boardingScheduleText(record, stay);
  const kennel = boardingKennelLocationLabel(record, stay);
  const owner = record.ownerName || "No owner saved";
  const emergency = [record.emergencyName, record.emergencyPhone].filter(Boolean).join(" | ");
  return \`<article class="boarding-detail-summary">
    <div>
      <strong>\${escapeHtml(record.dogName || "Boarding dog")}</strong>
      <span>\${escapeHtml(schedule || "No stay schedule saved")}</span>
    </div>
    <div class="boarding-detail-summary-grid">
      <span><strong>Owner</strong>\${escapeHtml(owner)}\${record.ownerPhone ? \` \${phoneLinkHtml(record.ownerPhone)}\` : ""}</span>
      <span><strong>Kennel</strong>\${escapeHtml(kennel || "Not assigned")}</span>
      <span><strong>Emergency</strong>\${emergency ? escapeHtml(record.emergencyName || "") + (record.emergencyPhone ? \` \${phoneLinkHtml(record.emergencyPhone)}\` : "") : "Not saved"}</span>
    </div>
  </article>\`;
}

function boardingCarePacketValue(record = {}, snapshot = {}, key = "") {
  return snapshot[key] || record[key] || "";
}

function boardingCarePacketRow(label = "", value = "") {
  return \`<span><strong>\${escapeHtml(label)}</strong>\${escapeHtml(value || "Not saved")}</span>\`;
}

function boardingCarePacketHtml(record = {}, stay = {}) {
  const snapshot = stay.requestProfileSnapshot || record.requestProfileSnapshot || {};
  const merged = { ...record, ...snapshot };
  const pricingSnapshot = boardingCurrentPricingSnapshotForStay(record, stay) || stay.pricingSnapshot || {};
  const vaccineRows = [
    ["DHPP", boardingCarePacketValue(record, snapshot, "dhppDate")],
    ["Rabies", boardingCarePacketValue(record, snapshot, "rabiesDate")],
    ["Bordetella", boardingCarePacketValue(record, snapshot, "bordetellaDate")],
    ["Heartworm", boardingCarePacketValue(record, snapshot, "heartwormDate")],
  ];
  const careRows = [
    ["Breed", boardingCarePacketValue(record, snapshot, "breedDescription")],
    ["Sex", boardingCarePacketValue(record, snapshot, "sex")],
    ["Spay/neuter", boardingCarePacketValue(record, snapshot, "spayNeuterStatus")],
    ["Date of birth", boardingCarePacketValue(record, snapshot, "dateOfBirth")],
    ["Age", snapshot.age || (typeof dogAgeText === "function" ? dogAgeText(merged) : "")],
    ["Vet", boardingCarePacketValue(record, snapshot, "vetInfo")],
    ["Emergency contact", [boardingCarePacketValue(record, snapshot, "emergencyName"), boardingCarePacketValue(record, snapshot, "emergencyPhone"), boardingCarePacketValue(record, snapshot, "emergencyRelation")].filter(Boolean).join(" | ")],
    ["Feeding", boardingCarePacketValue(record, snapshot, "foodInstructions")],
    ["Care notes", boardingCarePacketValue(record, snapshot, "specialCare")],
    ["Medications", boardingCarePacketValue(record, snapshot, "medicationInstructions")],
  ];
  const fileCount = arrayValue(snapshot.vaccinationRecords || record.vaccinationRecords).length + (boardingCarePacketValue(record, snapshot, "vaccinationFiles") ? 1 : 0);
  const pricingErrors = arrayValue(pricingSnapshot.pricingErrors).join(" ");
  return \`<section class="popup-record-section boarding-care-packet">
    <h3>Customer Care Packet</h3>
    <div class="boarding-detail-summary-grid">
      \${careRows.map(([label, value]) => boardingCarePacketRow(label, value)).join("")}
      \${vaccineRows.map(([label, value]) => boardingCarePacketRow(label, value)).join("")}
      \${boardingCarePacketRow("Uploaded health files", fileCount ? \`\${fileCount} file\${fileCount === 1 ? "" : "s"} saved\` : "")}
      \${boardingCarePacketRow("Selected services", boardingStayServicesText(stay, { user: boardingPricingUserForRecord(record), preferCatalogPricing: true }))}
      \${boardingCarePacketRow("Pricing scope", pricingSnapshot.customerPricingScope || "")}
      \${boardingCarePacketRow("Group total", pricingSnapshot.groupTotal !== undefined ? money(pricingSnapshot.groupTotal) : "")}
    </div>
    \${pricingErrors ? \`<article class="operation-availability-card is-warning"><strong>Pricing warning</strong><p>\${escapeHtml(pricingErrors)}</p></article>\` : ""}
  </section>\`;
}

function boardingDogDetailHtml(record, stayId = "") {
  if (currentRole() === "customer") return customerBoardingDogDetailHtml(record, stayId);
  const displayRecord = boardingDogWithStayStatus(record || {});
  const selectedStay = boardingStayByReference(displayRecord, stayId) || boardingPrimaryStay(displayRecord) || displayRecord.stays?.[0] || {};
  const selectedStayHtml = selectedStay.id ? \`<h3>Selected Stay</h3>\${boardingStayDetailCardHtml(displayRecord, selectedStay)}\` : "";
  const stays = (displayRecord.stays || [])
    .map((stay) => boardingStayDetailCardHtml(displayRecord, stay, { compact: true }))
    .join("");
  const customerUpdates = (displayRecord.customerUpdates || [])
    .map((update) => \`<article class="record-card compact-record-card"><strong>\${escapeHtml(formatDateTime(update.createdAt || update.submittedAt) || "Customer update")}</strong><span>\${escapeHtml([update.byName || "Staff", update.requestCode ? \`Stay ID: \${update.requestCode}\` : ""].filter(Boolean).join(" | "))}</span><p>\${escapeHtml(update.note || "")}</p><div class="record-actions">\${customerUpdateMediaHtml(update)}</div></article>\`)
    .join("");
  const history = (displayRecord.statusHistory || [])
    .map((entry) => \`<article class="record-card compact-record-card"><strong>\${escapeHtml(entry.from || entry.fromStatus || "Unknown")} -> \${escapeHtml(entry.to || entry.toStatus || "Unknown")}</strong><span>\${formatDateTime(entry.date || entry.changedAt)}\${entry.by || entry.changedBy ? \` | \${escapeHtml(entry.by || entry.changedBy)}\` : ""}</span></article>\`)
    .join("");
  return \`
    \${boardingDogSummaryHeaderHtml(displayRecord, selectedStay)}
    <div class="chip-row">\${dogTypeBadgeHtml("boardingDog")}\${selectedStay.id ? boardingStayRequestCodeChipHtml(displayRecord, selectedStay) : ""}\${selectedStay.id ? boardingStayStatusChipHtml(displayRecord, selectedStay) : boardingStatusChipHtml(displayRecord)}\${linkedCustomerDogForBoarding(displayRecord) ? statusChipHtml("Owner Linked") : ""}</div>
    \${boardingCarePacketHtml(displayRecord, selectedStay)}
    \${selectedStayHtml}
    \${customerUploadSectionHtml(displayRecord)}
    \${customerUpdates ? \`<h3>Customer Updates</h3>\${customerUpdates}\` : ""}
    \${stays ? \`<h3>Stays</h3>\${stays}\` : ""}
    \${history ? \`<h3>Status History</h3>\${history}\` : ""}
  \`;
}

function boardingDogIdFromCustomerDogValue(value = "") {
  const id = String(value || "");
  return id.startsWith("boarding:") ? id.slice("boarding:".length) : id;
}

function boardingDogSearchText(record = {}) {
  const stayText = (record.stays || []).map((stay) => [
    boardingStayRequestCode(record, stay),
    boardingStayDisplayStatus(record, stay),
    formatDateTime(stay.dropoffTime),
    formatDateTime(stay.pickupTime),
    boardingKennelLocationLabel(record, stay),
    boardingStayServicesText(stay),
    stay.stayNotes || "",
    stay.bathPlan || "",
  ].filter(Boolean).join(" ")).join(" ");
  return [
    JSON.stringify(record),
    boardingDisplayStatus(record),
    boardingScheduleText(record),
    stayText,
  ].filter(Boolean).join(" ").toLowerCase();
}

function boardingDogMatchesSearch(record = {}, query = "") {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return boardingDogSearchText(record).includes(normalizedQuery);
}

function boardingRosterFilters() {
  return ["Active dogs", "Pending Approval", "Approved", "In Kennel", "Ready For Pickup", "All Boarding Dogs"];
}

function boardingRosterFilterLabel(filter) {
  if (filter === "Pending") return "Pending Approval";
  return filter === "Ready For Pickup" ? "Ready for Pickup" : filter;
}

function boardingStayPickupHasPassed(stay = {}, date = new Date()) {
  const pickup = new Date(stay.pickupTime || stay.scheduledPickupTime || stay.requestedPickupTime || "");
  const reference = date instanceof Date ? date : new Date(date);
  return !Number.isNaN(pickup.getTime()) && !Number.isNaN(reference.getTime()) && pickup < reference;
}

function boardingStayIsCurrentOrUpcoming(record = {}, stay = {}, date = new Date()) {
  if (!stay?.id) return true;
  const status = boardingStayDisplayStatus(record, stay);
  if (["Cancelled", "Checked Out"].includes(status)) return false;
  if (["Pending", "Approved"].includes(status) && boardingStayPickupHasPassed(stay, date)) return false;
  return true;
}

function boardingRecordHasCurrentOrUpcomingStatus(record = {}, status = "", date = new Date()) {
  const stays = arrayValue(record.stays);
  if (!stays.length) {
    const recordStatus = normalizeBoardingStatus(record);
    if (recordStatus !== status) return false;
    if (["Pending", "Approved"].includes(recordStatus) && boardingStayPickupHasPassed(record, date)) return false;
    return true;
  }
  return stays.some((stay) => boardingStayDisplayStatus(record, stay) === status && boardingStayIsCurrentOrUpcoming(record, stay, date));
}

function boardingRecordHasActionableStay(record = {}, date = new Date()) {
  const stays = arrayValue(record.stays);
  if (!stays.length) {
    const status = normalizeBoardingStatus(record);
    if (["Cancelled", "Checked Out"].includes(status)) return false;
    if (["Pending", "Approved"].includes(status) && boardingStayPickupHasPassed(record, date)) return false;
    return true;
  }
  return stays.some((stay) => boardingStayIsCurrentOrUpcoming(record, stay, date));
}

function boardingDogMatchesRosterFilter(record = {}, filter = boardingDogRosterFilter) {
  const status = boardingDisplayStatus(record);
  const hasActiveStay = isCurrentlyBoarding(record);
  const hasStays = Boolean((record.stays || []).length);
  if (filter === "All Boarding Dogs") return true;
  if (filter === "Pending" || filter === "Pending Approval") return boardingRecordHasCurrentOrUpcomingStatus(record, "Pending") && !hasActiveStay;
  if (filter === "Approved") return boardingRecordHasCurrentOrUpcomingStatus(record, "Approved") && !hasActiveStay;
  if (filter === "In Kennel") return status === "In Kennel" && (hasActiveStay || !hasStays);
  if (filter === "Ready For Pickup") return status === "Ready For Pickup" && (hasActiveStay || !hasStays);
  return hasActiveStay || (!hasStays && ["Checked In", "In Kennel", "Ready For Pickup"].includes(status));
}

function renderBoardingRosterTabs(records = []) {
  const container = $("#boardingDogRosterTabs");
  if (!container) return;
  const filters = boardingRosterFilters();
  if (!filters.includes(boardingDogRosterFilter)) boardingDogRosterFilter = "Active dogs";
  const counts = filters.reduce((acc, filter) => {
    acc[filter] = records.filter((record) => boardingDogMatchesRosterFilter(record, filter)).length;
    return acc;
  }, {});
  container.innerHTML = filters
    .map((filter) => {
      const active = filter === boardingDogRosterFilter;
      return \`<button type="button" class="\${active ? "is-active" : ""}" data-boarding-filter="\${escapeHtml(filter)}" role="tab" aria-selected="\${active ? "true" : "false"}">\${escapeHtml(boardingRosterFilterLabel(filter))} <span>\${counts[filter] || 0}</span></button>\`;
    })
    .join("");
}

function boardingQueueStayMatchesGroup(title = "", record = {}, stay = {}) {
  const today = todayDate();
  const tomorrow = addDays(today, 1);
  const status = boardingStayDisplayStatus(record, stay);
  if (title === "Pending Approval") return status === "Pending";
  if (title === "Today Drop-offs") return sameDateValue(stay.dropoffTime, today) && ["Pending", "Approved", "Checked In"].includes(status);
  if (title === "Tomorrow Arrivals") return sameDateValue(stay.dropoffTime, tomorrow) && status === "Approved";
  if (title === "In Kennel") {
    if (status !== "In Kennel" || stayHasActualPickupEvidence(stay)) return false;
    const pickup = new Date(stay.pickupTime);
    return Number.isNaN(pickup.getTime()) || pickup >= new Date();
  }
  if (title === "Today Pickups") return sameDateValue(stay.pickupTime, today) && ["Checked In", "In Kennel", "Ready For Pickup"].includes(status);
  return false;
}

function boardingQueueStayForGroup(title = "", record = {}) {
  const stays = record.stays || [];
  return stays.find((stay) => boardingQueueStayMatchesGroup(title, record, stay)) || null;
}

function boardingQueueRecordMatchesGroup(title = "", record = {}) {
  if ((record.stays || []).length) return Boolean(boardingQueueStayForGroup(title, record));
  const status = normalizeBoardingStatus(record);
  const today = todayDate();
  const tomorrow = addDays(today, 1);
  if (title === "Pending Approval") return status === "Pending";
  if (title === "Today Drop-offs") return sameDateValue(record.dropoffTime, today) && ["Pending", "Approved", "Checked In"].includes(status);
  if (title === "Tomorrow Arrivals") return sameDateValue(record.dropoffTime, tomorrow) && status === "Approved";
  if (title === "In Kennel") return status === "In Kennel";
  if (title === "Today Pickups") return sameDateValue(record.pickupTime, today) && ["Checked In", "In Kennel", "Ready For Pickup"].includes(status);
  return false;
}

function boardingServiceOnlyChipHtml(record = {}, stay = {}) {
  if (!isServiceRequestStay(record, stay)) return "";
  return '<span class="boarding-service-only-chip">SERVICE ONLY</span>';
}

function boardingQueueGroupHtml(title, records = []) {
  return \`<article class="boarding-queue-card"><strong>\${escapeHtml(title)}</strong><span>\${records.length}</span>\${
    records.length
      ? records.map((record) => {
        const stay = boardingQueueStayForGroup(title, record) || boardingPrimaryStay(record) || {};
        const stayAttrs = stay.id ? boardingStayDataAttrs(record, stay) : "";
        const kennel = boardingKennelLocationLabel(record, stay);
        const serviceOnly = isServiceRequestStay(record, stay);
        const itemClass = serviceOnly ? "boarding-queue-item is-service-only" : "boarding-queue-item";
        return \`<button type="button" class="\${itemClass}" data-action="open-queue-stay-status" data-id="\${escapeHtml(record.id)}"\${stayAttrs}>\${boardingDogThumbnailHtml(record, { className: "boarding-queue-photo" })}<span class="boarding-queue-item-content"><span class="boarding-queue-item-title"><span>\${escapeHtml(record.dogName || "Dog")}\${kennel ? \` <small class="kennel-tag">\${escapeHtml(kennel)}</small>\` : ""}</span>\${boardingServiceOnlyChipHtml(record, stay)}</span><small>\${escapeHtml(boardingScheduleText(record, stay))}</small></span></button>\`;
      }).join("")
      : \`<p>No dogs in this group.</p>\`
  }</article>\`;
}

function renderBoardingQueueGroups(records = []) {
  const container = $("#boardingQueueGroups");
  if (!container) return;
  const groups = [
    ["Pending Approval", records.filter((record) => boardingQueueRecordMatchesGroup("Pending Approval", record))],
    ["Today Drop-offs", records.filter((record) => boardingQueueRecordMatchesGroup("Today Drop-offs", record))],
    ["Tomorrow Arrivals", records.filter((record) => boardingQueueRecordMatchesGroup("Tomorrow Arrivals", record))],
    ["In Kennel", records.filter((record) => boardingQueueRecordMatchesGroup("In Kennel", record))],
    ["Today Pickups", records.filter((record) => boardingQueueRecordMatchesGroup("Today Pickups", record))],
  ];
  const alwaysShowLanes = new Set(["Pending Approval", "Today Drop-offs", "In Kennel"]);
  container.innerHTML = groups
    .filter(([title, groupRecords]) => alwaysShowLanes.has(title) || groupRecords.length > 0)
    .map(([title, groupRecords]) => boardingQueueGroupHtml(title, groupRecords))
    .join("");
  hydrateProfilePhotoElements(container);
}

function boardingCalendarMonthKey(value = boardingCalendarMonth) {
  const clean = String(value || "").slice(0, 7);
  return /^\\d{4}-\\d{2}$/.test(clean) ? clean : todayDate().slice(0, 7);
}

function boardingCalendarDays(monthKey = boardingCalendarMonth) {
  const clean = boardingCalendarMonthKey(monthKey);
  const parts = clean.split("-").map(Number);
  const year = parts[0];
  const month = parts[1];
  const totalDays = new Date(year, month, 0).getDate();
  return Array.from({ length: totalDays }, (_, index) => clean + "-" + String(index + 1).padStart(2, "0"));
}

function boardingCalendarMonthLabel(monthKey = boardingCalendarMonth) {
  const clean = boardingCalendarMonthKey(monthKey);
  const date = new Date(clean + "-01T12:00:00");
  return Number.isNaN(date.getTime()) ? clean : date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function boardingCalendarStatusLabel(status = "") {
  return status === "Ready For Pickup" ? "Ready Pickup" : status;
}

function boardingCalendarStayDates(stay = {}) {
  const start = dateOnly(stay.dropoffTime);
  const end = dateOnly(stay.pickupTime) || start;
  if (!start || !end) return null;
  return { start: start <= end ? start : end, end: end >= start ? end : start };
}

function boardingCalendarEntries(records = [], monthKey = boardingCalendarMonth) {
  const days = boardingCalendarDays(monthKey);
  const monthStart = days[0] || "";
  const monthEnd = days[days.length - 1] || "";
  if (!monthStart || !monthEnd) return [];
  const entries = [];
  records.forEach((record) => {
    const displayRecord = boardingDogWithStayStatus(record || {});
    const rawStays = arrayValue(displayRecord.stays).length ? arrayValue(displayRecord.stays) : [displayRecord].filter((item) => item.dropoffTime || item.pickupTime);
    const stays = dedupeBoardingStaysForDisplay(displayRecord, rawStays);
    stays.forEach((stay) => {
      const dates = boardingCalendarStayDates(stay);
      if (!dates) return;
      if (dates.end < monthStart || dates.start > monthEnd) return;
      const visibleStart = dates.start < monthStart ? monthStart : dates.start;
      const visibleEnd = dates.end > monthEnd ? monthEnd : dates.end;
      entries.push({
        record: displayRecord,
        stay,
        status: boardingStayDisplayStatus(displayRecord, stay),
        start: dates.start,
        end: dates.end,
        visibleStart,
        visibleEnd,
      });
    });
  });
  return entries.sort((a, b) => {
    const startCompare = a.visibleStart.localeCompare(b.visibleStart);
    if (startCompare) return startCompare;
    return String(a.record?.dogName || "").localeCompare(String(b.record?.dogName || ""));
  });
}

function boardingCalendarDogMeta(record = {}, stay = {}) {
  const owner = record.ownerName || record.requestedByName || record.customerName || "";
  const kennel = boardingKennelLocationLabel(record, stay);
  return [owner, kennel].filter(Boolean).join(" | ");
}

function boardingCalendarDayHeadingHtml(day = "", index = 0) {
  const date = new Date(day + "T12:00:00");
  const weekday = Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-US", { weekday: "short" });
  const label = Number.isNaN(date.getTime()) ? day.slice(-2) : String(date.getDate());
  return '<div class="boarding-calendar-day-heading" data-boarding-calendar-day="' + escapeHtml(day) + '" style="grid-row: 1; grid-column: ' + (index + 2) + ';"><strong>' + escapeHtml(label) + '</strong><span>' + escapeHtml(weekday) + '</span></div>';
}

function boardingCalendarStatusLegendHtml(entries = []) {
  const counts = entries.reduce((acc, entry) => {
    const status = entry.status || "Approved";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  const statuses = boardingLifecycleStatuses.filter((status) => counts[status] && !boardingCalendarHiddenLegendStatuses.has(status));
  if (!statuses.length) return "";
  return '<div class="boarding-calendar-status-flags" aria-label="Boarding status colors">' + statuses.map((status) => {
    const count = counts[status] || 0;
    const active = !boardingCalendarInactiveStatuses.has(status);
    return '<button type="button" class="boarding-calendar-status-flag ' + escapeHtml(statusClassForBoardingStatus(status)) + (active ? "" : " is-inactive") + '" data-action="toggle-calendar-status" data-status="' + escapeHtml(status) + '" aria-pressed="' + (active ? "true" : "false") + '"><span>' + escapeHtml(boardingCalendarStatusLabel(status)) + '</span><small>' + escapeHtml(String(count)) + '</small></button>';
  }).join("") + '</div>';
}

function toggleBoardingCalendarStatus(status = "") {
  if (!boardingLifecycleStatuses.includes(status)) return;
  if (boardingCalendarInactiveStatuses.has(status)) boardingCalendarInactiveStatuses.delete(status);
  else boardingCalendarInactiveStatuses.add(status);
  renderBoardingDogs();
}

function boardingCalendarCurrentTimeLineHtml(days = [], rowCount = 0) {
  const today = todayDate();
  const dayIndex = days.indexOf(today);
  if (dayIndex < 0 || rowCount <= 0) return "";
  const now = new Date();
  const startOfDay = new Date(today + "T00:00:00");
  const dayFraction = Number.isNaN(startOfDay.getTime()) ? 0 : Math.max(0, Math.min(1, (now - startOfDay) / 86400000));
  const offset = Math.round(dayFraction * 10000) / 100;
  const title = "Current time: " + formatDateTime(now.toISOString());
  return '<span class="boarding-calendar-now-line" aria-hidden="true" title="' + escapeHtml(title) + '" style="grid-row: 1 / span ' + (rowCount + 1) + '; grid-column: ' + (dayIndex + 2) + '; --boarding-calendar-now-offset: ' + offset + '%;"></span>';
}

function scrollBoardingCalendarToToday() {
  const today = todayDate();
  if (boardingCalendarMonthKey(boardingCalendarMonth) !== today.slice(0, 7)) return;
  window.requestAnimationFrame(() => {
    const scrollEl = $("#boardingCalendarView .boarding-calendar-scroll");
    const grid = scrollEl?.querySelector(".boarding-calendar-grid");
    const todayHeading = grid?.querySelector('[data-boarding-calendar-day="' + today + '"]');
    if (!scrollEl || !grid || !todayHeading) return;
    const styles = window.getComputedStyle(grid);
    const dogColumnWidth = parseFloat(styles.getPropertyValue("--boarding-calendar-dog-col")) || grid.querySelector(".boarding-calendar-corner")?.offsetWidth || 0;
    scrollEl.scrollLeft = Math.max(0, todayHeading.offsetLeft - dogColumnWidth);
  });
}

function boardingCalendarEntryHtml(entry = {}, index = 0, days = []) {
  const record = entry.record || {};
  const stay = entry.stay || {};
  const row = index + 2;
  const dogName = record.dogName || "Dog";
  const dogMeta = boardingCalendarDogMeta(record, stay);
  const monthStart = days[0] || "";
  const offset = Math.max(0, daysBetweenDates(monthStart, entry.visibleStart) || 0);
  const inclusiveSpan = Math.max(1, daysBetweenDates(entry.visibleStart, addDays(entry.visibleEnd, 1)) || 1);
  const span = Math.min(inclusiveSpan, days.length - offset);
  const startColumn = 2 + offset;
  const requestCode = stay.id ? boardingStayRequestCode(record, stay) : "";
  const dueInfo = boardingStayServiceDueInfo(record, stay);
  const statusClass = statusClassForBoardingStatus(entry.status);
  const stayAttrs = stay.id ? boardingStayDataAttrs(record, stay) : "";
  const title = dogName + " | " + stayScheduleRangeLabel(record, stay);
  const barMeta = [boardingCalendarStatusLabel(entry.status), requestCode, dueInfo?.label || ""].filter(Boolean).join(" | ");
  const dayCells = days.map((day, dayIndex) => '<span class="boarding-calendar-day-cell" style="grid-row: ' + row + '; grid-column: ' + (dayIndex + 2) + ';"></span>').join("");
  return '<button type="button" class="boarding-calendar-dog-cell" data-action="open-calendar-dog" data-id="' + escapeHtml(record.id || "") + '" style="grid-row: ' + row + '; grid-column: 1;" title="' + escapeHtml(dogName) + '"><strong>' + escapeHtml(dogName) + '</strong><span>' + escapeHtml(dogMeta || "Boarding stay") + '</span></button>'
    + dayCells
    + '<button type="button" class="boarding-calendar-bar ' + escapeHtml(statusClass) + '" data-action="open-calendar-stay" data-id="' + escapeHtml(record.id || "") + '"' + stayAttrs + ' style="grid-row: ' + row + '; grid-column: ' + startColumn + ' / span ' + span + ';" title="' + escapeHtml(title) + '"><span>' + escapeHtml(dogName) + '</span><small>' + escapeHtml(barMeta) + '</small></button>';
}

function renderBoardingCalendar(records = []) {
  const container = $("#boardingCalendarView");
  if (!container) return;
  boardingCalendarMonth = boardingCalendarMonthKey(boardingCalendarMonth);
  const days = boardingCalendarDays(boardingCalendarMonth);
  const allEntries = boardingCalendarEntries(records, boardingCalendarMonth);
  const entries = allEntries.filter((entry) => !boardingCalendarInactiveStatuses.has(entry.status || "Approved"));
  const dogCount = new Set(entries.map((entry) => entry.record?.id || entry.record?.dogName || "")).size;
  const dayHeadings = days.map(boardingCalendarDayHeadingHtml).join("");
  const rows = entries.map((entry, index) => boardingCalendarEntryHtml(entry, index, days)).join("");
  const nowLine = boardingCalendarCurrentTimeLineHtml(days, entries.length);
  const emptyMessage = allEntries.length ? "No stays match the active status flags." : "No stays match the current month and filters.";
  const emptyState = entries.length ? "" : '<article class="record-card compact-record-card boarding-calendar-empty"><strong>No boarding stays in ' + escapeHtml(boardingCalendarMonthLabel(boardingCalendarMonth)) + '</strong><p>' + escapeHtml(emptyMessage) + '</p></article>';
  const grid = entries.length
    ? '<div class="boarding-calendar-scroll" tabindex="0"><div class="boarding-calendar-grid" style="--boarding-calendar-days: ' + days.length + '; --boarding-calendar-rows: ' + entries.length + ';"><div class="boarding-calendar-corner">Dog</div>' + dayHeadings + rows + nowLine + '</div></div>'
    : emptyState;
  container.innerHTML = '<section class="boarding-calendar-card">'
    + '<div class="boarding-calendar-header"><div><strong>Monthly Stay Timeline</strong><span>' + escapeHtml(entries.length + " stay" + (entries.length === 1 ? "" : "s") + " | " + dogCount + " dog" + (dogCount === 1 ? "" : "s")) + '</span></div>'
    + '<div class="boarding-calendar-controls"><button type="button" class="icon-button boarding-calendar-icon-button" data-action="boarding-calendar-month" data-month-delta="-1" aria-label="Previous month">&lsaquo;</button><button type="button" class="secondary-button boarding-calendar-month-button" data-action="boarding-calendar-today">' + escapeHtml(boardingCalendarMonthLabel(boardingCalendarMonth)) + '</button><button type="button" class="icon-button boarding-calendar-icon-button" data-action="boarding-calendar-month" data-month-delta="1" aria-label="Next month">&rsaquo;</button></div></div>'
    + grid
    + boardingCalendarStatusLegendHtml(allEntries)
    + '</section>';
  if (entries.length) scrollBoardingCalendarToToday();
}

function boardingDogForCustomerDog(dog = {}) {
  const ownerEmail = normalizeEmail(dog.ownerEmail || dog.customerEmail);
  const dogName = String(dog.dogName || "").trim().toLowerCase();
  return consolidatedBoardingDogRecords().find((record) => {
    if (record.removed) return false;
    if (record.linkedCustomerDogId && record.linkedCustomerDogId === dog.id) return true;
    return ownerEmail
      && dogName
      && boardingOwnerEmails(record).includes(ownerEmail)
      && String(record.dogName || "").trim().toLowerCase() === dogName;
  }) || null;
}

function boardingDogVisibleToCustomer(record = {}, email = currentUser?.email) {
  const normalizedEmail = normalizeEmail(email);
  return Boolean(normalizedEmail && boardingOwnerEmails(record).includes(normalizedEmail));
}

function boardingDraftFromCustomerDog(dog = {}) {
  const combinedStatus = combinedDogSpayNeuterStatus(dog);
  return {
    dogName: dog.dogName || "",
    breedDescription: dog.breedDescription || "",
    sex: sexFromCombinedDogSpayNeuterStatus(combinedStatus) || dog.sex || "Unknown",
    spayNeuterStatus: combinedStatus,
    ownerName: dog.ownerName || "",
    ownerPhone: dog.ownerPhone || "",
    ownerEmail: dog.ownerEmail || dog.customerEmail || "",
    customerEmail: dog.customerEmail || dog.ownerEmail || "",
    emergencyName: dog.emergencyName || "",
    emergencyPhone: dog.emergencyPhone || "",
    vetInfo: dog.vetInfo || "",
    rabiesDate: dog.rabiesDate || "",
    dhppDate: dog.dhppDate || "",
    rabiesGoodThreeYears: dog.rabiesGoodThreeYears || (vaccineDurationIsThreeYears(dog, "rabies") ? "Yes" : ""),
    dhppGoodThreeYears: dog.dhppGoodThreeYears || (vaccineDurationIsThreeYears(dog, "dhpp") ? "Yes" : ""),
    rabiesDuration: dog.rabiesDuration || (vaccineDurationIsThreeYears(dog, "rabies") ? "3 years" : ""),
    dhppDuration: dog.dhppDuration || (vaccineDurationIsThreeYears(dog, "dhpp") ? "3 years" : ""),
    bordetellaDate: dog.bordetellaDate || "",
    heartwormDate: dog.heartwormDate || "",
    specialCare: dog.specialCare || "",
    profilePhotoUrl: dog.profilePhotoUrl || "",
    profilePhotoData: dog.profilePhotoData || "",
    vaccinationRecords: dog.vaccinationRecords || [],
    vaccinationFiles: dog.vaccinationFiles || "",
    linkedCustomerDogId: dog.id || "",
    linkedOwnerEmail: dog.ownerEmail || dog.customerEmail || "",
    entrySource: "customer-profile",
  };
}

function boardingDogWithCanonicalProfile(record = {}) {
  if (!record?.id) return record || {};
  const linked = linkedCustomerDogForBoarding(record);
  if (!linked?.id || linked.isSharedBoardingDog) return record;
  const profilePatch = dogProfileFieldPatch(linked);
  return {
    ...record,
    ...profilePatch,
    id: record.id,
    type: "boardingDog",
    linkedCustomerDogId: linked.id,
    linkedOwnerEmail: linked.ownerEmail || linked.customerEmail || record.linkedOwnerEmail || "",
    customerEmail: linked.customerEmail || linked.ownerEmail || record.customerEmail || "",
  };
}

function boardingDogWithCustomerProfilePatch(record = {}, customerDog = {}) {
  const profilePatch = dogProfileFieldPatch(customerDog);
  return {
    ...record,
    ...profilePatch,
    id: record.id,
    type: "boardingDog",
    linkedCustomerDogId: customerDog.id || record.linkedCustomerDogId || "",
    linkedOwnerEmail: customerDog.ownerEmail || customerDog.customerEmail || record.linkedOwnerEmail || "",
    customerEmail: customerDog.customerEmail || customerDog.ownerEmail || record.customerEmail || "",
  };
}

function reservationStatusFromLegacy(record = {}, stay = {}) {
  const status = stay.status || normalizeBoardingStatus(record);
  if (status === "Cancelled") return "cancelled";
  if (status === "Checked Out") return "checked_out";
  if (["Checked In", "In Kennel", "Ready For Pickup"].includes(status)) return "checked_in";
  if (status === "Approved") return "approved";
  if (status === "Declined") return "declined";
  if (record.customerRequest || status === "Pending") return "pending_customer_request";
  return "draft";
}

function boardingOwnerLinkButtonHtml(record = {}) {
  if (!record.id || !record.ownerEmail) return "";
  const linkedDog = linkedCustomerDogForBoarding(record);
  const label = linkedDog ? "Refresh Owner Link" : "Create/Link Customer Login";
  return \`<button type="button" class="secondary-button" data-action="link-boarding-owner" data-id="\${escapeHtml(record.id)}">\${label}</button>\`;
}

function renderBoardingOwnerAccountPanel(record = activeBoardingDog()) {
  const panel = $("#boardingOwnerAccountPanel");
  const content = $("#boardingOwnerAccountContent");
  if (!panel || !content) return;
  if (!record?.id) {
    panel.hidden = true;
    content.innerHTML = "";
    return;
  }
  panel.hidden = false;
  const ownerEmail = String(record.ownerEmail || "").trim().toLowerCase();
  if (!ownerEmail) {
    content.innerHTML = \`<article class="record-card compact-record-card"><strong>No owner email saved</strong><p>Add an owner email before preparing a customer login for this dog.</p></article>\`;
    return;
  }
  const linkedDog = linkedCustomerDogForBoarding(record);
  const ownerAccount = ownerAccountForBoarding(record);
  content.innerHTML = \`<article class="record-card compact-record-card"><strong>\${escapeHtml(ownerEmail)}</strong><p>\${linkedDog ? \`Linked customer dog: \${escapeHtml(linkedDog.dogName || record.dogName || "Dog")}\` : "No customer dog profile linked yet."}</p><p>\${ownerAccount ? \`Customer access profile exists: \${escapeHtml(roleLabel(ownerAccount.role))}\` : "No customer access profile exists yet."}</p><div class="record-actions">\${boardingOwnerLinkButtonHtml(record)}</div></article>\`;
}

function boardingQuickSortTime(record = {}) {
  const stay = boardingPrimaryStay(record) || {};
  const status = stay?.id ? boardingStayDisplayStatus(record, stay) : normalizeBoardingStatus(record);
  const value = ["Checked In", "In Kennel", "Ready For Pickup"].includes(status) ? stay.pickupTime : stay.dropoffTime;
  const date = new Date(value || record.updatedAt || record.submittedAt || 0);
  return Number.isNaN(date.getTime()) ? Number.MAX_SAFE_INTEGER : date.getTime();
}

function boardingQuickActionButtons(record = {}) {
  const stay = boardingPrimaryStay(record) || {};
  const status = stay?.id ? boardingStayDisplayStatus(record, stay) : normalizeBoardingStatus(record);
  const stayAttr = stay.id ? boardingStayDataAttrs(record, stay) : "";
  const buttons = [];
  if (status === "Pending") {
    buttons.push(\`<button type="button" class="secondary-button" data-action="inline-boarding-status" data-next-status="Approved" data-id="\${escapeHtml(record.id)}"\${stayAttr}>Approve Request</button>\`);
    buttons.push(\`<button type="button" class="secondary-button danger-button" data-action="inline-boarding-status" data-next-status="Cancelled" data-id="\${escapeHtml(record.id)}"\${stayAttr}>Decline</button>\`);
  }
  if (status === "Approved") {
    buttons.push(\`<button type="button" class="secondary-button" data-action="inline-boarding-status" data-next-status="Checked In" data-id="\${escapeHtml(record.id)}"\${stayAttr}>Check In</button>\`);
  }
  if (status === "Checked In") {
    buttons.push(\`<button type="button" class="secondary-button" data-action="inline-boarding-status" data-next-status="In Kennel" data-id="\${escapeHtml(record.id)}"\${stayAttr}>Mark In Kennel</button>\`);
  }
  if (status === "In Kennel") {
    buttons.push(\`<button type="button" class="secondary-button" data-action="inline-boarding-status" data-next-status="Ready For Pickup" data-id="\${escapeHtml(record.id)}"\${stayAttr}>Ready for Pickup</button>\`);
  }
  if (status === "Ready For Pickup") {
    buttons.push(\`<button type="button" class="secondary-button" data-action="inline-boarding-status" data-next-status="Checked Out" data-id="\${escapeHtml(record.id)}"\${stayAttr}>Check Out</button>\`);
  }
  const ownerUpdateButton = boardingOwnerUpdateButtonHtml(record, stay);
  if (ownerUpdateButton) buttons.push(ownerUpdateButton);
  const medicalBehaviorButton = boardingMedicalBehaviorButtonHtml(record, stay);
  if (medicalBehaviorButton) buttons.push(medicalBehaviorButton);
  if (status === "Checked Out") {
    buttons.push(\`<button type="button" class="secondary-button" data-action="change-boarding" data-id="\${escapeHtml(record.id)}"\${stayAttr}>View Record</button>\`);
  } else {
    buttons.push(\`<button type="button" class="secondary-button" data-action="change-boarding" data-id="\${escapeHtml(record.id)}"\${stayAttr}>Details</button>\`);
  }
  return \`<div class="quick-action-grid boarding-action-grid" data-inline-status-actions="\${escapeHtml(record.id || "")}">\${buttons.join("")}</div>\`;
}

function boardingTableCellHtml(column = {}, record = {}) {
  const value = column.value(record);
  if (column.key === "dogName") {
    return \`\${escapeHtml(value)}<div class="chip-row compact-chip-row">\${vaccinationStatusBadgeHtml(record)}</div>\`;
  }
  return escapeHtml(value);
}

function boardingStayServiceSummary(record = {}, stayOverride = null) {
  const stay = stayOverride || activeBoardingStay(record) || currentOrNextStay(record) || (record.stays || [])[0] || {};
  const seen = new Set();
  const requested = arrayValue(stay.requests).map((item) => {
    if (typeof item === "string") return item;
    return \`\${item.serviceName || "Service"}\${Number(item.quantity || 1) > 1 ? \` x\${item.quantity}\` : ""}\`;
  });
  const added = arrayValue(stay.checkIn?.addedServices).map((service) => \`\${service.serviceName || "Service"}\${Number(service.quantity || 1) > 1 ? \` x\${service.quantity}\` : ""}\`);
  return [...requested, ...added].filter(Boolean).filter((label) => {
    const key = boardingServiceTaskDisplayName(label).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function boardingPickupReviewHtml(record = {}, options = {}) {
  const stay = (options.stayId || options.requestCode) ? boardingStayByReference(record, options) || {} : activeBoardingStay(record) || currentOrNextStay(record) || {};
  const services = boardingStayServiceSummary(record, stay);
  const stayAttr = stay.id ? boardingStayDataAttrs(record, stay) : "";
  const serviceStats = boardingStayServiceStats(record, stay);
  const serviceReview = serviceStats.total
    ? boardingStayServiceTaskListHtml(record, stay, { actions: true })
    : \`<article class="record-card compact-record-card"><strong>Requested / added services</strong><p>\${escapeHtml(services.length ? services.join(", ") : "No services listed")}</p></article>\`;
  const serviceMessage = serviceStats.total && serviceStats.incompleteTasks.length
    ? \`<p class="service-warning-text">Complete all requested stay services before marking this dog ready for pickup.</p>\`
    : serviceStats.total
      ? \`<p class="success-text">All requested stay services are completed.</p>\`
      : "";
  return \`<section class="popup-record-section">
    <article class="record-card compact-record-card">
      <strong>\${escapeHtml(record.dogName || "Boarding dog")}</strong>
      <p>\${escapeHtml(record.ownerName || "No owner saved")} | \${phoneLinkHtml(record.ownerPhone)}</p>
      <p>\${escapeHtml(record.ownerEmail || "No email saved")}</p>
    </article>
    \${stay.id ? boardingStayDetailCardHtml(record, stay, { compact: true, showServiceTasks: false }) : ""}
    \${boardingStayBelongingsHtml(stay, { showEmpty: true, label: "Belongings to leave with dog" })}
    \${serviceReview}
    \${serviceMessage}
    <label>Pickup note<textarea id="pickupReadyNote" rows="3" placeholder="Lost belonging, alternate pickup person, damaged crate, or other checkout note"></textarea></label>
    <div class="button-row"><button type="button" data-action="confirm-ready-for-pickup" data-id="\${escapeHtml(record.id)}"\${stayAttr}>Mark Ready For Pickup</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>
  </section>\`;
}

function boardingInvoiceTotal(record = {}, stayOverride = null) {
  const stay = stayOverride || activeBoardingStay(record) || currentOrNextStay(record) || (record.stays || [])[0] || {};
  return boardingStayInvoiceTotal(record, stay);
}

function boardingCheckoutInvoiceHtml(record = {}, options = {}) {
  const stay = (options.stayId || options.requestCode) ? boardingStayByReference(record, options) || {} : activeBoardingStay(record) || currentOrNextStay(record) || {};
  const services = boardingStayServiceSummary(record, stay);
  const total = boardingInvoiceTotal(record, stay);
  const paymentStatus = record.paymentStatus || "Unpaid";
  const stayAttr = stay.id ? boardingStayDataAttrs(record, stay) : "";
  return \`<section class="popup-record-section">
    <article class="record-card compact-record-card">
      <strong>\${escapeHtml(record.dogName || "Boarding dog")} final invoice</strong>
      <p>\${escapeHtml(record.ownerName || "No owner saved")} | \${phoneLinkHtml(record.ownerPhone)}</p>
      <p>Status: \${escapeHtml(paymentStatus)}\${record.paymentMethod ? \` by \${escapeHtml(record.paymentMethod)}\` : ""}</p>
    </article>
    \${stay.id ? boardingStayDetailCardHtml(record, stay, { compact: true, hideInvoiceSummary: true }) : ""}
    \${boardingStayBelongingsHtml(stay, { showEmpty: true, label: "Belongings to return at checkout", className: "boarding-checkout-belongings-card" })}
    <article class="record-card compact-record-card"><strong>Services</strong><p>\${escapeHtml(services.length ? services.join(", ") : "No services listed")}</p></article>
    \${stay.id ? boardingStayInvoiceSummaryHtml(record, stay, { final: true }) : \`<article class="record-card compact-record-card"><strong>Total</strong><p>\${escapeHtml(total ? money(total) : "No invoice total saved")}</p></article>\`}
    <label>Checkout note<textarea id="checkoutNote" rows="3" placeholder="Payment note, pickup person, invoice issue, or checkout detail"></textarea></label>
    <div class="button-row"><button type="button" data-action="checkout-paid-method" data-id="\${escapeHtml(record.id)}"\${stayAttr}>Paid</button><button type="button" class="secondary-button" data-action="confirm-check-out" data-id="\${escapeHtml(record.id)}"\${stayAttr}>Check Out</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>
  </section>\`;
}

function boardingDogPhotoSource(record = {}) {
  const linkedDog = linkedCustomerDogForBoarding(record) || {};
  return profilePhotoDirectSource(record) || profilePhotoDirectSource(linkedDog) || "";
}

function boardingDogPhotoRecord(record = {}) {
  const linkedDog = linkedCustomerDogForBoarding(record) || {};
  if (profilePhotoHasSource(record)) return record;
  if (profilePhotoHasSource(linkedDog)) return linkedDog;
  return {};
}

function boardingDogMobilePhotoHtml(record = {}) {
  const name = record.dogName || "Boarding dog";
  const photoRecord = boardingDogPhotoRecord(record);
  const photo = profilePhotoDirectSource(photoRecord);
  if (profilePhotoHasSource(photoRecord)) {
    return \`<button type="button" class="mobile-dog-photo-button" data-action="view-media" data-src="\${escapeHtml(photo)}" data-media-type="image/jpeg" data-media-name="\${escapeHtml(\`\${name} profile photo\`)}" aria-label="View \${escapeHtml(name)} photo"\${profilePhotoAccessAttrs({ ...photoRecord, id: photoRecord.id || record.id, type: photoRecord.type || record.type || "boardingDog" }, "boardingDog")}><img\${photo ? \` src="\${escapeHtml(photo)}"\` : ""} alt="\${escapeHtml(name)}"\${photo ? "" : " hidden"} /><span data-profile-photo-initials\${photo ? " hidden" : ""}>\${escapeHtml(avatarText(name))}</span></button>\`;
  }
  return \`<div class="mobile-dog-photo-button mobile-dog-photo-initials" aria-hidden="true">\${escapeHtml(avatarText(name))}</div>\`;
}

function boardingDogThumbnailHtml(record = {}, options = {}) {
  const name = record.dogName || "Boarding dog";
  const photoRecord = boardingDogPhotoRecord(record);
  const photo = profilePhotoDirectSource(photoRecord);
  const className = ["boarding-dog-photo-thumb", options.className || ""].filter(Boolean).join(" ");
  const initials = \`<span data-profile-photo-initials\${photo ? " hidden" : ""}>\${escapeHtml(avatarText(name))}</span>\`;
  const image = \`<img\${photo ? \` src="\${escapeHtml(photo)}"\` : ""} alt="\${escapeHtml(name)}"\${photo ? "" : " hidden"} />\`;
  const recordWithFallback = { ...photoRecord, id: photoRecord.id || record.id, type: photoRecord.type || record.type || "boardingDog" };
  const attrs = profilePhotoAccessAttrs(recordWithFallback, "boardingDog");
  if (profilePhotoHasSource(photoRecord)) {
    if (options.interactive) {
      return \`<button type="button" class="\${escapeHtml(className)}" data-action="view-media" data-media-type="image/jpeg" data-media-name="\${escapeHtml(\`\${name} profile photo\`)}" aria-label="View \${escapeHtml(name)} photo"\${attrs}>\${image}\${initials}</button>\`;
    }
    return \`<span class="\${escapeHtml(className)}"\${attrs} aria-hidden="true">\${image}\${initials}</span>\`;
  }
  return \`<span class="\${escapeHtml(className)} boarding-dog-photo-thumb-initials" aria-hidden="true">\${escapeHtml(avatarText(name))}</span>\`;
}

function boardingQuickCardHtml(record = {}) {
  const stay = boardingPrimaryStay(record) || {};
  const kennel = boardingKennelLocationLabel(record, stay);
  return \`
    <article class="record-card mobile-roster-card">
      <div class="mobile-roster-card-main boarding-mobile-card-main">
        \${boardingDogMobilePhotoHtml(record)}
        <div class="boarding-mobile-card-content">
          <div class="boarding-card-title-row"><strong>\${escapeHtml(record.dogName || "Boarding dog")}</strong>\${vaccinationStatusBadgeHtml(record)}</div>
          <div class="chip-row">\${stay.id ? boardingStayRequestCodeChipHtml(record, stay) : ""}\${boardingRecordStatusButtonHtml(record)}</div>
          <span>\${escapeHtml(boardingScheduleText(record))}</span>
          \${kennel ? \`<span class="boarding-kennel-label">\${escapeHtml(kennel)}</span>\` : ""}
          <p>\${escapeHtml(record.ownerName || "No owner saved")}\${record.ownerPhone ? \` | \${phoneLinkHtml(record.ownerPhone)}\` : ""}</p>
        </div>
      </div>
      \${boardingQuickActionButtons(record)}
      <span class="inline-save-status" data-inline-status-message="\${escapeHtml(record.id || "")}" aria-live="polite"></span>
    </article>\`;
}

function serviceForStayRequestOption(option = {}, options = {}) {
  const terms = arrayValue(option.matchTerms).map(normalizedServiceLookupText).filter(Boolean);
  const services = serviceCatalogForStayRequests(options);
  return services.find((service) => terms.includes(normalizedServiceLookupText(service.serviceName)))
    || services.find((service) => {
      const name = normalizedServiceLookupText(service.serviceName);
      return terms.some((term) => name.includes(term) || term.includes(name));
    })
    || null;
}

function stayRequestOptionSnapshot(option = {}, options = {}) {
  const service = serviceForStayRequestOption(option, options) || {};
  const pricingError = service.id ? servicePriceError(service, service.serviceName || option.fallbackServiceName || "Service") : "";
  const unitPrice = service.id && !pricingError ? servicePriceValue(service) : 0;
  return {
    id: service.id || "",
    serviceId: service.id || "",
    serviceName: service.serviceName || option.fallbackServiceName || boardingServiceTaskDisplayName(option.value),
    label: option.value || "Service requested",
    category: service.category || "",
    unit: service.unit || "",
    quantity: 1,
    unitPrice,
    pricingError,
  };
}

function stayRequestMatchesOption(request = {}, option = {}) {
  const requestLabel = normalizedServiceLookupText(boardingStayRequestLabel(request));
  const requestName = normalizedServiceLookupText(boardingServiceTaskDisplayName(request));
  const optionValue = normalizedServiceLookupText(option.value);
  if (requestLabel === optionValue || requestName === optionValue) return true;
  return arrayValue(option.matchTerms).map(normalizedServiceLookupText).filter(Boolean).some((term) => requestLabel.includes(term) || requestName.includes(term));
}

function stayRequestMatchesService(request = {}, service = {}, options = {}) {
  if (!service?.id) return false;
  const item = request && typeof request === "object" ? request : {};
  const requestServiceId = item.serviceId || item.id || "";
  if (requestServiceId && requestServiceId === service.id) return true;
  const matched = serviceCatalogMatchForRequest(request, options);
  if (matched?.id === service.id) return true;
  const requestName = normalizedServiceLookupText(item.serviceName || boardingServiceTaskDisplayName(request));
  const serviceName = normalizedServiceLookupText(service.serviceName || "");
  if (!requestName || !serviceName) return false;
  return requestName === serviceName || requestName.includes(serviceName) || serviceName.includes(requestName);
}

function boardingStayRequestServiceCatalog(record = {}, stay = {}) {
  const user = boardingPricingUserForRecord(record);
  return serviceCatalogForStayRequests({ user })
    .sort((a, b) => [
      a.category || "",
      serviceDependencyId(a) ? serviceDependencyId(a) : "",
      serviceDependencyId(a) ? "1" : "0",
      customerServiceDisplayName(a),
    ].join("|").localeCompare([
      b.category || "",
      serviceDependencyId(b) ? serviceDependencyId(b) : "",
      serviceDependencyId(b) ? "1" : "0",
      customerServiceDisplayName(b),
    ].join("|")));
}

function stayRequestQuantityForService(service = {}, requests = [], user = currentUser) {
  const request = arrayValue(requests).find((item) => stayRequestMatchesService(item, service, { user }));
  return boardingServiceTaskQuantity(request || {});
}

function stayRequestQuantityForOption(option = {}, requests = []) {
  const request = arrayValue(requests).find((item) => stayRequestMatchesOption(item, option));
  return boardingServiceTaskQuantity(request || {});
}

function stayRequestServiceCheckboxHtml(service = {}, requests = [], user = currentUser, options = {}) {
  const checked = requests.some((request) => stayRequestMatchesService(request, service, { user }));
  const label = \`\${customerServiceDisplayName(service)} requested\`;
  const unitPrice = stayRequestServiceUnitPriceForUser(service, user);
  const price = unitPrice ? \` - \${money(unitPrice)}\${service.unit ? \` \${service.unit}\` : ""}\` : "";
  const quantity = stayRequestQuantityForService(service, requests, user);
  const linkedNote = options.linkedParent
    ? \`<span class="stay-request-linked-note">Linked to \${escapeHtml(customerServiceDisplayName(options.linkedParent))}</span>\`
    : "";
  const className = \`service-option stay-request-service-option\${options.linked ? " stay-request-linked-label" : ""}\`;
  return \`<label class="\${className}"><span class="service-option-label"><input type="checkbox" name="stayRequests" value="\${escapeHtml(label)}" data-service-id="\${escapeHtml(service.id || "")}" data-service-name="\${escapeHtml(service.serviceName || "")}" data-unit-price="\${escapeHtml(unitPrice)}" data-unit="\${escapeHtml(service.unit || "")}" \${checked ? "checked" : ""} /> <span class="service-option-copy"><span class="service-option-text">\${escapeHtml(label)}\${escapeHtml(price)}</span>\${linkedNote}</span></span><input class="service-quantity" type="number" name="stayRequestQuantity-\${escapeHtml(service.id || normalizedServiceLookupText(service.serviceName || label))}" min="1" step="1" value="\${escapeHtml(quantity || 1)}" \${checked ? "" : "disabled"} aria-label="\${escapeHtml(customerServiceDisplayName(service))} quantity" /></label>\`;
}

function stayRequestCheckboxesHtml(stay = {}, record = {}) {
  const requests = arrayValue(stay.requests);
  const user = boardingPricingUserForRecord(record);
  const activeServices = boardingStayRequestServiceCatalog(record, stay);
  if (activeServices.length) {
    const parentServices = activeServices.filter((service) => !serviceDependencyId(service));
    const parentIds = new Set(parentServices.map((service) => service.id).filter(Boolean));
    const linkedServices = activeServices.filter((service) => serviceDependencyId(service));
    const linkedByParent = new Map();
    linkedServices.forEach((service) => {
      const parentId = serviceDependencyId(service);
      if (!linkedByParent.has(parentId)) linkedByParent.set(parentId, []);
      linkedByParent.get(parentId).push(service);
    });
    const parentHtml = parentServices
      .map((service) => {
        const childHtml = (linkedByParent.get(service.id) || [])
          .map((childService) => stayRequestServiceCheckboxHtml(childService, requests, user, { linked: true, linkedParent: service }))
          .join("");
        return \`<div class="stay-request-service-group">\${stayRequestServiceCheckboxHtml(service, requests, user)}\${childHtml ? \`<div class="stay-request-linked-options"><span class="stay-request-linked-heading">Linked add-ons</span>\${childHtml}</div>\` : ""}</div>\`;
      })
      .join("");
    const orphanHtml = linkedServices
      .filter((service) => !parentIds.has(serviceDependencyId(service)))
      .map((service) => stayRequestServiceCheckboxHtml(service, requests, user))
      .join("");
    return \`\${parentHtml}\${orphanHtml}\`;
  }
  return stayRequestServiceOptions
    .map((option) => {
      const snapshot = stayRequestOptionSnapshot(option, { user });
      const checked = requests.some((request) => stayRequestMatchesOption(request, option));
      const price = snapshot.unitPrice ? \` - \${money(snapshot.unitPrice)}\${snapshot.unit ? \` \${snapshot.unit}\` : ""}\` : "";
      const quantity = stayRequestQuantityForOption(option, requests);
      const quantityKey = snapshot.serviceId || normalizedServiceLookupText(snapshot.serviceName || option.value);
      return \`<label class="service-option stay-request-service-option"><span class="service-option-label"><input type="checkbox" name="stayRequests" value="\${escapeHtml(option.value)}" data-service-id="\${escapeHtml(snapshot.serviceId || "")}" data-service-name="\${escapeHtml(snapshot.serviceName || "")}" data-unit-price="\${escapeHtml(snapshot.unitPrice || 0)}" data-unit="\${escapeHtml(snapshot.unit || "")}" \${checked ? "checked" : ""} /> <span class="service-option-copy"><span class="service-option-text">\${escapeHtml(option.value)}\${escapeHtml(price)}</span></span></span><input class="service-quantity" type="number" name="stayRequestQuantity-\${escapeHtml(quantityKey)}" min="1" step="1" value="\${escapeHtml(quantity || 1)}" \${checked ? "" : "disabled"} aria-label="\${escapeHtml(snapshot.serviceName || option.value)} quantity" /></label>\`;
    })
    .join("");
}

function boardingStayEstimatedTotal(record = {}, existingStay = {}, selectedRequests = []) {
  const snapshot = boardingPricingSnapshotForStay(record, { ...existingStay, requests: selectedRequests }, { forceCurrentPricing: true, preferCatalogPricing: true });
  return snapshot.total;
}

function boardingStayBillingAdjustmentFieldsHtml(stay = {}) {
  const other = invoiceAdjustmentByKey(stay.invoiceAdjustments, "other");
  const discount = invoiceAdjustmentByKey(stay.invoiceAdjustments, "discount");
  return \`<section class="popup-record-section billing-adjustment-section">
    <h3>Billing Adjustments</h3>
    <div class="field-grid">
      <label><span class="field-label-text"><span>Other amount</span></span><input type="number" name="otherChargeAmount" min="0" step="0.01" value="\${escapeHtml(other.amount || "")}" /></label>
      <label><span class="field-label-text"><span>Other reason</span></span><input type="text" name="otherChargeReason" value="\${escapeHtml(other.reason || "")}" placeholder="Reason shown to the customer" /></label>
      <label><span class="field-label-text"><span>Discount amount</span></span><input type="number" name="discountAmount" min="0" step="0.01" value="\${escapeHtml(discount.amount || "")}" /></label>
      <label><span class="field-label-text"><span>Discount reason</span></span><input type="text" name="discountReason" value="\${escapeHtml(discount.reason || "")}" placeholder="Reason shown to the customer" /></label>
    </div>
  </section>\`;
}

function boardingStayLocationFieldsHtml(stay = {}) {
  const locations = kennelLocations({ activeOnly: true });
  const selectedLocation = locations.find((location) => location.id === stay.kennelLocationId);
  const selectedBuilding = stay.kennelBuilding || selectedLocation?.building || "";
  const buildings = [...new Set([...kennelBuildings(locations), selectedBuilding].filter(Boolean))];
  const buildingOptions = buildings.length
    ? \`<option value="">No building assigned</option>\${buildings.map((building) => \`<option value="\${escapeHtml(building)}" \${building === selectedBuilding ? "selected" : ""}>\${escapeHtml(building)}</option>\`).join("")}\`
    : \`<option value="">No active buildings saved</option>\`;
  const matchingLocations = selectedBuilding ? locations.filter((location) => (location.building || "") === selectedBuilding) : [];
  const locationOptions = selectedBuilding ? kennelLocationOptionsForBuilding(selectedBuilding, stay.kennelLocationId || "") : "";
  const help = locations.length
    ? "Optional. This kennel assignment is saved on this boarding stay only."
    : "Add active kennel locations in Settings before assigning a stay location.";
  return \`<div class="field-grid">
    <label>Building<select name="kennelBuilding" id="boardingStayLocationBuilding" \${locations.length ? "" : "disabled"}>\${buildingOptions}</select><small>\${escapeHtml(help)}</small></label>
    <label>Kennel<select name="kennelLocationId" id="boardingStayLocationId" \${selectedBuilding && matchingLocations.length ? "" : "disabled"}><option value="">No kennel assigned</option>\${locationOptions}</select><small id="boardingStayLocationHelp">\${selectedBuilding ? (matchingLocations.length ? "Available active kennels for this building." : "No active kennels are saved for this building.") : "Choose a building first."}</small></label>
  </div>\`;
}

function updateBoardingStayLocationOptions(formEl) {
  if (!formEl) return;
  const building = formEl.elements.kennelBuilding?.value || "";
  const locations = kennelLocations({ activeOnly: true }).filter((location) => (location.building || "") === building);
  const locationSelect = formEl.elements.kennelLocationId;
  const help = $("#boardingStayLocationHelp");
  if (!locationSelect) return;
  locationSelect.innerHTML = \`<option value="">No kennel assigned</option>\${building ? kennelLocationOptionsForBuilding(building) : ""}\`;
  locationSelect.disabled = !building || !locations.length;
  if (help) help.textContent = building ? (locations.length ? "Available active kennels for this building." : "No active kennels are saved for this building.") : "Choose a building first.";
}

function boardingStayRateRoleFieldHtml(record = {}, stay = {}) {
  if (isServiceRequestStay(record, stay)) return "";
  const ratePlan = boardingRatePlanForRecord(record);
  if (!ratePlan.isMemberPricing) return "";
  const role = boardingCurrentDogRoleForStay(stay, ratePlan);
  const sharedHelp = ratePlan.sharedCrateRateConfig?.ok
    ? \`Shared-crate additional dog rate: \${money(ratePlan.sharedCrateRate)} \${escapeHtml(ratePlan.sharedCrateRateConfig.unit || "per night")}.\`
    : "No active shared-crate additional dog rate is configured in Services & Pricing.";
  return \`<label>Boarding rate role<select name="boardingRateRole"><option value="primary" \${role !== "shared-crate-additional" ? "selected" : ""}>Primary dog/crate</option><option value="shared-crate-additional" \${role === "shared-crate-additional" ? "selected" : ""}>Shared-crate additional dog</option></select><small>\${sharedHelp}</small></label>\`;
}

function boardingStayRateServiceFieldHtml(record = {}, stay = {}) {
  if (isServiceRequestStay(record, stay)) return "";
  const ratePlan = boardingRatePlanForRecord(record);
  const role = boardingCurrentDogRoleForStay(stay, ratePlan);
  const services = boardingRateSelectionServices(record, stay, {
    currentDogRole: role,
    ratePlan,
    pricingScope: ratePlan.customerPricingScope,
  });
  const savedServiceId = stay.stayProgramId
    || stay.pricingSnapshot?.stayProgramId
    || (!boardingStayHasProgramPricingSignal(stay) ? stay.pricingSnapshot?.boardingRateServiceId || "" : "");
  const defaultServiceId = role === "shared-crate-additional" ? ratePlan.sharedCrateRateConfig?.serviceId || "" : ratePlan.primaryRateConfig?.serviceId || "";
  const currentServiceId = boardingRateSelectionCurrentServiceId(stay, services);
  const selectedServiceId = [savedServiceId, currentServiceId, defaultServiceId].find((serviceId) => serviceId && services.some((service) => service.id === serviceId)) || "";
  const optionsHtml = services.map((service) => {
    const price = servicePriceValue(service);
    const priceText = Number.isFinite(price) ? \` - \${money(price)} \${service.unit || "per night"}\` : "";
    const serviceScope = boardingRateServicePricingScope(service);
    const scopeText = serviceScope === "member" ? "Member" : serviceScope === "all" ? "All customers" : "Non-member";
    return \`<option value="\${escapeHtml(service.id)}" \${service.id === selectedServiceId ? "selected" : ""}>\${escapeHtml(service.serviceName || "Boarding rate")}\${escapeHtml(priceText)} | \${escapeHtml(scopeText)}</option>\`;
  }).join("");
  const help = services.length
    ? "Choose the active boarding price that applies to this stay."
    : "No matching active boarding prices are available in Services & Pricing for this customer.";
  return \`<label>Boarding price<select name="boardingRateServiceId" \${services.length ? "" : "disabled"}><option value="">Use default boarding price</option>\${optionsHtml}</select><small>\${escapeHtml(help)}</small></label>\`;
}

function boardingStayFormHtml(record = {}, stay = {}) {
  const explicitRequestCode = String(stay.requestCode || stay.requestId || stay.reservationId || "").trim();
  const isEdit = Boolean(stay.id || explicitRequestCode);
  const serviceOnly = isServiceRequestStay(record, stay);
  const requestCode = isEdit ? boardingStayRequestCode(record, stay) : "";
  const primaryTimeLabel = serviceOnly ? "Requested service time" : "Drop-off time";
  const primaryTimeHelp = serviceOnly ? '<small>Customer-requested time for the service.</small>' : "";
  const completionTimeLabel = serviceOnly ? "Estimated completion / pick-up time" : "Pick-up time";
  const completionTimeHelp = serviceOnly ? '<small>Shown to the customer after approval as the expected pick-up time after service.</small>' : "";
  const notesPlaceholder = serviceOnly ? "Owner instructions or service notes" : "Owner instructions or pickup grooming notes";
  const submitLabel = serviceOnly ? (isEdit ? "Update Service" : "Add Service") : (isEdit ? "Save Boarding Stay" : "Add Boarding Stay");
  const belongings = boardingStayBelongings(stay);
  const belongingsField = serviceOnly ? "" : \`<label>Dog's belongings<textarea name="belongings" rows="3" placeholder="Leash, collar, food, treats, bowls, medication, toys">\${escapeHtml(belongings)}</textarea><small>Shown during ready-for-pickup and checkout review.</small></label>\`;
  return \`
    <form id="boardingStayPopupForm" class="tracker-form" data-dog-id="\${escapeHtml(record.id || "")}">
      <input type="hidden" name="stayId" value="\${escapeHtml(stay.id || "")}" />
      \${requestCode ? \`<input type="hidden" name="requestCode" value="\${escapeHtml(requestCode)}" />\` : ""}
      \${serviceOnly ? '<input type="hidden" name="stayType" value="Service Request" />' : ""}
      \${isEdit ? \`<div class="chip-row">\${boardingStayRequestCodeChipHtml(record, stay)}\${boardingStayStatusChipHtml(record, stay)}\${boardingServiceOnlyChipHtml(record, stay)}</div>\` : ""}
      <div class="field-grid">
        <label>\${primaryTimeLabel}<input type="datetime-local" name="dropoffTime" required value="\${escapeHtml(stay.dropoffTime?.slice(0, 16) || "")}" />\${primaryTimeHelp}</label>
        <label>\${completionTimeLabel}<input type="datetime-local" name="pickupTime" required value="\${escapeHtml(stay.pickupTime?.slice(0, 16) || "")}" />\${completionTimeHelp}</label>
        \${boardingStayRateRoleFieldHtml(record, stay)}
        \${boardingStayRateServiceFieldHtml(record, stay)}
      </div>
      \${serviceOnly ? "" : boardingStayLocationFieldsHtml(stay)}
      <div class="checklist compact">\${stayRequestCheckboxesHtml(stay, record)}</div>
      \${boardingStayBillingAdjustmentFieldsHtml(stay)}
      \${belongingsField}
      <label>Stay notes<textarea name="stayNotes" rows="3" placeholder="\${escapeHtml(notesPlaceholder)}">\${escapeHtml(stay.stayNotes || "")}</textarea></label>
      <div class="button-row"><button type="submit">\${submitLabel}</button></div>
    </form>\`;
}

async function openBoardingStayPopup(record = activeBoardingDog(), stayId = "") {
  if (!record?.id) return;
  const displayRecord = boardingDogWithStayStatus(record);
  const stay = boardingStayByReference(displayRecord, stayId) || {};
  if (!isServiceRequestStay(displayRecord, stay)) await ensureBoardingPricingCatalogLoaded();
  const title = isServiceRequestStay(displayRecord, stay)
    ? \`\${displayRecord.dogName || "Dog"} Service Request\`
    : \`\${displayRecord.dogName || "Boarding Dog"} Boarding Request\`;
  showDetailDialog(title, boardingStayFormHtml(displayRecord, stay));
}

function boardingFoodInstructions(record = {}) {
  return record.foodInstructions || record.foodAmount || record.feedingInstructions || record.feedingPlan || "";
}

function boardingCheckInServices(record = {}, addedServices = [], options = {}) {
  const stay = boardingStatusTargetStay(record, "Checked In", options) || {};
  const requested = arrayValue(stay.requests).map((request) => ({ label: boardingStayRequestDisplayText(request), source: "requested" }));
  const added = (addedServices || []).map((service) => ({
    label: \`\${service.serviceName}\${Number(service.quantity || 1) > 1 ? \` x\${service.quantity}\` : ""} - \${money(Number(service.unitPrice || 0) * Number(service.quantity || 1))}\`,
    source: "added",
  }));
  return [...requested, ...added];
}

function boardingCheckInPhotoHtml(record = {}) {
  const photoRecord = boardingDogPhotoRecord(record);
  const photo = profilePhotoDirectSource(photoRecord);
  const hasPhoto = profilePhotoHasSource(photoRecord);
  const name = record.dogName || "Boarding dog";
  return \`
    <label class="dog-profile-editor checkin-photo-editor" for="boardingCheckInPhotoInput">
      <span class="dog-photo-picker" role="button" tabindex="0"\${profilePhotoAccessAttrs({ ...photoRecord, id: photoRecord.id || record.id, type: photoRecord.type || record.type || "boardingDog" }, "boardingDog")}>
        <img id="boardingCheckInPhotoPreview"\${photo ? \` src="\${escapeHtml(photo)}"\` : ""} alt="\${escapeHtml(name)}" \${photo ? "" : "hidden"} />
        <span id="boardingCheckInPhotoInitials" data-profile-photo-initials \${photo ? "hidden" : ""}>\${escapeHtml(avatarText(name))}</span>
      </span>
      <span>
        <strong>\${escapeHtml(name)}</strong>
        <small>\${hasPhoto ? "Tap to update the profile photo." : "Tap to upload or take a profile photo."}</small>
      </span>
      <input class="visually-hidden-file" id="boardingCheckInPhotoInput" type="file" name="profilePhoto" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" />
    </label>\`;
}

function boardingCheckInHtml(record = {}, nextStatus = "Checked In", options = {}, state = {}) {
  const stay = boardingStatusTargetStay(record, nextStatus, options) || {};
  const formValues = state.formValues || {};
  const addedServices = state.addedServices || [];
  const serviceRows = boardingCheckInServices(record, addedServices, options);
  const foodInstructions = formValues.foodInstructions ?? boardingFoodInstructions(record);
  const belongings = formValues.belongings ?? boardingStayBelongings(stay);
  const earlyCheckIn = Boolean(options.early);
  const scheduledDropoffTime = stay.scheduledDropoffTime || stay.requestedDropoffTime || stay.dropoffTime || "";
  const scheduledPickupTime = stay.scheduledPickupTime || stay.requestedPickupTime || stay.pickupTime || "";
  const billingStartPolicy = formValues.billingStartPolicy || stay.billingStartPolicy || "scheduled";
  const billingChoiceHtml = earlyCheckIn
    ? \`<section class="popup-record-section"><h3>Early check-in billing</h3><p>Actual check-in will be recorded separately. The scheduled request dates stay unchanged.</p><label class="toggle-row"><input type="radio" name="billingStartPolicy" value="scheduled" \${billingStartPolicy !== "actual" ? "checked" : ""} /> Use requested drop-off/scheduled dates</label><label class="toggle-row"><input type="radio" name="billingStartPolicy" value="actual" \${billingStartPolicy === "actual" ? "checked" : ""} /> Bill from actual check-in time</label></section>\`
    : \`<input type="hidden" name="billingStartPolicy" value="scheduled" />\`;
  const dropoffFieldHtml = earlyCheckIn
    ? \`<label>Scheduled drop-off<input type="text" value="\${escapeHtml(formatDateTime(scheduledDropoffTime) || "Not scheduled")}" readonly /><input type="hidden" name="scheduledDropoffTime" value="\${escapeHtml(scheduledDropoffTime)}" /></label><label>Actual check-in<input type="text" value="\${escapeHtml(formatDateTime(new Date().toISOString()))}" readonly /></label>\`
    : \`<label>Drop-off<input type="text" value="\${escapeHtml(formatDateTime(scheduledDropoffTime) || "Not scheduled")}" readonly /><input type="hidden" name="scheduledDropoffTime" value="\${escapeHtml(scheduledDropoffTime)}" /></label>\`;
  const serviceHtml = serviceRows.length
    ? \`<div class="checkin-service-list">\${serviceRows.map((item) => \`<article class="record-card compact-record-card"><strong>\${escapeHtml(item.label)}</strong><span>\${escapeHtml(item.source === "added" ? "Added during check-in" : "Requested by owner")}</span></article>\`).join("")}</div>\`
    : "";
  return \`
    <form id="boardingCheckInForm" class="tracker-form" data-id="\${escapeHtml(record.id || "")}" data-stay-id="\${escapeHtml(stay.id || options.stayId || "")}" data-request-code="\${escapeHtml(options.requestCode || (stay.id ? boardingStayRequestCode(record, stay) : ""))}" data-next-status="\${escapeHtml(nextStatus)}" data-allow-early="\${options.allowEarly ? "true" : "false"}" data-early="\${options.early ? "true" : "false"}">
      <input type="hidden" name="assignKennelAfterCheckIn" value="No" />
      \${boardingCheckInPhotoHtml(record)}
      <div class="field-grid">
        <label>Owner name<input type="text" value="\${escapeHtml(record.ownerName || "")}" readonly /></label>
        <label>Owner phone<input type="tel" value="\${escapeHtml(record.ownerPhone || "")}" readonly /></label>
        \${dropoffFieldHtml}
        <label>Pick-up<input type="text" value="\${escapeHtml(formatDateTime(scheduledPickupTime) || "Not scheduled")}" readonly /><input type="hidden" name="scheduledPickupTime" value="\${escapeHtml(scheduledPickupTime)}" /></label>
      </div>
      \${billingChoiceHtml}
      <label>Food instructions<textarea name="foodInstructions" rows="3" placeholder="Food amount, feeding schedule, medication with meals">\${escapeHtml(foodInstructions)}</textarea></label>
      <label><span class="field-label-text"><span>Dog's belongings</span><span class="required-mark" aria-label="required">*</span></span><textarea name="belongings" rows="3" required placeholder="Leash, collar, food, treats, bowls, medication, toys">\${escapeHtml(belongings)}</textarea></label>
      <section class="popup-record-section">
        <h3>Requested services</h3>
        \${serviceHtml}
        <div class="button-row"><button type="button" class="secondary-button" data-action="open-checkin-service-picker">Add service</button></div>
      </section>
      <div class="button-row"><button type="submit" data-checkin-mode="check-in-only">Check-In only</button><button type="submit" class="secondary-button" data-checkin-mode="assign-kennel">Check-In & Assign Kennel</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>
    </form>\`;
}

function openBoardingCheckInPopup(record = {}, nextStatus = "Checked In", options = {}, state = {}) {
  if (!record?.id) return;
  const existingState = pendingBoardingCheckIn?.dogId === record.id ? pendingBoardingCheckIn : {};
  pendingBoardingCheckIn = {
    dogId: record.id,
    nextStatus,
    options: { ...options },
    addedServices: state.addedServices || existingState.addedServices || [],
    formValues: state.formValues || existingState.formValues || {},
  };
  showDetailDialog(\`\${record.dogName || "Boarding Dog"} Check-In\`, boardingCheckInHtml(record, nextStatus, options, pendingBoardingCheckIn));
}

function boardingCheckInServicePickerHtml(record = {}) {
  const services = activeCheckInServices();
  const selectedIds = new Set((pendingBoardingCheckIn?.addedServices || []).map((service) => service.id));
  return \`
    <form id="boardingCheckInServiceForm" class="tracker-form" data-id="\${escapeHtml(record.id || "")}">
      <section class="popup-record-section">
        <h3>Add service to this stay</h3>
        \${services.length ? services.map((service) => {
          const checked = selectedIds.has(service.id);
          const current = (pendingBoardingCheckIn?.addedServices || []).find((item) => item.id === service.id);
          return \`<label class="service-option"><span><input type="checkbox" name="checkInServices" value="\${escapeHtml(service.id)}" \${checked ? "checked" : ""} /> \${escapeHtml(service.serviceName || "Service")} - \${money(service.basePrice)} \${escapeHtml(service.unit || "")}</span><input class="service-quantity" type="number" name="serviceQuantity-\${escapeHtml(service.id)}" min="1" step="1" value="\${escapeHtml(current?.quantity || 1)}" \${checked ? "" : "disabled"} /></label>\`;
        }).join("") : "<p>No active service items are available.</p>"}
      </section>
      <div class="button-row"><button type="submit">Add Selected Services</button><button type="button" class="secondary-button" data-action="return-to-checkin">Back</button></div>
    </form>\`;
}

function openBoardingCheckInServicePicker() {
  const state = captureBoardingCheckInState();
  const record = boardingDogRecordForDisplay(state?.dogId);
  if (!record) return;
  showDetailDialog("Add Service", boardingCheckInServicePickerHtml(record));
}

async function saveBoardingStayFromForm(formEl) {
  if (!validateForm(formEl, invoiceAdjustmentFormChecks(formEl))) return null;
  const dog = boardingDogRecordForDisplay(formEl.dataset.dogId) || activeBoardingDog();
  if (!dog) {
    showToast("Save the boarding dog first.");
    return null;
  }
  const payload = formPayload(formEl);
  const isServiceRequestPayload = payload.stayType === "Service Request";
  const dropoffDate = parsedCustomerDateTime(payload.dropoffTime || "");
  const pickupDate = parsedCustomerDateTime(payload.pickupTime || "");
  if (!dropoffDate || !pickupDate || pickupDate <= dropoffDate) {
    const targetField = formFieldByName(formEl, !dropoffDate ? "dropoffTime" : "pickupTime");
    const missingTimeMessage = isServiceRequestPayload ? "Requested service time is required." : "Drop-off time is required.";
    const orderingMessage = isServiceRequestPayload ? "Estimated completion time must be after the requested service time." : "Pick-up time must be after drop-off time.";
    if (targetField) setFieldError(targetField, !dropoffDate ? missingTimeMessage : orderingMessage);
    showToast(!dropoffDate ? "Enter a valid " + (isServiceRequestPayload ? "service" : "drop-off") + " time." : orderingMessage);
    return null;
  }
  const draftStayIdentity = {
    dropoffTime: payload.dropoffTime,
    pickupTime: payload.pickupTime,
    stayType: payload.stayType || "",
    requestCode: payload.requestCode || "",
  };
  const existingStay = boardingStayByReference(dog, { stayId: payload.stayId || "", requestCode: payload.requestCode || "" })
    || (!payload.stayId && !payload.requestCode ? (dog.stays || []).find((item) => boardingStayMatchesIdentity(item, draftStayIdentity)) : null);
  const timestamp = new Date().toISOString();
  const existingStayStatus = normalizeBoardingStatus({ boardingStatus: existingStay?.status || "" });
  const existingStayDisplayStatus = existingStay ? boardingStayDisplayStatus(dog, existingStay) : "";
  const shouldAutoApproveStay = !existingStay || (!dog.customerRequest && existingStayStatus === "Pending");
  const shouldRestoreCancelledStay = existingStayDisplayStatus === "Cancelled";
  const restoreActor = shouldRestoreCancelledStay ? boardingTransitionActorPayload() : null;
  const selectedRequests = selectedStayRequestsFromForm(formEl);
  const belongings = String(payload.belongings || "").trim();
  const invoiceAdjustments = invoiceAdjustmentsFromStayForm(formEl, existingStay || {}, timestamp);
  const adjustmentEvents = invoiceAdjustmentEventChanges(existingStay?.invoiceAdjustments || [], invoiceAdjustments, timestamp);
  const location = payload.kennelLocationId
    ? kennelLocations({ activeOnly: true }).find((item) => item.id === payload.kennelLocationId)
    : null;
  const stayType = payload.stayType || existingStay?.stayType || "Boarding";
  const isServiceRequest = stayType === "Service Request";
  const editRatePlan = boardingRatePlanForRecord(dog);
  const boardingRateRole = isServiceRequest ? "" : boardingCurrentDogRoleForStay(existingStay || {}, editRatePlan, {
    currentDogRole: payload.boardingRateRole || existingStay?.pricingSnapshot?.currentDogRole || "",
  });
  const selectedBoardingRateService = isServiceRequest ? null : boardingRateServiceForSelection(dog, existingStay || {}, payload.boardingRateServiceId || "", {
    currentDogRole: boardingRateRole || existingStay?.pricingSnapshot?.currentDogRole || "",
  });
  const selectedStayProgram = boardingStayProgramSnapshotFromService(selectedBoardingRateService);
  const selectedStandardBoardingRateService = selectedStayProgram ? null : selectedBoardingRateService;
  const effectiveStayProgram = isServiceRequest
    ? null
    : selectedStayProgram || (!payload.boardingRateServiceId ? existingStay?.stayProgram || existingStay?.pricingSnapshot?.stayProgram || null : null);
  const draftStay = {
    ...(existingStay || {}),
    dropoffTime: payload.dropoffTime,
    pickupTime: payload.pickupTime,
    stayType,
    requests: selectedRequests,
    invoiceAdjustments,
    stayProgram: effectiveStayProgram,
    stayProgramId: effectiveStayProgram?.id || effectiveStayProgram?.serviceId || "",
    stayProgramName: effectiveStayProgram?.serviceName || effectiveStayProgram?.name || "",
    stayProgramRate: effectiveStayProgram?.rate || effectiveStayProgram?.basePrice || 0,
    belongings,
    checkIn: existingStay?.checkIn ? { ...existingStay.checkIn, belongings } : existingStay?.checkIn || null,
  };
  const pricingSnapshot = boardingPricingSnapshotForStay(dog, draftStay, {
    currentDogRole: boardingRateRole,
    sharedCrateRequested: boardingRateRole === "shared-crate-additional",
    stayProgram: effectiveStayProgram,
    boardingRateService: selectedStandardBoardingRateService,
    boardingRateServiceId: selectedStandardBoardingRateService?.id || (!effectiveStayProgram ? payload.boardingRateServiceId || "" : ""),
  });
  const restoreCancelledStayPatch = shouldRestoreCancelledStay
    ? {
        status: "Approved",
        approvedAt: existingStay?.approvedAt || timestamp,
        approvedBy: existingStay?.approvedBy || restoreActor?.name || currentUser?.name || helperName?.value || "",
        cancelledAt: "",
        cancelledBy: "",
        cancelledByEmail: "",
        cancelledByRole: "",
        cancelledSource: "",
        customerCancellationReason: "",
        customerCancellationAt: "",
        customerCancellationBy: "",
        customerCancellationByEmail: "",
        actualCheckInAt: "",
        actualDropoffAt: "",
        actualPickupAt: "",
        readyForPickupAt: "",
        kennelBuilding: "",
        kennelLocationId: "",
        kennelLocationName: "",
        kennelAssignedAt: "",
        checkIn: null,
      }
    : {};
  const stay = {
    ...existingStay,
    id: payload.stayId || existingStay?.id || uid("stay"),
    createdAt: existingStay?.createdAt || timestamp,
    updatedAt: timestamp,
    source: existingStay?.source || "staff-admin",
    status: shouldAutoApproveStay ? "Approved" : existingStay?.status || "Approved",
    dropoffTime: payload.dropoffTime,
    pickupTime: payload.pickupTime,
    stayType: draftStay.stayType,
    billingDays: pricingSnapshot.billingDays,
    requests: selectedRequests,
    stayNotes: payload.stayNotes,
    belongings,
    checkIn: existingStay?.checkIn ? { ...existingStay.checkIn, belongings } : existingStay?.checkIn || null,
    stayProgram: effectiveStayProgram,
    stayProgramId: effectiveStayProgram?.id || effectiveStayProgram?.serviceId || "",
    stayProgramName: effectiveStayProgram?.serviceName || effectiveStayProgram?.name || "",
    stayProgramRate: effectiveStayProgram?.rate || effectiveStayProgram?.basePrice || 0,
    invoiceAdjustments,
    invoiceEvents: [...arrayValue(existingStay?.invoiceEvents), ...adjustmentEvents],
    pricingSnapshot,
    estimatedTotal: pricingSnapshot.total,
    kennelBuilding: isServiceRequest ? "" : location ? location.building : payload.kennelBuilding || "",
    kennelLocationId: isServiceRequest ? "" : location ? location.id : "",
    kennelLocationName: isServiceRequest ? "" : location ? location.name : "",
    kennelAssignedAt: isServiceRequest ? "" : location ? existingStay?.kennelAssignedAt || timestamp : "",
    ...restoreCancelledStayPatch,
  };
  stay.bathPlan = bathPlanForStay(stay);
  stay.requestCode = payload.requestCode || boardingStayRequestCode(dog, stay);
  stay.serviceTasks = boardingStayServiceTasks(dog, stay);
  const stays = (dog.stays || []).filter((item) => !boardingStayMatchesIdentity(item, stay));
  stays.unshift(stay);
  const currentDogStatus = normalizeBoardingStatus(dog);
  const restoreCancelledStatusUpdates = shouldRestoreCancelledStay
    ? {
        boardingStatus: boardingSummaryStatusFromStays(dog, stays, "Approved"),
        approvedAt: dog.approvedAt || timestamp,
        approvedBy: dog.approvedBy || restoreActor?.name || currentUser?.name || helperName?.value || "",
        cancelledAt: "",
        cancelledBy: "",
        cancelledByEmail: "",
        cancelledByRole: "",
        cancelledSource: "",
        customerCancellationReason: "",
        customerCancellationAt: "",
        customerCancellationBy: "",
        customerCancellationByEmail: "",
        latestCustomerCancellation: null,
        statusHistory: [
          ...(dog.statusHistory || []),
          {
            from: existingStayDisplayStatus,
            to: "Approved",
            stayId: stay.id,
            requestCode: boardingStayRequestCode(dog, stay),
            date: timestamp,
            by: restoreActor?.name || currentUser?.name || helperName?.value || "",
            byEmail: restoreActor?.email || currentUser?.email || helperEmail?.value || "",
            byRole: restoreActor?.role || currentRole(),
            source: restoreActor?.source || "staff",
          },
        ],
        flags: (dog.flags || []).filter((flag) => flag !== "Required update from owner"),
      }
    : {};
  const statusUpdates = !existingStay && ["Pending", "Cancelled", "Checked Out"].includes(currentDogStatus)
    ? {
        boardingStatus: "Approved",
        statusHistory: [...(dog.statusHistory || []), { from: currentDogStatus, to: "Approved", date: timestamp, by: currentUser?.name || helperName?.value || "" }],
      }
    : {};
  const record = upsertRecord("boardingDog", { ...dog, ...statusUpdates, ...restoreCancelledStatusUpdates, stays });
  await sendPayload(record);
  if (shouldRestoreCancelledStay) {
    await addAuditLog("Restored cancelled boarding stay", "boardingDog", record, "Stay ID: " + boardingStayRequestCode(record, stay) + " | Approved");
  }
  if (invoiceAdjustmentsChanged(existingStay?.invoiceAdjustments || [], invoiceAdjustments)) {
    const requestCode = boardingStayRequestCode(record, stay);
    const details = normalizeInvoiceAdjustments(invoiceAdjustments)
      .map((adjustment) => \`\${adjustment.label}: \${money(invoiceAdjustmentSignedAmount(adjustment))} - \${adjustment.reason}\`)
      .join(" | ") || "Adjustments removed";
    await addAuditLog("Updated stay billing adjustments", "boardingDog", record, \`Stay ID: \${requestCode} | \${details}\`);
  }
  if ($("#boardingDogForm")?.elements.id.value === record.id) {
    renderBoardingStays(record);
    renderBoardingHistory(record);
    renderBoardingOwnerAccountPanel(record);
  }
  renderBoardingDogs();
  renderBoardingRequests();
  return record;
}

function renderBoardingQuickCards(records = []) {
  const container = $("#boardingDogQuickCards");
  if (!container) return;
  const actionable = records
    .filter((record) => !["Cancelled", "Checked Out"].includes(boardingDisplayStatus(record)))
    .filter((record) => boardingRecordHasActionableStay(record))
    .sort((a, b) => boardingQuickSortTime(a) - boardingQuickSortTime(b));
  container.innerHTML = actionable.length
    ? actionable.map(boardingQuickCardHtml).join("")
    : \`<article class="record-card mobile-roster-card"><strong>No boarding actions</strong><p>No active check-ins or check-outs match this view.</p></article>\`;
  hydrateProfilePhotoElements(container);
}

function boardingDogIdentityTokens(record = {}) {
  const dogName = normalizedDogIdentityName(record);
  if (!dogName) return [];
  const tokens = new Set();
  const addScoped = (kind = "", value = "") => {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized) tokens.add(\`\${dogName}|\${kind}:\${normalized}\`);
  };
  const addPhone = (kind = "", value = "") => {
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
  [
    record.ownerPhone,
    record.phone,
    record.customerPhone,
    record.requestedByPhone,
    record.emergencyPhone,
  ].forEach((phone) => addPhone("phone", phone));

  if (!tokens.size) addScoped("owner-name", record.ownerName);
  return [...tokens];
}

function boardingDogIdentityKey(record = {}) {
  return boardingDogIdentityTokens(record)[0] || "";
}

function boardingStatusPriority(record = {}) {
  const priorities = {
    "In Kennel": 70,
    "Checked In": 60,
    "Ready For Pickup": 50,
    Approved: 40,
    Pending: 30,
    "Checked Out": 20,
    Cancelled: 10,
  };
  return priorities[boardingDisplayStatus(record)] || 0;
}

function boardingRecordSortTime(record = {}) {
  const stay = currentOrNextStay(record) || activeBoardingStay(record) || (record.stays || [])[0] || {};
  const value = record.updatedAt || stay.updatedAt || stay.dropoffTime || record.submittedAt || 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function boardingStayRequestsForMergedItems(items = [], best = {}) {
  const bestRequests = mergeBoardingStayRequestList(best.stay?.requests || []);
  if (bestRequests.length) return bestRequests;
  const fallback = items.find(({ stay }) => arrayValue(stay.requests).length);
  return fallback ? mergeBoardingStayRequestList(fallback.stay.requests) : [];
}

function boardingStayMergeKey(stay = {}) {
  const sourceIds = boardingStaySourceIds(stay);
  const requestCode = String(stay.requestCode || stay.requestId || stay.reservationId || "").trim();
  if (sourceIds.length) return \`id:\${sourceIds.sort().join("|")}\`;
  if (requestCode) return \`code:\${requestCode}\`;
  const dropoff = String(stay.dropoffTime || "").trim();
  const pickup = String(stay.pickupTime || "").trim();
  if (dropoff || pickup) return \`time:\${dropoff}|\${pickup}\`;
  return JSON.stringify(stay);
}

function boardingStayRequestsKey(stay = {}) {
  return [...new Set(arrayValue(stay.requests)
    .map((item) => (typeof item === "string" ? item : item?.serviceName || item?.label || JSON.stringify(item)))
    .map((item) => String(item || "").trim().toLowerCase())
    .filter(Boolean))]
    .sort()
    .join("|");
}

function boardingStaySemanticMergeKey(record = {}, stay = {}) {
  const dropoff = String(stay.dropoffTime || "").trim();
  const pickup = String(stay.pickupTime || "").trim();
  if (!dropoff && !pickup) return "";
  return [
    "stay-window",
    dropoff,
    pickup,
    String(stay.stayType || record.stayType || "").trim().toLowerCase(),
  ].join("|");
}

function boardingStayMergeKeyForRecord(record = {}, stay = {}) {
  return boardingStaySemanticMergeKey(record, stay) || boardingStayMergeKey(stay);
}

function boardingStaySourceIds(stay = {}) {
  return [...new Set([
    stay.id,
    ...(stay.sourceStayIds || []),
    ...(stay.duplicateStayIds || []),
  ].filter(Boolean).map(String))];
}

function boardingStayRequestCode(record = {}, stay = {}) {
  const existing = boardingStayExplicitRequestCode(stay);
  if (existing) return existing;
  const dateKey = (dateOnly(stay.dropoffTime) || dateOnly(stay.createdAt) || dateOnly(record.submittedAt) || "request").replaceAll("-", "");
  const sourceIds = boardingStaySourceIds(stay);
  const seed = [
    record.id,
    ...(record.sourceRecordIds || []),
    record.linkedCustomerDogId || "",
    record.ownerEmail || record.customerEmail || record.ownerPhone || "",
    record.dogName || "",
    ...sourceIds,
    stay.dropoffTime || "",
    stay.pickupTime || "",
    stay.createdAt || "",
  ].filter(Boolean).join("|");
  return \`BR-\${dateKey.toUpperCase()}-\${shortStableHash(seed || JSON.stringify(stay || record))}\`;
}

function boardingStayExplicitRequestCode(stay = {}) {
  return String(stay.requestCode || stay.requestId || stay.reservationId || "").trim();
}

function boardingStayFreshnessTime(stay = {}) {
  const values = [
    stay.updatedAt,
    stay.statusUpdatedAt,
    stay.approvedAt,
    stay.cancelledAt,
    stay.createdAt,
    stay.submittedAt,
  ];
  for (const value of values) {
    const timestamp = Date.parse(value || "");
    if (!Number.isNaN(timestamp)) return timestamp;
  }
  return 0;
}

function boardingStayRevisionRank(stay = {}) {
  const source = String(stay.source || "").trim().toLowerCase();
  let rank = 0;
  if (source.includes("staff") || source.includes("admin")) rank += 30;
  if (arrayValue(stay.sourceStayIds).length || arrayValue(stay.duplicateStayIds).length) rank += 20;
  if (arrayValue(stay.requests).some((request) => String(request?.source || "").toLowerCase().includes("staff"))) rank += 10;
  return rank;
}

function boardingStayIsFresher(candidate = {}, candidateIndex = 0, current = {}, currentIndex = 0) {
  const candidateRank = boardingStayRevisionRank(candidate);
  const currentRank = boardingStayRevisionRank(current);
  if (candidateRank !== currentRank) return candidateRank > currentRank;
  const candidateTime = boardingStayFreshnessTime(candidate);
  const currentTime = boardingStayFreshnessTime(current);
  if (candidateTime && currentTime && candidateTime !== currentTime) return candidateTime > currentTime;
  if (candidateTime && !currentTime) return true;
  if (!candidateTime && currentTime) return false;
  return candidateIndex > currentIndex;
}

function boardingBestStayMatch(indexedStays = []) {
  const winner = indexedStays.reduce((best, item) => {
    if (!best) return item;
    return boardingStayIsFresher(item.stay, item.index, best.stay, best.index) ? item : best;
  }, null);
  return winner?.stay || null;
}

function dedupeBoardingStaysByExplicitRequestCode(stays = []) {
  const winners = new Map();
  const unkeyed = [];
  arrayValue(stays).forEach((stay, index) => {
    const requestCode = boardingStayExplicitRequestCode(stay);
    if (!requestCode) {
      unkeyed.push({ stay, index });
      return;
    }
    const current = winners.get(requestCode);
    if (!current || boardingStayIsFresher(stay, index, current.stay, current.index)) {
      winners.set(requestCode, { stay, index });
    }
  });
  return [...unkeyed, ...winners.values()]
    .sort((a, b) => a.index - b.index)
    .map((item) => item.stay);
}

function boardingStayCustomerUpdateDedupeKey(record = {}, stay = {}) {
  const source = String(stay.source || "").toLowerCase();
  const groupId = String(stay.requestGroupId || stay.reservationGroupId || stay.familyReservationId || record.requestGroupId || record.reservationGroupId || "").trim();
  if (!groupId || !source.includes("customer")) return "";
  const pickup = String(stay.pickupTime || stay.scheduledPickupTime || stay.requestedPickupTime || "").trim();
  const services = boardingStayRequestsKey(stay);
  if (!pickup && !services) return "";
  return [
    "customer-update",
    String(record.id || record.dogName || "").trim().toLowerCase(),
    groupId,
    String(stay.stayType || "").trim().toLowerCase(),
    pickup,
    services,
    [stay.kennelLocationId, stay.kennelLocationName, stay.kennelBuilding].filter(Boolean).join("|").toLowerCase(),
  ].join("|");
}

function dedupeBoardingStaysForDisplay(record = {}, stays = []) {
  const keyed = new Map();
  const unkeyed = [];
  dedupeBoardingStaysByExplicitRequestCode(stays).forEach((stay, index) => {
    const key = boardingStayCustomerUpdateDedupeKey(record, stay);
    if (!key) {
      unkeyed.push({ stay, index });
      return;
    }
    const current = keyed.get(key);
    if (!current || boardingStayIsFresher(stay, index, current.stay, current.index)) {
      keyed.set(key, { stay, index });
    }
  });
  return [...unkeyed, ...keyed.values()]
    .sort((a, b) => a.index - b.index)
    .map((item) => item.stay);
}

function boardingStayWithRequestCode(record = {}, stay = {}) {
  if (!stay || !Object.keys(stay).length) return stay || {};
  return {
    ...stay,
    requestCode: boardingStayRequestCode(record, stay),
  };
}

function boardingStayById(record = {}, stayId = "") {
  const id = String(stayId || "");
  if (!id) return null;
  return (record.stays || []).find((stay) => boardingStaySourceIds(stay).includes(id)) || null;
}

function boardingStayByReference(record = {}, reference = {}) {
  const normalized = typeof reference === "string"
    ? { stayId: reference }
    : reference || {};
  const stayId = String(normalized.stayId || normalized.id || "").trim();
  const requestCode = String(normalized.requestCode || "").trim();
  const stays = record.stays || [];
  if (stayId) {
    const exact = stays.find((stay) => String(stay.id || "") === stayId);
    if (exact) return exact;
  }
  if (requestCode) {
    const exactCode = boardingBestStayMatch(stays
      .map((stay, index) => ({ stay, index }))
      .filter(({ stay }) => boardingStayRequestCode(record, stay) === requestCode));
    if (exactCode) return exactCode;
  }
  if (stayId) return boardingStayById(record, stayId);
  return null;
}

function boardingStayReferenceFromAction(action = {}) {
  return {
    stayId: action?.dataset?.stayId || action?.dataset?.id || "",
    requestCode: action?.dataset?.requestCode || "",
  };
}

function boardingStaySharesExplicitIdentity(stay = {}, targetStay = {}) {
  const stayIds = boardingStaySourceIds(stay);
  const targetIds = boardingStaySourceIds(targetStay);
  return Boolean(stayIds.length && targetIds.some((id) => stayIds.includes(id)));
}

function boardingStayMatchesIdentity(stay = {}, targetStay = {}) {
  if (!stay || !targetStay) return false;
  if (boardingStaySharesExplicitIdentity(stay, targetStay)) return true;
  const requestCode = boardingStayExplicitRequestCode(stay);
  const targetRequestCode = boardingStayExplicitRequestCode(targetStay);
  if (requestCode && targetRequestCode && requestCode === targetRequestCode) return true;
  const dropoff = String(stay.dropoffTime || "").trim();
  const targetDropoff = String(targetStay.dropoffTime || "").trim();
  const pickup = String(stay.pickupTime || "").trim();
  const targetPickup = String(targetStay.pickupTime || "").trim();
  if (!dropoff && !pickup) return false;
  if (dropoff !== targetDropoff || pickup !== targetPickup) return false;
  const stayType = String(stay.stayType || "").trim().toLowerCase();
  const targetStayType = String(targetStay.stayType || "").trim().toLowerCase();
  return !stayType || !targetStayType || stayType === targetStayType;
}

function boardingStayMergeTime(record = {}, stay = {}) {
  const stayIds = boardingStaySourceIds(stay);
  const statusHistoryTimes = (record.statusHistory || [])
    .filter((item) => item.stayId && stayIds.includes(String(item.stayId)))
    .map((item) => item.date);
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
    stay.submittedAt,
    ...statusHistoryTimes,
  ]
    .map((value) => new Date(value || 0).getTime())
    .filter((value) => !Number.isNaN(value));
  if (values.length) return Math.max(...values);
  const fallback = new Date(stay.dropoffTime || 0).getTime();
  return Number.isNaN(fallback) ? 0 : fallback;
}

function boardingDogWithMergedStays(record = {}) {
  if (!record) return {};
  const stays = dedupeBoardingStaysForDisplay(record, mergeBoardingStays([record], record));
  return {
    ...record,
    sourceRecordIds: record.sourceRecordIds?.length ? record.sourceRecordIds : [record.id].filter(Boolean),
    stays,
  };
}

function boardingDogRecordForDisplay(id = "") {
  if (!id) return null;
  const displayRecord = consolidatedBoardingDogRecords().find((record) => record.id === id || (record.sourceRecordIds || []).includes(id));
  if (displayRecord) return displayRecord;
  const rawRecord = readRecords("boardingDog").find((record) => record.id === id && !record.removed);
  return rawRecord ? boardingDogWithStayStatus(boardingDogWithCanonicalProfile(rawRecord)) : null;
}

function boardingStayEntryForRecord(record = {}, stay = {}) {
  const displayRecord = boardingDogWithStayStatus(record || {});
  const matchedStay = stay?.id ? boardingStayByReference(displayRecord, { stayId: stay.id, requestCode: stay.requestCode || "" }) || stay : stay || {};
  const codedStay = boardingStayWithRequestCode(displayRecord, matchedStay);
  return {
    record: displayRecord,
    stay: codedStay,
    stayId: codedStay.id || "",
    requestCode: codedStay.id ? boardingStayRequestCode(displayRecord, codedStay) : "",
    status: codedStay.id ? boardingStayDisplayStatus(displayRecord, codedStay) : boardingDisplayStatus(displayRecord),
  };
}

function boardingStayEntries(records = []) {
  return records.flatMap((record) => {
    const displayRecord = boardingDogWithStayStatus(record || {});
    const stays = displayRecord.stays?.length ? dedupeBoardingStaysForDisplay(displayRecord, displayRecord.stays) : [{}];
    return stays.map((stay) => boardingStayEntryForRecord(displayRecord, stay));
  });
}

function boardingStayEntryKey(entry = {}) {
  const record = entry.record || {};
  const stay = entry.stay || {};
  const dogKey = boardingDogIdentityTokens(record).sort().join("|")
    || [record.id, ...(record.sourceRecordIds || [])].filter(Boolean).sort().join("|")
    || normalizedDogIdentityName(record);
  const timeKey = boardingStayMergeKeyForRecord(record, stay);
  const sourceKey = boardingStaySourceIds(stay).sort().join("|");
  const explicitRequestCode = boardingStayExplicitRequestCode(stay);
  const stayKey = explicitRequestCode ? \`code:\${explicitRequestCode}\` : timeKey?.startsWith("time:") || timeKey?.startsWith("stay-window|") ? timeKey : sourceKey || entry.requestCode || timeKey;
  return [dogKey, stayKey].filter(Boolean).join("::");
}

function boardingStayEntrySortTime(entry = {}) {
  const stay = entry.stay || {};
  const record = entry.record || {};
  const value = stay.updatedAt || stay.createdAt || stay.dropoffTime || record.submittedAt || record.updatedAt || 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function handleBoardingViewToggle(view = "board") {
  boardingViewMode = ["calendar", "list"].includes(view) ? view : "board";
  $$("#boardingViewToggle [data-view]").forEach((button) => button.classList.toggle("is-active", button.dataset.view === boardingViewMode));
  $("#boardingQueueGroups")?.classList.toggle("is-hidden", boardingViewMode !== "board");
  $("#boardingCalendarView")?.classList.toggle("is-hidden", boardingViewMode !== "calendar");
  $("#boardingDogsPage .table-settings-shell")?.classList.toggle("is-hidden", boardingViewMode !== "list");
  $("#boardingDogQuickCards")?.classList.toggle("is-hidden", boardingViewMode !== "list");
}

function boardingSkeletonCardsHtml(count = 3) {
  return Array.from({ length: count }, () => \`<div class="skeleton-card" aria-hidden="true">
    <div class="skeleton-line is-medium"></div>
    <div class="skeleton-line is-short"></div>
    <div class="skeleton-line is-long"></div>
  </div>\`).join("");
}

function renderBoardingDogs() {
  const mark = efficiencyPerfStart("renderBoardingDogs");
  try {
    const searchInput = $("#boardingDogSearch");
    const query = searchInput?.value || "";
    const allRecords = consolidatedBoardingDogRecords();
    renderBoardingRosterTabs(allRecords);
    const activeView = ["calendar", "list"].includes(boardingViewMode) ? boardingViewMode : "board";
    const queueContainer = $("#boardingQueueGroups");
    const calendarContainer = $("#boardingCalendarView");
    const quickCardsContainer = $("#boardingDogQuickCards");
    const tableHead = $("#boardingDogTableHead");
    const tableBody = $("#boardingDogTableBody");
    const columnManager = $("#boardingDogColumnManager");

    if (!allRecords.length && remoteLoadInProgress) {
      const skeleton = boardingSkeletonCardsHtml();
      if (activeView === "board" && queueContainer) queueContainer.innerHTML = skeleton;
      else if (queueContainer) queueContainer.innerHTML = "";
      if (activeView === "calendar" && calendarContainer) calendarContainer.innerHTML = skeleton;
      else if (calendarContainer) calendarContainer.innerHTML = "";
      if (activeView === "list") {
        if (quickCardsContainer) quickCardsContainer.innerHTML = skeleton;
        if (tableHead) tableHead.innerHTML = "";
        if (tableBody) tableBody.innerHTML = "";
      } else {
        if (quickCardsContainer) quickCardsContainer.innerHTML = "";
        if (tableHead) tableHead.innerHTML = "";
        if (tableBody) tableBody.innerHTML = "";
      }
      if (columnManager) {
        columnManager.innerHTML = "";
        columnManager.hidden = true;
      }
      handleBoardingViewToggle(activeView);
      return;
    }

    if (activeView === "board") {
      renderBoardingQueueGroups(allRecords);
      if (calendarContainer) calendarContainer.innerHTML = "";
      if (tableHead) tableHead.innerHTML = "";
      if (tableBody) tableBody.innerHTML = "";
      if (quickCardsContainer) quickCardsContainer.innerHTML = "";
      if (columnManager) {
        columnManager.innerHTML = "";
        columnManager.hidden = true;
      }
      renderCustomerDogUploadCards();
      handleBoardingViewToggle(activeView);
      return;
    }

    if (queueContainer) queueContainer.innerHTML = "";
    const hasSearchQuery = Boolean(query.trim());
    const matchingRecords = allRecords.filter((record) => boardingDogMatchesSearch(record, query));
    const rosterRecords = hasSearchQuery ? matchingRecords : matchingRecords.filter((record) => boardingDogMatchesRosterFilter(record));
    const filteredRecords = boardingDogPriorityFilter === "vaccines-expiring-soon"
      ? rosterRecords.filter((record) => vaccinationExpiresSoon(record, 30))
      : rosterRecords;
    const records = sortRecordsForTable("boardingDog", filteredRecords);

    if (activeView === "calendar") {
      renderBoardingCalendar(records);
    } else if (calendarContainer) {
      calendarContainer.innerHTML = "";
    }

    if (activeView === "list") {
      const columns = activeColumns("boardingDog");
      if (tableHead) tableHead.innerHTML = \`<tr>\${columns.map((column) => \`<th data-sort-column="\${column.key}" data-table="boardingDog" data-column="\${column.key}" draggable="true" title="Drag to reorder. Double-click to sort.">\${escapeHtml(column.label)}</th>\`).join("")}<th>Actions</th></tr>\`;
      if (tableBody) tableBody.innerHTML = records.length
        ? records
            .map((record) => {
              return \`<tr data-id="\${record.id}" data-source="\${escapeHtml(record.sourceType || record.type || "boardingDog")}">\${columns.map((column) => \`<td>\${boardingTableCellHtml(column, record)}</td>\`).join("")}<td><div class="record-actions table-actions">\${dogTypeBadgeHtml("boardingDog")}\${boardingStatusChipHtml(record)}\${boardingQuickActionButtons(record)}<button type="button" class="secondary-button" data-action="open-boarding-request-tab" data-id="\${escapeHtml(record.id)}">Boarding & Request</button>\${boardingOwnerLinkButtonHtml(record)}<span class="inline-save-status" data-inline-status-message="\${escapeHtml(record.id)}" aria-live="polite"></span></div></td></tr>\`;
            })
            .join("")
        : \`<tr><td colspan="\${(columns.length || 1) + 1}">\${hasSearchQuery ? "No boarding dog records match this search." : \`No \${escapeHtml(boardingRosterFilterLabel(boardingDogRosterFilter)).toLowerCase()} match this search.\`}</td></tr>\`;
      renderBoardingQuickCards(records);
      renderColumnManager("boardingDog", "#boardingDogColumnManager");
    } else {
      if (tableHead) tableHead.innerHTML = "";
      if (tableBody) tableBody.innerHTML = "";
      if (quickCardsContainer) quickCardsContainer.innerHTML = "";
      if (columnManager) {
        columnManager.innerHTML = "";
        columnManager.hidden = true;
      }
    }

    renderCustomerDogUploadCards();
    handleBoardingViewToggle(activeView);
  } finally {
    efficiencyPerfEnd(mark);
  }
}

function boardingStayNeedsDuplicateStatusSync(record = {}, stay = {}, nextStatus = "", options = {}) {
  const status = boardingStayDisplayStatus(record, stay);
  if (status !== nextStatus) return true;
  if (nextStatus === "In Kennel") {
    const kennelLocation = options.kennelLocation || {};
    return Boolean(kennelLocation.id && stay.kennelLocationId !== kennelLocation.id);
  }
  return Boolean(
    stay.kennelLocationId
      || stay.kennelLocationName
      || stay.kennelBuilding
      || stay.kennelAssignedAt
      || record.kennelLocationId
      || record.kennelLocationName
      || record.kennelBuilding
      || record.kennelAssignedAt,
  );
}

async function syncDuplicateBoardingStayStatusRecords(originalRecord = {}, updatedRecord = {}, targetStay = {}, nextStatus = "", options = {}) {
  if (!targetStay?.id || !boardingLifecycleStatuses.includes(nextStatus)) return [];
  const sourceIds = [...new Set([
    originalRecord.id,
    updatedRecord.id,
    ...(originalRecord.sourceRecordIds || []),
    ...(updatedRecord.sourceRecordIds || []),
    ...(targetStay.sourceRecordIds || []),
  ].filter(Boolean))];
  const syncedRecords = [];
  const sourceRecords = readRecords("boardingDog").filter((record) => sourceIds.includes(record.id) && !record.removed && record.id !== updatedRecord.id);
  for (const sourceRecord of sourceRecords) {
    const sourceStay = (sourceRecord.stays || []).find((stay) => boardingStayMatchesIdentity(stay, targetStay));
    if (!sourceStay || !boardingStayNeedsDuplicateStatusSync(sourceRecord, sourceStay, nextStatus, options)) continue;
    const synced = withBoardingStatusTransition(sourceRecord, nextStatus, {
      ...options,
      stayId: sourceStay.id,
      forceStatusSync: true,
    });
    if (!synced) continue;
    const stored = upsertRecord("boardingDog", synced);
    await sendPayload(stored);
    syncedRecords.push(stored);
  }
  return syncedRecords;
}

async function saveBoardingStatusTransition(record = {}, nextStatus = "", options = {}) {
  if (nextStatus === "Checked In" && !options.checkInSubmitted) {
    openBoardingCheckInPopup(record, nextStatus, options);
    return null;
  }
  if (nextStatus === "In Kennel" && !options.kennelLocation) {
    openKennelAssignmentPopup(record, nextStatus, options);
    return null;
  }
  if (shouldPromptBoardingDecline(record, nextStatus, options)) {
    openBoardingDeclineRequestPopup(record, nextStatus, options);
    return null;
  }
  const customerNotificationEvent = boardingCustomerRequestStatusEventName(record, nextStatus, options);
  const serviceReadyNotificationEvent = serviceRequestReadyForPickupEventName(record, nextStatus, options);
  const transitioned = withBoardingStatusTransition(record, nextStatus, options);
  if (!transitioned) {
    showToast("That boarding status transition is not allowed.");
    return null;
  }
  const updated = upsertRecord(
    "boardingDog",
    customerNotificationEvent
      ? customerRequestStatusNotificationRecord(transitioned, nextStatus, options)
      : transitioned,
  );
  await sendPayload(updated);
  if (customerNotificationEvent) await notifyIfNeeded(updated, customerNotificationEvent);
  if (serviceReadyNotificationEvent) {
    await notifyIfNeeded(serviceRequestReadyForPickupNotificationRecord(updated, options), serviceReadyNotificationEvent);
  }
  if (options.stayId) {
    await syncDuplicateBoardingStayStatusRecords(record, updated, boardingStayByReference(record, options) || boardingStayByReference(updated, options), nextStatus, options);
  }
  if (typeof syncBoardingServiceTasksForRecord === "function") {
    await syncBoardingServiceTasksForRecord(updated, { render: false });
  }
  renderBoardingDogs();
  renderBoardingRequests();
  renderCustomerRequests();
  renderDashboard();
  if ($("#boardingDogForm")?.elements.id.value === updated.id) {
    renderBoardingStays(updated);
    renderBoardingHistory(updated);
    renderBoardingKennelLocationControl(updated);
    setDogPhoto("boarding", updated);
  }
  showToast(\`Boarding status updated to \${nextStatus}.\`);
  return updated;
}

async function handleBoardingTransition(record = {}, nextStatus = "", options = {}) {
  if (nextStatus === "Ready For Pickup") {
    openReadyForPickupReview(record, options);
    return null;
  }
  if (nextStatus === "Checked Out") {
    openCheckoutInvoicePopup(record, options);
    return null;
  }
  return saveBoardingStatusTransition(record, nextStatus, options);
}

function boardingRequestStatusFilterStorageKey() {
  const userKey = typeof currentUserNotificationKey === "function" ? currentUserNotificationKey() : "";
  return \`\${stateKeys.boardingRequestStatusFilter}:\${userKey || "default"}\`;
}

function boardingRequestFilterLabel(statuses = []) {
  if (!statuses.length || statuses.length === boardingLifecycleStatuses.length) return "All";
  if (statuses.length === 1) return statuses[0];
  return \`\${statuses.length} statuses\`;
}

function boardingRequestFilterPopupHtml(statuses = readBoardingRequestStatusFilter()) {
  const selected = new Set(statuses);
  return \`<form id="boardingRequestFilterForm" class="tracker-form request-filter-popup">
    <article class="record-card compact-record-card">
      <strong>Boarding request views</strong>
      <p>Select one or more stay statuses. Leave all unchecked to show every boarding request.</p>
    </article>
    <div class="request-filter-options">
      \${boardingLifecycleStatuses.map((status) => \`<label class="toggle-row request-filter-option"><input type="checkbox" name="statuses" value="\${escapeHtml(status)}" \${selected.has(status) ? "checked" : ""} /> <span>\${escapeHtml(status)}</span></label>\`).join("")}
    </div>
    <div class="button-row">
      <button type="submit">Save Filter</button>
      <button type="button" class="secondary-button" data-action="clear-boarding-request-filter">Show All</button>
      <button type="button" class="secondary-button" data-action="close-dialog">Cancel</button>
    </div>
  </form>\`;
}

function saveBoardingRequestFilterFromForm(formEl) {
  const selected = [...formEl.querySelectorAll('input[name="statuses"]:checked')].map((input) => input.value);
  const statuses = writeBoardingRequestStatusFilter(selected);
  syncBoardingRequestFilterUi(statuses);
  renderBoardingRequests();
  $("#detailDialog").close();
  showToast(statuses.length ? "Boarding request filter saved." : "Showing all boarding requests.");
}

function boardingFamilyOwnerKeys(record = {}) {
  const keys = [];
  const explicitId = String(record.householdId || record.familyGroupId || record.familyId || record.customerAccountId || "").trim();
  if (explicitId) keys.push(\`id:\${explicitId}\`);
  [...new Set([record.ownerEmail, record.customerEmail, record.linkedOwnerEmail, record.requestedByEmail].map(normalizeEmail).filter(Boolean))]
    .forEach((email) => keys.push(\`email:\${email}\`));
  [record.ownerPhone, record.customerPhone, record.requestedByPhone]
    .map((phone) => String(phone || "").replace(/\\D/g, ""))
    .filter(Boolean)
    .forEach((phone) => keys.push(\`phone:\${phone}\`));
  const ownerName = String(record.ownerName || record.requestedByName || "").trim().toLowerCase();
  if (ownerName) keys.push(\`name:\${ownerName}\`);
  return [...new Set(keys)];
}

function boardingFamilyOwnerKey(record = {}) {
  return boardingFamilyOwnerKeys(record)[0] || "";
}

function boardingFamilyStayTimeKey(value = "") {
  const raw = String(value || "").trim();
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toISOString().slice(0, 16);
}

function boardingFamilyStayKey(stay = {}) {
  const dropoff = boardingFamilyStayTimeKey(stay.dropoffTime);
  const pickup = boardingFamilyStayTimeKey(stay.pickupTime);
  if (!dropoff || !pickup) return "";
  return \`\${dropoff}|\${pickup}\`;
}

function boardingFamilyExplicitGroupKey(entry = {}) {
  const explicitGroupId = String(entry.stay?.requestGroupId || entry.stay?.reservationGroupId || entry.stay?.familyReservationId || entry.record?.requestGroupId || entry.record?.reservationGroupId || entry.record?.familyReservationId || "").trim();
  return explicitGroupId ? \`group:\${explicitGroupId}\` : "";
}

function boardingFamilyHouseholdStayKeys(entry = {}) {
  const ownerKeys = boardingFamilyOwnerKeys(entry.record || {});
  const stayKey = boardingFamilyStayKey(entry.stay || {});
  if (!stayKey) return [];
  return ownerKeys.map((ownerKey) => \`\${ownerKey}::\${stayKey}\`);
}

function boardingFamilyHouseholdStayKey(entry = {}) {
  return boardingFamilyHouseholdStayKeys(entry)[0] || "";
}

function boardingFamilyGroupKeys(entry = {}) {
  return [...new Set([boardingFamilyExplicitGroupKey(entry), ...boardingFamilyHouseholdStayKeys(entry)].filter(Boolean))];
}

function boardingFamilyGroupKey(entry = {}) {
  return boardingFamilyGroupKeys(entry)[0] || "";
}

function boardingFamilyName(record = {}) {
  const explicit = String(record.householdName || record.familyName || "").trim();
  if (explicit) return boardingFamilyNameLabel(explicit.replace(/\\s+family$/i, ""));
  const ownerName = String(record.ownerName || record.requestedByName || "").trim();
  const parts = ownerName
    .replace(/[,&/]+/g, " ")
    .split(/\\s+/)
    .filter(Boolean);
  if (parts.length) return boardingFamilyNameLabel(parts[parts.length - 1]);
  const emailPrefix = String(record.ownerEmail || record.customerEmail || record.requestedByEmail || "").split("@")[0] || "";
  const emailParts = emailPrefix.split(/[._-]+/).filter(Boolean);
  return emailParts.length ? boardingFamilyNameLabel(emailParts[emailParts.length - 1]) : "Family";
}

function boardingFamilyNameLabel(value = "") {
  const label = String(value || "").trim();
  if (!label) return "Family";
  return label
    .split(/\\s+/)
    .map((part) => part ? \`\${part.charAt(0).toUpperCase()}\${part.slice(1)}\` : "")
    .join(" ");
}

function boardingFamilyStatusSummary(entries = []) {
  const statuses = [...new Set(entries.map((entry) => entry.status).filter(Boolean))];
  if (!statuses.length) return "Status not set";
  return statuses.length === 1 ? statuses[0] : "Mixed statuses";
}

function boardingFamilyMixedStatusHtml(entries = []) {
  const statuses = [...new Set(entries.map((entry) => entry.status).filter(Boolean))];
  if (statuses.length <= 1) return "";
  const details = entries.map((entry) => \`\${entry.record?.dogName || "Dog"}: \${entry.status || "No status"}\`).join(", ");
  return \`<article class="operation-availability-card is-warning"><strong>Mixed family request status</strong><p>\${escapeHtml(details)}</p></article>\`;
}

function boardingFamilyGroupSavedTotal(entries = []) {
  const savedFamilyTotals = entries
    .map(boardingEntrySavedFamilyTotal)
    .filter((value) => Number.isFinite(value) && value > 0);
  if (savedFamilyTotals.length) return savedFamilyTotals[0];
  return entries.reduce((total, entry) => total + boardingStayInvoiceTotal(entry.record || {}, entry.stay || {}), 0);
}

function boardingFamilySharedCrateReviewHtml(entries = []) {
  const activeEntries = entries.filter((entry) => !["Cancelled", "Checked Out"].includes(entry.status));
  if (activeEntries.length <= 1) return "";
  const first = activeEntries[0] || {};
  const ratePlan = boardingRatePlanForRecord(first.record || {});
  if (!ratePlan.isMemberPricing) return "";
  const snapshots = activeEntries.map((entry) => entry.stay?.pricingSnapshot || {});
  const hasSharedRole = snapshots.some((snapshot) => snapshot.sharedCrateRequested || snapshot.currentDogRole === "shared-crate-additional");
  if (hasSharedRole) {
    const grouped = new Map();
    activeEntries.forEach((entry, index) => {
      const snapshot = entry.stay?.pricingSnapshot || {};
      const groupId = snapshot.crateGroupId || "crate-" + Math.floor(index / BOARDING_MAX_DOGS_PER_CRATE + 1);
      if (!grouped.has(groupId)) grouped.set(groupId, []);
      grouped.get(groupId).push(entry);
    });
    const groups = [...grouped.values()].map((group, index) => {
      const dogs = group.map((entry) => entry.record?.dogName || "Dog").join(", ");
      const label = group.length > 1 ? "shared crate pair" : "solo / additional crate";
      return \`<li><strong>Crate \${index + 1}:</strong> \${escapeHtml(dogs)} <span>\${escapeHtml(label)}</span></li>\`;
    }).join("");
    return \`<article class="operation-availability-card is-warning"><strong>Shared-crate review</strong><p>Shared-crate pricing requested. Confirm kennel/crate assignment before approval.</p><ul class="compact-reason-list">\${groups}</ul></article>\`;
  }
  const allPrimary = snapshots.every((snapshot) => !snapshot.currentDogRole || snapshot.currentDogRole === "primary");
  if (!allPrimary) return "";
  const message = ratePlan.sharedCrateRateConfig?.ok
    ? "Same-family group is billed as separate primary crates. Shared-crate pricing is not applied to this stay."
    : "Same-family group is billed as separate primary crates. No active shared-crate additional dog rate is configured in Services & Pricing, so a same-kennel discount cannot be calculated.";
  return \`<article class="operation-availability-card is-warning"><strong>Pricing needs review</strong><p>\${escapeHtml(message)}</p><p>If these dogs are sharing a crate, update the pricing snapshot and confirm kennel/crate assignment before approval.</p></article>\`;
}

function boardingFamilyPricingSnapshots(entries = []) {
  const snapshots = new Map();
  const activeEntries = entries.filter((entry) => boardingStayCanUseCurrentPricing(entry.record || {}, entry.stay || {}));
  if (!activeEntries.length) return snapshots;
  const first = activeEntries[0] || {};
  const firstRecord = first.record || {};
  const firstStay = first.stay || {};
  const ratePlan = boardingRatePlanForRecord(firstRecord);
  const stayProgram = firstStay.stayProgram || firstStay.pricingSnapshot?.stayProgram || null;
  const isServiceRequest = String(firstStay.stayType || firstRecord.stayType || "").trim() === "Service Request";
  const days = isServiceRequest ? 0 : boardingDays(boardingBillableDropoffTime(firstStay), firstStay.pickupTime);
  const hadMemberSnapshot = activeEntries.some((entry) => entry.stay?.pricingSnapshot?.isMemberPricing);
  const explicitSharedCrate = activeEntries.some((entry) => entry.stay?.pricingSnapshot?.sharedCrateRequested);
  const sharedCrateRequested = Boolean(ratePlan.isMemberPricing && !stayProgram && activeEntries.length > 1 && (explicitSharedCrate || !hadMemberSnapshot));
  const useSavedMemberRoles = Boolean(ratePlan.isMemberPricing && activeEntries.some((entry) => entry.stay?.pricingSnapshot?.isMemberPricing && ["primary", "shared-crate-additional"].includes(entry.stay?.pricingSnapshot?.currentDogRole)));
  const lines = useSavedMemberRoles
    ? activeEntries.map((entry) => {
      const record = entry.record || {};
      const savedRole = entry.stay?.pricingSnapshot?.currentDogRole === "shared-crate-additional" ? "shared-crate-additional" : "primary";
      const rate = isServiceRequest ? 0 : savedRole === "shared-crate-additional" ? ratePlan.sharedCrateRate : ratePlan.primaryRate;
      return {
        dogKey: boardingPricingDogKey(record),
        dogId: record.id || "",
        dogName: record.dogName || "Dog",
        role: savedRole,
        rate,
        days,
        total: days * rate,
        sharedCrateRequested,
        crateGroupId: entry.stay?.pricingSnapshot?.crateGroupId || "",
      };
    })
    : boardingDogPricingLines(activeEntries.map((entry) => entry.record || {}), {
      ratePlan,
      days,
      isServiceRequest,
      sharedCrateRequested,
      stayProgram,
    });
  const groupBoardingSubtotal = lines.reduce((total, line) => total + Number(line.total || 0), 0);
  const groupServiceSubtotal = activeEntries.reduce((total, entry) => total + boardingStayRequestTotal(entry.stay?.requests || [], {
    user: boardingPricingUserForRecord(entry.record || {}),
    preferCatalogPricing: true,
  }), 0);
  const groupTotal = groupBoardingSubtotal + groupServiceSubtotal;
  activeEntries.forEach((entry, index) => {
    const record = entry.record || {};
    const stay = entry.stay || {};
    const line = lines[index] || {};
    snapshots.set(entry, boardingCurrentPricingSnapshotForStay(record, stay, {
      forceCurrentPricing: true,
      ratePlan,
      currentDogKey: line.dogKey || boardingPricingDogKey(record),
      currentDogName: line.dogName || record.dogName || "Dog",
      currentDogRole: line.role,
      sharedCrateRequested,
      crateGroupId: line.crateGroupId || "",
      stayProgram,
      groupBoardingSubtotal,
      groupServiceSubtotal,
      groupTotal,
    }));
  });
  return snapshots;
}

function boardingFamilyPricingSnapshotForStay(record = {}, stay = {}) {
  if (!stay?.id || !boardingStayCanUseCurrentPricing(record, stay)) return null;
  const targetEntry = boardingStayEntryForRecord(record, stay);
  const targetKeys = boardingFamilyGroupKeys(targetEntry);
  if (!targetKeys.length) return null;
  const records = consolidatedBoardingDogRecords(readRecords("boardingDog").filter((item) => item.customerRequest && !item.removed));
  const entries = uniqueBoardingStayEntries(boardingStayEntries(records)).filter((entry) => boardingFamilyGroupKeys(entry).some((key) => targetKeys.includes(key)));
  if (entries.length <= 1) return null;
  const snapshots = boardingFamilyPricingSnapshots(entries);
  const recordIds = new Set([record.id, ...(record.sourceRecordIds || [])].filter(Boolean));
  const matchedEntry = entries.find((entry) => {
    const entryRecordIds = [entry.record?.id, ...(entry.record?.sourceRecordIds || [])].filter(Boolean);
    const sameRecord = entryRecordIds.some((id) => recordIds.has(id));
    const sameStay = boardingStaySharesExplicitIdentity(entry.stay || {}, stay) || boardingStayMatchesIdentity(entry.stay || {}, stay);
    return sameRecord && sameStay;
  });
  return matchedEntry ? snapshots.get(matchedEntry) || null : null;
}

function boardingFamilyGroups(entries = []) {
  const groups = new Map();
  const keyToGroup = new Map();
  entries.forEach((entry) => {
    const keys = boardingFamilyGroupKeys(entry);
    if (!keys.length) {
      const singleKey = uid("boarding-family-single");
      groups.set(singleKey, { entries: [entry], keys: [] });
      return;
    }
    const existingGroupKeys = [...new Set(keys.map((key) => keyToGroup.get(key)).filter(Boolean))];
    const groupKey = existingGroupKeys[0] || uid("boarding-family-group");
    if (!groups.has(groupKey)) groups.set(groupKey, { entries: [], keys: [] });
    existingGroupKeys.slice(1).forEach((sourceKey) => {
      const source = groups.get(sourceKey);
      const target = groups.get(groupKey);
      if (!source || !target) return;
      target.entries.push(...source.entries);
      target.keys.push(...source.keys);
      groups.delete(sourceKey);
      keyToGroup.forEach((mappedGroupKey, mappedKey) => {
        if (mappedGroupKey === sourceKey) keyToGroup.set(mappedKey, groupKey);
      });
    });
    const group = groups.get(groupKey);
    group.entries.push(entry);
    group.keys.push(...keys);
    keys.forEach((key) => keyToGroup.set(key, groupKey));
  });
  groups.forEach((group) => {
    group.keys = [...new Set(group.keys)];
  });
  const output = [];
  groups.forEach((group) => {
    const groupEntries = group.entries.filter(Boolean);
    if (groupEntries.length > 1) output.push({ type: "family", entries: groupEntries, groupKey: boardingFamilySharedGroupKey(groupEntries) || group.keys[0] || "" });
    else if (groupEntries[0]) output.push({ type: "single", entry: groupEntries[0] });
  });
  return output;
}

function boardingFamilySharedGroupKey(entries = []) {
  const keyLists = entries.map((entry) => boardingFamilyGroupKeys(entry));
  const firstKeys = keyLists[0] || [];
  return firstKeys.find((key) => keyLists.every((keys) => keys.includes(key))) || firstKeys[0] || "";
}

function boardingRequestCardHtml(entry = {}, options = {}) {
  const record = entry.record || {};
  const stay = entry.stay || {};
  const status = entry.status;
  const serviceOnly = isServiceRequestStay(record, stay);
  const stayAttr = stay.id ? boardingStayDataAttrs(record, stay) : "";
  const pricingSnapshot = options.pricingSnapshot || boardingCurrentPricingSnapshotForStay(record, stay);
  const total = boardingStayInvoiceTotal(record, stay, pricingSnapshot ? { pricingSnapshot } : {});
  const serviceRows = boardingRequestServiceRowsHtml(record, stay);
  const pricingWarning = arrayValue(pricingSnapshot?.pricingErrors).length
    ? \`<p class="service-warning-text">Pricing needs review: \${escapeHtml(arrayValue(pricingSnapshot.pricingErrors).join(" "))}</p>\`
    : "";
  const cancellationAudit = status === "Cancelled" ? boardingCancellationAuditHtml(record, stay) : "";
  const approveAction = status === "Cancelled" ? \`<button type="button" class="secondary-button" data-action="approve-boarding" data-id="\${escapeHtml(record.id)}"\${stayAttr}>Approve Request</button>\` : "";
  const updateOwnerAction = boardingOwnerUpdateButtonHtml(record, stay, { className: "secondary-button boarding-request-primary-button" });
  const changeAction = \`<button type="button" class="secondary-button boarding-request-primary-button" data-action="change-boarding" data-id="\${escapeHtml(record.id)}"\${stayAttr}>Change Request</button>\`;
  const actions = \`<div class="record-actions boarding-request-primary-actions">\${updateOwnerAction}\${changeAction}\${approveAction}</div>\${stay.id ? boardingStayTransitionActions(record, stay, { includeOwnerUpdate: false }) : boardingTransitionActions(record)}\`;
  const familyChip = options.familyName ? \`<span class="status-chip boarding-family-chip">Same family: \${escapeHtml(options.familyName)}</span>\` : "";
  const rateRoleChip = boardingStayRateRoleChipHtml(stay, { familyName: options.familyName });
  return \`<article class="record-card clickable-card boarding-request-card \${serviceOnly ? "is-service-only-request" : ""} \${statusClassForRequest(status)} \${statusClassForBoardingStatus(status)}" data-id="\${escapeHtml(record.id)}"\${stayAttr} data-action="view-boarding-request">
    <div class="boarding-request-card-main">
      \${boardingDogThumbnailHtml(record, { className: "boarding-request-photo", interactive: true })}
      <div class="boarding-request-card-content">
        <strong class="boarding-request-dog-name">\${escapeHtml(record.dogName || "Dog")}</strong>
        <div class="chip-row boarding-request-chip-row">\${dogTypeBadgeHtml("boardingDog")}\${familyChip}\${rateRoleChip}\${stay.id ? boardingStayRequestCodeChipHtml(record, stay) : ""}</div>
        <div class="chip-row boarding-request-chip-row boarding-request-status-row"><button type="button" class="status-chip-button" data-action="open-boarding-request-tab" data-id="\${escapeHtml(record.id)}"\${stayAttr}>\${stay.id ? boardingStayStatusChipHtml(record, stay) : boardingStatusChipHtml(record)}</button>\${stay.id ? boardingStayServiceFlagHtml(record, stay) : ""}</div>
      </div>
    </div>
    <div class="boarding-request-date-row"><span>\${escapeHtml(stayScheduleRangeLabel(record, stay))}</span></div>
    \${serviceRows}
    \${pricingWarning}
    \${boardingRequestEstimatedTotalHtml(total)}
    \${cancellationAudit}
    \${boardingCancellationReasonHtml(record, stay)}
    \${actions}
  </article>\`;
}

function boardingFamilyGroupHtml(entries = [], options = {}) {
  const first = entries[0] || {};
  const firstRecord = first.record || {};
  const firstStay = first.stay || {};
  const familyName = boardingFamilyName(firstRecord);
  const familyTitle = familyName.toLowerCase() === "family" ? "Family Stay" : \`\${familyName} Family Stay\`;
  const dogNames = entries.map((entry) => entry.record?.dogName || "Dog").filter(Boolean);
  const statusSummary = boardingFamilyStatusSummary(entries);
  const groupKey = options.groupKey || boardingFamilySharedGroupKey(entries) || boardingFamilyGroupKey(first);
  const groupTotal = boardingFamilyGroupSavedTotal(entries);
  const canApproveGroup = entries.some((entry) => ["Pending", "Cancelled"].includes(entry.status));
  const canCancelGroup = entries.some((entry) => !["Cancelled", "Checked Out"].includes(entry.status));
  const groupActions = \`<div class="record-actions">\${canApproveGroup ? \`<button type="button" class="secondary-button" data-action="approve-boarding-group" data-group-key="\${escapeHtml(groupKey)}">Approve All</button>\` : ""}\${canCancelGroup ? \`<button type="button" class="secondary-button danger-button" data-action="cancel-boarding-group" data-group-key="\${escapeHtml(groupKey)}">Cancel All</button>\` : ""}</div>\`;
  return \`<section class="boarding-family-group">
    <div class="boarding-family-header">
      <div>
        <strong>\${escapeHtml(familyTitle)}</strong>
        <span>\${escapeHtml(dogNames.join(", "))}</span>
        <p>\${escapeHtml(stayScheduleRangeLabel(firstRecord, firstStay))}</p>
        \${groupTotal ? \`<p><strong>Group total:</strong> \${money(groupTotal)}</p>\` : ""}
      </div>
      <div class="chip-row"><span class="status-chip boarding-family-chip">\${entries.length} dogs</span><span class="status-chip">\${escapeHtml(statusSummary)}</span></div>
    </div>
    \${boardingFamilyMixedStatusHtml(entries)}
    \${boardingFamilySharedCrateReviewHtml(entries)}
    \${groupActions}
    <div class="boarding-family-dogs">\${entries.map((entry) => boardingRequestCardHtml(entry, { familyName })).join("")}</div>
  </section>\`;
}

function boardingRequestEntriesForGroupKey(groupKey = "") {
  if (!groupKey) return [];
  const records = consolidatedBoardingDogRecords(readRecords("boardingDog")
    .filter((record) => record.customerRequest)
    .filter((record) => !record.removed));
  return uniqueBoardingStayEntries(boardingStayEntries(records))
    .filter((entry) => boardingFamilyGroupKeys(entry).includes(groupKey));
}

async function saveBoardingFamilyGroupStatus(groupKey = "", nextStatus = "Approved") {
  // TODO: Move group approve/cancel to a Supabase RPC transaction when boarding_request_groups is fully adopted.
  if (supabaseClient && !localTestMode) await loadRemoteRecords({ render: false, pageId: "boardingDogsPage" });
  const entries = boardingRequestEntriesForGroupKey(groupKey);
  if (!entries.length) {
    showToast("This family request group could not be found.");
    return [];
  }
  if (nextStatus === "Cancelled" && !window.confirm("Cancel every dog in this family request?")) return [];
  const actionableEntries = entries.filter((entry) => {
    if (nextStatus === "Approved") return ["Pending", "Cancelled"].includes(entry.status);
    if (nextStatus === "Cancelled") return !["Cancelled", "Checked Out"].includes(entry.status);
    return false;
  });
  if (!actionableEntries.length) {
    showToast("This family request was already updated by another staff/admin.");
    return [];
  }
  const updated = [];
  for (const entry of actionableEntries) {
    const record = entry.record || {};
    const stay = entry.stay || {};
    const reference = stay.id ? { stayId: stay.id, requestCode: boardingStayRequestCode(record, stay) } : {};
    let result = null;
    if (nextStatus === "Approved") {
      result = stay.id
        ? await approveBoardingStay(record, stay.id, reference)
        : upsertRecord("boardingDog", approveBoardingRecord(record));
      if (!stay.id && result) {
        await sendPayload(result);
        if (typeof syncBoardingServiceTasksForRecord === "function") await syncBoardingServiceTasksForRecord(result, { render: false });
      }
    } else if (nextStatus === "Cancelled") {
      const cancelOptions = {
        ...reference,
        declineSubmitted: true,
        declineNote: "Cancelled by staff for the family request.",
      };
      result = stay.id
        ? await saveBoardingStayStatusTransition(record, stay.id, "Cancelled", cancelOptions)
        : await saveBoardingStatusTransition(record, "Cancelled", cancelOptions);
    }
    if (result) updated.push(result);
  }
  renderBoardingDogs();
  renderBoardingRequests();
  renderCustomerRequests();
  renderDashboard();
  const partial = actionableEntries.length < entries.length;
  showToast(partial
    ? \`Updated \${updated.length} dog\${updated.length === 1 ? "" : "s"}; the rest were already changed by another staff/admin.\`
    : \`Family request \${nextStatus === "Cancelled" ? "cancelled" : "approved"}.\`);
  return updated;
}

function renderBoardingRequests() {
  const mark = efficiencyPerfStart("renderBoardingRequests");
  const list = $("#boardingRequestRecords");
  const section = $("#boardingRequestsSection");
  const isAdmin = currentRole() === "admin";
  if (section) section.hidden = !isAdmin;
  if (!isAdmin) {
    if (list) list.innerHTML = "";
    efficiencyPerfEnd(mark);
    return;
  }
  try {
    if (!list) return;
    const statusFilters = readBoardingRequestStatusFilter();
    syncBoardingRequestFilterUi(statusFilters);
    const records = consolidatedBoardingDogRecords(readRecords("boardingDog")
      .filter((record) => record.customerRequest)
      .filter((record) => !record.removed));
    const entries = uniqueBoardingStayEntries(boardingStayEntries(records))
      .filter((entry) => !statusFilters.length || statusFilters.includes(entry.status))
      .sort((a, b) => boardingStayEntrySortTime(b) - boardingStayEntrySortTime(a));
    list.innerHTML = entries.length
      ? boardingFamilyGroups(entries)
          .map((item) => (item.type === "family" ? boardingFamilyGroupHtml(item.entries, { groupKey: item.groupKey }) : boardingRequestCardHtml(item.entry)))
          .join("")
      : \`<p>No \${statusFilters.length ? statusFilters.join(", ").toLowerCase() + " " : ""}boarding requests yet.</p>\`;
    hydrateProfilePhotoElements(list);
  } finally {
    efficiencyPerfEnd(mark);
  }
}

function activeBoardingStay(record = {}, date = new Date()) {
  const now = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(now.getTime())) return null;
  return (record.stays || []).find((stay) => {
    if (inactiveBoardingStayStatus(stay)) return false;
    const explicitStatus = explicitBoardingStatus(stay.status) || explicitBoardingStatus(record.boardingStatus || record.status);
    if (!activeBoardingStayStatuses.includes(explicitStatus)) return false;
    const dropoff = new Date(boardingActiveWindowStartTime(stay));
    const pickup = new Date(stay.pickupTime);
    if (Number.isNaN(dropoff.getTime()) || Number.isNaN(pickup.getTime())) return false;
    return dropoff <= now && pickup >= now;
  }) || null;
}

function currentOrNextStay(record) {
  const now = new Date();
  return activeBoardingStay(record, now) || [...(record.stays || [])]
    .filter((stay) => !inactiveBoardingStayStatus(stay))
    .sort((a, b) => new Date(a.dropoffTime) - new Date(b.dropoffTime))
    .find((stay) => new Date(stay.pickupTime) >= now) || null;
}

function setBoardingDogActiveTab(tabName = "Dog Info") {
  const tabs = $$("#boardingDogProfileTabs [data-boarding-profile-tab]");
  const sections = $$(".boarding-profile-section[data-boarding-profile-section]");
  const availableTab = tabs.find((button) => button.dataset.boardingProfileTab === tabName && !button.disabled)?.dataset.boardingProfileTab || "Dog Info";
  tabs.forEach((button) => button.classList.toggle("is-active", button.dataset.boardingProfileTab === availableTab));
  sections.forEach((section) => {
    const isActive = section.dataset.boardingProfileSection === availableTab;
    if (section.id === "boardingSchedulePanel" && !activeBoardingDog()?.id) {
      section.hidden = true;
      return;
    }
    section.hidden = !isActive;
  });
}

function renderBoardingVaccinationFiles(record = activeBoardingDog() || {}) {
  const list = $("#boardingDogVaccinationList");
  if (!list) return;
  const files = record.vaccinationRecords || [];
  list.innerHTML = files.length
    ? files.map((file) => {
        const openButton = mediaItemHasOpenableSource(file) ? \`<div class="record-actions"><button type="button" class="secondary-button media-preview-button" data-action="view-media" data-src="\${escapeHtml(file.url || file.dataUrl || "")}" data-media-type="\${escapeHtml(file.type || "")}" data-media-name="\${escapeHtml(file.name || "Health record")}"\${mediaAccessAttrs(file, { sourceRecordId: record.id || file.sourceRecordId || "", sourceRecordType: "boardingDog" })}>Open</button></div>\` : "";
        return \`<article class="record-card compact-record-card"><strong>\${escapeHtml(file.name || "Health record")}</strong><span>\${escapeHtml(formatDateTime(file.savedAt || file.createdAt))}</span>\${file.note ? \`<p>\${escapeHtml(file.note)}</p>\` : ""}\${openButton}</article>\`;
      }).join("")
    : \`<article class="record-card compact-record-card"><strong>No health records uploaded yet.</strong><p>Choose files in this tab, then save the dog profile.</p></article>\`;
}

function renderBoardingCustomerUpdates(record = activeBoardingDog() || {}) {
  const list = $("#boardingCustomerUpdateList");
  if (!list) return;
  const displayRecord = boardingDogWithStayStatus(record || {});
  const activeStays = ownerUpdateStaysForRecord(displayRecord);
  const stayCards = activeStays.length
    ? \`<section class="popup-record-section"><h3>Owner Updates by Stay</h3>\${activeStays.map((stay) => {
        const requestCode = boardingStayRequestCode(displayRecord, stay);
        return \`<article class="record-card compact-record-card customer-update-stay-card"><strong>\${escapeHtml(displayRecord.dogName || "Boarding dog")}</strong><div class="chip-row">\${customerStayIdChipHtml(displayRecord, stay)}\${boardingStayStatusChipHtml(displayRecord, stay)}</div><p>\${escapeHtml(stayScheduleRangeLabel(displayRecord, stay))}</p><div class="record-actions"><button type="button" class="secondary-button" data-action="open-owner-update-for-stay" data-dog-id="\${escapeHtml(displayRecord.id || "")}" data-id="\${escapeHtml(stay.id || "")}" data-request-code="\${escapeHtml(requestCode)}">Update Owner</button></div></article>\`;
      }).join("")}</section>\`
    : \`<article class="record-card compact-record-card"><strong>No in-care stay available.</strong><p>Owner updates can be sent after a stay is checked in, in kennel, or ready for pickup.</p></article>\`;
  const updates = [...(displayRecord.customerUpdates || [])].sort((a, b) => new Date(b.createdAt || b.submittedAt || 0) - new Date(a.createdAt || a.submittedAt || 0));
  const updateHistory = updates.length
    ? updates.map((update) => {
        const stay = boardingStayByReference(displayRecord, { stayId: update.stayId || "", requestCode: update.requestCode || "" }) || {};
        const requestCode = update.requestCode || (stay.id ? boardingStayRequestCode(displayRecord, stay) : "");
        return \`<article class="record-card compact-record-card"><strong>\${escapeHtml(formatDateTime(update.createdAt || update.submittedAt) || "Customer update")}</strong><span>\${escapeHtml([update.byName || update.by || "Staff update", requestCode ? \`Stay ID: \${requestCode}\` : ""].filter(Boolean).join(" | "))}</span><p>\${escapeHtml(update.note || "")}</p><div class="record-actions">\${customerUpdateMediaHtml(update)}</div></article>\`;
      }).join("")
    : \`<article class="record-card compact-record-card"><strong>No customer updates sent yet.</strong><p>Updates sent from a stay will appear here and in the customer Updates menu.</p></article>\`;
  list.innerHTML = \`\${stayCards}<section class="popup-record-section"><h3>Sent Updates</h3>\${updateHistory}</section>\`;
}

function boardingDogDocumentItems(record = {}) {
  const documents = arrayValue(record.documents);
  const legacyDocuments = documents.length ? documents : arrayValue(record.boardingDocuments);
  return legacyDocuments.map((item) => ({
    id: item.id || uid("file"),
    name: item.name || item.fileName || "Boarding dog file",
    type: item.type || item.contentType || "application/octet-stream",
    size: item.size || 0,
    savedAt: item.savedAt || item.uploadedAt || item.createdAt || "",
    url: item.url || "",
    storagePath: item.storagePath || item.path || "",
    dataUrl: item.dataUrl || "",
    originalName: item.originalName || item.name || item.fileName || "",
    originalType: item.originalType || item.type || item.contentType || "",
    originalSize: item.originalSize || item.size || 0,
    optimized: Boolean(item.optimized),
    compression: item.compression || {},
    note: item.note || "",
  }));
}

function boardingDogFileItem(item = {}, source, sourceLabel, options = {}) {
  return {
    id: item.id || uid("file"),
    parentId: options.parentId || "",
    sourceRecordId: options.sourceRecordId || "",
    source,
    sourceLabel,
    name: item.name || item.fileName || options.fallbackName || "Uploaded file",
    type: item.type || item.contentType || "application/octet-stream",
    size: item.size || 0,
    savedAt: item.savedAt || item.uploadedAt || item.createdAt || "",
    url: item.url || "",
    storagePath: item.storagePath || item.path || "",
    dataUrl: item.dataUrl || "",
    originalName: item.originalName || item.name || item.fileName || "",
    originalType: item.originalType || item.type || item.contentType || "",
    originalSize: item.originalSize || item.size || 0,
    optimized: Boolean(item.optimized),
    compression: item.compression || {},
    note: item.note || "",
    canRename: options.canRename !== false,
    canRemove: options.canRemove !== false,
  };
}

function boardingDogFileItems(record = {}) {
  const files = [
    ...boardingDogDocumentItems(record).map((file) => boardingDogFileItem(file, "boardingDocuments", "Staff uploaded file", { sourceRecordId: record.id, canRemove: true })),
    ...arrayValue(record.vaccinationRecords).map((file) => boardingDogFileItem(file, "boardingVaccination", "Health record", { sourceRecordId: record.id, fallbackName: "Health record" })),
    ...arrayValue(record.customerUpdates).flatMap((update) =>
      arrayValue(update.mediaItems).map((file) =>
        boardingDogFileItem(file, "boardingCustomerUpdate", "Customer update media", {
          parentId: update.id || "",
          sourceRecordId: record.id,
          fallbackName: "Customer update media",
        }),
      ),
    ),
  ];
  const linkedDog = linkedCustomerDogForBoarding(record);
  if (linkedDog) {
    files.push(
      ...arrayValue(linkedDog.vaccinationRecords).map((file) =>
        boardingDogFileItem(file, "customerVaccination", "Customer uploaded health record", {
          sourceRecordId: linkedDog.id,
          fallbackName: "Customer health record",
        }),
      ),
      ...arrayValue(linkedDog.documents).map((file) =>
        boardingDogFileItem(file, "customerDocuments", "Customer uploaded file", {
          sourceRecordId: linkedDog.id,
          fallbackName: "Customer file",
        }),
      ),
    );
  }
  return files.sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0));
}

function renderBoardingDogFiles(record = activeBoardingDog() || {}) {
  const list = $("#boardingDogUploadedFileList");
  if (!list) return;
  if (!record?.id) {
    list.innerHTML = "<p>Save this boarding dog before uploading files.</p>";
    return;
  }
  const files = boardingDogFileItems(record);
  list.innerHTML = files.length
    ? files.map((file) => {
        const source = file.url || file.dataUrl || "";
        const savedText = file.savedAt ? \`Uploaded \${formatDateTime(file.savedAt)}\` : "Uploaded date not recorded";
        const sourceText = \`<p>\${escapeHtml(file.sourceLabel)}</p>\`;
        const noteText = file.note ? \`<p>\${escapeHtml(file.note)}</p>\` : "";
        const renameInput = file.canRename ? \`<label>File name<input type="text" value="\${escapeHtml(file.name)}" data-action="rename-boarding-file-input" data-id="\${escapeHtml(file.id)}" data-source="\${escapeHtml(file.source)}" data-parent-id="\${escapeHtml(file.parentId)}" data-source-record-id="\${escapeHtml(file.sourceRecordId)}" /></label>\` : "";
        const renameButton = file.canRename ? \`<button type="button" class="secondary-button" data-action="save-boarding-file-name" data-id="\${escapeHtml(file.id)}" data-source="\${escapeHtml(file.source)}" data-parent-id="\${escapeHtml(file.parentId)}" data-source-record-id="\${escapeHtml(file.sourceRecordId)}">Rename</button>\` : "";
        const removeButton = file.canRemove ? \`<button type="button" class="secondary-button danger-button" data-action="remove-boarding-file" data-id="\${escapeHtml(file.id)}" data-source="\${escapeHtml(file.source)}" data-parent-id="\${escapeHtml(file.parentId)}" data-source-record-id="\${escapeHtml(file.sourceRecordId)}">Remove</button>\` : "";
        const openButton = mediaItemHasOpenableSource(file) ? \`<button type="button" class="secondary-button media-preview-button" data-action="view-media" data-src="\${escapeHtml(source)}" data-media-type="\${escapeHtml(file.type)}" data-media-name="\${escapeHtml(file.name)}"\${mediaAccessAttrs(file, { sourceRecordId: file.sourceRecordId || record.id || "", sourceRecordType: file.sourceRecordType || (file.source?.startsWith("customer") ? "customerDog" : "boardingDog") })}>Open</button>\` : "";
        return \`<article class="record-card compact-record-card dog-file-card" data-file-id="\${escapeHtml(file.id)}"><strong>\${escapeHtml(file.name)}</strong><span>\${escapeHtml(savedText)}</span>\${sourceText}\${noteText}\${renameInput}<div class="record-actions">\${openButton}\${renameButton}\${removeButton}</div></article>\`;
      }).join("")
    : "<p>No uploaded files saved for this boarding dog yet.</p>";
}

async function updateBoardingDogFileName({ source, id, parentId = "", sourceRecordId = "", name = "" } = {}) {
  const nextName = name.trim();
  if (!nextName) {
    showToast("File name cannot be blank.");
    return null;
  }
  if (source === "customerVaccination" || source === "customerDocuments") {
    const customerDog = readRecords("customerDog").find((record) => record.id === sourceRecordId && !record.removed);
    if (!customerDog) return null;
    const key = source === "customerVaccination" ? "vaccinationRecords" : "documents";
    const updated = upsertRecord("customerDog", {
      ...customerDog,
      [key]: arrayValue(customerDog[key]).map((file) => (file.id === id ? { ...file, name: nextName } : file)),
      updatedAt: new Date().toISOString(),
    });
    await sendPayload(updated);
    refreshBoardingDogFileViews(activeBoardingDog() || {});
    showToast("File renamed.");
    return updated;
  }
  const record = readRecords("boardingDog").find((item) => item.id === (sourceRecordId || activeBoardingDog({ raw: true })?.id) && !item.removed);
  if (!record) return null;
  const updates = {};
  if (source === "boardingDocuments") {
    updates.documents = boardingDogDocumentItems(record).map((file) => (file.id === id ? { ...file, name: nextName } : file));
  } else if (source === "boardingVaccination") {
    updates.vaccinationRecords = arrayValue(record.vaccinationRecords).map((file) => (file.id === id ? { ...file, name: nextName } : file));
    updates.vaccinationFiles = updates.vaccinationRecords.map((file) => file.name).join(", ");
  } else if (source === "boardingCustomerUpdate") {
    updates.customerUpdates = arrayValue(record.customerUpdates).map((update) =>
      update.id === parentId
        ? { ...update, mediaItems: arrayValue(update.mediaItems).map((file) => (file.id === id ? { ...file, name: nextName } : file)) }
        : update,
    );
  }
  const updated = upsertRecord("boardingDog", {
    ...record,
    ...updates,
    updatedAt: new Date().toISOString(),
  });
  await sendPayload(updated);
  refreshBoardingDogFileViews(updated);
  showToast("File renamed.");
  return updated;
}

async function updateBoardingDogDocuments(documents = []) {
  const active = activeBoardingDog({ raw: true }) || activeBoardingDog();
  if (!active?.id) {
    showToast("Save the boarding dog before managing files.");
    return null;
  }
  const updated = upsertRecord("boardingDog", {
    ...active,
    documents,
    updatedAt: new Date().toISOString(),
  });
  await sendPayload(updated);
  return refreshBoardingDogFileViews(updated);
}

function boardingDogFileReferenceFromAction(action = {}) {
  return {
    source: action.dataset?.source || "",
    id: action.dataset?.id || "",
    parentId: action.dataset?.parentId || "",
    sourceRecordId: action.dataset?.sourceRecordId || "",
  };
}

function boardingDogFileFromReference(reference = {}, record = activeBoardingDog() || {}) {
  return boardingDogFileItems(record).find((file) =>
    file.id === reference.id
    && file.source === reference.source
    && (file.parentId || "") === (reference.parentId || "")
    && (file.sourceRecordId || "") === (reference.sourceRecordId || "")
  ) || null;
}

function boardingDogFileRemoveConfirmHtml(file = {}, reference = {}) {
  return \`<article class="record-card compact-record-card danger-confirm-card">
    <strong>Remove \${escapeHtml(file.name || "this file")}?</strong>
    <p>This removes the file from \${escapeHtml(file.sourceLabel || "this boarding dog record")}. It does not delete the dog profile or any boarding stays.</p>
  </article>
  <div class="button-row">
    <button type="button" class="danger-button" data-action="confirm-remove-boarding-file" data-id="\${escapeHtml(reference.id || "")}" data-source="\${escapeHtml(reference.source || "")}" data-parent-id="\${escapeHtml(reference.parentId || "")}" data-source-record-id="\${escapeHtml(reference.sourceRecordId || "")}">Remove File</button>
    <button type="button" class="secondary-button" data-action="close-dialog">Cancel</button>
  </div>\`;
}

function openBoardingDogFileRemoveConfirm(reference = {}) {
  const file = boardingDogFileFromReference(reference);
  if (!file) {
    showToast("That file could not be found.");
    return;
  }
  showDetailDialog("Confirm Remove File", boardingDogFileRemoveConfirmHtml(file, reference));
}

async function removeBoardingDogFile(reference = {}) {
  const { source, id, parentId, sourceRecordId } = reference;
  if (!source || !id) return null;
  const timestamp = new Date().toISOString();
  if (source === "customerVaccination" || source === "customerDocuments") {
    const customerDog = readRecords("customerDog").find((record) => record.id === sourceRecordId && !record.removed);
    if (!customerDog) return null;
    const key = source === "customerVaccination" ? "vaccinationRecords" : "documents";
    const nextFiles = arrayValue(customerDog[key]).filter((file) => file.id !== id);
    const updates = { [key]: nextFiles, updatedAt: timestamp };
    if (source === "customerVaccination") updates.vaccinationFiles = nextFiles.map((file) => file.name || file.fileName).filter(Boolean).join(", ");
    const updated = upsertRecord("customerDog", { ...customerDog, ...updates });
    await sendPayload(updated);
    refreshBoardingDogFileViews(activeBoardingDog() || {});
    return updated;
  }
  const record = readRecords("boardingDog").find((item) => item.id === (sourceRecordId || activeBoardingDog({ raw: true })?.id) && !item.removed);
  if (!record) return null;
  const updates = {};
  if (source === "boardingDocuments") {
    updates.documents = boardingDogDocumentItems(record).filter((file) => file.id !== id);
  } else if (source === "boardingVaccination") {
    updates.vaccinationRecords = arrayValue(record.vaccinationRecords).filter((file) => file.id !== id);
    updates.vaccinationFiles = updates.vaccinationRecords.map((file) => file.name || file.fileName).filter(Boolean).join(", ");
  } else if (source === "boardingCustomerUpdate") {
    updates.customerUpdates = arrayValue(record.customerUpdates).map((update) =>
      update.id === parentId
        ? { ...update, mediaItems: arrayValue(update.mediaItems).filter((file) => file.id !== id) }
        : update,
    );
  } else {
    showToast("That file source cannot be removed here.");
    return null;
  }
  const updated = upsertRecord("boardingDog", { ...record, ...updates, updatedAt: timestamp });
  await sendPayload(updated);
  return refreshBoardingDogFileViews(updated);
}

async function saveBoardingCustomerUpdateForStay(record = {}, stay = {}, options = {}) {
  const displayRecord = boardingDogRecordForDisplay(record.id) || record;
  const targetStay = stay?.id ? stay : ownerUpdateStayForRecord(displayRecord, options.reference || {});
  const note = String(options.note || "").trim();
  const input = options.input || null;
  const selectedFileCount = [...(input?.files || [])].filter((file) => file?.name || file?.size).length;
  if (!displayRecord?.id) {
    showToast("Save the boarding dog before adding customer updates.");
    return null;
  }
  if (!targetStay?.id) {
    showToast("Choose a stay before sending a customer update.");
    return null;
  }
  if (!ownerUpdateStayIsAvailable(displayRecord, targetStay)) {
    showToast("Owner updates can only be sent for checked-in, in-kennel, or ready-for-pickup stays.");
    return null;
  }
  if (!note && !selectedFileCount) {
    showToast("Add a note, photo, or video before saving a customer update.");
    return null;
  }
  const timestamp = new Date().toISOString();
  const requestCode = boardingStayRequestCode(displayRecord, targetStay);
  const mediaItems = options.mediaItems || await uploadMediaFiles(input, \`boarding-customer-updates/\${displayRecord.id}/\${targetStay.id}\`, {
    allowedTypes: CUSTOMER_UPDATE_MEDIA_TYPES,
    allowedExtensions: CUSTOMER_UPDATE_MEDIA_EXTENSIONS,
    imagePreset: "generalPhoto",
    label: "customer update media",
  });
  if (!note && !mediaItems.length) {
    showToast("Add a note or upload a valid photo or video before saving a customer update.");
    return null;
  }
  const staff = staffIdentity();
  const update = {
    id: uid("customerUpdate"),
    createdAt: timestamp,
    stayId: targetStay.id || "",
    requestCode,
    stayDropoffTime: targetStay.dropoffTime || "",
    stayPickupTime: targetStay.pickupTime || "",
    stayLabel: targetStay.dropoffTime || targetStay.pickupTime ? stayScheduleRangeLabel(displayRecord, targetStay) : "",
    boardingDogId: displayRecord.id || "",
    dogName: displayRecord.dogName || "",
    note,
    mediaItems,
    byName: staff.name,
    byEmail: staff.email,
  };
  const flags = options.clearOwnerUpdate ? (displayRecord.flags || []).filter((flag) => flag !== "Required update from owner") : displayRecord.flags || [];
  const updated = upsertRecord("boardingDog", {
    ...displayRecord,
    dailyActivity: "",
    flags,
    customerUpdates: [update, ...(displayRecord.customerUpdates || []).filter((item) => item.id !== update.id)],
    latestCustomerUpdate: update,
    updatedAt: timestamp,
  });
  await sendPayload(updated);
  await notifyIfNeeded(updated, "customerStayUpdateSent");
  await mirrorBoardingCustomerUpdateToCustomerDog(updated, update);
  await addAuditLog("Added customer boarding update", "boardingDog", updated, \`\${updated.dogName || "Dog"} | \${requestCode} | \${note || mediaItems.map((item) => item.name).join(", ")}\`);
  if (input) input.value = "";
  renderBoardingCustomerUpdates(updated);
  renderBoardingDogFiles(updated);
  renderBoardingDogs();
  renderCustomerDogs();
  renderCustomerRequests();
  renderCustomerUpdates();
  renderDashboard();
  showToast("Customer update saved.");
  return updated;
}

async function addBoardingCustomerUpdate() {
  const record = activeBoardingDog();
  if (!record?.id) {
    showToast("Save the boarding dog before adding customer updates.");
    return null;
  }
  const formEl = $("#boardingDogForm");
  const note = formEl?.elements.dailyActivity?.value.trim() || "";
  const input = $("#boardingCustomerUpdatePhotoInput");
  const stay = activeBoardingStay(record) || currentOrNextStay(record) || {};
  return saveBoardingCustomerUpdateForStay(record, stay, { note, input });
}

function resetBoardingDogFormForRecord(record = {}) {
  const formEl = $("#boardingDogForm");
  formEl.reset();
  [...formEl.elements].forEach((field) => {
    if (!field.name && field.type !== "file") return;
    if (field.type === "checkbox" || field.type === "radio") {
      field.checked = false;
      return;
    }
    if (field.type === "file") {
      field.value = "";
      return;
    }
    field.value = "";
  });
  selectedDogPhotos.boarding = null;
  setFormValues(formEl, record);
  const combinedStatus = combinedDogSpayNeuterStatus(record);
  if (formEl.elements.spayNeuterStatus) formEl.elements.spayNeuterStatus.value = combinedStatus;
  if (formEl.elements.sex) formEl.elements.sex.value = sexFromCombinedDogSpayNeuterStatus(combinedStatus) || record.sex || "";
  if (formEl.elements.rabiesGoodThreeYears) formEl.elements.rabiesGoodThreeYears.checked = vaccineDurationIsThreeYears(record, "rabies");
  if (formEl.elements.dhppGoodThreeYears) formEl.elements.dhppGoodThreeYears.checked = vaccineDurationIsThreeYears(record, "dhpp");
  formEl.elements.id.value = record.id || "";
  if (formEl.elements.profilePhotoUrl && !record.id) formEl.elements.profilePhotoUrl.value = "";
  if ($("#boardingDogPhotoInput")) $("#boardingDogPhotoInput").value = "";
  if ($("#boardingDogVaccinationFiles")) $("#boardingDogVaccinationFiles").value = "";
  if ($("#boardingCustomerUpdatePhotoInput")) $("#boardingCustomerUpdatePhotoInput").value = "";
  if ($("#boardingDogUploadedFiles")) $("#boardingDogUploadedFiles").value = "";
}

function openBoardingDog(record = {}) {
  record = boardingDogWithCanonicalProfile(record);
  const boardingDogDetail = $("#boardingDogDetail");
  if (boardingDogDetail.parentElement !== document.body) {
    document.body.appendChild(boardingDogDetail);
  }
  boardingDogDetail.hidden = false;
  if (typeof pushAppSurfaceHistory === "function") pushAppSurfaceHistory("boarding-dog-modal");
  document.body.classList.add("boarding-dog-modal-open");
  boardingDogDetail.scrollTop = 0;
  $("#boardingDogDetailTitle").textContent = record.id ? \`Edit \${record.dogName || "Boarding Dog"}\` : "Add Boarding Dog";
  resetBoardingDogFormForRecord(record);
  setDogPhoto("boarding", record);
  $("#boardingSchedulePanel").hidden = !record.id;
  renderBoardingOwnerAccountPanel(record);
  renderBoardingVaccinationFiles(record);
  renderBoardingCustomerUpdates(record);
  renderBoardingDogFiles(record);
  renderBoardingKennelLocationControl(record);
  $$('input[name="boardingFlags"]').forEach((input) => {
    input.checked = (record.flags || []).includes(input.value);
  });
  renderBoardingStays(record);
  renderBoardingHistory(record);
  setBoardingFormLocked(false);
  setBoardingDogActiveTab("Dog Info");
}

function openBoardingDogToTab(record = {}, tabName = "Boarding & Request") {
  if (!record) return;
  openBoardingDog(record);
  setBoardingFormLocked(false);
  setBoardingDogActiveTab(tabName);
}

function setBoardingFormLocked() {
  const formEl = $("#boardingDogForm");
  [...formEl.elements].forEach((field) => {
    if (field.type === "hidden") return;
    if (field.id === "cancelBoardingDogEdit") return;
    field.disabled = false;
  });
  $("#boardingDogPhotoPicker").disabled = false;
  $("#boardingDogSaveButton").hidden = false;
  $("#deleteBoardingDogButton").hidden = !formEl.elements.id.value || currentRole() !== "admin";
  formEl.classList.remove("is-readonly");
  renderBoardingOwnerAccountPanel(activeBoardingDog());
}

function activeBoardingDog(options = {}) {
  const id = $("#boardingDogForm").elements.id.value;
  const raw = readRecords("boardingDog").find((record) => record.id === id && !record.removed);
  return options.raw ? raw : boardingDogRecordForDisplay(id) || raw;
}

function renderBoardingKennelLocationControl(record = activeBoardingDog()) {
  const label = $("#boardingKennelLocationLabel");
  const select = $("#boardingKennelLocationSelect");
  const status = boardingDisplayStatus(record || {});
  if (!label || !select) return;
  const show = status === "In Kennel";
  label.hidden = !show;
  select.disabled = !show || !record?.id;
  const selected = selectedBoardingKennelLocation(record);
  select.innerHTML = \`<option value="">Select kennel location</option>\${kennelLocations({ activeOnly: true })
    .map((location) => \`<option value="\${escapeHtml(location.id)}" \${selected?.id === location.id ? "selected" : ""}>\${escapeHtml([location.building, location.name].filter(Boolean).join(" - "))}</option>\`)
    .join("")}\`;
}

async function updateBoardingKennelLocation(locationId = "") {
  const record = activeBoardingDog();
  if (!record?.id || !locationId) return;
  const location = kennelLocations({ activeOnly: true }).find((item) => item.id === locationId);
  if (!location) return;
  const timestamp = new Date().toISOString();
  const stays = (record.stays || []).map((stay) => {
    const target = activeBoardingStay(record) || currentOrNextStay(record);
    if (target?.id && stay.id !== target.id) return stay;
    return {
      ...stay,
      kennelLocationId: location.id,
      kennelLocationName: location.name,
      kennelBuilding: location.building,
      kennelAssignedAt: stay.kennelAssignedAt || timestamp,
      updatedAt: timestamp,
    };
  });
  const updated = upsertRecord("boardingDog", {
    ...record,
    boardingStatus: "In Kennel",
    kennelLocationId: location.id,
    kennelLocationName: location.name,
    kennelBuilding: location.building,
    kennelAssignedAt: record.kennelAssignedAt || timestamp,
    stays,
    updatedAt: timestamp,
  });
  await sendPayload(updated);
  await addAuditLog("Changed kennel location", "boardingDog", updated, \`\${updated.dogName || "Dog"} | \${location.building || ""} \${location.name || ""}\`.trim());
  renderBoardingKennelLocationControl(updated);
  renderBoardingStays(updated);
  renderBoardingHistory(updated);
  renderBoardingDogs();
  renderCustomerRequests();
  showToast("Kennel location updated.");
}

function renderBoardingStays(record = activeBoardingDog()) {
  const displayRecord = boardingDogWithStayStatus(record || {});
  const stays = dedupeBoardingStaysForDisplay(displayRecord, displayRecord?.stays || []);
  $("#boardingStayHistory").innerHTML = stays.length
    ? stays.map((stay) => {
      const requestCode = boardingStayRequestCode(displayRecord, stay);
      const ownerUpdateButton = boardingOwnerUpdateButtonHtml(displayRecord, stay);
      const serviceOnly = isServiceRequestStay(displayRecord, stay);
      const articleClass = serviceOnly ? "record-card is-service-only-request" : "record-card";
      const editLabel = serviceOnly ? "Edit Service" : "Edit Stay";
      const removeLabel = serviceOnly ? "Remove Service" : "Remove Stay";
      return \`<article class="\${articleClass}"><strong>\${escapeHtml(stayScheduleRangeLabel(displayRecord, stay))}</strong><div class="chip-row">\${boardingStayRequestCodeChipHtml(displayRecord, stay)}\${boardingStayStatusButtonHtml(displayRecord, stay)}\${boardingServiceOnlyChipHtml(displayRecord, stay)}\${boardingStayServiceFlagHtml(displayRecord, stay)}</div><p>\${escapeHtml(boardingStayServicesText(stay, { user: boardingPricingUserForRecord(displayRecord), preferCatalogPricing: true }))}</p>\${boardingStayInvoiceSummaryHtml(displayRecord, stay)}\${boardingStayServiceTaskListHtml(displayRecord, stay, { actions: true })}<p>\${escapeHtml(stay.bathPlan || "")}</p>\${boardingStayBelongingsLineHtml(stay)}<p>\${escapeHtml(stay.stayNotes || "")}</p>\${boardingCancellationAuditHtml(displayRecord, stay)}\${boardingCancellationReasonHtml(displayRecord, stay)}<div class="record-actions"><button type="button" class="secondary-button" data-action="edit-stay" data-id="\${escapeHtml(stay.id)}" data-request-code="\${escapeHtml(requestCode)}">\${editLabel}</button>\${ownerUpdateButton}<button type="button" class="secondary-button danger-button" data-action="remove-stay" data-id="\${escapeHtml(stay.id)}" data-request-code="\${escapeHtml(requestCode)}">\${removeLabel}</button></div></article>\`;
    }).join("")
    : "<p>No boarding stays logged yet.</p>";
}

function boardingStayStatusMenuHtml(record = {}, stay = {}) {
  const status = boardingStayDisplayStatus(record, stay);
  const nextStatuses = boardingStatusTransitions[status] || [];
  const stayAttrs = stay.id ? boardingStayDataAttrs(record, stay) : "";
  const serviceRows = boardingRequestServiceRowsHtml(record, stay);
  const ownerUpdateButton = boardingOwnerUpdateButtonHtml(record, stay);
  const medicalBehaviorButton = boardingMedicalBehaviorButtonHtml(record, stay);
  const serviceOnly = isServiceRequestStay(record, stay);
  const scopeText = serviceOnly ? "Status changes apply only to this service request." : "Status changes apply only to this boarding request/stay.";
  const statusButtons = nextStatuses.map((nextStatus) => \`<button type="button" class="secondary-button" data-action="transition-boarding-stay" data-dog-id="\${escapeHtml(record.id || "")}"\${stayAttrs} data-next-status="\${escapeHtml(nextStatus)}">\${escapeHtml(stayTransitionLabel(status, nextStatus))}</button>\`);
  const buttons = [ownerUpdateButton, medicalBehaviorButton, ...statusButtons].filter(Boolean);
  return \`<section class="popup-record-section">
    <article class="record-card compact-record-card \${serviceOnly ? "is-service-only-request" : ""}">
      <strong>\${escapeHtml(stayScheduleRangeLabel(record, stay))}</strong>
      <div class="chip-row">\${boardingStayRequestCodeChipHtml(record, stay)}\${boardingStayStatusButtonHtml(record, stay, "open-stay-status-menu")}\${boardingServiceOnlyChipHtml(record, stay)}</div>
      <div class="boarding-status-service-summary"><strong>Service requests</strong>\${serviceRows}</div>
      <p>\${escapeHtml(scopeText)}</p>
    </article>
    <div class="record-actions">\${buttons.length ? buttons.join("") : "<p>No status changes are available for this stay.</p>"}</div>
  </section>\`;
}

function boardingMedicalBehaviorButtonHtml(record = {}, stay = {}) {
  if (typeof currentRole === "function" && currentRole() === "customer") return "";
  const stayAttrs = stay?.id ? boardingStayDataAttrs(record, stay) : "";
  return '<button type="button" class="secondary-button" data-action="open-boarding-medical-behavior-note" data-id="' + escapeHtml(record.id || "") + '" data-dog-id="' + escapeHtml(record.id || "") + '"' + stayAttrs + '>Medical/Behavior</button>';
}

function boardingMedicalBehaviorNoteFormHtml(record = {}, stay = {}) {
  const stayAttrs = stay?.id ? boardingStayDataAttrs(record, stay) : "";
  const requestCode = stay?.id ? boardingStayRequestCode(record, stay) : "";
  const staySummary = [requestCode, stayScheduleRangeLabel(record, stay)].filter(Boolean).join(" | ");
  return '<form id="boardingMedicalBehaviorNoteForm" class="tracker-form" data-dog-id="' + escapeHtml(record.id || "") + '"' + stayAttrs + '>' +
    '<article class="record-card compact-record-card">' +
      '<strong>' + escapeHtml(record.dogName || "Boarding dog") + '</strong>' +
      (staySummary ? '<p>' + escapeHtml(staySummary) + '</p>' : '') +
      '<p>Staff-only Medical/Behavior notes are saved to this dog\\'s care history.</p>' +
    '</article>' +
    '<label>Note date<input type="date" name="date" required value="' + escapeHtml(todayDate()) + '" /></label>' +
    '<label>Medical/Behavior note<textarea name="note" rows="5" required placeholder="Medication, medical observation, behavior concern, or staff-only care detail"></textarea></label>' +
    '<div class="button-row"><button type="submit">Save Staff Note</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>' +
  '</form>';
}

function boardingMedicalBehaviorStayForSource(sourceRecord = {}, targetStay = {}, reference = {}) {
  return boardingStayByReference(sourceRecord, reference)
    || arrayValue(sourceRecord.stays).find((stay) => boardingStayMatchesIdentity(stay, targetStay))
    || targetStay
    || {};
}

function boardingMedicalBehaviorLogPayload(record = {}, stay = {}, data = {}) {
  const timestamp = data.timestamp || new Date().toISOString();
  const staff = data.staff || staffIdentity();
  const requestCode = stay?.id ? boardingStayRequestCode(record, stay) : String(data.requestCode || "").trim();
  return {
    id: data.id || uid("boardingCareLog"),
    source: "boarding-medical-behavior-note",
    dogType: "boardingDog",
    dogId: record.id || "",
    dogName: record.dogName || "Boarding dog",
    careType: "Medical/Behavior Note",
    category: "Medical/Behavior",
    type: "Medical/Behavior Note",
    note: String(data.note || "").trim(),
    date: data.date || todayDate(),
    loggedAt: timestamp,
    completedBy: staff.name,
    completedEmail: staff.email,
    completedByEmail: staff.email,
    stayId: stay?.id || data.stayId || "",
    requestCode,
    staffOnly: true,
    visibility: "staff",
  };
}

async function saveBoardingMedicalBehaviorNote(record = {}, reference = {}, data = {}) {
  const displayRecord = boardingDogRecordForDisplay(record.id || reference.dogId || "") || boardingDogWithStayStatus(record || {});
  if (!displayRecord?.id) {
    showToast("This boarding dog record could not be found.");
    return null;
  }
  const note = String(data.note || "").trim();
  if (!note) {
    showToast("Add a Medical/Behavior note before saving.");
    return null;
  }
  const targetStay = boardingStayByReference(displayRecord, reference) || activeBoardingStay(displayRecord) || currentOrNextStay(displayRecord) || {};
  const timestamp = new Date().toISOString();
  const staff = staffIdentity();
  const logId = uid("boardingCareLog");
  const sourceIds = displayRecord.sourceRecordIds?.length ? displayRecord.sourceRecordIds : [displayRecord.id];
  const sourceRecords = readRecords("boardingDog").filter((item) => sourceIds.includes(item.id) && !item.removed);
  const recordsToUpdate = sourceRecords.length ? sourceRecords : [displayRecord];
  const savedRecords = [];
  for (const sourceRecord of recordsToUpdate) {
    const sourceStay = boardingMedicalBehaviorStayForSource(sourceRecord, targetStay, reference);
    const log = boardingMedicalBehaviorLogPayload(sourceRecord, sourceStay, {
      ...data,
      id: logId,
      note,
      timestamp,
      staff,
      requestCode: reference.requestCode || boardingStayRequestCode(displayRecord, targetStay),
      stayId: sourceStay?.id || targetStay?.id || "",
    });
    const updated = upsertRecord("boardingDog", {
      ...sourceRecord,
      careLogs: [log, ...arrayValue(sourceRecord.careLogs).filter((item) => item.id !== logId)],
      updatedAt: timestamp,
    });
    await sendPayload(updated);
    savedRecords.push(updated);
  }
  const refreshed = boardingDogRecordForDisplay(displayRecord.id) || savedRecords[0] || displayRecord;
  if ($("#boardingDogForm")?.elements.id.value && (refreshed.id === $("#boardingDogForm").elements.id.value || sourceIds.includes($("#boardingDogForm").elements.id.value))) {
    renderBoardingHistory(refreshed);
    renderBoardingStays(refreshed);
  }
  renderBoardingDogs();
  renderBoardingRequests();
  renderDashboard();
  await addAuditLog("Logged boarding medical/behavior note", "boardingDog", refreshed, (refreshed.dogName || "Dog") + " | " + (reference.requestCode || logId));
  showToast("Medical/Behavior staff note saved.");
  return refreshed;
}

async function saveBoardingMedicalBehaviorNoteFromForm(formEl) {
  const record = boardingDogRecordForDisplay(formEl.dataset.dogId || formEl.dataset.id || "");
  return saveBoardingMedicalBehaviorNote(record || {}, boardingStayReferenceFromAction(formEl), {
    date: formEl.elements.date?.value || todayDate(),
    note: formEl.elements.note?.value || "",
  });
}

function openBoardingMedicalBehaviorNotePopup(record = activeBoardingDog(), reference = {}) {
  const displayRecord = boardingDogRecordForDisplay(record?.id || reference.dogId || "") || boardingDogWithStayStatus(record || {});
  if (!displayRecord?.id) {
    showToast("This boarding dog record could not be opened.");
    return;
  }
  const stay = boardingStayByReference(displayRecord, reference) || activeBoardingStay(displayRecord) || currentOrNextStay(displayRecord) || {};
  showDetailDialog("Medical/Behavior Staff Note", boardingMedicalBehaviorNoteFormHtml(displayRecord, stay));
}

function openBoardingStayStatusMenu(record = activeBoardingDog(), stayId = "") {
  const displayRecord = boardingDogWithStayStatus(record || {});
  const stay = boardingStayByReference(displayRecord, stayId);
  if (!displayRecord?.id || !stay) {
    showToast("This boarding stay could not be opened.");
    return;
  }
  const title = isServiceRequestStay(displayRecord, stay) ? "Update Service Status" : "Update Stay Status";
  showDetailDialog(title, boardingStayStatusMenuHtml(displayRecord, stay), null, {
    headerAction: {
      label: "Edit Dog",
      action: "open-boarding-dog-editor",
      id: displayRecord.id,
      stayId: stay.id || "",
      requestCode: boardingStayRequestCode(displayRecord, stay),
      tab: "Boarding & Request",
    },
  });
}

async function saveBoardingStayStatusTransition(record = {}, stayId = "", nextStatus = "", reference = {}) {
  const options = typeof reference === "object" ? { ...reference, stayId: reference.stayId || stayId } : { stayId };
  if (!record?.id || !options.stayId || !boardingLifecycleStatuses.includes(nextStatus)) return null;
  const targetStay = boardingStayByReference(record, options);
  if (shouldPromptBoardingDecline(record, nextStatus, options)) {
    openBoardingDeclineRequestPopup(record, nextStatus, options);
    return null;
  }
  const customerNotificationEvent = boardingCustomerRequestStatusEventName(record, nextStatus, options);
  const serviceReadyNotificationEvent = serviceRequestReadyForPickupEventName(record, nextStatus, options);
  const transitioned = withBoardingStatusTransition(record, nextStatus, options);
  if (!transitioned) {
    showToast("That stay status transition is not allowed.");
    return null;
  }
  const updated = upsertRecord("boardingDog", transitioned);
  await sendPayload(updated);
  if (customerNotificationEvent) await notifyIfNeeded(updated, customerNotificationEvent);
  if (serviceReadyNotificationEvent) {
    await notifyIfNeeded(serviceRequestReadyForPickupNotificationRecord(updated, options), serviceReadyNotificationEvent);
  }
  await syncDuplicateBoardingStayStatusRecords(record, updated, targetStay || boardingStayByReference(updated, options), nextStatus, options);
  if (typeof syncBoardingServiceTasksForRecord === "function") {
    await syncBoardingServiceTasksForRecord(updated, { render: false });
  }
  await addAuditLog("Changed boarding stay status", "boardingDog", updated, \`\${updated.dogName || "Dog"} stay \${options.stayId}: \${nextStatus}\`);
  renderBoardingDogs();
  renderBoardingRequests();
  renderCustomerRequests();
  renderDashboard();
  if ($("#boardingDogForm")?.elements.id.value === updated.id) {
    renderBoardingStays(updated);
    renderBoardingHistory(updated);
    renderBoardingKennelLocationControl(updated);
  }
  showToast(\`Stay status updated to \${nextStatus}.\`);
  return updated;
}

async function approveBoardingStay(record = {}, stayId = "", reference = {}) {
  const options = typeof reference === "object" ? { ...reference, stayId: reference.stayId || stayId, forceStatusSync: true } : { stayId, forceStatusSync: true };
  if (!record?.id || !options.stayId) return null;
  const targetStay = boardingStayByReference(record, options);
  if (!targetStay) return null;
  const currentStatus = boardingStayDisplayStatus(record, targetStay);
  const customerNotificationEvent = boardingCustomerRequestStatusEventName(record, "Approved", options);
  const timestamp = new Date().toISOString();
  const transitionActor = boardingTransitionActorPayload(options);
  const transitioned = withBoardingStatusTransition(record, "Approved", options);
  if (!transitioned) return null;
  const updatedStays = (transitioned.stays || []).map((stay) => {
    if (!boardingStayMatchesIdentity(stay, targetStay)) return stay;
    return {
      ...stay,
      requestCode: stay.requestCode || boardingStayRequestCode(record, stay),
      status: "Approved",
      updatedAt: timestamp,
      approvedAt: stay.approvedAt || timestamp,
      approvedBy: stay.approvedBy || currentUser?.name || helperName?.value || "",
      cancelledAt: "",
      cancelledBy: "",
      cancelledByEmail: "",
      cancelledByRole: "",
      cancelledSource: "",
      customerCancellationReason: "",
      customerCancellationAt: "",
      customerCancellationBy: "",
      customerCancellationByEmail: "",
      actualDropoffAt: "",
      actualPickupAt: "",
      readyForPickupAt: "",
      kennelLocationId: "",
      kennelLocationName: "",
      kennelBuilding: "",
      kennelAssignedAt: "",
      checkIn: null,
    };
  });
  const summaryStatus = boardingSummaryStatusFromStays(transitioned, updatedStays, "Approved");
  const approvedRecord = {
    ...transitioned,
    boardingStatus: summaryStatus,
    approvedAt: record.approvedAt || timestamp,
    approvedBy: record.approvedBy || currentUser?.name || helperName?.value || "",
    cancelledAt: "",
    cancelledBy: "",
    cancelledByEmail: "",
    cancelledByRole: "",
    cancelledSource: "",
    customerCancellationReason: "",
    customerCancellationAt: "",
    customerCancellationBy: "",
    customerCancellationByEmail: "",
    latestCustomerCancellation: null,
    kennelLocationId: summaryStatus === "In Kennel" ? transitioned.kennelLocationId || "" : "",
    kennelLocationName: summaryStatus === "In Kennel" ? transitioned.kennelLocationName || "" : "",
    kennelBuilding: summaryStatus === "In Kennel" ? transitioned.kennelBuilding || "" : "",
    kennelAssignedAt: summaryStatus === "In Kennel" ? transitioned.kennelAssignedAt || "" : "",
    stays: updatedStays,
    statusHistory: [
      ...(record.statusHistory || []),
      {
        from: currentStatus,
        to: "Approved",
        stayId: options.stayId,
        requestCode: boardingStayRequestCode(record, targetStay),
        date: timestamp,
        by: transitionActor.name,
        byEmail: transitionActor.email,
        byRole: transitionActor.role,
        source: transitionActor.source,
      },
    ],
    flags: (record.flags || []).filter((flag) => flag !== "Required update from owner"),
  };
  const updated = upsertRecord(
    "boardingDog",
    customerNotificationEvent
      ? customerRequestStatusNotificationRecord(approvedRecord, "Approved", options)
      : approvedRecord,
  );
  await sendPayload(updated);
  if (customerNotificationEvent) await notifyIfNeeded(updated, customerNotificationEvent);
  await syncDuplicateBoardingStayStatusRecords(record, updated, targetStay, "Approved", options);
  if (typeof syncBoardingServiceTasksForRecord === "function") {
    await syncBoardingServiceTasksForRecord(updated, { render: false });
  }
  await addAuditLog("Approved boarding stay", "boardingDog", updated, \`\${updated.dogName || "Dog"} stay \${boardingStayRequestCode(updated, targetStay)}: Approved\`);
  renderBoardingDogs();
  renderBoardingRequests();
  renderCustomerRequests();
  renderDashboard();
  if ($("#boardingDogForm")?.elements.id.value === updated.id) {
    renderBoardingStays(updated);
    renderBoardingHistory(updated);
    renderBoardingKennelLocationControl(updated);
  }
  showToast("Boarding request approved.");
  return updated;
}

function boardingStayLifecycleEvents(record = {}, stay = {}) {
  const events = [];
  const stayIds = boardingStaySourceIds(stay);
  const belongings = boardingStayBelongings(stay);
  const add = (label, date, by, note = "") => {
    if (!date && !note) return;
    events.push({ label, date, by, note });
  };
  add("Boarding request entered", stay.submittedAt || record.submittedAt, record.requestedBy || record.ownerName || record.submittedBy, stay.stayNotes || "");
  add("Request approved", stay.approvedAt || record.approvedAt, stay.approvedBy || record.approvedBy, "");
  add("Checked in", stay.checkedInAt || record.checkedInAt || stay.checkIn?.verifiedAt, stay.checkedInBy || stay.checkIn?.verifiedBy || record.checkedInBy, belongings ? \`Belongings: \${belongings}\` : "");
  add("Placed in kennel", stay.kennelAssignedAt || record.kennelAssignedAt || record.inKennelAt, stay.kennelAssignedBy || record.kennelAssignedBy || record.statusHistory?.find((item) => item.to === "In Kennel")?.by, [stay.kennelBuilding || record.kennelBuilding, stay.kennelLocationName || record.kennelLocationName].filter(Boolean).join(" - "));
  add("Ready for pickup", stay.readyForPickupAt || record.readyForPickupAt, stay.readyForPickupBy || record.statusHistory?.find((item) => item.to === "Ready For Pickup")?.by, "");
  add("Checked out", stay.checkedOutAt || record.checkedOutAt, stay.checkedOutBy || record.statusHistory?.find((item) => item.to === "Checked Out")?.by, record.paymentStatus ? \`Payment: \${record.paymentStatus}\${record.paymentMethod ? \` by \${record.paymentMethod}\` : ""}\` : "");
  (record.statusHistory || []).forEach((item) => {
    if (item.stayId && stayIds.length && !stayIds.includes(String(item.stayId))) return;
    add(\`Status changed: \${item.from || "Unknown"} to \${item.to || "Unknown"}\`, item.date, item.by, item.early ? "Early transition" : "");
  });
  return events.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
}

function boardingStayHistoryPopupHtml(record = {}, stay = {}) {
  const events = boardingStayLifecycleEvents(record, stay);
  return \`<section class="popup-record-section">
    <article class="record-card compact-record-card">
      <strong>\${escapeHtml(record.dogName || "Boarding dog")}</strong>
      <p>\${escapeHtml(stayScheduleRangeLabel(record, stay))}</p>
      <div class="chip-row">\${boardingStayRequestCodeChipHtml(record, stay)}\${boardingStayStatusChipHtml(record, stay)}</div>
    </article>
    \${events.length ? events.map((event) => \`<article class="record-card compact-record-card"><strong>\${escapeHtml(event.label)}</strong><span>\${escapeHtml([formatDateTime(event.date), event.by || ""].filter(Boolean).join(" | "))}</span>\${event.note ? \`<p>\${escapeHtml(event.note)}</p>\` : ""}</article>\`).join("") : "<p>No lifecycle events recorded for this stay yet.</p>"}
  </section>\`;
}

function renderBoardingHistory(record = activeBoardingDog()) {
  const list = $("#boardingHistoryList");
  if (!list) return;
  const displayRecord = boardingDogWithStayStatus(record || {});
  const stays = displayRecord?.stays || [];
  const careLogs = arrayValue(displayRecord.careLogs)
    .filter((log) => !log.removed)
    .sort((a, b) => new Date(b.loggedAt || b.date || 0) - new Date(a.loggedAt || a.date || 0));
  const careLogHtml = careLogs.length
    ? '<section class="popup-record-section"><h3>Care Logs</h3>' + careLogs.map((log) =>
        '<article class="record-card compact-record-card">' +
          '<strong>' + escapeHtml([log.careType || "Care", log.date || ""].filter(Boolean).join(" - ")) + '</strong>' +
          '<span>' + escapeHtml([log.completedBy || "", formatDateTime(log.loggedAt || "")].filter(Boolean).join(" | ")) + '</span>' +
          (log.note ? '<p>' + escapeHtml(log.note) + '</p>' : '') +
        '</article>'
      ).join("") + '</section>'
    : "";
  const stayHtml = stays.length
    ? stays
        .map((stay) => {
          const events = boardingStayLifecycleEvents(displayRecord, stay);
          const location = [stay.kennelBuilding || displayRecord.kennelBuilding, stay.kennelLocationName || displayRecord.kennelLocationName].filter(Boolean).join(" - ");
          const requestCode = boardingStayRequestCode(displayRecord, stay);
          const belongings = boardingStayBelongings(stay);
          return \`<article class="record-card clickable-card compact-record-card" data-action="view-boarding-stay-history" data-id="\${escapeHtml(stay.id || "")}" data-request-code="\${escapeHtml(requestCode)}">
            <strong>\${escapeHtml(stayScheduleRangeLabel(displayRecord, stay))}</strong>
            <div class="chip-row">\${boardingStayRequestCodeChipHtml(displayRecord, stay)}\${boardingStayStatusChipHtml(displayRecord, stay)}</div>
            <p>\${escapeHtml(location || boardingStayServicesText(stay, { user: boardingPricingUserForRecord(displayRecord), preferCatalogPricing: true }) || "No location or service request saved")}</p>
            \${belongings ? \`<p>\${escapeHtml(\`Belongings: \${belongings}\`)}</p>\` : ""}
            <span>\${events.length} lifecycle event\${events.length === 1 ? "" : "s"}</span>
          </article>\`;
        })
        .join("")
    : "<p>No boarding history is available for this dog yet.</p>";
  list.innerHTML = careLogHtml + stayHtml;
}

function openBoardingStayHistory(record = activeBoardingDog(), stayId = "") {
  const displayRecord = boardingDogWithStayStatus(record || {});
  const stay = boardingStayByReference(displayRecord, stayId);
  if (!displayRecord?.id || !stay) return;
  showDetailDialog("Boarding Stay History", boardingStayHistoryPopupHtml(displayRecord, stay));
}

function boardingStayRemoveConfirmHtml(record = {}, stay = {}) {
  return \`
    <div class="tracker-form">
      <article class="record-card compact-record-card danger-confirm-card">
        <strong>Remove this boarding stay?</strong>
        <p>\${escapeHtml(record.dogName || "Boarding dog")} | \${escapeHtml(boardingStayRequestCode(record, stay))} | \${escapeHtml(stayScheduleRangeLabel(record, stay))}</p>
        <p>This removes only this scheduled stay. The dog profile stays available.</p>
      </article>
      <div class="button-row">
        <button type="button" class="danger-button" data-action="confirm-remove-boarding-stay" data-dog-id="\${escapeHtml(record.id || "")}" data-id="\${escapeHtml(stay.id || "")}" data-request-code="\${escapeHtml(boardingStayRequestCode(record, stay))}">Confirm Remove Stay</button>
        <button type="button" class="secondary-button" data-action="close-dialog">Cancel</button>
      </div>
    </div>\`;
}

function openBoardingStayRemoveConfirm(record = activeBoardingDog(), stayId = "") {
  const displayRecord = boardingDogWithStayStatus(record || {});
  const stay = boardingStayByReference(displayRecord, stayId);
  if (!displayRecord?.id || !stay) return;
  showDetailDialog("Confirm Remove Boarding Stay", boardingStayRemoveConfirmHtml(displayRecord, stay));
}

async function removeBoardingStayFromDog(dogId = "", stayId = "", reference = {}) {
  const displayRecord = boardingDogRecordForDisplay(dogId);
  if (!displayRecord || !stayId) return null;
  const targetStay = boardingStayByReference(displayRecord, typeof reference === "object" ? { ...reference, stayId: reference.stayId || stayId } : stayId);
  if (!targetStay) return null;
  const sourceIds = displayRecord.sourceRecordIds?.length ? displayRecord.sourceRecordIds : [displayRecord.id];
  const sourceRecords = readRecords("boardingDog").filter((record) => sourceIds.includes(record.id) && !record.removed);
  let updatedPrimary = null;
  for (const sourceRecord of sourceRecords) {
    const nextStays = (sourceRecord.stays || []).filter((stay) => !boardingStayMatchesIdentity(stay, targetStay));
    if (nextStays.length === (sourceRecord.stays || []).length) continue;
    const updated = upsertRecord("boardingDog", {
      ...sourceRecord,
      stays: nextStays,
      updatedAt: new Date().toISOString(),
    });
    await sendPayload(updated);
    if (updated.id === displayRecord.id) updatedPrimary = updated;
  }
  const refreshed = boardingDogRecordForDisplay(displayRecord.id) || updatedPrimary;
  if (refreshed && $("#boardingDogForm")?.elements.id.value === refreshed.id) {
    renderBoardingStays(refreshed);
    renderBoardingHistory(refreshed);
    renderBoardingDogs();
    renderBoardingRequests();
    renderCustomerRequests();
  }
  if (refreshed) await addAuditLog("Removed boarding stay", "boardingDog", refreshed, \`\${refreshed.dogName || "Dog"} | \${stayId}\`);
  return refreshed;
}

function boardingStayDateMatches(stay = {}, field = "dropoffTime", date = todayDate()) {
  return String(stay[field] || "").slice(0, 10) === date;
}

function boardingDogDeleteConfirmHtml(record = {}) {
  return \`
    <div class="tracker-form">
      <article class="record-card compact-record-card danger-confirm-card">
        <strong>Delete \${escapeHtml(record.dogName || "this boarding dog")}?</strong>
        <p>This removes the dog from Boarding Dogs and from customer access. The record is soft-deleted and kept in history for audit and recovery.</p>
        <p>Owner link: \${escapeHtml(record.ownerEmail || record.customerEmail || "No owner email saved")}</p>
      </article>
      <div class="button-row">
        <button type="button" class="danger-button" data-action="confirm-delete-boarding-dog" data-id="\${escapeHtml(record.id || "")}">Confirm Delete Dog</button>
        <button type="button" class="secondary-button" data-action="close-dialog">Cancel</button>
      </div>
    </div>\`;
}

function openBoardingDogDeleteConfirm(record = {}) {
  showDetailDialog("Confirm Delete Boarding Dog", boardingDogDeleteConfirmHtml(record));
}

async function deleteBoardingDogById(id = "") {
  if (currentRole() !== "admin") {
    showToast("Admin access required to delete a boarding dog profile.");
    return null;
  }
  const record = boardingDogRecordForDisplay(id);
  if (!record) return null;
  const removedAt = new Date().toISOString();
  const sourceIds = record.sourceRecordIds?.length ? record.sourceRecordIds : [record.id];
  let removed = null;
  for (const sourceId of sourceIds) {
    const sourceRecord = readRecords("boardingDog").find((item) => item.id === sourceId && !item.removed);
    if (!sourceRecord) continue;
    removed = upsertRecord("boardingDog", {
      ...sourceRecord,
      removed: true,
      removedAt,
      removedBy: currentUser?.name || "Admin",
      softDeleteExpiresOn: addDays(todayDate(), 30),
    });
    await sendPayload(removed);
  }
  await addAuditLog("Deleted boarding dog", "boardingDog", removed, \`\${removed.dogName || "Dog"} | owner: \${removed.ownerEmail || removed.customerEmail || "none"} | recover before \${removed.softDeleteExpiresOn}\`);
  $("#boardingDogDetail").hidden = true;
  renderBoardingDogs();
  renderBoardingRequests();
  renderCustomerDogs();
  renderDashboard();
  renderGlobalSearchResults();
  return removed;
}

function boardingDays(dropoffTime, pickupTime) {
  if (!dropoffTime || !pickupTime) return 0;
  const drop = new Date(dropoffTime);
  const pick = new Date(pickupTime);
  if (pick <= drop) return 0;
  const dropDay = new Date(drop.getFullYear(), drop.getMonth(), drop.getDate());
  const pickDay = new Date(pick.getFullYear(), pick.getMonth(), pick.getDate());
  if (dropDay.getTime() === pickDay.getTime()) return 1;
  let days = Math.max(1, Math.round((pickDay - dropDay) / 86400000));
  if (pick.getHours() >= 12) days += 1;
  return days;
}

function boardingBillingLabel(estimate = {}) {
  if (estimate.isServiceRequest) return "Service request";
  const days = Number(estimate.days || 0);
  return \`\${days} boarding day/night\${days === 1 ? "" : "s"}\`;
}

function boardingPricingServiceForCustomer(user = currentUser) {
  const rate = resolveStandardBoardingRate({ user, role: "primary" });
  return rate.ok ? rate.service : null;
}
//# sourceURL=snuggle-stay/boarding.js
`;
(0, eval)(__snuggleStayModuleSource);
