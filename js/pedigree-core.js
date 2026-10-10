import {validateAppearance} from './pedigree-appearance.js?v=1';
// Pure pedigree calculations. Unknown founders are assumed unrelated, never clear of disease.
export const emptyPedigree = () => ({version:1, dogs:[], health:[], relationships:[], pairings:[]});
export const pedigreeName = d => d?.name || d?.registeredName || 'Unknown';
export function safePedigreeUrl(value) {
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; }
}
export function validatePedigree(data) {
  if (!data || data.version !== 1 || !['dogs','health','relationships','pairings'].every(k => Array.isArray(data[k]))) throw Error('Use a pedigree export with version 1 and dogs, health, relationships and pairings lists.');
  if (data.dogs.length > 5000 || data.health.length > 25000) throw Error('Split this research file into a smaller import (maximum 5,000 dogs / 25,000 health records).');
  const ids = new Set(), owned = new Set(), registrations = new Set();
  for (const d of data.dogs) {
    validateAppearance(d);
    if (!d || typeof d.id !== 'string' || !/^[\w-]{1,120}$/.test(d.id) || ids.has(d.id)) throw Error('Each dog needs a unique ID using letters, numbers, underscores or hyphens.');
    if (!String(d.name || '').trim()) throw Error('Every dog needs a call name.');
    ids.add(d.id);
    if (!['Male','Female','Unknown'].includes(d.sex)) throw Error(`${d.name}: choose Male, Female or Unknown.`);
    if (d.ownedDogId && owned.has(d.ownedDogId)) throw Error('This Our Dogs profile is already linked to a research dog.');
    if (d.ownedDogId) owned.add(d.ownedDogId);
    const reg = String(d.registrationNumber || '').replace(/\s/g,'').toUpperCase();
    if (reg && registrations.has(reg)) throw Error(`Registration ${reg} is already recorded. Link the existing dog instead.`);
    if (reg) registrations.add(reg);
  }
  const map = new Map(data.dogs.map(d => [d.id,d]));
  const visiting = new Set(), done = new Set();
  function visit(id,depth=0) {
    if (depth > 100) throw Error('Pedigree exceeds 100 generations.');
    if (visiting.has(id)) throw Error('A dog cannot be its own ancestor. Check the parent connections.');
    if (done.has(id)) return;
    const d = map.get(id); visiting.add(id);
    if (d.sireId && d.sireId === d.damId) throw Error(`${d.name}: sire and dam must be different dogs.`);
    for (const [key,sex] of [['sireId','Male'],['damId','Female']]) if (d[key]) {
      const p = map.get(d[key]);
      if (!p) throw Error(`${d.name}: parent record is missing.`);
      if (p.sex !== sex && p.sex !== 'Unknown') throw Error(`${p.name} cannot be recorded as the ${key === 'sireId' ? 'sire' : 'dam'}.`);
      if (p.dateOfBirth && d.dateOfBirth && p.dateOfBirth >= d.dateOfBirth) throw Error(`${p.name}: parent birth date must precede the offspring’s birth date.`);
      visit(p.id,depth+1);
    }
    visiting.delete(id); done.add(id);
  }
  data.dogs.forEach(d=>visit(d.id));
  for (const key of ['health','relationships','pairings']) {
    const seen = new Set();
    for (const r of data[key]) {
      if (!r?.id || seen.has(r.id)) throw Error(`Duplicate or missing ${key} ID.`);
      seen.add(r.id);
      const refs = key === 'health' ? [r.dogId] : key === 'relationships' ? [r.dogId,r.relativeId] : [r.sireId,r.damId];
      if (refs.some(id=>!ids.has(id))) throw Error(`${key}: a referenced dog is missing.`);
      if (key === 'health' && !['OFA','DNA','Finding'].includes(r.kind)) throw Error('Unknown health record type.');
      if (key === 'relationships' && r.dogId === r.relativeId) throw Error('A dog cannot be its own sibling.');
      if (r.sourceUrl && !safePedigreeUrl(r.sourceUrl)) throw Error('Source links must start with https:// or http://.');
    }
  }
  for(const r of [...data.dogs,...data.health]) {
    if(r.documents !== undefined && (!Array.isArray(r.documents)||r.documents.some(a=>!a||typeof a.name!=='string'||(a.storagePath!==undefined&&typeof a.storagePath!=='string'))))throw Error('Document attachments must be a list of named files.');
    if(r.sourceUrl && !safePedigreeUrl(r.sourceUrl))throw Error('Source links must start with https:// or http://.');
    const date=r.dateOfBirth||r.date;
    if(date&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))))throw Error('Use dates in YYYY-MM-DD format.');
  }
  return data;
}
export function ancestors(dogs,id,maxDepth=100) {
  const map = new Map(dogs.map(d=>[d.id,d])), depths = new Map(), queue = [[id,0]];
  while(queue.length) {
    const [current,depth] = queue.shift(); if(depth >= maxDepth) continue;
    const d=map.get(current);
    for(const p of [d?.sireId,d?.damId].filter(Boolean)) if(!depths.has(p) || depths.get(p)>depth+1) {depths.set(p,depth+1);queue.push([p,depth+1]);}
  }
  return depths;
}
export function familyOf(dogs,id) {
  const dog=dogs.find(d=>d.id===id) || {};
  const progeny=dogs.filter(d=>d.sireId===id || d.damId===id);
  const siblings=dogs.filter(d=>d.id!==id && ((dog.sireId && d.sireId===dog.sireId)||(dog.damId && d.damId===dog.damId))).map(d=>({...d,relationship:dog.sireId && dog.damId && dog.sireId===d.sireId && dog.damId===d.damId?'Full sibling':'Half sibling'}));
  return {progeny,siblings};
}
export function completeness(dogs,id,generations=5) {
  const map=new Map(dogs.map(d=>[d.id,d]));let known=0,unverified=0,level=[id];
  for(let g=0;g<generations;g++) {
    const next=[];
    for(const current of level) {
      const d=map.get(current);
      for(const key of ['sireId','damId']) {const p=d?.[key]; next.push(p || null); if(p && map.has(p)){known++;if(!d[`${key}Verified`])unverified++;}}
    }
    level=next;
  }
  return {known,total:2**(generations+1)-2,unverified};
}
// Memoized kinship recurrence; ordering ensures recursion always moves toward founders.
// phi(i,i)=(1+F_i)/2, phi(i,j)=(phi(sire_i,j)+phi(dam_i,j))/2, F_child=phi(sire,dam).
export function pedigreeCoefficient(dogs,sireId,damId) {
  if(!sireId || !damId) return null;
  const map=new Map(dogs.map(d=>[d.id,d])), order=[], seen=new Set(), stack=new Set();
  function visit(id) {if(!id || seen.has(id))return;if(stack.has(id))throw Error('Cyclic pedigree');const d=map.get(id);if(!d)throw Error('Missing parent');stack.add(id);visit(d.sireId);visit(d.damId);stack.delete(id);seen.add(id);order.push(id);}
  visit(sireId);visit(damId);
  const rank=new Map(order.map((id,i)=>[id,i])), memo=new Map();
  function phi(a,b) {
    if(!a || !b)return 0;
    if(rank.get(a)<rank.get(b))[a,b]=[b,a];
    const key=a+'|'+b;if(memo.has(key))return memo.get(key);
    const d=map.get(a);
    const result=a===b ? (1+phi(d.sireId,d.damId))/2 : (phi(d.sireId,b)+phi(d.damId,b))/2;
    memo.set(key,result);return result;
  }
  return phi(sireId,damId);
}
export function singleGeneCross(a,b) {
  if(!['AA','Aa','aa'].includes(a)||!['AA','Aa','aa'].includes(b))return null;
  const result={AA:0,Aa:0,aa:0};for(const x of a)for(const y of b)result[[x,y].sort().join('')]+=0.25;
  return result;
}
export function testedTraitCrosses(health,sireId,damId) {
  const eligible=health.filter(r=>!r.archived&&r.kind==='DNA'&&r.verified&&r.model==='Autosomal recessive'&&r.variant&&singleGeneCross(r.genotype,r.genotype));
  const groups=new Map();
  for(const r of eligible) {const key=r.variant.trim().toLowerCase();if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
  const results=[];
  for(const [variant,rows] of groups) {
    const a=rows.filter(r=>r.dogId===sireId),b=rows.filter(r=>r.dogId===damId);
    if(!a.length||!b.length)continue;
    if(new Set(a.map(r=>r.genotype)).size!==1||new Set(b.map(r=>r.genotype)).size!==1){results.push({variant,conflict:true});continue;}
    results.push({variant,label:a[0].test,a:a[0].genotype,b:b[0].genotype,probabilities:singleGeneCross(a[0].genotype,b[0].genotype)});
  }
  return results;
}
export function mergePedigree(current,incoming) {
  validatePedigree(incoming);const next=structuredClone(current);
  for(const key of ['dogs','health','relationships','pairings']) {const ids=new Set(next[key].map(r=>r.id));for(const row of incoming[key]){if(ids.has(row.id))throw Error(`ID ${row.id} already exists. Import adds new records only; edit existing records in the workspace.`);next[key].push(row);}}
  return validatePedigree(next);
}

// Add missing roster identities without changing existing ancestry or research.
export function includeOwnedDogs(data, roster, createId) {
  const next = structuredClone(data);
  const registrations = new Set(next.dogs.map(d => String(d.registrationNumber || '').replace(/\s/g, '').toUpperCase()).filter(Boolean));
  for (const o of roster) {
    if (o.removed || next.dogs.some(d => d.ownedDogId === o.id)) continue;
    const registration = String(o.akcRegistrationNumber || '').trim();
    const duplicate = registration && registrations.has(registration.replace(/\s/g, '').toUpperCase());
    next.dogs.push({id:createId(), ownedDogId:o.id, name:o.callName || o.showName || 'Dog', registeredName:o.showName || '', registrationNumber:duplicate ? '' : registration,
      sex:['Male','Female'].includes(o.sex) ? o.sex : 'Unknown', dateOfBirth:o.dateOfBirth || '', breed:o.breed || 'Siberian Husky',
      notes:[o.sireName && `Unlinked sire name from profile: ${o.sireName}`, o.damName && `Unlinked dam name from profile: ${o.damName}`, duplicate && `Registration from Our Dogs needs review (already used in research): ${registration}`].filter(Boolean).join('\n')});
    if (registration) registrations.add(registration.replace(/\s/g, '').toUpperCase());
  }
  return linkOwnedParents(next, roster);
}

// Titles change over a dog's life; compare the registered identity, never a call name.
export function registeredParentKey(value) {
  return String(value || '').normalize('NFKC').toUpperCase()
    .replace(/^(?:(?:GCHG|GCHS|GCHB|GCHP|GCH|CH)\.?\s+)+/, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
}
export function linkOwnedParents(data, roster) {
  const next=structuredClone(data), rosterById=new Map(roster.filter(o=>!o.removed).map(o=>[o.id,o]));
  const names=new Map();
  for(const d of next.dogs) {
    for(const raw of [d.registeredName,rosterById.get(d.ownedDogId)?.showName]) {
      const key=registeredParentKey(raw);if(!key)continue;
      if(!names.has(key))names.set(key,new Set());names.get(key).add(d.id);
    }
  }
  for(const d of next.dogs) {
    const o=rosterById.get(d.ownedDogId);if(!o)continue;
    const review=[];
    for(const [field,sourceField,label] of [['sireId','sireName','Sire'],['damId','damName','Dam']]) {
      const raw=o[sourceField], key=registeredParentKey(raw);
      if(!key||d[field+'AutoLinkDisabled'])continue;
      const candidates=[...(names.get(key)||[])];
      if(d[field]) {
        if(candidates.length===1&&candidates[0]!==d[field])review.push(`${label}: saved parent differs from Our Dogs (${raw}). Review the connection.`);
        continue;
      }
      if(candidates.length!==1){review.push(`${label}: ${candidates.length?'multiple registered-name matches':'no registered-name match'} for ${raw}.`);continue;}
      d[field]=candidates[0];
      try {validatePedigree(next);}catch {delete d[field];review.push(`${label}: ${raw} needs review because this connection conflicts with the pedigree (sex, birth date or ancestry).`);continue;}
      d[field+'Verified']=false;
      d[field+'Notes']=`Automatically linked from Our Dogs ${sourceField}: ${raw}. Registered-name match; certificate not verified.`;
      const oldNote=`Unlinked ${label.toLowerCase()} name from profile: ${raw}`;
      d.notes=String(d.notes||'').split('\n').filter(line=>line!==oldNote).join('\n');
    }
    d.parentMatchReview=review;
  }
  validatePedigree(next);return next;
}
