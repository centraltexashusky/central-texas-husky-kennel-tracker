// Recorded appearance is not a genotype. Only explicit, source-checked DNA calls
// feed the Mendelian calculator; offspring observations are descriptive counts.
export const eyeColors = ['Unknown','Blue','Brown','Amber','Green','Parti-color','Other'];
export const colorLoci = [
  {key:'brown',label:'Brown pigment · B locus',calls:['BB','Bb','bb'],effect:'bb changes black pigment to brown where that pigment is expressed. Other genes affect visible coat color.',url:'https://vgl.ucdavis.edu/test/brown-dog'},
  {key:'dilute',label:'Dilution · D locus',calls:['DD','Dd','dd'],effect:'dd can dilute pigment. Other coat genes and the variants covered by the laboratory test affect the visible result.',url:'https://vgl.ucdavis.edu/test/dilute-dog'},
  {key:'blueEye',label:'Husky blue-eye-associated duplication · ALX4',calls:['NN','NV','VV'],effect:'N = no duplication; V = duplication allele. This predicts inheritance of the tested duplication, not a percentage of blue-eyed puppies. Some dogs carrying it do not have blue eyes.',url:'https://journals.plos.org/plosgenetics/article?id=10.1371/journal.pgen.1007648'}
];
export function colorCross(a,b,calls) {
  if(!calls.includes(a)||!calls.includes(b))return null;
  const result=Object.fromEntries(calls.map(c=>[c,0]));
  for(const x of a)for(const y of b){const key=calls.find(c=>c===x+y||c===y+x);if(!key)return null;result[key]+=.25;}
  return result;
}
export function appearancePredictions(a={},b={}) {
  return colorLoci.map(locus=>{
    const x=a.colorGenetics||{},y=b.colorGenetics||{};
    const ready=[x,y].every(g=>g.verified===true&&/^https?:\/\//.test(g.sourceUrl||''));
    return {...locus,a:x[locus.key]||'',b:y[locus.key]||'',probabilities:ready?colorCross(x[locus.key],y[locus.key],locus.calls):null};
  });
}
export function eyeDescription(d={}) {
  const left=d.leftEyeColor||'Unknown',right=d.rightEyeColor||'Unknown';
  if(left==='Unknown'&&right==='Unknown')return '';
  return left===right?left+' eyes':'Left: '+left+' · Right: '+right;
}
export function observedColors(dogs,sireId,damId) {
  const offspring=dogs.filter(d=>!d.archived&&d.sireId===sireId&&d.damId===damId);
  function counts(get) {
    const buckets=new Map();let recorded=0;
    for(const d of offspring){const label=get(d);if(!label)continue;recorded++;buckets.set(label,(buckets.get(label)||0)+1);}
    return {recorded,missing:offspring.length-recorded,rows:[...buckets].map(([label,count])=>({label,count,percent:100*count/recorded}))};
  }
  return {total:offspring.length,coat:counts(d=>{const c=String(d.coatColor||'').trim().toLowerCase();return ['','unknown','not recorded'].includes(c)?'':c;}),eyes:counts(d=>d.leftEyeColor&&d.rightEyeColor&&d.leftEyeColor!=='Unknown'&&d.rightEyeColor!=='Unknown'?eyeDescription(d):'')};
}
export function validateAppearance(d){
  for(const key of ['coatColor','colorNotes','appearanceSourceUrl'])if(d[key]!==undefined&&typeof d[key]!=='string')throw Error('Color details must be text.');
  for(const key of ['leftEyeColor','rightEyeColor'])if(d[key]!==undefined&&!eyeColors.includes(d[key]))throw Error('Choose a listed eye color.');
  const g=d.colorGenetics;if(g===undefined)return;
  if(!g||typeof g!=='object'||Array.isArray(g))throw Error('Invalid color DNA results.');
  for(const l of colorLoci)if(g[l.key]&&!l.calls.includes(g[l.key]))throw Error('Invalid '+l.label+' result.');
  if(g.verified && (g.verified!==true||!/^https?:\/\//.test(g.sourceUrl||'')))throw Error('Source-checked color DNA results need a report URL.');
}
