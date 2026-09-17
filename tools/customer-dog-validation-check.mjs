import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const html = fs.readFileSync('index.html', 'utf8');
assert.match(html, /<form id="customerDogForm"[^>]*novalidate/,
  'The wizard must handle validation so hidden invalid fields can be revealed');
for (const path of ['js/shared.js', 'script.js']) {
  let source = fs.readFileSync(path, 'utf8');
  if (path.startsWith('js/')) source = vm.runInNewContext(source.match(/const __snuggleStayModuleSource = (`[\s\S]*`);\n\(0, eval\)/)[1]);
  const start = source.indexOf('function validateForm(');
  const validation = source.slice(start, source.indexOf('\nfunction ', start + 1));
  for (const step of ['profile', 'care', 'records']) {
    const events = [];
    const field = {
      name: 'requiredField', type: 'text', required: true, value: '',
      closest: () => ({ dataset: { customerDogStep: step } }),
      focus: () => events.push('focus'), scrollIntoView: () => events.push('scroll'),
      checkValidity: () => false,
    };
    const context = { clearFieldError() {}, setFieldError: () => events.push('error'),
      friendlyName: () => 'Required field', showToast: () => events.push('toast'),
      setCustomerDogWizardStep: key => events.push('reveal:' + key) };
    vm.createContext(context);
    vm.runInContext(validation, context);
    const form = { id: { value: 'qa-dog' }, getAttribute: () => 'customerDogForm', elements: [field] };
    assert.equal(context.validateForm(form), false);
    assert.deepEqual(events, ['error', 'reveal:' + step, 'focus', 'scroll', 'toast']);
    field.value = 'valid'; field.checkValidity = () => true; events.length = 0;
    assert.equal(context.validateForm(form), true);
    assert.deepEqual(events, []);
    field.checkValidity = () => false;
    assert.equal(context.validateForm({ getAttribute: () => 'otherForm', elements: [field] }), false);
    assert(!events.some(event => event.startsWith('reveal:')), 'Other forms must not change the dog wizard');
  }
}
console.log('Customer dog validation: all steps reveal before focus, valid submits pass, other forms unchanged.');
