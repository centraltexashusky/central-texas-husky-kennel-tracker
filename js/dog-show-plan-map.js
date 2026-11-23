const MAP_ASSET = new URL("../assets/show-plan-map.json?v=2026-11-city-v2", import.meta.url);
const FULL_MAP = [0, 0, 900, 540];
const INSETS = [["AK", 20, 535], ["HI", 207, 535], ["PR", 790, 535]];
const SMALL_STATES = new Set(["CT", "DC", "DE", "MA", "MD", "NH", "NJ", "RI", "VT"]);

export const showPlanStages = new Map([
  ["Active", "Active"], ["Going", "Booked"], ["Going To", "Planning"],
  ["Potential Plan", "Potential"], ["Completed", "Completed"],
]);

export function canRemoveFromShowPlan(stage) {
  return stage === "Going To" || stage === "Going" || stage === "Potential Plan";
}

function placeKey(value) {
  return value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function locateShowOnMap(show, geography) {
  const { states, cities, zips } = geography;
  const research = show.plannerMetadata || {};
  const labels = [
    [show.cityState, "city"], [show.venueAddress, "address"],
    [research.cityState, "city"], [research.venueAddress, "address"], [show.venue, "venue"],
  ].map(([value, kind]) => [String(value || "").trim(), kind]).filter(([value]) => value);
  const names = Object.entries(states).sort(([, a], [, b]) => b.name.length - a.name.length);
  const explicitState = String(show.state || research.state || "").trim();
  const explicitCode = Object.hasOwn(states, explicitState.toUpperCase()) ? explicitState.toUpperCase()
    : names.find(([, area]) => area.name.toLowerCase() === explicitState.toLowerCase())?.[0];
  let fallback;
  for (const [label, kind] of labels) {
    const address = label.replace(/[,\s]+(?:United States(?: of America)?|USA|US)\.?$/i, "").trim();
    const zipMatch = address.match(/(?:^|[\s,])(\d{5})(?:-\d{4})?\s*$/);
    const withoutZip = (zipMatch ? address.slice(0, zipMatch.index) : address).trim().replace(/[,\s]+$/, "");
    const codeMatch = withoutZip.match(/(?:^|[\s,])([a-z]{2})$/i);
    const code = codeMatch?.[1].toUpperCase();
    const fullState = names.find(([, state]) => {
      const upper = withoutZip.toUpperCase();
      const name = state.name.toUpperCase();
      return upper === name || upper.endsWith(" " + name) || upper.endsWith("," + name);
    });
    const [stateCode, cityText] = Object.hasOwn(states, code)
      ? [code, withoutZip.slice(0, codeMatch.index)]
      : fullState
      ? [fullState[0], withoutZip.slice(0, -fullState[1].name.length)]
      : [kind === "venue" ? "" : fallback || explicitCode, withoutZip];
    if (!stateCode || (fallback && stateCode !== fallback)) continue;

    const words = cityText.split(/[\s,]+/).filter(Boolean);
    const stateCities = cities[stateCode] || {};
    const hasStreet = kind === "address" && /\d/.test(cityText);
    const attempts = hasStreet ? words.length : Math.min(words.length, 1);
    for (let offset = 0; offset < attempts; offset += 1) {
      const city = stateCities[placeKey(words.slice(offset).join(" "))];
      if (city) return { state: stateCode, point: city.slice(1), label: city[0] + ", " + stateCode, precision: "City" };
    }

    const zip = zipMatch?.[1];
    const point = zip && zips[zip];
    const { bounds } = states[stateCode];
    if (point && point[0] >= bounds[0] - 5 && point[0] <= bounds[2] + 5
      && point[1] >= bounds[1] - 5 && point[1] <= bounds[3] + 5) {
      return { state: stateCode, point, label: stateCode + " " + zip, precision: "ZIP area" };
    }
    fallback ||= stateCode;
  }

  const stateCode = fallback || explicitCode;
  return stateCode
    ? { state: stateCode, point: states[stateCode].point, label: states[stateCode].name, precision: "State only" }
    : { state: "", point: null, label: labels[0]?.[0] || "No location saved", precision: "Unmapped" };
}

function mapViewBox(state) {
  if (!state) return FULL_MAP;
  const [left, top, right, bottom] = state.bounds;
  const width = Math.max(130, right - left + 48, (bottom - top + 42) * 5 / 3);
  const height = width * 3 / 5;
  return [(left + right - width) / 2, (top + bottom - height) / 2, width, height];
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export function zoomShowMap(base, view, scale, x = 0.5, y = 0.5) {
  const width = clamp(view[2] / scale, base[2] / 8, base[2]);
  const height = width * 3 / 5;
  return panShowMap(base, [view[0] + (view[2] - width) * x, view[1] + (view[3] - height) * y, width, height], 0, 0);
}

export function panShowMap(base, view, dx, dy) {
  return [
    clamp(view[0] + dx, base[0], base[0] + base[2] - view[2]),
    clamp(view[1] + dy, base[1], base[1] + base[3] - view[3]),
    view[2], view[3],
  ];
}

function mapClusters(entries, viewBox, pixelWidth, spacing) {
  const [left, top, width, height] = viewBox;
  const clusters = [];
  for (const entry of entries) {
    if (!entry.location.point) continue;
    const [x, y] = entry.location.point;
    const xPercent = (x - left) / width * 100;
    const yPercent = (y - top) / height * 100;
    if (xPercent < 0 || xPercent > 100 || yPercent < 0 || yPercent > 100) continue;
    let cluster = clusters.find(group => Math.hypot(group.x - xPercent, (group.y - yPercent) * 0.6) / 100 * pixelWidth < spacing);
    if (!cluster) {
      cluster = { x: xPercent, y: yPercent, entries: [] };
      clusters.push(cluster);
    }
    cluster.entries.push(entry);
  }
  return clusters;
}

export function createDogShowPlanMap({ escapeHtml, readEntries, ownerKey, reviewSelection, openShow }) {
  let owner = "";
  let open = false;
  let stage = "all";
  let state = "all";
  let selected = new Set();
  let geography;
  let loading;
  let loadError = false;
  let groups = [];
  let mapEntries = [];
  let view;
  let drag;
  let previewTimer;
  let previewPinned = false;

  function syncOwner() {
    const key = ownerKey();
    if (key === owner) return;
    owner = key;
    open = false;
    stage = state = "all";
    view = drag = null;
    previewPinned = false;
    selected = new Set();
  }

  function addSelection(ids) {
    const allSelected = ids.every(id => selected.has(id));
    ids.forEach(id => allSelected ? selected.delete(id) : selected.add(id));
  }

  function currentEntries() {
    const entries = readEntries();
    const removable = new Set(entries.filter(entry => entry.removable).map(entry => entry.id));
    selected.forEach(id => {
      if (!removable.has(id)) selected.delete(id);
    });
    return entries;
  }

  function mapHtml() {
    const paths = Object.entries(geography.states).map(([code, area]) => {
      if (geography.states[state] && code !== state
        && (INSETS.some(([inset]) => inset === state) || INSETS.some(([inset]) => inset === code))) return "";
      return '<path class="' + (code === state ? 'is-current' : '') + '" d="' + area.path + '"/>';
    }).join("");
    const labels = Object.entries(geography.states).map(([code, area]) => {
      if (geography.states[state] ? code !== state : SMALL_STATES.has(code) || INSETS.some(([inset]) => inset === code)) return "";
      return '<text x="' + area.point[0] + '" y="' + area.point[1] + '">' + code + '</text>';
    }).join("");
    const insets = geography.states[state] ? "" : INSETS.map(([label, x, y]) =>
      '<text class="show-map-inset" x="' + x + '" y="' + y + '">' + label + '</text>').join("");
    return '<div class="show-map-navigation">'
      + '<span id="dogShowMapInstructions">Zoom in to separate nearby pins. Drag to pan.<span class="sr-only"> When the map is focused, use the arrow keys to pan and plus or minus to zoom.</span></span>'
      + '<div role="group" aria-label="Map zoom controls">'
      + '<button type="button" class="secondary-button" data-map-action="zoom-out" aria-label="Zoom out">−</button>'
      + '<button type="button" class="secondary-button" data-map-action="zoom-in" aria-label="Zoom in">+</button>'
      + '<button type="button" class="secondary-button" data-map-action="reset-view">Reset view</button></div></div>'
      + '<div class="show-map-region"><div class="show-map-canvas" tabindex="0" role="group" aria-label="Show location map" aria-describedby="dogShowMapInstructions">'
      + '<svg aria-hidden="true">' + paths + labels + insets + '</svg><div class="show-map-markers"></div></div>'
      + '<section class="show-map-preview" id="dogShowMapPreview" aria-labelledby="dogShowMapPreviewTitle" hidden></section></div>';
  }

  function markerButtons() {
    return groups.map((group, index) =>
      '<button type="button" class="show-map-marker"'
      + ' style="--pin-x:' + group.x.toFixed(2) + '%;--pin-y:' + group.y.toFixed(2) + '%"'
      + ' data-map-action="pin" data-map-index="' + index + '" data-map-focus="pin-' + index
      + '" aria-controls="dogShowMapPreview" aria-expanded="false">' + group.entries.length + '</button>'
    ).join("");
  }

  function updateMarker(marker) {
    const group = groups[Number(marker.dataset.mapIndex)];
    const removable = group.entries.filter(entry => entry.removable);
    const selectedCount = removable.filter(entry => selected.has(entry.id)).length;
    const allSelected = removable.length > 0 && selectedCount === removable.length;
    const locations = [...new Set(group.entries.map(entry => entry.location.label))];
    const directSelect = group.entries.length === 1 && removable.length === 1;
    const action = directSelect ? (allSelected ? "Deselect " : "Select ") : "View ";
    const count = group.entries.length;
    marker.classList.toggle("is-readonly", !removable.length);
    marker.classList.toggle("is-selected", allSelected);
    marker.classList.toggle("is-partial", !allSelected && selectedCount > 0);
    marker.setAttribute("aria-label", action + count + (count === 1 ? " show near " : " shows near ") + locations.join(" · "));
    if (directSelect) marker.setAttribute("aria-pressed", String(allSelected));
  }

  function updateSelection(root) {
    const removable = mapEntries.filter(entry => entry.removable);
    const visibleSelected = removable.filter(entry => selected.has(entry.id)).length;
    const visibleButton = root.querySelector('[data-map-action="visible"]');
    visibleButton.disabled = !removable.length;
    visibleButton.textContent = removable.length && visibleSelected === removable.length ? "Deselect visible" : "Select visible";
    root.querySelector('[data-map-action="clear"]').disabled = !selected.size;
    const reviewButton = root.querySelector('[data-map-action="review"]');
    reviewButton.disabled = !selected.size || reviewButton.getAttribute("aria-busy") === "true";
    const selectionStatus = root.querySelector(".show-map-selection");
    const message = selected.size + " selected"
      + (selected.size > visibleSelected ? " · " + (selected.size - visibleSelected) + " outside these filters" : "");
    if (selectionStatus.textContent !== message) selectionStatus.textContent = message;
    root.querySelectorAll("[data-map-show]").forEach(input => { input.checked = selected.has(input.dataset.mapShow); });
    root.querySelectorAll(".show-map-marker").forEach(updateMarker);
    const bulkHere = root.querySelector('.show-map-preview:not([hidden]) [data-map-action="select-here"]');
    if (bulkHere) {
      const index = Number(bulkHere.closest(".show-map-preview").dataset.mapIndex);
      const allHere = groups[index].entries.filter(entry => entry.removable).every(entry => selected.has(entry.id));
      bulkHere.textContent = allHere ? "Deselect all here" : "Select all here";
    }
  }

  function drawCamera(root) {
    const canvas = root.querySelector(".show-map-canvas");
    const base = mapViewBox(geography.states[state]);
    view ||= base;
    hidePreview(canvas.parentElement);
    const spacing = window.matchMedia("(max-width: 600px)").matches ? 47 : 36;
    groups = mapClusters(mapEntries, view, canvas.clientWidth || 550, spacing);
    const svg = canvas.querySelector("svg");
    svg.setAttribute("viewBox", view.join(" "));
    svg.style.setProperty("--show-map-label-size", (12 * view[2] / 900) + "px");
    canvas.querySelector(".show-map-markers").innerHTML = markerButtons();
    const canPan = view[2] < base[2] - 0.01;
    canvas.classList.toggle("can-pan", canPan);
    root.querySelector('[data-map-action="zoom-in"]').disabled = view[2] <= base[2] / 8 + 0.01;
    root.querySelector('[data-map-action="zoom-out"]').disabled = !canPan;
    root.querySelector('[data-map-action="reset-view"]').disabled = !canPan;
    updateSelection(root);
  }

  function hidePreview(region) {
    window.clearTimeout(previewTimer);
    previewPinned = false;
    region.querySelector(".show-map-preview").hidden = true;
    region.querySelector('.show-map-marker[aria-expanded="true"]')?.setAttribute("aria-expanded", "false");
  }

  function showPreview(marker, pin = false) {
    const canvas = marker.closest(".show-map-canvas");
    const region = canvas.parentElement;
    const group = groups[Number(marker.dataset.mapIndex)];
    if (!group) return;
    window.clearTimeout(previewTimer);
    const preview = region.querySelector(".show-map-preview");
    if (marker.getAttribute("aria-expanded") === "true") {
      previewPinned ||= pin;
      if (pin && getComputedStyle(preview).position === "static") preview.scrollIntoView({ block: "nearest" });
      return preview;
    }
    hidePreview(region);
    previewPinned = pin;
    const count = group.entries.length;
    const removableCount = group.entries.filter(entry => entry.removable).length;
    preview.dataset.mapIndex = marker.dataset.mapIndex;
    preview.innerHTML = '<div class="show-map-preview-heading"><strong id="dogShowMapPreviewTitle">'
      + count + (count === 1 ? ' show' : ' shows') + '</strong>'
      + (removableCount > 1 ? '<button type="button" class="secondary-button" data-map-action="select-here"></button>' : '')
      + '<button type="button" class="secondary-button" data-map-action="close-preview" aria-label="Close pin preview">×</button></div><ul>'
      + group.entries.map(entry => showEntryRow(entry, true)).join("") + '</ul>';
    marker.setAttribute("aria-expanded", "true");
    preview.hidden = false;
    preview.scrollTop = 0;
    updateSelection(region.closest("#dogShowPlanMap"));
    preview.style.width = "";
    preview.style.maxHeight = "";
    if (getComputedStyle(preview).position === "static") {
      if (pin) preview.scrollIntoView({ block: "nearest" });
      return preview;
    }
    const margin = 6;
    const gap = marker.offsetWidth / 2 + 5;
    const x = marker.offsetLeft;
    const y = marker.offsetTop;
    const leftSpace = x - gap - margin;
    const rightSpace = canvas.clientWidth - x - gap - margin;
    const sideSpace = Math.max(leftSpace, rightSpace);
    if (sideSpace >= Math.min(218, preview.offsetWidth)) {
      preview.style.width = Math.min(preview.offsetWidth, sideSpace) + "px";
      preview.style.left = (rightSpace >= leftSpace ? x + gap : x - gap - preview.offsetWidth) + "px";
      preview.style.top = clamp(y - preview.offsetHeight / 2, margin, canvas.clientHeight - preview.offsetHeight - margin) + "px";
    } else {
      const topSpace = y - gap - margin;
      const bottomSpace = canvas.clientHeight - y - gap - margin;
      preview.style.maxHeight = Math.min(235, Math.max(topSpace, bottomSpace)) + "px";
      preview.style.left = clamp(x - preview.offsetWidth / 2, margin, canvas.clientWidth - preview.offsetWidth - margin) + "px";
      preview.style.top = (bottomSpace >= topSpace ? y + gap : y - gap - preview.offsetHeight) + "px";
    }
    return preview;
  }

  function showEntryRow(entry, inPreview = false) {
    const e = escapeHtml;
    const name = '<strong>' + e(entry.name) + '</strong>';
    const meta = '<span>' + e([entry.dateLabel, entry.location.label, showPlanStages.get(entry.stage)].filter(Boolean).join(" · ")) + '</span>';
    const details = '<span class="show-map-row-copy">' + name + meta
      + (["State only", "Unmapped"].includes(entry.location.precision) ? '<small>' + entry.location.precision + '</small>' : '') + '</span>';
    const row = entry.removable
      ? '<label><input type="checkbox"' + (inPreview ? '' : ' data-map-focus="' + e("show-" + entry.id) + '"')
        + ' data-map-show="' + e(entry.id) + '">' + details + '</label>'
      : '<div class="show-map-readonly-row">' + details + '</div>';
    const action = inPreview
      ? '<button type="button" class="secondary-button show-map-open-show" data-map-action="open-show"'
        + ' data-event-id="' + e(entry.id) + '" data-record-type="' + e(entry.type) + '"'
        + ' aria-label="' + e(["Open Show", entry.name, entry.dateLabel].filter(Boolean).join(" · ")) + '">Open Show</button>'
      : "";
    return '<li>' + row + action + '</li>';
  }

  function render(root, restoreFocus = false) {
    if (!root || root.hidden) return;
    syncOwner();
    if (!geography) {
      if (loadError) {
        root.innerHTML = '<p role="status">The map could not load. <button type="button" class="secondary-button" data-map-action="retry">Try again</button></p>';
        return;
      }
      root.innerHTML = '<p role="status">Loading show locations…</p>';
      loading ||= fetch(MAP_ASSET).then(response => {
        if (!response.ok) throw new Error("Map data is unavailable.");
        return response.json();
      }).then(data => { geography = data; }).catch(() => { loadError = true; }).finally(() => {
        loading = null;
        const current = document.getElementById("dogShowPlanMap");
        if (current && !current.hidden) render(current);
      });
      return;
    }

    const e = escapeHtml;
    const entries = currentEntries().map(entry => ({ ...entry, location: locateShowOnMap(entry.show, geography) }));
    const stateCodes = [...new Set(entries.map(entry => entry.location.state).filter(Boolean))]
      .sort((a, b) => geography.states[a].name.localeCompare(geography.states[b].name));
    if (state !== "all" && state !== "unmapped" && !stateCodes.includes(state)) {
      state = "all";
      view = null;
    }
    const visible = entries.filter(entry => (stage === "all" || stage === entry.stage)
      && (state === "all" || (state === "unmapped" ? !entry.location.point : entry.location.state === state)));
    mapEntries = visible;
    const unmapped = visible.filter(entry => !entry.location.point).length;
    const focus = restoreFocus ? document.activeElement?.dataset.mapFocus : "";
    const scroll = root.querySelector(".show-map-list")?.scrollTop ?? 0;
    const options = (items, value) => items.map(([id, label]) =>
      '<option value="' + e(id) + '"' + (id === value ? " selected" : "") + '>' + e(label) + '</option>').join("");
    root.innerHTML = '<div class="show-map-toolbar">'
      + '<label>Stage<select data-map-filter="stage" data-map-focus="stage">' + options([["all", "All stages"], ...showPlanStages], stage) + '</select></label>'
      + '<label>Location<select data-map-filter="state" data-map-focus="state">' + options([["all", "All locations"], ...stateCodes.map(code => [code, geography.states[code].name]), ["unmapped", "Unmapped"]], state) + '</select></label>'
      + '<div class="show-map-bulk"><button type="button" class="secondary-button" data-map-action="visible" data-map-focus="visible"></button>'
      + '<button type="button" class="secondary-button" data-map-action="clear" data-map-focus="clear">Clear</button>'
      + '<button type="button" class="secondary-button danger-button" data-map-action="review" data-map-focus="review">Review removal</button></div></div>'
      + '<p class="show-map-selection" role="status"></p>'
      + '<div class="show-map-layout"><div class="show-map-figure">' + mapHtml()
      + '<div class="show-map-caption"><span>Approximate locations · U.S. Census Bureau</span><span>Open a pin to see its shows · Gray pins are for reference</span></div></div>'
      + '<section class="show-map-results" aria-label="Shows on the map"><header><strong>' + visible.length + (visible.length === 1 ? ' show' : ' shows') + '</strong>'
      + (unmapped ? '<span>' + unmapped + ' unmapped</span>' : '') + '</header>'
      + '<ul class="show-map-list">' + (visible.length ? visible.map(entry => showEntryRow(entry)).join("") : '<li class="show-map-empty">No shows match these filters.</li>') + '</ul></section></div>';
    drawCamera(root);
    root.querySelector(".show-map-list").scrollTop = scroll;
    if (focus) {
      const control = [...root.querySelectorAll("[data-map-focus]")].find(item => item.dataset.mapFocus === focus && !item.disabled);
      (control || root.querySelector('[data-map-focus="stage"]'))?.focus({ preventScroll: true });
    }
  }

  function closePreview(region, restoreFocus) {
    if (restoreFocus) region.querySelector('.show-map-marker[aria-expanded="true"]')?.focus({ preventScroll: true });
    hidePreview(region);
  }

  function bind(page) {
    page.addEventListener("change", event => {
      const root = event.target.closest("#dogShowPlanMap");
      if (!root) return;
      const { mapFilter, mapShow } = event.target.dataset;
      if (mapFilter === "stage") stage = event.target.value;
      if (mapFilter === "state") {
        state = event.target.value;
        view = null;
      }
      if (mapShow) {
        if (event.target.checked) selected.add(mapShow);
        else selected.delete(mapShow);
        updateSelection(root);
        return;
      }
      render(root, true);
    });
    page.addEventListener("click", event => {
      const region = page.querySelector("#dogShowPlanMap .show-map-region");
      if (region && !event.target.closest(".show-map-marker, .show-map-preview")) hidePreview(region);
      const button = event.target.closest("#dogShowPlanMap [data-map-action]");
      if (!button) return;
      const root = button.closest("#dogShowPlanMap");
      const action = button.dataset.mapAction;
      if (action === "review") {
        const ids = [...selected];
        button.setAttribute("aria-busy", "true");
        void reviewSelection(ids, button, () => ids.length === selected.size && ids.every(id => selected.has(id))).finally(() => {
          button.removeAttribute("aria-busy");
          if (button.isConnected) updateSelection(root);
        });
        return;
      }
      if (action === "open-show") {
        previewPinned = true;
        window.clearTimeout(previewTimer);
        openShow(button.dataset.eventId, button.dataset.recordType);
        return;
      }
      if (action === "close-preview") {
        closePreview(button.closest(".show-map-region"), true);
        return;
      }
      if (action === "pin") {
        const group = groups[Number(button.dataset.mapIndex)];
        if (group.entries.length === 1 && group.entries[0].removable) {
          addSelection([group.entries[0].id]);
        }
        const preview = showPreview(button, true);
        updateSelection(root);
        if (group.entries.length > 1 && preview) {
          (preview.querySelector("input") || preview.querySelector('[data-map-action="close-preview"]')).focus({ preventScroll: true });
        }
        return;
      }
      if (action === "select-here") {
        const group = groups[Number(button.closest(".show-map-preview").dataset.mapIndex)];
        addSelection(group.entries.filter(entry => entry.removable).map(entry => entry.id));
        updateSelection(root);
        return;
      }
      if (action === "zoom-in" || action === "zoom-out" || action === "reset-view") {
        const base = mapViewBox(geography.states[state]);
        view = action === "reset-view" ? base : zoomShowMap(base, view, action === "zoom-in" ? 1.5 : 1 / 1.5);
        drawCamera(root);
        if (button.disabled) root.querySelector(".show-map-canvas").focus({ preventScroll: true });
        return;
      }
      if (action === "retry") {
        loadError = false;
        render(root, true);
        return;
      }
      if (action === "clear") selected.clear();
      if (action === "visible") {
        addSelection([...root.querySelectorAll(".show-map-list [data-map-show]")].map(input => input.dataset.mapShow));
      }
      updateSelection(root);
    });

    page.addEventListener("pointerover", event => {
      const marker = event.target.closest(".show-map-marker");
      if (marker && !previewPinned && !marker.contains(event.relatedTarget)) showPreview(marker);
      if (event.target.closest(".show-map-preview")) window.clearTimeout(previewTimer);
    });
    page.addEventListener("focusin", event => {
      if (event.target.matches(".show-map-marker")) showPreview(event.target);
      if (event.target.closest(".show-map-preview")) window.clearTimeout(previewTimer);
    });
    function schedulePreviewHide(event) {
      const hovered = event.target.closest(".show-map-marker, .show-map-preview");
      if (!hovered || hovered.contains(event.relatedTarget)) return;
      if (event.type === "focusout" && event.relatedTarget?.closest?.("#dogShowDialog")) return;
      if (event.type === "pointerout" && (previewPinned || document.activeElement?.closest(".show-map-preview"))) return;
      const region = hovered.closest(".show-map-region");
      if (!region || event.relatedTarget?.closest?.(".show-map-region") === region
        && event.relatedTarget.closest(".show-map-preview, .show-map-marker[aria-expanded='true']")) return;
      window.clearTimeout(previewTimer);
      previewTimer = window.setTimeout(() => {
        if (region.isConnected) hidePreview(region);
      }, 260);
    }
    page.addEventListener("pointerout", schedulePreviewHide);
    page.addEventListener("focusout", schedulePreviewHide);

    page.addEventListener("wheel", event => {
      const canvas = event.target.closest(".show-map-canvas");
      if (!canvas || !(event.ctrlKey || event.metaKey) || event.target.closest(".show-map-preview")) return;
      event.preventDefault();
      const box = canvas.getBoundingClientRect();
      const base = mapViewBox(geography.states[state]);
      view = zoomShowMap(base, view, event.deltaY < 0 ? 1.15 : 1 / 1.15,
        (event.clientX - box.left) / box.width, (event.clientY - box.top) / box.height);
      drawCamera(canvas.closest("#dogShowPlanMap"));
    }, { passive: false });

    page.addEventListener("keydown", event => {
      const region = event.target.closest(".show-map-region");
      if (!region) return;
      if (event.key === "Escape") {
        closePreview(region, Boolean(event.target.closest(".show-map-preview")));
        return;
      }
      const canvas = region.querySelector(".show-map-canvas");
      if (event.target !== canvas) return;
      const arrows = { ArrowLeft: [-0.15, 0], ArrowRight: [0.15, 0], ArrowUp: [0, -0.15], ArrowDown: [0, 0.15] };
      const direction = arrows[event.key];
      const base = mapViewBox(geography.states[state]);
      if (direction) view = panShowMap(base, view, direction[0] * view[2], direction[1] * view[3]);
      else if (["+", "=", "-"].includes(event.key)) view = zoomShowMap(base, view, event.key === "-" ? 1 / 1.5 : 1.5);
      else if (event.key === "Home") view = base;
      else return;
      event.preventDefault();
      drawCamera(canvas.closest("#dogShowPlanMap"));
    });

    page.addEventListener("pointerdown", event => {
      const canvas = event.target.closest(".show-map-canvas.can-pan");
      if (!canvas || !event.isPrimary || event.button !== 0 || event.target.closest("button, .show-map-preview")) return;
      canvas.setPointerCapture(event.pointerId);
      drag = { canvas, id: event.pointerId, x: event.clientX, y: event.clientY, view };
      canvas.classList.add("is-panning");
      hidePreview(canvas.parentElement);
    });
    page.addEventListener("pointermove", event => {
      if (!drag || event.pointerId !== drag.id) return;
      const { canvas, x, y, view: start } = drag;
      if (!canvas.isConnected) {
        drag = null;
        return;
      }
      const box = canvas.getBoundingClientRect();
      const base = mapViewBox(geography.states[state]);
      view = panShowMap(base, start, (x - event.clientX) / box.width * start[2], (y - event.clientY) / box.height * start[3]);
      drawCamera(canvas.closest("#dogShowPlanMap"));
    });
    function endPan(event) {
      if (!drag || event.pointerId !== drag.id) return;
      drag.canvas.classList.remove("is-panning");
      drag = null;
    }
    page.addEventListener("lostpointercapture", endPan);
    page.addEventListener("pointercancel", endPan);
    page.addEventListener("pointerup", endPan);

    window.addEventListener("resize", () => {
      const root = page.querySelector("#dogShowPlanMap");
      if (root?.querySelector(".show-map-canvas")) drawCamera(root);
    });
  }

  return {
    bind, render,
    isOpen() { syncOwner(); return open; },
    setOpen(value) { syncOwner(); open = value; },
    clearSelection() { selected.clear(); },
  };
}
