// Google Apps Script endpoint for the final Google Sheet connection.
// Paste this into Apps Script attached to the response spreadsheet, deploy it
// as a web app, and put the deployment URL into GOOGLE_SCRIPT_URL in script.js.
// Optional: set helper keys below to reject unknown/private links.

const ALLOWED_HELPER_KEYS = [];
const OWNER_ALERT_EMAIL = "centraltexashusky@gmail.com";
const SPREADSHEET_ID = "1K25et0at9uOi57I28gRzk3dISsQorLV7Zgd8rLoh6QU";

function doGet(e) {
  const callback = e.parameter.callback;
  const data = readDatabase();
  const text = callback ? `${callback}(${JSON.stringify(data)});` : JSON.stringify(data);
  return ContentService.createTextOutput(text).setMimeType(
    callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON,
  );
}

function doPost(e) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const payload = JSON.parse(e.postData.contents);

  if (ALLOWED_HELPER_KEYS.length && !ALLOWED_HELPER_KEYS.includes(payload.helperKey)) {
    throw new Error("Unknown helper key.");
  }

  if (payload.type === "ownedDog") return appendOwnedDog(spreadsheet, payload);
  if (payload.type === "boardingDog") return appendBoardingDog(spreadsheet, payload);
  if (payload.type === "request") return appendRequest(spreadsheet, payload);
  if (payload.type === "maintenance") return appendMaintenance(spreadsheet, payload);
  if (payload.type === "timesheet") return appendTimesheet(spreadsheet, payload);
  if (payload.type === "service") return appendService(spreadsheet, payload);

  return appendKennelReport(spreadsheet, payload);
}

function appendKennelReport(spreadsheet, payload) {
  const sheet = spreadsheet.getSheetByName("Kennel Reports") || spreadsheet.insertSheet("Kennel Reports");

  const headers = [
    "Submitted At",
    "Date",
    "Helper Name",
    "Helper Email",
    "Helper Key",
    "Day Of Week",
    "Clock In",
    "Clock Out",
    "Total Minutes",
    "Daily Tasks",
    "Dogs Exercised",
    "Dogs Bathed",
    "Health Concern",
    "Health Notes",
    "Social Content",
    "Weekly Tasks",
    "Tuesday Tasks",
    "Monthly Week",
    "Deep Clean Building",
    "Monthly Tasks",
    "Boarding Tasks",
  ];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }

  sheet.appendRow([
    payload.submittedAt,
    payload.date,
    payload.helperName,
    payload.helperEmail,
    payload.helperKey,
    payload.dayOfWeek,
    payload.clockInTime,
    payload.clockOutTime,
    payload.totalMinutes,
    (payload.dailyTasks || []).join(", "),
    payload.dogsExercised,
    payload.dogsBathed,
    payload.healthConcern,
    payload.healthNotes,
    payload.socialContent,
    (payload.weeklyTasks || []).join(", "),
    (payload.tuesdayTasks || []).join(", "),
    payload.monthlyWeek,
    payload.deepCleanBuilding,
    (payload.monthlyTasks || []).join(", "),
    payload.boardingTasks,
  ]);

  return ok();
}

function appendOwnedDog(spreadsheet, payload) {
  const sheet = spreadsheet.getSheetByName("Our Dogs") || spreadsheet.insertSheet("Our Dogs");
  const headers = ["Submitted At", "ID", "Call Name", "Show Name", "Photo Link", "DOB", "Sex", "Spayed / Neutered", "Rabies", "Rabies Good 3 Years", "DHPP", "Heartworm", "Last Bath", "Next Bath", "Last Heat", "Next Heat", "Food Amount", "Exercise Logs", "Training Logs", "Special Care", "Notes"];
  ensureHeaders(sheet, headers);
  sheet.appendRow([payload.submittedAt, payload.id, payload.callName, payload.showName, payload.profilePhotoUrl, payload.dateOfBirth, payload.sex, payload.spayNeuterStatus, payload.rabiesDate, payload.rabiesGoodThreeYears, payload.dhppDate, payload.heartwormDate, payload.lastBath, payload.nextBath, payload.lastHeat, payload.nextHeat, payload.foodAmount, JSON.stringify(payload.exerciseLogs || []), JSON.stringify(payload.trainingLogs || []), payload.specialCare, payload.notes]);
  appendDatabaseRecord(payload);
  return ok();
}

function appendBoardingDog(spreadsheet, payload) {
  const sheet = spreadsheet.getSheetByName("Boarding Dogs") || spreadsheet.insertSheet("Boarding Dogs");
  const headers = ["Submitted At", "ID", "Dog Name", "Photo Link", "Breed", "Sex", "Spayed / Neutered", "Owner", "Owner Phone", "Owner Email", "Emergency Name", "Emergency Phone", "Vet Info", "Rabies", "Rabies Good 3 Years", "DHPP", "Bordetella", "Heartworm", "Flags", "Stays", "Special Care", "Daily Activity", "Boarding History"];
  ensureHeaders(sheet, headers);
  sheet.appendRow([payload.submittedAt, payload.id, payload.dogName, payload.profilePhotoUrl, payload.breedDescription, payload.sex, payload.spayNeuterStatus, payload.ownerName, payload.ownerPhone, payload.ownerEmail, payload.emergencyName, payload.emergencyPhone, payload.vetInfo, payload.rabiesDate, payload.rabiesGoodThreeYears, payload.dhppDate, payload.bordetellaDate, payload.heartwormDate, (payload.flags || []).join(", "), JSON.stringify(payload.stays || []), payload.specialCare, payload.dailyActivity, payload.boardingHistory]);
  appendDatabaseRecord(payload);
  return ok();
}

function appendRequest(spreadsheet, payload) {
  const sheet = spreadsheet.getSheetByName("Requests") || spreadsheet.insertSheet("Requests");
  const headers = ["Submitted At", "Requested By", "Category", "Urgent", "Status", "Completed At", "Completed By", "Request", "Reason", "Media Link", "Media Files"];
  ensureHeaders(sheet, headers);
  sheet.appendRow([payload.submittedAt, payload.requestedBy, payload.category, payload.urgentNeeds ? "Yes" : "No", payload.status || (payload.completed ? "Completed" : "Active"), payload.completedAt || "", payload.completedBy || "", payload.requestText, payload.reason, payload.mediaLink, payload.mediaFiles]);
  appendDatabaseRecord(payload);
  if (payload.urgentNeeds && !payload.completed && OWNER_ALERT_EMAIL) {
    MailApp.sendEmail({
      to: OWNER_ALERT_EMAIL,
      subject: "Urgent Kennel Request",
      body: `Urgent kennel request submitted.\n\nRequested by: ${payload.requestedBy}\nCategory: ${payload.category}\nRequest: ${payload.requestText}\nReason: ${payload.reason}\n\nPlease review right away.`,
    });
  }
  return ok();
}

function appendMaintenance(spreadsheet, payload) {
  const sheet = spreadsheet.getSheetByName("Maintenance") || spreadsheet.insertSheet("Maintenance");
  const headers = ["Submitted At", "Reported By", "Location", "Urgent", "Status", "Completed At", "Completed By", "Issue", "Media Link", "Media Files", "Suggested Action"];
  ensureHeaders(sheet, headers);
  sheet.appendRow([payload.submittedAt, payload.reportedBy, payload.location, payload.urgentAttention ? "Yes" : "No", payload.status || (payload.completed ? "Completed" : "Active"), payload.completedAt || "", payload.completedBy || "", payload.issue, payload.mediaLink, payload.mediaFiles, payload.suggestedAction]);
  appendDatabaseRecord(payload);
  if (payload.urgentAttention && !payload.completed && OWNER_ALERT_EMAIL) {
    MailApp.sendEmail({
      to: OWNER_ALERT_EMAIL,
      subject: "Urgent Kennel Maintenance Attention Needed",
      body: `Urgent maintenance item submitted.\n\nLocation: ${payload.location}\nReported by: ${payload.reportedBy}\nIssue: ${payload.issue}\nSuggested action: ${payload.suggestedAction}\nMedia link: ${payload.mediaLink || "No link provided"}\nFiles selected: ${payload.mediaFiles || "None"}\n\nPlease address or schedule right away.`,
    });
  }
  return ok();
}

function appendTimesheet(spreadsheet, payload) {
  const sheet = spreadsheet.getSheetByName("Timesheet") || spreadsheet.insertSheet("Timesheet");
  const headers = ["Submitted At", "Date", "Helper Name", "Helper Email", "Clock In", "Clock Out", "Hours", "Note"];
  ensureHeaders(sheet, headers);
  sheet.appendRow([payload.submittedAt, payload.date, payload.helperName, payload.helperEmail, payload.clockInTime, payload.clockOutTime, payload.hours, payload.note]);
  appendDatabaseRecord(payload);
  return ok();
}

function appendService(spreadsheet, payload) {
  const sheet = spreadsheet.getSheetByName("Services") || spreadsheet.insertSheet("Services");
  const headers = ["Submitted At", "ID", "Service Name", "Category", "Base Price", "Unit", "Deposit Amount", "Default Duration", "Flags", "Pricing Notes"];
  ensureHeaders(sheet, headers);
  sheet.appendRow([payload.submittedAt, payload.id, payload.serviceName, payload.category, payload.basePrice, payload.unit, payload.depositAmount, payload.defaultDuration, (payload.flags || []).join(", "), payload.pricingNotes]);
  appendDatabaseRecord(payload);
  return ok();
}

function appendDatabaseRecord(payload) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName("Database") || spreadsheet.insertSheet("Database");
  ensureHeaders(sheet, ["Updated At", "Type", "ID", "Payload JSON"]);
  sheet.appendRow([payload.updatedAt || payload.submittedAt || new Date().toISOString(), payload.type, payload.id || "", JSON.stringify(payload)]);
}

function readDatabase() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName("Database");
  const data = { ownedDog: [], boardingDog: [], request: [], maintenance: [], timesheet: [], service: [], dailyTask: [], customerDog: [], settingsUser: [], cfoNote: [], calendarNote: [] };
  if (!sheet || sheet.getLastRow() < 2) return data;
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues();
  const latest = {};
  rows.forEach((row) => {
    const type = row[1];
    const id = row[2];
    const json = row[3];
    if (!data[type] || !id || !json) return;
    const record = JSON.parse(json);
    latest[`${type}:${id}`] = record;
  });
  Object.values(latest).forEach((record) => data[record.type]?.push(record));
  return data;
}

function ensureHeaders(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }
}

function ok() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}
