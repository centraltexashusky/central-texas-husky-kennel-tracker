import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const boarding = read("js/boarding.js");
const main = read("js/main.js");
const index = read("index.html");
const roleFunctionIndex = boarding.indexOf("function boardingCurrentDogRoleForStay");
const requestedRoleIndex = boarding.indexOf("const requestedRole", roleFunctionIndex);
const stayProgramIndex = boarding.indexOf("const stayProgram", roleFunctionIndex);

const checks = [
  {
    pass: roleFunctionIndex >= 0 && requestedRoleIndex > roleFunctionIndex && stayProgramIndex > requestedRoleIndex,
    message: "explicit boarding rate role must be resolved before saved stayProgram state.",
  },
  {
    pass: boarding.includes('if (requestedRole === "non-member") return "non-member";'),
    message: "explicit non-member default role must clear saved stayProgram state.",
  },
  {
    pass: boarding.includes('const boardingRateSelectionShown = !isServiceRequest && Boolean(boardingRateServiceField);'),
    message: "save path must detect whether the boarding price selector was shown.",
  },
  {
    pass: boarding.includes('selectedStayProgram || (!boardingRateSelectionShown && !selectedBoardingRateServiceId ? existingStay?.stayProgram'),
    message: "default/blank boarding price selection must clear an existing premium stay program.",
  },
  {
    pass: boarding.includes('const pricingBoardingRateRole = effectiveStayProgram ? "boarding-program" : boardingRateRole;'),
    message: "pricing snapshot must preserve boarding-program role only when a program remains selected.",
  },
  {
    pass: boarding.includes('boardingRateServiceId: selectedStandardBoardingRateService?.id || (!effectiveStayProgram ? selectedBoardingRateServiceId : ""),'),
    message: "pricing snapshot must use the normalized selected boarding rate service id.",
  },
  {
    pass: main.includes("20260711-clear-boarding-program-price"),
    message: "main module must import the cache-busted boarding module.",
  },
  {
    pass: index.includes("20260711-clear-boarding-program-price"),
    message: "index.html must expose the latest main module cache key.",
  },
];

const failures = checks.filter((check) => !check.pass).map((check) => `- ${check.message}`);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Boarding price selection static checks passed.");
