/* Visitor counter for the static guide pages (no cookies). Loads GoatCounter only when a code is set
   AND the visitor already said «Ναι» on the calculator in the last 12 months (same site, same choice), and never when the
   browser sends Global Privacy Control or Do Not Track. */
(function () {
  var m = document.querySelector('meta[name="goatcounter"]');
  var c = m && m.content.trim();
  if (!c || !/^[a-z0-9-]+$/i.test(c)) return;
  var n = navigator;
  if (n.globalPrivacyControl === true || n.doNotTrack === "1" || window.doNotTrack === "1") return;
  try {
    var at = Number(localStorage.getItem("teli.consent.at") || 0);
    if (localStorage.getItem("teli.consent") !== "granted" || !at || Date.now() - at > 365 * 24 * 3600 * 1000) return;
  } catch (e) { return; }
  var s = document.createElement("script");
  s.async = true; s.src = "https://gc.zgo.at/count.js";
  s.setAttribute("data-goatcounter", "https://" + c + ".goatcounter.com/count");
  document.head.appendChild(s);
})();
