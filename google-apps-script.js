// Google Apps Script endpoint for the final Google Sheet connection.
// Paste this into Apps Script attached to the response spreadsheet, deploy it
// as a web app, and put the deployment URL into GOOGLE_SCRIPT_URL in script.js.
// For Google login verification, paste your OAuth web client ID below.

const GOOGLE_CLIENT_ID = "";

function doPost(e) {
  const sheetName = "Kennel Reports";
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
  const payload = JSON.parse(e.postData.contents);

  if (GOOGLE_CLIENT_ID && payload.googleIdToken) {
    const tokenResponse = UrlFetchApp.fetch(
      "https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(payload.googleIdToken),
    );
    const tokenInfo = JSON.parse(tokenResponse.getContentText());

    if (tokenInfo.aud !== GOOGLE_CLIENT_ID) {
      throw new Error("Google login token audience did not match this app.");
    }

    payload.helperEmail = tokenInfo.email || payload.helperEmail;
    payload.helperName = tokenInfo.name || payload.helperName;
  }

  const headers = [
    "Submitted At",
    "Date",
    "Helper Name",
    "Helper Email",
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
