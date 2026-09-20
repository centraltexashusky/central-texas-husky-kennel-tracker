/* Customer presentation layer. All writes, permissions, prices and agreements use the existing workflows. */
const el = id => document.getElementById(id);
const html = value => escapeHtml(String(value ?? ''));
const pricing = dog => customerPricingScopeForDog(dog) === 'member' ? 'Member pricing' : 'Regular pricing';
const icon = kind => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${kind === 'file' ? '<path d="M5 3h10l4 4v14H5zM14 3v5h5M8 12h8m-8 4h5"/>' : '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v5m10-5v5M3 11h18"/>'}</svg>`;
function customerVisibleStay(dog) {
  const entries = customerRequestEntries().filter(e => boardingRecordMatchesCustomerDog(e.record || e, dog));
  const rank = status => ['Checked In', 'In Kennel', 'Ready For Pickup'].includes(status) ? 0 : status === 'Approved' ? 1 : 2;
  return entries.filter(e => ['Pending','Approved','Checked In','In Kennel','Ready For Pickup'].includes(boardingStayDisplayStatus(e.record || e, e.stay || {})))
    .sort((a,b) => rank(boardingStayDisplayStatus(a.record,a.stay))-rank(boardingStayDisplayStatus(b.record,b.stay)) || new Date(a.stay.dropoffTime || a.stay.requestedDropoffTime)-new Date(b.stay.dropoffTime || b.stay.requestedDropoffTime))[0];
}
window.customerDogSummaryCardHtml = function(dog) {
  const entry = customerVisibleStay(dog);
  const stay = entry?.stay || {}, record = entry?.record || {};
  const vaccine = customerFacingVaccineStatus(dog);
  const status = entry ? boardingStayDisplayStatus(record,stay) : '';
  const photoRecord = customerDogPhotoRecordForDisplay(dog,record);
  return `<article class="customer-dog-summary-card portal-dog-card">
    <div class="portal-dog-photo">${customerDogPhotoHtml(dog,{photoRecord})}</div>
    <div class="portal-dog-info"><h3>${html(dog.dogName || 'Your dog')}</h3><div class="chip-row">${statusChipHtml(pricing(dog),'pricing-scope-chip')}${statusChipHtml(vaccine.label,`vaccination-status-chip ${vaccine.className}`)}</div>
    <p class="portal-dog-breed">${html(dog.breedDescription || dog.breed || 'Dog profile')}</p>
    ${entry ? `<dl class="portal-stay-facts"><div><dt>${icon('calendar')}${['Pending','Approved'].includes(status)?'Upcoming stay':'Current stay'}</dt><dd>${statusChipHtml(status,`boarding-status-chip ${statusClassForBoardingStatus(status)}`)}</dd></div><div><dt>Drop-off</dt><dd>${html(formatDateTime(stay.dropoffTime || stay.requestedDropoffTime))}</dd></div><div><dt>Pickup</dt><dd>${html(formatDateTime(stay.pickupTime || stay.requestedPickupTime))}</dd></div><div><dt>Services</dt><dd>${html(boardingStayServicesText(stay,{customerFacing:true}))}</dd></div></dl>` : '<p class="portal-empty-stay">No upcoming stay. Ready to plan their next visit?</p>'}</div>
    <div class="customer-dashboard-actions">${dog.showRegistrationEnabled === 'Yes' ? `<button type="button" class="secondary-button" data-customer-show-schedule data-dog-id="${html(dog.id)}">Show schedule</button>` : ''}${entry ? `<button type="button" data-customer-workspace="stay" data-id="${html(record.id)}" data-stay-id="${html(stay.id)}">View stay</button>` : `<button type="button" data-customer-workspace="book" data-dog-id="${html(dog.id)}">Book a stay</button>`}<button type="button" class="secondary-button" data-action="edit-customer-dog-inline" data-id="${html(dog.id)}" data-boarding-id="${html(dog.sourceBoardingDogId || dog.linkedBoardingDogId || '')}">Edit profile</button></div>
  </article>`;
};
function prepareShell() {
  if (!el('customerPortalNav')) {
    const nav = document.createElement('nav'); nav.id='customerPortalNav';nav.setAttribute('aria-label','Customer navigation');
    document.querySelectorAll('#sidebar .nav-button[data-roles="customer"]').forEach(source => {
      const button=source.cloneNode(true);button.className='portal-nav-button';button.removeAttribute('data-roles');
      button.onclick=()=>switchPage(button.dataset.page);nav.append(button);
    });
    document.querySelector('.page-header').insertBefore(nav,document.querySelector('.page-header .user-card'));
  }
  el('customerPortalNav').querySelectorAll('button').forEach(button=>{
    const active=button.dataset.page===activePageId();button.classList.toggle('is-active',active);
    if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
  });
}
function fillDogFilter(id) {
  const target=el(id);if(!target)return;
  const previous=target.value;
  target.innerHTML='<option value="">All dogs</option>'+customerDogsForCurrentUser().map(d=>`<option value="${html(d.id)}">${html(d.dogName)}</option>`).join('');
  if([...target.options].some(o=>o.value===previous))target.value=previous;
}
const originalDogs=window.renderCustomerDogs;
window.renderCustomerDogs=function(...args){
  originalDogs(...args);prepareShell();window.syncCustomerShowAccess?.();
  if(currentRole()!=='customer')return;
  const dogs=customerDogsForCurrentUser();
  el('customerWelcomeTitle').textContent=`Hi ${(currentUser.name || '').split(' ')[0] || 'there'}, welcome back.`;
  el('openCustomerDogModalButton').textContent='Add a dog';
  el('customerAttentionList').innerHTML=dogs.filter(d=>customerBoardingVaccinationIssues(d,todayDate()).length || vaccinationExpiresSoon(d)).map(d=>`<div class="portal-notice"><span>${html(d.dogName)}: review vaccination dates and records</span><button type="button" class="secondary-button" data-customer-workspace="upload" data-dog-id="${html(d.id)}">Update records</button></div>`).join('');
  const update=customerUpdatesForCurrentUser()[0];
  el('customerRecentUpdate').hidden=!update;
  if(update)el('customerRecentUpdate').innerHTML=`<h3>Recent update</h3><div><p>${html(update.dog?.dogName || update.dogName || 'Your dog')} · ${html(update.note || 'A new update from the kennel')}</p><button type="button" class="secondary-button" data-customer-workspace="updates">View updates</button></div>`;
};
for(const name of ['renderCustomerRequests','renderCustomerUpdates','renderCustomerFiles']) {
  const original=window[name];
  window[name]=function(...args){original(...args);prepareShell();window.syncCustomerShowAccess?.();
    if(currentRole()!=='customer')return;
    if(name==='renderCustomerRequests') {
      el('customerRequestList').querySelectorAll('article[data-id]').forEach(card=>{
        const record=boardingDogRecordForDisplay(card.dataset.id);
        const dog=record?customerDogForBoardingRequest(record):null;
        if(dog)card.insertAdjacentHTML('afterbegin',`<div class="portal-request-pricing">${html(pricing(dog))}</div>`);
        card.tabIndex=0;card.setAttribute('role','group');
        card.onkeydown=e=>{if(e.target===card&&(e.key==='Enter'||e.key===' ')){e.preventDefault();card.click();}};
      });
    }
    if(name==='renderCustomerUpdates') {
      fillDogFilter('customerUpdatesDogFilter');filterUpdates();
      el('customerUpdatesList').querySelectorAll('img').forEach(img=>{img.loading='lazy';img.decoding='async';});
    }
    if(name==='renderCustomerFiles') {
      fillDogFilter('customerRecordsDogFilter');filterFiles();
      const entries=customerUploadedFileEntriesForCurrentUser();
      el('customerFilesList').querySelectorAll('article').forEach((card,i)=>{
        if(entries[i]?.storagePath || entries[i]?.src)card.insertAdjacentHTML('afterbegin','<small class="portal-file-received">File received</small>');
      });
    }
  };
}
function selectedDog(id){return customerDogsForCurrentUser().find(d=>d.id===el(id).value);}
function filterUpdates(){
  const dog=selectedDog('customerUpdatesDogFilter');
  el('customerUpdatesList').querySelectorAll('.customer-update-group').forEach(group=>{
    group.hidden=!!dog&&group.dataset.customerDogId!==dog.id;
  });
}
function filterFiles(){
  const dog=selectedDog('customerRecordsDogFilter'),entries=customerUploadedFileEntriesForCurrentUser();
  el('customerFilesList').querySelectorAll('article').forEach((card,i)=>{
    const source=entries[i]?.sourceRecordId;
    card.hidden=!!dog&&!(source?source===dog.id||customerDogHasBoardingLink(dog,source):entries[i]?.dogName===dog.dogName);
  });
}
el('customerUpdatesDogFilter').onchange=filterUpdates;
el('customerRecordsDogFilter').onchange=filterFiles;
function selectRecordTab(button){
  document.querySelectorAll('[data-customer-record-tab]').forEach(tab=>{
    const active=tab===button;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;
    el(tab.getAttribute('aria-controls')).hidden=!active;
  });
}
document.querySelectorAll('[data-customer-record-tab]').forEach(button=>{
  button.onclick=()=>selectRecordTab(button);
  button.onkeydown=event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();const tabs=[...document.querySelectorAll('[data-customer-record-tab]')];
    const target=event.key==='Home'?tabs[0]:event.key==='End'?tabs.at(-1):tabs.find(t=>t!==button);
    selectRecordTab(target);target.focus();
  };
});
const originalEstimate=window.updateCustomerEstimate;
window.updateCustomerEstimate=function(...args){
  originalEstimate(...args);
  const form=el('customerBookingForm'),editing=!!form.elements.editingRequestId.value;
  let notice=el('customerRevisionNotice');
  if(!notice){notice=document.createElement('p');notice.id='customerRevisionNotice';notice.className='portal-notice';notice.setAttribute('role','status');form.querySelector('.section-heading').after(notice);}
  notice.hidden=!editing;notice.textContent='Changes will return this request to Pending Approval.';
  const estimate=customerEstimateDetails();
  el('bookingConfirmDialog').querySelector('h2').textContent=estimate.isServiceRequest?'Confirm Service Request':editing?'Confirm Request Changes':'Confirm Boarding Request';
  let review=el('customerReviewOverview');
  if(!review){review=document.createElement('section');review.id='customerReviewOverview';review.className='portal-review-overview';el('customerEstimate').before(review);}
  review.hidden=!estimate.dogs.length || !!customerEstimateBlockingErrors(estimate).length;
  if(review.hidden)return;
  const record=editing?boardingDogRecordForDisplay(form.elements.editingRequestId.value):null;
  const previous=record?boardingStayByReference(record,{stayId:form.elements.editingStayId.value}):null;
  const changes=[];
  if(previous){
    if((previous.dropoffTime||'').slice(0,16)!==estimate.dropoffTime)changes.push(`Drop-off: ${formatDateTime(previous.dropoffTime)} → ${formatDateTime(estimate.dropoffTime)}`);
    if(!estimate.isServiceRequest&&(previous.pickupTime||'').slice(0,16)!==estimate.pickupTime)changes.push(`Pickup: ${formatDateTime(previous.pickupTime)} → ${formatDateTime(estimate.pickupTime)}`);
    const next=estimate.services.map(s=>`${customerServiceDisplayName(s)} × ${Number(s.quantity||1)}`).join(', ') || 'None';
    changes.push(`Requested services: ${next}`);
  }
  review.innerHTML=`<div class="portal-review-heading"><h3>Stay details</h3><button type="button" class="secondary-button" data-customer-review-step="pets">Edit dates & dogs</button></div><dl class="portal-review-dates"><div><dt>${estimate.isServiceRequest?'Requested time':'Drop-off'}</dt><dd>${html(formatDateTime(estimate.dropoffTime))}</dd></div>${estimate.isServiceRequest?'':`<div><dt>Pickup</dt><dd>${html(formatDateTime(estimate.pickupTime))}</dd></div>`}</dl><div class="portal-review-heading"><h3>Dogs & services</h3><button type="button" class="secondary-button" data-customer-review-step="services">Edit services</button></div>${estimate.dogs.map(dog=>`<div class="portal-review-dog"><strong>${html(dog.dogName)}</strong><small>${html(pricing(dog))}</small><p>${html(customerServicesForDog(estimate,dog).map(s=>`${customerServiceDisplayName(s)} × ${Number(s.quantity||1)}`).join(', ') || 'No additional services')}</p></div>`).join('')}${changes.length?`<div class="portal-change-summary"><h3>Change summary</h3><ul>${changes.map(c=>`<li>${html(c)}</li>`).join('')}</ul></div>`:''}`;
  const lines=estimate.dogs.map(dog=>{
    const boarding=estimate.boardingLines.filter(l=>l.dogKey===boardingPricingDogKey(dog));
    const services=customerServicesForDog(estimate,dog);
    const subtotal=boarding.reduce((s,l)=>s+Number(l.total||0),0)+services.reduce((s,l)=>s+Number(l.lineTotal||0),0);
    return `<section class="portal-dog-estimate"><h4>${html(dog.dogName)} <small>${html(pricing(dog))}</small></h4>${boarding.map(l=>`<div class="estimate-line"><span>Boarding · ${Number(l.days)} × ${money(l.rate)}</span><span>${money(l.total)}</span></div>`).join('')}${services.map(s=>`<div class="estimate-line"><span>${html(customerServiceDisplayName(s))} × ${Number(s.quantity||1)}</span><span>${money(s.lineTotal)}</span></div>`).join('')}<div class="estimate-line"><strong>Subtotal</strong><strong>${money(subtotal)}</strong></div></section>`;
  }).join('');
  el('customerEstimate').innerHTML=`<div class="estimate-heading"><strong>Estimate</strong><span>Final approval comes from staff</span></div>${lines}<div class="estimate-total"><strong>Estimated total</strong><span>${money(estimate.total)}</span></div><small>Final total reflects approved changes.</small>`;
};
document.addEventListener('click',async event=>{
  const step=event.target.closest('[data-customer-review-step]');
  if(step&&currentRole()==='customer'){setCustomerBookingWizardStep(step.dataset.customerReviewStep);return;}
  const button=event.target.closest('[data-customer-workspace]');if(!button||currentRole()!=='customer')return;
  const action=button.dataset.customerWorkspace;
  if(action==='book'){
    switchPage('customerRequestsPage');openCustomerBookingModal('boarding');
    if(button.dataset.dogId){
      const list=el('customerBookingDogList');
      list.querySelectorAll('input[name="customerDogSelect"]').forEach(input=>input.checked=input.value===button.dataset.dogId);
      // Use the same pricing, crate and service refresh as a manual dog selection.
      list.dispatchEvent(new Event('change',{bubbles:true}));
    }
  }
  if(action==='stay'){
    const record=boardingDogRecordForDisplay(button.dataset.id);if(record&&boardingDogVisibleToCustomer(record))openCustomerRequestDetail(record,{stayId:button.dataset.stayId});
  }
  if(action==='updates')switchPage('customerUpdatesPage');
  if(action==='upload'){
    const dogs=customerDogsForCurrentUser();const dog=dogs.find(d=>d.id===(button.dataset.dogId||el('customerRecordsDogFilter').value));
    if(!dog&&dogs.length>1){el('customerRecordsDogFilter').focus();showToast('Choose a dog before updating vaccination records.');return;}
    if(!dog&&!dogs.length){switchPage('customerPage');openCustomerDogInline();return;}
    switchPage('customerPage');openCustomerDogInline(dog||dogs[0]);setCustomerDogWizardStep('records');
  }
});
prepareShell();
const originalSwitchPage=window.switchPage;
window.switchPage=function(...args){const result=originalSwitchPage(...args);prepareShell();window.syncCustomerShowAccess?.();return result;};
