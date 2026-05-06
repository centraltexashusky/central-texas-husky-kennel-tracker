# Central Texas Husky Kennel Task Tracker

This is a review version of the kennel task tracking app.

## What It Does Now

- Opens as a simple web page
- Works well on phone or desktop
- Lets the kennel helper check off daily tasks
- Adds sidebar sections for Daily Tasks, Our Dogs, Boarding Dogs, Request, and Maintenance
- Uses a private helper link to fill helper name and email
- Includes a clock-in and clock-out timesheet section
- Shows Monday weekly tasks
- Shows Tuesday trash task
- Shows monthly deep-clean rotation
- Saves demo submissions in the browser only

## What It Will Do After Google Sheet Setup

- The owner emails or texts the page link to the kennel helper
- The helper opens the private link
- The helper clocks in, completes the checklist, clocks out, and submits the daily report
- The page sends the report to a Google Sheet
- The owner reviews daily task history, timesheets, dog records, boarding records, requests, maintenance issues, health notes, supplies, and social content ideas in one place

## Sidebar Sections

- Daily Tasks: the original kennel checklist and timesheet
- Our Dogs: call name, show name, DOB, sex, vaccines, heartworm medication, baths, heat cycles, food amount, exercise, training, and care notes
- Boarding Dogs: owner contact, emergency contact, vet authorization, boarding schedule, vaccine records, required owner updates, special care, daily owner updates, and requested services
- Request: items needed and good-to-have suggestions from kennel help
- Maintenance: repairs or attention needed, with an Urgent Attention option

## Wix Hosting Plan

Recommended path:
Use Wix Velo with a Wix-hosted custom element. Wix documentation says custom elements can be hosted by Wix through Velo in the `public/custom-elements/` folder, then added to a page from the editor as a Custom Element.

Simpler alternative:
Host this folder on a small static host such as GitHub Pages or Netlify and embed it into Wix using an HTML iframe. This is easier, but it means the app itself is not hosted by Wix.

## Private Helper Link

Use a private link like this:

```text
https://centraltexashusky.github.io/central-texas-husky-kennel-tracker/?helper=Ms.%20Yuko&email=yuko@example.com&key=cth-yuko
```

Replace the email with the correct helper email. The `key` value is a simple private identifier that can be stored with each submission.

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

[Insert private helper link]

At the end of the shift, please let the dogs out again between 1:00 PM and 1:30 PM, pick up after them, spend a little social/play time with them, take a photo or video for social media, clock out, and submit the report.

Thank you,

Central Texas Husky
