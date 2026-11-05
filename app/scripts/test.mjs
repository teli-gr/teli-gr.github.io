// Runs the calculation and translation tests. Newer Node versions read TypeScript on their own; older ones need a flag.
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const APP = join(dirname(fileURLToPath(import.meta.url)), "..");
const flag = process.features?.typescript ? [] : ["--experimental-strip-types"];
for (const t of ["test/calc.test.mjs", "test/i18n.test.mjs"]) {
  const r = spawnSync(process.execPath, [...flag, t], { cwd: APP, stdio: "inherit" });
  if (r.status !== 0) process.exit(1);
}
