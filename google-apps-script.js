// Google Apps Script endpoint for the final Google Sheet connection.
// Paste this into Apps Script attached to the response spreadsheet, deploy it
// as a web app, and put the deployment URL into GOOGLE_SCRIPT_URL in script.js.
// Optional: set helper keys below to reject unknown/private links.

const ALLOWED_HELPER_KEYS = [];

function doPost(e) {
  const sheetName = "Kennel Reports";
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
  const payload = JSON.parse(e.postData.contents);

  if (ALLOWED_HELPER_KEYS.length && !ALLOWED_HELPER_KEYS.includes(payload.helperKey)) {
    throw new Error("Unknown helper key.");
  }

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

  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}
