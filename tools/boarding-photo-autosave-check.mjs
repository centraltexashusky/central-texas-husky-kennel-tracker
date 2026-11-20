import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

let actor='staff-qa', uploads=0, saves=0, failUpload=false, failSave=false, gate=null, refreshes=0;
let cached={boardingDog:[{id:'qa',type:'boardingDog',dogName:'Original',note:'Unfinished edits are not in this record',stays:[{id:'stay'}],profilePhotoPath:'old'}]};
const messages=[];
const ctx={Map,Set,Promise,Object,Boolean,Error,document:{addEventListener(){}},currentDbUserId:()=>actor,localTestMode:false,
 readRecords:type=>structuredClone(cached[type]||[]),writeRecords:(type,rows)=>{cached[type]=structuredClone(rows);},
 uploadDogPhotoToSupabase:async()=>{uploads++;if(gate) await gate;if(failUpload)return{error:'Upload failed'};return{storagePath:'users/staff-qa/dog-photos/qa/new.png',mediaMeta:{width:42}};},
 showToast:(message,options)=>{assert.equal(options.error,true);messages.push(message);},
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('js/boarding-photo-autosave.js','utf8'),ctx);
ctx.renderBoardingPhotoAutosaveState=()=>{};
ctx.boardingPhotoRefreshEditor=()=>refreshes++;
ctx.boardingPhotoRequest=async(name,args)=>{
 if(name==='boarding_photo_context')return{boardingId:'qa',targets:[{id:'qa',type:'boardingDog',version:'old'}]};
 saves++;if(failSave)throw Object.assign(Error('Save failed'),{code:failSave===true?'NETWORK':'40001'});
 return[{id:'qa',type:'boardingDog',payload:{id:'qa',type:'boardingDog',dogName:'Older server name',stays:[],note:'Older server note',profilePhotoPath:args.p_storage_path,profilePhotoMeta:args.p_meta}}];
};
const job=()=>({id:'qa',actor,name:'Fictional QA',file:{name:'qa.png'}});
const original=structuredClone(cached);
const a=job();failUpload=true;await ctx.runBoardingPhotoSave(a);
assert.equal(a.state,'error');assert.equal(a.retryable,true);assert.deepEqual(cached,original);assert.equal(saves,0);
failUpload=false;failSave=true;await ctx.runBoardingPhotoSave(a);
assert.equal(a.state,'error');assert.equal(a.retryable,true);assert.deepEqual(cached,original);
const uploaded=uploads;failSave=false;await ctx.runBoardingPhotoSave(a);
assert.equal(uploads,uploaded,'A completed upload is reused on retry');
assert.equal(a.state,'success');assert.equal(a.file,null,'Do not retain successful file blobs');
assert.equal(cached.boardingDog[0].profilePhotoPath,'users/staff-qa/dog-photos/qa/new.png');
assert.deepEqual(cached.boardingDog[0].stays,original.boardingDog[0].stays);
assert.equal(cached.boardingDog[0].dogName,'Original','No stale response or unfinished form values replace other fields');
assert.equal(cached.boardingDog[0].note,original.boardingDog[0].note);
const b=job();failSave='conflict';await ctx.runBoardingPhotoSave(b);
assert.equal(b.retryable,false,'Concurrency conflicts require a fresh selection');
failSave=false;
let release;gate=new Promise(resolve=>release=resolve);const c=job();
const running=ctx.runBoardingPhotoSave(c);
await new Promise(resolve=>setTimeout(resolve,0));
const beforeDuplicate=uploads;await ctx.runBoardingPhotoSave(c);assert.equal(uploads,beforeDuplicate,'Ignore duplicate save while busy');
const beforeSwitch=structuredClone(cached),beforeSaves=saves,beforeRefresh=refreshes;
actor='another-account';release();await running;
assert.equal(saves,beforeSaves,'A switched account must not start a database photo write');
assert.deepEqual(cached,beforeSwitch);assert.equal(refreshes,beforeRefresh);assert.equal(c.retryable,false);
assert.match(c.message,/account changed/);
console.log('Boarding photo autosave passed: upload/save failures preserve photos, retry reuses uploads, photo-only cache merge, concurrent rejection, duplicate guard and account isolation.');
