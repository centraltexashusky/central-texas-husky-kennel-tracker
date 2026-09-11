/* Our Dogs presentation only. All writes use the existing profile and care forms. */
var ownedWorkspaceMode = 'edit';
var ownedWorkspaceHistoryLimit = 30;

function ownedWorkspaceIcon(name) {
  const paths = {
    Overview: '<path d="M3 10l9-7 9 7v10H3zM9 20v-7h6v7"/>',
    Exercise: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    Training: '<path d="M5 4h14v17l-7-4-7 4zM9 9h6M9 12h4"/>',
    Baths: '<path d="M3 12h18v3a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5zM6 12V5a2 2 0 0 1 4 0M6 20v2M18 20v2"/>',
    'Heat Cycle': '<path d="M20 7a9 9 0 1 0 1 9M20 2v5h-5M12 7v5l3 2"/>',
    'Medical / Care Notes': '<path d="M4 4h16v16H4zM12 8v8M8 12h8"/>',
    Files: '<path d="M5 3h9l5 5v13H5zM14 3v6h5M8 13h8M8 17h6"/>',
    Timeline: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3"/>'
  };
  return '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || paths.Overview) + '</svg>';
}

function ownedWorkspacePhoto(dog) {
  const name = ownedDogDisplayName(dog) || 'Dog';
  const src = profilePhotoDirectSource(dog);
  return `<span class="owned-roster-photo"${profilePhotoAccessAttrs(dog, 'ownedDog')}><img${src ? ` src="${escapeHtml(src)}"` : ' hidden'} alt="" loading="lazy" /><span data-profile-photo-initials${src ? ' hidden' : ''}>${escapeHtml(avatarText(name))}</span></span>`;
}

function ownedWorkspaceNextCare(dog) {
  return [dog.nextBath && `Bath · ${dog.nextBath}`, dog.nextTrainingDate && `Training · ${dog.nextTrainingDate}`].filter(Boolean).join(' / ') || 'See care routines';
}

function ownedWorkspaceCell(column, dog) {
  if (column.key === 'callName') return `<div class="owned-roster-identity">${ownedWorkspacePhoto(dog)}<div><strong>${escapeHtml(ownedDogDisplayName(dog))}</strong><small>${escapeHtml(dog.sex || 'Sex not set')}</small></div></div>`;
  if (column.key === 'careStatus') return ownedDogCareTagsHtml(dog);
  if (column.key === 'nextCare') return escapeHtml(ownedWorkspaceNextCare(dog));
  return escapeHtml(column.value(dog) || '—');
}

function ownedWorkspaceMobileCard(dog) {
  return `<article class="owned-modern-card" data-id="${escapeHtml(dog.id)}">
    <div class="owned-roster-identity">${ownedWorkspacePhoto(dog)}<div><strong>${escapeHtml(ownedDogDisplayName(dog))}</strong><small>${escapeHtml(dog.sex || '')}</small></div></div>
    ${ownedDogCareTagsHtml(dog)}
    ${ownedDogCareAlertNotes(dog) ? `<p class="owned-care-warning">${escapeHtml(ownedDogCareAlertNotes(dog))}</p>` : ''}
    <dl class="owned-card-facts"><div><dt>Next care</dt><dd>${escapeHtml(ownedWorkspaceNextCare(dog))}</dd></div><div><dt>Food</dt><dd>${escapeHtml(dog.foodAmount || 'Not specified')}</dd></div></dl>
    <div class="owned-card-actions"><button type="button" class="secondary-button" data-action="view-owned" data-id="${escapeHtml(dog.id)}">View</button><button type="button" data-action="log-owned-care" data-id="${escapeHtml(dog.id)}">Log Care</button></div>
  </article>`;
}

function setupOwnedWorkspace(record) {
  const modal = document.getElementById('ownedDogDetail');
  modal.classList.add('owned-workspace');
  modal.setAttribute('aria-labelledby', 'ownedDogPhotoName');
  ownedWorkspaceMode = 'edit';
  ownedWorkspaceHistoryLimit = 30;
  if (!document.getElementById('ownedWorkspaceReadPanel')) {
    const panel = document.createElement('section');
    panel.id = 'ownedWorkspaceReadPanel';
    panel.hidden = true;
    document.getElementById('ourDogForm').append(panel);
    const actions = document.createElement('div');
    actions.className = 'owned-workspace-actions';
    actions.innerHTML = '<button type="button" class="secondary-button" data-owned-workspace-action="edit">Edit Profile</button><button type="button" data-owned-workspace-action="care">Log Care</button>';
    modal.querySelector('.dog-profile-editor').append(actions);
    const meta = document.createElement('p');
    meta.id = 'ownedWorkspaceMeta';
    document.getElementById('ownedDogPhotoName').after(meta);
    const nav = document.getElementById('ownedDogProfileTabs');
    nav.setAttribute('role', 'tablist');
    nav.querySelectorAll('[data-owned-profile-tab]').forEach((button, index) => {
      const name = button.dataset.ownedProfileTab;
      button.innerHTML = ownedWorkspaceIcon(name) + '<span>' + escapeHtml(name) + '</span>';
      button.setAttribute('role', 'tab');
      button.id = 'owned-workspace-tab-' + index;
      if ([0, 4, 6].includes(index)) {
        const heading = document.createElement('span');
        heading.className = 'owned-nav-group';
        heading.textContent = {0:'DAILY CARE',4:'HEALTH',6:'RECORDS'}[index];
        button.before(heading);
      }
    });
    modal.addEventListener('click', event => {
      if (event.target.closest('#ownedDogPhotoPicker') && ownedWorkspaceMode === 'view') {
        editOwnedWorkspace();
      }
      const button = event.target.closest('[data-owned-workspace-action]');
      if (!button) return;
      const action = button.dataset.ownedWorkspaceAction;
      if (action === 'edit') {
        editOwnedWorkspace();
      } else if (action === 'care') openOwnedWorkspaceCare(activeOwnedDog());
      else if (action === 'more-history') {
        ownedWorkspaceHistoryLimit += 30;
        refreshOwnedWorkspace();
      } else if (action === 'quick') openDashboardQuickCare(activeOwnedDog()?.id, button.dataset.careType);
    });
    nav.addEventListener('keydown', event => {
      if (!['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      const buttons = [...nav.querySelectorAll('[role="tab"]:not(:disabled)')];
      const index = buttons.indexOf(document.activeElement);
      if (index < 0) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (['ArrowDown','ArrowRight'].includes(event.key) ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next].click(); buttons[next].focus();
    });
  }
  document.getElementById('ownedWorkspaceMeta').textContent = [record.sex, record.dateOfBirth && 'Born ' + record.dateOfBirth].filter(Boolean).join(' · ');
  modal.querySelector('.owned-workspace-actions').hidden = !record.id;
  refreshOwnedWorkspace();
}

function openOwnedWorkspace(record, tab = 'Overview') {
  openOwnedDog(record);
  ownedWorkspaceMode = 'view';
  setOwnedDogActiveTab(tab);
}

function editOwnedWorkspace() {
  // Care can be logged from the read view. Start editing from the latest record,
  // not the form snapshot taken before that care was saved.
  if (ownedWorkspaceMode === 'view') {
    const dog = normalizeOwnedDogCare(activeOwnedDog() || {});
    setFormValues(document.getElementById('ourDogForm'), dog);
    document.getElementById('ourDogForm').elements.medicalCareNotes.value = ownedDogCareAlertNotes(dog);
    syncOwnedDogTabAvailability(dog);
  }
  ownedWorkspaceMode = 'edit';
  refreshOwnedWorkspace();
}

function ownedWorkspaceFacts(dog, fields) {
  return '<dl class="owned-workspace-facts">' + fields.map(([label, key]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(dog[key] === 0 ? '0 (no reminder)' : dog[key] || 'Not specified')}</dd></div>`).join('') + '</dl>';
}

function ownedWorkspaceTimeline(dog, filter) {
  const logs = ownedDogActivityLogs(dog).filter(log => filter === 'All' || filter === log.group || filter === log.type);
  return logs.length ? logs.slice(0, ownedWorkspaceHistoryLimit).map(log => ownedDogActivityLogCardHtml(log, {removable:true})).join('') + (logs.length > ownedWorkspaceHistoryLimit ? '<button type="button" class="secondary-button" data-owned-workspace-action="more-history">Load more history</button>' : '') : '<p>No matching activity recorded yet.</p>';
}

function ownedWorkspaceHistory(dog, tab) {
  const groups = {Exercise:'Exercise',Training:'Training',Baths:'Bath', 'Heat Cycle':'Heat','Medical / Care Notes':'Medical/Care'};
  const logs = ownedDogActivityLogs(dog).filter(log => !groups[tab] || log.group === groups[tab]);
  return `<section class="owned-workspace-history"><h3>Recent ${tab === 'Overview' ? 'activity' : 'history'}</h3>${logs.length ? logs.slice(0, ownedWorkspaceHistoryLimit).map(log => ownedDogActivityLogCardHtml(log)).join('') : '<p>No entries recorded yet.</p>'}${logs.length > ownedWorkspaceHistoryLimit ? '<button type="button" class="secondary-button" data-owned-workspace-action="more-history">Load more history</button>' : ''}</section>`;
}

function ownedWorkspaceReadHtml(dog, tab) {
  const facts = (fields) => ownedWorkspaceFacts(dog, fields);
  const quick = (type, label = 'Log ' + type) => `<button type="button" data-owned-workspace-action="quick" data-care-type="${escapeHtml(type)}">${escapeHtml(label)}</button>`;
  let content = '';
  if (tab === 'Overview') {
    content = `${ownedDogCareTagsHtml(dog)}${ownedDogCareAlertNotes(dog) ? `<p class="owned-care-warning">${escapeHtml(ownedDogCareAlertNotes(dog))}</p>` : ''}
    ${facts([['Show name','showName'],['Sex','sex'],['Date of birth','dateOfBirth'],['Spayed / neutered','spayNeuterStatus']])}
    <h3>Feeding</h3><p>${escapeHtml(dog.foodAmount || 'No feeding instructions saved.')}</p>
    <h3>Vaccinations & preventive care</h3>${facts([['Rabies · last','rabiesDate'],['Rabies · next','nextRabiesDate'],['DHPP · last','dhppDate'],['DHPP · next','nextDhppDate'],['Bordetella · last','bordetellaDate'],['Bordetella · next','nextBordetellaDate'],['Heartworm · last','heartwormDate'],['Leptospirosis · last','leptospirosisDate']])}
    <details><summary>Identification & parentage</summary>${facts([['AKC registration','akcRegistrationNumber'],['Microchip','microchipNumber'],['Sire','sireName'],['Dam','damName']])}</details><h3>General notes</h3><p>${escapeHtml(dog.notes || 'No general notes.')}</p>`;
  } else if (tab === 'Exercise') content = facts([['Routine','exerciseRoutine'],['Frequency (days)','exerciseFrequencyDays'],['Last exercise','lastExerciseDate'],['Notes','exerciseNotes']]) + '<div class="owned-inline-actions">' + ['Treadmill','Scooter','Yard Run'].map(type => quick(type)).join('') + '</div>';
  else if (tab === 'Training') content = facts([['Routine','trainingRoutine'],['Frequency (days)','trainingFrequencyDays'],['Last training','lastTrainingDate'],['Next session','nextTrainingDate'],['Goals','trainingGoals'],['Session notes','trainingSessionNotes']]) + quick('Training', 'Add Training Entry');
  else if (tab === 'Baths') content = facts([['Last bath','lastBath'],['Next bath','nextBath'],['Interval (days)','bathIntervalDays'],['Routine','bathRoutine'],['Products','bathProducts'],['Coat notes','coatNotes']]) + quick('Bath', 'Log Bath');
  else if (tab === 'Heat Cycle') content = '<p class="owned-care-warning">Next heat dates are estimates, not confirmed cycles.</p>' + facts([['Status','heatCycleStatus'],['Last heat','lastHeat'],['Estimated next heat','nextHeat'],['Cycle length (days)','heatCycleLengthDays'],['Summary','heatCycle'],['Notes','heatCycleNotes']]) + quick('Heat Note');
  else if (tab === 'Medical / Care Notes') content = `<p class="owned-care-warning">${escapeHtml(ownedDogCareAlertNotes(dog) || 'No current medical or care alerts.')}</p>` + quick('Medical/Behavior Note', 'Add Care Note');
  if (tab !== 'Overview') content += ownedWorkspaceHistory(dog, tab);
  return `<div class="owned-read-heading"><h2>${escapeHtml(tab)}</h2><p>Care details and records for ${escapeHtml(ownedDogDisplayName(dog))}.</p></div>${content}`;
}

function refreshOwnedWorkspace() {
  const modal = document.getElementById('ownedDogDetail');
  if (!modal?.classList.contains('owned-workspace') || modal.hidden) return;
  const tab = modal.querySelector('[data-owned-profile-tab].is-active')?.dataset.ownedProfileTab || 'Overview';
  const read = ownedWorkspaceMode === 'view';
  modal.dataset.mode = ownedWorkspaceMode;
  const panel = document.getElementById('ownedWorkspaceReadPanel');
  const native = !read || ['Files','Timeline'].includes(tab);
  modal.querySelectorAll('.owned-profile-section').forEach(section => {
    section.hidden = !native || section.dataset.ownedProfileSection !== tab;
    section.setAttribute('role', 'tabpanel');
  });
  modal.querySelectorAll('[data-owned-profile-tab]').forEach(button => {
    const selected = button.dataset.ownedProfileTab === tab;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
    const section = [...modal.querySelectorAll('.owned-profile-section')].find(item => item.dataset.ownedProfileSection === button.dataset.ownedProfileTab);
    if (section) {
      section.id ||= button.id + '-panel';
      section.setAttribute('aria-labelledby', button.id);
      button.setAttribute('aria-controls', selected && !native ? panel.id : section.id);
    }
  });
  panel.hidden = native;
  if (!native) {
    panel.setAttribute('role','tabpanel');
    panel.setAttribute('aria-labelledby', modal.querySelector('[data-owned-profile-tab].is-active').id);
    panel.innerHTML = ownedWorkspaceReadHtml(activeOwnedDog() || {}, tab);
    hydrateProfilePhotoElements(panel);
  } else panel.innerHTML = '';
  const dog = activeOwnedDog();
  if (dog && tab === 'Files') renderOwnedDogFiles(dog);
  if (dog && tab === 'Timeline') renderOwnedActivity(dog);
  modal.querySelector('.owned-dog-submit-row').hidden = read;
}

function openOwnedWorkspaceCare(dog) {
  if (!dog?.id) return;
  const types = ['Treadmill','Scooter','Yard Run','Training','Bath','Medical/Behavior Note', ...(dog.sex === 'Female' ? ['Heat Note'] : [])];
  showDetailDialog('Log Care · ' + ownedDogDisplayName(dog), `<p>Choose the care completed. Your existing routines and records stay in one place.</p><div class="owned-care-picker">${types.map(type => `<button type="button" class="secondary-button" data-owned-care-choice="${escapeHtml(type)}" data-id="${escapeHtml(dog.id)}">${escapeHtml(type)}</button>`).join('')}</div>`);
}

document.addEventListener('click', event => {
  const choice = event.target.closest('[data-owned-care-choice]');
  if (choice) openDashboardQuickCare(choice.dataset.id, choice.dataset.ownedCareChoice);
  const columns = event.target.closest('#ownedColumnsButton');
  if (columns) {
    const panel = document.getElementById('ownedDogColumnManager');
    panel.hidden = !panel.hidden;
    columns.setAttribute('aria-expanded', String(!panel.hidden));
  }
});
matchMedia('(max-width: 760px)').addEventListener('change', () => {
  if (typeof activePageId === 'function' && activePageId() === 'ourDogsPage' && typeof renderOwnedDogs === 'function') renderOwnedDogs();
});
