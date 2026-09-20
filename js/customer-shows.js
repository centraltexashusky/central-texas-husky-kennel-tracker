/* Customer show attendance requests. Internal show payloads stay staff-only. */
const esc = value => escapeHtml(String(value ?? ''));
const eligibleDogs = () => currentRole() === 'customer'
  ? customerDogsForCurrentUser().filter(d => d.showRegistrationEnabled === 'Yes') : [];
const dogKey = dog => dog?.sourceCustomerDogId || dog?.linkedCustomerDogId || dog?.id;
const sessionKey = () => `${currentRole()}:${currentUser?.email || ''}`;
let sequence = 0;
let selectedDogId = '';
let displayIdentity = '';
let schedule = { shows: [], requests: [] };
let queue = [];
let queueLoading = false;
const date = value => value ? new Date(`${String(value).slice(0,10)}T12:00:00`).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : 'Date pending';
const statusLabel = status => ({Pending:'Pending staff approval',Approved:'Attendance approved',Declined:'Unable to approve',Cancelled:'Request cancelled'}[status] || status);

async function portal(action, values = {}) {
  if (localTestMode) {
    // Isolated fixture mode only; never used by a signed-in production session.
    const fixtures = JSON.parse(localStorage.getItem('customer-show-qa') || '{}');
    if (action === 'queue') return fixtures.queue || [];
    if (action === 'schedule') return fixtures[values.p_dog_id] || {shows:[],requests:[]};
    throw new Error('Show requests require an online account.');
  }
  if (!supabaseClient) throw new Error('Sign in to load the show schedule.');
  const {data,error} = await cuddleStayRequest(db => db.rpc('customer_show_portal',{p_action:action,...values}));
  if(error) throw error;
  return data;
}

function dialog() {
  let element=document.getElementById('customerShowDialog');
  if(!element){
    element=document.createElement('dialog');element.id='customerShowDialog';element.className='customer-show-dialog';
    element.setAttribute('aria-labelledby','customerShowTitle');
    element.innerHTML='<header><div><small>DOG SHOWS</small><h2 id="customerShowTitle">Show schedule</h2></div><button type="button" data-show-portal-close class="secondary-button">Close</button></header><div id="customerShowBody"></div>';
    document.body.append(element);
    element.querySelector('[data-show-portal-close]').onclick=()=>element.close();
    element.addEventListener('close',()=>{sequence++;});
  }
  return element;
}

function renderSchedule() {
  const body=document.getElementById('customerShowBody');if(!body)return;
  const dogs=eligibleDogs();
  if(!dogs.some(d=>dogKey(d)===selectedDogId)){body.textContent='No show-designated dog is available for this account.';return;}
  const selected=dogs.find(d=>dogKey(d)===selectedDogId);
  const missing=[['registeredName','registered name'],['akcRegistrationNumber','AKC registration number'],['sireName',"sire’s registered name"],['damName',"dam’s registered name"]].filter(([key])=>!selected[key]);
  body.innerHTML=`<p>Shows we plan to attend. Request a place for your dog—even during an existing boarding stay. Staff must confirm availability, eligibility, transport, and fees.</p>
    <div class="customer-show-toolbar"><label>Showing dog<select id="customerShowDogSelect">${dogs.map(d=>`<option value="${esc(dogKey(d))}" ${dogKey(d)===selectedDogId?'selected':''}>${esc(d.dogName)}</option>`).join('')}</select></label><label>Find a show<input id="customerShowSearch" type="search" placeholder="Show, city, or date" /></label><button type="button" class="secondary-button" data-show-portal-refresh>Refresh</button></div>
    ${missing.length?`<p class="portal-notice">Before staff books an entry, update ${esc(selected.dogName)}’s ${esc(missing.map(x=>x[1]).join(', '))} in Edit profile. You can still request a show.</p>`:''}
    <p class="customer-show-disclaimer">A request or attendance approval is not an official show entry, boarding reservation, or payment. Staff will coordinate those separately.</p>
    <div id="customerShowFeedback" role="status" aria-live="polite"></div>
    <div id="customerShowCards">${schedule.shows.length?schedule.shows.map(show=>{
      const r=show.request;
      return `<article class="customer-show-card" data-show-search="${esc([show.name,show.location,date(show.startDate),date(show.endDate)].join(' ').toLowerCase())}">
      <header><div><h3>${esc(show.name || show.club || 'Dog show')}</h3><p>${esc(date(show.startDate))}${show.endDate&&show.endDate!==show.startDate?` – ${esc(date(show.endDate))}`:''}</p></div><span class="status-chip">${esc(show.status==='Going To'?'Planned attendance':show.status==='Active'?'Show underway':'Attendance confirmed')}</span></header>
      <p>${esc(show.location || 'Location to be confirmed')}</p>${show.entryClosingDate?`<p><strong>Entry deadline:</strong> ${esc(date(show.entryClosingDate))}</p>`:''}
      ${r?`<p class="customer-show-request-status">${esc(statusLabel(r.status))}</p>${r.staffNote?`<p><strong>Staff response:</strong> ${esc(r.staffNote)}</p>`:''}${r.status==='Pending'?`<button type="button" class="secondary-button" data-show-cancel="${esc(r.id)}">Cancel request</button>`:''}`:
      show.canRequest?`<button type="button" data-show-request="${esc(show.id)}">Request ${esc(selected.dogName)} for this show</button>`:'<p>Entries have closed or the show has started. Contact staff about attendance.</p>'}
      </article>`;
    }).join(''):'<p>No upcoming shows are scheduled yet. Check back here or contact the kennel.</p>'}</div>
    <p id="customerShowNoMatches" hidden>No shows match your search.</p>
    ${schedule.requests.length?`<details class="customer-show-history"><summary>My show requests (${schedule.requests.length})</summary>${schedule.requests.map(r=>`<div><strong>${esc(r.showName)} · ${esc(date(r.startDate))}</strong><p>${esc(statusLabel(r.status))} · Show: ${esc(r.eventStatus)}</p>${r.staffNote?`<p>${esc(r.staffNote)}</p>`:''}</div>`).join('')}</details>`:''}`;
}

async function loadSchedule() {
  const token=++sequence, identity=sessionKey();
  const body=document.getElementById('customerShowBody');body.textContent='Loading show schedule…';
  try{
    const data=await portal('schedule',{p_dog_id:selectedDogId});
    if(token!==sequence||identity!==sessionKey())return;
    schedule=data;renderSchedule();
  }catch(error){
    if(token!==sequence||identity!==sessionKey())return;
    body.innerHTML=`<p role="alert">Could not load shows: ${esc(error.message || error)}</p><button type="button" data-show-portal-refresh>Try again</button>`;
  }
}

window.openCustomerShowSchedule = function(id='') {
  const dogs=eligibleDogs();if(!dogs.length)return;
  displayIdentity=sessionKey();
  selectedDogId=dogKey(dogs.find(d=>d.id===id||dogKey(d)===id)||dogs[0]);
  const element=dialog();if(!element.open)element.showModal();
  void loadSchedule();
};

window.syncCustomerShowAccess = function() {
  const dogs=eligibleDogs();
  document.querySelectorAll('[data-customer-show-schedule]').forEach(button=>button.hidden=!dogs.length);
  const nav=document.getElementById('customerPortalNav');
  if(nav&&!nav.querySelector('[data-customer-show-schedule]')){
    const button=document.createElement('button');button.type='button';button.className='portal-nav-button';
    button.textContent='Show schedule';button.dataset.customerShowSchedule='';button.hidden=!dogs.length;nav.append(button);
  }
  if(!dogs.length||displayIdentity!==sessionKey()||!dogs.some(d=>dogKey(d)===selectedDogId)){
    document.getElementById('customerShowDialog')?.close();schedule={shows:[],requests:[]};
    const body=document.getElementById('customerShowBody');if(body)body.textContent='';
  }
};

window.renderCustomerShowRequestQueue = async function() {
  if(!['admin','staff','helper'].includes(currentRole()))return;
  let panel=document.getElementById('customerShowRequestQueue');
  if(!panel){panel=document.createElement('section');panel.id='customerShowRequestQueue';panel.className='customer-show-review';document.getElementById('dogShowContent')?.before(panel);}
  if(queueLoading)return;
  queueLoading=true;
  const identity=sessionKey();
  panel.innerHTML='<p>Loading customer show requests…</p>';
  try{
    const data=await portal('queue');if(identity!==sessionKey())return;
    queue=data;
    panel.innerHTML=`<details ${queue.some(r=>r.status==='Pending')?'open':''}><summary>Customer show requests · ${queue.filter(r=>r.status==='Pending').length} pending</summary><p>Confirm availability, entry eligibility, boarding/transport arrangements, and fees before approval. Approval adds a planned roster entry; it does not register the dog with the show.</p><button type="button" class="secondary-button" data-show-queue-refresh>Refresh requests</button>${queue.length?queue.map(r=>`<article class="customer-show-card"><h3>${esc(r.dogName)} · ${esc(r.showName)}</h3><p>${esc(r.ownerName)} · ${esc(date(r.startDate))} · ${esc(r.eventStatus)}</p><p>${esc(statusLabel(r.status))}</p>${r.customerNote?`<p>Customer: ${esc(r.customerNote)}</p>`:''}${r.registrationMissing?`<p>${r.registrationMissing} registration details still need review.</p>`:''}${r.status==='Pending'?`<label>Response to customer (optional)<textarea maxlength="1000" data-show-response="${esc(r.id)}"></textarea></label><div class="button-row"><button type="button" data-show-review="approve" data-request-id="${esc(r.id)}">Approve attendance</button><button type="button" class="secondary-button" data-show-review="decline" data-request-id="${esc(r.id)}">Decline</button></div>`:`<p>${esc(r.staffNote)}</p>`}</article>`).join(''):'<p>No customer show requests yet.</p>'}</details>`;
  }catch(error){panel.innerHTML=`<p role="alert">Customer requests unavailable: ${esc(error.message || error)}</p><button type="button" data-show-queue-refresh>Retry</button>`;}
  finally{queueLoading=false;}
};

document.addEventListener('change',event=>{
  if(event.target.id==='customerShowDogSelect'){selectedDogId=event.target.value;void loadSchedule();}
});
document.addEventListener('input',event=>{
  if(event.target.id!=='customerShowSearch')return;
  const query=event.target.value.trim().toLowerCase();
  const cards=[...document.querySelectorAll('[data-show-search]')];
  cards.forEach(card=>card.hidden=!card.dataset.showSearch.includes(query));
  document.getElementById('customerShowNoMatches').hidden=!cards.length||cards.some(card=>!card.hidden);
});
document.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.hasAttribute('data-customer-show-schedule')){openCustomerShowSchedule(button.dataset.dogId);return;}
  if(button.hasAttribute('data-show-portal-refresh')){void loadSchedule();return;}
  if(button.hasAttribute('data-show-queue-refresh')){void renderCustomerShowRequestQueue();return;}
  if(button.dataset.showRequest){
    const show=schedule.shows.find(s=>s.id===button.dataset.showRequest);if(!show||!eligibleDogs().some(d=>dogKey(d)===selectedDogId))return;
    const identity=sessionKey(), dogId=selectedDogId;
    const stillHere=()=>identity===sessionKey()&&dogId===selectedDogId&&document.getElementById('customerShowDialog')?.open;
    button.disabled=true;
    try{
      const result=await portal('request',{p_dog_id:dogId,p_event_id:show.id});
      if(!stillHere())return;
      await loadSchedule();
      const feedback=document.getElementById('customerShowFeedback');
      if(stillHere()&&feedback)feedback.textContent=`${statusLabel(result.status)}. No payment or official entry has been made.`;
    }catch(error){const feedback=document.getElementById('customerShowFeedback');if(stillHere()&&feedback)feedback.textContent=`Request not saved: ${error.message || error}`;button.disabled=false;}
  }
  if(button.dataset.showCancel){
    const req=schedule.shows.map(s=>s.request).find(r=>r?.id===button.dataset.showCancel);if(!req)return;
    const identity=sessionKey(), dogId=selectedDogId;
    button.disabled=true;
    try{await portal('cancel',{p_request_id:req.id,p_expected_updated_at:req.updatedAt});if(identity===sessionKey()&&dogId===selectedDogId&&document.getElementById('customerShowDialog')?.open)await loadSchedule();}
    catch(error){const feedback=document.getElementById('customerShowFeedback');if(identity===sessionKey()&&feedback)feedback.textContent=`Could not cancel: ${error.message || error}`;button.disabled=false;}
  }
  if(button.dataset.showReview){
    const req=queue.find(r=>r.id===button.dataset.requestId);if(!req)return;
    const note=[...document.querySelectorAll('[data-show-response]')].find(x=>x.dataset.showResponse===req.id)?.value || '';
    button.disabled=true;
    try{
      await portal(button.dataset.showReview,{p_request_id:req.id,p_expected_updated_at:req.updatedAt,p_note:note});
      try{await loadRemoteRecords({types:['showEntry'],render:false,quiet:true});}
      catch{await renderCustomerShowRequestQueue();showToast('Decision saved. Refresh Dog Shows to reload the roster.');return;}
      renderDogShow();showToast('Show attendance request updated.');
    }catch(error){showToast(`Could not update request: ${error.message || error}`);button.disabled=false;}
  }
});
