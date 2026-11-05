import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "node:path";
import { seoBody, seoHead } from "./src/content/seo.ts";
import { GUIDES, guideHtml } from "./src/content/guides.ts";

/* VITE_TARGET=artifact builds the Claude-hosted page (no manifest, no SEO fallback). Default = public website. */
function seo(env) {
  return {
    name: "teli-seo",
    transformIndexHtml(html, ctx) {
      if (env.VITE_TARGET === "artifact") return html;
      const lang = (ctx.filename.match(/[\\/](en|sq|zh|ru)[\\/]index\.html$/) || [])[1] || "el";
      const site = (env.VITE_SITE_URL || "").replace(/\/$/, "");
      const clean = (v, re) => (v || "").replace(re, "");
      const metas = [
        `<meta name="goatcounter" content="${clean(env.VITE_GOATCOUNTER, /[^a-z0-9_-]/gi)}">`,
        `<meta name="google-site-verification" content="${clean(env.VITE_GSC, /[^a-z0-9_-]/gi)}">`,
        `<meta name="contact" content="${clean(env.VITE_CONTACT, /[^a-z0-9_@.+-]/gi)}">`,
        `<meta name="ga-id" content="${clean(env.VITE_GA_ID, /[^A-Z0-9-]/g)}">`,
      ].join("\n");
      return html
        .replace(/<html lang="[^"]*">/, `<html lang="${lang}">`)
        .replace(/<title>[\s\S]*?<\/title>\s*/, "").replace(/<meta name="description"[^>]*>\s*/, "")
        .replace("</head>", `${seoHead(site, lang)}\n${metas}\n</head>`)
        .replace('<div id="root"></div>', `<div id="root">${seoBody(lang)}</div>`);
    },
  };
}

/* Preload each page's own language file so it downloads in parallel with the app. */
function preloadLang(env) {
  return {
    name: "teli-preload-lang",
    transformIndexHtml: {
      order: "post",
      handler(html, ctx) {
        if (env.VITE_TARGET === "artifact" || !ctx.bundle) return html;
        const lang = (ctx.filename.match(/[\\/](en|sq|zh|ru)[\\/]index\.html$/) || [])[1] || "el";
        const chunk = Object.values(ctx.bundle).find((c) => c.type === "chunk" && c.name === lang && !c.isEntry);
        return chunk ? html.replace("</head>", `<link rel="modulepreload" crossorigin href="/${chunk.fileName}">\n</head>`) : html;
      },
    },
  };
}

/* Greek guide pages (/odigos/<slug>/): plain, fast HTML for the most searched questions. */
function guides(env) {
  return {
    name: "teli-guides",
    generateBundle() {
      if (env.VITE_TARGET === "artifact") return;
      const site = (env.VITE_SITE_URL || "").replace(/\/$/, "");
      for (const g of GUIDES) this.emitFile({ type: "asset", fileName: `odigos/${g.slug}/index.html`, source: guideHtml(g, site) });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), seo(env), preloadLang(env), guides(env), ...(env.VITE_TARGET === "artifact" ? [viteSingleFile()] : [])],
    resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
    publicDir: env.VITE_TARGET === "artifact" ? false : "public",
    // Claude page: one self-contained file. Website: normal Vite output (small index.html + cached /assets files).
    build: env.VITE_TARGET === "artifact"
      ? { target: "es2020", assetsInlineLimit: 100000000, cssCodeSplit: false }
      : { target: "es2020", rollupOptions: { input: { el: path.resolve(import.meta.dirname, "index.html"), en: path.resolve(import.meta.dirname, "en/index.html"), sq: path.resolve(import.meta.dirname, "sq/index.html"), zh: path.resolve(import.meta.dirname, "zh/index.html"), ru: path.resolve(import.meta.dirname, "ru/index.html") } } },
  };
});
