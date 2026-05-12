# Central Texas Husky Supabase Setup

Use this after reviewing the local page.

## 1. Create The Database Table

1. Open Supabase.
2. Open your project.
3. Go to SQL Editor.
4. Open `supabase-schema.sql` from this folder.
5. Copy the full SQL into Supabase.
6. Run it.

This creates one table named `kennel_records` for daily tasks, timesheets, dogs, boarding dogs, requests, maintenance, services, app users, and calendar notes. It also creates a public Supabase Storage bucket named `kennel-media` for dog profile photos, request/maintenance images, and vaccination record uploads.

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
3. Enable Email login and confirm that email confirmations and password recovery emails are allowed.
4. Leave Supabase's default signup confirmation link enabled, or customize the email text if needed. The tracker now expects the user to click Supabase's "Confirm your mail" link, then return to the tracker and sign in.
5. Enable Google if you want Google login.
6. In the Google provider settings, paste the real Google OAuth Client ID. It usually ends with `.apps.googleusercontent.com`. Do not paste the Google project name.
7. Paste the Google OAuth Client Secret.
8. Enable Facebook only if you want Facebook login and have the Facebook app credentials ready.
9. In the Facebook provider settings, paste the Facebook App ID as the Client ID and the Facebook App Secret as the Client Secret.
10. Use this callback URL in both Google and Facebook provider dashboards:

```text
https://vwvkzniygessvwifrwvn.supabase.co/auth/v1/callback
```

11. In Supabase URL Configuration, set the Site URL to the GitHub Pages app URL. This is the actual page that runs the tracker JavaScript and can receive Supabase recovery/session tokens:

```text
https://centraltexashusky.github.io/central-texas-husky-kennel-tracker/
```

12. Add both live tracker URLs as allowed redirect URLs:

```text
https://centraltexashusky.github.io/central-texas-husky-kennel-tracker/
https://www.centraltexashusky.com/kennel-tracker
```

13. Keep `http://localhost:3000` only for framework development. Do not leave it as the Site URL for production password reset or signup confirmation emails.
14. Remove stale localhost redirect URLs if you do not intentionally test auth callbacks from those URLs.
15. If you customized Supabase email templates, remove any hardcoded `localhost` links. Use Supabase's generated confirmation/recovery URL, or use `{{ .RedirectTo }}` rather than `{{ .SiteURL }}` when building links that should honor the app's `redirectTo` value.
16. In Auth rate limits and bot protection, keep default rate limits on and add CAPTCHA later if signup abuse appears.

Important: the Wix page can remain the public page customers visit, but the Supabase auth callback should land on the GitHub Pages tracker when the Wix page embeds that tracker in an iframe. The token has to arrive on the same page that runs `supabase-js`; otherwise the embedded app may not see the recovery or login session.

If another OAuth setup screen asks for an Authorization Path, use:

```text
oauth/consent
```

That path is implemented at:

```text
https://centraltexashusky.github.io/central-texas-husky-kennel-tracker/oauth/consent
```

Do not enter `/oauth/consent` if the base app URL already ends in `/`; that creates a preview URL with a double slash.

Important: Google and Facebook login will not complete from a `file://` preview. Test social login from the hosted website or from a local web server URL such as `http://localhost:8000`.

## 4. Confirm Media Storage

1. In Supabase, go to Storage.
2. Confirm there is a bucket named `kennel-media`.
3. Confirm it is public.
4. Use a file size limit around 50 MB.
5. Allow JPG, PNG, and PDF uploads. Request and Maintenance forms accept only JPG/PNG; customer dog vaccination records also accept PDF.
6. If the SQL policies were not applied, allow the anon/public key to read and upload objects in this bucket.

## 5. Quick Auth Troubleshooting

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

## 6. Review Before Deploying

Open the local file:

`index.html`

The page will work in local fallback mode until Supabase URL and anon key are added. Google and Facebook login need the page to be hosted on a real URL.

## 7. Admin Access

Admin access is controlled in `script.js`:

```js
const ADMIN_EMAILS = ["centraltexashusky@gmail.com"];
```

Add another email inside that list if another person should see admin-only pages like pricing and financials.

## 8. Admin Password Changes

Admin password changes use the deployed Supabase Edge Function named `admin-set-password`. Do not put a service-role key in `script.js`.

The Settings page can set a temporary password for a user. The user will be required to enter that temporary password and choose a new password after the next email/password login.
