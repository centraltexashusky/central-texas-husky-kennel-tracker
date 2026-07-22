// === MODULE: AUTH ===
const __snuggleStayModuleSource = `function supabaseReady() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase);
}

function roleForAccount(account = {}) {
  account = account || {};
  const email = account.email?.toLowerCase();
  const saved = savedUserFor(account);
  if (saved?.role) return saved.role;
  if (account.role) return account.role;
  if (getAdminEmails().includes(email)) return "admin";
  return "customer";
}

function isStaffRole(role = currentRole()) {
  return ["admin", "helper", "staff"].includes(role);
}

function isCustomerRole(role = currentRole()) {
  return ["customer", "member", "customer | member"].includes(role);
}

function accountSessionKey(account = {}) {
  return account?.key || account?.authId || account?.id || normalizeEmail(account?.email || "");
}

function userFromSupabase(supabaseUser) {
  if (!supabaseUser?.email) return null;
  const email = supabaseUser.email.toLowerCase();
  const name = supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || email.split("@")[0];
  const saved = savedUserFor({ email, key: supabaseUser.id });
  const role = saved?.role || supabaseUser.app_metadata?.role || roleForAccount({ email, key: supabaseUser.id });
  return {
    name,
    email,
    key: supabaseUser.id,
    role,
    authProvider: "supabase",
  };
}

async function loginWithProvider(provider) {
  if (!supabaseClient) {
    showToast("Database login setup is not complete yet. Email/password login needs Supabase Auth.");
    return;
  }
  if (window.location.protocol === "file:") {
    showDetailDialog(
      "Hosted Website Required",
      \`<p>Google and Facebook sign-in cannot finish from this file preview. Open the hosted site, or run the app from a local test server URL that is added to Google OAuth and Supabase redirect settings.</p>\`,
    );
    return;
  }
  clearLocalAppSession({ switchToLogin: true });
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider,
    options: { redirectTo: authRedirectUrl() },
  });
  if (error) showToast(error.message);
}

function authRedirectUrl() {
  try {
    const currentUrl = new URL(window.location.href);
    const currentPath = currentUrl.pathname.replace(/\\/+$/, "");
    if (currentUrl.origin === "https://www.centraltexashusky.com" && currentPath === "/kennel-tracker") {
      return APP_PRODUCTION_URL;
    }
    if (currentUrl.origin === "https://centraltexashusky.github.io" && currentPath === "/central-texas-husky-kennel-tracker") {
      return APP_PRODUCTION_URL;
    }
    if (currentUrl.origin === "https://kennel.centraltexashusky.com") {
      return APP_PRODUCTION_URL;
    }
    if (["localhost", "127.0.0.1", "::1"].includes(currentUrl.hostname)) {
      return currentUrl.href.split("#")[0];
    }
  } catch (error) {
    console.warn("Could not inspect current auth redirect URL.", error);
  }
  return APP_AUTH_REDIRECT_URL;
}

function showAuthRedirectError() {
  const hash = window.location.hash?.replace(/^#/, "") || "";
  const params = new URLSearchParams(hash);
  const error = params.get("error") || params.get("error_code");
  const description = params.get("error_description");
  if (!error && !description) return;
  showDetailDialog("Google Login Failed", \`<p>\${escapeHtml(description || error || "The OAuth login did not complete.")}</p><p>Confirm this exact redirect URL is allowed in Supabase: \${escapeHtml(authRedirectUrl())}</p>\`);
  window.history.replaceState({}, document.title, \`\${window.location.pathname}\${window.location.search}\`);
}

function hydrateLoginFromUrl() {
  if (!isLocalTestingOrigin()) return;
  const params = new URLSearchParams(window.location.search);
  const email = params.get("email") || "";
  const password = params.get("password") || "";
  const role = params.get("role") || "admin";
  const loginForm = $("#passwordLoginForm");
  if (email && loginForm?.elements.email) loginForm.elements.email.value = email;
  if (password && loginForm?.elements.password) loginForm.elements.password.value = password;
  if (params.get("localTest") === "1" && email) {
    params.delete("localTest");
    completeLocalTestLogin(email, "localTest=1 was used on a local testing URL", role);
  }
  if (password || params.get("localTest") === "1") {
    params.delete("password");
    params.delete("localTest");
    const cleanQuery = params.toString();
    const cleanUrl = \`\${window.location.pathname}\${cleanQuery ? \`?\${cleanQuery}\` : ""}\${window.location.hash || ""}\`;
    window.history.replaceState({}, document.title, cleanUrl);
  }
}

async function activeSupabaseAdminSession() {
  if (!supabaseClient) return { session: null, error: "Supabase Auth is not available." };
  const { data: sessionData } = await supabaseClient.auth.getSession();
  if (!sessionData.session?.access_token) {
    return { session: null, error: "Sign in with the admin email and password again before changing passwords." };
  }
  const { data: userData, error: userError } = await supabaseClient.auth.getUser();
  if (userError || !userData.user?.email) {
    return { session: null, error: userError?.message || "The admin session could not be verified." };
  }
  const sessionEmail = userData.user.email.toLowerCase();
  if (!adminEmailList().includes(sessionEmail)) {
    return { session: null, error: \`The active Supabase session is \${sessionEmail}, which is not an admin account.\` };
  }
  return { session: sessionData.session, error: "" };
}

function authThrottleWait(action, email, minimumMs = 60000) {
  const throttle = readAuthThrottle();
  const lastAttempt = Number(throttle[throttleKey(action, email)] || 0);
  const remaining = minimumMs - (Date.now() - lastAttempt);
  return remaining > 0 ? remaining : 0;
}

function cachedSupabaseSessionUser(supabaseUser = null) {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(stateKeys.session) || "null");
  } catch (error) {
    return null;
  }
  if (!saved?.key || saved.authProvider === "local-test" || saved.authProvider === "admin-impersonation") return null;
  const savedEmail = normalizeEmail(saved.email);
  const sessionEmail = normalizeEmail(supabaseUser?.email);
  if (sessionEmail && savedEmail && sessionEmail !== savedEmail) return null;
  return saved;
}

async function loginWithPassword(event) {
  event.preventDefault();
  const formEl = event.currentTarget;
  if (!validateForm(formEl)) return;
  const data = formPayload(formEl);
  const email = data.email.trim().toLowerCase();
  if (!supabaseClient) {
    if (isLocalTestingOrigin()) {
      completeLocalTestLogin(email, "Supabase is not available from this local test page");
      return;
    }
    showDetailDialog("Login Setup Needed", "<p>Email and password login needs the Supabase connection first.</p>");
    return;
  }
  const button = formEl.querySelector('button[type="submit"]');
  setSubmitState(button, true, "Signing in...");
  const { data: authData, error } = await supabaseClient.auth.signInWithPassword({ email, password: data.password });
  setSubmitState(button, false);
  if (error) {
    if (isLocalTestingOrigin()) {
      completeLocalTestLogin(email, error.message || "local Supabase Auth failed");
      return;
    }
    showDetailDialog(
      isEmailConfirmationError(error.message) ? "Email Confirmation Needed" : "Login Failed",
      isEmailConfirmationError(error.message)
        ? \`<p>Open the confirmation email sent to \${escapeHtml(email)}, confirm the account, then return here and sign in.</p>\`
        : \`<p>\${escapeHtml(error.message)}</p>\`,
    );
    return;
  }
  suppressAuthSyncUntil = Date.now() + 3000;
  const user = await syncAuthenticatedSupabaseUser(authData.user);
  if (!user) return;
  switchPage(isCustomerRole(user.role) ? "customerPage" : "dashboardPage");
  formEl.reset();
  showToast(\`\${user.name} is logged in.\`);
}

function requirePasswordChangeIfNeeded() {
  if (!supabaseClient || !currentUser?.email || !passwordChangeRequiredForUser(currentUser)) return;
  const dialog = $("#passwordChangeDialog");
  $("#forcePasswordChangeForm").reset();
  if (!dialog.open) dialog.showModal();
}

async function restoreSupabaseSession() {
  if (!supabaseClient) return false;
  let sessionResult = null;
  try {
    sessionResult = await withTimeout(supabaseClient.auth.getSession(), AUTH_BOOT_TIMEOUT_MS, "Supabase session restore");
  } catch (error) {
    if (isTimeoutError(error)) {
      const cachedUser = cachedSupabaseSessionUser();
      if (cachedUser) {
        setHelper(cachedUser, { switchAfterLogin: false, render: false });
        modeLabel.textContent = "Restored; sync pending";
        return true;
      }
    }
    console.warn("Could not restore Supabase session.", error);
    return false;
  }
  const { data, error } = sessionResult || {};
  if (error || !data?.session?.user) return false;
  const shellUser = shellUserFromSupabaseSession(data.session.user);
  if (!shellUser) return false;
  setHelper(shellUser, { switchAfterLogin: false, render: false });
  syncAuthenticatedSupabaseUser(data.session.user, {
    switchAfterLogin: false,
    awaitRemoteLoad: false,
    deferProfileWrite: true,
    render: false,
    initialPageId: rememberedPageForRole(shellUser.role),
  }).catch((syncError) => {
    console.warn("Could not finish Supabase profile sync after shell restore.", syncError);
  });
  return true;
}

function setHelper(user, options = {}) {
  if (typeof clearRemoteWriteIdentityCache === "function") clearRemoteWriteIdentityCache();
  const key = accountSessionKey(user);
  currentUser = { ...user, key, role: user.role || "helper" };
  localTestMode = currentUser.authProvider === "local-test" || String(currentUser.key || "").startsWith("local-test-");
  if (localTestMode) supabaseClient = null;
  if (options.persistSession !== false) safeLocalStorageSetItem(stateKeys.session, JSON.stringify(currentUser), { quiet: true });
  setDefaultDateAndDay();
  helperName.value = currentUser.name || "";
  helperEmail.value = currentUser.email || "";
  helperKey.value = currentUser.key || "";
  updateHeaderUser();
  applyCurrentUserThemePreference();
  loginStatus.textContent = currentUser.name ? \`\${roleLabel(currentUser.role)} logged in: \${currentUser.name}\` : "Logged in";
  loginHelp.textContent = \`\${currentUser.email || "Account"} | Access: \${roleLabel(currentUser.role)}\`;
  $("#clearHelperButton").hidden = false;
  updateNavigationAccess();
  if (options.render !== false) {
    renderDailyTaskLists();
    fillCustomerDefaults();
    scheduleRender({ activeOnly: true });
    scheduleProfilePhotoHydrationSweep(300);
  }
  if (options.switchAfterLogin !== false) switchPage(rememberedPageForRole(currentUser.role));
  startAutoSync();
}

function clearLocalAppSession(options = {}) {
  stopAutoSync();
  if (typeof clearRemoteWriteIdentityCache === "function") clearRemoteWriteIdentityCache();
  localTestMode = false;
  currentUser = null;
  impersonationSession = null;
  localStorage.removeItem(stateKeys.session);
  localStorage.removeItem(stateKeys.impersonation);
  localStorage.removeItem(stateKeys.lastPage);
  helperName.value = "";
  helperEmail.value = "";
  helperKey.value = "";
  $("#globalQuickSearch").value = "";
  $("#notificationPanel").hidden = true;
  $("#customerSignupForm")?.toggleAttribute("hidden", true);
  $("#passwordRecoveryForm")?.toggleAttribute("hidden", true);
  $("#customerDogForm")?.toggleAttribute("hidden", true);
  $("#customerBookingForm")?.toggleAttribute("hidden", true);
  ["detailDialog", "mediaDialog", "bookingConfirmDialog", "passwordChangeDialog"].forEach((id) => {
    const dialog = document.getElementById(id);
    if (dialog?.open) dialog.close();
  });
  setMobileMoreOpen(false);
  updateHeaderUser();
  loginStatus.textContent = "Not logged in";
  loginHelp.textContent = "Sign in with email and password, Google, or another enabled account provider.";
  $("#clearHelperButton").hidden = true;
  updateNavigationAccess();
  fillCustomerDefaults();
  renderGlobalSearchResults();
  if (options.switchToLogin !== false) switchPage("loginPage");
  else document.body.classList.add("is-login-view");
}

function helperIsLoggedIn() {
  return Boolean(accountSessionKey(currentUser));
}

function currentRole() {
  return currentUser?.role || "";
}

function pageAllowed(pageId) {
  pageId = normalizePageId(pageId);
  if (pageId === "loginPage") return true;
  const page = document.getElementById(pageId);
  if (!page?.classList.contains("page-view")) return false;
  const button = navigationButtonForPage(pageId);
  const roles = (button?.dataset.roles || "helper,admin").split(",");
  const role = currentRole();
  return helperIsLoggedIn() && (roles.includes(role) || (roles.includes("customer") && isCustomerRole(role)) || (role === "staff" && roles.includes("helper")));
}

function defaultPageForRole(role = currentRole()) {
  if (isCustomerRole(role)) return "customerPage";
  if (isStaffRole(role)) return "dashboardPage";
  return "loginPage";
}

function restoreSession() {
  const saved = JSON.parse(localStorage.getItem(stateKeys.session) || "null");
  if (!saved?.key) return false;
  const localSession = saved.authProvider === "local-test" || String(saved.key || "").startsWith("local-test-");
  if (!localSession) {
    localStorage.removeItem(stateKeys.session);
    localStorage.removeItem(stateKeys.impersonation);
    return false;
  }
  impersonationSession = JSON.parse(localStorage.getItem(stateKeys.impersonation) || "null");
  if (!impersonationSession?.admin?.key) impersonationSession = null;
  setHelper(saved, { switchAfterLogin: false, render: false });
  return true;
}

function settingsFormProfileData(formEl = activeSettingsUserForm()) {
  if (!formEl) return {};
  const data = formPayload(formEl);
  const field = (name) => formEl.elements.namedItem(name);
  data.id = String(field("recordId")?.value || field("id")?.value || "").trim();
  data.name = String(field("name")?.value || "").trim();
  data.email = normalizeEmail(field("email")?.value || "");
  data.role = String(field("role")?.value || "customer").trim();
  delete data.recordId;
  delete data.temporaryPassword;
  delete data.temporaryPasswordConfirm;
  delete data.requirePasswordChange;
  data.isMember = Boolean(field("isMember")?.checked);
  const hourlyRate = Number(data.hourlyRate || 0);
  data.hourlyRate = isStaffRole(data.role) && Number.isFinite(hourlyRate) && hourlyRate > 0
    ? Number(hourlyRate.toFixed(2))
    : "";
  return data;
}

async function saveSettingsUserProfile(extra = {}, formEl = activeSettingsUserForm()) {
  if (!formEl) {
    showToast("Open Add User first.");
    return null;
  }
  if (!validateForm(formEl)) return null;
  const data = settingsFormProfileData(formEl);
  const existing = data.id ? readRecords("settingsUser").find((user) => user.id === data.id) : savedUserFor({ email: data.email });
  const payload = {
    ...existing,
    ...data,
    ...extra,
    type: "settingsUser",
    id: data.id || existing?.id || uid("settingsUser"),
    submittedAt: existing?.submittedAt || new Date().toISOString(),
    removed: false,
  };
  const record = upsertRecord("settingsUser", payload);
  await sendPayload(record);
  settingsUserTab = settingsUserTabFor(record);
  renderSettingsUsers();
  return record;
}

async function adminSetTemporaryPassword(formEl = activeSettingsUserForm(), button = $("#adminSetPasswordButton")) {
  if (!formEl) {
    showToast("Open a user before changing a password.");
    return;
  }
  if (currentRole() !== "admin") {
    showToast("Admin access required.");
    return;
  }
  if (!supabaseClient) {
    showDetailDialog("Supabase Required", "<p>Admin password changes require Supabase Auth.</p>");
    return;
  }
  const { session, error: sessionError } = await activeSupabaseAdminSession();
  if (!session) {
    showDetailDialog("Admin Sign-In Required", \`<p>\${escapeHtml(sessionError)}</p><p>Use the Login page with an admin Settings user, then return to Settings and set the temporary password.</p>\`);
    switchPage("loginPage");
    return;
  }
  const data = settingsFormProfileData(formEl);
  const password = formEl.elements.temporaryPassword.value;
  const confirmPassword = formEl.elements.temporaryPasswordConfirm.value;
  const requirePasswordChange = formEl.elements.requirePasswordChange.checked;
  const passwordRequiredCheck = { field: formEl.elements.temporaryPassword, message: "Enter a temporary password.", valid: Boolean(password) };
  if (!validateForm(formEl, [passwordRequiredCheck, passwordMatchCheck(formEl, "temporaryPassword", "temporaryPasswordConfirm")])) return;
  setSubmitState(button, true, "Setting...");
  const { data: functionData, error } = await supabaseClient.functions.invoke("admin-set-password", {
    body: {
      email: data.email.trim().toLowerCase(),
      authId: (data.authId || "").trim(),
      name: data.name.trim(),
      role: data.role,
      password,
      requirePasswordChange,
    },
  });
  setSubmitState(button, false);
  if (error || functionData?.error) {
    const message = functionData?.error || (await edgeFunctionErrorMessage(error));
    showDetailDialog("Password Not Changed", \`<p>\${escapeHtml(message)}</p>\`);
    return;
  }
  await loadRemoteRecords();
  const existing = data.id ? readRecords("settingsUser").find((user) => user.id === data.id) : savedUserFor({ email: data.email, key: functionData.userId || data.authId });
  const record = upsertRecord("settingsUser", {
    ...existing,
    ...data,
    type: "settingsUser",
    id: functionData.recordId || data.id || existing?.id || uid("settingsUser"),
    submittedAt: existing?.submittedAt || new Date().toISOString(),
    authId: functionData.userId || data.authId || existing?.authId || "",
    authProvider: "supabase",
    passwordChangeRequired: requirePasswordChange,
    passwordChangeRequiredAt: requirePasswordChange ? new Date().toISOString() : "",
    passwordChangeSetBy: currentUser.email,
    removed: false,
  });
  await sendPayload(record);
  renderSettingsUsers();
  formEl.elements.temporaryPassword.value = "";
  formEl.elements.temporaryPasswordConfirm.value = "";
  openSettingsUser(record);
  showDetailDialog(
    "Temporary Password Set",
    \`<p>The temporary password was set for \${escapeHtml(record.email)}. The user will be asked to enter that password and choose a new one after their next password login.</p>\`,
  );
}
//# sourceURL=snuggle-stay/auth.js
`;
(0, eval)(__snuggleStayModuleSource);
