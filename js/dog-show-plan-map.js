const MAP_ASSET = new URL("../assets/show-plan-map.json?v=2026-11", import.meta.url);
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
  const labels = [show.cityState, show.venueAddress, show.venue, research.cityState, research.venueAddress]
    .map(value => String(value || "").trim()).filter(Boolean);
  const names = Object.entries(states).sort(([, a], [, b]) => b.name.length - a.name.length);
  const explicitState = String(show.state || research.state || "").trim();
  const explicitCode = Object.hasOwn(states, explicitState.toUpperCase()) ? explicitState.toUpperCase()
    : names.find(([, area]) => area.name.toLowerCase() === explicitState.toLowerCase())?.[0];
  let fallback;
  for (const label of labels) {
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
      : [fallback || explicitCode, withoutZip];
    if (!stateCode || (fallback && stateCode !== fallback)) continue;

    const words = cityText.split(/[\s,]+/).filter(Boolean);
    const stateCities = cities[stateCode] || {};
    for (let offset = 0; offset < words.length; offset += 1) {
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
    : { state: "", point: null, label: labels[0] || "No location saved", precision: "Unmapped" };
}

function mapViewBox(state) {
  if (!state) return FULL_MAP;
  const [left, top, right, bottom] = state.bounds;
  const width = Math.max(130, right - left + 48, (bottom - top + 42) * 5 / 3);
  const height = width * 3 / 5;
  return [(left + right - width) / 2, (top + bottom - height) / 2, width, height];
}

function mapClusters(entries, viewBox) {
  const [left, top, width, height] = viewBox;
  const clusters = [];
  entries.forEach(entry => {
    if (!entry.location.point) return;
    const [x, y] = entry.location.point;
    const position = [(x - left) / width * 100, (y - top) / height * 100];
    let cluster = clusters.find(group => Math.hypot(group.x - position[0], (group.y - position[1]) * 0.6) < 7);
    if (!cluster) {
      cluster = { x: position[0], y: position[1], entries: [] };
      clusters.push(cluster);
    }
    cluster.entries.push(entry);
  });
  return clusters;
}

export function createDogShowPlanMap({ escapeHtml, readEntries, ownerKey, reviewSelection }) {
  let owner = "";
  let open = false;
  let stage = "all";
  let state = "all";
  let selected = new Set();
  let geography;
  let loading;
  let loadError = false;
  let groups = [];

  function syncOwner() {
    const key = ownerKey();
    if (key === owner) return;
    owner = key;
    open = false;
    stage = state = "all";
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

  function mapHtml(entries) {
    const e = escapeHtml;
    const viewBox = mapViewBox(geography.states[state]);
    groups = mapClusters(entries, viewBox);
    const paths = Object.entries(geography.states).map(([code, area]) => {
      if (geography.states[state] && code !== state
        && (INSETS.some(([inset]) => inset === state) || INSETS.some(([inset]) => inset === code))) return "";
      return '<path class="' + (code === state ? 'is-current' : '') + '" d="' + area.path + '"/>';
    }).join("");
    const labels = Object.entries(geography.states).map(([code, area]) => {
      if (geography.states[state] ? code !== state : SMALL_STATES.has(code) || INSETS.some(([inset]) => inset === code)) return "";
      return '<text x="' + area.point[0] + '" y="' + (area.point[1] + 3) + '">' + code + '</text>';
    }).join("");
    const insets = geography.states[state] ? "" : INSETS.map(([label, x, y]) =>
      '<text class="show-map-inset" x="' + x + '" y="' + y + '">' + label + '</text>').join("");
    const markers = groups.map((group, index) => {
      const removable = group.entries.filter(entry => entry.removable);
      const selectedCount = removable.filter(entry => selected.has(entry.id)).length;
      const allSelected = removable.length > 0 && selectedCount === removable.length;
      const locations = [...new Set(group.entries.map(entry => entry.location.label))];
      const description = group.entries.length + (group.entries.length === 1 ? " show near " : " shows near ") + locations.join(", ");
      const classes = "show-map-marker" + (!removable.length ? " is-readonly" : allSelected ? " is-selected" : selectedCount ? " is-partial" : "");
      const attrs = 'class="' + classes + '" style="--pin-x:' + group.x.toFixed(2) + '%;--pin-y:' + group.y.toFixed(2) + '%"';
      const tip = ' title="' + e(description + (removable.length && removable.length < group.entries.length
        ? " · " + removable.length + " available to select" : "")) + '"';
      if (!removable.length) return '<span ' + attrs + tip + ' aria-label="' + e(description) + '">' + group.entries.length + '</span>';
      const action = allSelected ? "Deselect " : "Select ";
      const label = action + removable.length + (removable.length === 1 ? " show near " : " shows near ") + locations.join(", ");
      return '<button type="button" ' + attrs + tip + ' data-map-action="pin" data-map-index="' + index
        + '" data-map-focus="pin-' + index + '" aria-label="' + e(label) + '" aria-pressed="' + allSelected + '">' + group.entries.length + '</button>';
    }).join("");
    return '<div class="show-map-canvas" role="group" aria-label="Show location markers">'
      + '<svg viewBox="' + viewBox.join(" ") + '" aria-hidden="true">' + paths + labels + insets + '</svg>' + markers + '</div>';
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
    if (state !== "all" && state !== "unmapped" && !stateCodes.includes(state)) state = "all";
    const visible = entries.filter(entry => (stage === "all" || stage === entry.stage)
      && (state === "all" || (state === "unmapped" ? !entry.location.point : entry.location.state === state)));
    const removable = visible.filter(entry => entry.removable);
    const visibleSelected = removable.filter(entry => selected.has(entry.id)).length;
    const unmapped = visible.filter(entry => !entry.location.point).length;
    const focus = restoreFocus ? document.activeElement?.dataset.mapFocus : "";
    const scroll = root.querySelector(".show-map-list")?.scrollTop ?? 0;
    const options = (items, value) => items.map(([id, label]) =>
      '<option value="' + e(id) + '"' + (id === value ? " selected" : "") + '>' + e(label) + '</option>').join("");
    const row = entry => {
      const name = '<strong>' + e(entry.name) + '</strong>';
      const meta = '<span>' + e([entry.dateLabel, entry.location.label, showPlanStages.get(entry.stage)].filter(Boolean).join(" · ")) + '</span>';
      const details = '<span class="show-map-row-copy">' + name + meta
        + (["State only", "Unmapped"].includes(entry.location.precision) ? '<small>' + entry.location.precision + '</small>' : '') + '</span>';
      return '<li>' + (entry.removable
        ? '<label><input type="checkbox" data-map-focus="' + e("show-" + entry.id) + '" data-map-show="' + e(entry.id)
          + '"' + (selected.has(entry.id) ? " checked" : "") + '>' + details + '</label>'
        : '<div class="show-map-readonly-row">' + details + '</div>') + '</li>';
    };

    root.innerHTML = '<div class="show-map-toolbar">'
      + '<label>Stage<select data-map-filter="stage" data-map-focus="stage">' + options([["all", "All stages"], ...showPlanStages], stage) + '</select></label>'
      + '<label>Location<select data-map-filter="state" data-map-focus="state">' + options([["all", "All locations"], ...stateCodes.map(code => [code, geography.states[code].name]), ["unmapped", "Unmapped"]], state) + '</select></label>'
      + '<div class="show-map-bulk"><button type="button" class="secondary-button" data-map-action="visible" data-map-focus="visible"' + (removable.length ? '' : ' disabled') + '>'
      + (removable.length && visibleSelected === removable.length ? "Deselect visible" : "Select visible") + '</button>'
      + '<button type="button" class="secondary-button" data-map-action="clear" data-map-focus="clear"' + (selected.size ? '' : ' disabled') + '>Clear</button>'
      + '<button type="button" class="secondary-button danger-button" data-map-action="review" data-map-focus="review"' + (selected.size ? '' : ' disabled') + '>Review removal</button></div></div>'
      + '<p class="show-map-selection" role="status">' + selected.size + ' selected'
      + (selected.size > visibleSelected ? ' · ' + (selected.size - visibleSelected) + ' outside these filters' : '') + '</p>'
      + '<div class="show-map-layout"><div class="show-map-figure">' + mapHtml(visible)
      + '<div class="show-map-caption"><span>Approximate locations · U.S. Census Bureau</span><span>Blue pins select shows · Gray pins are for reference</span></div></div>'
      + '<section class="show-map-results" aria-label="Shows on the map"><header><strong>' + visible.length + (visible.length === 1 ? ' show' : ' shows') + '</strong>'
      + (unmapped ? '<span>' + unmapped + ' unmapped</span>' : '') + '</header>'
      + '<ul class="show-map-list">' + (visible.length ? visible.map(row).join("") : '<li class="show-map-empty">No shows match these filters.</li>') + '</ul></section></div>';
    root.querySelector(".show-map-list").scrollTop = scroll;
    if (focus) {
      const control = [...root.querySelectorAll("[data-map-focus]")].find(item => item.dataset.mapFocus === focus && !item.disabled);
      (control || root.querySelector('[data-map-focus="stage"]'))?.focus({ preventScroll: true });
    }
  }

  function bind(page) {
    page.addEventListener("change", event => {
      const root = event.target.closest("#dogShowPlanMap");
      if (!root) return;
      const { mapFilter, mapShow } = event.target.dataset;
      if (mapFilter === "stage") stage = event.target.value;
      if (mapFilter === "state") state = event.target.value;
      if (mapShow) {
        if (event.target.checked) selected.add(mapShow);
        else selected.delete(mapShow);
      }
      render(root, true);
    });
    page.addEventListener("click", event => {
      const button = event.target.closest("#dogShowPlanMap [data-map-action]");
      if (!button) return;
      const root = button.closest("#dogShowPlanMap");
      const action = button.dataset.mapAction;
      if (action === "review") {
        reviewSelection([...selected], button);
        return;
      }
      if (action === "retry") loadError = false;
      if (action === "clear") selected.clear();
      if (action === "pin") {
        const group = groups[Number(button.dataset.mapIndex)];
        if (group) addSelection(group.entries.filter(entry => entry.removable).map(entry => entry.id));
      }
      if (action === "visible") {
        addSelection([...root.querySelectorAll("[data-map-show]")].map(input => input.dataset.mapShow));
      }
      render(root, true);
    });
  }

  return {
    bind, render,
    isOpen() { syncOwner(); return open; },
    setOpen(value) { syncOwner(); open = value; },
    clearSelection() { selected.clear(); },
  };
}
