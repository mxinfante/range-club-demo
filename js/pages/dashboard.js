/* Owner dashboard: KPIs (baseline + live demo deltas), sources, reminder steps, lapsed call list, visits. */
(function () {
  var tx = App.tx, ic = App.ic, money = App.money;
  var n = function (x) { return Math.round(x).toLocaleString("en-US"); };

  function feed() {
    var ev = App.ts().events.filter(function (e) { return e.type === "renewal" || e.type === "checkin" || e.type === "signup" || e.type === "waiver"; });
    if (!ev.length) return "";
    var all = App.ts().events, nR = all.filter(function (e) { return e.type === "renewal"; }), nS = all.filter(function (e) { return e.type === "signup"; }).length, nC = all.filter(function (e) { return e.type === "checkin"; }).length;
    var amt = nR.reduce(function (a, e) { return a + e.amount; }, 0) + all.filter(function (e) { return e.type === "signup"; }).reduce(function (a, e) { return a + e.amount; }, 0);
    var sum = '<span class="chip">' + ic("renew", "i-xs") + nR.length + tx(" renovación(es)", " renewal(s)") + '</span><span class="chip">' + ic("user-plus", "i-xs") + nS + tx(" inscripción(es)", " sign-up(s)") + '</span><span class="chip">' + ic("login", "i-xs") + nC + tx(" entrada(s)", " check-in(s)") + '</span><span class="chip">' + ic("dollar", "i-xs") + App.money(amt, false) + tx(" cobrado", " collected") + "</span>";
    var rows = ev.slice().reverse().slice(0, 4).map(function (e) {
      var what = e.type === "renewal" ? ic("renew", "i-sm") + "<span><strong>" + App.esc(e.name) + "</strong> " + tx("renovó", "renewed") + " · " + money(e.amount, false) + " · " + ({ link: tx("enlace", "link"), desk: tx("recepción", "desk"), portal: "portal" }[e.src] || e.src) + " · " + ({ paypal: "PayPal", card: tx("tarjeta", "card"), ath: "ATH Móvil" }[e.method] || "") + "</span>"
        : e.type === "checkin" ? ic("login", "i-sm") + "<span><strong>" + App.esc(e.name) + "</strong> " + tx("registró entrada", "checked in") + (e.where === "kiosk" ? tx(" (quiosco)", " (kiosk)") : "") + (e.guests && e.guests.length ? " +" + e.guests.length + tx(" invitado(s)", " guest(s)") : "") + "</span>"
        : e.type === "signup" ? ic("user-plus", "i-sm") + "<span><strong>" + App.esc(e.name) + "</strong> " + tx("se inscribió", "signed up") + " · " + money(e.amount, false) + "</span>"
        : ic("waiver", "i-sm") + "<span><strong>" + App.esc(e.name) + "</strong> " + tx("firmó el relevo v", "signed waiver v") + App.ten().waiver.v + "</span>";
      return '<li><span class="feed-t">' + App.time(e.at) + "</span>" + what + "</li>";
    }).join("");
    return '<section class="card live"><div class="card-header"><div class="row"><span class="live-dot"></span><h2>' + tx("En vivo en esta demo", "Live in this demo") + '</h2></div><span class="live-sum">' + sum + '</span></div><ul class="feed">' + rows + "</ul></section>";
  }

  function render() {
    var t = App.ten(), M = App.metrics(), b = t.base, ts = App.ts();
    var head = '<div class="page-head"><div class="row-4"><svg class="tenant-mark" style="width:48px;height:48px;flex:none">' + App.mark() + '</svg><div><h1>' + tx("Buenos días, ", "Good morning, ") + t.owner.first + '</h1><p>' + tx("Resumen de membresías de ", "Membership overview for ") + '<strong style="color:var(--n-800)">' + t.name + "</strong> · " + App.fdl(App.TODAY) + "</p></div></div>" +
      '<div class="row wrap">' + (ts.outbox.run
        ? '<a class="btn btn-secondary" href="outbox.html">' + ic("send", "i-sm") + tx("Ver mensajes de hoy", "View today's messages") + ' <span class="count">' + (ts.outbox.run.msgs.filter(function (m) { return m.kind !== "skip"; }).length + ts.outbox.extra.length) + "</span></a>"
        : '<button type="button" class="btn btn-primary" data-act="runReminders">' + ic("bell", "i-sm") + tx("Ejecutar recordatorios de hoy", "Run today's reminders") + ' <span class="demo-tag">DEMO</span></button>') +
      '<button type="button" class="btn btn-secondary" data-act="soon">' + ic("download", "i-sm") + tx("Exportar CSV", "Export CSV") + "</button></div></div>";

    var kpi = function (icon, bg, fg, label, value, sub, def, extra) { return '<div class="card kpi"' + (extra || "") + '><div class="kpi-label"><span class="kpi-icon" style="background:' + bg + ";color:" + fg + '">' + ic(icon) + "</span><span>" + label + '</span></div><div class="kpi-value">' + value + '</div><div class="kpi-sub">' + sub + '</div><div class="def">' + def + "</div></div>"; };
    var small = function (s) { return '<span style="font-size:18px;font-weight:600;color:var(--n-500);letter-spacing:0">' + s + "</span>"; };
    var kpis = '<section class="kpis">' +
      kpi("users", "var(--rc-50)", "var(--rc-600)", tx("Miembros activos", "Active members"), '<span data-kpi="active">' + n(M.active) + "</span>", n(M.activeOnly) + tx(" activas · ", " active · ") + n(M.graceN) + tx(" en gracia", " in grace"), tx("Miembros en estado Activa o En gracia", "Members with status Active or Grace")) +
      kpi("calendar", "var(--tenant-50)", "var(--tenant-600)", tx("Renovaciones por vencer", "Renewals due"), '<span data-kpi="due">' + n(M.dueN) + "</span> " + small("· " + money(M.dueV, false)), n(M.dueAuto) + tx(" con auto-renovación · ", " on auto-renew · ") + n(M.dueN - M.dueAuto) + tx(" por enlace o recepción", " by link or desk"), tx("Membresías que vencen en los próximos 30 días, con su valor", "Memberships expiring in the next 30 days, with value")) +
      kpi("renew", "var(--ok-50)", "var(--ok-600)", tx("Tasa de renovación", "Renewal rate"), b.rate.toFixed(1) + "%", '<span class="delta up">' + ic("trend-up", "i-xs") + " +" + b.rateDelta.toFixed(1) + " pts</span> " + tx("vs. ", "vs. ") + b.ratePrev.toFixed(1) + tx("% antes del piloto", "% before the pilot"), tx("Renovadas al final de los " + t.grace + " días de gracia ÷ vencían en el período (septiembre)", "Renewed by end of the " + t.grace + "-day grace ÷ due in the period (September)")) +
      kpi("alert", "var(--warn-50)", "var(--warn-600)", tx("Ingresos en riesgo", "Revenue at risk"), '<span data-kpi="risk">' + money(M.risk, false) + "</span>", n(M.graceN) + tx(" en gracia ", " in grace ") + money(M.graceV, false) + " · " + M.failedN + tx(" cobros fallidos ", " failed auto-renew ") + money(M.failedV, false), tx("Valor de membresías En gracia (" + t.grace + " días) más cobros de auto-renovación fallidos", "Value of memberships in Grace (" + t.grace + " days) plus failed auto-renew charges"), ' style="border-color:var(--warn-200);background:linear-gradient(180deg,#FFFBF2,#fff 60%)"') +
      "</section>";

    // sources + reminder steps
    var src = M.src, tot = src.link + src.portal + src.desk + src.auto;
    var pct = function (v) { return Math.round(v / tot * 100) + "%"; };
    var srcCard = function (k, icon, l) { return '<div class="src' + (k === "link" ? " is-link" : "") + '"><div class="l">' + ic(icon) + "<span>" + l + '</span></div><div class="v" data-src="' + k + '">' + src[k] + "<small>" + pct(src[k]) + "</small></div></div>"; };
    var order = ["d30", "d14", "d7", "d1", "d0", "g3"], mx = 0;
    order.forEach(function (k) { mx = Math.max(mx, M.steps[k][0] + M.steps[k][1]); });
    var chan = { d30: [tx("Solo email", "Email only"), "mail"], d14: [tx("Solo email", "Email only"), "mail"], d7: [tx("Email + texto", "Email + text"), "sms"], d1: [tx("Texto + email", "Text + email"), "sms"], d0: [tx("Texto + email", "Text + email"), "sms"], g3: [tx("Texto + email", "Text + email"), "sms"] };
    var bars = order.map(function (k) {
      var e = M.steps[k][0], s = M.steps[k][1], sum = e + s, w = sum / mx * 100;
      return '<div class="bar-row"><div class="bar-label"><strong>' + App.txa(App.STEPN[k]) + "</strong><span>" + ic(chan[k][1]) + chan[k][0] + '</span></div><div class="track"><div style="display:flex;width:' + w.toFixed(1) + '%">' + (e ? '<div class="seg-bar c-email" style="flex:' + e + '">' + e + "</div>" : "") + (s ? '<div class="seg-bar c-sms" style="flex:' + s + '">' + s + "</div>" : "") + '</div></div><div class="bar-total">' + sum + "</div></div>";
    }).join("");
    var sources = '<div class="card"><div class="card-header"><div><h2>' + tx("Renovaciones por origen", "Renewals by source") + '</h2><div class="small subtle">' + tx("Últimos 30 días · y qué paso de recordatorio generó las renovaciones por enlace", "Last 30 days · and which reminder step drove link renewals") + '</div></div><div class="legend"><span><i class="c-email"></i>Email</span><span><i class="c-sms"></i>' + tx("Texto", "Text") + "</span></div></div>" +
      '<div class="card-body"><div class="sources">' + srcCard("link", "send", tx("Enlace", "Reminder link")) + srcCard("portal", "user", "Portal") + srcCard("desk", "desk", tx("Recepción", "Desk")) + srcCard("auto", "renew", tx("Auto-renovación", "Auto-renew")) + "</div>" +
      '<div class="sub-h"><h3>' + tx("Renovaciones por enlace según el paso de recordatorio", "Link renewals by reminder step") + '</h3><span class="xs subtle">' + tx("Atribuidas al recordatorio cuyo enlace se usó", "Credited to the reminder whose link was used") + '</span></div><div class="bars">' + bars + "</div></div></div>";

    // renewal rate line
    var mo = b.months, xs = [44, 102, 160, 218, 276, 322], y = function (v) { return 112 - (v - 65) * 4; };
    var pts = mo.map(function (v, i) { return xs[i] + "," + y(v).toFixed(1); }).join(" ");
    var mlab = App.L() === "en" ? ["Apr", "May", "Jun", "Jul", "Aug", "Sep"] : ["abr", "may", "jun", "jul", "ago", "sep"];
    var chart = '<div class="card"><div class="card-header"><div><h2>' + tx("Tasa de renovación por mes", "Renewal rate by month") + '</h2><div class="small subtle">' + tx("Renovadas al final de gracia ÷ por vencer", "Renewed by end of grace ÷ due") + '</div></div></div><div class="card-body" style="padding-top:12px">' +
      '<svg viewBox="0 0 340 172" width="100%" role="img" aria-label="' + tx("Tasa de renovación por mes", "Renewal rate by month") + '"><g font-size="10.5" fill="#637083"><text x="0" y="36">85%</text><text x="0" y="76">75%</text><text x="0" y="116">65%</text></g><g stroke="#EDF0F4"><line x1="30" x2="336" y1="32" y2="32"/><line x1="30" x2="336" y1="72" y2="72"/><line x1="30" x2="336" y1="112" y2="112"/></g>' +
      '<defs><linearGradient id="ar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A55D4" stop-opacity=".18"/><stop offset="1" stop-color="#2A55D4" stop-opacity="0"/></linearGradient></defs>' +
      '<line x1="30" x2="336" y1="' + y(b.ratePrev).toFixed(1) + '" y2="' + y(b.ratePrev).toFixed(1) + '" stroke="#8F99A8" stroke-dasharray="4 4"/><text x="334" y="' + (y(b.ratePrev) + 14).toFixed(1) + '" text-anchor="end" font-size="10.5" fill="#4A5568">' + tx("Base antes del piloto ", "Pre-pilot baseline ") + b.ratePrev + "%</text>" +
      '<path d="M' + pts.split(" ").join(" L") + " L322 140 L44 140 Z\" fill=\"url(#ar)\"/><polyline points=\"" + pts + '" fill="none" stroke="#2A55D4" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' +
      mo.map(function (v, i) { return i < 5 ? '<circle cx="' + xs[i] + '" cy="' + y(v).toFixed(1) + '" r="3.5" fill="#fff" stroke="#2A55D4" stroke-width="2"/>' : '<circle cx="322" cy="' + y(v).toFixed(1) + '" r="5" fill="#2A55D4" stroke="#fff" stroke-width="2"/>'; }).join("") +
      '<g font-size="11.5" font-weight="700" fill="#121826" text-anchor="middle"><text x="44" y="' + (y(mo[0]) - 10).toFixed(1) + '">' + mo[0] + '</text><text x="318" y="' + (y(mo[5]) - 11).toFixed(1) + '">' + mo[5] + "</text></g>" +
      '<g font-size="11" fill="#637083" text-anchor="middle">' + mlab.map(function (l, i) { return '<text x="' + xs[i] + '" y="160"' + (i === 5 ? ' font-weight="700" fill="#121826"' : "") + ">" + l + "</text>"; }).join("") + "</g></svg>" +
      '<div class="callout info" style="margin-top:12px">' + ic("info") + "<div>" + tx("Septiembre: " + b.rateRenewed + " de " + b.rateDue + " membresías por vencer renovaron antes de terminar la gracia.", "September: " + b.rateRenewed + " of " + b.rateDue + " due memberships renewed by the end of grace.") + "</div></div></div></div>";

    // lapsed this month (call list) — computed from the tenant's members
    var list = App.members();
    var lapsed = list.filter(function (m) { return !m.hh && App.status(m, list) === "lapsed" && App.graceEnd(m, list) >= "2026-10-01"; })
      .sort(function (a, c) { return t.tiers[c.tier].price - t.tiers[a.tier].price || (App.graceEnd(c, list) < App.graceEnd(a, list) ? -1 : 1); });
    var rows = lapsed.slice(0, 5).map(function (m) {
      var tr = t.tiers[m.tier], hh = App.household(m, list).length, ge = App.graceEnd(m, list);
      return '<tr class="callrow"><td><a class="row-3 plain" href="checkin.html?m=' + m.id + '"><div class="avatar avatar-sm ' + (m.av || "av-1") + '">' + App.ini(m.name) + '</div><div><div style="font-weight:600" class="nowrap">' + m.name + '</div><div class="xs subtle nowrap">' + tx(tr.es, tr.en) + (hh > 1 ? " · " + hh + tx(" personas", " people") : "") + '</div></div></a></td><td class="nowrap num">' + m.phone + '</td><td class="nowrap">' + App.fds(ge) + '</td><td class="nowrap"><span class="row" style="gap:5px">' + ic(m.sms === false ? "mail" : "sms", "i-xs") + "<span>" + tx("Vencida · ", "Lapsed · ") + App.fds(ge) + '</span></span></td><td class="right num">' + money(tr.price) + '</td><td class="right"><a class="btn btn-secondary btn-sm call-btn" href="tel:' + m.phone.replace(/\D/g, "") + '" aria-label="' + tx("Llamar a ", "Call ") + m.name + '" title="' + tx("Llamar", "Call") + '">' + ic("phone-call", "i-xs") + "</a></td></tr>";
    }).join("") || '<tr><td colspan="6" class="subtle" style="padding:20px 16px">' + tx("No hay vencidas este mes.", "No lapsed members this month.") + "</td></tr>";
    var calls = '<div class="card"><div class="card-header"><div><h2>' + tx("Vencidas este mes", "Lapsed this month") + " · " + M.lapsedN + " · " + money(M.lapsedV, false) + '</h2><div class="small subtle">' + tx("Terminó la gracia de " + t.grace + " días sin renovar · lista para llamar, por valor", t.grace + "-day grace ended without renewal · call list, by value") + '</div></div><button type="button" class="btn btn-secondary btn-sm" data-act="soon">' + ic("download", "i-sm") + tx("Exportar CSV", "Export CSV") + "</button></div>" +
      '<div class="table-wrap"><table class="table calltable"><thead><tr><th>' + tx("Miembro", "Member") + "</th><th>" + tx("Móvil", "Mobile") + "</th><th>" + tx("Venció", "Lapsed") + "</th><th>" + tx("Último aviso", "Last notice") + '</th><th class="right">' + tx("Valor", "Value") + "</th><th></th></tr></thead><tbody>" + rows + "</tbody></table></div>" +
      '<div class="card-footer row between"><span class="small subtle">' + tx("Mostrando ", "Showing ") + Math.min(5, lapsed.length) + tx(" de ", " of ") + M.lapsedN + '</span><a class="small" href="members.html?tab=lapsed">' + tx("Ver todos los vencidos", "See all lapsed members") + " →</a></div></div>";

    // visits
    var days = b.days.slice(); days[13] = M.visitsToday;
    var dmax = Math.max.apply(null, days), DN = App.L() === "en" ? ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] : ["D", "L", "M", "X", "J", "V", "S"];
    var dayBars = days.map(function (v, i) {
      var iso = App.addDays(App.TODAY, i - 13), wd = new Date(iso + "T12:00:00Z").getUTCDay();
      return '<div class="day' + (i === 13 ? " is-today" : "") + (v === 0 ? " is-closed" : "") + '" title="' + App.fds(iso) + ": " + v + '"><div class="b" style="height:' + (v ? (v / dmax * 100).toFixed(1) : 100) + '%"></div><small>' + DN[wd] + "</small></div>";
    }).join("");
    var hrs = b.hours, hmax = Math.max.apply(null, hrs), sorted = hrs.slice().sort(function (a, c) { return c - a; });
    var hourRows = hrs.map(function (v, i) {
      var h = 8 + i, lab = App.L() === "en" ? ((h % 12) || 12) + (h < 12 ? " AM" : " PM") : ((h % 12) || 12) + (h < 12 ? " a. m." : " p. m.");
      return '<span class="nowrap">' + lab + '</span><div class="h-bar' + (v >= sorted[1] ? " peak" : "") + '" style="width:' + (v / hmax * 100).toFixed(1) + '%"></div><span class="n">' + v.toFixed(1) + "</span>";
    }).join("");
    var visits = '<div class="card"><div class="card-header"><div><h2>' + tx("Visitas", "Visits") + '</h2><div class="small subtle">' + tx("Entradas por día · últimos 14 días", "Check-ins per day · last 14 days") + '</div></div><div style="text-align:right"><div style="font-size:20px;font-weight:700;line-height:24px" data-kpi="visits">' + M.visitsToday + '</div><div class="xs subtle">' + tx("hoy hasta ahora", "today so far") + "</div></div></div>" +
      '<div class="card-body" style="padding-top:8px"><div class="days">' + dayBars + '</div><div class="xs subtle" style="margin:6px 0 16px">' + tx("Rayado = cerrado (lunes)", "Hatched = closed (Mondays)") + '</div><div class="sub-h" style="margin-bottom:8px"><h3>' + tx("Horas pico", "Peak hours") + '</h3><span class="xs subtle">' + tx("Promedio de entradas por hora · 30 días", "Avg. check-ins per hour · 30 days") + '</span></div><div class="hours">' + hourRows + "</div></div></div>";

    return App.staffShell("dashboard", head + feed() + kpis + '<section class="grid-2-1">' + sources + chart + '</section><section class="grid-2-1">' + calls + visits + "</section>");
  }

  App.page({
    render: render,
    title: function () { return tx("Panel", "Dashboard"); },
    handlers: {
      runReminders: function () {
        var msgs = App.runReminders();
        App.toast(tx(msgs.filter(function (m) { return m.kind !== "skip"; }).length + " recordatorios generados", msgs.filter(function (m) { return m.kind !== "skip"; }).length + " reminders generated"));
        setTimeout(function () { location.href = "outbox.html"; }, 500);
      },
      soon: function () { App.toast(tx("Exportar no forma parte de esta demo.", "Export isn't part of this demo."), "warn"); }
    }
  });
})();
