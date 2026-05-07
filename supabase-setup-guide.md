# Central Texas Husky Supabase Setup

Use this after reviewing the local page.

## 1. Create The Database Table

1. Open Supabase.
2. Open your project.
3. Go to SQL Editor.
4. Open `supabase-schema.sql` from this folder.
5. Copy the full SQL into Supabase.
6. Run it.

This creates one table named `kennel_records` for daily tasks, timesheets, dogs, boarding dogs, requests, maintenance, and services.

## 2. Add The Supabase Keys To The Webpage

1. In Supabase, go to Project Settings.
2. Open API.
3. Copy the Project URL.
4. Copy the anon/public key.
5. In `script.js`, replace these two empty values:

```js
const SUPABASE_URL = "";
const SUPABASE_ANON_KEY = "";
```

with your Supabase project values.

## 3. Turn On Login

1. In Supabase, go to Authentication.
2. Open Providers.
3. Enable Google.
4. In the Google provider settings, paste the real Google OAuth Client ID. It usually ends with `.apps.googleusercontent.com`. Do not paste the Google project name.
5. Paste the Google OAuth Client Secret.
6. Enable Facebook only if you want Facebook login and have the Facebook app credentials ready.
7. In the Facebook provider settings, paste the Facebook App ID as the Client ID and the Facebook App Secret as the Client Secret.
8. Use this callback URL in both Google and Facebook provider dashboards:

```text
https://vwvkzniygessvwifrwvn.supabase.co/auth/v1/callback
```

9. In Supabase URL Configuration, add your live tracker URL as an allowed redirect URL.
10. Add your GitHub Pages URL if you still use GitHub Pages for testing.
11. Add your Wix page URL if Wix will host or embed the tracker.

Important: Google and Facebook login will not complete from a `file://` preview. Test social login from the hosted website or from a local web server URL such as `http://localhost:8000`.

## 4. Quick Auth Troubleshooting

Google 403 usually means one of these is wrong:

- The Supabase Google Client IDs field contains the project name instead of the OAuth Client ID.
- Your live website domain is missing from Google Authorized JavaScript origins.
- The callback URL is missing from Google Authorized redirect URIs.
- The Google app is in testing mode and the login email is not added as a test user.
- You are trying to test social login from `file://`.

Facebook refusing the connection usually means one of these is wrong:

- The Facebook app does not have Facebook Login configured.
- The Valid OAuth Redirect URI does not exactly match the Supabase callback URL.
- The Facebook App ID or App Secret in Supabase does not match the Facebook app.
- The Facebook app is still in Development mode and the login user is not added as a tester/admin/developer.
- The `email` permission is not enabled or ready for testing.

## 5. Review Before Deploying

Open the local file:

`index.html`

The page will work in local fallback mode until Supabase URL and anon key are added. Google and Facebook login need the page to be hosted on a real URL.

## 6. Admin Access

Admin access is controlled in `script.js`:

```js
const ADMIN_EMAILS = ["centraltexashusky@gmail.com"];
```

Add another email inside that list if another person should see admin-only pages like pricing and financials.
