// Rebuilds ../deploy/site from the source code. Works on Windows, Mac and Linux.
//   In the app folder:  npm ci   (first time only)   then   npm run build:site
// Afterwards upload as usual from the deploy folder. robots.txt and sitemap.xml in deploy/site are kept as they are
// (add new pages to sitemap.xml by hand).
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const APP = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = join(APP, "..", "deploy", "site");
const KEEP = ["robots.txt", "sitemap.xml"];
const node = (args, env = {}) => {
  const r = spawnSync(process.execPath, args, { cwd: APP, stdio: "inherit", env: { ...process.env, ...env } });
  if (r.status !== 0) { console.error("\nStopped: see the message above."); process.exit(1); }
};

if (!existsSync(join(APP, "node_modules", "vite"))) { console.error("Run  npm ci  in the app folder first."); process.exit(1); }
node([join("scripts", "test.mjs")]);
// Placeholders are filled in by the deploy tool at upload time (site address, visitor counter, contact email).
delete process.env.VITE_TARGET; // "artifact" would build the single-file Claude page instead
node([join("node_modules", "vite", "bin", "vite.js"), "build"], {
  VITE_SITE_URL: "https://teli.placeholder.invalid", VITE_GOATCOUNTER: "__GC_CODE__", VITE_GSC: "__GSC_CODE__", VITE_CONTACT: "__CONTACT__",
});

const keep = mkdtempSync(join(tmpdir(), "teli-"));
for (const f of KEEP) if (existsSync(join(SITE, f))) cpSync(join(SITE, f), join(keep, f));
rmSync(SITE, { recursive: true, force: true });
cpSync(join(APP, "dist"), SITE, { recursive: true });
rmSync(join(SITE, "firebase-messaging-sw.js"), { force: true }); // push alerts are off in the free version
for (const f of KEEP) if (existsSync(join(keep, f))) cpSync(join(keep, f), join(SITE, f));
rmSync(keep, { recursive: true, force: true });
console.log(`\nDone: ${SITE} is up to date. Now upload from the deploy folder.`);
