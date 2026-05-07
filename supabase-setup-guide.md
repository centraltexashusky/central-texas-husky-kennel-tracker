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
4. Enable Facebook only if you want Facebook login and have the Facebook app credentials ready.
5. Go to URL Configuration.
6. Add your live website URL as an allowed redirect URL.
7. Add your GitHub Pages URL if you still use GitHub Pages for testing.
8. Add your Wix page URL if Wix will host or embed the tracker.

## 4. Review Before Deploying

Open the local file:

`index.html`

The page will work in local fallback mode until Supabase URL and anon key are added. Google and Facebook login need the page to be hosted on a real URL.

## 5. Admin Access

Admin access is controlled in `script.js`:

```js
const ADMIN_EMAILS = ["centraltexashusky@gmail.com"];
```

Add another email inside that list if another person should see admin-only pages like pricing and financials.
