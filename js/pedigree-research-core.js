// Optional research records share the existing private, revisioned workspace.
export const researchLists=['litters','reminders','reviews'];
export const researchOf=d=>({litters:[],reminders:[],reviews:[],history:[],...(d.research||{})});
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const same=(a,b)=>JSON.stringify(canonical(a??null))===JSON.stringify(canonical(b??null));
const key=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/^(?:(?:GCHG|GCHS|GCHB|GCHP|GCH|CH)\.?\s+)+/,'').replace(/[^A-Z0-9]/g,'');
const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'')&&!Number.isNaN(Date.parse(s))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
export function validateResearch(data){
 if(data.research===undefined)return;
 if(!data.research||typeof data.research!=='object'||Array.isArray(data.research))throw Error('Invalid research records.');
 const r=researchOf(data),map=new Map(data.dogs.map(d=>[d.id,d]));
 for(const k of [...researchLists,'history']){if(!Array.isArray(r[k]))throw Error('Invalid '+k+' list.');const seen=new Set();for(const x of r[k]){if(!x?.id||seen.has(x.id))throw Error('Duplicate or missing '+k+' ID.');seen.add(x.id);}}
 for(const l of r.litters){if(!l.name?.trim()||!validDate(l.date))throw Error('A litter needs a name and a valid birth date.');if(!map.has(l.sireId)||!map.has(l.damId)||l.sireId===l.damId)throw Error('Choose both litter parents.');if(map.get(l.sireId).sex!=='Male'||map.get(l.damId).sex!=='Female')throw Error('Litter parents must be a male sire and female dam.');if(!Array.isArray(l.puppyIds)||new Set(l.puppyIds).size!==l.puppyIds.length)throw Error('Invalid litter members.');for(const id of l.puppyIds){const d=map.get(id);if(!d||d.sireId!==l.sireId||d.damId!==l.damId||d.dateOfBirth!==l.date)throw Error('Each puppy must have the litter’s parents and birth date.');if(r.litters.some(o=>o.id!==l.id&&!o.archived&&o.puppyIds?.includes(id))&&!l.archived)throw Error('A puppy already belongs to another litter.');}for(const o of l.observations||[]){if(!l.puppyIds.includes(o.dogId)||!validDate(o.date)||o.date<l.date)throw Error('Choose a litter puppy and an observation date on or after birth.');if(o.weightKg!==''&&o.weightKg!==undefined&&(!Number.isFinite(Number(o.weightKg))||Number(o.weightKg)<=0))throw Error('Weight must be positive.');}}
 for(const v of r.reminders)if(!map.has(v.dogId)||!v.title?.trim()||!validDate(v.dueDate))throw Error('A reminder needs a dog, title and valid due date.');
 for(const v of r.reviews)if(!v.key||!v.notes?.trim()||!/^https?:\/\//.test(v.sourceUrl||''))throw Error('A review decision needs notes and a source URL.');
 for(const h of r.history){if(!Array.isArray(h.changes)||!h.date||!h.actor)throw Error('Invalid history entry.');for(const c of h.changes)if(!['dogs','health','relationships','pairings',...researchLists].includes(c.list)||!c.id)throw Error('Invalid history change.');}
}
export function checklist(data,scope='owned'){
 return data.dogs.filter(d=>!d.archived&&(scope!=='owned'||d.ownedDogId)).map(d=>({dog:d,items:[...(!d.sireId?[{kind:'sire',label:'Sire missing'}]:!d.sireIdVerified?[{kind:'sire',label:'Check sire evidence'}]:[]),...(!d.damId?[{kind:'dam',label:'Dam missing'}]:!d.damIdVerified?[{kind:'dam',label:'Check dam evidence'}]:[]),...(!d.registrationNumber?[{kind:'details',label:'Registration number missing'}]:[]),...(!d.dateOfBirth?[{kind:'details',label:'Birth date missing'}]:[]),...(!d.coatColor?[{kind:'details',label:'Coat color missing'}]:[]),...(!d.leftEyeColor||d.leftEyeColor==='Unknown'||!d.rightEyeColor||d.rightEyeColor==='Unknown'?[{kind:'details',label:'Eye colors incomplete'}]:[]),...(!d.sourceUrl&&!(d.documents||[]).length?[{kind:'details',label:'Supporting source missing'}]:[]),...(!data.health.some(h=>h.dogId===d.id&&h.kind==='OFA'&&!h.archived)?[{kind:'health',label:'No OFA record entered'}]:[])]})).filter(r=>r.items.length);
}
export function reviewCandidates(data){
 const dogs=data.dogs.filter(d=>!d.archived),out=[],reviews=researchOf(data).reviews;
 for(let i=0;i<dogs.length;i++)for(let j=i+1;j<dogs.length;j++){
  const a=dogs[i],b=dogs[j],urls=d=>[d.sourceUrl,...(d.documents||[]).map(x=>x.url)].filter(u=>/dogs\.pedigreeonline\.com\/.+\/pedigree/.test(u||''));
  const nameMatch=key(a.registeredName)&&key(a.registeredName)===key(b.registeredName),sourceMatch=urls(a).some(u=>urls(b).includes(u));
  if(!nameMatch&&!sourceMatch)continue;
  const k='duplicate:'+ [a.id,b.id].sort().join(':');out.push({key:k,kind:'duplicate',a,b,label:sourceMatch?'Shared online identity':'Similar registered names',decision:reviews.find(v=>v.key===k)});
 }
 for(const d of dogs){const flags=[...(d.parentMatchReview||[]),...(d.notes||'').split('\n').filter(n=>/discrepancy|differs|pending.*confirmation|inconsistent|excluded.*date|date.*excluded/i.test(n))];for(const text of [...new Set(flags)]){const k='conflict:'+d.id+':'+text;out.push({key:k,kind:'conflict',a:d,label:text,decision:reviews.find(v=>v.key===k)});}}
 return out;
}
export function suggestedLitters(data){const groups=new Map(),saved=researchOf(data).litters;for(const d of data.dogs){if(d.archived||!d.sireId||!d.damId||!d.dateOfBirth||saved.some(l=>!l.archived&&l.puppyIds.includes(d.id)))continue;const k=[d.sireId,d.damId,d.dateOfBirth].join('|');if(!groups.has(k))groups.set(k,{sireId:d.sireId,damId:d.damId,date:d.dateOfBirth,puppyIds:[]});groups.get(k).puppyIds.push(d.id);}return [...groups.values()].filter(l=>l.puppyIds.some(id=>data.dogs.find(d=>d.id===id)?.ownedDogId)||l.puppyIds.length>1);}
export function reminderStatus(r,today){return r.completedAt?'Completed':r.dueDate<today?'Overdue':r.dueDate===today?'Due today':'Upcoming';}
function list(d,k){return researchLists.includes(k)?researchOf(d)[k]:d[k];}
export function recordHistory(before,next,{id,date,actor,revision,message}){
 const changes=[];for(const k of ['dogs','health','relationships','pairings',...researchLists]){const a=new Map(list(before,k).map(x=>[x.id,x])),b=new Map(list(next,k).map(x=>[x.id,x]));for(const ident of new Set([...a.keys(),...b.keys()]))if(!same(a.get(ident),b.get(ident)))changes.push({list:k,id:ident,before:a.get(ident)||null,after:b.get(ident)||null});}
 next.research={...researchOf(next),history:[...researchOf(before).history,...researchOf(next).history.filter(h=>h.imported&&!researchOf(before).history.some(x=>x.id===h.id))]};if(changes.length)next.research.history.push({id,date,actor,revision,message:message||'Roster synchronized',changes});return next;
}
export function restoreChange(data,entry){if(!entry||entry.imported)throw Error('Imported history is reference only.');const next=structuredClone(data);next.research=researchOf(next);for(const c of entry.changes){const rows=list(next,c.list),i=rows.findIndex(x=>x.id===c.id);if(!same(rows[i],c.after))throw Error('A record changed again after this entry. Review its newer changes first.');if(c.before){if(i<0)rows.push(structuredClone(c.before));else rows[i]=structuredClone(c.before);}else if(i>=0)rows.splice(i,1);}return next;}
export function mergeDogs(data,keepId,otherId,evidence){
 if(!evidence?.notes?.trim()||!/^https?:\/\//.test(evidence.sourceUrl||''))throw Error('Explain the identity match and provide its source.');
 const next=structuredClone(data),a=next.dogs.find(d=>d.id===keepId),b=next.dogs.find(d=>d.id===otherId);if(!a||!b||a===b||a.archived||b.archived)throw Error('Choose two active dog records.');if(a.ownedDogId&&b.ownedDogId)throw Error('Two Our Dogs profiles cannot be merged here.');
 for(const k of ['sex','breed','dateOfBirth','sireId','damId'])if(a[k]&&b[k]&&a[k]!=='Unknown'&&b[k]!=='Unknown'&&a[k]!==b[k])throw Error('Resolve conflicting '+k+' in the dog profiles before merging.');
 for(const [k,v] of Object.entries(b))if((!a[k]||a[k]==='Unknown')&& !['id','registrationNumber','name','registeredName','notes','documents'].includes(k))a[k]=v;
 a.documents=[...(a.documents||[]),...(b.documents||[]).filter(x=>!(a.documents||[]).some(y=>same(x,y)))];
 a.notes=[a.notes,b.notes,`Merged research identity: ${b.registeredName||b.name}; registration ${b.registrationNumber||'unknown'}. ${evidence.notes} Source: ${evidence.sourceUrl}`].filter(Boolean).join('\n');
 const replace=v=>v===otherId?keepId:v;
 for(const d of next.dogs)for(const k of ['sireId','damId'])if(d[k])d[k]=replace(d[k]);
 for(const h of next.health)h.dogId=replace(h.dogId);
 for(const r of next.relationships){r.dogId=replace(r.dogId);r.relativeId=replace(r.relativeId);}
 next.relationships=next.relationships.filter(r=>r.dogId!==r.relativeId);
 for(const p of next.pairings){p.sireId=replace(p.sireId);p.damId=replace(p.damId);}
 next.research=researchOf(next);for(const l of next.research.litters){l.sireId=replace(l.sireId);l.damId=replace(l.damId);l.puppyIds=[...new Set(l.puppyIds.map(replace))];for(const o of l.observations||[])o.dogId=replace(o.dogId);}
 for(const r of next.research.reminders)r.dogId=replace(r.dogId);
 b.archived=true;b.mergedInto=keepId;delete b.ownedDogId;b.sireId='';b.damId='';return next;
}

export function mergeResearchImport(current,incoming,mergeBase){validateResearch(incoming);const next=mergeBase(current,incoming);next.research=researchOf(next);for(const k of [...researchLists,'history'])for(const row of researchOf(incoming)[k]){if(next.research[k].some(x=>x.id===row.id))throw Error('This research record already exists. Import adds new records only.');next.research[k].push(k==='history'?{...row,imported:true}:structuredClone(row));}validateResearch(next);return next;}
