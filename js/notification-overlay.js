/* Keep existing notification rendering and read actions inside a floating surface. */
(() => {
  const panel = document.getElementById('notificationPanel');
  const bell = document.getElementById('notificationBellButton');
  if (!panel || !bell) return;
  const overlay = document.createElement('dialog');
  overlay.id = 'notificationOverlay';
  overlay.setAttribute('aria-labelledby', 'notificationPanelTitle');
  document.body.append(overlay);
  overlay.append(panel);
  bell.setAttribute('aria-controls', overlay.id);
  bell.setAttribute('aria-haspopup', 'dialog');
  let skipBreakpointClose = false;
  const phone = window.matchMedia('(max-width: 700px)');
  const close = () => {
    panel.hidden = true;
    if (overlay.open) overlay.close();
    bell.setAttribute('aria-expanded', 'false');
    if (typeof renderNotifications === 'function') renderNotifications();
  };
  const sync = () => {
    bell.setAttribute('aria-expanded', String(!panel.hidden));
    if (panel.hidden) { if (overlay.open) overlay.close(); return; }
    if (!overlay.open) { if (phone.matches) overlay.showModal(); else overlay.show(); }
  };
  new MutationObserver(sync).observe(panel, {attributes:true, attributeFilter:['hidden']});
  document.getElementById('closeNotificationPanelButton')?.addEventListener('click', close);
  overlay.addEventListener('cancel', event => { event.preventDefault(); close(); });
  overlay.addEventListener('close', () => { if (skipBreakpointClose) {skipBreakpointClose=false;return;} if (!panel.hidden) close(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && overlay.open) { event.preventDefault(); close(); bell.focus(); }
  });
  document.addEventListener('click', event => {
    if (overlay.open && !panel.contains(event.target) && !bell.contains(event.target)) close();
  });
  phone.addEventListener('change', () => {
    if (!overlay.open) return;
    skipBreakpointClose = true;
    overlay.close();
    // A breakpoint change must not discard the open panel.
    panel.hidden = false;
    sync();
  });
  sync();
})();
