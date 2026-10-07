/* Applies the saved tenant/language before first paint (avoids a flash of the wrong brand). */
(function () {
  try {
    var q = new URLSearchParams(location.search), s = JSON.parse(localStorage.getItem("rangeclub-demo-v1") || "null") || {};
    var t = q.get("tenant") || s.tenant || "guayama", l = q.get("lang") || s.lang || "es";
    document.documentElement.setAttribute("data-tenant", t === "salinas" ? "salinas" : "guayama");
    document.documentElement.lang = l === "en" ? "en" : "es";
  } catch (e) { }
})();
