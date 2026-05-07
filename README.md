# Central Texas Husky Kennel Task Tracker

This is a review version of the kennel operations app.

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
- Saves records locally for review and sends records to Supabase when the user signs in with Google/Facebook
- Keeps PIN login available for quick local testing

## What It Will Do After Supabase Setup

- The owner emails or texts the page link to the kennel helper
- The helper opens the app link and signs in
- The helper clocks in, completes the checklist, clocks out, and submits the daily report
- The page sends the report to the kennel database
- The owner reviews daily task history, timesheets, dog records, boarding records, requests, maintenance issues, health notes, supplies, and social content ideas in one place

## Sidebar Sections

- Daily Tasks: the original kennel checklist and timesheet
- Our Dogs: call name, show name, DOB, sex, vaccines, heartworm medication, baths, heat cycles, food amount, exercise, training, and care notes
- Boarding Dogs: owner contact, emergency contact, vet authorization, boarding schedule, vaccine records, required owner updates, special care, daily owner updates, and requested services
- Request: items needed and good-to-have suggestions from kennel help
- Maintenance: repairs or attention needed, with an Urgent Attention option
- Timesheet: clock in/out, manual entries, current-week records, and last week/month/year summaries

## Persistent Database

Current setup:
The app uses Supabase as the persistent database. Google/Facebook sign-in saves records across desktop and mobile. PIN login is kept as a local fallback only and does not sync across devices.

Important deployment note:
Whenever `index.html`, `styles.css`, or `script.js` changes, upload the updated files to GitHub or your Wix-hosted version.

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

Browser-uploaded image previews can work for small photos, but shared links are still the safest long-term method for cross-device media review.

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

PIN login is useful for local review only. Use Google/Facebook sign-in for records that need to sync across devices.

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
