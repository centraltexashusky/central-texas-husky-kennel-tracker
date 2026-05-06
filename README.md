# Central Texas Husky Kennel Task Tracker

This is a review version of the kennel task tracking app.

## What It Does Now

- Opens as a simple web page
- Works well on phone or desktop
- Lets the kennel helper check off daily tasks
- Includes Google login readiness
- Includes a clock-in and clock-out timesheet section
- Shows Monday weekly tasks
- Shows Tuesday trash task
- Shows monthly deep-clean rotation
- Saves demo submissions in the browser only

## What It Will Do After Google Sheet Setup

- The owner emails or texts the page link to the kennel helper
- The helper opens the link and signs in with Google
- The helper clocks in, completes the checklist, clocks out, and submits the daily report
- The page sends the report to a Google Sheet
- The owner reviews all task history, timesheet records, health notes, supplies, and social content ideas in one place

## Wix Hosting Plan

Recommended path:
Use Wix Velo with a Wix-hosted custom element. Wix documentation says custom elements can be hosted by Wix through Velo in the `public/custom-elements/` folder, then added to a page from the editor as a Custom Element.

Simpler alternative:
Host this folder on a small static host such as GitHub Pages or Netlify and embed it into Wix using an HTML iframe. This is easier, but it means the app itself is not hosted by Wix.

## Google Login Setup

1. Go to Google Cloud Console.
2. Create or open a project for Central Texas Husky.
3. Configure the OAuth consent screen.
4. Create an OAuth Client ID.
5. Choose Web application.
6. Add your Wix domain as an authorized JavaScript origin, for example:
   - `https://www.centraltexashusky.com`
7. Copy the Client ID.
8. Paste it into `index.html`:

```html
<meta name="google-client-id" content="PASTE_CLIENT_ID_HERE" />
```

9. Paste the same Client ID into `google-apps-script.js`:

```js
const GOOGLE_CLIENT_ID = "PASTE_CLIENT_ID_HERE";
```

Local note:
Google login will not fully work from a `file://` page. The review login button exists so you can review the flow before hosting.

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

Please sign in with Google, clock in, and complete the kennel checklist here:

[Insert hosted app link]

At the end of the shift, please let the dogs out again between 1:00 PM and 1:30 PM, pick up after them, spend a little social/play time with them, take a photo or video for social media, clock out, and submit the report.

Thank you,

Central Texas Husky
