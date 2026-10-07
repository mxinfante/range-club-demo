/* Range Club clickable demo — core runtime.
   Everything runs in the browser; demo state lives in localStorage (falls back to memory).
   Nothing is sent to any server. */
(function () {
  "use strict";
  var KEY = "rangeclub-demo-v1";
  var TODAY = window.RC_TODAY;
  var D = window.RC_DATA;

  /* ------------------------------------------------------------ storage + state */
  var mem = null, storeOK = true;
  try { localStorage.setItem(KEY + "-probe", "1"); localStorage.removeItem(KEY + "-probe"); } catch (e) { storeOK = false; }
  function blankTenant() { return { m: {}, added: [], events: [], outbox: { run: null, extra: [] }, seq: 0, current: null }; }
  function fresh(prev) {
    return { v: 1, lang: (prev && prev.lang) || "es", tenant: (prev && prev.tenant) || "guayama", t: { guayama: blankTenant(), salinas: blankTenant() } };
  }
  function load() {
    if (mem) return mem;
    var s = null;
    if (storeOK) { try { s = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { s = null; } }
    if (!s || s.v !== 1) s = fresh();
    mem = s; return s;
  }
  function save() { if (storeOK) { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { } } }
  var S = load();

  /* URL overrides (?tenant=salinas&lang=en) let any link force a tenant/language; they persist. */
  var QS = new URLSearchParams(location.search);
  if (QS.get("tenant") && D[QS.get("tenant")]) S.tenant = QS.get("tenant");
  if (QS.get("lang") === "en" || QS.get("lang") === "es") S.lang = QS.get("lang");
  save();

  var App = window.App = { S: S, TODAY: TODAY, storeOK: storeOK, vm: {}, handlers: {} };
  App.q = function (k) { return QS.get(k); };
  App.save = save;
  App.tkey = function () { return S.tenant; };
  App.ten = function () { return D[S.tenant]; };
  App.ts = function () { return S.t[S.tenant]; };
  App.reset = function () {
    mem = fresh(S); S = App.S = mem; save();
  };

  /* ------------------------------------------------------------ i18n */
  App.L = function () { return S.lang; };
  var tx = App.tx = function (es, en) { return S.lang === "en" ? (en == null ? es : en) : es; };
  App.txa = function (a) { return a ? tx(a[0], a[1]) : ""; };
  App.setLang = function (l) { S.lang = l; save(); document.documentElement.lang = l; App.rerender(); };
  document.documentElement.lang = S.lang;

  /* ------------------------------------------------------------ dates + formatting */
  var MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  var MEN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var MESL = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  var MENL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var DES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"], DEN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  function pd(iso) { var a = iso.split("-"); return new Date(Date.UTC(+a[0], +a[1] - 1, +a[2])); }
  function iso(d) { return d.toISOString().slice(0, 10); }
  App.addDays = function (s, n) { var d = pd(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
  App.addMonths = function (s, n) { var d = pd(s); d.setUTCMonth(d.getUTCMonth() + n); return iso(d); };
  App.diff = function (a, b) { return Math.round((pd(a) - pd(b)) / 86400000); }; // a - b in days
  App.fd = function (s, lang) {
    if (!s) return "—"; var d = pd(s), l = lang || S.lang;
    return l === "en" ? MEN[d.getUTCMonth()] + " " + d.getUTCDate() + ", " + d.getUTCFullYear() : d.getUTCDate() + " " + MES[d.getUTCMonth()] + " " + d.getUTCFullYear();
  };
  App.fds = function (s, lang) {
    if (!s) return "—"; var d = pd(s), l = lang || S.lang;
    return l === "en" ? MEN[d.getUTCMonth()] + " " + d.getUTCDate() : d.getUTCDate() + " " + MES[d.getUTCMonth()];
  };
  App.fdl = function (s) {
    var d = pd(s);
    return S.lang === "en" ? DEN[d.getUTCDay()] + ", " + MENL[d.getUTCMonth()] + " " + d.getUTCDate() + ", " + d.getUTCFullYear()
      : DES[d.getUTCDay()] + ", " + d.getUTCDate() + " de " + MESL[d.getUTCMonth()] + " de " + d.getUTCFullYear();
  };
  App.time = function (ms, lang) {
    var d = ms ? new Date(ms) : new Date(), h = d.getHours(), m = ("0" + d.getMinutes()).slice(-2), l = lang || S.lang;
    var h12 = h % 12 || 12, pm = h >= 12;
    return l === "en" ? h12 + ":" + m + " " + (pm ? "PM" : "AM") : h12 + ":" + m + (pm ? " p. m." : " a. m.");
  };
  App.money = function (n, dec) { var s = (dec === false ? Math.round(n).toLocaleString("en-US") : n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })); return "$" + s; };
  App.esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  App.ini = function (name) { var p = name.split(" ").filter(Boolean); return ((p[0] || "")[0] + ((p[1] || "")[0] || "")).toUpperCase(); };
  App.first = function (name) { return name.split(" ")[0]; };
  App.mask = function (phone) { return phone.replace(/\) 555-/, ") •••-"); };
  App.norm = function (s) { return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim(); };

  /* ------------------------------------------------------------ member model */
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  App.members = function (opts) {
    var t = App.ten(), ts = App.ts(), initial = opts && opts.initial;
    var list = t.members.map(function (m) { var c = clone(m); if (!initial && ts.m[m.id]) Object.assign(c, ts.m[m.id]); return c; });
    if (!initial) ts.added.forEach(function (m) { var c = clone(m); if (ts.m[m.id]) Object.assign(c, ts.m[m.id]); list.push(c); });
    return list;
  };
  App.member = function (id, list) { var l = list || App.members(); for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; };
  App.primary = function (m, list) { return m.hh ? (App.member(m.hh, list) || m) : m; };
  App.household = function (p, list) { var l = list || App.members(); return l.filter(function (x) { return x.id === p.id || x.hh === p.id; }); };
  App.tier = function (m, list) { var p = App.primary(m, list); return App.ten().tiers[p.tier]; };
  App.tierName = function (k) { var t = App.ten().tiers[k]; return t ? tx(t.es, t.en) : ""; };
  App.update = function (id, patch) { var ts = App.ts(); ts.m[id] = Object.assign(ts.m[id] || {}, patch); save(); };

  App.status = function (m, list) {
    var p = App.primary(m, list), t = App.ten();
    if (m.status === "suspended") return "suspended";
    if (p.status === "pending" || p.status === "cancelled") return p.status;
    if (!p.expires) return "pending";
    if (p.expires >= TODAY) return "active";
    if (App.addDays(p.expires, t.grace) >= TODAY) return "grace";
    return "lapsed";
  };
  App.graceEnd = function (m, list) { var p = App.primary(m, list); return p.expires ? App.addDays(p.expires, App.ten().grace) : null; };
  App.passes = function (m, list) { var p = App.primary(m, list), tr = App.ten().tiers[p.tier]; var tot = tr ? tr.passes : 0; return [Math.max(0, tot - (p.used || 0)), tot]; };
  App.age = function (dobIso) { var d = pd(dobIso), n = pd(TODAY); var a = n.getUTCFullYear() - d.getUTCFullYear(); if (n.getUTCMonth() < d.getUTCMonth() || (n.getUTCMonth() === d.getUTCMonth() && n.getUTCDate() < d.getUTCDate())) a--; return a; };
  App.checkedInToday = function (id) { var e = App.ts().events; for (var i = e.length - 1; i >= 0; i--) if (e[i].type === "checkin" && e[i].id === id) return e[i]; return null; };

  /* Check-in rule (spec): membership Active (or Grace if allowed) AND current waiver version AND
     unexpired orientation (if required) AND not suspended AND verified age 21+. */
  App.evaluate = function (m, list) {
    var t = App.ten(), st = App.status(m, list), p = App.primary(m, list), tr = t.tiers[p.tier] || { price: 0 };
    var C = {}, B = [];
    var price = App.money(tr.price, false);
    if (st === "active") C.m = ["ok", ["Al día", "Current"], [tx("Vence ", "Expires ") + App.fds(p.expires)]];
    else if (st === "suspended") C.m = ["ok", ["Pagada", "Paid"], [tx("Vence ", "Expires ") + App.fds(p.expires)]];
    else if (st === "grace") {
      C.m = ["warn", ["En gracia", "In grace"], [tx("Hasta ", "Until ") + App.fds(App.graceEnd(m, list))]];
      B.push({ kind: t.checkinInGrace ? "warn" : "bad", icon: "clock", t: tx("Membresía en período de gracia", "Membership in grace period"),
        d: tx("Venció el " + App.fds(p.expires, "es") + " · la gracia termina el " + App.fds(App.graceEnd(m, list), "es") + ". Este club permite entrar durante la gracia; ofrece renovar hoy.",
          "Expired " + App.fds(p.expires, "en") + " · grace ends " + App.fds(App.graceEnd(m, list), "en") + ". This range allows check-in during grace; offer to renew today."),
        fix: tx("Renovar ahora · ", "Renew now · ") + price, act: "fixRenew", icon2: "renew", soft: t.checkinInGrace });
    } else if (st === "lapsed") {
      C.m = ["bad", ["Vencida", "Lapsed"], [tx("Desde ", "Since ") + App.fds(App.graceEnd(m, list))]];
      B.push({ kind: "bad", icon: "x-circle", t: tx("Membresía vencida", "Membership lapsed"),
        d: tx("Venció el " + App.fds(p.expires, "es") + " · la gracia terminó el " + App.fds(App.graceEnd(m, list), "es") + ". Renovar la reactiva al instante.",
          "Expired " + App.fds(p.expires, "en") + " · grace ended " + App.fds(App.graceEnd(m, list), "en") + ". Renewing reactivates it instantly."),
        fix: (m.hh ? tx("Renovar hogar · ", "Renew household · ") : tx("Renovar ahora · ", "Renew now · ")) + price, act: "fixRenew", icon2: "renew" });
    } else if (st === "pending") {
      C.m = ["bad", ["Sin pagar", "Unpaid"], [tx("Inscripción pendiente", "Sign-up pending")]];
      B.push({ kind: "bad", icon: "hourglass", t: tx("Inscripción pendiente de pago", "Sign-up not paid yet"), d: tx("Se inscribió en línea pero no completó el pago.", "Signed up online but didn't complete payment."), fix: tx("Cobrar inscripción · ", "Take payment · ") + price, act: "fixRenew", icon2: "card" });
    } else if (st === "cancelled") {
      C.m = ["bad", ["Cancelada", "Cancelled"], [tx("Desde ", "Since ") + App.fds(p.expires)]];
      B.push({ kind: "bad", icon: "minus-circle", t: tx("Membresía cancelada", "Membership cancelled"), d: tx("Puede volver a inscribirse hoy mismo.", "Can re-join today."), fix: tx("Reinscribir · ", "Re-join · ") + price, act: "fixRenew", icon2: "renew" });
    }
    if (m.waiver && m.waiver.v === t.waiver.v) C.w = ["ok", ["Al día", "Current"], [tx("Firmado ", "Signed ") + App.fds(m.waiver.date)]];
    else {
      C.w = ["req", m.waiver ? ["Firmó v" + m.waiver.v, "Signed v" + m.waiver.v] : ["Falta", "Missing"], [tx("Actual: v", "Current: v") + t.waiver.v]];
      B.push({ kind: "req", icon: "waiver", t: tx("Relevo no firmado en la versión actual", "Waiver not signed on current version"),
        d: m.waiver ? tx("Firmó la v" + m.waiver.v + " el " + App.fd(m.waiver.date, "es") + " · la versión actual es v" + t.waiver.v + " (" + App.fd(t.waiver.date, "es") + ").", "Signed v" + m.waiver.v + " on " + App.fd(m.waiver.date, "en") + " · current version is v" + t.waiver.v + " (" + App.fd(t.waiver.date, "en") + ").")
          : tx("No hay relevo firmado.", "No signed waiver on file."),
        fix: tx("Enviar relevo a la tableta", "Send waiver to tablet"), act: "fixWaiver", icon2: "tablet" });
    }
    if (!t.orientationRequired || (m.orient && m.orient.exp >= TODAY)) C.o = ["ok", ["Vigente", "Current"], [m.orient ? tx("Hasta ", "Until ") + App.fds(m.orient.exp) : "—"]];
    else {
      C.o = ["req", m.orient ? ["Vencida", "Expired"] : ["Falta", "Missing"], [m.orient ? tx("Venció ", "Expired ") + App.fds(m.orient.exp) : tx("Sin registro", "None on file")]];
      B.push({ kind: "req", icon: "orientation", t: m.orient ? tx("Orientación vencida", "Orientation expired") : tx("Orientación faltante", "Orientation missing"),
        d: m.orient ? tx("Completada el " + App.fd(m.orient.done, "es") + " · venció el " + App.fd(m.orient.exp, "es") + " (válida 12 meses).", "Completed " + App.fd(m.orient.done, "en") + " · expired " + App.fd(m.orient.exp, "en") + " (valid 12 months).")
          : tx("Este club requiere orientación de seguridad antes de la primera visita.", "This range requires a safety orientation before the first visit."),
        fix: tx("Registrar orientación", "Record orientation"), act: "fixOrient", icon2: "orientation" });
    }
    if (st === "suspended") {
      var inc = m.incident || {};
      C.s = ["ban", ["Suspendido", "Suspended"], [App.fds(inc.date)]];
      B.unshift({ kind: "ban", icon: "ban", t: tx("Suspendido por RSO", "Suspended by RSO"),
        d: tx("Incidente del " + App.fds(inc.date, "es") + ": " + inc.es + ". Reportado por " + inc.by + " (RSO).", "Incident " + App.fds(inc.date, "en") + ": " + inc.en + ". Reported by " + inc.by + " (RSO)."),
        fix: tx("Llamar al dueño", "Call the owner"), act: "fixCall", icon2: "phone-call", dark: true });
    } else C.s = ["ok", ["Al día", "Clear"], [tx("Sin incidentes", "No incidents")]];
    C.a = ["ok", ["Verificada", "Verified"], [m.dob ? App.age(m.dob) + tx(" años", " yrs") : "21+"]];
    var hard = B.filter(function (b) { return b.kind !== "warn"; });
    var can = hard.length === 0;
    var hero = st === "suspended" ? "suspended" : (can ? (st === "grace" ? "grace" : "go") : "stop");
    return { st: st, C: C, B: B, can: can, hero: hero, hard: hard.length };
  };

  /* ------------------------------------------------------------ actions */
  App.event = function (e) { e.at = e.at || Date.now(); App.ts().events.push(e); save(); return e; };
  App.nextReceipt = function () { var ts = App.ts(), t = App.ten(); ts.seq++; save(); return t.prefix + "-R-2026-0" + (t.receiptBase + ts.seq); };
  App.renew = function (id, o) {
    var list = App.members(), m = App.member(id, list), p = App.primary(m, list), st = App.status(p, list), t = App.ten();
    var tierKey = o.tier || p.tier, tr = t.tiers[tierKey];
    var from = (st === "active" || st === "grace") && p.expires ? p.expires : TODAY;
    var exp = tr.term === "month" ? App.addMonths(from, 1) : App.addMonths(from, 12);
    var auto = o.autorenew && o.method !== "ath" ? o.method : null;
    var receipt = App.nextReceipt();
    App.update(p.id, { tier: tierKey, expires: exp, status: null, used: 0, autorenew: auto, renewedAt: Date.now(), renewedSrc: o.src });
    App.event({ type: "renewal", id: p.id, name: p.name, src: o.src, method: o.method, amount: tr.price, tier: tierKey, prev: st, exp: exp, receipt: receipt, step: o.step || null, ch: o.ch || null });
    if (o.src !== "desk") { App.ts().current = p.id; save(); }
    App.queueMsg({ kind: "receipt", mid: p.id, ch: ["email"] });
    return { receipt: receipt, exp: exp, tier: tr, amount: tr.price, prev: st, auto: auto };
  };
  App.checkin = function (id, guests, where) {
    var list = App.members(), m = App.member(id, list), p = App.primary(m, list);
    var g = guests || [];
    if (g.length) App.update(p.id, { used: (p.used || 0) + g.length });
    App.update(m.id, { last: TODAY });
    return App.event({ type: "checkin", id: m.id, name: m.name, guests: g, where: where || "desk" });
  };
  App.signWaiver = function (id, o) {
    App.update(id, { waiver: { v: App.ten().waiver.v, date: TODAY, lang: o.lang || "es" } });
    App.event({ type: "waiver", id: id, name: (App.member(id) || {}).name, lang: o.lang || "es", where: o.where || "tablet" });
  };
  App.recordOrientation = function (id) {
    App.update(id, { orient: { done: TODAY, exp: App.addMonths(TODAY, 12) } });
    App.event({ type: "orientation", id: id, name: (App.member(id) || {}).name });
  };
  App.nextId = function () {
    var used = App.members().map(function (m) { return m.id; });
    var ids = App.ten().newIds.filter(function (i) { return used.indexOf(i) < 0; });
    return ids[0] || null;
  };
  App.queueMsg = function (msg) { msg.at = Date.now(); App.ts().outbox.extra.push(msg); save(); };

  /* Today's reminder run (spec: 30/14/7/1 days before, expiry day, grace, lapsed; auto-renew members get charge notices). */
  App.runReminders = function () {
    var t = App.ten(), list = App.members(), msgs = [];
    list.filter(function (m) { return !m.hh && m.expires && m.status !== "pending" && m.status !== "cancelled" && m.status !== "suspended"; }).forEach(function (m) {
      var d = App.diff(m.expires, TODAY), step = null;
      if (d === 30) step = "d30"; else if (d === 14) step = "d14"; else if (d === 7) step = "d7"; else if (d === 1) step = "d1"; else if (d === 0) step = "d0";
      else if (d === -3) step = "g3"; else if (d === -(t.grace + 1)) step = "lapsed";
      if (!step) return;
      if (m.autorenew) {
        if (step === "d7") msgs.push({ kind: "auto7", mid: m.id, ch: ["email", "sms"] });
        else msgs.push({ kind: "skip", mid: m.id, step: step, ch: [] });
        return;
      }
      var ch = (step === "d30" || step === "d14") ? ["email"] : (m.sms === false ? ["email"] : ["sms", "email"]);
      msgs.push({ kind: "reminder", mid: m.id, step: step, ch: ch, noSms: m.sms === false && step !== "d30" && step !== "d14" });
    });
    var order = { d1: 0, d0: 1, d7: 2, g3: 3, lapsed: 4, d14: 5, d30: 6 };
    msgs.sort(function (a, b) { return (a.kind === "skip") - (b.kind === "skip") || ((a.step in order) ? order[a.step] : 2.5) - ((b.step in order) ? order[b.step] : 2.5); });
    App.ts().outbox.run = { at: Date.now(), msgs: msgs }; save();
    return msgs;
  };
  App.STEPN = { d30: ["30 días antes", "30 days before"], d14: ["14 días antes", "14 days before"], d7: ["7 días antes", "7 days before"], d1: ["1 día antes", "1 day before"], d0: ["Día de vencimiento", "Expiry day"], g3: ["En gracia · día 3", "Grace · day 3"], lapsed: ["Vencida", "Lapsed"] };

  /* Message templates are rendered in the MEMBER's preferred language (not the UI language). */
  App.renderMsg = function (msg) {
    var t = App.ten(), list = App.members(), m = App.member(msg.mid, list) || {}, L = m.pref || "es";
    var ini = App.member(msg.mid, App.members({ initial: true })) || m; // reminder text reflects the membership at send time
    var tr = t.tiers[ini.tier] || t.tiers.ind, first = App.first(m.name || ""), link = t.host + "/r/" + tokenFor(msg.mid);
    var e = function (es, en) { return L === "en" ? en : es; };
    var exp = App.fds(ini.expires, L), ge = ini.expires ? App.fds(App.addDays(ini.expires, t.grace), L) : "";
    var when = { d30: e("el " + exp, "on " + exp), d14: e("el " + exp, "on " + exp), d7: e("el " + exp, "on " + exp), d1: e("mañana, " + exp, "tomorrow, " + exp), d0: e("hoy", "today") }[msg.step];
    var sms, subj, body, cta = e("Renovar ahora", "Renew now");
    if (msg.kind === "reminder") {
      if (msg.step === "g3") { sms = e(t.name + ": " + first + ", tu membresía venció el " + exp + ". Tienes hasta el " + ge + " para renovar: " + link + " · STOP para salir", t.name + ": " + first + ", your membership expired " + exp + ". You have until " + ge + " to renew: " + link + " · Reply STOP to opt out"); subj = e("Tu membresía venció: renueva antes del " + ge, "Your membership expired: renew by " + ge); }
      else if (msg.step === "lapsed") { sms = e(t.name + ": " + first + ", tu membresía está vencida. Renueva en 1 minuto cuando quieras: " + link + " · STOP para salir", t.name + ": " + first + ", your membership has lapsed. Renew in 1 minute anytime: " + link + " · Reply STOP to opt out"); subj = e("Te extrañamos en " + t.name, "We miss you at " + t.name); }
      else { sms = e(t.name + ": Hola " + first + ", tu membresía vence " + when + ". Renueva en 1 minuto: " + link + " · STOP para salir", t.name + ": Hi " + first + ", your membership expires " + when + ". Renew in 1 minute: " + link + " · Reply STOP to opt out"); subj = msg.step === "d1" ? e("Tu membresía vence mañana", "Your membership expires tomorrow") : msg.step === "d0" ? e("Tu membresía vence hoy", "Your membership expires today") : e("Tu membresía vence el " + exp, "Your membership expires " + exp); }
      body = [e("Hola " + first + ",", "Hi " + first + ","),
        msg.step === "g3" || msg.step === "lapsed" ? e("Tu membresía " + tr.es + " venció el " + exp + ".", "Your " + tr.en + " membership expired " + exp + ".") : e("Tu membresía " + tr.es + " vence " + when + ".", "Your " + tr.en + " membership expires " + when + "."),
        e("Renueva en un minuto, sin contraseña: " + App.money(tr.price) + " con PayPal, tarjeta o ATH Móvil.", "Renew in a minute, no password: " + App.money(tr.price) + " with PayPal, card or ATH Móvil.")];
    } else if (msg.kind === "auto7") {
      var mth = m.autorenew === "paypal" ? "PayPal" : e("tu tarjeta", "your card");
      sms = e(t.name + ": " + first + ", el " + exp + " cobraremos " + App.money(tr.price) + " a " + mth + " para renovar tu membresía. Para cancelar: " + t.host + "/p · STOP para salir", t.name + ": " + first + ", on " + exp + " we'll charge " + App.money(tr.price) + " to " + mth + " to renew your membership. To cancel: " + t.host + "/p · Reply STOP to opt out");
      subj = e("Próximo cobro de auto-renovación: " + exp, "Upcoming auto-renew charge: " + exp);
      body = [e("Hola " + first + ",", "Hi " + first + ","), e("Tu membresía se renovará automáticamente el " + exp + " por " + App.money(tr.price) + ".", "Your membership will renew automatically on " + exp + " for " + App.money(tr.price) + "."), e("Puedes cancelar la auto-renovación desde tu portal en cualquier momento.", "You can cancel auto-renew from your portal at any time.")];
      cta = e("Ver mi portal", "Open my portal");
    } else if (msg.kind === "link") {
      sms = e(t.name + ": Hola " + first + ", aquí tienes tu enlace para renovar en 1 minuto: " + link + " · STOP para salir", t.name + ": Hi " + first + ", here's your link to renew in 1 minute: " + link + " · Reply STOP to opt out");
      subj = e("Tu enlace para renovar", "Your renewal link"); body = [e("Hola " + first + ",", "Hi " + first + ","), e("Desde recepción te enviamos tu enlace seguro para renovar.", "The front desk sent you your secure renewal link.")];
    } else if (msg.kind === "welcome") {
      sms = e(t.name + ": ¡Bienvenido/a, " + first + "! Tu membresía está activa. Tu tarjeta digital: " + t.host + "/c · Responde STOP para salir, HELP para ayuda.", t.name + ": Welcome, " + first + "! Your membership is active. Your digital card: " + t.host + "/c · Reply STOP to opt out, HELP for help.");
      subj = e("Bienvenido/a a " + t.name, "Welcome to " + t.name); body = [e("Hola " + first + ",", "Hi " + first + ","), e("Tu membresía " + (t.tiers[m.tier] || tr).es + " está activa hasta el " + App.fd(m.expires, "es") + ".", "Your " + (t.tiers[m.tier] || tr).en + " membership is active until " + App.fd(m.expires, "en") + "."), e("Adjuntamos tu relevo firmado en PDF.", "Your signed waiver PDF is attached.")];
      cta = e("Ver mi tarjeta digital", "View my digital card");
    } else if (msg.kind === "receipt") {
      var p2 = App.member(msg.mid, list) || m, tr2 = t.tiers[p2.tier] || tr;
      subj = e("Recibo: membresía renovada hasta el " + App.fd(p2.expires, "es"), "Receipt: membership renewed until " + App.fd(p2.expires, "en"));
      body = [e("Hola " + first + ",", "Hi " + first + ","), e("Recibimos tu pago de " + App.money(tr2.price) + ". Tu membresía está activa hasta el " + App.fd(p2.expires, "es") + ".", "We received your payment of " + App.money(tr2.price) + ". Your membership is active until " + App.fd(p2.expires, "en") + ".")];
      cta = e("Ver mi tarjeta digital", "View my digital card");
    }
    return { m: m, L: L, sms: sms, subj: subj, body: body || [], cta: cta, link: link };
  };
  function tokenFor(id) { var h = 0; for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0; return (h.toString(36).toUpperCase() + "QX9ZK").slice(0, 6); }

  /* ------------------------------------------------------------ metrics (baseline + live demo deltas) */
  function agg(list) {
    var t = App.ten(), a = { active: 0, graceN: 0, graceV: 0, lapsedN: 0, lapsedV: 0, dueN: 0, dueV: 0, dueAuto: 0, counts: { all: 0, pending: 0, active: 0, grace: 0, lapsed: 0, suspended: 0, cancelled: 0 } };
    var end30 = App.addDays(TODAY, 30);
    list.forEach(function (m) {
      var st = App.status(m, list); a.counts.all++; a.counts[st]++;
      if (st === "active" || st === "grace") a.active++;
      if (m.hh) return;
      var tr = t.tiers[m.tier]; if (!tr) return;
      if (st === "grace") { a.graceN++; a.graceV += tr.price; }
      if (st === "lapsed") { var ge = App.graceEnd(m, list); if (ge >= "2026-10-01" && ge < TODAY) { a.lapsedN++; a.lapsedV += tr.price; } }
      if ((st === "active") && m.expires >= TODAY && m.expires <= end30) { a.dueN++; a.dueV += tr.price; if (m.autorenew) a.dueAuto++; }
    });
    return a;
  }
  App.metrics = function () {
    var t = App.ten(), b = t.base, cur = App.members(), a1 = agg(cur), a0 = agg(App.members({ initial: true }));
    var d = function (k) { return a1[k] - a0[k]; };
    var ev = App.ts().events, ren = ev.filter(function (e) { return e.type === "renewal"; });
    var src = Object.assign({}, b.src); ren.forEach(function (e) { if (src[e.src] != null) src[e.src]++; });
    var steps = clone(b.steps); ren.forEach(function (e) { if (e.src === "link" && e.step && steps[e.step]) { var i = (e.step === "d30" || e.step === "d14") ? 0 : (e.ch === "email" ? 1 : 0); steps[e.step][i]++; } });
    var checkins = ev.filter(function (e) { return e.type === "checkin"; });
    var visits = checkins.reduce(function (n, e) { return n + 1 + (e.guests || []).length; }, 0);
    var counts = {}; Object.keys(b.counts).forEach(function (k) { counts[k] = b.counts[k] + a1.counts[k] - a0.counts[k]; });
    var graceV = b.graceV + d("graceV");
    return {
      active: b.active + d("active"), activeOnly: b.counts.active + a1.counts.active - a0.counts.active, graceN: b.graceN + d("graceN"), graceV: graceV,
      dueN: b.dueN + d("dueN"), dueV: b.dueV + d("dueV"), dueAuto: b.dueAuto + d("dueAuto"),
      risk: graceV + b.failedV, failedN: b.failedN, failedV: b.failedV,
      lapsedN: b.lapsedN + d("lapsedN"), lapsedV: b.lapsedV + d("lapsedV"),
      rate: b.rate, rateDelta: b.rateDelta, ratePrev: b.ratePrev, renewalsToday: ren.length, signupsToday: ev.filter(function (e) { return e.type === "signup"; }).length,
      src: src, steps: steps, visitsToday: b.days[13] + visits, checkinsToday: checkins.length, counts: counts, households: b.households + App.ts().added.filter(function (m) { return !m.hh; }).length
    };
  };

  /* ------------------------------------------------------------ small UI helpers */
  var ic = App.ic = function (n, c) { return '<svg class="i' + (c ? " " + c : "") + '" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; };
  App.STATUS = { pending: ["Pendiente", "Pending", "hourglass"], active: ["Activa", "Active", "check-circle"], grace: ["En gracia", "Grace", "clock"], lapsed: ["Vencida", "Lapsed", "x-circle"], suspended: ["Suspendida", "Suspended", "ban"], cancelled: ["Cancelada", "Cancelled", "minus-circle"] };
  App.badge = function (st, lg) { var s = App.STATUS[st]; return '<span class="badge badge--' + st + (lg ? " badge-lg" : "") + '">' + ic(s[2]) + tx(s[0], s[1]) + "</span>"; };
  App.langSeg = function (dark) {
    return '<div class="seg' + (dark ? " on-dark" : "") + '" role="group" aria-label="' + tx("Idioma", "Language") + '"><button type="button" data-act="lang" data-v="es" aria-pressed="' + (S.lang === "es") + '">ES</button><button type="button" data-act="lang" data-v="en" aria-pressed="' + (S.lang === "en") + '">EN</button></div>';
  };
  App.tenantSeg = function () {
    return '<div class="seg" role="group" aria-label="' + tx("Club", "Range") + '"><button type="button" data-act="tenant" data-v="guayama" aria-pressed="' + (S.tenant === "guayama") + '">Guayama</button><button type="button" data-act="tenant" data-v="salinas" aria-pressed="' + (S.tenant === "salinas") + '">Salinas</button></div>';
  };
  App.mark = function (inv) { return '<use href="#' + App.ten().mark + (inv ? "-inv" : "") + '"/>'; };
  App.qr = function (id) { return "assets/qr/" + id + ".svg"; };
  App.portrait = function (m, size) { return window.portrait(m.p || 0, size); };
  App.powered = function () { return '<span class="powered"><svg><use href="#rc-mark"/></svg>' + tx("Con la tecnología de Range Club", "Powered by Range Club") + "</span>"; };

  App.toast = function (msg, kind) {
    var el = document.createElement("div"); el.className = "toast" + (kind ? " " + kind : ""); el.setAttribute("role", "status");
    el.innerHTML = ic(kind === "warn" ? "info" : "check-circle") + "<span>" + msg + "</span>";
    document.body.appendChild(el); setTimeout(function () { el.classList.add("out"); }, 2600); setTimeout(function () { el.remove(); }, 3100);
  };

  /* ------------------------------------------------------------ modal */
  App.modal = function (def) { App.modalDef = def; renderModal(); };
  App.closeModal = function () { var d = App.modalDef; App.modalDef = null; renderModal(); if (d && d.onClose) d.onClose(); };
  function renderModal() {
    var host = document.getElementById("modal-host");
    if (!host) { host = document.createElement("div"); host.id = "modal-host"; document.body.appendChild(host); }
    if (!App.modalDef) { host.innerHTML = ""; document.body.classList.remove("has-modal"); return; }
    host.innerHTML = '<div class="overlay" data-act="modalBackdrop"><div class="modal' + (App.modalDef.wide ? " wide" : "") + '" role="dialog" aria-modal="true">' + App.modalDef.render() + "</div></div>";
    document.body.classList.add("has-modal");
    if (App.modalDef.after) App.modalDef.after(host);
  }
  App.renderModal = renderModal;

  /* ------------------------------------------------------------ demo steps (presenter path; mirrors the spec's demo script) */
  App.STEPS = [
    { n: 1, page: "signup", href: "signup.html", t: ["Inscripción desde el teléfono", "Sign-up on a phone"], d: ["Un miembro nuevo elige plan, valida 21+, firma el relevo bilingüe y acepta textos.", "A new member picks a plan, passes the 21+ check, signs the bilingual waiver and opts in to texts."] },
    { n: 2, page: "outbox", href: "dashboard.html", t: ["Recordatorios de hoy", "Today's reminders"], d: ["Desde el panel, el dueño ejecuta los recordatorios; la bandeja de demo muestra el texto y el email en español con el enlace.", "From the dashboard the owner runs today's reminders; the demo outbox shows the Spanish text and email with the one-click link."] },
    { n: 3, page: "renew", href: "renew.html", t: ["Renovación en un clic", "One-click renewal"], d: ["El miembro toca el enlace y renueva con PayPal, tarjeta o ATH Móvil, sin iniciar sesión.", "The member taps the link and renews with PayPal, card or ATH Móvil, no login."] },
    { n: 4, page: "card", href: "portal.html", t: ["Portal y tarjeta digital", "Portal & digital card"], d: ["La membresía ya está Activa; su tarjeta QR es la que se escanea en recepción.", "The membership is now Active; the QR card is what the front desk scans."] },
    { n: 5, page: "checkin", href: "checkin.html", t: ["Recepción: escanear tarjetas", "Front desk: scan cards"], d: ["Uno pasa, uno bloqueado por membresía vencida (Renovar ahora → entra) y uno por relevo; cada solución a un toque.", "One cleared, one blocked for a lapsed membership (Renew now → checked in), one for a waiver; each fix one tap away."] },
    { n: 6, page: "dashboard", href: "dashboard.html", t: ["Panel del dueño", "Owner dashboard"], d: ["Renovaciones por vencer, tasa, ingresos en riesgo y por origen; los números reflejan lo que acabas de hacer.", "Renewals due, rate, revenue at risk and by source; the numbers reflect what you just did."] },
    { n: 7, page: "kiosk", href: "kiosk.html", t: ["Modo quiosco", "Kiosk mode"], d: ["Autoservicio: el miembro escanea su tarjeta y entra, o firma el relevo ahí mismo.", "Self-service: the member scans their card and checks in, or signs the waiver right there."] },
    { n: 8, page: "salinas", href: "dashboard.html?tenant=salinas", t: ["Cambiar a Club de Tiro Salinas", "Switch to Club de Tiro Salinas"], d: ["Otra marca y otros miembros; nada de los datos de Guayama.", "Its own brand and members; none of Guayama's data."] }
  ];
  App.stepFor = function (page) { for (var i = 0; i < App.STEPS.length; i++) if (App.STEPS[i].page === page) return App.STEPS[i]; return null; };

  /* ------------------------------------------------------------ staff shell */
  var NAV = [
    ["dashboard", "dashboard", "Panel", "Dashboard", "dashboard.html"],
    ["checkin", "login", "Registrar entrada", "Check-in", "checkin.html"],
    ["members", "users", "Miembros", "Members", "members.html"],
    ["outbox", "send", "Mensajes (demo)", "Messages (demo)", "outbox.html"],
    ["kiosk", "tablet", "Modo quiosco", "Kiosk mode", "kiosk.html"]
  ];
  var NAV2 = [["layers", "Planes y precios", "Plans & pricing"], ["bell", "Recordatorios", "Reminders"], ["settings", "Ajustes del club", "Range settings"]];
  App.staffShell = function (active, inner) {
    var t = App.ten();
    var nav = NAV.map(function (n) {
      return '<a class="nav-item' + (n[0] === active ? " is-active" : "") + '" href="' + n[4] + '"' + (n[0] === active ? ' aria-current="page"' : "") + ">" + ic(n[1]) + "<span>" + tx(n[2], n[3]) + "</span></a>";
    }).join("");
    var nav2 = NAV2.map(function (n) { return '<span class="nav-item is-disabled" title="' + tx("Fuera del alcance de esta demo", "Not part of this demo") + '">' + ic(n[0]) + "<span>" + tx(n[1], n[2]) + '</span><span class="nav-off">' + tx("demo", "demo") + "</span></span>"; }).join("");
    return '<div class="app">' +
      '<aside class="sidebar" id="sidebar"><div class="sidebar-inner">' +
      '<a class="rc-logo" href="index.html"><svg><use href="#rc-mark"/></svg><span>Range Club</span></a>' +
      '<button type="button" class="tenant-switch" data-act="tenantMenu" aria-haspopup="true"><svg class="tenant-mark">' + App.mark() + '</svg><div class="grow"><div class="t-name">' + t.name + '</div><div class="t-sub">' + t.host + "</div></div>" + ic("chev-up-down", "i-sm subtle") + "</button>" +
      '<nav class="nav" aria-label="' + tx("Principal", "Main") + '"><div class="nav-label">' + tx("Operación", "Operations") + "</div>" + nav + '<div class="nav-label">' + tx("Configuración", "Setup") + "</div>" + nav2 + "</nav>" +
      '<div class="sidebar-foot"><div class="staff-chip"><div class="avatar avatar-sm av-1">' + t.owner.ini + '</div><div class="grow" style="line-height:16px"><div style="font-weight:600;font-size:13px">' + t.owner.name + '</div><div class="xs subtle">' + tx("Dueño/a", "Owner") + "</div></div></div></div>" +
      "</div></aside>" +
      '<div class="sidebar-scrim" data-act="navClose"></div>' +
      '<main class="main"><header class="topbar">' +
      '<button type="button" class="icon-btn nav-toggle" data-act="navOpen" aria-label="' + tx("Menú", "Menu") + '">' + ic("more") + "</button>" +
      '<form class="search input-wrap" action="members.html" role="search">' + ic("search", "i-sm") + '<input class="input" name="q" placeholder="' + tx("Buscar miembros, # o teléfono…", "Search members, # or phone…") + '" aria-label="' + tx("Buscar miembros", "Search members") + '"></form>' +
      '<span class="grow"></span>' + App.langSeg() +
      '<a class="btn btn-primary topbar-cta" href="checkin.html">' + ic("login", "i-sm") + "<span>" + tx("Registrar entrada", "Check in") + "</span></a>" +
      '</header><div class="content">' + inner + "</div></main></div>";
  };

  /* ------------------------------------------------------------ member (mobile) shell with desktop device frame + presenter guide */
  App.mobileShell = function (o) {
    var t = App.ten(), step = App.stepFor(o.step);
    var head = o.noHeader ? "" : '<header class="m-header"><svg class="tenant-mark">' + App.mark(true) + '</svg><div class="grow"><div class="t-name">' + t.name + '</div><div class="t-sub">' + (o.sub || "") + "</div></div>" + App.langSeg(true) + "</header>";
    var nextStep = step ? App.STEPS[step.n] : null;
    var guide = '<aside class="guide">' +
      '<a class="rc-logo" href="index.html"><svg><use href="#rc-mark"/></svg><span>Range Club · ' + tx("demo", "demo") + "</span></a>" +
      (step ? '<div class="g-step"><div class="eyebrow">' + tx("Paso ", "Step ") + step.n + tx(" de ", " of ") + App.STEPS.length + "</div><h2>" + App.txa(step.t) + "</h2><p>" + App.txa(step.d) + "</p></div>" : "") +
      (o.guide ? '<div class="g-note">' + ic("info", "i-sm") + "<div>" + o.guide + "</div></div>" : "") +
      '<div class="g-meta"><div class="row"><svg class="tenant-mark" style="width:28px;height:28px">' + App.mark() + '</svg><div><div style="font-weight:600">' + t.name + '</div><div class="xs subtle">' + tx("Vista del miembro · teléfono", "Member view · phone") + "</div></div></div></div>" +
      (nextStep ? '<a class="btn btn-secondary btn-block" href="' + nextStep.href + '">' + tx("Siguiente: ", "Next: ") + App.txa(nextStep.t) + ic("arrow-right", "i-sm") + "</a>" : "") +
      '<a class="btn btn-ghost btn-block" href="index.html">' + ic("arrow-left", "i-sm") + tx("Ruta de la demo", "Demo path") + "</a>" +
      "</aside>";
    return '<div class="stage">' + guide + '<div class="device"><div class="device-screen" id="screen">' + head + o.content + "</div></div></div>";
  };

  /* ------------------------------------------------------------ presenter dock (every page except the start page) */
  App.dock = function () {
    if (document.body.dataset.page === "index") return;
    var host = document.getElementById("dock");
    if (!host) { host = document.createElement("div"); host.id = "dock"; document.body.appendChild(host); }
    var open = App.dockOpen;
    host.innerHTML = '<button type="button" class="dock-btn" data-act="dock" aria-expanded="' + !!open + '">' + ic(open ? "x" : "zap", "i-sm") + "<span>" + tx("Demo", "Demo") + "</span></button>" +
      (open ? '<div class="dock-panel" role="dialog" aria-label="' + tx("Controles de la demo", "Demo controls") + '">' +
        '<div class="row between"><strong>' + tx("Ruta de la demo", "Demo path") + '</strong><a class="small" href="index.html">' + tx("Inicio", "Start") + "</a></div>" +
        '<ol class="dock-steps">' + App.STEPS.map(function (s) { return '<li><a href="' + s.href + '"><span class="n">' + s.n + "</span>" + App.txa(s.t) + "</a></li>"; }).join("") + "</ol>" +
        '<div class="dock-row"><span class="xs subtle">' + tx("Club", "Range") + "</span>" + App.tenantSeg() + "</div>" +
        '<div class="dock-row"><span class="xs subtle">' + tx("Idioma", "Language") + "</span>" + App.langSeg() + "</div>" +
        '<button type="button" class="btn btn-secondary btn-sm btn-block" data-act="resetDemo">' + ic("renew", "i-sm") + tx("Reiniciar demo", "Reset demo") + "</button>" +
        "</div>" : "");
  };

  /* ------------------------------------------------------------ page mounting + event delegation */
  App.page = function (def) {
    App.def = def;
    if (def.handlers) Object.assign(App.handlers, def.handlers);
    function go() { App.rerender(); if (def.init) def.init(); }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
  };
  App.rerender = function () {
    var root = document.getElementById("root");
    var sc = document.getElementById("screen"), top = sc ? sc.scrollTop : 0;
    if (App.def && App.def.render) root.innerHTML = App.def.render();
    if (App.def && App.def.title) document.title = App.def.title() + " · " + App.ten().name + " · Range Club";
    document.documentElement.dataset.tenant = S.tenant;
    var sc2 = document.getElementById("screen"); if (sc2 && App.keepScroll) sc2.scrollTop = top;
    App.keepScroll = false;
    if (App.def && App.def.after) App.def.after();
    if (App.modalDef) renderModal();
    App.dock();
  };
  App.setTenant = function (k) {
    S.tenant = k; save();
    var u = new URL(location.href); u.searchParams.delete("tenant"); u.searchParams.delete("m"); u.hash = "";
    location.href = u.pathname.split("/").pop() + (u.search || "");
  };
  App.go = function (href) { location.href = href; };

  var G = {
    lang: function (el) { App.keepScroll = true; App.setLang(el.dataset.v); },
    tenant: function (el) { if (el.dataset.v !== S.tenant) App.setTenant(el.dataset.v); },
    dock: function () { App.dockOpen = !App.dockOpen; App.dock(); },
    resetDemo: function () {
      if (!confirm(tx("¿Reiniciar la demo? Se borran renovaciones, entradas e inscripciones hechas en esta sesión.", "Reset the demo? Renewals, check-ins and sign-ups made in this session are cleared."))) return;
      App.reset(); App.toast(tx("Demo reiniciada", "Demo reset")); setTimeout(function () { location.href = "index.html"; }, 400);
    },
    modalBackdrop: function (el, e) { if (e.target === el && !(App.modalDef && App.modalDef.sticky)) App.closeModal(); },
    closeModal: function () { App.closeModal(); },
    navOpen: function () { document.body.classList.add("nav-open"); },
    navClose: function () { document.body.classList.remove("nav-open"); },
    tenantMenu: function () {
      App.modal({ render: function () {
        return '<div class="modal-head"><h2>' + tx("Cambiar de club", "Switch range") + '</h2><button class="icon-btn" data-act="closeModal" aria-label="' + tx("Cerrar", "Close") + '">' + ic("x") + '</button></div><div class="modal-body stack-2">' +
          ["guayama", "salinas"].map(function (k) { var x = D[k]; return '<button type="button" class="pick' + (k === S.tenant ? " is-on" : "") + '" data-act="tenant" data-v="' + k + '"><svg class="tenant-mark" style="width:36px;height:36px"><use href="#' + x.mark + '"/></svg><span class="grow"><strong>' + x.name + '</strong><span class="xs subtle" style="display:block">' + x.host + "</span></span>" + (k === S.tenant ? ic("check-circle") : ic("chev-right", "i-sm")) + "</button>"; }).join("") +
          '<p class="xs subtle" style="margin-top:8px">' + tx("Cada club es un inquilino aislado: su marca, sus miembros y sus métricas.", "Each range is an isolated tenant: its own brand, members and metrics.") + "</p></div>";
      } });
    }
  };
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-act]"); if (!el) return;
    var a = el.dataset.act, h = App.handlers[a] || G[a];
    if (!h) return;
    if (el.tagName === "A" || el.tagName === "BUTTON") e.preventDefault();
    h(el, e);
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && App.modalDef && !App.modalDef.sticky) App.closeModal(); });

  /* ------------------------------------------------------------ payment pieces (renewal, sign-up, front desk) */
  App.payPicker = function (vm) {
    var opt = function (k, inner) { return '<button type="button" class="pay-opt' + (vm.method === k ? " is-selected" : "") + '" data-act="payMethod" data-v="' + k + '" aria-pressed="' + (vm.method === k) + '">' + (vm.method === k ? '<span class="sel">' + ic("check") + "</span>" : "") + inner + "</button>"; };
    var html = '<div class="pay-opts">' + opt("paypal", '<span class="wm wm-paypal">Pay<b>Pal</b></span><span>PayPal</span>') + opt("card", ic("card", "i-lg") + "<span>" + tx("Tarjeta", "Card") + "</span>") + opt("ath", '<span class="wm wm-ath">ATH</span><span>ATH Móvil</span>') + "</div>";
    if (vm.method === "card") html += '<div class="hosted"><div class="hosted-label">' + ic("lock") + tx("Campos seguros de PayPal · nunca vemos tu tarjeta", "PayPal secure fields · we never see your card") + '</div><input class="input" value="4242 4242 4242 4242" aria-label="' + tx("Número de tarjeta", "Card number") + '" readonly><div class="row" style="gap:10px"><input class="input" value="09 / 29" aria-label="' + tx("Vencimiento", "Expiry") + '" readonly><input class="input" value="•••" aria-label="CVV" readonly><input class="input" value="' + App.ten().zip + '" aria-label="' + tx("Código postal", "ZIP code") + '" readonly></div><div class="xs subtle">' + tx("Tarjeta de prueba (sandbox): no se cobra dinero real.", "Sandbox test card: no real money is charged.") + "</div></div>";
    if (vm.method === "paypal") html += '<div class="callout">' + ic("info") + "<span>" + tx("Te llevaremos a PayPal para aprobar el pago y volverás aquí. (Sandbox: sin dinero real.)", "We'll take you to PayPal to approve and bring you back. (Sandbox: no real money.)") + "</span></div>";
    if (vm.method === "ath") html += '<div class="callout">' + ic("phone") + "<span>" + tx("Te enviaremos una solicitud de pago a ATH Móvil al ", "We'll send a payment request to ATH Móvil at ") + "<strong>" + App.mask(vm.phone || "(787) 555-0142") + "</strong>. " + tx("Tienes hasta 10 minutos para aprobarla.", "You have up to 10 minutes to approve it.") + "</span></div>";
    var locked = vm.method === "ath";
    html += '<div class="optin' + (locked ? " is-locked" : "") + '"><button type="button" class="toggle' + (vm.autorenew && !locked ? " is-on" : "") + (locked ? " is-locked" : "") + '" data-act="autorenew" role="switch" aria-checked="' + (!!vm.autorenew && !locked) + '" ' + (locked ? 'aria-disabled="true"' : "") + ' aria-label="' + tx("Auto-renovación", "Auto-renew") + '"></button><div><div class="optin-title">' + tx("Activar auto-renovación (opcional)", "Turn on auto-renew (optional)") + '</div><div class="optin-text">' +
      (locked ? ic("lock", "i-xs") + " " + tx("ATH Móvil no permite pagos recurrentes. Elige PayPal o tarjeta para activar la auto-renovación.", "ATH Móvil doesn't support recurring payments. Choose PayPal or card to turn on auto-renew.")
        : tx("Cobraremos a tu PayPal o tarjeta cada año en la fecha de renovación. Te avisaremos 7 días antes de cada cobro. Cancela cuando quieras desde tu portal.", "We'll charge your PayPal or card each year on the renewal date, with a notice 7 days before each charge. Cancel anytime from your portal.")) + "</div></div></div>";
    return html;
  };
  App.payHandlers = function (vm, rer) {
    return {
      payMethod: function (el) { vm.method = el.dataset.v; if (vm.method === "ath") vm.autorenew = false; App.keepScroll = true; rer(); },
      autorenew: function () { if (vm.method === "ath") { App.toast(tx("La auto-renovación requiere PayPal o tarjeta.", "Auto-renew requires PayPal or card."), "warn"); return; } vm.autorenew = !vm.autorenew; App.keepScroll = true; rer(); }
    };
  };
  /* PayPal (sandbox) approval sheet + card processing, both simulated */
  App.simulatePay = function (vm, amount, who, done) {
    if (vm.method === "paypal") {
      App.modal({ sticky: true, render: function () {
        return '<div class="pp-sheet"><div class="pp-top"><span class="wm wm-paypal" style="font-size:22px">Pay<b>Pal</b></span><span class="badge badge--neutral">Sandbox</span></div>' +
          '<div class="pp-body"><div class="small muted">' + tx("Pagar a", "Pay to") + "</div><div style=\"font-weight:700;font-size:17px\">" + App.ten().name + '</div><div class="pp-amt">' + App.money(amount) + ' USD</div><div class="kv"><span class="k">' + tx("Cuenta", "Account") + '</span><span class="v">' + App.esc(who.email) + '</span></div><div class="kv"><span class="k">' + tx("Fuente", "Funding") + '</span><span class="v">' + tx("Saldo de PayPal (prueba)", "PayPal balance (test)") + "</span></div>" +
          '<button type="button" class="btn btn-xl btn-block pp-btn" data-act="ppApprove">' + tx("Aceptar y pagar", "Agree & pay") + '</button><button type="button" class="btn btn-ghost btn-block" data-act="ppCancel">' + tx("Cancelar y volver", "Cancel and return") + "</button>" +
          '<div class="xs subtle" style="text-align:center">' + tx("Simulación de PayPal sandbox: no se mueve dinero real.", "Simulated PayPal sandbox: no real money moves.") + "</div></div></div>";
      } });
      App.handlers.ppApprove = function () { App.modalDef.render = spinner(tx("Confirmando con PayPal…", "Confirming with PayPal…")); App.renderModal(); setTimeout(function () { App.closeModal(); done(); }, 900); };
      App.handlers.ppCancel = function () { App.closeModal(); };
    } else {
      App.modal({ sticky: true, render: spinner(tx("Procesando el pago seguro…", "Processing secure payment…")) });
      setTimeout(function () { App.closeModal(); done(); }, 1100);
    }
  };
  function spinner(msg) { return function () { return '<div class="proc"><span class="spin"></span><div style="font-weight:650">' + msg + "</div></div>"; }; }
  App.spinner = spinner;

  /* ATH Móvil waiting state: real 10-minute countdown + presenter shortcut to simulate approval */
  App.ath = { ctx: null, timer: null };
  App.athStart = function (ctx) {
    App.athStop(); ctx.deadline = ctx.deadline || Date.now() + 10 * 60 * 1000; ctx.expired = false; App.ath.ctx = ctx;
    App.ath.timer = setInterval(App.athTick, 250);
  };
  App.athStop = function () { if (App.ath.timer) clearInterval(App.ath.timer); App.ath.timer = null; };
  App.athTick = function () {
    var c = App.ath.ctx; if (!c) return;
    var left = Math.max(0, c.deadline - Date.now()), s = Math.ceil(left / 1000);
    var el = document.querySelector("[data-ath-time]"); if (el) el.textContent = Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2);
    var r = document.querySelector("[data-ath-ring]"); if (r) r.style.strokeDashoffset = (553 * (1 - left / 600000)).toFixed(1);
    if (left <= 0 && !c.expired) { c.expired = true; App.athStop(); if (c.onExpire) c.onExpire(); }
  };
  App.athView = function (o) {
    if (o.expired) return '<div class="ath-wrap"><div class="ok-badge" style="background:var(--warn-600);box-shadow:0 0 0 10px var(--warn-50)">' + ic("clock") + '</div><h2 style="text-align:center">' + tx("La solicitud de ATH Móvil expiró", "The ATH Móvil request expired") + '</h2><p class="muted" style="text-align:center">' + tx("No se hizo ningún cobro. Puedes intentarlo otra vez o elegir PayPal o tarjeta.", "Nothing was charged. Try again or choose PayPal or card.") + '</p><button type="button" class="btn btn-primary btn-lg btn-block" data-act="athRetry">' + ic("renew", "i-sm") + tx("Enviar otra solicitud", "Send a new request") + '</button><button type="button" class="btn btn-ghost btn-block" data-act="athCancel">' + tx("Elegir otro método", "Choose another method") + "</button></div>";
    return '<div class="ath-wrap">' +
      '<div style="text-align:center"><span class="pulse"><span class="dot"></span>' + tx("Esperando tu aprobación", "Waiting for your approval") + "</span></div>" +
      '<h2 style="text-align:center;font-size:22px;line-height:28px">' + tx("Aprueba en ATH Móvil", "Approve in ATH Móvil") + "</h2>" +
      '<div class="ring-wrap"><svg class="ring" viewBox="0 0 196 196"><circle cx="98" cy="98" r="88" fill="none" stroke="var(--n-100)" stroke-width="12"/><circle data-ath-ring cx="98" cy="98" r="88" fill="none" stroke="#E35205" stroke-width="12" stroke-linecap="round" stroke-dasharray="553" stroke-dashoffset="0"/></svg><div class="ring-center"><span class="time" data-ath-time>10:00</span><span class="xs subtle">' + tx("para aprobar", "to approve") + "</span></div></div>" +
      '<div class="m-card m-card-pad"><div class="kv"><span class="k">' + tx("Monto", "Amount") + '</span><span class="v">' + App.money(o.amount) + '</span></div><div class="kv"><span class="k">' + tx("Comercio", "Merchant") + '</span><span class="v">' + App.ten().name + '</span></div><div class="kv"><span class="k">' + tx("Teléfono", "Phone") + '</span><span class="v">' + App.mask(o.phone) + "</span></div></div>" +
      '<div class="steps-ath"><div class="sa done"><span class="n">' + ic("check", "i-xs") + "</span><div>" + tx("Enviamos la solicitud a tu ATH Móvil.", "We sent the request to your ATH Móvil.") + '</div></div><div class="sa cur"><span class="n">2</span><div>' + tx("Abre ATH Móvil y aprueba el pago de ", "Open ATH Móvil and approve the payment of ") + "<strong>" + App.money(o.amount) + "</strong>.</div></div><div class=\"sa\"><span class=\"n\">3</span><div>" + tx("Confirmaremos aquí automáticamente; deja esta página abierta.", "We'll confirm here automatically; keep this page open.") + "</div></div></div>" +
      '<button type="button" class="btn btn-primary btn-lg btn-block" data-act="athOpen"><span class="wm wm-ath" style="color:#fff">ATH</span>' + tx("Abrir ATH Móvil", "Open ATH Móvil") + "</button>" +
      '<button type="button" class="demo-btn" data-act="athApprove">' + ic("zap", "i-sm") + "<span><strong>" + tx("Demo: simular aprobación", "Demo: simulate approval") + "</strong><small>" + tx("Atajo del presentador (en la vida real lo aprueba el miembro)", "Presenter shortcut (in real life the member approves)") + "</small></span></button>" +
      '<button type="button" class="btn btn-ghost btn-block" data-act="athCancel">' + tx("Cancelar y elegir otro método", "Cancel and choose another method") + "</button></div>";
  };

  /* ------------------------------------------------------------ waiver text (sample only) + signature pad */
  App.waiverText = function (lang) {
    var n = App.ten().name;
    if (lang === "en") return [["1. Risks of the activity", "I understand that sport shooting carries inherent risks, including serious injury, hearing or vision loss, and property damage, even when all rules are followed."], ["2. Safety rules", "I agree to follow the instructions of the range safety officer (RSO), wear eye and ear protection at all times, and keep the firearm pointed in a safe direction."], ["3. Release of liability", "To the extent permitted by Puerto Rico law, I release " + n + ", its owners, employees and volunteers from claims for injury or damage arising from my use of the facilities."], ["4. Age and eligibility", "I confirm that I am 21 years of age or older and legally allowed to possess and use firearms."], ["5. Records", "I understand that the range keeps the exact version and text I sign, the language, the date and time, and my device information."]];
    return [["1. Riesgos de la actividad", "Entiendo que el tiro deportivo conlleva riesgos inherentes, incluyendo lesiones graves, pérdida auditiva o visual, y daños a la propiedad, aun cuando se sigan todas las reglas."], ["2. Reglas de seguridad", "Me comprometo a seguir las instrucciones del oficial de seguridad (RSO), usar protección de ojos y oídos en todo momento y mantener el arma apuntando en dirección segura."], ["3. Relevo de responsabilidad", "En la medida permitida por la ley de Puerto Rico, libero a " + n + ", sus dueños, empleados y voluntarios de reclamaciones por lesiones o daños que surjan de mi uso de las instalaciones."], ["4. Edad y elegibilidad", "Confirmo que tengo 21 años o más y que la ley me permite poseer y usar armas de fuego."], ["5. Registro", "Entiendo que el club guarda la versión y el texto exacto que firmo, el idioma, la fecha y hora, y la información de mi dispositivo."]];
  };
  App.initSig = function (canvas, initial, onChange) {
    if (!canvas) return;
    var ctx = canvas.getContext("2d"), dpr = window.devicePixelRatio || 1, drawing = false, last = null, len = (initial && initial.len) || 0;
    function size() { var r = canvas.getBoundingClientRect(); canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.lineWidth = 2.6; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#121826"; }
    size();
    if (initial && initial.url) { var img = new Image(); img.onload = function () { var r = canvas.getBoundingClientRect(); ctx.drawImage(img, 0, 0, r.width, r.height); }; img.src = initial.url; }
    function pos(e) { var r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    canvas.addEventListener("pointerdown", function (e) { drawing = true; last = pos(e); canvas.setPointerCapture(e.pointerId); e.preventDefault(); });
    canvas.addEventListener("pointermove", function (e) { if (!drawing) return; var p = pos(e); ctx.beginPath(); ctx.moveTo(last[0], last[1]); ctx.lineTo(p[0], p[1]); ctx.stroke(); len += Math.hypot(p[0] - last[0], p[1] - last[1]); last = p; e.preventDefault(); });
    function end() { if (!drawing) return; drawing = false; onChange({ url: canvas.toDataURL("image/png"), len: len }); }
    canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", end); canvas.addEventListener("pointerleave", end);
    canvas.style.touchAction = "none";
  };
})();
