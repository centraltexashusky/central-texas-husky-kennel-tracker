import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const raw = fs.readFileSync('js/boarding.js', 'utf8');
const source = vm.runInNewContext(raw.match(/const __snuggleStayModuleSource = (`[\s\S]*`);\n\(0, eval\)\(__snuggleStayModuleSource\);/)[1]);
const functionSource = name => source.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`))[0];
const context = {
  escapeHtml: text => String(text).replaceAll('&', '&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),
  boardingPrimaryStay: record => record.stays?.[0] || {},
  boardingStayServiceTasks: (_, stay) => stay.tasks || [],
  boardingStayDataAttrs: () => ' data-stay-id="test-stay"',
  boardingServiceTaskDisplayName: task => task.serviceName,
  boardingDogMobilePhotoHtml: () => '<span>Photo</span>',
  boardingRecordStatusButtonHtml: () => '<button>Status</button>',
  phoneLinkHtml: text => '<a>' + text + '</a>',
  vaccinationStatusBadgeHtml: () => 'Vaccines OK',
  dogUsesRegularPricingOverride: record => record.regular,
  statusChipHtml: text => text,
  boardingStayRequestCodeChipHtml: () => 'BR-TEST',
  boardingMobileScheduleFlagsHtml: () => 'Drop-off / Pick-up',
  boardingQuickLengthFact: () => '4/11 days',
  boardingKennelLocationLabel: () => 'Shed 5',
  boardingQuickServiceFact: () => '1/4 done',
  boardingQuickSpecialCareFact: () => 'Medication twice daily',
  boardingQuickBelongingsFact: () => 'Belongings saved',
  boardingQuickActionButtons: () => '<div><button data-next-status="Ready For Pickup">Ready for Pickup</button><button data-action="open-boarding-medical-behavior-note">Log Medical/Behavior</button><button data-action="change-boarding">Details</button></div>',
};
vm.createContext(context);
vm.runInContext(functionSource('boardingRosterActionButtons') + '\n' + functionSource('boardingQuickCardHtml'), context);
const html = context.boardingQuickCardHtml({id:'test-dog',dogName:'<script>dog</script>',regular:true,stays:[{id:'test-stay',tasks:Array.from({length:4},(_,i)=>({serviceName:'Service '+i,status:i===0?'completed':'pending'}))}]});
for (const expected of ['boarding-roster-identity','boarding-roster-stay','boarding-roster-services','boarding-roster-care','Regular pricing','+1 more services','is-complete','Log Care','data-next-status="Ready For Pickup"','data-stay-id="test-stay"']) assert.ok(html.includes(expected), expected);
assert.ok(!html.includes('<script>dog</script>'), 'Names must be escaped');
assert.equal((html.match(/<li>/g)||[]).length, 3, 'Large service lists are bounded');
assert.ok(context.boardingQuickCardHtml({}).includes('No services requested'));
assert.ok(source.includes('const renderDesktopRows = false;'), 'No hidden table rows');
assert.ok(source.includes('BOARDING_ROSTER_RENDER_CHUNK_SIZE'), 'Keep batched rendering');
console.log('Modern boarding roster checks passed (details, actions, escaping, bounded services and responsive single DOM).');
