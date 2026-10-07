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
  /* Each club starts with today's seeded visits (some still on site), anchored to the moment the demo state is created. */
  var CALS = ["9mm", ".22 LR", ".45 ACP", ".380 ACP", "12 ga", ".38 Special", ".223 Rem"];
  function calFor(mem) { if (mem && mem.cal) return mem.cal; var h = 0, id = (mem && mem.id) || ""; for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 9973; return CALS[h % CALS.length]; }
  function defSettings(d) { return { close: d.close, licCh: { email: true, push: true, app: true, sms: false } }; }
  function blankTenant(k) {
    var d = D[k], now = Date.now(), n = 0, m = {};
    if (d.paySeed) { var ps = d.paySeed, pm = d.members.filter(function (x) { return x.id === ps.id; })[0]; if (pm) m[ps.id] = { payPending: { kind: "renew", tier: pm.tier, amount: d.tiers[pm.tier].price, src: ps.src, step: null, ch: null, on: ps.on, at: 0, due: new Date(Date.parse(ps.on + "T00:00:00Z") + d.grace * 864e5).toISOString().slice(0, 10), prev: "lapsed" } }; }
    var visits = (d.visitSeed || []).map(function (v) {
      var mem = d.members.filter(function (x) { return x.id === v.id; })[0] || {};
      m[v.id] = { last: TODAY };
      return { vid: k[0] + "v" + (++n), mid: v.id, name: mem.name, lic: mem.lic ? mem.lic.no : "", cal: v.cal || calFor(mem), in: now - v.inAgo * 60000, out: v.outAgo != null ? now - v.outAgo * 60000 : null,
        inBy: v.kiosk ? "kiosk" : d.staff.name, outBy: v.outAgo != null ? (v.kiosk ? "kiosk" : d.staff.name) : null, forced: false, guests: [], seed: true };
    });
    /* one non-shooting companion already on site with a seeded member */
    var gs = 0;
    (d.companionSeed || []).forEach(function (c) {
      var host = d.members.filter(function (x) { return x.id === c.host; })[0] || {};
      visits.push({ vid: k[0] + "v" + (++n), mid: "G-" + k[0].toUpperCase() + (++gs), type: "companion", host: c.host, hostName: host.name, name: c.name, lic: "", cal: "", in: now - c.inAgo * 60000, out: null, inBy: d.staff.name, outBy: null, forced: false, guests: [], seed: true });
    });
    return { m: m, added: [], events: [], outbox: { run: null, extra: [] }, seq: 0, current: null, visits: visits, vseq: n, gseq: gs, settings: defSettings(d), closeSim: false };
  }
  function fresh(prev) {
    return { v: 3, lang: (prev && prev.lang) || "es", tenant: (prev && prev.tenant) || "guayama", t: { guayama: blankTenant("guayama"), salinas: blankTenant("salinas") } };
  }
  function load() {
    if (mem) return mem;
    var s = null;
    if (storeOK) { try { s = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { s = null; } }
    if (!s || s.v !== 3) s = fresh(s);
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
    var d = ms ? new Date(ms) : new Date(), h = (d.getUTCHours() + 20) % 24, m = ("0" + d.getUTCMinutes()).slice(-2), l = lang || S.lang; // AST = UTC-4
    var h12 = h % 12 || 12, pm = h >= 12;
    return l === "en" ? h12 + ":" + m + " " + (pm ? "PM" : "AM") : h12 + ":" + m + (pm ? " p. m." : " a. m.");
  };
  App.astMinutes = function (ms) { var d = ms ? new Date(ms) : new Date(); return ((d.getUTCHours() + 20) % 24) * 60 + d.getUTCMinutes(); };
  App.dur = function (ms) { var mins = Math.max(0, Math.round(ms / 60000)); if (mins < 1) return tx("menos de 1 min", "under 1 min"); var h = Math.floor(mins / 60), mm = mins % 60; return (h ? h + " h " : "") + (h && !mm ? "" : mm + " min"); };
  App.hm = function (hhmm, lang) { var a = String(hhmm || "18:00").split(":"), h = +a[0], m = a[1] || "00", l = lang || S.lang, h12 = h % 12 || 12; return l === "en" ? h12 + ":" + m + " " + (h >= 12 ? "PM" : "AM") : h12 + ":" + m + (h >= 12 ? " p. m." : " a. m."); };
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
  App.visits = function () { var ts = App.ts(); if (!ts.visits) { ts.visits = []; ts.vseq = 0; } return ts.visits; };
  App.lastVisit = function (id) { var v = App.visits(); for (var i = v.length - 1; i >= 0; i--) if (v[i].mid === id) return v[i]; return null; };
  App.openVisit = function (id) { var v = App.lastVisit(id); return v && !v.out ? v : null; };
  App.onSite = function () { return App.visits().filter(function (v) { return !v.out; }); };
  /* "checked in today" = currently on site (open visit); shape kept compatible with the old event object */
  App.checkedInToday = function (id) { var v = App.openVisit(id); return v ? { at: v.in, guests: v.guests || [], where: v.inBy === "kiosk" ? "kiosk" : "desk", cal: v.cal, v: v } : null; };
  App.settings = function () { var ts = App.ts(); if (!ts.settings) ts.settings = defSettings(App.ten()); if (!ts.settings.licCh) ts.settings.licCh = defSettings(App.ten()).licCh; return ts.settings; };
  App.setSetting = function (k, v) { App.settings()[k] = v; save(); };
  /* Reg. 9172 Arts. 3.06(K)/3.07(N): the visit log records the caliber used. Prefilled with the member's usual caliber; staff or member can change it. */
  App.CALS = CALS;
  App.calFor = function (m) { return calFor(m); };
  /* license numbers are confidential (Ley 168 Art. 2.01): show the last 4 only */
  App.mask = function (no) { no = String(no || ""); return no ? "•••• " + no.replace(/[^A-Za-z0-9]/g, "").slice(-4) : "—"; };
  App.closeState = function () { var c = App.settings().close || App.ten().close, a = c.split(":"), after = App.astMinutes() >= (+a[0]) * 60 + (+a[1] || 0); return { close: c, after: after, sim: !!App.ts().closeSim, on: after || !!App.ts().closeSim, open: App.onSite() }; };

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
    /* member chose "pay at front desk" online: one blocker with a one-tap "Cobrar" (replaces the renew blocker). Status is unchanged until paid. */
    var PP = p.payPending;
    if (PP && (st === "active" || st === "grace" || st === "lapsed" || st === "pending")) {
      var soft = st === "active" || (st === "grace" && t.checkinInGrace);
      B = B.filter(function (b) { return b.act !== "fixRenew"; });
      B.push({ kind: soft ? "warn" : "bad", soft: soft, icon: "hourglass", pay: true, t: tx("Pago pendiente en recepción", "Payment pending at front desk"),
        d: tx((PP.kind === "signup" ? "Se inscribió" : "Reservó la renovación") + " en línea el " + App.fds(PP.on, "es") + " para pagar aquí: " + App.money(PP.amount) + " en efectivo o cheque. Fecha límite: " + App.fd(PP.due, "es") + "." + (st === "active" ? " Su membresía sigue activa mientras tanto." : ""),
          (PP.kind === "signup" ? "Signed up" : "Reserved the renewal") + " online on " + App.fds(PP.on, "en") + " to pay here: " + App.money(PP.amount) + " in cash or by check. Pay by " + App.fd(PP.due, "en") + "." + (st === "active" ? " Membership stays active meanwhile." : "")),
        fix: tx("Cobrar · ", "Collect · ") + App.money(PP.amount, false), act: "fixCollect", icon2: "dollar" });
      C.m = [C.m ? C.m[0] : "warn", st === "pending" ? ["Pago pendiente", "Payment pending"] : C.m[1], [tx("Pago pendiente en recepción", "Payment pending at desk")]];
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
    /* Gun license: expired, suspended or revoked ALWAYS blocks (Reg. 9172 Art. 3.05(3)(a): the range may not let anyone shoot without a valid license). Expiring today = warning only. */
    var LI = App.lic(m);
    if (LI.blocked) {
      var why = LI.band === "expired" ? [tx("Venció el " + App.fd(LI.exp, "es") + " (hace " + -LI.days + " días)", "Expired " + App.fd(LI.exp, "en") + " (" + -LI.days + " days ago)"), tx("Licencia de armas vencida", "Gun license expired")]
        : LI.band === "suspended" ? [tx("Suspendida por orden del tribunal", "Suspended by court order"), tx("Licencia de armas suspendida", "Gun license suspended")]
        : [tx("Revocada", "Revoked"), tx("Licencia de armas revocada", "Gun license revoked")];
      C.l = ["bad", LI.band === "expired" ? ["Vencida", "Expired"] : LI.band === "suspended" ? ["Suspendida", "Suspended"] : ["Revocada", "Revoked"], [LI.band === "expired" ? tx("Hace " + -LI.days + " días", -LI.days + " days ago") : App.mask(LI.no)]];
      B.unshift({ kind: "bad", icon: "id", t: why[1] + tx(" · no puede tirar", " · may not shoot"), lic: true,
        d: tx("Licencia " + App.mask(LI.no) + ": " + why[0].charAt(0).toLowerCase() + why[0].slice(1) + ". Sin licencia vigente no se permite tirar (Reg. 9172 Art. 3.05). " + (LI.band === "expired" ? "Si trae el carnet renovado, actualiza la fecha." + (LI.filed ? " Renovación radicada el " + App.fd(LI.filed, "es") + ": aun así no puede tirar." : "") : "No se puede levantar desde recepción."),
          "License " + App.mask(LI.no) + ": " + why[0].charAt(0).toLowerCase() + why[0].slice(1) + ". Shooting without a valid license isn't allowed (Reg. 9172 Art. 3.05). " + (LI.band === "expired" ? "If they bring the renewed card, update the date." + (LI.filed ? " Renewal filed " + App.fd(LI.filed, "en") + ": they still may not shoot." : "") : "Can't be lifted from the front desk.")),
        fix: LI.band === "expired" ? tx("Actualizar licencia", "Update license") : tx("Llamar al dueño", "Call the owner"), act: LI.band === "expired" ? "fixLicense" : "fixCall", icon2: LI.band === "expired" ? "edit" : "phone-call" });
    } else if (LI.band === "today") {
      C.l = ["warn", ["Vence hoy", "Expires today"], [App.fds(LI.exp)]];
      B.push({ kind: "warn", icon: "id", t: tx("Licencia de armas vence hoy", "Gun license expires today"), lic: true, soft: true,
        d: tx("Licencia " + App.mask(LI.no) + " es válida hasta hoy. Desde mañana no podrá tirar hasta renovarla; recuérdaselo.", "License " + App.mask(LI.no) + " is valid through today. From tomorrow they can't shoot until it's renewed; remind them."),
        fix: tx("Ver licencia", "View license"), act: "fixLicense", icon2: "id" });
    } else if (LI.band === "soon30") C.l = ["warn", ["Vence en " + LI.days + " d", "Expires in " + LI.days + " d"], [App.fds(LI.exp)]];
    else if (LI.band === "none") C.l = ["req", ["Falta", "Missing"], [tx("Sin licencia en archivo", "None on file")]];
    else C.l = ["ok", ["Vigente", "Valid"], [tx("Hasta ", "Until ") + App.fds(LI.exp)]];
    var hard = B.filter(function (b) { return b.kind !== "warn"; });
    var can = hard.length === 0;
    var hero = st === "suspended" ? "suspended" : LI.blocked ? "licstop" : (can ? (LI.band === "today" ? "lictoday" : st === "grace" ? "grace" : "go") : "stop");
    return { st: st, C: C, B: B, can: can, hero: hero, hard: hard.length, lic: LI };
  };

  /* ------------------------------------------------------------ actions */
  App.event = function (e) { e.at = e.at || Date.now(); App.ts().events.push(e); save(); return e; };
  App.nextReceipt = function () { var ts = App.ts(), t = App.ten(); ts.seq++; save(); return t.prefix + "-R-2026-0" + (t.receiptBase + ts.seq); };
  App.renew = function (id, o) {
    var list = App.members(), m = App.member(id, list), p = App.primary(m, list), st = App.status(p, list), t = App.ten();
    var tierKey = o.tier || p.tier, tr = t.tiers[tierKey];
    var from = (st === "active" || st === "grace") && p.expires ? p.expires : TODAY;
    var exp = tr.term === "month" ? App.addMonths(from, 1) : App.addMonths(from, 12);
    var auto = o.autorenew && o.method === "card" ? "card" : null; // auto-renew only with card
    var receipt = App.nextReceipt();
    App.update(p.id, { tier: tierKey, expires: exp, status: null, used: 0, autorenew: auto, renewedAt: Date.now(), renewedSrc: o.src, payPending: null });
    App.event({ type: "renewal", id: p.id, name: p.name, src: o.src, method: o.method, pay: o.pay || null, amount: tr.price, tier: tierKey, prev: st, exp: exp, receipt: receipt, step: o.step || null, ch: o.ch || null, collected: !!o.collected });
    if (o.src !== "desk") { App.ts().current = p.id; save(); }
    App.queueMsg({ kind: "receipt", mid: p.id, ch: ["email"], method: o.method, pay: o.pay || null, receipt: receipt });
    return { receipt: receipt, exp: exp, tier: tr, amount: tr.price, prev: st, auto: auto, method: o.method, pay: o.pay || null };
  };
  /* Pay at the front desk (cash / check), chosen by the member online: the renewal or sign-up is reserved, the member keeps
     their current status, and staff complete it with one tap ("Cobrar") at the desk. Pay-by date stays inside the grace period. */
  App.payDue = function (p, list) {
    var st = App.status(p, list), g = App.ten().grace;
    if (st === "active") return App.addDays(p.expires, g);
    if (st === "grace") return App.graceEnd(p, list);
    return App.addDays(TODAY, g);
  };
  App.reservePay = function (id, o) {
    var list = App.members(), m = App.member(id, list), p = App.primary(m, list), t = App.ten(), tierKey = o.tier || p.tier, tr = t.tiers[tierKey];
    var pp = { kind: o.kind || "renew", tier: tierKey, amount: tr.price, src: o.src || "link", step: o.step || null, ch: o.ch || null, on: TODAY, at: Date.now(), due: o.due || App.payDue(p, list), prev: App.status(p, list) };
    App.update(p.id, { payPending: pp });
    App.event({ type: "payPending", id: p.id, name: p.name, amount: pp.amount, src: pp.src, kind: pp.kind, due: pp.due });
    App.queueMsg({ kind: "payPending", mid: p.id, ch: ["email"] });
    return pp;
  };
  App.collectPending = function (id, method, pay, autorenew) {
    var list = App.members(), m = App.member(id, list), p = App.primary(m, list), pp = p.payPending, t = App.ten();
    if (!pp) return null;
    if (pp.kind === "signup") {
      var tr = t.tiers[pp.tier], exp = tr.term === "month" ? App.addMonths(TODAY, 1) : App.addMonths(TODAY, 12), receipt = App.nextReceipt();
      App.update(p.id, { status: null, expires: exp, payPending: null, pay: [[TODAY, tr.price, method]], autorenew: autorenew && method === "card" ? "card" : null });
      App.event({ type: "payment", kind: "signup", id: p.id, name: p.name, amount: tr.price, method: method, pay: pay || null, receipt: receipt, exp: exp });
      App.queueMsg({ kind: "receipt", mid: p.id, ch: ["email"], method: method, pay: pay || null, receipt: receipt });
      return { receipt: receipt, exp: exp, tier: tr, amount: tr.price, prev: "pending", auto: null, method: method, pay: pay || null };
    }
    return App.renew(p.id, { tier: pp.tier, method: method, pay: pay, autorenew: autorenew, src: pp.src, step: pp.step, ch: pp.ch, collected: true });
  };
  /* Payment method names (generic: no processor or card-network brands). Member-initiated: card / ath / desk; staff at desk: card / ath / cash / check. */
  App.payName = function (k, lang) {
    var e = (lang || S.lang) === "en";
    return { card: e ? "Credit/debit card" : "Tarjeta de crédito/débito", ath: "ATH Móvil", desk: e ? "Pay at front desk (cash/check)" : "Pago en recepción (efectivo/cheque)", cash: e ? "Cash" : "Efectivo", check: e ? "Check" : "Cheque" }[k] || "";
  };
  App.payShort = function (k, lang) { var e = (lang || S.lang) === "en"; return { card: e ? "card" : "tarjeta", ath: "ATH Móvil", desk: e ? "pay at desk" : "pago en recepción", cash: e ? "cash" : "efectivo", check: e ? "check" : "cheque" }[k] || ""; };
  /* receipt line: "Tarjeta •••• 1111", "Efectivo · recibido $380.00 · cambio $20.00", "Cheque #1047" */
  App.payLine = function (method, pay, lang) {
    var e = (lang || S.lang) === "en"; pay = pay || {};
    if (method === "card") return (e ? "Card" : "Tarjeta") + (pay.last4 ? " •••• " + pay.last4 : "");
    if (method === "ath") return "ATH Móvil" + (pay.phone ? " · " + App.mask(pay.phone) : "");
    if (method === "cash") return (e ? "Cash" : "Efectivo") + (pay.rec != null ? (e ? " · received " : " · recibido ") + App.money(pay.rec) + (e ? " · change " : " · cambio ") + App.money(pay.chg || 0) : "");
    if (method === "check") return (e ? "Check" : "Cheque") + (pay.chk ? " #" + pay.chk : "");
    if (method === "desk") return App.payName("desk", lang);
    return "";
  };
  App.payInfo = function (vm, amount) {
    if (vm.method === "card") return { last4: String((vm.card && vm.card.num) || "").replace(/\D/g, "").slice(-4) };
    if (vm.method === "ath") return { phone: vm.athPhone };
    if (vm.method === "cash") { var r = App.num(vm.cashRec); return { rec: r, chg: Math.max(0, Math.round((r - amount) * 100) / 100) }; }
    if (vm.method === "check") return { chk: String(vm.chkNo || "").trim() };
    return null;
  };
  App.num = function (v) { var n = parseFloat(String(v == null ? "" : v).replace(/[^0-9.]/g, "")); return isNaN(n) ? 0 : n; };
  /* Guests are logged as their own visits under the host member:
     type "guest" = shooting guest (guest pass or fee; own gun license + caliber), type "companion" = non-shooting companion (no license / caliber). */
  App.addGuestVisit = function (host, g, where) {
    var ts = App.ts(), vs = App.visits(); ts.vseq = (ts.vseq || vs.length) + 1; ts.gseq = (ts.gseq || 0) + 1;
    var comp = g.kind === "companion";
    var v = { vid: S.tenant[0] + "v" + ts.vseq, mid: "G-" + S.tenant[0].toUpperCase() + ts.gseq, type: comp ? "companion" : "guest", host: host.id, hostName: host.name, name: g.name, lic: comp ? "" : (g.lic || ""), cal: comp ? "" : (g.cal || ""),
      in: Date.now(), out: null, inBy: where === "kiosk" ? "kiosk" : App.ten().staff.name, outBy: null, forced: false, guests: [], pass: !!g.pass };
    vs.push(v); App.event({ type: comp ? "companion" : "guestIn", id: host.id, name: g.name, host: host.name, where: where || "desk" });
    return v;
  };
  App.guestsOf = function (hostId, openOnly) { return App.visits().filter(function (v) { return v.host === hostId && (!openOnly || !v.out); }); };
  App.guestBadge = function (v) { return v.type === "companion" ? '<span class="badge badge--guestns" data-companion>' + tx("Invitado (no dispara)", "Guest (no shooting)") + "</span>" : v.type === "guest" ? '<span class="badge badge--guests" data-shootguest>' + tx("Invitado (dispara)", "Shooting guest") + "</span>" : ""; };
  App.isCompanion = function (v) { return v && v.type === "companion"; };
  App.visitType = function (v, lang) { var e = (lang || S.lang) === "en"; return v.type === "companion" ? (e ? "Guest (no shooting)" : "Invitado (no dispara)") : v.type === "guest" ? (e ? "Shooting guest" : "Invitado (dispara)") : (e ? "Member" : "Miembro"); };
  App.checkin = function (id, guests, where) {
    var list = App.members(), m = App.member(id, list), p = App.primary(m, list);
    var g = guests || [], shoot = g.filter(function (x) { return x.kind !== "companion"; });
    if (shoot.length) App.update(p.id, { used: (p.used || 0) + shoot.filter(function (x) { return x.pass; }).length });
    App.update(m.id, { last: TODAY });
    var ts = App.ts(), vs = App.visits(), cal = arguments[3] || calFor(m);
    ts.vseq = (ts.vseq || vs.length) + 1;
    vs.push({ vid: S.tenant[0] + "v" + ts.vseq, mid: m.id, type: "member", name: m.name, lic: (m.lic && m.lic.no) || "", cal: cal, in: Date.now(), out: null, inBy: where === "kiosk" ? "kiosk" : App.ten().staff.name, outBy: null, forced: false, guests: g.map(function (x) { return x.name; }) });
    var ev = App.event({ type: "checkin", id: m.id, name: m.name, guests: g, where: where || "desk", cal: cal });
    g.forEach(function (x) { App.addGuestVisit(m, x, where); });
    save(); return ev;
  };
  /* check-out: o.where = "desk" | "kiosk"; o.forced = staff name for an end-of-day forced check-out (flagged in the log) */
  App.setCal = function (id, cal) { var v = App.openVisit(id) || App.lastVisit(id); if (v && cal) { v.cal = String(cal).slice(0, 24); save(); } return v; };
  App.checkout = function (id, o) {
    o = o || {}; var v = App.openVisit(id); if (!v) return null;
    v.out = Date.now(); v.forced = !!o.forced; v.outBy = o.forced ? o.forced : (o.where === "kiosk" ? "kiosk" : App.ten().staff.name);
    App.event({ type: "checkout", id: v.host || id, name: v.name, dur: v.out - v.in, where: o.where || "desk", forced: !!o.forced, by: v.outBy, guest: !!v.host });
    if (!v.host) App.guestsOf(id, true).forEach(function (gv) { gv.out = v.out; gv.forced = v.forced; gv.outBy = v.outBy; }); // guests leave with their member
    save(); return v;
  };
  App.forceCheckoutAll = function (by) { return App.onSite().map(function (v) { return App.checkout(v.mid, { forced: by }); }); };

  /* Visits for any day in the log: today = live visits; earlier days = deterministic sample history (closed visits). */
  App.visitsFor = function (day) {
    if (day === TODAY) return App.visits().slice();
    if (day > TODAY || App.diff(TODAY, day) > 60) return [];
    var t = App.ten(), list = App.members({ initial: true }).filter(function (m) { return m.status !== "pending" && m.status !== "cancelled"; });
    var seed = 0; (S.tenant + day).split("").forEach(function (c) { seed = (seed * 33 + c.charCodeAt(0)) % 100003; });
    var rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    if (new Date(day + "T12:00:00Z").getUTCDay() === 1) return []; // closed Mondays
    var n = 5 + Math.floor(rnd() * 6), out = [], used = {}, base = Date.parse(day + "T00:00:00Z") + 4 * 3600000; // midnight AST
    for (var i = 0; i < n * 3 && out.length < n; i++) {
      var m = list[Math.floor(rnd() * list.length)]; if (used[m.id]) continue; used[m.id] = 1;
      var inM = 8 * 60 + Math.floor(rnd() * 8 * 60), len = 35 + Math.floor(rnd() * 150), kiosk = rnd() < 0.35;
      out.push({ vid: day + "-" + i, mid: m.id, name: m.name, lic: m.lic ? m.lic.no : "", cal: calFor(m), in: base + inM * 60000, out: base + (inM + len) * 60000, inBy: kiosk ? "kiosk" : t.staff.name, outBy: kiosk ? "kiosk" : t.staff.name, forced: false, guests: [] });
    }
    return out.sort(function (a, b) { return a.in - b.in; });
  };
  App.byLabel = function (by) { return by === "kiosk" ? tx("Quiosco", "Kiosk") : by || "—"; };
  /* Official log export = the six Reg. 9172 fields + visit type (non-shooting guests: license/caliber "N/A (no dispara)"). full=true: full license number (regulator/inspector copy; owner only, recorded in the access log);
     full=false: license masked to the last 4 (working copy). Audit extras (staff, forced flag) stay on screen, not in the export. */
  App.VLOG_HEAD = { es: ["Nombre completo", "Fecha", "Número de licencia de armas", "Calibre utilizado", "Hora de entrada", "Hora de salida", "Tipo de visita"], en: ["Full name", "Date", "Gun license number", "Caliber used", "Time in", "Time out", "Visit type"] };
  App.visitCSV = function (day, full) {
    var rows = App.visitsFor(day).sort(function (a, b) { return a.in - b.in; });
    var q = function (v) { v = String(v == null ? "" : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var dd = day.slice(8, 10) + "/" + day.slice(5, 7) + "/" + day.slice(0, 4);
    var lines = [App.VLOG_HEAD[S.lang === "en" ? "en" : "es"].map(q).join(",")].concat(rows.map(function (v) {
      var na = S.lang === "en" ? "N/A (no shooting)" : "N/A (no dispara)", comp = v.type === "companion";
      return [v.name, dd, comp ? na : (full ? v.lic : App.mask(v.lic)), comp ? na : (v.cal || ""), App.time(v.in), v.out ? App.time(v.out) : "", App.visitType(v)].map(q).join(",");
    }));
    return lines.join("\r\n") + "\r\n";
  };
  /* client-side download (works offline and from file://) */
  App.downloadCSV = function (name, text) {
    var blob = new Blob(["\ufeff" + text], { type: "text/csv;charset=utf-8" }), url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = name; a.style.display = "none"; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
  };
  /* end-of-day banner (after closing time, or the presenter's "simulate closing") with staff force-checkout */
  App.closeBanner = function (by) {
    var c = App.closeState(); if (!c.on || !c.open.length) return "";
    return '<div class="close-banner" role="alert">' + ic("alert") + '<div class="grow"><strong>' + tx("Cierre del día (" + App.hm(c.close, "es") + "): ", "Closing time (" + App.hm(c.close, "en") + "): ") + c.open.length + tx(" siguen registrados", " still signed in") + "</strong><div class=\"small\">" + tx("Registra su salida en recepción, o fuerza la salida: queda marcada en el registro como «Salida forzada por personal».", "Check them out at the desk, or force the check-out: it's flagged in the log as “Forced check-out by staff”.") + (c.sim && !c.after ? " · " + tx("cierre simulado", "simulated closing") : "") + '</div></div><button type="button" class="btn btn-danger btn-sm" data-act="forceAll">' + ic("log-out", "i-sm") + tx("Forzar salida de todos", "Force check-out all") + "</button></div>";
  };
  App.forceAllHandler = function (by, after) {
    return function () {
      var n = App.onSite().length;
      App.modal({ render: function () { return '<div class="modal-head"><h2>' + tx("Forzar salida de " + n + " persona(s)", "Force check-out for " + n + " people") + '</h2><button type="button" class="icon-btn" data-act="closeModal" aria-label="' + tx("Cerrar", "Close") + '">' + ic("x") + '</button></div><div class="modal-body stack-2"><p>' + tx("Se registrará la hora de salida de ahora y cada visita quedará marcada como <strong>Salida forzada por personal · " + by + "</strong>.", "Now will be recorded as the time out and each visit is flagged <strong>Forced check-out by staff · " + by + "</strong>.") + '</p><div class="callout">' + ic("info") + "<span>" + tx("Úsalo solo cuando el miembro ya no está en el club (por ejemplo, olvidó registrar su salida).", "Use it only when the member has already left (e.g. forgot to check out).") + '</span></div></div><div class="modal-foot"><button type="button" class="btn btn-secondary" data-act="closeModal">' + tx("Cancelar", "Cancel") + '</button><button type="button" class="btn btn-danger" data-act="forceAllGo">' + tx("Forzar salida", "Force check-out") + "</button></div>"; } });
      App.handlers.forceAllGo = function () { App.forceCheckoutAll(by); App.closeModal(); App.rerender(); App.toast(tx(n + " salida(s) forzada(s) · marcadas en el registro", n + " forced check-out(s) · flagged in the log")); if (after) after(); };
    };
  };

  /* ---------- Licencia de Armas (PR weapons license) */
  /* bands: ok (>180 d) · soon6 (31–180) · soon30 (1–30) · today · expired · suspended · revoked · none */
  App.lic = function (m) {
    var l = (m && m.lic) || {}, days = l.exp ? App.diff(l.exp, TODAY) : null;
    var band = l.st === "suspended" || l.st === "revoked" ? l.st : days == null ? "none" : days < 0 ? "expired" : days === 0 ? "today" : days <= 30 ? "soon30" : days <= 180 ? "soon6" : "ok";
    return { no: l.no || "", masked: App.mask(l.no), exp: l.exp || null, days: days, band: band, blocked: band === "expired" || band === "suspended" || band === "revoked", filed: (m && m.licFiled) || null,
      graceEnd: l.exp ? App.addDays(l.exp, 30) : null, cancelBy: l.exp ? App.addMonths(l.exp, 6) : null };
  };
  App.licBadge = function (m, lg) {
    var L = App.lic(m), cls = { ok: "active", soon6: "neutral", soon30: "grace", today: "grace", expired: "lapsed", suspended: "lapsed", revoked: "lapsed", none: "neutral" }[L.band];
    var txt = L.band === "ok" ? tx("Licencia vigente", "License valid") : L.band === "expired" ? tx("Licencia vencida", "License expired") + " · " + tx("hace " + -L.days + " d", -L.days + " d ago") : L.band === "suspended" ? tx("Licencia suspendida", "License suspended") : L.band === "revoked" ? tx("Licencia revocada", "License revoked") : L.band === "none" ? tx("Sin licencia", "No license") : L.days === 0 ? tx("Licencia vence hoy", "License expires today") : tx("Licencia vence en " + L.days + " d", "License expires in " + L.days + " d");
    return '<span class="badge badge--' + cls + (lg ? " badge-lg" : "") + '" data-lic="' + L.band + '">' + ic(L.band === "ok" ? "check-circle" : L.blocked ? "x-circle" : "clock") + txt + "</span>";
  };
  /* dashboard bands: ≤6 months (31–180 d), ≤30 days (0–30 d, incl. today), expired (in the 30-day grace or accruing fines) */
  App.licBands = function () {
    var cur = App.members(), ini = App.members({ initial: true }), b = App.ten().licBase;
    var inB = function (m, k) { var x = App.lic(m).band; return k === "soon30" ? (x === "soon30" || x === "today") : x === k; };
    var cnt = function (list, k) { return list.filter(function (m) { return inB(m, k); }).length; };
    var out = {}; ["soon6", "soon30", "expired"].forEach(function (k) { out[k] = { n: b[k] + cnt(cur, k) - cnt(ini, k), list: cur.filter(function (m) { return inB(m, k); }).sort(function (a, c) { return App.lic(a).days - App.lic(c).days; }) }; });
    return out;
  };
  /* License reminder timeline (Legal §5): anchored to the expiry date E. */
  App.LIC_DAYS = [180, 120, 90, 60, 30, 14, 7, 0, -7, -25, -60, -120, -150];
  App.licStepKey = function (d) { return d > 0 ? "l" + d : d === 0 ? "l0" : "lp" + -d; };
  App.licChannels = function (m) { var c = App.settings().licCh, out = []; if (c.email) out.push("email"); if (c.push) out.push("push"); if (c.app) out.push("app"); if (c.sms && m && m.sms !== false) out.push("sms"); return out; };
  App.licTimeline = function (m) {
    var L = App.lic(m); if (!L.exp) return [];
    return App.LIC_DAYS.map(function (d) {
      var at = App.addDays(L.exp, -d), st = at < TODAY ? "sent" : at === TODAY ? "today" : "upcoming";
      if (L.filed && at >= L.filed) st = "paused";
      if (L.band === "suspended" || L.band === "revoked") st = at < TODAY ? "sent" : "off";
      return { d: d, key: App.licStepKey(d), at: at, st: st };
    });
  };
  App.licTimelineHTML = function (m, compact) {
    var rows = App.licTimeline(m); if (!rows.length) return "";
    var lab = function (d) { return d > 0 ? tx(d + " días antes", d + " days before") : d === 0 ? tx("Día de vencimiento", "Expiry day") : tx(-d + " días después", -d + " days after"); };
    var note = function (d) { return d === 180 ? tx("Ya puede renovar", "Renewal opens") : d === 0 ? tx("Desde mañana no puede tirar", "From tomorrow: may not shoot") : d === -25 ? tx("Antes de las multas", "Before fines start") : d === -60 || d === -120 ? tx("Multa $25/mes", "$25/month fine") : d === -150 ? tx("Aviso de cancelación", "Cancellation warning") : ""; };
    var stl = { sent: tx("Enviado", "Sent"), today: tx("Hoy", "Today"), upcoming: tx("Próximo", "Upcoming"), paused: tx("En pausa", "Paused"), off: tx("No aplica", "N/A") };
    return '<ol class="ltl' + (compact ? " is-compact" : "") + '" data-ltl>' + rows.map(function (r) {
      return '<li class="ltl-i is-' + r.st + (r.d === 0 ? " is-e" : "") + '" data-st="' + r.st + '"><span class="ltl-dot"></span><span class="ltl-l"><strong>' + lab(r.d) + "</strong>" + (note(r.d) ? '<span class="xs subtle"> · ' + note(r.d) + "</span>" : "") + '<span class="xs subtle ltl-date">' + App.fds(r.at) + '</span></span><span class="ltl-s">' + stl[r.st] + "</span></li>";
    }).join("") + "</ol>";
  };
  App.filedToggle = function (m) { var on = !!(m && m.licFiled); return '<button type="button" class="tgl" role="switch" aria-checked="' + on + '" data-act="licFiled" data-filed="' + on + '"><span class="tgl-k"></span><span class="tgl-t">' + (on ? tx("Sí · radicada el ", "Yes · filed ") + App.fds(m.licFiled) + tx(" · avisos en pausa", " · reminders paused") : tx("No · avisos activos", "No · reminders on")) + "</span></button>"; };
  App.setLicFiled = function (id, on) { App.update(id, { licFiled: on ? TODAY : null }); App.event({ type: "licFiled", id: id, name: (App.member(id) || {}).name, on: !!on }); };
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
      if (m.payPending) { msgs.push({ kind: "skip", mid: m.id, step: step, ch: [], pend: true }); return; }
      if (m.autorenew) {
        if (step === "d7") msgs.push({ kind: "auto7", mid: m.id, ch: ["email", "sms"] });
        else msgs.push({ kind: "skip", mid: m.id, step: step, ch: [] });
        return;
      }
      var ch = (step === "d30" || step === "d14") ? ["email"] : (m.sms === false ? ["email"] : ["sms", "email"]);
      msgs.push({ kind: "reminder", mid: m.id, step: step, ch: ch, noSms: m.sms === false && step !== "d30" && step !== "d14" });
    });
    list.filter(function (m) { return m.status !== "cancelled" && m.lic && m.lic.exp; }).forEach(function (m) {
      var L = App.lic(m), d = -L.days; if (App.LIC_DAYS.indexOf(-d) < 0 || L.band === "suspended" || L.band === "revoked") return;
      if (L.filed) { msgs.push({ kind: "skip", mid: m.id, step: App.licStepKey(L.days), ch: [], filed: true }); return; }
      msgs.push({ kind: "lic", mid: m.id, step: App.licStepKey(L.days), ch: App.licChannels(m), noSms: App.settings().licCh.sms && m.sms === false });
    });
    var order = { d1: 0, d0: 1, d7: 2, g3: 3, lapsed: 4, d14: 5, d30: 6 }; App.LIC_DAYS.forEach(function (d, i) { order[App.licStepKey(d)] = 20 - i; });
    msgs.sort(function (a, b) { return (a.kind === "skip") - (b.kind === "skip") || ((a.step in order) ? order[a.step] : 2.5) - ((b.step in order) ? order[b.step] : 2.5); });
    App.ts().outbox.run = { at: Date.now(), msgs: msgs }; save();
    return msgs;
  };
  App.STEPN = { d30: ["30 días antes", "30 days before"], d14: ["14 días antes", "14 days before"], d7: ["7 días antes", "7 days before"], d1: ["1 día antes", "1 day before"], d0: ["Día de vencimiento", "Expiry day"], g3: ["En gracia · día 3", "Grace · day 3"], lapsed: ["Vencida", "Lapsed"],
    l0: ["Licencia · día de vencimiento", "License · expiry day"] };
  [180, 120, 90, 60, 30, 14, 7].forEach(function (d) { App.STEPN["l" + d] = ["Licencia · " + d + " días antes", "License · " + d + " days before"]; });
  [7, 25, 60, 120, 150].forEach(function (d) { App.STEPN["lp" + d] = ["Licencia · " + d + " días después", "License · " + d + " days after"]; });
  App.LIC_STEPS = App.LIC_DAYS.map(function (d) { return App.licStepKey(d); });
  /* SMS length/encoding: GSM-7 = 160 chars per single segment (153 per part if longer); any other char forces UCS-2 (70 / 67). */
  var GSM = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà", GSMX = "^{}\\[~]|€";
  App.smsInfo = function (txt) {
    var gsm = true, len = 0;
    for (var i = 0; i < txt.length; i++) { var c = txt[i]; if (GSM.indexOf(c) >= 0) len++; else if (GSMX.indexOf(c) >= 0) len += 2; else { gsm = false; break; } }
    if (!gsm) { len = txt.length; return { enc: "UCS-2", len: len, max: 70, seg: len <= 70 ? 1 : Math.ceil(len / 67) }; }
    return { enc: "GSM-7", len: len, max: 160, seg: len <= 160 ? 1 : Math.ceil(len / 153) };
  };
  App.ascii = function (s) { return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, ""); };

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
        e("Renueva en un minuto, sin contraseña: " + App.money(tr.price) + " con tarjeta de crédito/débito o ATH Móvil, o resérvala y paga en recepción (efectivo o cheque).", "Renew in a minute, no password: " + App.money(tr.price) + " by credit/debit card or ATH Móvil, or reserve it and pay at the front desk (cash or check).")];
    } else if (msg.kind === "auto7") {
      var mth = e("tu tarjeta", "your card");
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
      var pl = App.payLine(msg.method, msg.pay, L);
      body = [e("Hola " + first + ",", "Hi " + first + ","), e("Recibimos tu pago de " + App.money(tr2.price) + ". Tu membresía está activa hasta el " + App.fd(p2.expires, "es") + ".", "We received your payment of " + App.money(tr2.price) + ". Your membership is active until " + App.fd(p2.expires, "en") + ".")]
        .concat(pl ? [e("Método de pago: " + pl + (msg.receipt ? " · Recibo " + msg.receipt : "") + ".", "Payment method: " + pl + (msg.receipt ? " · Receipt " + msg.receipt : "") + ".")] : []);
      cta = e("Ver mi tarjeta digital", "View my digital card");
    } else if (msg.kind === "payPending") {
      var p3 = App.member(msg.mid, list) || m, pp3 = p3.payPending || {}, amt3 = App.money(pp3.amount || tr.price), due3 = pp3.due ? App.fd(pp3.due, L) : "";
      subj = e("Pendiente de pago en recepción: " + amt3 + " antes del " + due3, "Payment pending at the front desk: " + amt3 + " by " + due3);
      body = [e("Hola " + first + ",", "Hi " + first + ","),
        pp3.kind === "signup" ? e("Reservamos tu inscripción. Se activa cuando pagues en recepción.", "We reserved your sign-up. It activates when you pay at the front desk.") : e("Reservamos tu renovación. Tu membresía sigue como está hasta que pagues en recepción.", "We reserved your renewal. Your membership stays as it is until you pay at the front desk."),
        e("Trae " + amt3 + " en efectivo o un cheque a nombre de " + t.name + " a más tardar el " + due3 + ".", "Bring " + amt3 + " in cash or a check payable to " + t.name + " by " + due3 + ".")];
      cta = e("Ver mi portal", "Open my portal");
    }
    var push = null, inapp = null;
    if (msg.kind === "lic") {
      /* License reminders are informational. SMS copy avoids accents (single GSM-7 segment) and gun/ammo wording (carrier SHAFT rules). */
      var LI = App.lic(m), nd = LI.days, dl = App.fd(LI.exp, L), dA = App.ascii(dl), fA = App.ascii(first), lk = t.host + "/l", nm = App.ascii(t.name);
      var gA = App.ascii(App.fd(LI.graceEnd, L)), cA = App.ascii(App.fd(LI.cancelBy, L)), gl = App.fd(LI.graceEnd, L), cl = App.fd(LI.cancelBy, L), ago = -nd;
      var smsCore = nd > 0 ? e("tu licencia vence el " + dA + " (en " + nd + " dias). " + (nd === 180 ? "Ya puedes comenzar la renovacion." : "Renueva con tiempo."), "your license expires " + dA + " (in " + nd + " days). " + (nd === 180 ? "You can start renewing now." : "Renew in time."))
        : nd === 0 ? e("tu licencia vence HOY (" + dA + "). Tienes hasta el " + gA + " para renovar sin multa.", "your license expires TODAY (" + dA + "). Renew by " + gA + " to avoid fines.")
        : ago <= 25 ? e("tu licencia vencio el " + dA + ". Renueva antes del " + gA + " para evitar multas.", "your license expired " + dA + ". Renew by " + gA + " to avoid fines.")
        : ago < 150 ? e("tu licencia vencio el " + dA + " y acumula multa de $25 al mes. Renueva pronto.", "your license expired " + dA + " and is accruing a $25/month fine. Renew soon.")
        : e("tu licencia vencio el " + dA + ". Puede ser cancelada el " + cA + ". Renueva ya.", "your license expired " + dA + ". It may be cancelled on " + cA + ". Renew now.");
      var full = nm + ": " + fA + ", " + smsCore + " " + e("Info: ", "Info: ") + lk + e(" STOP para salir", " Reply STOP to opt out");
      var short = nm + ": " + fA + ", " + smsCore + " " + lk + " STOP";
      sms = App.smsInfo(full).enc === "GSM-7" && App.smsInfo(full).len <= 160 ? full : short; // always one GSM-7 segment
      subj = nd > 0 ? e("Tu licencia de armas vence el " + dl, "Your gun license expires " + dl) : nd === 0 ? e("Tu licencia de armas vence hoy", "Your gun license expires today")
        : ago < 150 ? e("Tu licencia de armas venció el " + dl, "Your gun license expired " + dl) : e("Aviso: tu licencia de armas puede ser cancelada", "Notice: your gun license may be cancelled");
      body = [e("Hola " + first + ",", "Hi " + first + ","),
        nd > 0 ? e("Tu Licencia de Armas (" + LI.masked + ") vence el " + dl + ", en " + nd + " días." + (nd === 180 ? " Desde hoy puedes comenzar la renovación." : ""), "Your gun license (" + LI.masked + ") expires " + dl + ", in " + nd + " days." + (nd === 180 ? " You can start the renewal today." : ""))
          : nd === 0 ? e("Tu Licencia de Armas (" + LI.masked + ") vence hoy. Desde mañana no podrás tirar en el club hasta renovarla. Tienes hasta el " + gl + " para renovar sin multa.", "Your gun license (" + LI.masked + ") expires today. From tomorrow you can't shoot at the range until it's renewed. You have until " + gl + " to renew without a fine.")
          : ago <= 25 ? e("Tu Licencia de Armas (" + LI.masked + ") venció el " + dl + ". Si renuevas antes del " + gl + " no pagas multa.", "Your gun license (" + LI.masked + ") expired " + dl + ". Renew before " + gl + " and there's no fine.")
          : ago < 150 ? e("Tu Licencia de Armas (" + LI.masked + ") venció el " + dl + ". Desde el " + gl + " se acumula una multa de $25 al mes.", "Your gun license (" + LI.masked + ") expired " + dl + ". Since " + gl + " a $25/month fine is accruing.")
          : e("Tu Licencia de Armas (" + LI.masked + ") venció el " + dl + ". Si no la renuevas, puede ser cancelada a partir del " + cl + ".", "Your gun license (" + LI.masked + ") expired " + dl + ". If it isn't renewed it may be cancelled from " + cl + "."),
        e("Si ya radicaste la renovación, márcalo en tu portal («Renovación radicada») y pausamos estos avisos.", "If you already filed the renewal, mark it in your portal (“Renewal filed”) and we'll pause these notices."),
        e("Aviso informativo de " + t.name + ". La renovación la tramitas tú ante la Policía de Puerto Rico.", "Informational notice from " + t.name + ". You renew the license yourself with the Puerto Rico Police.")];
      cta = e("Ver mi licencia", "View my license"); link = lk;
      push = { title: nd > 0 ? e("Licencia: vence en " + nd + " días", "License: expires in " + nd + " days") : nd === 0 ? e("Licencia: vence hoy", "License: expires today") : e("Licencia vencida hace " + ago + " días", "License expired " + ago + " days ago"),
        body: nd > 0 ? e("Vence el " + dl + ". Toca para ver tu calendario de avisos.", "Expires " + dl + ". Tap to see your reminder timeline.") : nd === 0 ? e("Renueva antes del " + gl + " para evitar multas.", "Renew by " + gl + " to avoid fines.") : ago <= 25 ? e("Renueva antes del " + gl + " para evitar multas.", "Renew by " + gl + " to avoid fines.") : ago < 150 ? e("Multa de $25 al mes desde el " + gl + ".", "$25/month fine since " + gl + ".") : e("Puede ser cancelada el " + cl + ".", "May be cancelled on " + cl + ".") };
      inapp = { title: subj, body: body[1] };
    }
    return { m: m, L: L, sms: sms, subj: subj, body: body || [], cta: cta, link: link, push: push, inapp: inapp };
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
    var meth = Object.assign({}, b.meth); ren.forEach(function (e) { if (src[e.src] == null) return; meth[e.method === "card" ? "card" : e.method === "ath" ? "ath" : "desk"]++; });
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
      src: src, meth: meth, steps: steps, visitsToday: b.days[13] + visits, checkinsToday: checkins.length, counts: counts, households: b.households + App.ts().added.filter(function (m) { return !m.hh; }).length
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
  /* Endorsement: "Range Club, por Infante Automation" with the iA badge mark (badge variant at every size; fixed aspect ratio;
     clear space = teal-dot height ≈ 12% of the mark; never recolored). Text in muted slate. */
  App.endorse = function (size, cls) {
    size = size || 16;
    var src = size >= 24 ? "assets/brand/mark.svg" : "assets/brand/ia-mark.svg"; // >= 24px: mark.svg; below 24px: badge (favicon.svg)
    return '<span class="endorse' + (cls ? " " + cls : "") + '" data-endorse><img class="ia-mark" src="' + src + '" width="' + size + '" height="' + size + '" alt="iA" style="margin:' + Math.max(2, Math.round(size * 0.125)) + 'px"><span>' + tx("Range Club, por Infante Automation", "Range Club, by Infante Automation") + "</span></span>";
  };
  App.powered = function () { return '<span class="powered"><svg><use href="#rc-mark"/></svg>' + tx("Con la tecnología de Range Club", "Powered by Range Club") + "</span>" + '<div class="endorse-row">' + App.endorse(16) + "</div>"; };

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
    { n: 1, page: "signup", href: "signup.html", t: ["Inscripción desde el teléfono", "Sign-up on a phone"], d: ["Un miembro nuevo elige plan, valida 21+, registra su licencia de armas, firma el relevo bilingüe y acepta textos. Todo viene lleno: solo toca.", "A new member picks a plan, passes the 21+ check, adds their gun license, signs the bilingual waiver and opts in to texts. Everything is prefilled: just tap."] },
    { n: 2, page: "outbox", href: "dashboard.html", t: ["Recordatorios de hoy", "Today's reminders"], d: ["El dueño ejecuta los recordatorios: renovaciones por texto y email; licencias de armas por email, push y en la app (SMS solo si el club lo activa).", "The owner runs today's reminders: renewals by text and email; gun licenses by email, push and in-app (SMS only if the range turns it on)."] },
    { n: 3, page: "renew", href: "renew.html", t: ["Renovación en un clic", "One-click renewal"], d: ["El miembro toca el enlace y renueva con tarjeta, ATH Móvil o pago en recepción, sin iniciar sesión.", "The member taps the link and renews by card, ATH Móvil or pay at the front desk, no login."] },
    { n: 4, page: "card", href: "portal.html", t: ["Portal y tarjeta digital", "Portal & digital card"], d: ["La membresía ya está Activa; su tarjeta QR es la que se escanea en recepción.", "The membership is now Active; the QR card is what the front desk scans."] },
    { n: 5, page: "checkin", href: "checkin.html", t: ["Recepción: entrada y salida", "Front desk: check-in & check-out"], d: ["Uno pasa, uno vencido (Renovar ahora → entra con su calibre → registra su salida con la duración), uno con relevo viejo y uno con licencia de armas vencida: rechazo en rojo.", "One cleared, one lapsed (Renew now → in with their caliber → checks out with duration), one with an old waiver and one with an expired gun license: red refusal."] },
    { n: 6, page: "dashboard", href: "dashboard.html", t: ["Panel del dueño", "Owner dashboard"], d: ["Quién está en las instalaciones ahora, licencias por vencer, el registro de visitas oficial con CSV y el cierre del día con salida forzada.", "Who's on site now, expiring licenses, the official visit log with CSV and end of day with forced check-out."] },
    { n: 7, page: "settings", href: "settings.html", t: ["Licencias: avisos y canales", "Licenses: reminders & channels"], d: ["Licencia vencida, suspendida o revocada siempre bloquea. Calendario de avisos de 180 días antes a 150 después; email, push y en la app; SMS opcional y apagado.", "An expired, suspended or revoked license always blocks. Reminder timeline from 180 days before to 150 after; email, push and in-app; SMS optional and off."] },
    { n: 8, page: "kiosk", href: "kiosk.html", t: ["Modo quiosco", "Kiosk mode"], d: ["Autoservicio: entrada y salida con la tarjeta o con teléfono + código, o firmar el relevo ahí mismo.", "Self-service: check in and out with the card or phone + code, or sign the waiver right there."] },
    { n: 9, page: "salinas", href: "dashboard.html?tenant=salinas", t: ["Cambiar a Club de Tiro Salinas", "Switch to Club de Tiro Salinas"], d: ["Otra marca, otros miembros, visitas y licencias; nada de los datos de Guayama.", "Its own brand, members, visits and licenses; none of Guayama's data."] }
  ];
  App.stepFor = function (page) { for (var i = 0; i < App.STEPS.length; i++) if (App.STEPS[i].page === page) return App.STEPS[i]; return null; };

  /* ------------------------------------------------------------ staff shell */
  var NAV = [
    ["dashboard", "dashboard", "Panel", "Dashboard", "dashboard.html"],
    ["checkin", "login", "Registrar entrada", "Check-in", "checkin.html"],
    ["members", "users", "Miembros", "Members", "members.html"],
    ["visits", "history", "Registro de visitas", "Visit log", "visits.html"],
    ["outbox", "send", "Mensajes (demo)", "Messages (demo)", "outbox.html"],
    ["kiosk", "tablet", "Modo quiosco", "Kiosk mode", "kiosk.html"]
  ];
  var NAV2 = [["layers", "Planes y precios", "Plans & pricing"]];
  var NAV3 = [["reminders", "bell", "Recordatorios", "Reminders", "settings.html#recordatorios"], ["settings", "settings", "Ajustes del club", "Range settings", "settings.html"]];
  App.staffShell = function (active, inner) {
    var t = App.ten();
    var nav = NAV.map(function (n) {
      return '<a class="nav-item' + (n[0] === active ? " is-active" : "") + '" href="' + n[4] + '"' + (n[0] === active ? ' aria-current="page"' : "") + ">" + ic(n[1]) + "<span>" + tx(n[2], n[3]) + "</span></a>";
    }).join("");
    var nav3 = NAV3.map(function (n) { return '<a class="nav-item' + (n[0] === active ? " is-active" : "") + '" href="' + n[4] + '">' + ic(n[1]) + "<span>" + tx(n[2], n[3]) + "</span></a>"; }).join("");
    var nav2 = NAV2.map(function (n) { return '<span class="nav-item is-disabled" title="' + tx("Fuera del alcance de esta demo", "Not part of this demo") + '">' + ic(n[0]) + "<span>" + tx(n[1], n[2]) + '</span><span class="nav-off">' + tx("demo", "demo") + "</span></span>"; }).join("");
    return '<div class="app">' +
      '<aside class="sidebar" id="sidebar"><div class="sidebar-inner">' +
      '<a class="rc-logo" href="index.html"><svg><use href="#rc-mark"/></svg><span>Range Club</span></a>' +
      '<button type="button" class="tenant-switch" data-act="tenantMenu" aria-haspopup="true"><svg class="tenant-mark">' + App.mark() + '</svg><div class="grow"><div class="t-name">' + t.name + '</div><div class="t-sub">' + t.host + "</div></div>" + ic("chev-up-down", "i-sm subtle") + "</button>" +
      '<nav class="nav" aria-label="' + tx("Principal", "Main") + '"><div class="nav-label">' + tx("Operación", "Operations") + "</div>" + nav + '<div class="nav-label">' + tx("Configuración", "Setup") + "</div>" + nav2 + nav3 + "</nav>" +
      '<div class="sidebar-foot"><div class="staff-chip"><div class="avatar avatar-sm av-1">' + t.owner.ini + '</div><div class="grow" style="line-height:16px"><div style="font-weight:600;font-size:13px">' + t.owner.name + '</div><div class="xs subtle">' + tx("Dueño/a", "Owner") + "</div></div></div></div>" +
      "</div></aside>" +
      '<div class="sidebar-scrim" data-act="navClose"></div>' +
      '<main class="main"><header class="topbar">' +
      '<button type="button" class="icon-btn nav-toggle" data-act="navOpen" aria-label="' + tx("Menú", "Menu") + '">' + ic("more") + "</button>" +
      '<form class="search input-wrap" action="members.html" role="search">' + ic("search", "i-sm") + '<input class="input" name="q" value="' + App.esc(t.demo.desk) + '" placeholder="' + tx("Buscar miembros, # o teléfono…", "Search members, # or phone…") + '" aria-label="' + tx("Buscar miembros", "Search members") + '"></form>' +
      '<span class="grow"></span>' + App.langSeg() +
      '<a class="btn btn-primary topbar-cta" href="checkin.html">' + ic("login", "i-sm") + "<span>" + tx("Registrar entrada", "Check in") + "</span></a>" +
      '</header><div class="content">' + inner + '<footer class="app-foot">' + App.endorse(16) + "</footer></div></main></div>";
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
      '<div class="g-endorse">' + App.endorse(16) + "</div>" +
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
  document.addEventListener("input", function (e) {
    var k = e.target && e.target.dataset && e.target.dataset.pay, c = App.payCtx; if (!k || !c) return;
    if (["holder", "num", "exp", "cvv", "zip"].indexOf(k) >= 0) { c.card = c.card || {}; c.card[k] = e.target.value; } else c[k] = e.target.value;
    if (k === "cashRec") { var ch = document.querySelector("[data-change]"); if (ch) ch.textContent = App.money(Math.max(0, App.num(c.cashRec) - (c.amount || 0))); }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && App.modalDef && !App.modalDef.sticky) App.closeModal(); });

  /* ------------------------------------------------------------ payment pieces (renewal, sign-up, front desk) */
  /* Payment inputs are prefilled with the club's sandbox data and stay editable (typing updates the live state). */
  App.payDefaults = function (vm, who) {
    var d = App.ten().demo; who = who || {};
    if (!vm.card) vm.card = { holder: who.name || "", num: d.card.num, exp: d.card.exp, cvv: d.card.cvv, zip: App.ten().zip };
    if (vm.athPhone == null) vm.athPhone = who.phone || "";
    if (vm.amount != null && vm.cashRec == null) vm.cashRec = (Math.floor(vm.amount / 20) * 20 + 20).toFixed(2); // prefilled: next $20 bill above the amount
    if (vm.chkNo == null) vm.chkNo = d.chk || "1047";
  };
  App.payCheck = function (vm) {
    if (vm.method === "card") {
      var c = vm.card || {};
      if (!String(c.holder || "").trim()) return tx("Escribe el nombre en la tarjeta.", "Enter the cardholder name.");
      if (!/^\d{15,16}$/.test(String(c.num || "").replace(/\D/g, ""))) return tx("Número de tarjeta no válido.", "Invalid card number.");
      if (!/^\d{2}\s*\/\s*\d{2}$/.test(String(c.exp || "").trim())) return tx("Vencimiento: usa MM / AA.", "Expiry: use MM / YY.");
      if (!/^\d{3,4}$/.test(String(c.cvv || "").trim())) return tx("CVV de 3 o 4 dígitos.", "3- or 4-digit CVV.");
      if (!/^\d{5}$/.test(String(c.zip || "").trim())) return tx("Código postal de 5 dígitos.", "5-digit ZIP code.");
    }
    if (vm.method === "ath" && String(vm.athPhone || "").replace(/\D/g, "").length !== 10) return tx("Escribe el móvil de ATH Móvil (10 dígitos).", "Enter the ATH Móvil mobile number (10 digits).");
    if (vm.method === "cash" && App.num(vm.cashRec) < (vm.amount || 0)) return tx("El efectivo recibido no cubre el total.", "Cash received doesn't cover the total.");
    if (vm.method === "check" && !/^\d{3,8}$/.test(String(vm.chkNo || "").trim())) return tx("Escribe el número del cheque (3 a 8 dígitos).", "Enter the check number (3 to 8 digits).");
    return null;
  };
  /* vm.desk = true: staff at the front desk (card / ATH Móvil / cash / check, completes now).
     Otherwise member-initiated (card / ATH Móvil / pay at front desk = reserved, pending until staff collect). No processor or card-network logos. */
  App.payMethods = function (vm) { return vm.desk ? ["card", "ath", "cash", "check"] : ["card", "ath", "desk"]; };
  App.payPicker = function (vm, who) {
    App.payDefaults(vm, who); App.payCtx = vm;
    if (App.payMethods(vm).indexOf(vm.method) < 0) vm.method = "card";
    var pin = function (k, label, val, attrs) { return '<label class="pf"><span class="pf-l">' + label + '</span><input class="input" data-pay="' + k + '" value="' + App.esc(val) + '"' + (attrs || "") + "></label>"; };
    var opt = function (k, inner) { return '<button type="button" class="pay-opt' + (vm.method === k ? " is-selected" : "") + '" data-act="payMethod" data-v="' + k + '" aria-pressed="' + (vm.method === k) + '">' + (vm.method === k ? '<span class="sel">' + ic("check") + "</span>" : "") + inner + "</button>"; };
    var face = {
      card: ic("card", "i-lg") + "<span>" + tx("Tarjeta de crédito/débito", "Credit/debit card") + "</span>",
      ath: '<span class="wm wm-ath">ATH</span><span>ATH Móvil</span>',
      desk: ic("desk", "i-lg") + "<span>" + tx("Pago en recepción", "Pay at front desk") + '<small class="po-sub">' + tx("efectivo/cheque", "cash/check") + "</small></span>",
      cash: ic("dollar", "i-lg") + "<span>" + tx("Efectivo", "Cash") + "</span>",
      check: ic("receipt", "i-lg") + "<span>" + tx("Cheque", "Check") + "</span>"
    };
    var ms = App.payMethods(vm);
    var html = '<div class="pay-opts' + (ms.length > 3 ? " is-4" : "") + '">' + ms.map(function (k) { return opt(k, face[k]); }).join("") + "</div>";
    if (vm.method === "card") html += '<div class="hosted"><div class="hosted-label">' + ic("lock") + tx("Campos seguros del procesador de pagos · el club nunca ve tu tarjeta", "Payment processor's secure fields · the range never sees your card") + "</div>" +
      pin("holder", tx("Nombre en la tarjeta", "Cardholder name"), vm.card.holder, ' autocomplete="cc-name"') + pin("num", tx("Número de tarjeta", "Card number"), vm.card.num, ' inputmode="numeric" autocomplete="cc-number"') +
      '<div class="pf-row">' + pin("exp", tx("Vence", "Expiry"), vm.card.exp, ' inputmode="numeric" autocomplete="cc-exp" placeholder="MM / AA"') + pin("cvv", "CVV", vm.card.cvv, ' inputmode="numeric" maxlength="4" autocomplete="cc-csc"') + pin("zip", tx("Código postal", "ZIP"), vm.card.zip, ' inputmode="numeric" maxlength="5" autocomplete="postal-code"') + "</div>" +
      '<div class="xs subtle">' + tx("Tarjeta de prueba (sandbox) ya escrita: no se cobra dinero real.", "Sandbox test card already filled in: no real money is charged.") + "</div></div>";
    if (vm.method === "ath") html += '<div class="hosted">' + pin("athPhone", tx("Móvil registrado en ATH Móvil", "Mobile number registered with ATH Móvil"), vm.athPhone, ' inputmode="tel" autocomplete="tel"') + '<div class="xs subtle row" style="gap:6px;align-items:flex-start">' + ic("phone", "i-xs") + "<span>" + tx("Te enviaremos una solicitud de pago a este número. Tienes hasta 10 minutos para aprobarla.", "We'll send a payment request to this number. You have up to 10 minutes to approve it.") + "</span></div></div>";
    if (vm.method === "desk") html += '<div class="callout tenant" data-desk-note>' + ic("desk") + "<span>" + tx("Reservamos tu " + (vm.signup ? "inscripción" : "renovación") + " y pagas en recepción en efectivo o con cheque a nombre de " + App.ten().name + ". " + (vm.signup ? "Tu membresía queda pendiente" : "Tu membresía sigue como está") + " hasta que el personal confirme el pago.", "We reserve your " + (vm.signup ? "sign-up" : "renewal") + " and you pay at the front desk in cash or by check payable to " + App.ten().name + ". " + (vm.signup ? "Your membership stays pending" : "Your membership stays as it is") + " until staff confirm the payment.") + "</span></div>";
    if (vm.method === "cash") {
      var chg = Math.max(0, App.num(vm.cashRec) - (vm.amount || 0));
      html += '<div class="hosted"><div class="pf-row">' + pin("cashRec", tx("Efectivo recibido", "Cash received"), vm.cashRec, ' inputmode="decimal"') + '<div class="pf"><span class="pf-l">' + tx("Cambio", "Change") + '</span><div class="input ro-input" data-change>' + App.money(chg) + "</div></div></div>" +
        '<div class="xs subtle">' + tx("Total a cobrar: ", "Total due: ") + App.money(vm.amount || 0) + tx(" · el recibo indica efectivo, lo recibido y el cambio.", " · the receipt shows cash, amount received and change.") + "</div></div>";
    }
    if (vm.method === "check") html += '<div class="hosted">' + pin("chkNo", tx("Número de cheque", "Check number"), vm.chkNo, ' inputmode="numeric" maxlength="8"') + '<div class="xs subtle">' + tx("A nombre de " + App.ten().name + " por " + App.money(vm.amount || 0) + ". El recibo indica el número de cheque.", "Payable to " + App.ten().name + " for " + App.money(vm.amount || 0) + ". The receipt shows the check number.") + "</div></div>";
    var locked = vm.method !== "card";
    html += '<div class="optin' + (locked ? " is-locked" : "") + '"><button type="button" class="toggle' + (vm.autorenew && !locked ? " is-on" : "") + (locked ? " is-locked" : "") + '" data-act="autorenew" role="switch" aria-checked="' + (!!vm.autorenew && !locked) + '" ' + (locked ? 'aria-disabled="true"' : "") + ' aria-label="' + tx("Auto-renovación", "Auto-renew") + '"></button><div><div class="optin-title">' + tx("Activar auto-renovación (opcional)", "Turn on auto-renew (optional)") + '</div><div class="optin-text">' +
      (locked ? ic("lock", "i-xs") + " " + tx("La auto-renovación solo está disponible con tarjeta de crédito/débito.", "Auto-renew is only available with a credit/debit card.")
        : tx("Cobraremos a tu tarjeta cada año en la fecha de renovación. Te avisaremos 7 días antes de cada cobro. Cancela cuando quieras desde tu portal.", "We'll charge your card each year on the renewal date, with a notice 7 days before each charge. Cancel anytime from your portal.")) + "</div></div></div>";
    return html;
  };
  App.payHandlers = function (vm, rer) {
    return {
      payMethod: function (el) { vm.method = el.dataset.v; if (vm.method !== "card") vm.autorenew = false; App.keepScroll = true; rer(); },
      autorenew: function () { if (vm.method !== "card") { App.toast(tx("La auto-renovación solo está disponible con tarjeta.", "Auto-renew is only available with a card."), "warn"); return; } vm.autorenew = !vm.autorenew; App.keepScroll = true; rer(); }
    };
  };
  /* Card processing (simulated) and staff-recorded cash / check (immediate) */
  App.simulatePay = function (vm, amount, who, done) {
    var msg = vm.method === "cash" || vm.method === "check" ? tx("Registrando el pago…", "Recording the payment…") : tx("Procesando el pago seguro…", "Processing secure payment…");
    App.modal({ sticky: true, render: spinner(msg) });
    setTimeout(function () { App.closeModal(); done(); }, vm.method === "card" ? 1100 : 600);
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
    if (o.expired) return '<div class="ath-wrap"><div class="ok-badge" style="background:var(--warn-600);box-shadow:0 0 0 10px var(--warn-50)">' + ic("clock") + '</div><h2 style="text-align:center">' + tx("La solicitud de ATH Móvil expiró", "The ATH Móvil request expired") + '</h2><p class="muted" style="text-align:center">' + tx("No se hizo ningún cobro. Puedes intentarlo otra vez o elegir otro método.", "Nothing was charged. Try again or choose another method.") + '</p><button type="button" class="btn btn-primary btn-lg btn-block" data-act="athRetry">' + ic("renew", "i-sm") + tx("Enviar otra solicitud", "Send a new request") + '</button><button type="button" class="btn btn-ghost btn-block" data-act="athCancel">' + tx("Elegir otro método", "Choose another method") + "</button></div>";
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
  /* One-tap signature: draws a handwriting-like stroke (seeded by the name) into the pad, animated. */
  App.sigTapBtn = function () { return '<button type="button" class="sig-tap" data-act="sigTap">' + ic("pen", "i-sm") + "<span>" + tx("Toca para firmar", "Tap to sign") + "<small>" + tx("o dibuja tu firma con el dedo", "or draw it with your finger") + "</small></span></button>"; };
  App.autoSign = function (canvas, name, done) {
    var r = canvas.getBoundingClientRect(), w = r.width, h = r.height, ctx = canvas.getContext("2d");
    var seed = 7; String(name || "x").split("").forEach(function (ch) { seed = (seed * 31 + ch.charCodeAt(0)) % 9973; });
    var rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    var words = String(name || "Firma").trim().split(/\s+/).slice(0, 2), strokes = [];
    var letters = words.reduce(function (a, wd) { return a + Math.min(wd.length, 6) + 1.6; }, 0), lw = (w * 0.74) / letters, x = w * 0.09, base = h * 0.66, tall = /[bdfhklt]/i;
    words.forEach(function (wd) {
      var pts = [], chars = wd.slice(0, 6).split("");
      chars.forEach(function (ch, i) {
        var cap = i === 0, ht = cap ? h * 0.5 : (tall.test(ch) ? h * 0.36 : h * 0.17) * (0.85 + rnd() * 0.3), a = (cap ? lw * 1.5 : lw) / (Math.PI * 2), b = a * (cap ? 1.9 : 1.55);
        for (var k = 0; k <= 22; k++) { var t = (k / 22) * Math.PI * 2; pts.push([x + a * t - b * Math.sin(t), base - ht * (1 - Math.cos(t)) / 2 + (rnd() - 0.5) * 1.2]); }
        x += a * Math.PI * 2;
      });
      strokes.push(pts); x += lw * 0.6;
    });
    var u = [], x0 = w * 0.12, x1 = Math.min(x, w * 0.9);
    for (var k = 0; k <= 20; k++) { var f = k / 20; u.push([x1 - (x1 - x0) * f, base + h * 0.1 + Math.sin(f * Math.PI) * h * 0.05]); }
    strokes.push(u);
    var segs = []; strokes.forEach(function (st) { for (var i = 1; i < st.length; i++) segs.push([st[i - 1], st[i]]); });
    var len = 0, i = 0, per = Math.max(1, Math.ceil(segs.length / 24));
    ctx.lineWidth = 2.6; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#121826";
    (function frame() {
      for (var n = 0; n < per && i < segs.length; n++, i++) { var s = segs[i]; ctx.beginPath(); ctx.moveTo(s[0][0], s[0][1]); ctx.lineTo(s[1][0], s[1][1]); ctx.stroke(); len += Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]); }
      if (i < segs.length) requestAnimationFrame(frame); else done({ url: canvas.toDataURL("image/png"), len: len, auto: true });
    })();
  };
  App.initSig = function (canvas, initial, onChange) {
    if (!canvas) return;
    var ctx = canvas.getContext("2d"), dpr = window.devicePixelRatio || 1, drawing = false, last = null, len = (initial && initial.len) || 0;
    function size() { var r = canvas.getBoundingClientRect(); canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.lineWidth = 2.6; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#121826"; }
    size();
    if (initial && initial.url) { var img = new Image(); img.onload = function () { var r = canvas.getBoundingClientRect(); ctx.drawImage(img, 0, 0, r.width, r.height); }; img.src = initial.url; }
    function pos(e) { var r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    canvas.addEventListener("pointerdown", function (e) { var tb = canvas.parentNode.querySelector(".sig-tap"); if (tb) tb.remove(); drawing = true; last = pos(e); canvas.setPointerCapture(e.pointerId); e.preventDefault(); });
    canvas.addEventListener("pointermove", function (e) { if (!drawing) return; var p = pos(e); ctx.beginPath(); ctx.moveTo(last[0], last[1]); ctx.lineTo(p[0], p[1]); ctx.stroke(); len += Math.hypot(p[0] - last[0], p[1] - last[1]); last = p; e.preventDefault(); });
    function end() { if (!drawing) return; drawing = false; onChange({ url: canvas.toDataURL("image/png"), len: len }); }
    canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", end); canvas.addEventListener("pointerleave", end);
    canvas.style.touchAction = "none";
  };
})();
