# Snuggle Stay

This is a review version of the kennel operations app.

## What It Does Now

- Opens as a simple web page
- Works well on phone or desktop
- Lets the kennel helper check off daily tasks
- Adds sidebar sections for Daily Tasks, Our Dogs, Boarding Dogs, Request, and Maintenance
- Uses Supabase email/password or OAuth login for customers, helpers, and admin
- Includes a clock-in and clock-out timesheet section
- Shows Monday weekly tasks
- Shows Tuesday trash task
- Shows monthly deep-clean rotation
- Saves records locally for review and sends records to Supabase when the user signs in
- Lets customers create dog profiles with profile photos and vaccination record uploads

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
The app uses Supabase as the persistent database. Email/password, Google, and Facebook sign-in save records across desktop and mobile. User profile and role records are stored in the app database; passwords stay in Supabase Auth.

Important deployment note:
Whenever `index.html`, `styles.css`, or `script.js` changes, upload the updated files to GitHub or your Wix-hosted version.

OAuth route note:
The static route `oauth/consent/index.html` exists so GitHub Pages can serve:

```text
https://centraltexashusky.github.io/central-texas-husky-kennel-tracker/oauth/consent
```

Use `oauth/consent` as the authorization path if a third-party setup screen asks for one. For normal Supabase Google or Facebook login, the provider redirect URI is still the Supabase callback URL, not this route.

## Request And Maintenance Images

The current Request and Maintenance forms accept JPG and PNG image uploads. Email links cannot automatically attach local files from a browser. Best workflow:

1. Helper uploads extra media to a shared Google Drive folder if the file is not a JPG/PNG.
2. Helper pastes the Drive link into the Maintenance form.
3. If Urgent Attention is checked, the email includes the pasted link.

More advanced option:
Apps Script can receive base64 file uploads and save them to Drive, but video files can hit size and speed limits. For reliability, pasted Drive links are better.

## Dog Profile Photos And Vaccines

The app supports durable Supabase uploads for dog profile photos and customer vaccination records. Vaccination records accept PDF, PNG, JPG, and JPEG files and stay linked to the dog record.

Our Dogs and Boarding Dogs still include an optional profile photo link fallback.

## Wix Hosting Plan

Recommended path:
Use Wix Velo with a Wix-hosted custom element. Wix documentation says custom elements can be hosted by Wix through Velo in the `public/custom-elements/` folder, then added to a page from the editor as a Custom Element.

Simpler alternative:
Host this folder on a small static host such as GitHub Pages or Netlify and embed it into Wix using an HTML iframe. This is easier, but it means the app itself is not hosted by Wix.

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

Sign in with your email and password when the page opens. At the end of the shift, please let the dogs out again between 1:00 PM and 1:30 PM, pick up after them, spend a little social/play time with them, take a photo or video for social media, clock out, and submit the report.

Thank you,

Central Texas Husky
