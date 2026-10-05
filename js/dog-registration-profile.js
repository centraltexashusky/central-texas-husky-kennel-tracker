import { passportFields, registrationPassport, passportMissing, passportPatch, safeRegistrationUrl } from './dog-show-registration.js?v=20261004-registration-quick-status-1';
import { createRegistrationStore } from './dog-show-registration-store.js?v=20261003-registration-1';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Explicit links only: never associate registration records by a dog's name.
export function resolveRegistrationProfile(type, record, read) {
  if (!record?.id) return null;
  if (type !== 'boardingDog') return read(type).find(dog => dog.id === record.id && !dog.removed) || null;
  const seen = new Set(), customers = new Set();
  let id = record.id, source;
  while (id && !seen.has(id)) {
    seen.add(id);
    source = read('boardingDog').find(dog => dog.id === id) || (id === record.id ? record : null);
    if (!source) break;
    [source.linkedCustomerDogId, source.sourceCustomerDogId].filter(Boolean).forEach(id => customers.add(id));
    id = source.sourceBoardingDogId;
  }
  if (!customers.size) read('customerDog').filter(dog => seen.has(dog.sourceBoardingDogId)).forEach(dog => customers.add(dog.id));
  if (customers.size > 1) return null;
  if (customers.size === 1) return read('customerDog').find(dog => dog.id === [...customers][0] && !dog.removed) || null;
  return read('boardingDog').find(dog => dog.id === record.id && !dog.removed) || null;
}

export function registrationProfileHtml(type, record, read) {
  const profile = resolveRegistrationProfile(type, record, read);
  if (!profile) return '<p>Save this dog first, or reload to load its linked profile. Registration details cannot be edited until the profile is available.</p>';
  const passport = registrationPassport(profile), missing = passportMissing(passport);
  const attrs = `data-profile-type="${esc(type)}" data-profile-id="${esc(record.id)}"`;
  const fields = items => `<dl class="dog-registration-facts">${items.map(([key,label]) => `<div><dt>${esc(label)}</dt><dd>${esc(passport[key] || 'Not provided')}${passport[key] ? `<button type="button" class="secondary-button" data-dog-registration="copy" data-field="${key}" ${attrs} aria-label="Copy ${esc(label)}">⧉</button>` : ''}</dd></div>`).join('')}</dl>`;
  return `<div class="dog-registration-profile"><header><div><h2>Registration</h2><p>Saved on this dog's ${profile.type === 'customerDog' ? 'customer profile, shared across boarding stays' : 'individual profile'}. Used automatically by Dog Shows.</p></div><button type="button" data-dog-registration="edit" ${attrs}>Edit registration</button></header>
    <p class="dog-registration-status">${missing.length ? `${missing.length} entry details still needed` : 'Entry details available'} · Verify against the current certificate before submitting an entry.</p>
    ${fields(passportFields.slice(0, 8))}<details><summary>Owner contact, eligibility & documents</summary>${fields(passportFields.slice(8))}</details>
    <div class="button-row"><button type="button" class="secondary-button" data-dog-registration="copy-all" ${attrs}>Copy entry details</button>${safeRegistrationUrl(passport.certificateUrl) ? `<a class="secondary-button" href="${esc(safeRegistrationUrl(passport.certificateUrl))}" target="_blank" rel="noopener noreferrer">Open registration certificate ↗</a>` : ''}</div>
    <p role="status" data-registration-copy-status></p></div>`;
}

if (typeof window !== 'undefined') {
  const read = type => readRecords(type);
  const store = createRegistrationStore({ read, local: () => localTestMode === true, connected: () => Boolean(supabaseClient),
    allowed: type => ['admin','staff','helper'].includes(currentRole()) && canWriteRemoteRecord({type}),
    request: fn => cuddleStayRequest(fn), timeout: (promise,label) => withRemoteRequestTimeout(promise,label),
    identity: payload => remoteWriteIdentity(payload), cache: (type,payload) => upsertRecord(type,payload) });
  let context = null;
  function refresh() {
    if (typeof refreshOwnedWorkspace === 'function') refreshOwnedWorkspace();
    if (typeof activeBoardingDog === 'function') {
      const panel = document.getElementById('boardingRegistrationProfile');
      if (panel && !document.getElementById('boardingDogDetail')?.hidden) panel.innerHTML = registrationProfileHtml('boardingDog', activeBoardingDog(), read);
    }
    document.dispatchEvent(new CustomEvent('dog-registration-saved'));
  }
  window.dogRegistrationProfileHtml = (type,record) => registrationProfileHtml(type,record,read);
  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-dog-registration]');
    if (!button) return;
    const type = button.dataset.profileType, record = read(type).find(dog => dog.id === button.dataset.profileId);
    const profile = resolveRegistrationProfile(type,record,read);
    if (!profile) return showToast('Linked dog profile unavailable. Reload before editing.');
    const passport = registrationPassport(profile);
    if (button.dataset.dogRegistration.startsWith('copy')) {
      try {
        await navigator.clipboard.writeText(button.dataset.field ? passport[button.dataset.field] : passportFields.map(([key,label]) => `${label}: ${passport[key] || 'Not provided'}`).join('\n'));
        button.closest('.dog-registration-profile').querySelector('[data-registration-copy-status]').textContent = 'Copied.';
      } catch { showToast('Clipboard unavailable. Select and copy the displayed text.'); }
      return;
    }
    if (!['admin','staff','helper'].includes(currentRole())) return;
    context = {type:profile.type, base:structuredClone(profile), sourceType:type};
    let dialog = document.getElementById('dogRegistrationDialog');
    if (!dialog) { dialog = document.createElement('dialog'); dialog.id = 'dogRegistrationDialog'; dialog.className = 'dog-registration-dialog'; document.body.append(dialog); }
    dialog.innerHTML = `<form data-dog-registration-form><header><h2>Registration · ${esc(record.callName || record.dogName || 'Dog')}</h2><button type="button" class="secondary-button" data-registration-close>Close</button></header><p>One shared dog profile. Show entry confirmations and historical snapshots are unchanged.</p><div class="field-grid">${passportFields.map(([key,label,inputType]) => `<label>${esc(label)}<input name="${key}" type="${inputType || 'text'}" value="${esc(passport[key])}"/></label>`).join('')}</div><p>Save incomplete details now; missing information stays flagged. Do not guess legal owners or registration eligibility.</p><p role="alert" data-registration-error></p><div class="button-row"><button type="submit">Save registration details</button><button type="button" class="secondary-button" data-registration-close>Cancel</button></div></form>`;
    dialog.querySelectorAll('[data-registration-close]').forEach(button => button.onclick = () => dialog.close());
    dialog.showModal();
  });
  document.addEventListener('submit', async event => {
    const form = event.target.closest('[data-dog-registration-form]');
    if (!form) return;
    event.preventDefault();
    if (form.dataset.saving) return;
    const current = context, button = form.querySelector('[type="submit"]');
    button.disabled = true; form.dataset.saving = 'true';
    try {
      const patch = passportPatch(current.base,Object.fromEntries(new FormData(form)),currentUser?.email || 'Staff',new Date().toISOString());
      await store.save(current.type,current.base,patch);
      // The profile form remains open behind this editor. Mirror only registration
      // controls so a later care save cannot restore its old identity fields.
      const parent = document.getElementById(current.sourceType === 'ownedDog' ? 'ourDogForm' : 'boardingDogForm');
      if (parent) for (const [key,value] of Object.entries(patch)) { const input=parent.elements.namedItem(key); if(input && typeof value==='string') input.value=value; }
      document.getElementById('dogRegistrationDialog').close(); refresh();
      showToast('Registration saved on the dog profile.');
    } catch(error) { form.querySelector('[data-registration-error]').textContent=error.message || 'Save failed. Please reload and retry.'; }
    finally { button.disabled=false; delete form.dataset.saving; }
  });
}
