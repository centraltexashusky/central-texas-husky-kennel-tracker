# Wix Setup Guide: Kennel Task Tracker

## Goal

Host the kennel tracker so Ms. Yuko or another kennel helper can click a link, sign in with Google, clock in, complete the checklist, clock out, and submit the information into a Google Sheet.

## Recommended Launch Path

For the first live version, use this practical path:

1. Host the tracker as a small web app.
2. Embed the app link into a private Wix page.
3. Send the Wix page link to the kennel helper.
4. Connect the form submission to Google Sheets through Google Apps Script.

This is the fastest way to launch and test the workflow.

## Wix Option 1: Embed The Tracker In A Wix Page

This is the easiest path.

Steps:

1. Publish the tracker files to a static host such as GitHub Pages, Netlify, or another HTTPS host.
2. In Wix, create a page called:
   `Kennel Tracker`
3. Hide the page from the site menu.
4. Add an Embed / iFrame element.
5. Paste the hosted tracker URL.
6. Set the iframe width to 100%.
7. Make the iframe tall enough for mobile use.
8. Send the Wix page link to the kennel helper.

Important:
Google login requires HTTPS and a real domain. It will not fully work from the local `file://` review page.

## Wix Option 2: Wix-Hosted Custom Element

This keeps the app hosted inside Wix, but it takes more setup.

Steps:

1. Turn on Velo in Wix.
2. Add a custom element file under:
   `public/custom-elements/kennel-task-tracker.js`
3. Convert the tracker into a Web Component.
4. Add a Custom Element to the Wix page.
5. Set the tag name to:
   `kennel-task-tracker`
6. Choose the Velo file as the source.
7. Publish and test on mobile.

COO recommendation:
Use Option 1 first. Move to Option 2 after the system is proven.

## Google Login Setup

1. Go to Google Cloud Console.
2. Create or open a Central Texas Husky project.
3. Configure the OAuth consent screen.
4. Create an OAuth Client ID.
5. Choose Web application.
6. Add the live domain as an authorized JavaScript origin:
   `https://www.centraltexashusky.com`
7. Copy the Client ID.
8. Paste the Client ID into the tracker:

```html
<meta name="google-client-id" content="YOUR_CLIENT_ID_HERE" />
```

9. Paste the same Client ID into the Apps Script:

```js
const GOOGLE_CLIENT_ID = "YOUR_CLIENT_ID_HERE";
```

## Google Sheet Setup

1. Create a Google Sheet called:
   `Central Texas Husky Kennel Reports`
2. Open Extensions > Apps Script.
3. Paste the code from:
   `google-apps-script.js`
4. Set the `GOOGLE_CLIENT_ID`.
5. Deploy as a Web App.
6. Set access according to your Google Workspace needs.
7. Copy the Web App URL.
8. Paste it into:

```js
const GOOGLE_SCRIPT_URL = "YOUR_APPS_SCRIPT_WEB_APP_URL_HERE";
```

## Final Helper Message

Hi Ms. Yuko,

Please use this link for your kennel shift:

[Insert Wix kennel tracker page link]

When you arrive, sign in with Google and clock in. Before you leave, let the dogs out again between 1:00 PM and 1:30 PM, pick up after them, spend a little social/play time with them, take a photo or video for social media, complete the checklist, clock out, and submit the report.

Thank you,

Central Texas Husky
