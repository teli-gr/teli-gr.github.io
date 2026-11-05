// Runs by itself: on GitHub (.github/workflows/publish.yml) and before every `firebase deploy` (firebase.json).
// It copies site/ to public/ and puts in the site address, the visitor counter and the contact email from settings.json.
// No domain in settings.json? Then it uses the free address: https://<name>.github.io or https://<project-id>.web.app
// On GitHub it also adds the security rules as <meta> tags, because GitHub Pages can't send them as headers.
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, "site"), PUBLIC = join(HERE, "public");
const stop = (msg) => { console.error(`\nsettings.json: ${msg}\n`); process.exit(1); };

let s;
try { s = JSON.parse(readFileSync(join(HERE, "settings.json"), "utf8")); } catch { stop("can't read it. Open it in Notepad and check the quotes and commas."); }
const domain = String(s.domain || "").trim().replace(/^https?:\/\//, "").replace(/\/+$/, "").toLowerCase();
const goat = String(s.goatcounter || "").trim();
const email = String(s.contactEmail || "").trim();
if (domain && !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) stop(`"${domain}" is not a domain. Write it like "teli.gr".`);
if (goat && !/^[a-z0-9-]+$/.test(goat)) stop(`the GoatCounter code can only have small letters, numbers and dashes.`);
if (email && !/^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) stop(`"${email}" doesn't look like an email.`);

const project = process.env.GCLOUD_PROJECT || "";
const address = domain ? `https://${domain}` : process.env.SITE_ADDRESS || (project ? `https://${project}.web.app` : "http://localhost:5050");

// Security rules from firebase.json (one place to edit). "frame-ancestors" only works as a header, so it's left out here.
let metas = "";
if (process.env.META_CSP) {
  const hosting = JSON.parse(readFileSync(join(HERE, "firebase.json"), "utf8")).hosting;
  const all = hosting.headers.find((h) => h.source === "**").headers;
  const val = (k) => all.find((h) => h.key === k)?.value || "";
  const csp = val("Content-Security-Policy").split(";").map((d) => d.trim()).filter((d) => d && !d.startsWith("frame-ancestors")).join("; ");
  metas = `\n<meta http-equiv="Content-Security-Policy" content="${csp}">\n<meta name="referrer" content="${val("Referrer-Policy") || "strict-origin-when-cross-origin"}">`;
}
const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Athens" });

const walk = (dir) => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
rmSync(PUBLIC, { recursive: true, force: true });
cpSync(SITE, PUBLIC, { recursive: true });
for (const f of walk(SITE)) {
  if (!/\.html$|[\\/]robots\.txt$|[\\/]sitemap\.xml$/.test(f)) continue;
  let text = readFileSync(f, "utf8")
    .replaceAll("https://teli.placeholder.invalid", address).replaceAll("__GC_CODE__", goat)
    .replaceAll("__GSC_CODE__", "").replaceAll("__CONTACT__", email).replaceAll("__TODAY__", today);
  if (metas && f.endsWith(".html")) text = text.replace(/<meta charset="utf-8">/i, (m) => m + metas);
  const out = join(PUBLIC, relative(SITE, f));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, text, "utf8");
}
console.log(`Site address: ${address}${goat ? ` · visitor counter: ${goat}` : ""}${email ? ` · contact: ${email}` : ""}`);
