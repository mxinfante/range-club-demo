/* Demo outbox: today's reminder run (simulated scheduled job) + messages created during the demo.
   Nothing is sent; the SMS/email are rendered on screen in the member's preferred language. */
(function () {
  var tx = App.tx, ic = App.ic, vm = App.vm;
  function items() {
    var ts = App.ts(), out = [];
    ts.outbox.extra.slice().reverse().forEach(function (m, i) { out.push({ key: "x" + (ts.outbox.extra.length - 1 - i), msg: m, extra: true }); });
    if (ts.outbox.run) ts.outbox.run.msgs.forEach(function (m, i) { if (m.kind !== "skip") out.push({ key: "r" + i, msg: m }); });
    return out;
  }
  function kindLabel(msg) {
    if (msg.kind === "reminder" || msg.kind === "lic") return App.txa(App.STEPN[msg.step]);
    return { auto7: tx("Aviso de cobro · 7 días", "Charge notice · 7 days"), link: tx("Enlace desde recepción", "Link from front desk"), welcome: tx("Bienvenida", "Welcome"), receipt: tx("Recibo", "Receipt") }[msg.kind] || msg.kind;
  }
  function hrefFor(msg, ch) {
    if (msg.kind === "reminder" || msg.kind === "link") return "renew.html?m=" + msg.mid + "&src=link" + (msg.step ? "&step=" + msg.step : "") + "&ch=" + ch;
    if (msg.kind === "auto7") return "portal.html?m=" + msg.mid;
    if (msg.kind === "lic") return "portal.html?m=" + msg.mid + "#licencia";
    return "card.html?m=" + msg.mid;
  }
  /* license reminders follow the club's current channel settings (email + push + in-app by default; SMS only if turned on) */
  function chOf(msg) { return msg.kind === "lic" ? App.licChannels(App.member(msg.mid)) : msg.ch; }
  var CH_IC = { sms: "sms", email: "mail", push: "bell", app: "home" };
  function renewedSince(msg) { var m = App.member(msg.mid); return m && m.renewedAt && m.renewedAt > (msg.at || (App.ts().outbox.run || {}).at || 0); }

  /* character counter: GSM-7 160 = 1 segment; accents/ñ switch the whole text to UCS-2 (70 per segment) */
  function smsMeter(txt) {
    var I = App.smsInfo(txt), ok = I.seg === 1;
    return '<div class="sms-meter' + (ok ? " is-ok" : " is-warn") + '" data-sms-len="' + I.len + '" data-sms-seg="' + I.seg + '" data-sms-enc="' + I.enc + '">' + ic(ok ? "check-circle" : "alert", "i-xs") + "<span>" + I.len + "/" + I.max + " · " + I.seg + (I.seg === 1 ? tx(" segmento", " segment") : tx(" segmentos", " segments")) + " · " + I.enc + (I.enc === "UCS-2" ? tx(" (acentos)", " (accents)") : "") + "</span></div>";
  }
  function preview(it) {
    var msg = it.msg, R = App.renderMsg(msg), m = R.m, langName = R.L === "en" ? tx("Inglés", "English") : tx("Español", "Spanish");
    var ch = chOf(msg);
    var sms = ch.indexOf("sms") >= 0 ? '<div class="phone"><div class="phone-top"><div class="xs subtle">' + tx("Mensaje de texto", "Text message") + '</div><div style="font-weight:650;font-size:13.5px">' + App.ten().name + '</div></div><div class="phone-body"><div class="xs subtle center">' + tx("Hoy ", "Today ") + App.time(msg.at || App.ts().outbox.run.at) + '</div><div class="bubble">' + App.esc(R.sms).replace(App.esc(R.link), '<a href="' + hrefFor(msg, "sms") + '" data-link>' + R.link + "</a>").replace(App.ten().host + "/c", '<a href="card.html?m=' + msg.mid + '">' + App.ten().host + "/c</a>").replace(App.ten().host + "/p", '<a href="portal.html?m=' + msg.mid + '">' + App.ten().host + "/p</a>") + "</div>" + smsMeter(R.sms) + "</div></div>" : "";
    var push = ch.indexOf("push") >= 0 && R.push ? '<div class="phone push-pv" data-pv="push"><div class="phone-top"><div class="xs subtle">' + tx("Notificación push", "Push notification") + '</div><div style="font-weight:650;font-size:13.5px">' + tx("Pantalla bloqueada", "Lock screen") + '</div></div><div class="phone-body"><div class="push-card"><div class="row" style="gap:8px"><svg style="width:20px;height:20px;flex:none">' + App.mark(true) + '</svg><span class="xs" style="font-weight:700">' + App.esc(App.ten().name) + '</span><span class="grow"></span><span class="xs subtle">' + tx("ahora", "now") + '</span></div><div style="font-weight:700;font-size:14px;margin-top:6px">' + App.esc(R.push.title) + '</div><div class="small">' + App.esc(R.push.body) + "</div></div></div></div>" : "";
    var inapp = ch.indexOf("app") >= 0 && R.inapp ? '<div class="mail inapp-pv" data-pv="app"><div class="mail-head"><div class="xs subtle">' + tx("Aviso en la app y el portal", "In-app & portal notice") + '</div><div class="mail-subj">' + App.esc(R.inapp.title) + '</div></div><div class="mail-body"><p>' + App.esc(R.inapp.body) + '</p><div class="row wrap" style="gap:8px"><a class="btn btn-tenant btn-sm" href="' + hrefFor(msg, "app") + '">' + R.cta + '</a><a class="btn btn-secondary btn-sm" href="' + hrefFor(msg, "app") + '">' + tx("Ya radiqué la renovación", "I've filed my renewal") + "</a></div></div></div>" : "";
    var email = ch.indexOf("email") >= 0 ? '<div class="mail"><div class="mail-head"><div class="kv"><span class="k">' + tx("De", "From") + '</span><span class="v">' + App.ten().name + ' &lt;' + App.ten().email + '&gt;</span></div><div class="kv"><span class="k">' + tx("Para", "To") + '</span><span class="v">' + m.email + '</span></div><div class="mail-subj">' + App.esc(R.subj) + '</div></div><div class="mail-body"><svg class="tenant-mark" style="width:36px;height:36px">' + App.mark() + "</svg>" + R.body.map(function (p) { return "<p>" + App.esc(p) + "</p>"; }).join("") +
      '<a class="btn btn-tenant" href="' + hrefFor(msg, "email") + '">' + R.cta + "</a>" + (msg.kind === "reminder" || msg.kind === "link" ? '<p class="xs subtle">' + (R.L === "en" ? "Secure link, valid for 14 days and single-use. No password needed." : "Enlace seguro, válido por 14 días y de un solo uso. No necesitas contraseña.") + "</p>" : "") + "</div></div>" : "";
    var noSms = msg.noSms ? '<div class="callout">' + ic("info") + "<span>" + tx("Sin texto: este miembro no dio consentimiento para SMS. Solo email.", "No text: this member didn't consent to SMS. Email only.") + "</span></div>" : "";
    return '<div class="card"><div class="card-header"><div class="row-3"><div class="avatar ' + (m.av || "av-1") + '">' + App.ini(m.name || "?") + '</div><div><h2>' + App.esc(m.name) + '</h2><div class="small subtle">' + kindLabel(msg) + " · " + tx("idioma del miembro: ", "member language: ") + langName + "</div></div></div>" + (renewedSince(msg) ? '<span class="badge badge--active">' + ic("check-circle") + tx("Renovó", "Renewed") + "</span>" : "") + '</div><div class="card-body stack-4">' +
      (msg.kind === "lic" ? '<div class="callout info" data-lic-ch="' + ch.join(",") + '">' + ic("id") + "<span>" + App.licBadge(m) + " " + (ch.indexOf("sms") >= 0 ? tx("Email, push y en la app; el texto (SMS) está activado: va sin acentos (GSM-7) para caber en 1 segmento.", "Email, push and in-app; text (SMS) is on: no accents (GSM-7) so it fits in 1 segment.") : tx("Email, push y en la app. SMS apagado (opcional): las operadoras restringen mensajes relacionados con armas. ", "Email, push and in-app. SMS off (optional): carriers restrict firearms-related messages. ") + '<a href="settings.html#recordatorios">' + tx("Canales", "Channels") + "</a>") + "</span></div>" : "") +
      ((msg.kind === "reminder" || msg.kind === "link") && !renewedSince(msg) ? '<div class="callout info">' + ic("info") + "<span>" + tx("Toca el enlace del texto o el botón del email para abrir la renovación como el miembro.", "Tap the link in the text or the email button to open the renewal as the member.") + "</span></div>" : "") +
      noSms + '<div class="pv-grid">' + sms + push + email + inapp + "</div></div></div>";
  }

  function render() {
    var ts = App.ts(), its = items();
    var head = '<div class="page-head"><div><h1>' + tx("Mensajes de hoy (demo)", "Today's messages (demo)") + "</h1><p>" + tx("Simulado: nada se envía. Así se verían los textos y emails que recibe cada miembro, en su idioma preferido.", "Simulated: nothing is sent. This is how each member's texts and emails would look, in their preferred language.") + '</p></div><div class="row wrap">' +
      (ts.outbox.run ? '<span class="badge badge--neutral">' + ic("clock") + tx("Recordatorios ejecutados ", "Reminders ran ") + App.time(ts.outbox.run.at) + "</span>" : '<button type="button" class="btn btn-primary" data-act="run">' + ic("bell", "i-sm") + tx("Ejecutar recordatorios de hoy", "Run today's reminders") + ' <span class="demo-tag">DEMO</span></button>') + "</div></div>";
    if (!its.length) return App.staffShell("outbox", head + '<div class="card"><div class="res-empty"><div class="big">' + ic("send", "i-xl") + '</div><h2>' + tx("Todavía no hay mensajes", "No messages yet") + '</h2><p style="max-width:440px">' + tx("En producción, una tarea programada envía los recordatorios cada mañana. En la demo la ejecutas con este botón.", "In production a scheduled job sends reminders every morning. In the demo you run it with this button.") + '</p><button type="button" class="btn btn-primary btn-lg" data-act="run">' + ic("bell", "i-sm") + tx("Ejecutar recordatorios de hoy", "Run today's reminders") + "</button></div></div>");
    if (!vm.sel || !its.some(function (i) { return i.key === vm.sel; })) vm.sel = its[0].key;
    var cur = its.filter(function (i) { return i.key === vm.sel; })[0];
    var list = its.map(function (it) {
      var m = App.member(it.msg.mid) || { name: "?" }, on = it.key === vm.sel;
      return '<button type="button" class="ob-item' + (on ? " is-on" : "") + '" data-act="sel" data-v="' + it.key + '" aria-pressed="' + on + '"><div class="avatar avatar-sm ' + (m.av || "av-1") + '">' + App.ini(m.name) + '</div><div class="grow" style="min-width:0"><div class="row between" style="gap:6px"><strong class="truncate">' + App.esc(m.name) + '</strong><span class="ob-ch">' + chOf(it.msg).map(function (c) { return ic(CH_IC[c] || "mail", "i-xs"); }).join("") + '</span></div><div class="xs subtle truncate">' + (it.extra ? '<span class="ob-new">' + tx("Nuevo", "New") + "</span> " : "") + kindLabel(it.msg) + (m.pref === "en" ? " · EN" : "") + "</div></div>" + (renewedSince(it.msg) ? ic("check-circle", "i-sm ob-ok") : "") + "</button>";
    }).join("");
    var skips = ts.outbox.run ? ts.outbox.run.msgs.filter(function (m) { return m.kind === "skip"; }) : [];
    var skipHtml = skips.length ? '<div class="ob-skips"><div class="xs subtle" style="font-weight:650;text-transform:uppercase;letter-spacing:.06em">' + tx("Omitidos", "Skipped") + "</div>" + skips.map(function (s) { var m = App.member(s.mid) || {}; return '<div class="small">' + App.esc(m.name) + ' · <span class="subtle">' + App.txa(App.STEPN[s.step]) + " · " + (s.filed ? tx("renovación radicada · en pausa", "renewal filed · paused") : tx("tiene auto-renovación", "on auto-renew")) + "</span></div>"; }).join("") + "</div>" : "";
    return App.staffShell("outbox", head + '<div class="ob-grid"><div class="card ob-list"><div class="card-header"><h2>' + its.length + tx(" mensajes", " messages") + '</h2><span class="xs subtle">' + App.fd(App.TODAY) + "</span></div>" + list + skipHtml + "</div>" + preview(cur) + "</div>");
  }

  App.page({
    render: render,
    title: function () { return tx("Mensajes de demo", "Demo messages"); },
    handlers: {
      run: function () { App.runReminders(); vm.sel = null; App.rerender(); App.toast(tx("Recordatorios de hoy generados", "Today's reminders generated")); },
      sel: function (el) { vm.sel = el.dataset.v; App.rerender(); if (window.innerWidth < 900) { var pv = document.querySelector(".ob-grid > .card:last-child"); if (pv) pv.scrollIntoView({ behavior: "smooth" }); } }
    }
  });
})();
