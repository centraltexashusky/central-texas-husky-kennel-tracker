import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1366,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000);
await page.route('**/*.supabase.co/**',r=>r.abort());
try {
  await page.goto('http://127.0.0.1:8765/?localTest=1&email=qa@example.invalid&role=admin#dailyPage');
  await page.waitForFunction(()=>typeof renderDailyTaskLists==='function' && typeof taskCycleWindow==='function' && localTestMode);
  await page.evaluate(()=>{if(supabaseClient)throw Error('Not isolated');document.querySelector('#detailDialog')?.close();});
  await page.locator('#dailyAddTab').click();
  const form=page.locator('#taskTabForm');
  await form.locator('[name=label]').fill('QA Every 3 Days');
  await form.locator('[name=frequency]').selectOption('days');
  await form.locator('[name=days]').fill('3');
  await form.locator('[name=start]').fill('2026-09-14');
  await form.locator('button[type=submit]').click();
  await page.waitForFunction(()=>taskTabMeta().some(t=>t.label==='QA Every 3 Days'));
  await page.evaluate(()=>document.querySelector('#detailDialog')?.close());
  const id=await page.evaluate(()=>taskTabMeta().find(t=>t.label==='QA Every 3 Days').id);
  // Seed one isolated task; all settings and completion actions use the UI.
  await page.evaluate(id=>{const c=readTaskConfig();c[id]=[{id:'qa-cycle-task',text:'QA disinfect equipment'}];writeTaskConfig(c,{syncRemote:false});dailyTaskTab=id;renderDailyTaskLists();},id);
  await page.locator('#dailyTabSettings').click();
  assert.equal(await form.locator('[name=frequency]').inputValue(),'days');
  await page.screenshot({path:'/tmp/task-cycle-settings-desktop.png'});
  await form.locator('[name=label]').fill('QA Reset Group');
  await form.locator('button[type=submit]').click();
  await page.waitForFunction(()=>taskTabMeta().some(t=>t.label==='QA Reset Group'));
  await page.evaluate(()=>document.querySelector('#detailDialog')?.close());
  assert.equal(await page.evaluate(id=>readTaskConfig()[id][0].id,id),'qa-cycle-task');
  const setDate=async date=>{await page.evaluate(date=>{form.elements.date.value=date;renderDailyTaskLists();},date);};
  await setDate('2026-09-14');
  await page.locator(`.task-done-button[data-id="qa-cycle-task"]`).click();
  await page.waitForFunction(()=>dailyTaskCompletionIndex().size>0);
  await setDate('2026-09-16');
  assert.equal(await page.locator('.task-done-button[data-id="qa-cycle-task"]').count(),0,'Completed task stays hidden during cycle');
  await setDate('2026-09-17');
  assert(await page.locator('.task-done-button[data-id="qa-cycle-task"]').isEnabled(),'Task returns at next cycle');
  assert.equal(await page.evaluate(()=>completedTasksForDate('2026-09-14').length),1,'Original work-date history retained');
  await page.reload();await page.waitForFunction(()=>typeof taskCycleWindow==='function' && typeof renderDailyTaskLists==='function');
  await page.evaluate(id=>{document.querySelector('#detailDialog')?.close();dailyTaskTab=id;renderDailyTaskLists();},id);
  assert.equal(await page.evaluate(id=>readTaskConfig()._tabSettings[id].cycle.days,id),3);
  await page.setViewportSize({width:390,height:844});
  await page.locator('#dailyTabSettings').click();
  for(const frequency of ['daily','weekly','monthly','days']){
    await form.locator('[name=frequency]').selectOption(frequency);
    assert.equal(await form.locator('[data-cycle-days]').isVisible(),frequency==='days');
  }
  await page.screenshot({path:'/tmp/task-cycle-settings-mobile.png'});
  await page.locator('#detailDialog [data-action="close-dialog"]').click();
  await page.screenshot({path:'/tmp/task-cycle-queue-mobile.png',fullPage:true});
  assert(await page.locator('#dailyPage').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
  await page.evaluate(()=>{currentUser={...currentUser,role:'staff'};renderDailyTaskLists();});
  assert(!await page.locator('#dailyAddTab').isVisible());assert(!await page.locator('#dailyTabSettings').isVisible());
  assert.deepEqual(errors,[]);
  console.log('PASS task tab creation/edit, preserved IDs, custom cycle completion/reset/history, reload persistence, schedule choices, mobile, staff permissions, no runtime errors.');
}finally{await page.evaluate(()=>localStorage.clear()).catch(()=>{});await browser.close();}
