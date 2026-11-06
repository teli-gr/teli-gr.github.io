import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { I18nProvider, initialLang, loadLang } from "./i18n";
import "@fontsource-variable/inter";
import "@fontsource/roboto-condensed/600.css";
import "@fontsource/roboto-condensed/700.css";
import "./index.css";
import { watchErrors } from "./lib/track";
import { initConsent } from "./lib/consent";
watchErrors();
initConsent();
// load this page's language, then start (the static page stays visible meanwhile)
loadLang(initialLang()).then(() => createRoot(document.getElementById("root")!).render(<React.StrictMode><I18nProvider><App /></I18nProvider></React.StrictMode>));
