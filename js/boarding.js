// === MODULE: BOARDING ===
const __snuggleStayModuleSource = `function statusChipHtml(label, className = "") {
  return \`<span class="status-chip \${escapeHtml(className)}">\${escapeHtml(label)}</span>\`;
}

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

function boardingStayTransitionActions(record = {}, stay = {}) {
  const currentStatus = boardingStayDisplayStatus(record, stay);
  const nextStatuses = boardingStatusTransitions[currentStatus] || [];
  const stayAttrs = stay.id ? boardingStayDataAttrs(record, stay) : "";
  return nextStatuses.length
    ? \`<div class="record-actions lifecycle-actions">\${nextStatuses.map((nextStatus) => \`<button type="button" class="secondary-button" data-action="transition-boarding" data-next-status="\${escapeHtml(nextStatus)}" data-id="\${escapeHtml(record.id)}"\${stayAttrs}>\${escapeHtml(stayTransitionLabel(currentStatus, nextStatus))}</button>\`).join("")}</div>\`
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
  return (record.stays || []).map((stay) => {
    if (!targetStayId || !boardingStayMatchesIdentity(stay, targetStay)) return stay;
    const checkInDetails = nextStatus === "Checked In" ? options.checkInDetails || null : null;
    const checkInDropoffTime = checkInDetails?.dropoffTime || "";
    const clearsActiveStayState = nextStatus === "Approved" || nextStatus === "Checked In";
    return {
      ...stay,
      requestCode: stay.requestCode || boardingStayRequestCode(record, stay),
      status: nextStatus,
      dropoffTime: checkInDropoffTime || stay.dropoffTime || "",
      updatedAt: timestamp,
      actualDropoffAt: nextStatus === "Approved" ? "" : nextStatus === "Checked In" ? checkInDropoffTime || stay.actualDropoffAt || timestamp : stay.actualDropoffAt || "",
      actualPickupAt: nextStatus === "Checked Out" ? stay.actualPickupAt || timestamp : stay.actualPickupAt || "",
      readyForPickupAt: ["Approved", "Checked In", "In Kennel"].includes(nextStatus) ? "" : stay.readyForPickupAt || "",
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
        date: timestamp,
        by: currentUser?.name || helperName?.value || "",
        early,
      },
    ],
    checkedInAt: summaryStatus === "Approved" ? "" : summaryStatus === "Checked In" ? record.checkedInAt || timestamp : record.checkedInAt || "",
    inKennelAt: summaryStatus === "In Kennel" ? timestamp : clearsDogLocation ? "" : record.inKennelAt || "",
    readyForPickupAt: summaryStatus === "Ready For Pickup" ? timestamp : ["Approved", "Checked In", "In Kennel"].includes(summaryStatus) ? "" : record.readyForPickupAt || "",
    checkedOutAt: summaryStatus === "Checked Out" ? timestamp : record.checkedOutAt || "",
    cancelledAt: summaryStatus === "Cancelled" ? timestamp : record.cancelledAt || "",
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
  const updatedStays = (record.stays || []).map((stay) => ({
    ...stay,
    status: !stay.status || stay.status === "Cancelled" || stay.status === "Pending" ? "Approved" : stay.status,
    updatedAt: timestamp,
  }));
  return {
    ...record,
    boardingStatus: "Approved",
    approvedAt: record.approvedAt || timestamp,
    approvedBy: record.approvedBy || currentUser?.name || helperName?.value || "",
    cancelledAt: currentStatus === "Cancelled" ? "" : record.cancelledAt || "",
    stays: updatedStays,
    statusHistory: [
      ...(record.statusHistory || []),
      {
        from: currentStatus,
        to: "Approved",
        date: timestamp,
        by: currentUser?.name || helperName?.value || "",
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

function boardingStayRequestUnitPrice(value = {}) {
  const item = value && typeof value === "object" ? value : {};
  const savedPrice = Number(item.unitPrice || item.basePrice || 0);
  if (savedPrice) return savedPrice;
  return Number(serviceCatalogMatchForRequest(value)?.basePrice || 0);
}

function boardingStayRequestUnit(value = {}) {
  const item = value && typeof value === "object" ? value : {};
  return item.unit || serviceCatalogMatchForRequest(value)?.unit || "";
}

function boardingStayRequestDisplayText(value = {}, options = {}) {
  const quantity = boardingServiceTaskQuantity(value);
  const label = options.customerFacing ? customerFacingBoardingStayRequestLabel(value, quantity) : boardingStayRequestLabel(value);
  const unitPrice = boardingStayRequestUnitPrice(value);
  const unit = boardingStayRequestUnit(value);
  const priceText = unitPrice ? \` - \${money(unitPrice * quantity)}\${unit ? \` \${unit}\` : ""}\` : "";
  return \`\${label}\${priceText}\`;
}

function boardingStayServicesText(stay = {}, options = {}) {
  const requests = arrayValue(stay.requests).map((request) => boardingStayRequestDisplayText(request, options)).filter(Boolean);
  return requests.length ? requests.join(", ") : "No service requests";
}

function boardingStayRequestTotal(requests = []) {
  return arrayValue(requests).reduce((total, request) => {
    const unitPrice = boardingStayRequestUnitPrice(request);
    const quantity = boardingServiceTaskQuantity(request);
    return total + (unitPrice * quantity);
  }, 0);
}

function activeBoardingPricingServices() {
  return readRecords("service").filter((service) => !service.removed && service.category === "Boarding" && serviceHasFlag(service, "Active") && serviceIsStandardBoardingRate(service));
}

function boardingRatePlanForCustomer(user = currentUser) {
  const isMemberPricing = isMemberUser(user);
  const activeBoarding = activeBoardingPricingServices();
  const memberService = activeBoarding.find((service) => serviceHasFlag(service, "Member Pricing"));
  const nonMemberService = activeBoarding.find((service) => !serviceHasFlag(service, "Member Pricing"));
  const memberPrimaryRate = Number(memberService?.basePrice || BOARDING_MEMBER_PRIMARY_RATE);
  const nonMemberRate = Number(nonMemberService?.basePrice || BOARDING_NON_MEMBER_RATE);
  return {
    isMemberPricing,
    primaryRate: isMemberPricing ? memberPrimaryRate : nonMemberRate,
    sharedCrateRate: isMemberPricing ? BOARDING_MEMBER_SHARED_CRATE_RATE : nonMemberRate,
    nonMemberRate,
    maxDogsPerCrate: BOARDING_MAX_DOGS_PER_CRATE,
  };
}

function boardingRatePlanForRecord(record = {}) {
  const owner = ownerAccountForBoarding(record) || savedUserFor({ email: record.ownerEmail || record.customerEmail }) || {};
  return boardingRatePlanForCustomer(owner);
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
      total: isServiceRequest ? 0 : days * rate,
      sharedCrateRequested,
    };
  });
}

function boardingPricingSnapshotForStay(record = {}, stay = {}, options = {}) {
  const ratePlan = options.ratePlan || boardingRatePlanForRecord(record);
  const stayType = options.stayType || stay.stayType || record.stayType || "Boarding";
  const isServiceRequest = stayType === "Service Request";
  const days = isServiceRequest ? 0 : boardingDays(stay.dropoffTime, stay.pickupTime);
  const stayProgram = options.stayProgram || stay.stayProgram || stay.pricingSnapshot?.stayProgram || null;
  const stayProgramName = stayProgram?.serviceName || stayProgram?.name || stay.stayProgramName || stay.pricingSnapshot?.stayProgramName || "";
  const stayProgramRate = Number(stayProgram?.rate ?? stayProgram?.basePrice ?? stay.stayProgramRate ?? stay.pricingSnapshot?.stayProgramRate ?? 0);
  const priorRole = stay.pricingSnapshot?.currentDogRole || stay.pricingSnapshot?.role || "";
  const role = options.currentDogRole || priorRole || (stayProgram ? "boarding-program" : ratePlan.isMemberPricing ? "primary" : "non-member");
  const rate = isServiceRequest ? 0 : stayProgram ? stayProgramRate : ratePlan.isMemberPricing && role === "shared-crate-additional" ? ratePlan.sharedCrateRate : ratePlan.primaryRate;
  const requests = options.requests || stay.requests || [];
  const adjustments = normalizeInvoiceAdjustments(options.invoiceAdjustments || stay.invoiceAdjustments || []);
  const boardingSubtotal = isServiceRequest ? 0 : days * rate;
  const serviceSubtotal = boardingStayRequestTotal(requests);
  const adjustmentsTotal = invoiceAdjustmentsTotal(adjustments);
  const total = Math.max(0, boardingSubtotal + serviceSubtotal + adjustmentsTotal);
  return {
    version: "boarding-rate-v1",
    billingUnit: "boarding day/night",
    billingDays: days,
    isMemberPricing: ratePlan.isMemberPricing,
    maxDogsPerCrate: ratePlan.maxDogsPerCrate,
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
    groupBoardingSubtotal: options.groupBoardingSubtotal ?? stay.pricingSnapshot?.groupBoardingSubtotal ?? boardingSubtotal,
    groupServiceSubtotal: options.groupServiceSubtotal ?? stay.pricingSnapshot?.groupServiceSubtotal ?? serviceSubtotal,
    groupTotal: options.groupTotal ?? stay.pricingSnapshot?.groupTotal ?? total,
    lineItems: [
      ...(boardingSubtotal ? [{ type: stayProgram ? "boarding-program" : "boarding", label: stayProgramName || boardingLineRoleLabel(role), quantity: days, unitPrice: rate, amount: boardingSubtotal }] : []),
      ...arrayValue(requests).map((request) => ({
        type: "service",
        label: boardingServiceTaskDisplayName(request),
        quantity: boardingServiceTaskQuantity(request),
        unitPrice: boardingStayRequestUnitPrice(request),
        amount: boardingStayRequestUnitPrice(request) * boardingServiceTaskQuantity(request),
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

function boardingStayInvoiceTotal(record = {}, stay = {}) {
  if (stay.pricingSnapshot?.total !== undefined) return Number(stay.pricingSnapshot.total || 0);
  if (stay.estimatedTotal !== undefined && stay.estimatedTotal !== "") return Number(stay.estimatedTotal || 0);
  if (record.finalInvoiceTotal !== undefined && record.finalInvoiceTotal !== "") return Number(record.finalInvoiceTotal || 0);
  return Number(record.estimatedTotal || 0);
}

function boardingStayInvoiceSummaryHtml(record = {}, stay = {}, options = {}) {
  const hasSnapshot = Boolean(stay.pricingSnapshot?.version || stay.pricingSnapshot?.lineItems);
  const snapshot = hasSnapshot ? stay.pricingSnapshot : {};
  const adjustments = normalizeInvoiceAdjustments(stay.invoiceAdjustments);
  const lines = hasSnapshot ? arrayValue(snapshot.lineItems).filter((line) => Number(line.amount || 0)) : [];
  const customerAdjustments = adjustments.filter((adjustment) => adjustment.visibleToCustomer !== false);
  const adjustmentLines = customerAdjustments
    .map((adjustment) => \`<div class="estimate-line"><span>\${escapeHtml(adjustment.label)}\${adjustment.reason ? \`: \${escapeHtml(adjustment.reason)}\` : ""}</span><span>\${money(invoiceAdjustmentSignedAmount(adjustment))}</span></div>\`)
    .join("");
  if (!lines.length && !adjustmentLines && !boardingStayInvoiceTotal(record, stay)) return "";
  const lineHtml = lines
    .filter((line) => !["charge", "discount"].includes(line.type))
    .map((line) => \`<div class="estimate-line"><span>\${escapeHtml(line.label || "Invoice item")}</span><span>\${line.quantity ? \`\${escapeHtml(line.quantity)} x \${money(line.unitPrice || 0)} = \` : ""}\${money(line.amount || 0)}</span></div>\`)
    .join("");
  const totalLabel = options.final ? "Final total" : "Estimated total";
  return \`<div class="estimate-box stay-invoice-summary">\${lineHtml}\${adjustmentLines}<div class="estimate-total"><strong>\${totalLabel}</strong><span>\${money(boardingStayInvoiceTotal(record, stay))}</span></div></div>\`;
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

function boardingServiceTaskSources(record = {}, stay = {}) {
  const sources = [];
  const seenServiceKeys = new Set();
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
      unit: service.unit || boardingStayRequestUnit(item),
      unitPrice: boardingStayRequestUnitPrice(item),
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
      unit: service.unit || boardingStayRequestUnit(service),
      unitPrice: Number(service.unitPrice || service.basePrice || 0),
      source: "check-in",
      sourceIndex: index,
      requestedAt: stay.checkIn?.verifiedAt || stay.updatedAt || "",
    };
    const key = boardingServiceTaskNameKey(source);
    if (seenServiceKeys.has(key)) return;
    seenServiceKeys.add(key);
    sources.push(source);
  });
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
    return {
      ...previous,
      ...source,
      id,
      status: previous.status || "pending",
      completedAt: previous.completedAt || "",
      completedBy: previous.completedBy || "",
      completedByEmail: previous.completedByEmail || "",
      updatedAt: previous.updatedAt || source.requestedAt || stay.updatedAt || "",
    };
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
      const complete = task.status === "completed";
      const meta = complete ? \`Completed \${formatDateTime(task.completedAt) || ""}\`.trim() : "Needs completion before pickup";
      const taskKey = boardingServiceTaskKey(task);
      const action = !complete && options.actions
        ? \`<button type="button" class="secondary-button" data-action="complete-stay-service" data-dog-id="\${escapeHtml(record.id || "")}"\${stayAttrs} data-task-id="\${escapeHtml(task.id)}" data-task-key="\${escapeHtml(taskKey)}">Mark Done</button>\`
        : "";
      return \`<article class="record-card compact-record-card boarding-service-task-card \${complete ? "is-service-complete" : ""}">
        <div>
          <strong>\${escapeHtml(task.label || task.serviceName || "Service")}</strong>
          <span>\${escapeHtml(meta)}</span>
        </div>
        <div class="record-actions">\${complete ? statusChipHtml("Done", "boarding-service-chip is-service-complete") : statusChipHtml("Open", "boarding-service-chip is-service-due")}\${action}</div>
      </article>\`;
    }).join("")}
  </div>\`;
}

function boardingStayWithServiceTaskStatus(record = {}, stay = {}, taskId = "", status = "completed", targetTask = {}, targetTaskKey = "") {
  if (!stay?.id || (!taskId && !targetTaskKey)) return stay;
  const timestamp = new Date().toISOString();
  const staff = staffIdentity();
  const targetKey = targetTaskKey || (targetTask && Object.keys(targetTask).length ? boardingServiceTaskKey(targetTask) : "");
  const targetNameKey = targetTask && Object.keys(targetTask).length ? boardingServiceTaskNameKey(targetTask) : boardingServiceTaskNameFromKey(targetKey);
  const tasks = boardingStayServiceTasks(record, stay).map((task) => {
    const sameTask = task.id === taskId
      || (targetKey && boardingServiceTaskKey(task) === targetKey)
      || (targetNameKey && boardingServiceTaskNameKey(task) === targetNameKey);
    if (!sameTask) return task;
    return {
      ...task,
      status,
      completedAt: status === "completed" ? timestamp : task.completedAt || "",
      completedBy: status === "completed" ? staff.name : task.completedBy || "",
      completedByEmail: status === "completed" ? staff.email : task.completedByEmail || "",
      updatedAt: timestamp,
    };
  });
  return {
    ...stay,
    serviceTasks: tasks,
    updatedAt: timestamp,
  };
}

async function updateBoardingStayServiceTaskStatus(record = {}, reference = {}, taskId = "", status = "completed", taskKey = "") {
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
      ? boardingStayWithServiceTaskStatus(displayRecord, { ...stay, requestCode: stay.requestCode || targetRequestCode }, taskId, status, targetTask, targetTaskKey)
      : stay));
    const updated = upsertRecord("boardingDog", {
      ...rawRecord,
      stays: nextStays,
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
  if ($("#boardingDogForm")?.elements.id.value === latest.id || sourceRecordIds.includes($("#boardingDogForm")?.elements.id.value)) {
    renderBoardingStays(latest);
    renderBoardingCustomerUpdates(latest);
    renderBoardingHistory(latest);
  }
  renderBoardingDogs();
  renderBoardingRequests();
  renderCustomerRequests();
  renderDashboard();
  showToast(status === "completed" ? "Stay service marked done." : "Stay service updated.");
  return latest;
}

function boardingStayDetailCardHtml(record = {}, stay = {}, options = {}) {
  const isCustomer = Boolean(options.customer);
  const statusChip = isCustomer ? customerRequestStayStatusChipHtml(record, stay) : boardingStayStatusChipHtml(record, stay);
  const requestCode = stay.id ? (isCustomer ? customerStayIdChipHtml(record, stay) : boardingStayRequestCodeChipHtml(record, stay)) : "";
  const invoiceSummary = options.hideInvoiceSummary ? "" : boardingStayInvoiceSummaryHtml(record, stay);
  return \`<article class="record-card \${options.compact ? "compact-record-card" : ""}">
    <strong>\${escapeHtml(formatDateTime(stay.dropoffTime) || "Requested stay")}\${stay.pickupTime ? \` to \${escapeHtml(formatDateTime(stay.pickupTime))}\` : ""}</strong>
    <div class="chip-row">\${requestCode}\${statusChip}\${boardingStayServiceFlagHtml(record, stay)}</div>
    <p>\${escapeHtml(boardingStayServicesText(stay, { customerFacing: isCustomer }))}</p>
    \${options.showServiceTasks ? boardingStayServiceTaskListHtml(record, stay, { actions: options.serviceActions }) : ""}
    \${stay.bathPlan ? \`<p>\${escapeHtml(stay.bathPlan)}</p>\` : ""}
    \${stay.stayNotes ? \`<p>\${escapeHtml(stay.stayNotes)}</p>\` : ""}
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
    <div class="record-grid compact-record-grid">
      <article class="record-card compact-record-card"><strong>Owner contact</strong><p>\${escapeHtml(displayRecord.ownerName || "No owner saved")}</p><p>\${phoneLinkHtml(displayRecord.ownerPhone)}</p><p>\${escapeHtml(displayRecord.ownerEmail || "No email saved")}</p></article>
      <article class="record-card compact-record-card"><strong>Emergency contact</strong><p>\${escapeHtml(displayRecord.emergencyName || "No emergency contact saved")}</p><p>\${phoneLinkHtml(displayRecord.emergencyPhone)}</p></article>
    </div>
    \${detailRows(displayRecord, [
      ["Dog", "dogName"],
      ["Owner", "ownerName"],
      ["Owner phone", "ownerPhone"],
      ["Owner email", "ownerEmail"],
      ["Emergency contact", "emergencyName"],
      ["Emergency phone", "emergencyPhone"],
      ["Special care", "specialCare"],
      ["Daily activity", "dailyActivity"],
      ["Boarding history", "boardingHistory"],
      ["Rabies", "rabiesDate"],
      ["DHPP", "dhppDate"],
      ["Bordetella", "bordetellaDate"],
    ])}
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

function boardingDogMatchesRosterFilter(record = {}, filter = boardingDogRosterFilter) {
  const status = boardingDisplayStatus(record);
  const hasActiveStay = isCurrentlyBoarding(record);
  const hasStays = Boolean((record.stays || []).length);
  if (filter === "All Boarding Dogs") return true;
  if (filter === "Pending" || filter === "Pending Approval") return status === "Pending" && !hasActiveStay;
  if (filter === "Approved") return status === "Approved" && !hasActiveStay;
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
  if (title === "In Kennel") return status === "In Kennel" && Boolean(activeBoardingStay({ ...record, stays: [stay] }));
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

function boardingQueueGroupHtml(title, records = []) {
  const PREVIEW_LIMIT = 6;
  const preview = records.slice(0, PREVIEW_LIMIT);
  const overflow = records.length - PREVIEW_LIMIT;
  const overflowHtml = overflow > 0
    ? \`<button type="button" class="boarding-queue-overflow" data-action="boarding-queue-show-more" data-filter="\${escapeHtml(title)}">+\${overflow} more - view all</button>\`
    : "";
  return \`<article class="boarding-queue-card"><strong>\${escapeHtml(title)}</strong><span>\${records.length}</span>\${
    preview.length
      ? preview.map((record) => {
        const stay = boardingQueueStayForGroup(title, record) || boardingPrimaryStay(record) || {};
        const stayAttrs = stay.id ? boardingStayDataAttrs(record, stay) : "";
        const kennel = boardingKennelLocationLabel(record, stay);
        return \`<button type="button" class="boarding-queue-item" data-action="open-queue-stay-status" data-id="\${escapeHtml(record.id)}"\${stayAttrs}><span>\${escapeHtml(record.dogName || "Dog")}\${kennel ? \` <small class="kennel-tag">\${escapeHtml(kennel)}</small>\` : ""}</span><small>\${escapeHtml(boardingScheduleText(record, stay))}</small></button>\`;
      }).join("")
      : \`<p>No dogs in this group.</p>\`
  }\${overflowHtml}</article>\`;
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
  return {
    dogName: dog.dogName || "",
    breedDescription: dog.breedDescription || "",
    sex: dog.sex || "Unknown",
    spayNeuterStatus: dog.spayNeuterStatus || "Unknown",
    ownerName: dog.ownerName || "",
    ownerPhone: dog.ownerPhone || "",
    ownerEmail: dog.ownerEmail || dog.customerEmail || "",
    customerEmail: dog.customerEmail || dog.ownerEmail || "",
    emergencyName: dog.emergencyName || "",
    emergencyPhone: dog.emergencyPhone || "",
    vetInfo: dog.vetInfo || "",
    rabiesDate: dog.rabiesDate || "",
    dhppDate: dog.dhppDate || "",
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
  const belongings = stay.checkIn?.belongings || "No belongings listed";
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
    <article class="record-card compact-record-card"><strong>Belongings to leave with dog</strong><p>\${escapeHtml(belongings)}</p></article>
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
    <article class="record-card compact-record-card"><strong>Services</strong><p>\${escapeHtml(services.length ? services.join(", ") : "No services listed")}</p></article>
    \${stay.id ? boardingStayInvoiceSummaryHtml(record, stay, { final: true }) : \`<article class="record-card compact-record-card"><strong>Total</strong><p>\${escapeHtml(total ? money(total) : "No invoice total saved")}</p></article>\`}
    <label>Checkout note<textarea id="checkoutNote" rows="3" placeholder="Payment note, pickup person, invoice issue, or checkout detail"></textarea></label>
    <div class="button-row"><button type="button" data-action="checkout-paid-method" data-id="\${escapeHtml(record.id)}"\${stayAttr}>Paid</button><button type="button" class="secondary-button" data-action="confirm-check-out" data-id="\${escapeHtml(record.id)}"\${stayAttr}>Check Out</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>
  </section>\`;
}

function boardingDogPhotoSource(record = {}) {
  const linkedDog = linkedCustomerDogForBoarding(record) || {};
  return record.profilePhotoUrl || record.profilePhotoData || linkedDog.profilePhotoUrl || linkedDog.profilePhotoData || "";
}

function boardingDogMobilePhotoHtml(record = {}) {
  const name = record.dogName || "Boarding dog";
  const photo = boardingDogPhotoSource(record);
  if (photo) {
    return \`<button type="button" class="mobile-dog-photo-button" data-action="view-media" data-src="\${escapeHtml(photo)}" data-media-type="image/jpeg" data-media-name="\${escapeHtml(\`\${name} profile photo\`)}" aria-label="View \${escapeHtml(name)} photo"><img src="\${escapeHtml(photo)}" alt="\${escapeHtml(name)}" /></button>\`;
  }
  return \`<div class="mobile-dog-photo-button mobile-dog-photo-initials" aria-hidden="true">\${escapeHtml(avatarText(name))}</div>\`;
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

function serviceForStayRequestOption(option = {}) {
  const terms = arrayValue(option.matchTerms).map(normalizedServiceLookupText).filter(Boolean);
  const services = serviceCatalogForStayRequests();
  return services.find((service) => terms.includes(normalizedServiceLookupText(service.serviceName)))
    || services.find((service) => {
      const name = normalizedServiceLookupText(service.serviceName);
      return terms.some((term) => name.includes(term) || term.includes(name));
    })
    || null;
}

function stayRequestOptionSnapshot(option = {}) {
  const service = serviceForStayRequestOption(option) || {};
  return {
    id: service.id || "",
    serviceId: service.id || "",
    serviceName: service.serviceName || option.fallbackServiceName || boardingServiceTaskDisplayName(option.value),
    label: option.value || "Service requested",
    category: service.category || "",
    unit: service.unit || "",
    quantity: 1,
    unitPrice: Number(service.basePrice || 0),
  };
}

function stayRequestMatchesOption(request = {}, option = {}) {
  const requestLabel = normalizedServiceLookupText(boardingStayRequestLabel(request));
  const requestName = normalizedServiceLookupText(boardingServiceTaskDisplayName(request));
  const optionValue = normalizedServiceLookupText(option.value);
  if (requestLabel === optionValue || requestName === optionValue) return true;
  return arrayValue(option.matchTerms).map(normalizedServiceLookupText).filter(Boolean).some((term) => requestLabel.includes(term) || requestName.includes(term));
}

function stayRequestCheckboxesHtml(stay = {}) {
  const requests = arrayValue(stay.requests);
  return stayRequestServiceOptions
    .map((option) => {
      const snapshot = stayRequestOptionSnapshot(option);
      const checked = requests.some((request) => stayRequestMatchesOption(request, option));
      const price = snapshot.unitPrice ? \` - \${money(snapshot.unitPrice)}\${snapshot.unit ? \` \${snapshot.unit}\` : ""}\` : "";
      return \`<label><input type="checkbox" name="stayRequests" value="\${escapeHtml(option.value)}" data-service-id="\${escapeHtml(snapshot.serviceId || "")}" data-service-name="\${escapeHtml(snapshot.serviceName || "")}" data-unit-price="\${escapeHtml(snapshot.unitPrice || 0)}" data-unit="\${escapeHtml(snapshot.unit || "")}" \${checked ? "checked" : ""} /> \${escapeHtml(option.value)}\${escapeHtml(price)}</label>\`;
    })
    .join("");
}

function boardingStayEstimatedTotal(record = {}, existingStay = {}, selectedRequests = []) {
  const snapshot = boardingPricingSnapshotForStay(record, { ...existingStay, requests: selectedRequests });
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

function boardingStayFormHtml(record = {}, stay = {}) {
  const isEdit = Boolean(stay.id);
  return \`
    <form id="boardingStayPopupForm" class="tracker-form" data-dog-id="\${escapeHtml(record.id || "")}">
      <input type="hidden" name="stayId" value="\${escapeHtml(stay.id || "")}" />
      \${isEdit ? \`<div class="chip-row">\${boardingStayRequestCodeChipHtml(record, stay)}\${boardingStayStatusChipHtml(record, stay)}</div>\` : ""}
      <div class="field-grid">
        <label>Drop-off time<input type="datetime-local" name="dropoffTime" required value="\${escapeHtml(stay.dropoffTime?.slice(0, 16) || "")}" /></label>
        <label>Pick-up time<input type="datetime-local" name="pickupTime" required value="\${escapeHtml(stay.pickupTime?.slice(0, 16) || "")}" /></label>
      </div>
      \${boardingStayLocationFieldsHtml(stay)}
      <div class="checklist compact">\${stayRequestCheckboxesHtml(stay)}</div>
      \${boardingStayBillingAdjustmentFieldsHtml(stay)}
      <label>Stay notes<textarea name="stayNotes" rows="3" placeholder="Owner instructions or pickup grooming notes">\${escapeHtml(stay.stayNotes || "")}</textarea></label>
      <div class="button-row"><button type="submit">\${isEdit ? "Save Boarding Stay" : "Add Boarding Stay"}</button></div>
    </form>\`;
}

function openBoardingStayPopup(record = activeBoardingDog(), stayId = "") {
  if (!record?.id) return;
  const displayRecord = boardingDogWithStayStatus(record);
  const stay = boardingStayByReference(displayRecord, stayId) || {};
  showDetailDialog(\`\${displayRecord.dogName || "Boarding Dog"} Boarding Request\`, boardingStayFormHtml(displayRecord, stay));
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
  const photo = boardingDogPhotoSource(record);
  const name = record.dogName || "Boarding dog";
  return \`
    <label class="dog-profile-editor checkin-photo-editor" for="boardingCheckInPhotoInput">
      <span class="dog-photo-picker" role="button" tabindex="0">
        <img id="boardingCheckInPhotoPreview" src="\${escapeHtml(photo)}" alt="\${escapeHtml(name)}" \${photo ? "" : "hidden"} />
        <span id="boardingCheckInPhotoInitials" \${photo ? "hidden" : ""}>\${escapeHtml(avatarText(name))}</span>
      </span>
      <span>
        <strong>\${escapeHtml(name)}</strong>
        <small>\${photo ? "Tap to update the profile photo." : "Tap to upload or take a profile photo."}</small>
      </span>
      <input class="visually-hidden-file" id="boardingCheckInPhotoInput" type="file" name="profilePhoto" accept="image/jpeg,image/png,.jpg,.jpeg,.png" />
    </label>\`;
}

function boardingCheckInHtml(record = {}, nextStatus = "Checked In", options = {}, state = {}) {
  const stay = boardingStatusTargetStay(record, nextStatus, options) || {};
  const formValues = state.formValues || {};
  const addedServices = state.addedServices || [];
  const serviceRows = boardingCheckInServices(record, addedServices, options);
  const foodInstructions = formValues.foodInstructions ?? boardingFoodInstructions(record);
  const belongings = formValues.belongings || stay.checkIn?.belongings || "";
  const earlyCheckIn = Boolean(options.early);
  const dropoffFieldHtml = earlyCheckIn
    ? \`<label>Drop-off <small>Early check-in defaults to now. Adjust if needed.</small><input type="datetime-local" name="dropoffTime" required value="\${escapeHtml(formValues.dropoffTime || dateTimeLocalValue(new Date().toISOString()))}" /></label>\`
    : \`<label>Drop-off<input type="text" value="\${escapeHtml(formatDateTime(stay.dropoffTime) || "Not scheduled")}" readonly /></label>\`;
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
        <label>Pick-up<input type="text" value="\${escapeHtml(formatDateTime(stay.pickupTime) || "Not scheduled")}" readonly /></label>
      </div>
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
  const dropoffDate = parsedCustomerDateTime(payload.dropoffTime || "");
  const pickupDate = parsedCustomerDateTime(payload.pickupTime || "");
  if (!dropoffDate || !pickupDate || pickupDate <= dropoffDate) {
    const targetField = formFieldByName(formEl, !dropoffDate ? "dropoffTime" : "pickupTime");
    if (targetField) setFieldError(targetField, !dropoffDate ? "Drop-off time is required." : "Pick-up time must be after drop-off time.");
    showToast(!dropoffDate ? "Enter a valid drop-off time." : "Pick-up time must be after drop-off time.");
    return null;
  }
  const draftStayIdentity = {
    dropoffTime: payload.dropoffTime,
    pickupTime: payload.pickupTime,
    stayType: payload.stayType || "",
  };
  const existingStay = boardingStayByReference(dog, payload.stayId)
    || (!payload.stayId ? (dog.stays || []).find((item) => boardingStayMatchesIdentity(item, draftStayIdentity)) : null);
  const timestamp = new Date().toISOString();
  const existingStayStatus = normalizeBoardingStatus({ boardingStatus: existingStay?.status || "" });
  const shouldAutoApproveStay = !existingStay || (!dog.customerRequest && existingStayStatus === "Pending");
  const selectedRequests = selectedStayRequestsFromForm(formEl);
  const invoiceAdjustments = invoiceAdjustmentsFromStayForm(formEl, existingStay || {}, timestamp);
  const adjustmentEvents = invoiceAdjustmentEventChanges(existingStay?.invoiceAdjustments || [], invoiceAdjustments, timestamp);
  const location = payload.kennelLocationId
    ? kennelLocations({ activeOnly: true }).find((item) => item.id === payload.kennelLocationId)
    : null;
  const draftStay = {
    ...(existingStay || {}),
    dropoffTime: payload.dropoffTime,
    pickupTime: payload.pickupTime,
    stayType: existingStay?.stayType || "Boarding",
    requests: selectedRequests,
    invoiceAdjustments,
  };
  const pricingSnapshot = boardingPricingSnapshotForStay(dog, draftStay);
  const stay = {
    ...existingStay,
    id: payload.stayId || uid("stay"),
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
    invoiceAdjustments,
    invoiceEvents: [...arrayValue(existingStay?.invoiceEvents), ...adjustmentEvents],
    pricingSnapshot,
    estimatedTotal: pricingSnapshot.total,
    kennelBuilding: location ? location.building : payload.kennelBuilding || "",
    kennelLocationId: location ? location.id : "",
    kennelLocationName: location ? location.name : "",
    kennelAssignedAt: location ? existingStay?.kennelAssignedAt || timestamp : "",
  };
  stay.bathPlan = bathPlanForStay(stay);
  stay.requestCode = boardingStayRequestCode(dog, stay);
  stay.serviceTasks = boardingStayServiceTasks(dog, stay);
  const stays = (dog.stays || []).filter((item) => !boardingStayMatchesIdentity(item, stay));
  stays.unshift(stay);
  const currentDogStatus = normalizeBoardingStatus(dog);
  const statusUpdates = !existingStay && ["Pending", "Cancelled", "Checked Out"].includes(currentDogStatus)
    ? {
        boardingStatus: "Approved",
        statusHistory: [...(dog.statusHistory || []), { from: currentDogStatus, to: "Approved", date: timestamp, by: currentUser?.name || helperName?.value || "" }],
      }
    : {};
  const record = upsertRecord("boardingDog", { ...dog, ...statusUpdates, stays });
  await sendPayload(record);
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
    .sort((a, b) => boardingQuickSortTime(a) - boardingQuickSortTime(b));
  container.innerHTML = actionable.length
    ? actionable.map(boardingQuickCardHtml).join("")
    : \`<article class="record-card mobile-roster-card"><strong>No boarding actions</strong><p>No active check-ins or check-outs match this view.</p></article>\`;
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
  const existing = String(stay.requestCode || stay.requestId || stay.reservationId || "").trim();
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
    const exactCode = stays.find((stay) => boardingStayRequestCode(record, stay) === requestCode);
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
  return {
    ...record,
    sourceRecordIds: record.sourceRecordIds?.length ? record.sourceRecordIds : [record.id].filter(Boolean),
    stays: mergeBoardingStays([record], record),
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
    const stays = displayRecord.stays?.length ? displayRecord.stays : [{}];
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
  const stayKey = timeKey?.startsWith("time:") || timeKey?.startsWith("stay-window|") ? timeKey : sourceKey || entry.requestCode || timeKey;
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
  boardingViewMode = view === "list" ? "list" : "board";
  $("#boardingBoardViewBtn")?.classList.toggle("is-active", boardingViewMode === "board");
  $("#boardingListViewBtn")?.classList.toggle("is-active", boardingViewMode === "list");
  $("#boardingQueueGroups")?.classList.toggle("is-hidden", boardingViewMode !== "board");
  $("#boardingDogsPage .table-settings-shell")?.classList.toggle("is-hidden", boardingViewMode !== "list");
  $("#boardingDogQuickCards")?.classList.toggle("is-hidden", boardingViewMode !== "list");
}

function renderBoardingDogs() {
  const query = $("#boardingDogSearch").value || "";
  const allRecords = consolidatedBoardingDogRecords();
  renderBoardingRosterTabs(allRecords);
  renderBoardingQueueGroups(allRecords);
  const hasSearchQuery = Boolean(query.trim());
  const matchingRecords = allRecords.filter((record) => boardingDogMatchesSearch(record, query));
  const rosterRecords = hasSearchQuery ? matchingRecords : matchingRecords.filter((record) => boardingDogMatchesRosterFilter(record));
  const filteredRecords = boardingDogPriorityFilter === "vaccines-expiring-soon"
    ? rosterRecords.filter((record) => vaccinationExpiresSoon(record, 30))
    : rosterRecords;
  const records = sortRecordsForTable("boardingDog", filteredRecords);
  const columns = activeColumns("boardingDog");
  $("#boardingDogTableHead").innerHTML = \`<tr>\${columns.map((column) => \`<th data-sort-column="\${column.key}" data-table="boardingDog" data-column="\${column.key}" draggable="true" title="Drag to reorder. Double-click to sort.">\${escapeHtml(column.label)}</th>\`).join("")}<th>Actions</th></tr>\`;
  $("#boardingDogTableBody").innerHTML = records.length
    ? records
        .map((record) => {
          return \`<tr data-id="\${record.id}" data-source="\${escapeHtml(record.sourceType || record.type || "boardingDog")}">\${columns.map((column) => \`<td>\${boardingTableCellHtml(column, record)}</td>\`).join("")}<td><div class="record-actions table-actions">\${dogTypeBadgeHtml("boardingDog")}\${boardingStatusChipHtml(record)}\${boardingQuickActionButtons(record)}<button type="button" class="secondary-button" data-action="open-boarding-request-tab" data-id="\${escapeHtml(record.id)}">Boarding & Request</button>\${boardingOwnerLinkButtonHtml(record)}<span class="inline-save-status" data-inline-status-message="\${escapeHtml(record.id)}" aria-live="polite"></span></div></td></tr>\`;
        })
        .join("")
    : \`<tr><td colspan="\${(columns.length || 1) + 1}">\${hasSearchQuery ? "No boarding dog records match this search." : \`No \${escapeHtml(boardingRosterFilterLabel(boardingDogRosterFilter)).toLowerCase()} match this search.\`}</td></tr>\`;
  renderBoardingQuickCards(records);
  renderColumnManager("boardingDog", "#boardingDogColumnManager");
  renderCustomerDogUploadCards();
  handleBoardingViewToggle(boardingViewMode);
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
  const transitioned = withBoardingStatusTransition(record, nextStatus, options);
  if (!transitioned) {
    showToast("That boarding status transition is not allowed.");
    return null;
  }
  const updated = upsertRecord("boardingDog", transitioned);
  await sendPayload(updated);
  if (options.stayId) {
    await syncDuplicateBoardingStayStatusRecords(record, updated, boardingStayByReference(record, options) || boardingStayByReference(updated, options), nextStatus, options);
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

function boardingFamilyOwnerKey(record = {}) {
  const explicitId = String(record.householdId || record.familyGroupId || record.familyId || record.customerAccountId || "").trim();
  if (explicitId) return \`id:\${explicitId}\`;
  const ownerEmail = normalizeEmail(record.ownerEmail || record.customerEmail || record.linkedOwnerEmail || record.requestedByEmail || "");
  if (ownerEmail) return \`email:\${ownerEmail}\`;
  const ownerPhone = String(record.ownerPhone || record.customerPhone || record.requestedByPhone || "").replace(/\\D/g, "");
  if (ownerPhone) return \`phone:\${ownerPhone}\`;
  const ownerName = String(record.ownerName || record.requestedByName || "").trim().toLowerCase();
  return ownerName ? \`name:\${ownerName}\` : "";
}

function boardingFamilyStayKey(stay = {}) {
  const dropoff = String(stay.dropoffTime || "").trim();
  const pickup = String(stay.pickupTime || "").trim();
  if (!dropoff || !pickup) return "";
  return \`\${dropoff}|\${pickup}\`;
}

function boardingFamilyGroupKey(entry = {}) {
  const ownerKey = boardingFamilyOwnerKey(entry.record || {});
  const stayKey = boardingFamilyStayKey(entry.stay || {});
  return ownerKey && stayKey ? \`\${ownerKey}::\${stayKey}\` : "";
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

function boardingFamilyGroups(entries = []) {
  const groups = new Map();
  const singles = [];
  entries.forEach((entry) => {
    const key = boardingFamilyGroupKey(entry);
    if (!key) {
      singles.push(entry);
      return;
    }
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  });
  const groupedKeys = new Set([...groups].filter(([, items]) => items.length > 1).map(([key]) => key));
  const output = [];
  const emitted = new Set();
  entries.forEach((entry) => {
    const key = boardingFamilyGroupKey(entry);
    if (key && groupedKeys.has(key)) {
      if (!emitted.has(key)) {
        output.push({ type: "family", entries: groups.get(key) });
        emitted.add(key);
      }
      return;
    }
    if (!key || singles.includes(entry) || !groupedKeys.has(key)) output.push({ type: "single", entry });
  });
  return output;
}

function boardingRequestCardHtml(entry = {}, options = {}) {
  const record = entry.record || {};
  const stay = entry.stay || {};
  const services = boardingStayServicesText(stay);
  const status = entry.status;
  const stayAttr = stay.id ? boardingStayDataAttrs(record, stay) : "";
  const total = boardingStayInvoiceTotal(record, stay);
  const approveAction = status === "Cancelled" ? \`<button type="button" class="secondary-button" data-action="approve-boarding" data-id="\${escapeHtml(record.id)}"\${stayAttr}>Approve Request</button>\` : "";
  const actions = \`<div class="record-actions"><button type="button" class="secondary-button" data-action="change-boarding" data-id="\${escapeHtml(record.id)}"\${stayAttr}>Change</button>\${approveAction}</div>\${stay.id ? boardingStayTransitionActions(record, stay) : boardingTransitionActions(record)}\`;
  const familyChip = options.familyName ? \`<span class="status-chip boarding-family-chip">Same family: \${escapeHtml(options.familyName)}</span>\` : "";
  return \`<article class="record-card clickable-card \${statusClassForRequest(status)} \${statusClassForBoardingStatus(status)}" data-id="\${escapeHtml(record.id)}"\${stayAttr} data-action="view-boarding-request"><strong>\${escapeHtml(record.dogName || "Dog")}</strong><div class="chip-row">\${dogTypeBadgeHtml("boardingDog")}\${familyChip}\${stay.id ? boardingStayRequestCodeChipHtml(record, stay) : ""}<button type="button" class="status-chip-button" data-action="open-boarding-request-tab" data-id="\${escapeHtml(record.id)}"\${stayAttr}>\${stay.id ? boardingStayStatusChipHtml(record, stay) : boardingStatusChipHtml(record)}</button>\${stay.id ? boardingStayServiceFlagHtml(record, stay) : ""}</div><span>\${formatDateTime(stay.dropoffTime)} to \${formatDateTime(stay.pickupTime)}</span><p>\${escapeHtml(services)}</p>\${total ? \`<p><strong>Estimated total:</strong> \${money(total)}</p>\` : ""}\${actions}</article>\`;
}

function boardingFamilyGroupHtml(entries = []) {
  const first = entries[0] || {};
  const firstRecord = first.record || {};
  const firstStay = first.stay || {};
  const familyName = boardingFamilyName(firstRecord);
  const familyTitle = familyName.toLowerCase() === "family" ? "Family Stay" : \`\${familyName} Family Stay\`;
  const dogNames = entries.map((entry) => entry.record?.dogName || "Dog").filter(Boolean);
  const statusSummary = boardingFamilyStatusSummary(entries);
  return \`<section class="boarding-family-group">
    <div class="boarding-family-header">
      <div>
        <strong>\${escapeHtml(familyTitle)}</strong>
        <span>\${escapeHtml(dogNames.join(", "))}</span>
        <p>\${formatDateTime(firstStay.dropoffTime)} to \${formatDateTime(firstStay.pickupTime)}</p>
      </div>
      <div class="chip-row"><span class="status-chip boarding-family-chip">\${entries.length} dogs</span><span class="status-chip">\${escapeHtml(statusSummary)}</span></div>
    </div>
    <div class="boarding-family-dogs">\${entries.map((entry) => boardingRequestCardHtml(entry, { familyName })).join("")}</div>
  </section>\`;
}

function renderBoardingRequests() {
  const list = $("#boardingRequestRecords");
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
        .map((item) => (item.type === "family" ? boardingFamilyGroupHtml(item.entries) : boardingRequestCardHtml(item.entry)))
        .join("")
    : \`<p>No \${statusFilters.length ? statusFilters.join(", ").toLowerCase() + " " : ""}boarding requests yet.</p>\`;
}

function activeBoardingStay(record = {}, date = new Date()) {
  const now = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(now.getTime())) return null;
  return (record.stays || []).find((stay) => {
    if (inactiveBoardingStayStatus(stay)) return false;
    const explicitStatus = explicitBoardingStatus(stay.status) || explicitBoardingStatus(record.boardingStatus || record.status);
    if (!activeBoardingStayStatuses.includes(explicitStatus)) return false;
    const dropoff = new Date(stay.dropoffTime);
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
    ? files.map((file) => \`<article class="record-card compact-record-card"><strong>\${escapeHtml(file.name || "Health record")}</strong><span>\${escapeHtml(formatDateTime(file.savedAt || file.createdAt))}</span>\${file.note ? \`<p>\${escapeHtml(file.note)}</p>\` : ""}<div class="record-actions"><button type="button" class="secondary-button media-preview-button" data-action="view-media" data-src="\${escapeHtml(file.url || file.dataUrl || "")}" data-media-type="\${escapeHtml(file.type || "")}" data-media-name="\${escapeHtml(file.name || "Health record")}"\${mediaAccessAttrs(file, { sourceRecordId: record.id || file.sourceRecordId || "", sourceRecordType: "boardingDog" })}>Open</button></div></article>\`).join("")
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
        return \`<article class="record-card compact-record-card customer-update-stay-card"><strong>\${escapeHtml(displayRecord.dogName || "Boarding dog")}</strong><div class="chip-row">\${customerStayIdChipHtml(displayRecord, stay)}\${boardingStayStatusChipHtml(displayRecord, stay)}</div><p>\${escapeHtml(formatDateTime(stay.dropoffTime))} to \${escapeHtml(formatDateTime(stay.pickupTime))}</p><div class="record-actions"><button type="button" class="secondary-button" data-action="open-owner-update-for-stay" data-dog-id="\${escapeHtml(displayRecord.id || "")}" data-id="\${escapeHtml(stay.id || "")}" data-request-code="\${escapeHtml(requestCode)}">Update Owner</button></div></article>\`;
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
        return \`<article class="record-card compact-record-card dog-file-card" data-file-id="\${escapeHtml(file.id)}"><strong>\${escapeHtml(file.name)}</strong><span>\${escapeHtml(savedText)}</span>\${sourceText}\${noteText}\${renameInput}<div class="record-actions"><button type="button" class="secondary-button media-preview-button" data-action="view-media" data-src="\${escapeHtml(source)}" data-media-type="\${escapeHtml(file.type)}" data-media-name="\${escapeHtml(file.name)}"\${mediaAccessAttrs(file, { sourceRecordId: file.sourceRecordId || record.id || "", sourceRecordType: file.sourceRecordType || (file.source?.startsWith("customer") ? "customerDog" : "boardingDog") })}>Open</button>\${renameButton}\${removeButton}</div></article>\`;
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
  if (!note && !input?.files?.length) {
    showToast("Add a note, photo, or video before saving a customer update.");
    return null;
  }
  const timestamp = new Date().toISOString();
  const requestCode = boardingStayRequestCode(displayRecord, targetStay);
  const mediaItems = options.mediaItems || await uploadMediaFiles(input, \`boarding-customer-updates/\${displayRecord.id}/\${targetStay.id}\`, {
    allowedTypes: CUSTOMER_UPDATE_MEDIA_TYPES,
    allowedExtensions: CUSTOMER_UPDATE_MEDIA_EXTENSIONS,
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
    stayLabel: targetStay.dropoffTime || targetStay.pickupTime ? \`\${formatDateTime(targetStay.dropoffTime)} to \${formatDateTime(targetStay.pickupTime)}\` : "",
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
    dailyActivity: note || displayRecord.dailyActivity || "",
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
  const stays = displayRecord?.stays || [];
  $("#boardingStayHistory").innerHTML = stays.length
    ? stays.map((stay) => {
      const requestCode = boardingStayRequestCode(displayRecord, stay);
      const ownerUpdateButton = ownerUpdateStayIsAvailable(displayRecord, stay)
        ? \`<button type="button" class="secondary-button" data-action="open-owner-update-for-stay" data-dog-id="\${escapeHtml(displayRecord.id)}" data-id="\${escapeHtml(stay.id)}" data-request-code="\${escapeHtml(requestCode)}">Update Owner</button>\`
        : "";
      return \`<article class="record-card"><strong>\${formatDateTime(stay.dropoffTime)} to \${formatDateTime(stay.pickupTime)}</strong><div class="chip-row">\${boardingStayRequestCodeChipHtml(displayRecord, stay)}\${boardingStayStatusButtonHtml(displayRecord, stay)}\${boardingStayServiceFlagHtml(displayRecord, stay)}</div><p>\${escapeHtml(boardingStayServicesText(stay))}</p>\${boardingStayInvoiceSummaryHtml(displayRecord, stay)}\${boardingStayServiceTaskListHtml(displayRecord, stay, { actions: true })}<p>\${escapeHtml(stay.bathPlan || "")}</p><p>\${escapeHtml(stay.stayNotes || "")}</p><div class="record-actions"><button type="button" class="secondary-button" data-action="edit-stay" data-id="\${escapeHtml(stay.id)}" data-request-code="\${escapeHtml(requestCode)}">Edit Stay</button>\${ownerUpdateButton}<button type="button" class="secondary-button danger-button" data-action="remove-stay" data-id="\${escapeHtml(stay.id)}" data-request-code="\${escapeHtml(requestCode)}">Remove Stay</button></div></article>\`;
    }).join("")
    : "<p>No boarding stays logged yet.</p>";
}

function boardingStayStatusMenuHtml(record = {}, stay = {}) {
  const status = boardingStayDisplayStatus(record, stay);
  const nextStatuses = boardingStatusTransitions[status] || [];
  const stayAttrs = stay.id ? boardingStayDataAttrs(record, stay) : "";
  const servicesText = boardingStayServicesText(stay);
  const serviceSummary = servicesText === "No service requests" ? "No service requested" : servicesText;
  return \`<section class="popup-record-section">
    <article class="record-card compact-record-card">
      <strong>\${escapeHtml(formatDateTime(stay.dropoffTime))} to \${escapeHtml(formatDateTime(stay.pickupTime))}</strong>
      <div class="chip-row">\${boardingStayRequestCodeChipHtml(record, stay)}\${boardingStayStatusButtonHtml(record, stay, "open-stay-status-menu")}</div>
      <p><strong>Service request:</strong> \${escapeHtml(serviceSummary)}</p>
      <p>Status changes apply only to this boarding request/stay.</p>
    </article>
    <div class="record-actions">\${nextStatuses.length ? nextStatuses.map((nextStatus) => \`<button type="button" class="secondary-button" data-action="transition-boarding-stay" data-dog-id="\${escapeHtml(record.id || "")}"\${stayAttrs} data-next-status="\${escapeHtml(nextStatus)}">\${escapeHtml(stayTransitionLabel(status, nextStatus))}</button>\`).join("") : "<p>No status changes are available for this stay.</p>"}</div>
  </section>\`;
}

function openBoardingStayStatusMenu(record = activeBoardingDog(), stayId = "") {
  const displayRecord = boardingDogWithStayStatus(record || {});
  const stay = boardingStayByReference(displayRecord, stayId);
  if (!displayRecord?.id || !stay) {
    showToast("This boarding stay could not be opened.");
    return;
  }
  showDetailDialog("Update Stay Status", boardingStayStatusMenuHtml(displayRecord, stay), null, {
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
  const transitioned = withBoardingStatusTransition(record, nextStatus, options);
  if (!transitioned) {
    showToast("That stay status transition is not allowed.");
    return null;
  }
  const updated = upsertRecord("boardingDog", transitioned);
  await sendPayload(updated);
  await syncDuplicateBoardingStayStatusRecords(record, updated, targetStay || boardingStayByReference(updated, options), nextStatus, options);
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
  const timestamp = new Date().toISOString();
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
  const updated = upsertRecord("boardingDog", {
    ...transitioned,
    boardingStatus: summaryStatus,
    approvedAt: record.approvedAt || timestamp,
    approvedBy: record.approvedBy || currentUser?.name || helperName?.value || "",
    cancelledAt: "",
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
        date: timestamp,
        by: currentUser?.name || helperName?.value || "",
      },
    ],
    flags: (record.flags || []).filter((flag) => flag !== "Required update from owner"),
  });
  await sendPayload(updated);
  await syncDuplicateBoardingStayStatusRecords(record, updated, targetStay, "Approved", options);
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
  const add = (label, date, by, note = "") => {
    if (!date && !note) return;
    events.push({ label, date, by, note });
  };
  add("Boarding request entered", stay.submittedAt || record.submittedAt, record.requestedBy || record.ownerName || record.submittedBy, stay.stayNotes || "");
  add("Request approved", stay.approvedAt || record.approvedAt, stay.approvedBy || record.approvedBy, "");
  add("Checked in", stay.checkedInAt || record.checkedInAt || stay.checkIn?.verifiedAt, stay.checkedInBy || stay.checkIn?.verifiedBy || record.checkedInBy, stay.checkIn?.belongings ? \`Belongings: \${stay.checkIn.belongings}\` : "");
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
      <p>\${escapeHtml(formatDateTime(stay.dropoffTime))} to \${escapeHtml(formatDateTime(stay.pickupTime))}</p>
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
  list.innerHTML = stays.length
    ? stays
        .map((stay) => {
          const events = boardingStayLifecycleEvents(displayRecord, stay);
          const location = [stay.kennelBuilding || displayRecord.kennelBuilding, stay.kennelLocationName || displayRecord.kennelLocationName].filter(Boolean).join(" - ");
          const requestCode = boardingStayRequestCode(displayRecord, stay);
          return \`<article class="record-card clickable-card compact-record-card" data-action="view-boarding-stay-history" data-id="\${escapeHtml(stay.id || "")}" data-request-code="\${escapeHtml(requestCode)}">
            <strong>\${escapeHtml(formatDateTime(stay.dropoffTime))} to \${escapeHtml(formatDateTime(stay.pickupTime))}</strong>
            <div class="chip-row">\${boardingStayRequestCodeChipHtml(displayRecord, stay)}\${boardingStayStatusChipHtml(displayRecord, stay)}</div>
            <p>\${escapeHtml(location || boardingStayServicesText(stay) || "No location or service request saved")}</p>
            <span>\${events.length} lifecycle event\${events.length === 1 ? "" : "s"}</span>
          </article>\`;
        })
        .join("")
    : "<p>No boarding history is available for this dog yet.</p>";
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
        <p>\${escapeHtml(record.dogName || "Boarding dog")} | \${escapeHtml(boardingStayRequestCode(record, stay))} | \${escapeHtml(formatDateTime(stay.dropoffTime))} to \${escapeHtml(formatDateTime(stay.pickupTime))}</p>
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
  const activeBoarding = activeBoardingPricingServices();
  if (isMemberUser(user)) return activeBoarding.find((service) => serviceHasFlag(service, "Member Pricing")) || activeBoarding[0];
  return activeBoarding.find((service) => !serviceHasFlag(service, "Member Pricing")) || activeBoarding[0];
}
//# sourceURL=snuggle-stay/boarding.js
`;
(0, eval)(__snuggleStayModuleSource);
