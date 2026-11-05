/* Visitor counter for the static guide pages: loads GoatCounter only when a code is set (no cookies). */
(function () {
  var m = document.querySelector('meta[name="goatcounter"]');
  var c = m && m.content.trim();
  if (!c || !/^[a-z0-9-]+$/i.test(c)) return;
  var s = document.createElement("script");
  s.async = true; s.src = "https://gc.zgo.at/count.js";
  s.setAttribute("data-goatcounter", "https://" + c + ".goatcounter.com/count");
  document.head.appendChild(s);
})();
