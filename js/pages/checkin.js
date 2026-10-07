/* Front desk check-in: search / scan, live check-in rule, one-tap fixes (renew, waiver, orientation, call owner),
   desk renewal (card · PayPal · ATH Móvil with countdown · send link), guests, success state. */
(function () {
  var tx = App.tx, ic = App.ic, vm = App.vm;
  var KIND_IC = { ok: "check-circle", warn: "clock", bad: "x-circle", req: "alert", ban: "ban" };
  var t0 = App.ten();
  vm.id = App.q("m") || null; vm.q = ""; vm.guests = []; vm.done = null;

  function recentIds() {
    var t = App.ten(), list = App.members(), ts = App.ts();
    var susp = list.filter(function (m) { return m.status === "suspended"; })[0];
    var base = t.deskDemo.concat([t.kioskDemo[1]]).concat(susp ? [susp.id] : []);
    var ids = (ts.recent || []).concat(base), out = [];
    ids.forEach(function (i) { if (out.indexOf(i) < 0 && App.member(i, list)) out.push(i); });
    return out.slice(0, 7);
  }
  function remember(id) { var ts = App.ts(); ts.recent = [id].concat((ts.recent || []).filter(function (x) { return x !== id; })).slice(0, 4); App.save(); }
  function itemHtml(m, list, showPhone) {
    return '<button type="button" class="recent-item' + (m.id === vm.id ? " is-current" : "") + '" data-act="pick" data-v="' + m.id + '"><div class="avatar" style="width:34px;height:34px;flex:none">' + App.portrait(m, 34) + '</div><div class="grow" style="min-width:0"><div class="nm truncate">' + m.name + '</div><div class="mt">' + m.id + (showPhone ? " · " + m.phone : "") + "</div></div>" + App.badge(App.status(m, list)) + "</button>";
  }
  function results() {
    var list = App.members(), q = App.norm(vm.q), digits = vm.q.replace(/\D/g, "");
    if (!q) return '<div class="eyebrow" style="margin-bottom:6px">' + tx("Búsquedas recientes", "Recent lookups") + '</div><div class="recent">' + recentIds().map(function (i) { return itemHtml(App.member(i, list), list); }).join("") + "</div>";
    var hits = list.filter(function (m) { return App.norm(m.name).indexOf(q) >= 0 || m.id.toLowerCase().indexOf(q) >= 0 || (digits.length >= 3 && m.phone.replace(/\D/g, "").indexOf(digits) >= 0); }).slice(0, 8);
    return '<div class="eyebrow" style="margin-bottom:6px">' + hits.length + tx(" resultado(s)", " result(s)") + '</div><div class="recent">' + (hits.map(function (m) { return itemHtml(m, list, true); }).join("") || '<div class="small subtle" style="padding:8px">' + tx("Nadie con ese nombre o teléfono en ", "No one with that name or phone at ") + App.ten().name + ".</div>") + "</div>";
  }

  function hhRole(x, p) { if (x.id === p.id) return tx("Titular · paga", "Primary · payer"); return x.gender === "f" ? tx("Adulta", "Adult") : tx("Adulto", "Adult"); }

  function result() {
    var t = App.ten(), list = App.members();
    if (!vm.id || !App.member(vm.id, list)) return '<div class="res-empty"><div class="big">' + ic("scan", "i-xl") + '</div><h2>' + tx("Escanea una tarjeta o busca un miembro", "Scan a card or search for a member") + '</h2><p style="max-width:420px">' + tx("El sistema revisa membresía, relevo, orientación, suspensión y edad 21+ en menos de un segundo.", "The system checks membership, waiver, orientation, suspension and age 21+ in under a second.") + '</p><div class="quick">' + t.deskDemo.map(function (id, i) { var m = App.member(id, list); return '<button type="button" class="btn btn-secondary" data-act="pick" data-v="' + id + '">' + (i + 1) + ". " + App.first(m.name) + " " + m.name.split(" ")[1] + "</button>"; }).join("") + '</div><div class="xs subtle">' + tx("Atajos de la demo: uno pasa, uno vencido, uno con relevo viejo.", "Demo shortcuts: one cleared, one lapsed, one with an old waiver.") + "</div></div>";
    var m = App.member(vm.id, list), p = App.primary(m, list), E = App.evaluate(m, list), st = E.st, tr = t.tiers[p.tier] || {};
    var hh = App.household(p, list), inToday = App.checkedInToday(m.id), pass = App.passes(m, list);
    var just = vm.done && vm.done.id === m.id;
    var head = '<div class="res-head"><div class="res-photo">' + App.portrait(m) + '</div><div class="grow" style="min-width:0"><div class="res-name">' + m.name + '</div><div class="res-meta">' + m.id + " · " + App.tierName(p.tier) + '</div><div class="res-meta">' + (m.hh ? tx("Adulto en el hogar de ", "Adult in the household of ") + p.name : tx("Titular · ", "Primary · ") + (hh.length > 1 ? tx("hogar de ", "household of ") + hh.length : tx("1 persona", "1 person"))) + '</div></div><div class="res-st stack-2">' + App.badge(st, true) + '<div class="small muted">' + (p.expires ? tx("Vence ", "Expires ") + '<strong style="color:var(--n-900)">' + App.fd(p.expires) + "</strong>" : tx("Sin pagar", "Unpaid")) + "</div></div></div>";
    var hero;
    if (inToday) hero = '<div class="status-hero is-go" role="status"><div class="sh-icon">' + ic("check-circle") + '</div><div><div class="sh-title">' + tx("Entrada registrada", "Checked in") + '</div><div class="sh-sub">' + App.time(inToday.at) + " · " + t.staff.short + (inToday.guests && inToday.guests.length ? " · +" + inToday.guests.length + tx(" invitado(s)", " guest(s)") : "") + (inToday.where === "kiosk" ? tx(" · en el quiosco", " · at the kiosk") : "") + (just && vm.done.renewed ? tx(" · renovó hasta el ", " · renewed until ") + App.fd(p.expires) : "") + "</div></div></div>";
    else {
      var H = {
        go: [tx("Puede entrar", "Cleared to shoot"), tx("Membresía, relevo v" + t.waiver.v + " y orientación al día", "Membership, waiver v" + t.waiver.v + " and orientation are current"), "check-circle"],
        grace: [tx("Puede entrar · en gracia", "Cleared · in grace period"), tx("Venció el " + App.fds(p.expires, "es") + " · la gracia termina el " + App.fds(App.graceEnd(m, list), "es"), "Expired " + App.fds(p.expires, "en") + " · grace ends " + App.fds(App.graceEnd(m, list), "en")), "clock"],
        stop: [tx("No puede entrar", "Not cleared"), E.hard === 1 ? tx("1 bloqueo · se resuelve a un toque", "1 blocker · one tap to fix") : tx(E.hard + " bloqueos · cada uno se resuelve a un toque", E.hard + " blockers · each one tap to fix"), "x-circle"],
        suspended: [tx("Suspendido · no puede entrar", "Suspended · not cleared"), tx("Solo el dueño puede levantar la suspensión", "Only the owner can lift the suspension"), "ban"]
      }[E.hero];
      hero = '<div class="status-hero is-' + E.hero + '" role="status"><div class="sh-icon">' + ic(H[2]) + '</div><div><div class="sh-title">' + H[0] + '</div><div class="sh-sub">' + H[1] + "</div></div></div>";
    }
    var L = { m: [tx("Membresía", "Membership"), "card"], w: [tx("Relevo v", "Waiver v") + t.waiver.v, "waiver"], o: [tx("Orientación", "Orientation"), "orientation"], s: [tx("Suspensión", "Suspension"), "shield"], a: [tx("Edad · 21+", "Age · 21+"), "user"] };
    var checks = '<div class="checks">' + ["m", "w", "o", "s", "a"].map(function (k) { var c = E.C[k]; return '<div class="ck ' + c[0] + '"><div class="ck-top">' + ic(L[k][1], "i-xs") + L[k][0] + '</div><div class="ck-val">' + ic(KIND_IC[c[0]]) + App.txa(c[1]) + '</div><div class="ck-meta">' + (c[2] || []).join(" ") + "</div></div>"; }).join("") + "</div>";
    var blockers = inToday ? "" : E.B.map(function (b) { var cls = b.dark ? "btn-dark" : (b.soft ? "btn-secondary" : "btn-primary"); return '<div class="blocker ' + b.kind + '"><div class="b-ic">' + ic(b.icon) + '</div><div class="grow"><div class="b-t">' + b.t + '</div><div class="b-d">' + b.d + '</div></div><button type="button" class="btn btn-lg ' + cls + '" data-act="' + b.act + '">' + ic(b.icon2, "i-sm") + b.fix + "</button></div>"; }).join("");
    var pips = ""; for (var i = 0; i < pass[1]; i++) pips += '<i class="' + (i < pass[0] ? "" : "used") + '"></i>';
    var guests = vm.guests.length && !inToday ? '<div class="callout tenant">' + ic("user-plus") + "<div><strong>" + tx("Invitados con esta entrada: ", "Guests with this check-in: ") + "</strong>" + vm.guests.map(function (g) { return App.esc(g.name) + " (" + (g.pass ? tx("pase", "pass") : App.money(t.guestFee, false)) + ")"; }).join(", ") + ' · <a href="#" data-act="clearGuests">' + tx("quitar", "remove") + "</a></div></div>" : "";
    var info = '<div class="info-strip"><div><div class="eyebrow">' + tx("Hogar", "Household") + '</div><div class="hh">' + hh.map(function (x) { return '<div class="hh-row">' + ic("user") + '<strong style="font-weight:600">' + x.name + '</strong><span class="r">' + hhRole(x, p) + "</span></div>"; }).join("") + "</div></div>" +
      '<div><div class="eyebrow">' + tx("Pases de invitado", "Guest passes") + '</div><div class="passes"><span class="pips">' + pips + "</span></div><div class=\"small\">" + (pass[1] ? "<strong>" + pass[0] + "</strong> " + tx("de " + pass[1] + " restantes este término", "of " + pass[1] + " left this term") : tx("Este plan no incluye pases", "This plan has no passes")) + "</div></div>" +
      '<div><div class="eyebrow">' + tx("Última visita", "Last visit") + '</div><div style="font-weight:600">' + (m.last ? App.fds(m.last) : "—") + '</div><div class="small muted row" style="gap:4px">' + ic("id", "i-xs") + tx("ID verificada", "ID verified") + "</div></div></div>";
    var foot = inToday
      ? '<div class="res-foot"><span class="small subtle grow">' + tx("Visita registrada con hora, personal e invitados.", "Visit logged with time, staff and guests.") + '</span><button type="button" class="btn btn-secondary btn-lg" data-act="scan">' + ic("scan", "i-sm") + tx("Escanear otra", "Scan another") + '</button><button type="button" class="btn btn-primary btn-lg" data-act="next">' + ic("arrow-right", "i-sm") + tx("Siguiente miembro", "Next member") + "</button></div>"
      : '<div class="res-foot"><span class="grow"></span>' + (E.can ? "" : '<a class="small nowrap" href="#" data-act="override" style="color:var(--n-600)">' + tx("Permitir con autorización del dueño", "Allow with owner approval") + "</a>") +
        '<button type="button" class="btn btn-secondary btn-lg" data-act="guest"' + (E.can ? "" : " disabled") + ">" + ic("user-plus", "i-sm") + tx("Invitado", "Guest") + '</button><button type="button" class="btn btn-lg ' + (E.can ? "btn-success" : "is-disabled") + '" data-act="doCheckin"' + (E.can ? "" : " disabled") + ">" + ic("login", "i-sm") + tx("Registrar entrada", "Check in") + "</button></div>";
    return head + '<div class="res-body">' + hero + checks + blockers + guests + info + "</div>" + foot;
  }

  function render() {
    var t = App.ten();
    return '<div class="desk"><header class="desk-bar"><a class="icon-btn" href="dashboard.html" aria-label="' + tx("Volver al panel", "Back to dashboard") + '" title="' + tx("Panel", "Dashboard") + '">' + ic("arrow-left") + '</a><a class="rc-logo hide-sm" href="index.html"><svg><use href="#rc-mark"/></svg>Range Club</a><span class="vsep"></span>' +
      '<button type="button" class="desk-tenant tenant-btn" data-act="tenantMenu"><svg>' + App.mark() + "</svg><span>" + t.name + '</span></button><span class="badge badge--neutral hide-sm">' + ic("desk") + tx("Recepción", "Front desk") + '</span><span class="grow"></span>' +
      '<span class="net hide-md"><span class="dot"></span>' + tx("En línea · caché sin conexión listo", "Online · offline cache ready") + "</span>" + App.langSeg() +
      '<div class="row hide-sm"><div class="avatar avatar-sm av-1">' + t.staff.ini + '</div><div style="line-height:16px"><div style="font-weight:600;font-size:13px" class="nowrap">' + t.staff.name + '</div><div class="xs subtle">' + tx("Personal", "Staff") + "</div></div></div></header>" +
      '<div class="desk-body"><aside class="card lookup"><button type="button" class="scan-btn" data-act="scan"><span class="sq">' + ic("scan", "i-xl") + "</span><span>" + tx("Escanear tarjeta QR", "Scan QR card") + "<small>" + tx("Acerca la tarjeta digital a la cámara", "Point the member's digital card at the camera") + "</small></span></button>" +
      '<form class="field" data-act="noop" onsubmit="return false"><label class="label" for="q">' + tx("O busca por nombre, # o teléfono", "Or search by name, # or phone") + '</label><div class="input-wrap">' + ic("search", "i-sm") + '<input class="input" id="q" autocomplete="off" value="' + App.esc(vm.q) + '" placeholder="' + tx("Nombre o (787) 555-…", "Name or (787) 555-…") + '"></div></form>' +
      '<div id="results">' + results() + '</div><div class="callout lookup-note" style="font-size:12px;line-height:16px">' + ic("info", "i-sm") + "<span>" + tx("Cada visita se registra con hora, personal e invitados.", "Every visit is logged with time, staff and guests.") + "</span></div></aside>" +
      '<section class="card result" id="result" aria-live="polite">' + result() + "</section></div></div>";
  }

  function select(id) { vm.id = id; vm.guests = []; vm.done = null; remember(id); App.rerender(); var r = document.getElementById("result"); if (r && window.innerWidth < 900) r.scrollIntoView({ behavior: "smooth", block: "start" }); }
  function cur() { var list = App.members(); return { list: list, m: App.member(vm.id, list) }; }

  /* ----- desk renewal modal */
  var R = {};
  function renewModal() {
    var c = cur(), m = c.m, p = App.primary(m, c.list), t = App.ten(), tr = t.tiers[p.tier], st = App.status(p, c.list);
    var from = (st === "active" || st === "grace") && p.expires ? p.expires : App.TODAY, exp = tr.term === "month" ? App.addMonths(from, 1) : App.addMonths(from, 12);
    R = { method: "card", autorenew: false, phone: p.phone, stage: "pay", andCheckin: true, pid: p.id, amount: tr.price, exp: exp };
    App.modal({ wide: true, sticky: true, render: function () {
      var hh = App.household(p, c.list);
      if (R.stage === "ath") return '<div class="modal-head"><h2>' + tx("Cobro con ATH Móvil", "ATH Móvil payment") + '</h2></div><div class="modal-body">' + App.athView({ amount: R.amount, phone: R.phone, expired: R.expired }) + "</div>";
      return '<div class="modal-head"><h2>' + (m.hh ? tx("Renovar hogar", "Renew household") : tx("Renovar membresía", "Renew membership")) + " · " + p.name + '</h2><button type="button" class="icon-btn" data-act="closeModal" aria-label="' + tx("Cerrar", "Close") + '">' + ic("x") + "</button></div>" +
        '<div class="modal-body"><div class="m-card m-card-pad stack-2" style="border:1px solid var(--border)"><div class="kv"><span class="k">' + tx("Plan", "Plan") + '</span><span class="v">' + App.tierName(p.tier) + '</span></div><div class="kv"><span class="k">' + tx("Cubre", "Covers") + '</span><span class="v">' + hh.length + (hh.length === 1 ? tx(" persona", " person") : tx(" adultos del hogar", " household adults")) + '</span></div><div class="kv"><span class="k">' + tx("Nueva fecha de vencimiento", "New expiry date") + '</span><span class="v">' + App.fd(exp) + '</span></div><div class="total-row"><span>' + tx("Total", "Total") + "</span><span>" + App.money(tr.price) + "</span></div></div>" +
        '<div class="label">' + tx("Método de pago", "Payment method") + "</div>" + App.payPicker(R) +
        '<label class="check"><input type="checkbox" data-act="andCheckin"' + (R.andCheckin ? " checked" : "") + '><span class="check-box">' + ic("check", "i-xs") + "</span><span>" + tx("Registrar la entrada de " + App.first(m.name) + " al completar el pago", "Check " + App.first(m.name) + " in when payment completes") + "</span></label></div>" +
        '<div class="modal-foot"><button type="button" class="btn btn-ghost" data-act="sendLink">' + ic("sms", "i-sm") + tx("Enviar enlace por texto", "Text a renewal link") + '</button><span class="grow"></span><button type="button" class="btn btn-primary btn-lg" data-act="charge">' + (R.method === "ath" ? tx("Enviar solicitud de ", "Send request for ") : tx("Cobrar ", "Charge ")) + App.money(tr.price) + "</button></div>";
    }, onClose: function () { App.athStop(); } });
  }
  function finishRenew() {
    var c = cur(), m = c.m;
    var res = App.renew(m.id, { method: R.method, autorenew: R.autorenew, src: "desk" });
    App.athStop(); App.modalDef = null; App.renderModal();
    var did = false;
    if (R.andCheckin) { var E = App.evaluate(App.member(m.id), App.members()); if (E.can) { App.checkin(m.id, vm.guests); did = true; vm.guests = []; } }
    vm.done = { id: m.id, renewed: true };
    App.rerender();
    App.toast(did ? tx("Renovada hasta el " + App.fd(res.exp, "es") + " · entrada registrada", "Renewed until " + App.fd(res.exp, "en") + " · checked in") : tx("Renovada hasta el " + App.fd(res.exp, "es") + " · recibo enviado", "Renewed until " + App.fd(res.exp, "en") + " · receipt sent"));
  }

  App.page({
    render: render,
    title: function () { return tx("Recepción", "Front desk"); },
    init: function () { if (vm.id && window.innerWidth < 900) { var r = document.getElementById("result"); if (r) r.scrollIntoView({ block: "start" }); } },
    after: function () {
      var q = document.getElementById("q");
      if (q) q.addEventListener("input", function () { vm.q = q.value; document.getElementById("results").innerHTML = results(); });
    },
    handlers: Object.assign({
      pick: function (el) { if (App.modalDef) App.closeModal(); select(el.dataset.v); },
      next: function () { vm.id = null; vm.done = null; vm.q = ""; App.rerender(); var q = document.getElementById("q"); if (q) q.focus(); },
      scan: function () {
        var t = App.ten(), list = App.members(), lab = [tx("pasa", "cleared"), tx("vencida", "lapsed"), tx("relevo viejo", "old waiver")];
        App.modal({ render: function () {
          return '<div class="modal-head"><h2>' + tx("Escanear tarjeta", "Scan card") + '</h2><button type="button" class="icon-btn" data-act="closeModal" aria-label="' + tx("Cerrar", "Close") + '">' + ic("x") + '</button></div><div class="modal-body"><div class="cam"><div class="vf"><span class="vf-corner tl"></span><span class="vf-corner tr"></span><span class="vf-corner bl"></span><span class="vf-corner br"></span><span class="vf-line"></span></div><div class="xs" style="color:rgba(255,255,255,.8)">' + tx("Cámara simulada", "Simulated camera") + '</div></div><div class="label">' + tx("Elige la tarjeta que «escanea» el miembro", "Pick the card the member “scans”") + "</div>" +
            t.deskDemo.map(function (id, i) { var m = App.member(id, list); return '<button type="button" class="pick" data-act="pick" data-v="' + id + '"><img src="' + App.qr(id) + '" alt="" width="40" height="40" style="border-radius:6px;border:1px solid var(--border)"><span class="grow"><strong>' + m.name + '</strong><span class="xs subtle" style="display:block">' + id + " · " + tx("demo: ", "demo: ") + lab[i] + "</span></span>" + App.badge(App.status(m, list)) + "</button>"; }).join("") + "</div>";
        } });
      },
      doCheckin: function () {
        var c = cur(); if (!App.evaluate(c.m, c.list).can) return;
        App.checkin(c.m.id, vm.guests); vm.guests = []; vm.done = { id: c.m.id }; App.rerender();
        App.toast(tx("Entrada registrada · ", "Checked in · ") + App.first(c.m.name));
      },
      override: function () { App.toast(tx("Requiere el PIN del dueño y queda en el registro (fuera de esta demo).", "Requires the owner's PIN and is logged (not part of this demo)."), "warn"); },
      clearGuests: function () { vm.guests = []; App.rerender(); },
      guest: function () {
        var c = cur(), t = App.ten(), pass = App.passes(c.m, c.list), G = { pass: pass[0] - vm.guests.filter(function (g) { return g.pass; }).length > 0, err: "" };
        if (vm.guests.length >= t.maxGuests) { App.toast(tx("Máximo " + t.maxGuests + " invitados por visita.", "Max " + t.maxGuests + " guests per visit."), "warn"); return; }
        App.modal({ render: function () {
          var left = pass[0] - vm.guests.filter(function (g) { return g.pass; }).length;
          return '<div class="modal-head"><h2>' + tx("Agregar invitado", "Add guest") + '</h2><button type="button" class="icon-btn" data-act="closeModal" aria-label="' + tx("Cerrar", "Close") + '">' + ic("x") + '</button></div><div class="modal-body">' +
            '<div class="field"><label class="label" for="gname">' + tx("Nombre del invitado", "Guest name") + '</label><input class="input' + (G.err ? " is-invalid" : "") + '" id="gname" value="' + App.esc(G.name || "") + '" placeholder="' + tx("Nombre y apellido", "First and last name") + '">' + (G.err ? '<div class="help is-error">' + ic("alert", "i-xs") + G.err + "</div>" : "") + "</div>" +
            '<div class="radio-group stack-2"><button type="button" class="radio-card pick' + (G.pass ? " is-on" : "") + '" data-act="gPass" data-v="1"' + (left > 0 ? "" : " disabled") + ">" + ic("ticket") + '<span class="grow"><strong>' + tx("Usar pase de invitado", "Use a guest pass") + '</strong><span class="xs subtle" style="display:block">' + tx("Quedan " + left + " de " + pass[1], left + " of " + pass[1] + " left") + "</span></span></button>" +
            '<button type="button" class="radio-card pick' + (!G.pass ? " is-on" : "") + '" data-act="gPass" data-v="0">' + ic("dollar") + '<span class="grow"><strong>' + tx("Cobrar tarifa de invitado", "Charge guest fee") + '</strong><span class="xs subtle" style="display:block">' + App.money(t.guestFee) + "</span></span></button></div>" +
            '<div class="callout">' + ic("waiver") + "<span>" + tx("El invitado firma su propio relevo en la tableta y debe tener 21+ (se verifica su ID).", "The guest signs their own waiver on the tablet and must be 21+ (ID checked).") + '</span></div></div><div class="modal-foot"><button type="button" class="btn btn-secondary" data-act="closeModal">' + tx("Cancelar", "Cancel") + '</button><button type="button" class="btn btn-primary" data-act="gAdd">' + tx("Agregar", "Add") + "</button></div>";
        } });
        App.handlers.gPass = function (el) { G.name = (document.getElementById("gname") || {}).value; G.pass = el.dataset.v === "1"; App.renderModal(); };
        App.handlers.gAdd = function () { G.name = (document.getElementById("gname").value || "").trim(); if (G.name.split(/\s+/).length < 2) { G.err = tx("Escribe nombre y apellido.", "Enter first and last name."); App.renderModal(); return; } vm.guests.push({ name: G.name, pass: G.pass }); App.closeModal(); App.rerender(); };
      },
      fixRenew: renewModal,
      andCheckin: function (el) { R.andCheckin = el.checked; },
      charge: function () {
        var c = cur();
        if (R.method === "ath") { R.stage = "ath"; R.expired = false; App.renderModal(); App.athStart({ onExpire: function () { R.expired = true; App.renderModal(); } }); App.athTick(); return; }
        var keep = App.modalDef;
        App.simulatePay(R, R.amount, App.primary(c.m, c.list), finishRenew);
        App.handlers.ppCancel = function () { App.modal(keep); };
      },
      athApprove: function () { App.modalDef.render = App.spinner(tx("ATH Móvil aprobado · confirmando…", "ATH Móvil approved · confirming…")); App.renderModal(); App.athStop(); setTimeout(finishRenew, 800); },
      athOpen: function () { App.toast(tx("La solicitud llegó al teléfono del miembro.", "The request arrived on the member's phone.")); },
      athCancel: function () { App.athStop(); R.stage = "pay"; App.renderModal(); },
      athRetry: function () { R.expired = false; App.renderModal(); App.athStart({ onExpire: function () { R.expired = true; App.renderModal(); } }); App.athTick(); },
      sendLink: function () {
        var c = cur(), p = App.primary(c.m, c.list);
        App.queueMsg({ kind: "link", mid: p.id, ch: p.sms === false ? ["email"] : ["sms", "email"] });
        App.closeModal();
        App.toast(tx("Enlace enviado a ", "Link sent to ") + App.mask(p.phone) + tx(" · ver en Mensajes (demo)", " · see Messages (demo)"));
      },
      fixWaiver: function () {
        var c = cur(), m = c.m, t = App.ten(), W = { lang: m.pref || "es", stage: "wait" };
        App.modal({ render: function () {
          if (W.stage === "signed") return App.spinner(tx("Guardando la firma…", "Saving signature…"))();
          return '<div class="modal-head"><h2>' + tx("Relevo enviado a la tableta", "Waiver sent to the tablet") + '</h2><button type="button" class="icon-btn" data-act="closeModal" aria-label="' + tx("Cerrar", "Close") + '">' + ic("x") + '</button></div><div class="modal-body"><div class="callout info">' + ic("tablet") + "<span>" + tx("La tableta de recepción muestra el relevo v" + t.waiver.v + " para ", "The front-desk tablet shows waiver v" + t.waiver.v + " for ") + "<strong>" + m.name + "</strong>" + tx(" en ", " in ") + (W.lang === "en" ? tx("inglés", "English") : tx("español", "Spanish")) + ".</span></div>" +
            '<div class="row"><span class="small muted">' + tx("Idioma del relevo", "Waiver language") + '</span><span class="grow"></span><div class="seg"><button type="button" data-act="wLang" data-v="es" aria-pressed="' + (W.lang === "es") + '">Español</button><button type="button" data-act="wLang" data-v="en" aria-pressed="' + (W.lang === "en") + '">English</button></div></div>' +
            '<div class="doc" style="height:150px">' + App.waiverText(W.lang).map(function (s) { return "<h4>" + s[0] + "</h4><p>" + s[1] + "</p>"; }).join("") + '</div><div class="row small muted" style="justify-content:center"><span class="spin" style="width:18px;height:18px;border-width:3px"></span>' + tx("Esperando la firma del miembro…", "Waiting for the member's signature…") + "</div>" +
            '<button type="button" class="demo-btn" data-act="wSign">' + ic("zap", "i-sm") + "<span><strong>" + tx("Demo: simular la firma en la tableta", "Demo: simulate signing on the tablet") + "</strong><small>" + tx("En la vida real el miembro escribe su nombre y firma con el dedo", "In real life the member types their name and signs with a finger") + "</small></span></button></div>";
        } });
        App.handlers.wLang = function (el) { W.lang = el.dataset.v; App.renderModal(); };
        App.handlers.wSign = function () { W.stage = "signed"; App.renderModal(); setTimeout(function () { App.signWaiver(m.id, { lang: W.lang, where: "tablet" }); App.modalDef = null; App.renderModal(); App.rerender(); App.toast(tx("Relevo v" + t.waiver.v + " firmado · PDF guardado", "Waiver v" + t.waiver.v + " signed · PDF saved")); }, 700); };
      },
      fixOrient: function () {
        var c = cur(), m = c.m, t = App.ten(), O = { ok: false };
        App.modal({ render: function () {
          return '<div class="modal-head"><h2>' + tx("Registrar orientación de seguridad", "Record safety orientation") + '</h2><button type="button" class="icon-btn" data-act="closeModal" aria-label="' + tx("Cerrar", "Close") + '">' + ic("x") + '</button></div><div class="modal-body"><div class="kv"><span class="k">' + tx("Miembro", "Member") + '</span><span class="v">' + m.name + '</span></div><div class="kv"><span class="k">' + tx("Fecha", "Date") + '</span><span class="v">' + App.fd(App.TODAY) + '</span></div><div class="kv"><span class="k">' + tx("Vigente hasta", "Valid until") + '</span><span class="v">' + App.fd(App.addMonths(App.TODAY, 12)) + '</span></div><div class="kv"><span class="k">' + tx("Registrada por", "Recorded by") + '</span><span class="v">' + t.staff.name + "</span></div>" +
            '<label class="check"><input type="checkbox" data-act="oOk"' + (O.ok ? " checked" : "") + '><span class="check-box">' + ic("check", "i-xs") + "</span><span>" + tx("Completó la orientación y el repaso de las reglas del club", "Completed the orientation and the range rules review") + '</span></label></div><div class="modal-foot"><button type="button" class="btn btn-secondary" data-act="closeModal">' + tx("Cancelar", "Cancel") + '</button><button type="button" class="btn btn-primary" data-act="oSave"' + (O.ok ? "" : " disabled") + ">" + tx("Guardar", "Save") + "</button></div>";
        } });
        App.handlers.oOk = function (el) { O.ok = el.checked; App.renderModal(); };
        App.handlers.oSave = function () { if (!O.ok) return; App.recordOrientation(m.id); App.closeModal(); App.rerender(); App.toast(tx("Orientación registrada", "Orientation recorded")); };
      },
      fixCall: function () {
        var t = App.ten();
        App.modal({ render: function () {
          return '<div class="modal-head"><h2>' + tx("Llamar al dueño", "Call the owner") + '</h2><button type="button" class="icon-btn" data-act="closeModal" aria-label="' + tx("Cerrar", "Close") + '">' + ic("x") + '</button></div><div class="modal-body"><div class="row-3"><div class="avatar av-1">' + t.owner.ini + '</div><div><strong>' + t.owner.name + '</strong><div class="small subtle">' + tx("Dueña/o · ", "Owner · ") + t.name + '</div></div></div><a class="btn btn-primary btn-lg btn-block" href="tel:' + t.owner.phone.replace(/\D/g, "") + '">' + ic("phone-call", "i-sm") + t.owner.phone + '</a><p class="small muted">' + tx("Solo el dueño puede levantar una suspensión. No se registra la entrada.", "Only the owner can lift a suspension. No check-in is recorded.") + "</p></div>";
        } });
      }
    }, App.payHandlers(R, function () { App.renderModal(); }))
  });
  // payHandlers captured the initial R object; keep them pointed at the live one
  App.handlers.payMethod = function (el) { R.method = el.dataset.v; if (R.method === "ath") R.autorenew = false; App.renderModal(); };
  App.handlers.autorenew = function () { if (R.method === "ath") { App.toast(tx("La auto-renovación requiere PayPal o tarjeta.", "Auto-renew requires PayPal or card."), "warn"); return; } R.autorenew = !R.autorenew; App.renderModal(); };
})();
