import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const index = read("index.html");
const styles = read("styles.css");
const timesheet = read("js/timesheet.js");
const main = read("js/main.js");
const packageJson = read("package.json");

assert.match(index, /id="staffSchedulePublishStatus"[^>]*role="status"[^>]*aria-live="polite"/, "schedule toolbar exposes an accessible live publication status");
assert.match(index, /id="staffSchedulePublishStatusLabel">Not Published</, "the initial state is explicit");
assert.match(timesheet, /function schedulePublishRecordForWeek[\s\S]*readRecords\("schedulePublish"\)/, "publication status reads the persisted weekly record");
assert.match(timesheet, /function renderStaffSchedulePublishStatus[\s\S]*Changes Need Publishing[\s\S]*Published[\s\S]*Not Published/, "all publication states render clearly");
assert.match(timesheet, /button\.textContent = hasChanges \? "Publish Changes" : published \? "Republish Week" : "Publish Week"/, "the publish action reflects the saved state");
assert.match(timesheet, /function renderScheduleTab[\s\S]*renderStaffSchedulePublishStatus\(\)/, "status refreshes when the viewed week changes");
assert.match(timesheet, /async function cancelScheduleShift[\s\S]*changedAfterPublish/, "cancelling a published shift marks the week as changed");
assert.match(styles, /staff-schedule-publish-status\.is-published[\s\S]*#16a34a/, "published weeks receive a green status treatment");
assert.match(styles, /staff-schedule-publish-status\.has-unpublished-changes[\s\S]*#f97316/, "changed published weeks receive a warning treatment");
assert.match(main, /timesheet\.js\?[^"\n]*schedule-publish-status-v93/, "the timesheet module cache key includes the publication indicator release");
assert.match(index, /main\.js\?[^"\n]*schedule-publish-status-v93/, "the application entrypoint cache key includes the publication indicator release");
assert.match(index, /styles\.css\?[^"\n]*schedule-publish-status-v93/, "the stylesheet cache key includes the publication indicator release");
assert.ok(packageJson.includes("staff-schedule-publish-status-static-check.mjs"), "the publication indicator regression runs in the full suite");

console.log("Staff schedule publication status checks passed.");
