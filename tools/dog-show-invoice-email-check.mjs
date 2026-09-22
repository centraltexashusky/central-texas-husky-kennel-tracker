import assert from 'node:assert/strict';
import fs from 'node:fs';
const source = fs.readFileSync('supabase/functions/send-notification/index.ts','utf8');
const start = source.indexOf('function dogShowInvoiceEmailItemLines(');
const end = source.indexOf('\nasync function notificationContent(',start);
const fn = new Function('formatEmailMoneyText','formatEmailDateOnlyText',`${source.slice(start,end).replace('item: Record<string, unknown>','item')}\nreturn dogShowInvoiceEmailItemLines;`)(
  value => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(value)),
  value => value,
);
const one = fn({dogName:'Aurora',showName:'One dog',showDate:'2026-09-21',directExpenses:140,showWideShare:60,incomeOffsets:10,amount:190}).join('\n');
assert.match(one,/Direct expenses: \$140.00/);
assert.match(one,/Shared expenses \(this dog's share\): \$60.00/);
assert.match(one,/Rewards \/ credits deducted: \$10.00/);
assert.match(one,/Amount for Aurora: \$190.00/);
const family = [
  {dogName:'Aurora',directExpenses:135,showWideShare:60,incomeOffsets:10,amount:185},
  {dogName:'Orion',directExpenses:135,showWideShare:60,incomeOffsets:0,amount:195},
].flatMap(fn).join('\n');
assert.equal((family.match(/share\): \$60.00/g)||[]).length,2,'Each dog must show its own share, not the full shared expense');
assert.match(family,/Amount for Aurora: \$185.00/);
assert.match(family,/Amount for Orion: \$195.00/);
assert.match(family,/Rewards \/ credits deducted: \$0.00/);
const credit = fn({dogName:'Aurora',directExpenses:10,showWideShare:0,incomeOffsets:25,amount:-15}).join('\n');
assert.match(credit,/Amount for Aurora: -\$15.00/,'Credit lines must retain their sign');
const legacy=fn({dogName:'Legacy',amount:20}).join('\n');
assert.doesNotMatch(legacy,/Direct expenses/,'Do not fabricate an itemization for old invoices');
assert.match(source,/lineItems.flatMap\(dogShowInvoiceEmailItemLines\)/);
console.log('Dog show invoice email one-dog, two-dog, credit, and legacy checks passed.');
