/* Members list (current tenant only): status tabs with live counts, search, rows open the front-desk view. */
(function () {
  var tx = App.tx, ic = App.ic, vm = App.vm;
  vm.tab = App.q("tab") || "all"; vm.q = App.q("q") || "";
  var TABS = [["all", "Todos", "All"], ["active", "Activas", "Active"], ["grace", "En gracia", "Grace"], ["lapsed", "Vencidas", "Lapsed"], ["pending", "Pendientes", "Pending"], ["suspended", "Suspendidas", "Suspended"], ["cancelled", "Canceladas", "Cancelled"]];
  function rows() {
    var list = App.members(), q = App.norm(vm.q), digits = vm.q.replace(/\D/g, "");
    var f = list.filter(function (m) {
      var st = App.status(m, list);
      if (vm.tab !== "all" && st !== vm.tab) return false;
      if (q && !(App.norm(m.name).indexOf(q) >= 0 || m.id.toLowerCase().indexOf(q) >= 0 || (digits.length >= 3 && m.phone.replace(/\D/g, "").indexOf(digits) >= 0))) return false;
      return true;
    });
    var ord = { lapsed: 0, grace: 1, pending: 2, suspended: 3, active: 4, cancelled: 5 };
    f.sort(function (a, b) { return ord[App.status(a, list)] - ord[App.status(b, list)] || a.name.localeCompare(b.name); });
    var html = f.map(function (m) {
      var p = App.primary(m, list), st = App.status(m, list), hh = App.household(p, list).length;
      return '<tr><td><a class="row-3 plain" href="checkin.html?m=' + m.id + '"><div class="avatar avatar-sm ' + (m.av || "av-1") + '">' + App.ini(m.name) + '</div><div style="min-width:0"><div style="font-weight:600" class="nowrap">' + m.name + '</div><div class="xs subtle">' + m.id + "</div></div></a></td><td class=\"nowrap\">" + App.tierName(p.tier) + '<div class="xs subtle">' + (m.hh ? tx("Adulto en hogar de ", "Adult in household of ") + hh : hh > 1 ? tx("Titular · hogar de ", "Primary · household of ") + hh : tx("Individual", "Individual")) + "</div></td><td>" + App.badge(st) + '</td><td class="nowrap">' + (p.expires ? App.fd(p.expires) : "—") + (p.autorenew ? '<div class="xs subtle row" style="gap:4px">' + ic("renew", "i-xs") + tx("Auto-renovación", "Auto-renew") + "</div>" : "") + '</td><td class="nowrap num">' + m.phone + '</td><td class="nowrap">' + (m.last ? App.fds(m.last) : "—") + '</td><td class="right"><a class="btn btn-secondary btn-sm" href="checkin.html?m=' + m.id + '">' + ic("login", "i-xs") + tx("Recepción", "Desk") + "</a></td></tr>";
    }).join("");
    return { html: html || '<tr><td colspan="7" class="subtle" style="padding:24px 16px">' + tx("Ningún miembro coincide.", "No members match.") + "</td></tr>", n: f.length };
  }
  function render() {
    var M = App.metrics(), t = App.ten(), r = rows();
    var tabs = '<div class="tabs" role="tablist">' + TABS.map(function (x) { return '<button type="button" class="tab' + (vm.tab === x[0] ? " is-active" : "") + '" role="tab" aria-selected="' + (vm.tab === x[0]) + '" data-act="tab" data-v="' + x[0] + '">' + tx(x[1], x[2]) + ' <span class="count">' + M.counts[x[0]].toLocaleString("en-US") + "</span></button>"; }).join("") + "</div>";
    return App.staffShell("members", '<div class="page-head"><div><h1>' + tx("Miembros", "Members") + "</h1><p>" + M.counts.all.toLocaleString("en-US") + tx(" miembros en ", " members in ") + M.households.toLocaleString("en-US") + tx(" hogares · ", " households · ") + t.name + '</p></div><div class="row wrap"><a class="btn btn-primary" href="signup.html">' + ic("user-plus", "i-sm") + tx("Inscribir miembro", "Add member") + "</a></div></div>" +
      '<div class="card"><div class="tabs-wrap">' + tabs + '</div><div class="card-header" style="border-top:1px solid var(--border)"><form class="input-wrap" style="width:min(360px,100%)" onsubmit="return false">' + ic("search", "i-sm") + '<input class="input" id="mq" value="' + App.esc(vm.q) + '" placeholder="' + tx("Buscar por nombre, # o teléfono", "Search by name, # or phone") + '" aria-label="' + tx("Buscar miembros", "Search members") + '"></form><span class="xs subtle" id="mcount">' + tx("Mostrando " + r.n + " de la muestra de la demo", "Showing " + r.n + " from the demo sample") + "</span></div>" +
      '<div class="table-wrap"><table class="table"><thead><tr><th>' + tx("Miembro", "Member") + "</th><th>" + tx("Plan", "Plan") + "</th><th>" + tx("Estado", "Status") + "</th><th>" + tx("Vence", "Expires") + "</th><th>" + tx("Móvil", "Mobile") + "</th><th>" + tx("Última visita", "Last visit") + '</th><th></th></tr></thead><tbody id="mrows">' + r.html + "</tbody></table></div>" +
      '<div class="card-footer small subtle">' + tx("La demo incluye una muestra de miembros ficticios; los totales de las pestañas son los del club.", "The demo includes a sample of fictional members; tab totals are the range's totals.") + "</div></div>");
  }
  App.page({
    render: render,
    title: function () { return tx("Miembros", "Members"); },
    after: function () {
      var q = document.getElementById("mq");
      if (q) q.addEventListener("input", function () { vm.q = q.value; var r = rows(); document.getElementById("mrows").innerHTML = r.html; document.getElementById("mcount").textContent = tx("Mostrando " + r.n + " de la muestra de la demo", "Showing " + r.n + " from the demo sample"); });
    },
    handlers: { tab: function (el) { vm.tab = el.dataset.v; App.rerender(); } }
  });
})();
