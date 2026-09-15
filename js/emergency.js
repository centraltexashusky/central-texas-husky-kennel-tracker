// Emergency guidance is deliberately separate from dog and financial records.
// Private facility details live in the staff-readable, admin-writable emergencyPlan record.
const PLAN_ID = 'emergency-plan-main';
const references = {
  akc: ['AKC kennel emergency planning', 'https://www.akc.org/expert-advice/dog-breeding/kennel-emergency-disaster-planning-keeping-dogs-facility-safe/'],
  vet: ['AVMA pet first aid', 'https://ebusiness.avma.org/files/ProductDownloads/mcm-client-brochures-pet-first-aid-2025.pdf'],
  fire: ['American Red Cross fire safety', 'https://www.redcross.org/get-help/how-to-prepare-for-emergencies/types-of-emergencies/fire/if-a-fire-starts.html'],
  storm: ['National Weather Service tornado safety', 'https://www.weather.gov/jan/beprepared-tornadoes'],
  power: ['CDC power outage safety', 'https://www.cdc.gov/natural-disasters/response/what-to-do-protect-yourself-during-a-power-outage.html'],
};
const guides = [
  {id:'injury', title:'Injured or sick dog', keywords:'hurt injury bleeding seizure collapse breathing vet veterinarian hospital bite accident', steps:[
    ['Call a veterinarian now', 'Call the primary vet during business hours or the emergency hospital after hours. Describe the symptoms and follow their directions. Trouble breathing, collapse, severe bleeding or seizures need urgent veterinary attention.'],
    ['Keep yourself safe and limit handling', 'An injured dog may bite. Keep the area quiet and avoid unnecessary movement. Do not give medication or attempt treatment beyond your training without veterinary direction.'],
    ['Prepare safe transport and notify the manager', 'Call ahead, use safe restraint, and bring the dog’s identification and relevant medical information. Coordinate owner notification without delaying urgent care. Record what happened and the care provided.'],
  ], fields:['manager','transport','keys'], refs:['vet']},
  {id:'fire', title:'Fire or smoke', keywords:'smoke burning gas alarm evacuation exit flames', steps:[
    ['Get people out and call 911 from safety', 'Raise the alarm and leave by a safe exit. Do not delay evacuation to retrieve belongings or use this app.'],
    ['Never re-enter a dangerous building', 'Do not return for dogs, keys or equipment. Tell firefighters where any people or animals remain. Move dogs only when it can be done without entering danger or delaying your escape.'],
    ['Account for everyone at the meeting point', 'Report missing people and dogs to responders. Keep safely evacuated dogs secured and arrange transport to the approved destination. Return only when authorities say it is safe.'],
  ], fields:['assembly','exitRoutes','destination','transport','keys'], refs:['fire','akc']},
  {id:'tornado', title:'Tornado or severe storm', keywords:'tornado wind weather shelter lightning warning watch storm', steps:[
    ['Act on official warnings', 'A watch means prepare and monitor conditions. A tornado warning means take shelter immediately; do not rely on past local experience to judge the danger.'],
    ['Use a designated safe shelter', 'Use a storm shelter or a small, windowless interior room on the lowest floor of a sturdy building. Protect your head and neck. A vehicle or exposed outbuilding is not a safe tornado shelter.'],
    ['Shelter with dogs when safe to do so', 'Keep dogs secured and separated as needed. Do not delay human sheltering or go outside to retrieve animals during an immediate threat. Monitor official alerts and leave shelter when the threat has passed.'],
  ], fields:['shelter','shelterRoom','manager'], refs:['storm']},
  {id:'power', title:'Power outage', keywords:'electricity blackout electric generator air conditioning ac cooling heat power fuel', steps:[
    ['Check people, dogs and cooling', 'Notify the manager. Check ventilation, drinking water and indoor temperature. If conditions become unsafe or a dog shows heat distress, contact a veterinarian and arrange safe relocation.'],
    ['Use only the approved generator procedure', 'Only a trained, authorized operator should connect or start the generator. Follow the manufacturer and electrician-approved connection instructions. Never backfeed power through a wall outlet.'],
    ['Prevent carbon monoxide and electrical hazards', 'Keep portable generators outdoors, at least 20 feet from doors, windows and vents, with exhaust directed away. Never operate in an enclosed or partly enclosed area. Stay away from downed lines and wet electrical equipment.'],
    ['Confirm air conditioning is actually running', 'After startup, check cooling in every occupied dog area. Continue monitoring dogs and temperature; a running generator does not prove the air conditioning is working. Use the relocation plan if cooling cannot be maintained.'],
  ], fields:['generator','generatorOperator','generatorSteps','utility','destination'], refs:['power']},
  {id:'evacuation', title:'Evacuation', keywords:'evacuate transport van transit crates keys fire flood destination sister address leave property', steps:[
    ['Follow responder directions and choose a safe route', 'Use the approved destination for relocation. Confirm it is accessible and safe for the current event; do not drive through floodwater or toward a hazard.'],
    ['Assign transport and account for dogs', 'Assign a driver and a roster checker. Identify each dog, secure crates, check actual safe capacity and ventilation, and keep incompatible dogs separated. Arrange additional transport if needed.'],
    ['Recount at the destination', 'Compare arrivals against the departure list. Record missing dogs, notify the manager and responders as appropriate, and coordinate owner updates.'],
  ], fields:['destination','destinationContact','assembly','transport','keys','backupTransport','manager'], refs:['akc']},
  {id:'missing', title:'Missing dog', keywords:'lost escaped missing gate fence runaway', steps:[
    ['Secure the remaining dogs', 'Close safe access points and notify the manager immediately. Confirm which dog is missing using identification and the current roster.'],
    ['Coordinate a safe search', 'Assign search areas and maintain staff coverage for dogs still on site. Avoid chasing the dog into traffic or entering unsafe property. Contact local animal control and the owner through the manager.'],
    ['Record and follow up', 'Record the last known location and time, search actions and who was contacted. After recovery, assess the dog with veterinary help as needed and fix the escape risk.'],
  ], fields:['manager','animalControl'], refs:['akc']},
  {id:'poison', title:'Suspected poisoning', keywords:'poison toxic toxin chemical ate swallowed chocolate medicine ingestion', steps:[
    ['Call a veterinarian immediately', 'Prevent further exposure if safe. Tell the veterinarian what may have been swallowed or contacted, how much, and when.'],
    ['Do not improvise treatment', 'Do not induce vomiting or give home remedies unless a veterinarian or animal poison specialist specifically directs it. Keep packaging or a photo of the substance available.'],
    ['Follow the transport instructions', 'Notify the manager and take the dog to the recommended veterinary facility. Bring the substance information without exposing people or other dogs.'],
  ], fields:['manager','transport'], refs:['vet']},
  {id:'heat', title:'Heat distress or cooling failure', keywords:'heatstroke hot overheating panting air conditioner ac cooling illness distress', steps:[
    ['Get veterinary advice urgently', 'Move the dog out of heat to a cooler, ventilated area when safe. Heavy panting, weakness or collapse require immediate attention.'],
    ['Begin safe cooling while arranging care', 'Follow the veterinarian’s cooling and transport directions. Do not wait for the dog to appear recovered before seeking veterinary guidance.'],
    ['Protect the other dogs', 'Check all occupied areas and notify the manager. If safe temperatures cannot be maintained, use the approved relocation plan.'],
  ], fields:['generator','generatorOperator','destination','manager'], refs:['vet','power']},
];
const fields = [
  ['manager','Emergency coordinator / manager contact'], ['assembly','Outside assembly point'],
  ['exitRoutes','Safe exits and posted floor-plan location'], ['destination','Evacuation destination'],
  ['destinationContact','Destination contact / backup destination'], ['transport','Evacuation vehicle and capacity'],
  ['keys','Vehicle key location and access'], ['backupTransport','Driver / backup transport arrangements'],
  ['shelter','Tornado response'], ['shelterRoom','Designated tornado shelter room'],
  ['generator','Generator availability and purpose'], ['generatorOperator','Authorized generator operator'],
  ['generatorSteps','Approved generator connection, startup and shutdown instructions'], ['utility','Electric utility / outage contact'],
  ['animalControl','Animal control contact'], ['supplies','First aid, extinguishers, leashes and emergency supplies'],
  ['drills','Staff training, drill schedule and latest drill'],
];
const vetDefaults = [
  {name:'Forest Creek Animal Hospital', phone:'512-238-7387', address:'1200 S. Kenney Fort Blvd., Round Rock, TX 78665', hours:'Mon–Fri 7 AM–6 PM; Sat 8 AM–noon; Sun closed. Call ahead.', url:'https://www.forestcreekvet.com/contact/'},
  {name:'Heart of Texas Veterinary Specialty Center', phone:'512-744-4644', address:'115 E. Old Settlers Blvd., Round Rock, TX 78664', hours:'24/7 emergency care, including evenings and weekends. Call ahead.', url:'https://www.thrivepetcare.com/locations/texas/round-rock/heart-of-texas-veterinary-specialty-center'},
];
let selected = 'injury';
let query = '';
const el = id => document.getElementById(id);
const html = value => escapeHtml(String(value ?? ''));
const canRead = () => helperIsLoggedIn() && ['helper','staff','admin'].includes(currentRole());
function plan() { return readRecords('emergencyPlan').find(r=>r.id===PLAN_ID && !r.removed) || {}; }
function vets(p) { return vetDefaults.map((v,i)=>({...v,...p.vets?.[i]})); }
function referenceLinks(keys) { return keys.map(k=>`<a href="${references[k][1]}" target="_blank" rel="noopener noreferrer">${references[k][0]}</a>`).join(' · '); }
function fieldList(p, keys) {
  return `<dl class="emergency-facts">${keys.map(k=>`<div><dt>${html(fields.find(f=>f[0]===k)?.[1] || k)}</dt><dd>${p[k] ? html(p[k]).replace(/\n/g,'<br>') : '<span class="emergency-missing">Needs setup — contact the manager</span>'}</dd></div>`).join('')}</dl>`;
}
function guideHtml(g,p) {
  return `<h3>${html(g.title)}</h3><ol class="emergency-steps">${g.steps.map(([title,text])=>`<li><strong>${html(title)}</strong><p>${html(text)}</p></li>`).join('')}</ol>
    <h4>Facility instructions</h4>${fieldList(p,g.fields)}${p.notes?.[g.id] ? `<h4>Additional approved instructions</h4><p class="emergency-note">${html(p.notes[g.id])}</p>` : ''}
    <p class="emergency-muted">General guidance checked September 15, 2026. ${referenceLinks(g.refs)}</p>`;
}
function contactHtml(p) {
  return vets(p).map((v,i)=>`<article><h3>${i ? 'After hours & weekends' : 'Primary vet'}</h3><strong>${html(v.name)}</strong><p>${html(v.phone)}<br>${html(v.address)}</p><p class="emergency-muted">${html(v.hours)}</p><div class="button-row"><a class="primary-button" href="tel:${html(v.phone.replace(/[^+\d]/g,''))}">${i ? 'Call emergency vet' : 'Call vet'}</a><a class="secondary-button" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/dir/?api=1&amp;destination=${encodeURIComponent(v.address)}">Directions</a></div><small>Default contact verified Sep 15, 2026 · <a href="${vetDefaults[i].url}" target="_blank" rel="noopener noreferrer">Hospital website</a></small></article>`).join('');
}
function renderGuides() {
  if (!canRead()) return;
  const p=plan();
  const terms=query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const results=guides.filter(g=>{
    const text=[g.title,g.keywords,...g.steps.flat(),...g.fields.map(k=>p[k] || ''),p.notes?.[g.id] || '',...vets(p).map(v=>`${v.name} ${v.phone}`)].join(' ').toLowerCase();
    return terms.every(t=>text.includes(t));
  });
  if (!results.some(g=>g.id===selected)) selected=results[0]?.id || '';
  el('emergencySearchStatus').textContent=`${results.length} ${results.length===1 ? 'guide' : 'guides'}${terms.length ? ' matching your search' : ' available'}`;
  el('emergencyGuideList').innerHTML=results.map(g=>`<button type="button" data-emergency-guide="${g.id}" aria-current="${g.id===selected ? 'true':'false'}">${html(g.title)}<span aria-hidden="true">›</span></button>`).join('');
  el('emergencyGuideDetail').innerHTML=results.length ? guideHtml(results.find(g=>g.id===selected),p) : '<h3>No matching guides</h3><p>Try “injury”, “fire”, “tornado”, “generator” or “evacuation”.</p><button type="button" data-emergency-clear>Clear search</button>';
}
function renderFacility() {
  const p=plan();
  const missing=fields.filter(([k])=>!String(p[k] || '').trim());
  el('emergencyFacility').innerHTML=`<div class="emergency-review"><strong>${missing.length ? `Facility plan needs setup: ${missing.length} items` : 'Facility details saved'}</strong><p>${p.reviewedAt ? `Last facility review: ${html(p.reviewedAt)}${p.reviewedBy ? ` · ${html(p.reviewedBy)}` : ''}` : 'Not yet reviewed with staff. Complete the missing instructions and practice the plan.'}</p>${missing.length ? `<p>${missing.map(f=>html(f[1])).join(' · ')}</p>` : ''}</div><details><summary>Facility resources and readiness</summary>${fieldList(p,fields.map(f=>f[0]))}</details>`;
}
window.renderEmergencyProcedures = function() {
  if (!canRead()) { el('emergencyContacts').innerHTML=''; el('emergencyFacility').innerHTML=''; el('emergencyGuideDetail').innerHTML=''; el('emergencyGuideList').innerHTML=''; return; }
  el('emergencyEdit').hidden=currentRole()!=='admin';
  el('emergencyContacts').innerHTML=contactHtml(plan());
  renderGuides(); renderFacility();
};
async function loadSharedPlan() {
  if (localTestMode) return plan();
  if (!supabaseClient) throw new Error('Reconnect before editing the shared plan.');
  const {data,error}=await cuddleStayRequest(db=>db.from('kennel_records').select('payload').eq('id',PLAN_ID).eq('type','emergencyPlan').maybeSingle());
  if (error) throw error;
  return data?.payload || {};
}
async function openEditor() {
  if (!canRead() || currentRole()!=='admin') return;
  const editButton=el('emergencyEdit');
  editButton.disabled=true;
  let p;
  try { p=await loadSharedPlan(); }
  catch(error) { showToast(`Cannot open the shared plan. ${error.message || 'Please reconnect and try again.'}`); return; }
  finally { editButton.disabled=false; }
  if (!canRead() || currentRole()!=='admin') return;
  const fieldInput=([key,label])=>`<label>${html(label)}<textarea name="${key}" rows="2" maxlength="4000">${html(p[key] || '')}</textarea></label>`;
  showDetailDialog('Edit emergency facility plan', `<form id="emergencyPlanForm"><p>Shared with staff and admins only. Leave unknown details blank; do not guess locations or equipment instructions.</p><div class="emergency-editor-fields">${fields.map(fieldInput).join('')}</div><details><summary>Veterinary contacts</summary>${vets(p).map((v,i)=>`<fieldset><legend>${i ? 'After hours & weekends' : 'Primary vet'}</legend>${['name','phone','address','hours'].map(k=>`<label>${html(k)}<input name="vet${i}_${k}" value="${html(v[k])}" maxlength="400" required ${k==='phone' ? 'type="tel" pattern="[+0-9() .-]{7,30}"' : ''}></label>`).join('')}</fieldset>`).join('')}</details><details><summary>Additional instructions by emergency</summary>${guides.map(g=>`<label>${html(g.title)}<textarea name="notes_${g.id}" rows="3" maxlength="5000">${html(p.notes?.[g.id] || '')}</textarea></label>`).join('')}</details><label>Last reviewed with staff<input name="reviewedAt" type="date" value="${html(p.reviewedAt || '')}" max="${new Date().toLocaleDateString('en-CA')}"></label><label>Reviewed by<input name="reviewedBy" value="${html(p.reviewedBy || '')}" maxlength="200"></label><p id="emergencySaveStatus" role="status"></p><div class="button-row"><button type="submit">Save facility plan</button><button type="button" class="secondary-button" data-emergency-cancel>Cancel</button></div></form>`);
  // A remote refresh must not replace the administrator's in-progress form.
  const form=el('emergencyPlanForm');
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if (currentRole()!=='admin' || !canRead()) return;
    const button=form.querySelector('[type="submit"]');
    button.disabled=true;
    const status=el('emergencySaveStatus'); status.textContent='Saving…';
    const values=new FormData(form);
    const record={id:PLAN_ID,type:'emergencyPlan',submittedAt:p.submittedAt || new Date().toISOString(),updatedAt:new Date().toISOString(),removed:false,
      ...Object.fromEntries(fields.map(([k])=>[k,String(values.get(k)||'').trim()])),
      vets:vetDefaults.map((v,i)=>Object.fromEntries(['name','phone','address','hours'].map(k=>[k,String(values.get(`vet${i}_${k}`)||'').trim()]))),
      notes:Object.fromEntries(guides.map(g=>[g.id,String(values.get(`notes_${g.id}`)||'').trim()])),
      reviewedAt:String(values.get('reviewedAt')||''),reviewedBy:String(values.get('reviewedBy')||'').trim()};
    try {
      if (!localTestMode && !supabaseClient) throw new Error('Reconnect before saving the shared plan.');
      const latest=await loadSharedPlan();
      if ((latest.updatedAt || '') !== (p.updatedAt || '')) throw new Error('Another administrator updated this plan. Copy your changes, then reopen the latest plan before saving.');
      const result=await sendPayload(record,{quiet:true});
      if (!result?.ok || result.skippedRemote) throw new Error('The shared plan was not saved.');
      upsertRecord('emergencyPlan',record);
      document.getElementById('closeDetailDialog').click();
      window.renderEmergencyProcedures();
      showToast(localTestMode ? 'Emergency plan saved in local test.' : 'Emergency facility plan saved for staff.');
    } catch(error) { status.textContent=`Not saved. ${error.message || 'Please reconnect and try again.'} Your edits are still here.`; button.disabled=false; }
  });
  form.querySelector('[data-emergency-cancel]').addEventListener('click',()=>el('closeDetailDialog').click());
}
el('emergencyEdit').addEventListener('click',openEditor);
el('emergencySearch').addEventListener('input',event=>{query=event.target.value;renderGuides();});
el('emergencyPage').addEventListener('click',event=>{
  const guide=event.target.closest('[data-emergency-guide]');
  if (guide) {selected=guide.dataset.emergencyGuide;renderGuides();el('emergencyGuideDetail').focus({preventScroll:true});if(innerWidth<760)el('emergencyGuideDetail').scrollIntoView({block:'start'});}
  if(event.target.closest('[data-emergency-clear]')) {query='';el('emergencySearch').value='';renderGuides();el('emergencySearch').focus();}
});
el('emergencyPrint').addEventListener('click',()=>{
  if(!canRead())return;
  const p=plan();
  el('emergencyPrintContent').innerHTML=`<h1>Emergency Procedures</h1><p>Printed ${html(new Date().toLocaleString())}. Staff copy — contains private facility details. Keep secure and replace after updates.</p><p>Immediate danger to people or fire: call 911 from safety.</p>${contactHtml(p)}<h2>Facility plan</h2><p>${p.reviewedAt ? `Reviewed ${html(p.reviewedAt)} by ${html(p.reviewedBy)}` : 'Needs review with staff'}</p>${fieldList(p,fields.map(f=>f[0]))}${guides.map(g=>`<section>${guideHtml(g,p)}</section>`).join('')}<p>This is not an AKC compliance certification. Keep a current printed copy available without power or internet.</p>`;
  document.body.classList.add('printing-emergency');
  window.print();
});
window.addEventListener('afterprint',()=>{document.body.classList.remove('printing-emergency');el('emergencyPrintContent').innerHTML='';});
