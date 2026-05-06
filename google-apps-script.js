// Google Apps Script endpoint for the final Google Sheet connection.
// Paste this into Apps Script attached to the response spreadsheet, deploy it
// as a web app, and put the deployment URL into GOOGLE_SCRIPT_URL in script.js.
// Optional: set helper keys below to reject unknown/private links.

const ALLOWED_HELPER_KEYS = [];
const OWNER_ALERT_EMAIL = "centraltexashusky@gmail.com";
const SPREADSHEET_ID = "1K25et0at9uOi57I28gRzk3dISsQorLV7Zgd8rLoh6QU";

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
    "Supplies Low",
    "Owner Notes",
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
    (payload.suppliesLow || []).join(", "),
    payload.ownerNotes,
  ]);

  return ok();
}

function appendOwnedDog(spreadsheet, payload) {
  const sheet = spreadsheet.getSheetByName("Our Dogs") || spreadsheet.insertSheet("Our Dogs");
  const headers = ["Submitted At", "Call Name", "Show Name", "DOB", "Sex", "Rabies", "DHPP", "Heartworm", "Last Bath", "Next Bath", "Last Heat", "Next Heat", "Food Amount", "Treadmill Minutes", "Scooter Minutes", "Training Progress", "Special Care", "Notes"];
  ensureHeaders(sheet, headers);
  sheet.appendRow([payload.submittedAt, payload.callName, payload.showName, payload.dateOfBirth, payload.sex, payload.rabiesDate, payload.dhppDate, payload.heartwormDate, payload.lastBath, payload.nextBath, payload.lastHeat, payload.nextHeat, payload.foodAmount, payload.treadmillMinutes, payload.scooterMinutes, payload.trainingProgress, payload.specialCare, payload.notes]);
  return ok();
}

function appendBoardingDog(spreadsheet, payload) {
  const sheet = spreadsheet.getSheetByName("Boarding Dogs") || spreadsheet.insertSheet("Boarding Dogs");
  const headers = ["Submitted At", "Dog Name", "Breed", "Owner", "Owner Phone", "Owner Email", "Emergency Name", "Emergency Phone", "Vet Info", "Drop-off", "Pick-up", "Rabies", "DHPP", "Bordetella", "Heartworm", "Flags", "Special Care", "Daily Activity", "Boarding History"];
  ensureHeaders(sheet, headers);
  sheet.appendRow([payload.submittedAt, payload.dogName, payload.breedDescription, payload.ownerName, payload.ownerPhone, payload.ownerEmail, payload.emergencyName, payload.emergencyPhone, payload.vetInfo, payload.dropoffTime, payload.pickupTime, payload.rabiesDate, payload.dhppDate, payload.bordetellaDate, payload.heartwormDate, (payload.flags || []).join(", "), payload.specialCare, payload.dailyActivity, payload.boardingHistory]);
  return ok();
}

function appendRequest(spreadsheet, payload) {
  const sheet = spreadsheet.getSheetByName("Requests") || spreadsheet.insertSheet("Requests");
  const headers = ["Submitted At", "Requested By", "Category", "Urgent", "Request", "Reason"];
  ensureHeaders(sheet, headers);
  sheet.appendRow([payload.submittedAt, payload.requestedBy, payload.category, payload.urgentNeeds ? "Yes" : "No", payload.requestText, payload.reason]);
  if (payload.urgentNeeds && OWNER_ALERT_EMAIL) {
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
  const headers = ["Submitted At", "Reported By", "Location", "Urgent", "Issue", "Media Link", "Media Files", "Suggested Action"];
  ensureHeaders(sheet, headers);
  sheet.appendRow([payload.submittedAt, payload.reportedBy, payload.location, payload.urgentAttention ? "Yes" : "No", payload.issue, payload.mediaLink, payload.mediaFiles, payload.suggestedAction]);
  if (payload.urgentAttention && OWNER_ALERT_EMAIL) {
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
  return ok();
}

function ensureHeaders(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }
}

function ok() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}
