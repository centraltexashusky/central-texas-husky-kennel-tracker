// Entry paperwork is separate from attendance, ring scheduling and payment.
export const registrationStatuses = ["Planned to go", "Not registered yet", "Submitted — awaiting confirmation", "Registered"];
export function nextRegistrationStatus(status) {
  const index = registrationStatuses.indexOf(status);
  return index >= 0 ? registrationStatuses[index + 1] || null : null;
}
export const passportFields = [
  ["registeredName", "Registered name"], ["akcRegistrationNumber", "AKC / registry number"],
  ["sireName", "Sire’s registered name"], ["damName", "Dam’s registered name"],
  ["dateOfBirth", "Date of birth", "date"], ["ownerNames", "Owner’s name(s)"],
  ["breederNames", "Breeder’s name(s)"], ["breed", "Breed / variety"],
  ["sex", "Sex"], ["countryOfBirth", "Country of birth"],
  ["registrationType", "Registry / registration type"], ["ownerAddress", "Owner mailing address"],
  ["ownerEmail", "Owner email", "email"], ["ownerPhone", "Owner phone", "tel"],
  ["handler", "Agent / handler (if applicable)"], ["junior", "Junior name, number & DOB (if applicable)"],
  ["certificateUrl", "Registration certificate link", "url"],
];
const requiredFields = passportFields.slice(0, 14).map(([key]) => key);
const closed = record => record.removed || ["Completed", "Cancelled", "Canceled", "Scratched"].includes(record.status);
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export function safeRegistrationUrl(value) {
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : ""; } catch { return ""; }
}
export function registrationPassport(profile = {}) {
  const saved = profile.showEntryPassport || {};
  const defaults = { registeredName: profile.registeredName || profile.showName, akcRegistrationNumber: profile.akcRegistrationNumber,
    sireName: profile.sireName, damName: profile.damName, dateOfBirth: profile.dateOfBirth,
    breed: profile.breedDescription || profile.breed, sex: profile.sex, ownerNames: profile.ownerNames || profile.ownerName,
    breederNames: profile.breederNames || profile.breederName, ownerAddress: profile.ownerAddress,
    ownerEmail: profile.ownerEmail, ownerPhone: profile.ownerPhone, countryOfBirth: profile.countryOfBirth, registrationType: profile.registrationType };
  // Current profile identity fields win so later profile corrections cannot be hidden by an old passport.
  const result = { ...defaults, ...saved };
  for (const key of ["registeredName", "akcRegistrationNumber", "sireName", "damName", "dateOfBirth", "breed", "sex"]) {
    if (defaults[key] !== undefined) result[key] = defaults[key];
  }
  return Object.fromEntries(passportFields.map(([key]) => [key, String(result[key] || "").trim()]));
}
export function passportMissing(passport) { return requiredFields.filter(key => !passport[key]); }
export function passportReviewed(profile) {
  if (!profile?.showEntryPassport?.reviewedAt) return false;
  const current = registrationPassport(profile);
  return passportFields.every(([key]) => current[key] === String(profile.showEntryPassport[key] || "").trim());
}
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
}
export function registrationAge(birth, showDate) {
  const dob = validDate(birth), day = validDate(showDate);
  if (!dob || !day || day < dob) return null;
  // Calendar anniversaries, clamped for births on the 29th–31st; never 30-day months.
  let months = (day.getUTCFullYear() - dob.getUTCFullYear()) * 12 + day.getUTCMonth() - dob.getUTCMonth();
  const anniversaryDay = Math.min(dob.getUTCDate(), new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + 1, 0)).getUTCDate());
  if (day.getUTCDate() < anniversaryDay) months--;
  return months;
}
export function registrationAppearances(entry, event, schedules = []) {
  const source = schedules.length ? schedules : [{ id: "primary", ringDate: event.startDate === (event.endDate || event.startDate) ? event.startDate : "", classEntered: entry.classEntered || "" }];
  return source.map((ring, index) => {
    const id = ring.id || `${entry.id}-ring-${index + 1}`;
    const date = ring.ringDate || (event.startDate === (event.endDate || event.startDate) ? event.startDate : "");
    // An event category such as AB/JS describes the whole show, not which
    // competition this dog is entered in (it may also offer beginner puppy).
    const competition = ring.competition || ring.competitionType || entry.competition || "";
    const context = JSON.stringify([event.id, date, ring.classEntered || "", competition]);
    const records = Array.isArray(entry.entryRegistrations) ? entry.entryRegistrations : [];
    const record = [...records].reverse().find(item => item.appearanceId === id && item.context === context);
    const legacyStatus = entry.registrationStatus === "" ? "Planned to go" : registrationStatuses.includes(entry.registrationStatus) ? entry.registrationStatus : entry.status === "Entered" ? "Registered" : "Planned to go";
    return { id, date, competition, classEntered: ring.classEntered || "", context, record,
      status: record?.status || (records.length ? "Not registered yet" : legacyStatus),
      legacy: !record && !records.length && legacyStatus === "Registered" };
  });
}
export function registrationStatusForEntry(entry, event, schedules = []) {
  const statuses = registrationAppearances(entry, event, schedules).map(item => item.status);
  return statuses.every(status => status === "Registered") ? "Registered" : statuses.every(status => status === "Planned to go") ? "Planned to go" : statuses.some(status => status === "Submitted — awaiting confirmation") ? "Submitted — awaiting confirmation" : "Not registered yet";
}
export function registrationEligibility(passport, appearance) {
  const months = registrationAge(passport.dateOfBirth, appearance.date);
  if (months === null) return { blocked: true, text: "Check date of birth and exact show date." };
  if (months < 4) return { blocked: true, text: `${months} calendar months on show day · Under 4 months; not eligible under your rule.` };
  const description = `${appearance.competition} ${appearance.classEntered}`;
  const beginner = /4\s*[-–]\s*6|beginner\s*puppy/i.test(description);
  const other = /sweep|junior|agility|obedience|rally/i.test(description);
  const conflict = !other && (months < 6 ? !beginner && Boolean(description.trim()) : beginner);
  return { blocked: conflict, text: `${months} calendar months on show day · ${months < 6 ? "4–6 Month Beginner Puppy" : "Regular judging"}${conflict ? " — conflicts with the selected competition/class; review the show assignment." : other ? "; verify this separate competition’s rules in the premium." : "; verify class in the premium."}` };
}
export function registrationQueue(deps) {
  const events = new Map(deps.read("showEvent").filter(event => !closed(event)).map(event => [event.id, event]));
  const dogs = new Map();
  for (const entry of deps.read("showEntry")) {
    const event = events.get(entry.showEventId);
    if (!event || closed(entry) || entry.attendanceRole !== "Showing") continue;
    const key = deps.identity(entry);
    if (!dogs.has(key)) {
      const colon = key.indexOf(":"), type = key.slice(0, colon), id = key.slice(colon + 1);
      const profile = deps.read(type).find(record => record.id === id && !record.removed);
      dogs.set(key, { key, profile, type, name: deps.name(entry), entry, passport: registrationPassport(profile), appearances: [] });
    }
    const dog = dogs.get(key);
    dog.appearances.push(...registrationAppearances(entry, event, deps.schedules(entry)).map(appearance => ({ ...appearance, entry, event })));
  }
  return [...dogs.values()].map(dog => ({ ...dog, appearances: dog.appearances.sort((a, b) => a.date.localeCompare(b.date) || a.event.name.localeCompare(b.event.name)) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
export function passportPatch(profile, values, actor, now) {
  const passport = Object.fromEntries(passportFields.map(([key]) => [key, String(values[key] || "").trim()]));
  if (passport.dateOfBirth && !validDate(passport.dateOfBirth)) throw new Error("Enter a valid birth date.");
  if (passport.certificateUrl && !safeRegistrationUrl(passport.certificateUrl)) throw new Error("Use an http or https certificate link.");
  return { showEntryPassport: { ...profile.showEntryPassport, ...passport, reviewedAt: now, reviewedBy: actor },
    registeredName: passport.registeredName, ...(profile.type === "ownedDog" && !profile.showName ? { showName: passport.registeredName } : {}),
    akcRegistrationNumber: passport.akcRegistrationNumber, sireName: passport.sireName, damName: passport.damName,
    dateOfBirth: passport.dateOfBirth, breed: passport.breed, breedDescription: passport.breed, sex: passport.sex };
}
export function registrationWarnings(dog, appearance) {
  const warnings = [];
  const missing = passportMissing(dog.passport);
  if (missing.length) warnings.push(`Missing from this dog's profile: ${passportFields.filter(([key]) => missing.includes(key)).map(([, label]) => label).join(", ")}.`);
  if (!passportReviewed(dog.profile)) warnings.push("The current entry profile has not been marked reviewed in Snuggle Stay.");
  const assignment = [[appearance.date, "Exact show date"], [appearance.competition, "Competition"], [appearance.classEntered, "Class"]].filter(([value]) => !value).map(([, label]) => label);
  if (assignment.length) warnings.push(`Missing from this show assignment: ${assignment.join(", ")}.`);
  const eligibility = registrationEligibility(dog.passport, appearance);
  if (eligibility.blocked) warnings.push(eligibility.text);
  return warnings;
}
export function registrationPatch(dog, appearance, values, actor, now) {
  if (closed(appearance.event) || closed(appearance.entry)) throw new Error("This entry is closed.");
  if (!registrationStatuses.includes(values.status)) throw new Error("Choose a registration status.");
  // This records externally handled paperwork, not an application to enter a show.
  // Incomplete local information is advisory and must not block a status update.
  if (values.receiptUrl && !safeRegistrationUrl(values.receiptUrl)) throw new Error("Use an http or https receipt link.");
  const record = { appearanceId: appearance.id, context: appearance.context, showDate: appearance.date,
    competition: appearance.competition, classEntered: appearance.classEntered, status: values.status,
    reference: String(values.reference || "").trim(), receiptUrl: String(values.receiptUrl || "").trim(),
    notes: String(values.notes || "").trim(), recordedAt: now, recordedBy: actor,
    passportSnapshot: { ...dog.passport }, profileWarnings: registrationWarnings(dog, appearance), superintendent: appearance.event.superintendent || "", entryUrl: appearance.event.entryUrl || "" };
  // Append-only history preserves the data used for each submission, even after profile edits.
  const records = [...(appearance.entry.entryRegistrations || []), record];
  const statuses = dog.appearances.filter(item => item.entry.id === appearance.entry.id).map(item => item.id === appearance.id ? record.status : item.status);
  const registrationStatus = statuses.every(status => status === "Registered") ? "Registered" : statuses.every(status => status === "Planned to go") ? "Planned to go" : statuses.some(status => status === "Submitted — awaiting confirmation") ? "Submitted — awaiting confirmation" : "Not registered yet";
  return { entryRegistrations: records, registrationStatus };
}

export function createRegistrationWorkspace(deps) {
  const state = { mode: "dog", key: "", eventId: "", pending: true, search: "", notice: "" };
  let editContext = null, bound = false;
  let statusSaving = false;
  const statusContexts = new Map(), statusMessages = new Map();
  const button = (action, label, extra = "") => `<button type="button" class="secondary-button" data-reg-action="${action}" ${extra}>${label}</button>`;
  const pill = (text, warn = false) => `<span class="reg-pill${warn ? " is-warning" : ""}">${esc(text)}</span>`;
  const fieldHtml = (passport, fields) => fields.map(([key, label]) => `<div class="reg-field"><div><small>${esc(label)}</small><strong>${esc(passport[key] || "Not provided")}</strong></div>${passport[key] ? button("copy-field", "⧉", `data-field="${key}" aria-label="Copy ${esc(label)}"`) : ""}</div>`).join("");
  function data() { return registrationQueue(deps); }
  function selected() { return data().find(dog => dog.key === state.key); }
  function linkHtml(event) {
    const research = deps.research(event);
    const direct = safeRegistrationUrl(event.entryUrl), url = direct || safeRegistrationUrl(event.superintendentUrl || research.superintendentUrl);
    return url ? `<a class="reg-primary-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Open ${esc(event.superintendent || research.superintendent || "superintendent")} ↗</a><small>${direct ? "Opens this show's entry page." : "Choose this show on the provider’s website."}</small>` : '<small class="reg-warning">Entry link missing. Add the official superintendent link.</small>';
  }
  function appearanceHtml(dog, item, index) {
    const statusKey = `${dog.key}:${item.entry.id}:${item.id}`;
    statusContexts.set(statusKey, structuredClone({ dog, appearance: item }));
    const statusMessage = statusMessages.get(statusKey);
    const nextStatus = nextRegistrationStatus(item.status);
    const progressLabel = nextStatus === "Not registered yet" ? "Ready to register →" : nextStatus === "Submitted — awaiting confirmation" ? "Mark submitted →" : nextStatus === "Registered" ? "Mark registered ✓" : "Registered ✓";
    const research = deps.research(item.event), eligibility = registrationEligibility(dog.passport, item);
    const closing = item.event.entryClosingDate || research.entryClosingDate || "";
    const expired = closing && closing < deps.today();
    return `<article class="reg-show-card"><header><div><small>${esc(item.date ? deps.date(item.date) : "Exact show date needed")}</small><h4>${esc(item.event.name || "Dog show")}</h4></div>${pill(item.status, item.status !== "Registered")}</header>
      <div class="reg-show-body"><div class="reg-show-details"><dl class="reg-show-facts">
        <div><dt>Competition</dt><dd>${esc(item.competition || "Not set")}</dd></div>
        <div><dt>Class</dt><dd>${esc(item.classEntered || "Not set")}</dd></div>
        <div class="reg-deadline"><dt>Entry deadline</dt><dd>${esc(closing ? deps.date(closing) : "Not recorded — check premium")}${expired ? '<span class="reg-deadline-badge">Closed</span>' : ""}</dd>${item.event.entryClosingTime ? `<small>${esc(item.event.entryClosingTime)} ${esc(item.event.entryClosingTimezone || "(confirm time zone)")}</small>` : ""}${expired ? '<small>Verify availability with the superintendent.</small>' : ""}</div>
      </dl><div class="reg-eligibility${eligibility.blocked ? " reg-warning" : ""}"><span>Age & eligibility</span><p>${esc(eligibility.text)}</p></div>
      ${item.legacy ? '<p class="reg-warning">Previously marked registered; no confirmation is saved here. Verify with the superintendent.</p>' : ""}
      ${item.record?.reference ? `<p>Reference: <strong>${esc(item.record.reference)}</strong></p>` : ""}
      ${safeRegistrationUrl(item.record?.receiptUrl) ? `<a href="${esc(safeRegistrationUrl(item.record.receiptUrl))}" target="_blank" rel="noopener noreferrer">View receipt / confirmation ↗</a>` : ""}
      </div><div class="reg-show-controls"><div class="reg-quick-status"><div class="reg-current-status"><span>Current Registration Status:</span><strong class="reg-current-status-badge" data-status="${esc(item.status)}">${esc(item.status === "Not registered yet" ? "Not Registered" : item.status)}</strong></div><button type="button" class="reg-progress-button" data-reg-action="advance" data-reg-status="${esc(statusKey)}" aria-label="${esc(progressLabel)} for ${esc(dog.name)} · ${esc(item.event.name)} · ${esc(item.date || "Date not set")}"${statusSaving || !deps.canEdit() || !nextStatus ? " disabled" : ""}>${esc(progressLabel)}</button><small>${nextStatus ? "One click saves the next status. This does not submit an entry." : "Status complete. Change it in More options."}</small></div>
      <p class="reg-status-feedback${statusMessage?.error ? " is-error" : ""}" role="status">${esc(statusMessage?.text || "")}</p>
      <div class="reg-provider"><span>Superintendent</span>${linkHtml(item.event)}</div></div></div>
      <details class="reg-more"><summary>More options</summary><div class="reg-card-actions">${button("confirmation", "Status, receipt & notes", `data-appearance="${index}"`)}${button("assignment", "Review show assignment", `data-appearance="${index}"`)}${button("links", "Edit entry link", `data-appearance="${index}"`)}</div></details>
      ${item.entry.entryRegistrations?.some(record => record.appearanceId === item.id) ? `<details><summary>Saved entry details & history</summary>${(item.entry.entryRegistrations || []).filter(record => record.appearanceId === item.id).slice().reverse().map(record => `<div class="reg-history"><strong>${esc(record.status)} · ${esc(record.showDate)}</strong><p>${esc(record.competition)} · ${esc(record.classEntered)} · ${esc(record.reference || "No reference")}</p><p>${esc(record.recordedAt)} · ${esc(record.recordedBy)}${record.notes ? ` · ${esc(record.notes)}` : ""}</p><dl>${passportFields.map(([key, label]) => `<dt>${esc(label)}</dt><dd>${esc(record.passportSnapshot?.[key] || "Not recorded")}</dd>`).join("")}</dl></div>`).join("")}</details>` : ""}
    </article>`;
  }
  function render() {
    statusContexts.clear();
    const all = data();
    const events = [...new Map(all.flatMap(dog => dog.appearances.map(item => [item.event.id, item.event]))).values()].sort((a, b) => a.startDate.localeCompare(b.startDate));
    if (!events.some(event => event.id === state.eventId)) state.eventId = events[0]?.id || "";
    const dogs = all.filter(dog => (!state.search || dog.name.toLowerCase().includes(state.search.toLowerCase())) && (state.mode === "dog" || dog.appearances.some(item => item.event.id === state.eventId)));
    if (!dogs.some(dog => dog.key === state.key)) state.key = dogs[0]?.key || "";
    const dog = dogs.find(item => item.key === state.key), missing = dog ? passportMissing(dog.passport) : [];
    return `<div class="dog-show-view reg-workspace"><header class="reg-heading"><div><h3>Register dogs</h3><p>One dog’s details. Every show that still needs an entry.</p></div><div class="reg-toggle" role="group" aria-label="Registration view">${[ ["dog", "By dog"], ["show", "By show"] ].map(([mode, label]) => button("mode", label, `data-mode="${mode}" aria-pressed="${state.mode === mode}"`)).join("")}</div></header>
      <p class="reg-notice" role="status">${esc(state.notice)}</p>
      ${state.mode === "show" ? `<label class="reg-show-select">Show to register<select data-reg-event aria-label="Show to register">${events.map(event => `<option value="${esc(event.id)}"${state.eventId === event.id ? " selected" : ""}>${esc(deps.date(event.startDate))} · ${esc(event.name)}</option>`).join("")}</select></label>` : ""}
      <div class="reg-layout"><aside class="reg-rail" aria-label="Registration queue"><small>REGISTRATION QUEUE</small><label>Find a dog<input type="search" data-reg-search value="${esc(state.search)}" placeholder="Search dogs" /></label><div class="reg-dog-list">${dogs.map(item => {
        const appearances = item.appearances.filter(appearance => state.mode === "dog" || appearance.event.id === state.eventId);
        const pending = appearances.filter(appearance => appearance.status !== "Registered").length;
        return button("dog", `<strong>${esc(item.name)}</strong><small>${pending} pending · ${passportMissing(item.passport).length ? "Profile incomplete" : passportReviewed(item.profile) ? "Profile reviewed" : "Review profile"}</small>`, `data-dog="${esc(item.key)}" aria-pressed="${state.key === item.key}"`);
      }).join("") || '<p>No matching dogs.</p>'}</div><p>Showing dogs only. Socializing dogs stay on the travel roster.</p></aside>
      <section class="reg-main">${dog ? `<header class="reg-heading"><div><small>ENTRY PASSPORT</small><h3>${esc(dog.name)}</h3></div>${button("next", "Next dog →", dogs.length < 2 ? "disabled" : "")}</header>
        <section class="reg-passport"><header>${pill(!dog.profile ? "Linked dog profile unavailable" : missing.length ? `${missing.length} details missing` : passportReviewed(dog.profile) ? "Profile reviewed" : "Review before entering", missing.length > 0 || !passportReviewed(dog.profile))}${button("profile", "Review / edit profile", !dog.profile ? "disabled" : "")}</header>
        <div class="reg-fields">${fieldHtml(dog.passport, passportFields.slice(0, 8))}</div>
        <details><summary>Owner contact, eligibility & entry documents</summary><div class="reg-fields">${fieldHtml(dog.passport, passportFields.slice(8))}</div>${safeRegistrationUrl(dog.passport.certificateUrl) ? `<a href="${esc(safeRegistrationUrl(dog.passport.certificateUrl))}" target="_blank" rel="noopener noreferrer">Open certificate ↗</a>` : ""}</details>
        <footer>${button("copy-all", "⧉ Copy entry details")}<small>Copy individual fields using ⧉</small></footer></section>
        <header class="reg-heading"><h3>${state.mode === "dog" ? "Shows for this dog" : "Selected show"}</h3><label class="reg-check"><input type="checkbox" data-reg-pending${state.pending ? " checked" : ""}/> Not registered only</label></header>
        ${dog.appearances.map((item, index) => ({ item, index })).filter(({ item }) => (!state.pending || item.status !== "Registered") && (state.mode === "dog" || item.event.id === state.eventId)).map(({ item, index }) => appearanceHtml(dog, item, index)).join("") || '<p class="reg-empty">No outstanding entries in this view. Uncheck “Not registered only” to review saved registrations.</p>'}
        ` : '<div class="reg-empty"><h3>No showing dogs in open shows</h3><p>Add dogs to a show’s team and choose Showing to build your registration queue.</p></div>'}</section></div>
      <p class="reg-footnote">Opening or copying never submits an entry or makes a payment. Register on the superintendent’s website, then record the confirmation here. Show booking and dog registration remain separate.</p></div>`;
  }
  function form(title, kind, body, context) {
    editContext = context;
    deps.dialog(title, `<form class="tracker-form reg-form" data-reg-form="${kind}">${body}<p data-reg-error role="alert"></p><div class="button-row"><button type="submit">Save ${kind === "profile" ? "profile" : kind === "links" ? "entry link" : "registration"}</button>${button("cancel", "Cancel")}</div></form>`);
  }
  async function click(event) {
    const target = event.target.closest("[data-reg-action]");
    if (!target) return;
    const action = target.dataset.regAction, dog = selected();
    if (action === "advance") { await changeStatus(target.dataset.regStatus); return; }
    if (action === "cancel") { deps.close(); return; }
    if (action === "mode") { state.mode = target.dataset.mode; deps.render(); return; }
    if (action === "dog") { state.key = target.dataset.dog; state.notice = ""; deps.render(); return; }
    if (!dog) return;
    if (action === "next") {
      const dogs = data().filter(item => (!state.search || item.name.toLowerCase().includes(state.search.toLowerCase())) && (state.mode === "dog" || item.appearances.some(appearance => appearance.event.id === state.eventId)));
      state.key = dogs[(dogs.findIndex(item => item.key === dog.key) + 1) % dogs.length]?.key || ""; state.notice = ""; deps.render(); return;
    }
    if (action === "copy-field" || action === "copy-all") {
      const text = action === "copy-field" ? dog.passport[target.dataset.field] : passportFields.map(([key, label]) => `${label}: ${dog.passport[key] || "Not provided"}`).join("\n");
      try { await navigator.clipboard.writeText(text); state.notice = action === "copy-field" ? "Field copied." : "Entry details copied. Review missing fields before entering."; }
      catch { state.notice = "Clipboard unavailable. Select and copy the displayed fields manually."; }
      deps.render(); return;
    }
    if (action === "profile") {
      if (!dog.profile) return;
      form(`Entry profile · ${dog.name}`, "profile", `<p>Shared across this dog’s shows. Submitted entry snapshots are preserved. Review legal owners/co-owners against the registration certificate.</p><div class="field-grid">${passportFields.map(([key, label, type]) => `<label>${esc(label)}<input name="${key}" type="${type || "text"}" value="${esc(dog.passport[key])}"${key === "dateOfBirth" ? ` max="${deps.today()}"` : ""}/></label>`).join("")}</div><p>You may save an incomplete profile. Missing details remain flagged.</p>`, { dog, base: structuredClone(dog.profile) }); return;
    }
    const appearance = dog.appearances[Number(target.dataset.appearance)];
    if (!appearance) return;
    if (action === "assignment") { deps.assignment(appearance.entry); return; }
    if (action === "links") {
      const research = deps.research(appearance.event);
      form("Official entry link", "links", `<p>${esc(appearance.event.name)} · ${esc(deps.date(appearance.event.startDate))}. Use the official link for this exact show. Do not paste a private session or payment URL.</p><div class="field-grid">${[["superintendent", "Superintendent", "text"], ["entryUrl", "Exact show entry URL", "url"], ["superintendentUrl", "Superintendent website (fallback)", "url"], ["entryClosingDate", "Entries close", "date"], ["entryClosingTime", "Closing time", "time"], ["entryClosingTimezone", "Closing time zone", "text"]].map(([key, label, type]) => `<label>${label}<input name="${key}" type="${type}" value="${esc(appearance.event[key] || research[key] || "")}"/></label>`).join("")}</div>`, { appearance, base: structuredClone(appearance.event) }); return;
    }
    if (action === "confirmation") {
      const record = appearance.record || {};
      form(`Status, receipt & notes · ${dog.name}`, "confirmation", `<p><strong>${esc(appearance.event.name)} · ${esc(appearance.date ? deps.date(appearance.date) : "Date not set")}</strong></p><label>Registration status<select name="status">${registrationStatuses.map(status => `<option${appearance.status === status ? " selected" : ""}>${esc(status)}</option>`).join("")}</select></label><p>Choose any status, including an earlier step. This only updates your records; it does not submit or cancel an entry with the superintendent.</p><label>Confirmation / reference number (optional)<input name="reference" value="${esc(record.reference || "")}"/></label><label>Receipt / confirmation link (optional)<input type="url" name="receiptUrl" value="${esc(record.receiptUrl || "")}"/></label><label>Notes (optional)<textarea name="notes">${esc(record.notes || "")}</textarea></label>`, { dog, appearance, base: structuredClone(appearance.entry), eventBase: structuredClone(appearance.event) });
    }
  }
  async function submit(event) {
    const form = event.target.closest("[data-reg-form]");
    if (!form) return;
    event.preventDefault();
    if (form.dataset.saving) return;
    const context = editContext, values = Object.fromEntries(new FormData(form)), kind = form.dataset.regForm;
    form.dataset.saving = "true";
    form.querySelector('[type="submit"]').disabled = true;
    try {
      if (!deps.canEdit()) throw new Error("Staff access is required.");
      const now = new Date().toISOString(), actor = deps.actor();
      if (kind === "profile") await deps.save(context.dog.type, context.base, passportPatch({ ...context.base, type: context.dog.type }, values, actor, now));
      if (kind === "links") {
        for (const key of ["entryUrl", "superintendentUrl"]) if (values[key] && !safeRegistrationUrl(values[key])) throw new Error("Use an http or https link.");
        await deps.save("showEvent", context.base, values);
      }
      if (kind === "confirmation") {
        const currentDog = selected();
        if (!currentDog || JSON.stringify(currentDog.passport) !== JSON.stringify(context.dog.passport)) throw new Error("This profile changed. Close and review it again.");
        await deps.check("showEvent", context.eventBase);
        await deps.check(context.dog.type, context.dog.profile);
        const patch = registrationPatch(context.dog, context.appearance, values, actor, now);
        await deps.save("showEntry", context.base, patch);
      }
      state.notice = `${kind === "profile" ? "Entry profile" : kind === "links" ? "Official entry link" : "Registration record"} saved.`;
      deps.close(); deps.render();
    } catch (error) {
      form.querySelector("[data-reg-error]").textContent = error.message || "Save failed. Your changes have not been confirmed. Please retry.";
    } finally { delete form.dataset.saving; form.querySelector('[type="submit"]').disabled = false; }
  }
  async function changeStatus(key) {
    const context = statusContexts.get(key);
    if (!context) return;
    const { dog, appearance } = context, status = nextRegistrationStatus(appearance.status);
    if (statusSaving || !status) return;
    statusSaving = true;
    state.notice = "";
    statusMessages.set(key, { text: "Saving status…" });
    deps.render();
    try {
      if (!deps.canEdit()) throw new Error("Staff access is required.");
      await deps.check("showEvent", appearance.event);
      await deps.check(dog.type, dog.profile);
      // Keep optional paperwork when changing only the status. Each change is
      // appended to history and saved against the record displayed to the user.
      const patch = registrationPatch(dog, appearance, { ...appearance.record, status }, deps.actor(), new Date().toISOString());
      await deps.save("showEntry", appearance.entry, patch);
      const text = `${dog.name} · ${appearance.date ? deps.date(appearance.date) : appearance.event.name}: ${status} saved.`;
      statusMessages.set(key, { text: "Saved" });
      state.notice = text;
    } catch (error) {
      statusMessages.set(key, { error: true, text: error.message || "Status could not be saved. Try again." });
    } finally { statusSaving = false; deps.render(); }
  }
  return { render, state, bind(root = document) {
    if (bound) return; bound = true;
    root.addEventListener("click", event => { void click(event); });
    root.addEventListener("submit", event => { void submit(event); });
    root.addEventListener("change", event => {
      if (event.target.matches("[data-reg-event]")) { state.eventId = event.target.value; deps.render(); }
      if (event.target.matches("[data-reg-pending]")) { state.pending = event.target.checked; deps.render(); }
    });
    root.addEventListener("input", event => {
      if (!event.target.matches("[data-reg-search]")) return;
      state.search = event.target.value; deps.render();
      root.querySelector("[data-reg-search]")?.focus();
    });
  } };
}
