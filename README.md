# Central Texas Husky Kennel Task Tracker

This is a review version of the kennel task tracking app.

## What It Does Now

- Opens as a simple web page
- Works well on phone or desktop
- Lets the kennel helper check off daily tasks
- Adds sidebar sections for Daily Tasks, Our Dogs, Boarding Dogs, Request, and Maintenance
- Uses a 4 digit helper PIN to fill helper name and email
- Includes a clock-in and clock-out timesheet section
- Shows Monday weekly tasks
- Shows Tuesday trash task
- Shows monthly deep-clean rotation
- Sends records to Google Sheets and keeps recent submissions visible on the page

## What It Will Do After Google Sheet Setup

- The owner emails or texts the page link to the kennel helper
- The helper opens the app link and enters their assigned PIN
- The helper clocks in, completes the checklist, clocks out, and submits the daily report
- The page sends the report to a Google Sheet
- The owner reviews daily task history, timesheets, dog records, boarding records, requests, maintenance issues, health notes, supplies, and social content ideas in one place

## Sidebar Sections

- Daily Tasks: the original kennel checklist and timesheet
- Our Dogs: call name, show name, DOB, sex, vaccines, heartworm medication, baths, heat cycles, food amount, exercise, training, and care notes
- Boarding Dogs: owner contact, emergency contact, vet authorization, boarding schedule, vaccine records, required owner updates, special care, daily owner updates, and requested services
- Request: items needed and good-to-have suggestions from kennel help
- Maintenance: repairs or attention needed, with an Urgent Attention option
- Timesheet: clock in/out, manual entries, current-week records, and last week/month/year summaries

## Free Persistent Database Options

Best free option for this app:
Use Google Sheets as the database with Google Apps Script as the backend. It is free for this scale and keeps the data somewhere you can review, filter, and export.

Current setup:
The app submits records to Google Sheets and also reads dog, boarding, request, maintenance, and timesheet records back from a `Database` tab using the Apps Script endpoint. This is what lets desktop and mobile share records.

Important deployment note:
Whenever `google-apps-script.js` changes, paste the updated code into Apps Script and redeploy a new web app version. Whenever `index.html`, `styles.css`, or `script.js` changes, upload the updated files to GitHub.

Other options:
- Wix CMS: easiest if already included in your Wix plan.
- Firebase free tier: good app database, more technical setup.
- Supabase free tier: good app database, more technical setup.

## Maintenance Media

The current form lets helpers select photo/video files and paste a shared media link. Email links cannot automatically attach local files from a browser. Best workflow:

1. Helper uploads photo/video to a shared Google Drive folder.
2. Helper pastes the Drive link into the Maintenance form.
3. If Urgent Attention is checked, the email includes the pasted link.

More advanced option:
Apps Script can receive base64 file uploads and save them to Drive, but video files can hit size and speed limits. For reliability, pasted Drive links are better.

## Dog Profile Photos

The app supports profile photo upload previews and profile photo links. For reliable cross-device use, use the profile photo link field:

1. Upload the dog photo to a shared Google Drive folder.
2. Copy the share link.
3. Paste it into the dog profile photo link field.

Browser-uploaded image previews can work for small photos, but large images may not sync well through Google Sheets. Drive links are the safer long-term method.

## Wix Hosting Plan

Recommended path:
Use Wix Velo with a Wix-hosted custom element. Wix documentation says custom elements can be hosted by Wix through Velo in the `public/custom-elements/` folder, then added to a page from the editor as a Custom Element.

Simpler alternative:
Host this folder on a small static host such as GitHub Pages or Netlify and embed it into Wix using an HTML iframe. This is easier, but it means the app itself is not hosted by Wix.

## Helper PIN Login

Helper PINs are set near the top of `script.js`:

```js
const HELPER_PINS = {
  "1001": { name: "Ms. Yuko", email: "yuko@centraltexashusky.com", key: "helper-yuko" },
  "1002": { name: "Lexi", email: "lexi@centraltexashusky.com", key: "helper-lexi" },
};
```

Update the PINs and helper emails before publishing. The PIN field is hidden on screen as `****`.

This avoids Google Cloud, OAuth, and paid subscription confusion.

## Google Sheet Connection

1. Create or open the tracking Google Sheet.
2. Open Extensions > Apps Script.
3. Paste the code from `google-apps-script.js`.
4. Deploy as a web app.
5. Copy the web app URL.
6. Paste that URL into `GOOGLE_SCRIPT_URL` in `script.js`.

```js
const GOOGLE_SCRIPT_URL = "PASTE_APPS_SCRIPT_WEB_APP_URL_HERE";
```

The Apps Script creates these tabs as needed:

- Kennel Reports
- Our Dogs
- Boarding Dogs
- Requests
- Maintenance
- Timesheet
- Database

Urgent maintenance items automatically send an email to `centraltexashusky@gmail.com` after Apps Script is connected.

## Wix Custom Element Conversion

For Wix-hosted custom elements, the current app will need to be converted from three files into a Wix custom element JavaScript file. The easiest conversion is:

1. Put the HTML from `index.html` into a template string.
2. Put the CSS from `styles.css` into a `<style>` tag inside the component.
3. Put the behavior from `script.js` inside the component after rendering.
4. Save the file under Wix Velo as:
   `public/custom-elements/kennel-task-tracker.js`
5. Add a Custom Element on the Wix page.
6. Set the custom element tag name to:
   `kennel-task-tracker`
7. Choose the Velo file as the source.

COO recommendation:
For the first live version, I would use the simpler iframe/external static host path to get it working fast. Once the workflow is proven, convert it into a Wix-hosted custom element.

## Suggested Email/Text To Ms. Yuko

Hi Ms. Yuko,

Please clock in and complete the kennel checklist here:

[Insert app link]

Enter your assigned 4 digit PIN when the page opens. At the end of the shift, please let the dogs out again between 1:00 PM and 1:30 PM, pick up after them, spend a little social/play time with them, take a photo or video for social media, clock out, and submit the report.

Thank you,

Central Texas Husky
