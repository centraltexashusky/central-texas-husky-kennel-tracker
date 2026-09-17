import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
export const source = vm.runInNewContext(fs.readFileSync('js/customer.js','utf8').match(/const __snuggleStayModuleSource = (`[\s\S]*`);\n\(0, eval\)/)[1]);
export const extract = (name, text=source) => { const start=text.indexOf('function '+name+'('); assert(start>=0,name); return text.slice(start,text.indexOf('\nfunction ',start+1)); };
export const functions = ['customerServiceIsSharedCrate','customerServiceAvailableForBooking','customerServiceIsPremiumStayUpgrade','customerServiceDisplayName','customerServiceInfoText','customerServiceInfoIconHtml','customerServiceOptionHtml','customerServiceMatchesDogPricingScope','customerServiceVisibleForCurrentUser','renderCustomerServiceOptions'].map(name=>extract(name)).join('\n');
export const catalog = [
 {id:'shared',serviceName:'Shared crate',category:'Boarding',boardingRateRole:'shared-crate-additional',requiresServiceId:'boarding',dependentServiceType:'optional-addon',basePrice:35,unit:'per day'},
 {id:'treadmill',serviceName:'30-min Treadmill Exercise (VIP)',category:'Exercise',requiresServiceId:'',basePrice:25,unit:'per session'},
 {id:'bath',serviceName:'Full Premium Bath',category:'Grooming',basePrice:100},
 {id:'deshed',serviceName:'Full Bath De-Shedding Add-On',category:'Grooming',requiresServiceId:'bath',dependentServiceType:'optional-addon',basePrice:40},
];
let dogs=[{id:'one',dogName:'QA One'}], mode='boarding';
const target={innerHTML:''};
const context={
 currentUser:{}, selectedCustomerDogs:()=>dogs, customerRequestMode:()=>mode,
 uniqueCustomerBookingDogs:items=>[...new Map(items.map(dog=>[dog.id,dog])).values()],
 normalizedBoardingRateRole:role=>role||'', normalizedServiceLookupText:s=>s.toLowerCase().replaceAll('-',' '),
 serviceHasFlag:(_,flag)=>flag==='Active', servicePricingScope:()=> 'member', customerPricingScopeForDog:()=> 'member',
 serviceDependencyId:s=>s.requiresServiceId||'', serviceDependencyType:s=>s.dependentServiceType||'',
 serviceDependencySatisfied:(s,ids)=>!s.requiresServiceId||ids.has(s.requiresServiceId),
 applyLegacyServiceDependencyMigration(){},applyLegacyBoardingProgramMigration(){},
 $:()=>target, readRecords:()=>catalog, checkedFrom:()=>['shared','bath','deshed','treadmill'],
 customerServiceFieldNameForDog:dog=>'services-'+dog.id,customerServiceQuantityFieldName:(id,dog)=>dog.id+'-'+id,
 customerServiceDogKey:dog=>dog.id,customerDependencyIds:ids=>new Set([...ids,'boarding']),
 formFieldByName:()=>({value:'1'}),servicePriceError:()=>'',servicePriceValue:s=>s.basePrice,
 money:n=>'$'+n,escapeHtml:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),
};
vm.createContext(context);vm.runInContext(functions,context);
context.renderCustomerServiceOptions();
assert(!target.innerHTML.includes('value="shared"'));
assert(!context.customerServiceVisibleForCurrentUser(catalog[0],dogs[0]),'Estimate must reject stale single-dog shared-crate selection');
assert(target.innerHTML.includes('<strong>Exercise</strong>'));
assert(!target.innerHTML.includes('Add-on: 30-min'));
assert(target.innerHTML.includes('Add-on: Full Bath'),'Genuine bath add-on remains nested');
dogs.push({id:'two',dogName:'QA Two'});context.renderCustomerServiceOptions();
assert(target.innerHTML.includes('value="shared"'));
assert(target.innerHTML.includes('two dogs can safely share a crate together'));
assert(target.innerHTML.includes('tabindex="0"'));
dogs=[dogs[0],dogs[0]];
assert(!context.customerServiceAvailableForBooking(catalog[0]),'Duplicate dog does not qualify');
dogs=[{id:'one'},{id:'two'}];mode='service';
assert(!context.customerServiceAvailableForBooking(catalog[0]),'Crate is boarding-only');
assert(context.customerServiceVisibleForCurrentUser(catalog[1],dogs[0]),'Treadmill available without boarding');
console.log('Customer service checks passed: one/two/duplicate dogs, stale selection guard, tooltip, standalone treadmill, genuine add-ons and service-only mode.');
