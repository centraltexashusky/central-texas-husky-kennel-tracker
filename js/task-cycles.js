/* Task-tab recurrence. Completion events keep their actual work dates. */
function isTaskCycleDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
}
function normalizeTaskCycle(value = {}) {
  const frequency = ['daily','weekly','monthly','days'].includes(value.frequency) ? value.frequency : 'daily';
  const start = isTaskCycleDate(value.start) ? value.start : '1970-01-01';
  return {frequency,start,days:Math.min(365,Math.max(1,Math.floor(Number(value.days) || 1)))};
}

function taskCycleWindow(tabId, date, config = readTaskConfig()) {
  const cycle = normalizeTaskCycle(config._tabSettings?.[tabId]?.cycle);
  if (date < cycle.start) return {start:cycle.start,next:cycle.start,label:'Starts ' + cycle.start,active:false};
  if (cycle.frequency === 'daily') return {start:date,next:addDays(date,1),label:'Resets daily',active:true};
  let start,next;
  if (cycle.frequency === 'monthly') {
    const day=Number(cycle.start.slice(8,10));
    const monthDate=(y,m)=>new Date(Date.UTC(y,m,Math.min(day,new Date(Date.UTC(y,m+1,0)).getUTCDate()))).toISOString().slice(0,10);
    const y=Number(date.slice(0,4)),m=Number(date.slice(5,7))-1;
    start=monthDate(y,m);
    if(start>date)start=monthDate(y,m-1);
    const sy=Number(start.slice(0,4)),sm=Number(start.slice(5,7))-1;
    next=monthDate(sy,sm+1);
  } else {
    const interval=cycle.frequency==='weekly'?7:cycle.days;
    const elapsed=Math.floor((Date.parse(date)-Date.parse(cycle.start))/86400000);
    start=addDays(cycle.start,Math.floor(elapsed/interval)*interval);next=addDays(start,interval);
  }
  return {start,next,active:true,label:cycle.frequency==='monthly'?'Resets monthly':cycle.frequency==='weekly'?'Resets weekly':'Resets every '+cycle.days+' days'};
}

function taskCycleSettingsForm(tab = {}) {
  const cycle=normalizeTaskCycle(readTaskConfig()._tabSettings?.[tab.id]?.cycle || {start:currentDailyDate()});
  return `<form id="taskTabForm" class="tracker-form" data-tab-id="${escapeHtml(tab.id || '')}">
    <label>Tab name<input type="text" name="label" required maxlength="80" value="${escapeHtml(tab.label || '')}" /></label>
    <label>Description<textarea name="description" rows="2">${escapeHtml(tab.description || '')}</textarea></label>
    <label>Reset schedule<select name="frequency">${[['daily','Daily'],['weekly','Weekly'],['monthly','Monthly'],['days','Every number of days']].map(([v,l])=>`<option value="${v}"${cycle.frequency===v?' selected':''}>${l}</option>`).join('')}</select></label>
    <label data-cycle-days${cycle.frequency==='days'?'':' hidden'}>Number of days<input name="days" type="number" min="1" max="365" step="1" value="${cycle.days}" required /></label>
    <label>First cycle starts<input name="start" type="date" value="${cycle.start}" required /></label>
    <p id="taskCycleHelp">${taskCycleHelp(cycle.frequency)}</p>
    <p>Completed tasks return at the next reset. Unfinished tasks stay available. Completion history is kept.</p>
    <div class="button-row"><button type="submit">${tab.id?'Save tab settings':'Add Tab'}</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>
  </form>`;
}

function taskCycleCompletions(date, config) {
  const recurring = new Map(taskTabMeta(config).filter(tab=>normalizeTaskCycle(config._tabSettings?.[tab.id]?.cycle).frequency!=='daily').map(tab=>[tab.id,taskCycleWindow(tab.id,date,config)]));
  const result=completedTasksForDate(date).filter(c=>!recurring.has(c.shift));
  const append=(completion,workDate)=>{
    const cycle=recurring.get(completion.shift);
    if(cycle?.active && workDate>=cycle.start && workDate<=date)result.push({...completion,date:workDate});
  };
  readRecords('dailyTask').filter(r=>!r.removed).forEach(r=>completedTasksForRecord(r).forEach(c=>append(c,dateOnly(c.date || dailySubmissionDate(r)))));
  readRecords('dailyTaskCompletion').filter(r=>!r.removed).forEach(c=>append(c,dateOnly(c.date || c.workDate)));
  return result.sort((a,b)=>String(a.completedAt||'').localeCompare(String(b.completedAt||'')));
}

async function fetchTaskCycleCompletionRows(db, config, date) {
  const tabs=taskTabMeta(config).filter(tab=>normalizeTaskCycle(config._tabSettings?.[tab.id]?.cycle).frequency!=='daily');
  if(!tabs.length)return [];
  const start=tabs.map(tab=>taskCycleWindow(tab.id,date,config).start).sort()[0];
  if(start>date)return [];
  const rows=[];
  for(let offset=0;;offset+=500){
    const {data,error}=await db.from('daily_task_completions').select('*').gte('work_date',start).lte('work_date',date).in('shift',tabs.map(tab=>tab.id)).order('work_date').order('id').range(offset,offset+499);
    if(error)throw error;
    rows.push(...(data||[]));if((data||[]).length<500)break;
  }
  return rows;
}

async function ensureTaskCycleReady(tabId, date) {
  const config = readTaskConfig();
  if (!taskCycleWindow(tabId,date,config).active) {
    showToast('This task group starts on ' + taskCycleWindow(tabId,date,config).start + '.');
    return false;
  }
  if (normalizeTaskCycle(config._tabSettings?.[tabId]?.cycle).frequency === 'daily' || localTestMode) return true;
  if (!supabaseClient) throw new Error('Connect to the server first.');
  const scope = syncMetaScopeKey();
  const rows = await withTimeout(cuddleStayRequest(db=>fetchTaskCycleCompletionRows(db,config,date)),10000,'Task cycle history');
  if (scope !== syncMetaScopeKey() || date !== currentDailyDate()) return false;
  mergeDailyTaskCompletionRecords(rows,{replaceLocal:false});
  return true;
}

function taskCycleHelp(frequency) {
  return {daily:'Resets each day, starting on the selected date.',weekly:'Resets every week on the weekday of the selected start date.',monthly:'Resets on the same day each month, or the last day in shorter months.',days:'Resets every N days from the start date, not from the completion date.'}[frequency];
}
document.addEventListener('change',event=>{
  if(event.target.matches('#taskTabForm [name="frequency"]')) {
    document.querySelector('#taskTabForm [data-cycle-days]').hidden=event.target.value!=='days';
    document.getElementById('taskCycleHelp').textContent=taskCycleHelp(event.target.value);
  }
});
