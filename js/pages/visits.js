/* Official visit log (Reglamento 9172 Arts. 3.06(K) / 3.07(N)): full name, date, gun license number, caliber used, time in, time out.
   License numbers are masked on screen (last 4). Export = those six columns + a visit-type column (member / shooting guest / non-shooting guest), as a CSV generated in the browser:
   official copy with the full license number (owner only, recorded in the export access log) or a masked working copy.
   Staff / kiosk / forced check-out stay on screen as audit info; they are not exported. No lane/bay, no serial numbers. */
(function () {
  var tx = App.tx, ic = App.ic, vm = App.vm;
  vm.day = App.q("d") || App.TODAY;
  function exportsLog() { return App.ts().events.filter(function (e) { return e.type === "export"; }); }
  function render() {
    var t = App.ten(), rows = App.visitsFor(vm.day).sort(function (a, b) { return b.in - a.in; }), isToday = vm.day === App.TODAY, c = App.closeState();
    var open = rows.filter(function (v) { return !v.out; }), forced = rows.filter(function (v) { return v.forced; }).length;
    var list = App.members(), dd = App.fd(vm.day);
    var trs = rows.map(function (v) {
      var m = App.member(v.mid, list) || { name: v.name, av: "av-3" }, comp = v.type === "companion", na = '<span class="subtle" data-na>' + tx("N/A — no dispara", "N/A — no shooting") + "</span>";
      var audit = (v.out ? '<span class="small">' + App.dur(v.out - v.in) + "</span>" : '<span class="small subtle">' + App.dur(Date.now() - v.in) + tx(" hasta ahora", " so far") + "</span>") +
        '<div class="xs subtle">' + tx("Entrada: ", "In: ") + App.esc(App.byLabel(v.inBy)) + (v.out ? " · " + tx("Salida: ", "Out: ") + App.esc(App.byLabel(v.outBy)) : "") + "</div>" +
        (v.forced ? '<span class="badge badge--lapsed" data-forced>' + ic("alert") + tx("Salida forzada por personal · ", "Forced check-out by staff · ") + App.esc(v.outBy) + "</span>" : "");
      return '<tr' + (v.forced ? ' class="is-forced"' : "") + (v.host ? ' data-guest-row="' + v.type + '"' : "") + '><td><a class="row-3 plain" href="checkin.html?m=' + (v.host || v.mid) + '"><div class="avatar avatar-sm ' + (m.av || "av-1") + '">' + App.ini(v.name) + '</div><div style="min-width:0"><div style="font-weight:600" class="nowrap">' + App.esc(v.name) + '</div><div class="xs subtle">' + (v.host ? App.guestBadge(v) + " " + tx("con ", "with ") + App.esc(v.hostName || v.host) : v.mid) + "</div></div></a></td>" +
        '<td class="nowrap">' + dd + "</td>" +
        '<td class="nowrap small">' + (comp ? na : '<span class="mono" data-lic-masked>' + App.mask(v.lic) + "</span>" + (isToday && m.lic ? '<div style="margin-top:3px">' + App.licBadge(m) + "</div>" : "")) + "</td>" +
        '<td class="nowrap" data-cal>' + (comp ? na : App.esc(v.cal || "—")) + "</td>" +
        '<td class="nowrap num">' + App.time(v.in) + '</td><td class="nowrap num">' + (v.out ? App.time(v.out) : '<span class="badge badge--active">' + ic("login") + tx("En el club", "On site") + "</span>") + "</td>" +
        '<td class="vt-audit">' + audit + "</td></tr>";
    }).join("") || '<tr><td colspan="7" class="subtle" style="padding:24px 16px">' + (vm.day > App.TODAY ? tx("Ese día todavía no ha llegado.", "That day hasn't happened yet.") : tx("No hay visitas registradas ese día (cerrado los lunes).", "No visits logged that day (closed Mondays).")) + "</td></tr>";
    var chips = '<div class="vl-stats"><div><span class="xs subtle">' + tx("Visitas", "Visits") + "</span><strong>" + rows.length + '</strong></div><div><span class="xs subtle">' + tx("En las instalaciones", "On site now") + '</span><strong data-onsite>' + open.length + '</strong></div><div><span class="xs subtle">' + tx("Sin hora de salida", "Missing time out") + "</span><strong>" + open.length + '</strong></div><div><span class="xs subtle">' + tx("Salidas forzadas", "Forced check-outs") + "</span><strong>" + forced + "</strong></div></div>";
    var head = '<div class="page-head"><div><h1>' + tx("Registro de visitas oficial", "Official visit log") + "</h1><p>" + tx("Reglamento 9172 de la Policía: nombre completo, fecha, licencia de armas, calibre, entrada y salida · horas AST · ", "PR Police Reglamento 9172: full name, date, gun license, caliber, time in and out · AST times · ") + t.name + '</p></div><div class="row wrap">' +
      '<label class="vl-date"><span class="xs subtle">' + tx("Día", "Day") + '</span><input class="input" type="date" id="vl-day" value="' + vm.day + '" min="' + App.addDays(App.TODAY, -30) + '" max="' + App.TODAY + '"></label>' +
      '<button type="button" class="btn btn-primary" data-act="csv">' + ic("download", "i-sm") + tx("Exportar CSV", "Export CSV") + "</button></div></div>";
    var closeBtn = isToday ? (c.on ? (c.sim ? '<button type="button" class="btn btn-ghost btn-sm" data-act="unsim">' + tx("Deshacer cierre simulado", "Undo simulated closing") + "</button>" : "") : '<button type="button" class="demo-btn demo-btn-sm" data-act="simClose">' + ic("zap", "i-sm") + "<span><strong>" + tx("Demo: simular cierre del día", "Demo: simulate closing time") + "</strong><small>" + tx("Cierre real: ", "Real closing: ") + App.hm(c.close) + "</small></span></button>") : "";
    var ex = exportsLog(), last = ex[ex.length - 1];
    return App.staffShell("visits", head + (isToday ? App.closeBanner(t.owner.name) : "") + '<div class="card"><div class="card-header wrap" style="gap:10px"><div><h2>' + App.fdl(vm.day) + '</h2><div class="small subtle">' + tx("El CSV lleva las 6 columnas del reglamento + «Tipo de visita» (miembro, invitado que dispara o invitado que no dispara). La columna de auditoría no se exporta.", "The CSV has the 6 regulation columns + “Visit type” (member, shooting guest or non-shooting guest). The audit column is not exported.") + "</div></div>" + closeBtn + "</div>" + chips +
      '<div class="table-wrap"><table class="table vtable"><thead><tr><th>' + tx("Nombre completo", "Full name") + "</th><th>" + tx("Fecha", "Date") + "</th><th>" + tx("Licencia de armas", "Gun license") + "</th><th>" + tx("Calibre utilizado", "Caliber used") + "</th><th>" + tx("Entrada", "Time in") + "</th><th>" + tx("Salida", "Time out") + '</th><th class="vt-audit">' + tx("Auditoría (no se exporta)", "Audit (not exported)") + "</th></tr></thead><tbody>" + trs + "</tbody></table></div>" +
      '<div class="card-footer small subtle">' + tx("Licencias enmascaradas (últimos 4). El CSV se genera en este navegador (funciona sin conexión). Días anteriores: historial de ejemplo.", "Licenses masked (last 4). The CSV is generated in this browser (works offline). Earlier days: sample history.") + (last ? " · " + tx("Exportaciones registradas: ", "Exports logged: ") + ex.length + tx(" (última: ", " (last: ") + App.time(last.at) + ", " + (last.full ? tx("oficial", "official") : tx("enmascarada", "masked")) + ")" : "") + "</div></div>");
  }
  function doExport(full) {
    var t = App.ten(), name = tx("registro-visitas-", "visit-log-") + App.tkey() + "-" + vm.day + (full ? tx("-oficial", "-official") : tx("-enmascarado", "-masked")) + ".csv";
    App.downloadCSV(name, App.visitCSV(vm.day, full));
    App.event({ type: "export", full: full, day: vm.day, by: t.owner.name, n: App.visitsFor(vm.day).length });
    App.closeModal(); App.keepScroll = true; App.rerender();
    App.toast(tx("CSV descargado · " + App.visitsFor(vm.day).length + " visitas", "CSV downloaded · " + App.visitsFor(vm.day).length + " visits") + (full ? tx(" · exportación registrada", " · export logged") : ""));
  }
  App.page({
    render: render,
    title: function () { return tx("Registro de visitas oficial", "Official visit log"); },
    after: function () { var d = document.getElementById("vl-day"); if (d) d.addEventListener("change", function () { if (d.value) { vm.day = d.value; App.rerender(); } }); },
    handlers: {
      csv: function () {
        var t = App.ten();
        App.modal({ render: function () {
          return '<div class="modal-head"><h2>' + tx("Exportar registro · ", "Export log · ") + App.fd(vm.day) + '</h2><button type="button" class="icon-btn" data-act="closeModal" aria-label="' + tx("Cerrar", "Close") + '">' + ic("x") + '</button></div><div class="modal-body stack-2">' +
            '<p class="small">' + tx("Columnas: nombre completo, fecha, número de licencia de armas, calibre utilizado, hora de entrada, hora de salida.", "Columns: full name, date, gun license number, caliber used, time in, time out.") + "</p>" +
            '<button type="button" class="radio-card pick" data-act="csvFull">' + ic("shield") + '<span class="grow"><strong>' + tx("Copia oficial para inspección", "Official copy for inspection") + '</strong><span class="xs subtle" style="display:block">' + tx("Número de licencia completo · solo el dueño (" + t.owner.name + ") · queda en el registro de accesos", "Full license number · owner only (" + t.owner.name + ") · recorded in the access log") + "</span></span></button>" +
            '<button type="button" class="radio-card pick" data-act="csvMasked">' + ic("download") + '<span class="grow"><strong>' + tx("Copia de trabajo", "Working copy") + '</strong><span class="xs subtle" style="display:block">' + tx("Licencia enmascarada (•••• últimos 4)", "License masked (•••• last 4)") + "</span></span></button>" +
            '<div class="callout">' + ic("info") + "<span>" + tx("Nunca se comparte automáticamente. Pedidos de la Policía o de un tribunal: pasar por el abogado.", "Never shared automatically. Police or court requests go through counsel.") + "</span></div></div>";
        } });
      },
      csvFull: function () { doExport(true); },
      csvMasked: function () { doExport(false); },
      simClose: function () { App.ts().closeSim = true; App.save(); App.rerender(); },
      unsim: function () { App.ts().closeSim = false; App.save(); App.rerender(); },
      forceAll: App.forceAllHandler(App.ten().owner.name)
    }
  });
  setInterval(function () { if (!App.modalDef && vm.day === App.TODAY && !document.activeElement.matches("input")) { App.keepScroll = true; App.rerender(); } }, 30000);
})();
