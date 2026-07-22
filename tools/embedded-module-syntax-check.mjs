import fs from "node:fs";
import vm from "node:vm";

const files = fs.readdirSync("js")
  .filter((file) => file.endsWith(".js"))
  .map((file) => `js/${file}`)
  .filter((file) => fs.readFileSync(file, "utf8").includes("const __snuggleStayModuleSource"));

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const match = source.match(/const __snuggleStayModuleSource = (`[\s\S]*`);\n\(0, eval\)\(__snuggleStayModuleSource\);/);
  if (!match) throw new Error(`Could not extract embedded module from ${file}.`);

  const context = {};
  vm.runInNewContext(`globalThis.moduleSource = ${match[1]};`, context);
  new vm.Script(context.moduleSource, { filename: `${file}:embedded` });
}

console.log("Embedded module syntax checks passed.");
