import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const required = [
  ["index.html", 'data-page="dogShowPage"', "Missing Dog Shows top-level navigation."],
  ["index.html", 'id="dogShowPage"', "Missing isolated Dog Show page."],
  ["index.html", 'id="dogShowMobileNav"', "Missing Dog Show mobile menu."],
  ["index.html", 'data-dog-show-view="home"', "Missing Home view."],
  ["index.html", 'data-dog-show-view="dogs"', "Missing Dogs view."],
  ["index.html", 'data-dog-show-view="schedule"', "Missing Schedule view."],
  ["index.html", 'data-dog-show-view="tasks"', "Missing Tasks view."],
  ["index.html", 'data-dog-show-view="more"', "Missing More view."],
  ["js/main.js", 'import "./dog-show.js', "Dog Show module is not loaded."],
  ["js/shared.js", 'dogShowPage: ["showEvent"', "Dog Show remote records are not page-scoped."],
  ["js/shared.js", 'dogShowPage: () => renderDogShow()', "Dog Show page renderer is not registered."],
  ["js/shared.js", 'if (typeof setupDogShowEventListeners', "Dog Show event listeners are not initialized."],
  ["js/dog-show.js", "DOG_SHOW_STALE_MINUTES", "Dog attention timestamps are not monitored."],
  ["js/dog-show.js", "dogShowConflictEntryIds", "Prep/helper conflicts are not detected."],
  ["js/dog-show.js", "syncDogShowPrepTask", "Ring prep tasks are not generated from the backward schedule."],
  ["js/dog-show.js", "createDogShowWaterRound", "Large-team water rounds are missing."],
  ["js/dog-show.js", "completeDogShowTasks", "Batch task completion is missing."],
  ["js/dog-show.js", "quick-show-log", "One-tap dog care logging is missing."],
  ["js/dog-show.js", "customerVisible", "Owner-visible notes/results are not separated."],
  ["styles.css", "body.is-dog-show-mode #mobileBottomNav", "Regular boarding mobile navigation is not isolated from Dog Show mode."],
  ["styles.css", ".dog-show-mobile-nav", "Dog Show mobile navigation styling is missing."],
  ["supabase-schema.sql", "'showEvent'", "RLS does not allow show event writes."],
  ["supabase-schema.sql", "'showCareLog'", "RLS does not allow show care log writes."],
];

const forbidden = [
  ['upsertRecord("boardingDog"', "Dog Show module must not write boarding dog records."],
  ['saveDogShowRecord("boardingDog"', "Dog Show module must not save boarding dog records."],
  ['upsertRecord("careLog"', "Dog Show module must not write boarding/shared care logs."],
  ['upsertRecord("scheduledCareTask"', "Dog Show prep tasks must stay out of the boarding scheduler."],
];

const failures = [];
for (const [path, needle, message] of required) {
  if (!read(path).includes(needle)) failures.push(message);
}
const dogShowSource = read("js/dog-show.js");
for (const [needle, message] of forbidden) {
  if (dogShowSource.includes(needle)) failures.push(message);
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Dog Show static checks passed.");
