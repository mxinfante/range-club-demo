/* Kiosk mode (self check-in tablet): scan card or phone + code → live check-in rule.
   Cleared → welcome + auto-return; old/missing waiver → sign right here; anything else → "see the front desk". */
(function () {
  var tx = App.tx, ic = App.ic, vm = App.vm;
  vm.view = "welcome"; vm.id = null; vm.wl = App.L(); vm.sig = null; vm.sigName = ""; vm.err = {}; vm.mode = "checkin";
  var timer = null, left = 0;

  function langSegBig() { return '<div class="seg on-dark big" role="group" aria-label="' + tx("Idioma", "Language") + '"><button type="button" data-act="lang" data-v="es" aria-pressed="' + (App.L() === "es") + '">ES</button><button type="button" data-act="lang" data-v="en" aria-pressed="' + (App.L() === "en") + '">EN</button></div>'; }
  function frame(inner) {
    return '<div class="kiosk"><div class="k-top"><span class="k-lock">' + ic("lock", "i-sm") + "<span>" + tx("Modo quiosco · entrada, salida y relevos", "Kiosk mode · check-in, check-out and waivers only") + "</span></span>" + langSegBig() + "</div>" + inner +
      '<div class="k-foot"><button type="button" class="k-exit" data-act="exit">' + ic("hand", "i-sm") + "<span>" + tx("Personal: salir del quiosco", "Staff: exit kiosk") + "</span></button>" + '<span class="powered" style="color:rgba(255,255,255,.8)"><svg><use href="#rc-mark"/></svg>' + tx("Con la tecnología de Range Club", "Powered by Range Club") + "</span>" + App.endorse(16, "endorse--chip") + "</div></div>";
  }
  function vWelcome() {
    var t = App.ten();
    return frame('<div class="k-main"><svg class="k-logo">' + App.mark(true) + '</svg><div><div class="k-h1">' + tx("Bienvenido a ", "Welcome to ") + t.name + '</div><div class="k-sub" style="margin:10px auto 0">' + tx("Escanea el código QR de tu tarjeta digital para registrar tu entrada", "Scan the QR code on your digital card to check in") + "</div></div>" +
      '<button type="button" class="viewfinder" data-act="scan" aria-label="' + tx("Escanear tarjeta", "Scan card") + '"><span class="vf-corner tl"></span><span class="vf-corner tr"></span><span class="vf-corner bl"></span><span class="vf-corner br"></span><span class="vf-line"></span><div class="vf-hint"><span>' + tx("Acerca tu teléfono aquí", "Hold your phone here") + '</span><span class="k-demo">' + ic("zap", "i-xs") + tx("Demo: toca para escanear", "Demo: tap to scan") + "</span></div></button>" +
      '<div class="k-actions"><button type="button" class="k-btn" data-act="phone"><span class="ki">' + ic("phone", "i-lg") + "</span><span>" + tx("Usar mi teléfono", "Use my phone number") + "<small>" + tx("Te enviamos un código por texto", "We'll text you a code") + '</small></span></button><button type="button" class="k-btn" data-act="outStart"><span class="ki">' + ic("log-out", "i-lg") + "</span><span>" + tx("Registrar salida", "Check out") + "<small>" + tx("Al irte: tarjeta o teléfono", "When leaving: card or phone") + '</small></span></button><button type="button" class="k-btn" data-act="waiverStart"><span class="ki">' + ic("waiver", "i-lg") + "</span><span>" + tx("Firmar el relevo", "Sign the waiver") + "<small>" + tx("Miembros e invitados", "Members and guests") + "</small></span></button></div></div>");
  }
  function card(inner) { return '<div class="k-main"><svg class="k-logo" style="width:72px;height:72px">' + App.mark(true) + '</svg><div class="k-ok">' + inner + "</div></div>"; }
  function vOk() {
    var list = App.members(), m = App.member(vm.id, list), p = App.primary(m, list), st = App.status(m, list), pass = App.passes(m, list), e = App.checkedInToday(m.id);
    var already = vm.already;
    return frame(card('<div class="big-check">' + ic("check") + '</div><div style="text-align:center"><div class="k-title">' + (already ? tx("Ya estás adentro, ", "You're already in, ") : (m.gender === "f" ? tx("¡Bienvenida, ", "Welcome, ") : tx("¡Bienvenido, ", "Welcome, "))) + App.first(m.name) + (already ? "" : "!") + '</div><div style="font-size:18px;color:var(--n-600);margin-top:6px">' + (already ? tx("Tu entrada de hoy se registró a las ", "Today's check-in was recorded at ") : tx("Entrada registrada · ", "Check-in recorded · ")) + App.time(e.at) + "</div></div>" +
      '<div class="k-meta"><div><div class="eyebrow">' + tx("Membresía", "Membership") + '</div><div class="v" style="color:' + (st === "grace" ? "var(--warn-700)" : "var(--ok-700)") + '"><span class="row" style="justify-content:center;gap:6px">' + ic(App.STATUS[st][2], "i-sm") + App.txa(App.STATUS[st]) + '</span></div></div><div><div class="eyebrow">' + (st === "grace" ? tx("Gracia hasta", "Grace until") : tx("Vigente hasta", "Valid through")) + '</div><div class="v">' + App.fd(st === "grace" ? App.graceEnd(m, list) : p.expires) + '</div></div><div><div class="eyebrow">' + tx("Pases de invitado", "Guest passes") + '</div><div class="v">' + pass[0] + " / " + pass[1] + "</div></div></div>" +
      (st === "grace" ? '<div class="callout warn" style="width:100%;font-size:15px;line-height:21px">' + ic("clock") + "<span>" + tx("Tu membresía venció el " + App.fd(p.expires, "es") + ". Renueva antes del " + App.fd(App.graceEnd(m, list), "es") + " con el enlace que te enviamos o en recepción.", "Your membership expired " + App.fd(p.expires, "en") + ". Renew by " + App.fd(App.graceEnd(m, list), "en") + " with the link we sent you or at the front desk.") + "</span></div>" : "") +
      licNote(m) + (e.v ? calPick(e.v) : "") +
      '<div class="callout tenant" style="width:100%;font-size:15px;line-height:21px">' + ic("info") + "<span>" + tx("Pasa por el oficial de seguridad (RSO) antes de ir a tu carril. ¿Vienes con alguien que no dispara? Recepción lo registra como «Invitado (no dispara)».", "Please check in with the range safety officer before heading to your lane. Bringing someone who won't shoot? The front desk logs them as a “Guest (no shooting)”.") + '</span></div><div class="row wrap" style="gap:12px;justify-content:center"><span class="muted" id="k-count">' + tx("Volviendo al inicio en ", "Returning to start in ") + left + ' s</span>' + (already ? '<button type="button" class="btn btn-primary" data-act="kOut">' + ic("log-out", "i-sm") + tx("Registrar mi salida", "Check me out") + "</button>" : "") + '<button type="button" class="btn btn-secondary" data-act="home">' + tx("Listo", "Done") + "</button></div>"));
  }
  /* caliber used (Reg. 9172 visit log): prefilled with the member's usual caliber, one tap to change */
  function calPick(v) {
    var opts = App.CALS.slice(0, 5); if (opts.indexOf(v.cal) < 0) opts[4] = v.cal;
    return '<div class="k-cal" data-k-cal><span class="eyebrow">' + tx("Calibre que usarás hoy", "Caliber you'll use today") + '</span><div class="row wrap" style="gap:8px;justify-content:center">' + opts.map(function (c) { return '<button type="button" class="chip-btn' + (c === v.cal ? " is-on" : "") + '" data-act="kCal" data-v="' + App.esc(c) + '" aria-pressed="' + (c === v.cal) + '">' + App.esc(c) + "</button>"; }).join("") + "</div></div>";
  }
  function licNote(m) {
    var L = App.lic(m);
    if (L.band === "today") return '<div class="callout warn" style="width:100%;font-size:15px;line-height:21px" data-k-lic="today">' + ic("alert") + "<span>" + App.licBadge(m) + " " + tx("Tu licencia de armas vence hoy. Desde mañana no podrás tirar hasta renovarla.", "Your gun license expires today. From tomorrow you can't shoot until it's renewed.") + "</span></div>";
    if (L.band === "soon30") return '<div class="callout" style="width:100%;font-size:15px;line-height:21px" data-k-lic="soon">' + ic("id") + "<span>" + App.licBadge(m) + " " + tx("Recuerda renovar tu licencia de armas.", "Remember to renew your gun license.") + "</span></div>";
    return "";
  }
  function vOut() {
    var v = vm.outV, list = App.members(), m = App.member(vm.id, list);
    return frame(card('<div class="big-check" style="background:var(--tenant-600);box-shadow:0 0 0 14px var(--tenant-50)">' + ic("log-out") + '</div><div style="text-align:center"><div class="k-title">' + tx("¡Hasta pronto, ", "See you soon, ") + App.first(m.name) + '!</div><div style="font-size:18px;color:var(--n-600);margin-top:6px">' + tx("Salida registrada · ", "Checked out · ") + App.time(v.out) + "</div></div>" +
      '<div class="k-meta"><div><div class="eyebrow">' + tx("Entrada", "In") + '</div><div class="v">' + App.time(v.in) + '</div></div><div><div class="eyebrow">' + tx("Salida", "Out") + '</div><div class="v">' + App.time(v.out) + '</div></div><div><div class="eyebrow">' + tx("Duración", "Duration") + '</div><div class="v" data-k-dur>' + App.dur(v.out - v.in) + "</div></div></div>" + licNote(m) +
      '<div class="row" style="gap:12px"><span class="muted" id="k-count">' + tx("Volviendo al inicio en ", "Returning to start in ") + left + ' s</span><button type="button" class="btn btn-secondary" data-act="home">' + tx("Listo", "Done") + "</button></div>"));
  }
  function vNoOpen() {
    var m = App.member(vm.id);
    return frame(card('<div class="big-check" style="background:var(--warn-600);box-shadow:0 0 0 14px var(--warn-50)">' + ic("desk") + '</div><div style="text-align:center"><div class="k-title">' + tx("Hola, ", "Hi, ") + App.first(m.name) + '</div><div style="font-size:20px;color:var(--n-700);margin-top:8px;font-weight:600">' + tx("No tienes una entrada abierta hoy", "You don't have an open check-in today") + '</div></div><p class="k-reason">' + tx("Si entraste sin registrarte, pasa por recepción.", "If you came in without checking in, please see the front desk.") + '</p><div class="row" style="gap:12px"><span class="muted" id="k-count">' + tx("Volviendo al inicio en ", "Returning to start in ") + left + ' s</span><button type="button" class="btn btn-secondary" data-act="home">' + tx("Listo", "Done") + "</button></div>"));
  }
  function vDesk() {
    var list = App.members(), m = App.member(vm.id, list), E = App.evaluate(m, list);
    var reason = E.st === "lapsed" ? tx("Tu membresía está vencida. Puedes renovarla en recepción en un minuto o con el enlace que te enviamos por texto.", "Your membership has lapsed. You can renew it at the front desk in a minute or with the link we texted you.")
      : E.st === "pending" ? tx("Tu inscripción está pendiente de pago.", "Your sign-up is pending payment.")
      : E.lic.blocked ? (E.lic.band === "expired" ? tx("Tu licencia de armas venció el " + App.fd(E.lic.exp, "es") + ". Sin licencia vigente no puedes tirar. Si ya la renovaste, muestra el carnet nuevo en recepción.", "Your gun license expired " + App.fd(E.lic.exp, "en") + ". Without a valid license you can't shoot. If you've renewed it, show the new card at the front desk.") : tx("Tu licencia de armas no está vigente (" + (E.lic.band === "suspended" ? "suspendida" : "revocada") + "). No puedes tirar hoy.", "Your gun license isn't valid (" + E.lic.band + "). You can't shoot today."))
      : E.B.some(function (b) { return b.act === "fixOrient"; }) ? tx("Necesitas completar la orientación de seguridad con el personal.", "You need to complete the safety orientation with staff.")
      : tx("El personal te ayudará a completar tu entrada.", "Staff will help you finish checking in.");
    var red = E.lic.blocked;
    return frame(card('<div class="big-check" style="background:var(--' + (red ? "bad" : "warn") + '-600);box-shadow:0 0 0 14px var(--' + (red ? "bad" : "warn") + '-50, #FDECEA)"' + (red ? " data-k-refused" : "") + ">" + ic(red ? "x-circle" : "desk") + '</div><div style="text-align:center"><div class="k-title">' + tx("Hola, ", "Hi, ") + App.first(m.name) + '</div><div style="font-size:20px;color:var(--' + (red ? "bad" : "n") + '-700);margin-top:8px;font-weight:600">' + (red ? tx("No podemos registrar tu entrada", "We can't check you in") : tx("Por favor, pasa por recepción", "Please see the front desk")) + '</div></div><p class="k-reason">' + reason + '</p><div class="row" style="gap:12px"><span class="muted" id="k-count">' + tx("Volviendo al inicio en ", "Returning to start in ") + left + ' s</span><button type="button" class="btn btn-secondary" data-act="home">' + tx("Listo", "Done") + "</button></div>"));
  }
  function vWaiver() {
    var list = App.members(), m = App.member(vm.id, list), t = App.ten(), nameOk = vm.sigName && App.norm(vm.sigName) === App.norm(m.name);
    return frame('<div class="k-main k-main-form"><div class="k-sign"><div class="row between wrap" style="gap:10px"><div><div class="eyebrow">' + tx("Relevo v", "Waiver v") + t.waiver.v + " · " + App.fd(t.waiver.date) + '</div><h2 style="font-size:24px;line-height:30px">' + tx("Hola, ", "Hi, ") + App.first(m.name) + tx(": firma el relevo actualizado", ": sign the updated waiver") + '</h2></div><div class="langpick" style="width:240px">' + [["es", "Español"], ["en", "English"]].map(function (l) { return '<button type="button" class="lp' + (vm.wl === l[0] ? " is-on" : "") + '" data-act="wl" data-v="' + l[0] + '" aria-pressed="' + (vm.wl === l[0]) + '"><span class="flag">' + l[0].toUpperCase() + "</span>" + l[1] + "</button>"; }).join("") + "</div></div>" +
      (m.waiver ? '<div class="callout info">' + ic("info") + "<span>" + tx("Firmaste la v" + m.waiver.v + "; el club publicó la v" + t.waiver.v + " el " + App.fd(t.waiver.date, "es") + ".", "You signed v" + m.waiver.v + "; the range published v" + t.waiver.v + " on " + App.fd(t.waiver.date, "en") + ".") + "</span></div>" : "") +
      '<div class="doc" lang="' + vm.wl + '" tabindex="0" style="height:200px">' + App.waiverText(vm.wl).map(function (s) { return "<h3>" + s[0] + "</h3><p>" + s[1] + "</p>"; }).join("") + "</div>" +
      '<div class="k-two"><div class="field"><label class="label" for="k-name">' + tx("Escribe tu nombre legal completo", "Type your full legal name") + '</label><input class="input input-lg' + (vm.err.name ? " is-invalid" : nameOk ? " is-valid" : "") + '" id="k-name" value="' + App.esc(vm.sigName) + '" placeholder="' + App.esc(m.name) + '" autocomplete="off">' + (vm.err.name ? '<span class="help is-error" role="alert">' + ic("alert") + "<span>" + vm.err.name + "</span></span>" : "") + '</div><div class="field"><span class="label">' + tx("Firma aquí", "Sign here") + '</span><div class="sigpad' + (vm.err.sig ? " is-invalid" : "") + '"><canvas id="ksig" aria-label="' + tx("Área de firma", "Signature area") + '"></canvas>' + (vm.sig ? "" : App.sigTapBtn()) + '<button type="button" class="clear" data-act="sigClear">' + ic("x", "i-xs") + tx("Borrar", "Clear") + '</button><span class="base"></span><span class="x">×</span><span class="lbl">' + tx("Firma", "Signature") + "</span></div>" + (vm.err.sig ? '<span class="help is-error" role="alert">' + ic("alert") + "<span>" + vm.err.sig + "</span></span>" : "") + "</div></div>" +
      '<div class="row" style="gap:12px;justify-content:flex-end;flex-wrap:wrap"><button type="button" class="btn btn-secondary btn-lg" data-act="home">' + tx("Cancelar", "Cancel") + '</button><button type="button" class="btn btn-tenant btn-xl" data-act="kSign">' + ic("pen", "i-sm") + tx("Firmar y registrar entrada", "Sign and check in") + "</button></div></div></div>");
  }
  function render() { return ({ welcome: vWelcome, ok: vOk, desk: vDesk, waiver: vWaiver, out: vOut, noopen: vNoOpen })[vm.view](); }

  function stopTimer() { if (timer) clearInterval(timer); timer = null; }
  function autoReturn(sec) {
    stopTimer(); left = sec;
    timer = setInterval(function () { left--; var el = document.getElementById("k-count"); if (el) el.textContent = tx("Volviendo al inicio en ", "Returning to start in ") + left + " s"; if (left <= 0) { stopTimer(); home(); } }, 1000);
  }
  function home() { stopTimer(); vm.view = "welcome"; vm.mode = "checkin"; vm.id = null; vm.sig = null; vm.sigName = ""; vm.err = {}; App.rerender(); }
  function identify(id) {
    App.closeModal();
    var list = App.members(), m = App.member(id, list); if (!m) return;
    vm.id = id; vm.already = false; vm.sig = null; vm.sigName = m.name; vm.err = {}; vm.wl = m.pref || App.L();
    if (vm.mode === "checkout") { var v = App.checkout(id, { where: "kiosk" }); vm.mode = "checkin"; if (v) { vm.outV = v; vm.view = "out"; left = 10; App.rerender(); autoReturn(10); } else { vm.view = "noopen"; left = 10; App.rerender(); autoReturn(10); } return; }
    if (App.checkedInToday(id) && vm.mode !== "waiver") { vm.already = true; vm.view = "ok"; left = 8; App.rerender(); autoReturn(8); return; }
    var E = App.evaluate(m, list), onlyWaiver = E.hard > 0 && E.B.filter(function (b) { return b.kind !== "warn"; }).every(function (b) { return b.act === "fixWaiver"; });
    if (E.can && vm.mode !== "waiver") { App.checkin(id, [], "kiosk"); vm.view = "ok"; left = 10; App.rerender(); autoReturn(10); return; }
    if (onlyWaiver || (vm.mode === "waiver" && !(m.waiver && m.waiver.v === App.ten().waiver.v))) { vm.view = "waiver"; App.rerender(); return; }
    if (vm.mode === "waiver" && E.can) { App.checkin(id, [], "kiosk"); vm.view = "ok"; left = 10; App.rerender(); autoReturn(10); return; }
    vm.view = "desk"; left = 12; App.rerender(); autoReturn(12);
  }
  /* on-site members for the check-out picker: the scripted desk member first (Raúl / Luis), then the rest */
  function outIds() { var t = App.ten(), ids = App.onSite().filter(function (v) { return !v.host; }).map(function (v) { return v.mid; }); ids.sort(function (a, b) { return (b === t.deskDemo[1]) - (a === t.deskDemo[1]); }); return ids.slice(0, 5); }
  function scanPicker(title) {
    var t = App.ten(), list = App.members();
    var lab = [tx("pasa", "cleared"), tx("en gracia", "in grace"), tx("relevo viejo", "old waiver"), tx("vencida", "lapsed"), tx("licencia de armas vencida: rechazo", "expired gun license: refused")];
    App.modal({ render: function () {
      return '<div class="modal-head"><h2>' + title + '</h2><button type="button" class="icon-btn" data-act="closeModal" aria-label="' + tx("Cerrar", "Close") + '">' + ic("x") + '</button></div><div class="modal-body stack-2"><div class="xs subtle">' + tx("Demo: elige qué tarjeta se acerca al lector.", "Demo: choose which card is held up to the reader.") + "</div>" +
        (vm.mode === "checkout" ? outIds().map(function (id) { var m = App.member(id, list), v = App.openVisit(id); return '<button type="button" class="pick" data-act="ident" data-v="' + id + '"><img src="' + App.qr(id) + '" alt="" width="40" height="40" style="border-radius:6px;border:1px solid var(--border)"><span class="grow"><strong>' + m.name + '</strong><span class="xs subtle" style="display:block">' + id + " · " + tx("adentro desde ", "on site since ") + App.time(v.in) + "</span></span></button>"; }).join("") || '<div class="small subtle">' + tx("Nadie en las instalaciones ahora.", "No one on site right now.") + "</div>"
        : t.kioskDemo.concat([t.deskDemo[3]]).map(function (id, i) { var m = App.member(id, list); return '<button type="button" class="pick" data-act="ident" data-v="' + id + '"><img src="' + App.qr(id) + '" alt="" width="40" height="40" style="border-radius:6px;border:1px solid var(--border)"><span class="grow"><strong>' + m.name + '</strong><span class="xs subtle" style="display:block">' + id + " · demo: " + lab[i] + "</span></span>" + App.badge(App.status(m, list)) + "</button>"; }).join("")) + "</div>";
    } });
  }

  App.page({
    render: render,
    title: function () { return tx("Quiosco", "Kiosk"); },
    after: function () {
      var c = document.getElementById("ksig"); if (c) App.initSig(c, vm.sig, function (s) { vm.sig = s; });
      var n = document.getElementById("k-name"); if (n) n.addEventListener("input", function () { vm.sigName = n.value; });
    },
    handlers: {
      scan: function () { vm.mode = "checkin"; scanPicker(tx("Escanear tarjeta", "Scan card")); },
      outStart: function () {
        vm.mode = "checkout";
        App.modal({ render: function () { return '<div class="modal-head"><h2>' + tx("Registrar salida", "Check out") + '</h2><button type="button" class="icon-btn" data-act="closeModal" aria-label="' + tx("Cerrar", "Close") + '">' + ic("x") + '</button></div><div class="modal-body stack-2"><button type="button" class="pick" data-act="outScan">' + ic("scan") + '<span class="grow"><strong>' + tx("Escanear mi tarjeta", "Scan my card") + '</strong></span>' + ic("chev-right", "i-sm") + '</button><button type="button" class="pick" data-act="outPhone">' + ic("phone") + '<span class="grow"><strong>' + tx("Usar mi teléfono + código", "Use my phone + code") + '</strong></span>' + ic("chev-right", "i-sm") + "</button></div>"; } });
      },
      outScan: function () { vm.mode = "checkout"; scanPicker(tx("Registrar salida · escanea tu tarjeta", "Check out · scan your card")); },
      outPhone: function () { App.handlers.phone("checkout"); },
      kCal: function (el) { App.setCal(vm.id, el.dataset.v); App.rerender(); App.toast(tx("Calibre: ", "Caliber: ") + el.dataset.v); },
      kOut: function () { stopTimer(); vm.mode = "checkout"; identify(vm.id); },
      waiverStart: function () { vm.mode = "waiver"; scanPicker(tx("¿Quién firma? Escanea tu tarjeta", "Who's signing? Scan your card")); },
      ident: function (el) { identify(el.dataset.v); },
      home: home,
      exit: function () { stopTimer(); location.href = "dashboard.html"; },
      phone: function (mode) {
        mode = mode === "checkout" ? "checkout" : "checkin";
        var pid = mode === "checkout" ? (outIds()[0] || App.ten().kioskDemo[0]) : App.ten().kioskDemo[0];
        var P = { phone: App.member(pid).phone, who: App.first(App.member(pid).name), stage: "phone", err: "" };
        vm.mode = mode;
        App.modal({ render: function () {
          var head = '<div class="modal-head"><h2>' + (mode === "checkout" ? tx("Registrar salida · teléfono", "Check out · phone") : tx("Usar mi teléfono", "Use my phone number")) + '</h2><button type="button" class="icon-btn" data-act="closeModal" aria-label="' + tx("Cerrar", "Close") + '">' + ic("x") + "</button></div>";
          if (P.stage === "code") return head + '<div class="modal-body"><p>' + tx("Te enviamos un código de 4 dígitos al ", "We texted a 4-digit code to ") + "<strong>" + App.mask(P.m.phone) + '</strong>.</p><div class="field"><label class="label" for="k-code">' + tx("Código", "Code") + '</label><input class="input input-lg" id="k-code" inputmode="numeric" maxlength="4" value="' + App.esc(P.code) + '" style="letter-spacing:.3em;font-size:22px"><span class="help">' + tx("Demo: el código ya está escrito.", "Demo: the code is pre-filled.") + '</span></div><button type="button" class="btn btn-primary btn-lg btn-block" data-act="pVerify">' + tx("Verificar", "Verify") + "</button></div>";
          return head + '<div class="modal-body"><div class="field"><label class="label" for="k-phone">' + tx("Tu número de móvil", "Your mobile number") + '</label><input class="input input-lg' + (P.err ? " is-invalid" : "") + '" id="k-phone" inputmode="tel" placeholder="(787) 555-0000" value="' + App.esc(P.phone) + '">' + (P.err ? '<span class="help is-error" role="alert">' + ic("alert") + "<span>" + P.err + "</span></span>" : '<span class="help">' + tx("Demo: el número ya está escrito (" + P.who + ").", "Demo: the number is pre-filled (" + P.who + ").") + "</span>") + '</div><button type="button" class="btn btn-primary btn-lg btn-block" data-act="pSend">' + tx("Enviarme un código", "Text me a code") + "</button></div>";
        } });
        App.handlers.pSend = function () {
          P.phone = document.getElementById("k-phone").value; var d = P.phone.replace(/\D/g, "");
          var m = App.members().filter(function (x) { return x.phone && x.phone.replace(/\D/g, "") === d; })[0];
          if (d.length !== 10) P.err = tx("Escribe los 10 dígitos.", "Enter all 10 digits."); else if (!m) P.err = tx("No encontramos ese número en este club. Pasa por recepción.", "We couldn't find that number at this range. Please see the front desk."); else { P.err = ""; P.m = m; P.stage = "code"; P.code = P.code || "4821"; }
          App.renderModal();
        };
        App.handlers.pVerify = function () { var el = document.getElementById("k-code"); P.code = el ? el.value.trim() : P.code; if (P.code !== "4821") { App.toast(tx("Código incorrecto. Demo: 4821.", "Wrong code. Demo: 4821."), "warn"); return; } identify(P.m.id); };
      },
      wl: function (el) { vm.wl = el.dataset.v; App.rerender(); },
      sigClear: function () { vm.sig = null; App.rerender(); },
      sigTap: function (el) { var c = document.getElementById("ksig"); if (!c) return; el.remove(); App.autoSign(c, App.member(vm.id).name, function (sg) { vm.sig = sg; }); },
      kSign: function () {
        var m = App.member(vm.id), e = {};
        if (App.norm(vm.sigName) !== App.norm(m.name)) e.name = vm.sigName ? tx("El nombre debe coincidir con: " + m.name, "Name must match: " + m.name) : tx("Escribe tu nombre legal completo.", "Type your full legal name.");
        if (!vm.sig || vm.sig.len < 40) e.sig = tx("Firma en el recuadro.", "Sign in the box.");
        vm.err = e; if (Object.keys(e).length) { App.rerender(); return; }
        App.signWaiver(vm.id, { lang: vm.wl, where: "kiosk" });
        vm.mode = "checkin"; identify(vm.id);
      }
    }
  });
})();
