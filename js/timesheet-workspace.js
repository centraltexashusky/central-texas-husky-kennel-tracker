/* Presentation only. Clock, approval, schedule and payroll writes remain in timesheet.js. */
var timesheetStaffFilterValue = '';
var timesheetTimeOffFilter = 'All';

function timesheetOutlineIcon(kind) {
  const paths = {
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3"/>',
    schedule: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v5m10-5v5M3 11h18"/>',
    timeOff: '<path d="M3 12a9 9 0 0 1 18 0H3Zm9 0v7a2 2 0 0 0 4 0M12 2v1"/>',
    holidays: '<path d="M4 10h16v11H4zM3 6h18v4H3zM12 6v15M12 6C4 6 6 0 9 3l3 3c8 0 6-6 3-3Z"/>',
    review: '<path d="M5 3h10l4 4v14H5zM14 3v5h5M8 12h8m-8 4h5"/>',
    payroll: '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 10h18m-5 5h2"/>',
    timeline: '<path d="M6 3v18m0-15h13M6 12h9M6 18h13"/><circle cx="6" cy="6" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="6" cy="18" r="2"/>'
  };
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[kind] || paths.clock}</svg>`;
}

function prepareTimesheetWorkspace(records) {
  const select = document.getElementById('timesheetStaffFilter');
  const admin = currentRole() === 'admin';
  document.getElementById('timesheetClockPanel').dataset.ownEntries = String(!admin);
  document.getElementById('timesheetStaffFilterLabel').hidden = !admin;
  if (!admin) timesheetStaffFilterValue = '';
  const staff = new Map(records.map(r => [(r.helperEmail || r.helperName || '').toLowerCase(), r.helperName || r.helperEmail || 'Staff']));
  if (!staff.has(timesheetStaffFilterValue)) timesheetStaffFilterValue = '';
  select.innerHTML = '<option value="">All staff</option>' + [...staff].sort((a,b) => a[1].localeCompare(b[1])).map(([key,name]) => `<option value="${escapeHtml(key)}">${escapeHtml(name)}</option>`).join('');
  select.value = timesheetStaffFilterValue;
  select.onchange = () => { timesheetStaffFilterValue = select.value; renderTimesheet(); };
  document.querySelectorAll('[data-time-off-filter]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.timeOffFilter === timesheetTimeOffFilter));
    button.onclick = () => { timesheetTimeOffFilter = button.dataset.timeOffFilter; renderTimesheet(); };
  });
  document.querySelectorAll('#timesheetTabs button').forEach(button => {
    if (!button.querySelector('svg')) button.insertAdjacentHTML('afterbegin', timesheetOutlineIcon(button.dataset.timesheetTab));
    button.setAttribute('aria-controls', document.querySelector(`[data-timesheet-panel="${button.dataset.timesheetTab}"]`).id);
  });
}

function finishTimesheetWorkspace(records) {
  const completed = records.filter(r => r.clockInTime && r.clockOutTime);
  const metrics = [['Completed hours', sumHours(completed).toFixed(2)], ['Open entries', records.filter(r => r.clockInTime && !r.clockOutTime).length], ['Staff', new Set(records.map(r => (r.helperEmail || r.helperName || '').toLowerCase())).size]];
  document.getElementById('timesheetVisibleSummary').innerHTML = metrics.map(([label,value]) => `<div><span>${label}</span><strong>${escapeHtml(String(value))}</strong></div>`).join('');
  const labels = ['Date','Staff','Clock in','Clock out','Hours','Note','Action'];
  document.querySelectorAll('#timesheetRows tr').forEach((row,index) => {
    if (row.cells.length !== 7) return;
    [...row.cells].forEach((cell,i) => cell.dataset.label = labels[i]);
    if (records[index]?.clockInTime && !records[index].clockOutTime) {
      row.classList.add('timesheet-entry-open');
      row.cells[3].textContent = 'In progress';
      row.cells[4].textContent = '—';
    }
  });
  updateTimesheetElapsed();
}

function updateTimesheetElapsed() {
  const target = document.getElementById('timesheetElapsed');
  if (!target || typeof findOpenClockInForCurrentUser !== 'function') return;
  const open = findOpenClockInForCurrentUser();
  const start = new Date(open?.clockInTime).getTime();
  const minutes = Number.isFinite(start) ? Math.max(0, Math.floor((Date.now()-start)/60000)) : null;
  target.textContent = minutes === null ? '' : `${Math.floor(minutes/60)}h ${String(minutes%60).padStart(2,'0')}m elapsed`;
  target.closest('.timesheet-personal-clock').classList.toggle('is-clocked-in', minutes !== null);
}

function renderTimesheetMobileAgenda(shifts, dates) {
  const grid = document.getElementById('scheduleWeekGrid');
  grid.dataset.agenda = String(staffScheduleView !== 'month');
  if (staffScheduleView === 'month') return;
  const agenda = document.createElement('div');
  agenda.className = 'timesheet-mobile-agenda';
  agenda.innerHTML = dates.map(date => {
    const entries = shifts.filter(shift => shift.date === date).sort((a,b) => a.startTime.localeCompare(b.startTime));
    const holiday = holidayForDate(date);
    return `<section><h3>${escapeHtml(staffScheduleLongDateLabel(date))}</h3>${holiday ? `<p>${escapeHtml(holiday.name)}</p>` : ''}${entries.length ? entries.map(shift => `<button type="button" class="secondary-button" data-action="select-schedule-shift" data-id="${escapeHtml(shift.id)}">${timesheetOutlineIcon('clock')}<span><strong>${escapeHtml(shift.staffName || 'Staff')}</strong><small>${escapeHtml(formatShiftTime(shift))}</small><small>${escapeHtml([shift.role,shift.location].filter(Boolean).join(' · '))}</small></span><span aria-hidden="true">›</span></button>`).join('') : '<p>No shifts scheduled.</p>'}</section>`;
  }).join('');
  grid.append(agenda);
  agenda.addEventListener('click', event => {
    if (event.target.closest('[data-action="select-schedule-shift"]')) requestAnimationFrame(() => document.getElementById('staffScheduleDetailPanel').scrollIntoView({block:'start',behavior:'smooth'}));
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const publication = document.createElement('div');
  publication.className = 'timesheet-publication';
  publication.append(document.getElementById('staffSchedulePublishStatus'), document.getElementById('publishScheduleButton'));
  document.querySelector('#timesheetSchedulePanel .section-heading').append(publication);
  document.querySelector('.timesheet-calendar-picker').addEventListener('toggle', event => {
    if (event.currentTarget.open && typeof renderStaffScheduleMiniCalendar === 'function') renderStaffScheduleMiniCalendar();
  });
  // Replace decorative letters only; Dashboard sections and their loading behavior stay unchanged.
  document.querySelectorAll('#timesheetPage .section-heading > span, #dashboardPage .section-heading > span').forEach(span => {
    const panel = span.closest('[data-timesheet-panel]');
    span.innerHTML = timesheetOutlineIcon(panel?.dataset.timesheetPanel || (span.closest('#dashboardPage') ? 'timeline' : 'clock'));
    span.setAttribute('aria-hidden','true');
  });
  new MutationObserver(updateTimesheetElapsed).observe(document.getElementById('clockInDisplay'), {childList:true});
  setInterval(() => {
    if (!document.hidden && document.querySelector('#timesheetPage.is-active')) updateTimesheetElapsed();
  }, 60000);
});
