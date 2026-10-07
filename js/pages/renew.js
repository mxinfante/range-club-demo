/* Member renewal from the one-click link (no login): pre-filled, plan choice, credit/debit card · ATH Móvil · pay at the front desk (cash/check, reserved until staff collect),
   ATH waiting screen with live 10-min countdown + presenter shortcut, confirmation. Single-use link. */
(function () {
  var tx = App.tx, ic = App.ic, vm = App.vm;
  var t = App.ten(), list0 = App.members();
  var mid = App.q("m") || App.ts().current || t.linkMember;
  var m0 = App.member(mid, list0);
  vm.view = "form"; vm.src = App.q("src") || "link"; vm.step = App.q("step"); vm.ch = App.q("ch");
  if (m0) { var p0 = App.primary(m0, list0); vm.pid = p0.id; vm.tier = p0.tier; vm.phone = p0.phone; vm.method = "card"; vm.autorenew = false; vm.startedRenewed = !!p0.renewedAt; }

  function ctx() { var list = App.members(), p = App.member(vm.pid, list); return { list: list, p: p, hh: App.household(p, list), st: App.status(p, list) }; }
  function newExpiry(p, st, tierKey) { var tr = App.ten().tiers[tierKey], from = (st === "active" || st === "grace") && p.expires ? p.expires : App.TODAY; return tr.term === "month" ? App.addMonths(from, 1) : App.addMonths(from, 12); }
  function stBadge(p, st) {
    var d = p.expires ? App.diff(p.expires, App.TODAY) : null;
    if (st === "active") return '<span class="badge badge--' + (d <= 7 ? "grace" : "active") + '">' + ic(d <= 7 ? "clock" : "check-circle") + (d === 0 ? tx("Vence hoy", "Expires today") : d === 1 ? tx("Vence mañana", "Expires tomorrow") : tx("Vence en " + d + " días", "Expires in " + d + " days")) + "</span>";
    if (st === "grace") return '<span class="badge badge--grace">' + ic("clock") + tx("En gracia · hasta el ", "Grace · until ") + App.fds(App.graceEnd(p)) + "</span>";
    return App.badge(st);
  }
  function shell(content, guide, sub) { return App.mobileShell({ step: "renew", sub: sub || tx("Renovación de membresía", "Membership renewal"), content: '<div class="m-page">' + content + '<div class="m-foot">' + App.powered() + "</div></div>", guide: guide }); }

  function invalid() {
    return shell('<div class="m-content" style="padding-top:28px"><div class="ok-badge" style="background:var(--n-500);box-shadow:0 0 0 10px var(--n-100)">' + ic("lock") + '</div><h1 style="text-align:center;font-size:22px;margin-top:14px">' + tx("Este enlace no es de este club", "This link isn't for this range") + '</h1><p class="muted" style="text-align:center">' + tx("Los enlaces de renovación son de un solo club. Pide uno nuevo a ", "Renewal links belong to a single range. Ask for a new one from ") + App.ten().name + ".</p></div>",
      tx("Aislamiento por club: un enlace de otro club no abre nada aquí.", "Tenant isolation: another range's link opens nothing here."));
  }
  function used(c) {
    return shell('<div class="m-content" style="padding-top:28px"><div class="ok-badge">' + ic("check") + '</div><h1 style="text-align:center;font-size:22px;line-height:28px;margin-top:14px">' + tx("Este enlace ya se usó", "This link was already used") + '</h1><p class="muted" style="text-align:center">' + tx("Tu membresía está ", "Your membership is ") + "<strong>" + App.txa(App.STATUS[c.st]) + "</strong>" + (c.p.expires ? tx(" hasta el ", " until ") + "<strong>" + App.fd(c.p.expires) + "</strong>" : "") + ". " + tx("Por seguridad, cada enlace sirve una sola vez.", "For security, each link works only once.") + '</p><a class="btn btn-primary btn-lg btn-block" href="card.html?m=' + c.p.id + '">' + ic("id", "i-sm") + tx("Ver mi tarjeta digital", "Open my digital card") + '</a><a class="btn btn-secondary btn-lg btn-block" href="portal.html?m=' + c.p.id + '">' + ic("home", "i-sm") + tx("Ir a mi portal", "Go to my portal") + "</a></div>",
      tx("Los enlaces son de un solo uso y válidos por 14 días. Para repetir el paso, usa «Reiniciar demo».", "Links are single-use and valid for 14 days. To repeat this step, use “Reset demo”."));
  }

  function form(c) {
    var t = App.ten(), p = c.p, tr = t.tiers[vm.tier], exp = newExpiry(p, c.st, vm.tier), first = App.first(p.name);
    var opts = ["ind", "fam", "famplus"]; if (opts.indexOf(p.tier) < 0) opts.unshift(p.tier);
    opts.sort(function (a, b) { return a === p.tier ? -1 : b === p.tier ? 1 : 0; });
    var plans = opts.map(function (k) {
      var x = t.tiers[k], dis = x.hh < c.hh.length, on = vm.tier === k;
      var note = k === p.tier ? tx("Tu plan actual", "Your current plan") : (x.price > t.tiers[p.tier].price ? '<span class="pill-tag" style="margin-right:6px">' + tx("Mejora", "Upgrade") + "</span>" : "");
      var cov = x.hh > 1 ? tx("hasta " + x.hh + " personas", "up to " + x.hh + " people") : tx("solo tú", "only you");
      return '<button type="button" class="radio-card' + (on ? " is-selected" : "") + '" data-act="tier" data-v="' + k + '"' + (dis ? " disabled" : "") + ' aria-pressed="' + on + '"><span class="radio"></span><div class="grow"><div class="row between"><strong>' + tx(x.es, x.en) + '</strong><span class="tier-price">' + App.money(x.price, false) + "<small>" + (x.term === "month" ? tx("/mes", "/mo") : tx("/año", "/yr")) + '</small></span></div><div class="small muted">' + note + (k === p.tier ? " · " : "") + cov + " · " + x.passes + tx(" pases de invitado", " guest passes") + (dis ? " · " + tx("tu hogar tiene " + c.hh.length, "your household has " + c.hh.length) : "") + "</div></div></button>";
    }).join("");
    var hh = c.hh.map(function (x) { return '<div class="hh-item"><div class="avatar avatar-sm ' + (x.av || "av-1") + '">' + App.ini(x.name) + '</div><div class="grow"><div class="nm">' + x.name + '</div><div class="rl">' + (x.id === p.id ? tx("Titular · paga", "Primary · payer") : x.gender === "f" ? tx("Adulta", "Adult") : tx("Adulto", "Adult")) + "</div></div></div>"; }).join("");
    var body = '<section class="m-hero"><h1>' + tx("Hola, ", "Hi, ") + first + "</h1><p>" + tx("Renueva en menos de un minuto. No necesitas contraseña: este enlace seguro es solo para ti.", "Renew in under a minute. No password needed: this secure link is just for you.") + "</p></section>" +
      '<div class="m-content" style="padding-top:0"><div class="m-card m-overlap"><div class="m-card-pad" style="padding-bottom:10px"><div class="row between" style="margin-bottom:6px"><span class="eyebrow">' + tx("Tu membresía", "Your membership") + "</span>" + stBadge(p, c.st) + "</div>" +
      '<div class="kv"><span class="k">' + tx("Miembro", "Member") + '</span><span class="v">' + p.name + '<br><span class="xs subtle">' + p.id + "</span></span></div>" +
      '<div class="kv"><span class="k">' + tx("Plan actual", "Current plan") + '</span><span class="v">' + App.tierName(p.tier) + "</span></div>" +
      '<div class="kv"><span class="k">' + (c.st === "lapsed" ? tx("Venció", "Expired") : tx("Vence", "Expires")) + '</span><span class="v">' + App.fd(p.expires) + "</span></div>" +
      '<div class="kv"><span class="k">' + tx("Renueva hasta", "Renews through") + '</span><span class="v" style="color:var(--ok-700)">' + App.fd(exp) + "</span></div></div>" +
      (c.hh.length > 1 ? '<div class="hh-box"><div class="eyebrow" style="margin-bottom:8px">' + tx("Hogar cubierto · ", "Household covered · ") + c.hh.length + tx(" de ", " of ") + t.tiers[p.tier].hh + '</div><div class="hh-list">' + hh + "</div></div>" : "") + "</div>" +
      '<div><div class="m-section-title">' + tx("Plan", "Plan") + '</div><div class="help" style="margin:2px 0 10px">' + tx("El cambio de plan aplica a partir de esta renovación.", "A plan change takes effect with this renewal.") + '</div><div class="stack-2">' + plans + "</div></div>" +
      '<div><div class="m-section-title" style="margin-bottom:10px">' + tx("Método de pago", "Payment method") + '</div><div class="stack-3">' + App.payPicker(vm, { name: p.name, email: p.email, phone: p.phone }) + "</div></div>" +
      '<div class="m-card m-card-pad"><div class="kv"><span class="k">' + App.tierName(vm.tier) + '</span><span class="v">' + App.money(tr.price) + '</span></div><div class="total-row"><span>' + tx("Total hoy", "Total today") + "</span><span>" + App.money(tr.price) + "</span></div></div>" +
      '<button type="button" class="btn btn-tenant btn-xl btn-block" data-act="pay">' + (vm.method === "ath" ? '<span class="wm wm-ath" style="color:#fff">ATH</span>' + tx("Pagar con ATH Móvil · ", "Pay with ATH Móvil · ") : vm.method === "desk" ? ic("desk", "i-sm") + tx("Reservar y pagar en recepción · ", "Reserve and pay at the desk · ") : ic("lock", "i-sm") + tx("Pagar ", "Pay ")) + App.money(tr.price, false) + "</button>" +
      '<div class="secure-note">' + ic("shield") + "<span>" + tx("Enlace seguro de un solo uso, válido 14 días. La tarjeta la procesa el procesador de pagos del club y ATH Móvil se aprueba en tu app; el club nunca ve tu tarjeta.", "Secure single-use link, valid 14 days. Cards go through the range's payment processor and ATH Móvil is approved in your app; the range never sees your card.") + "</span></div></div>";
    return shell(body, tx("Todo viene lleno: datos del miembro, tarjeta de prueba y móvil de ATH Móvil. <strong>Tarjeta</strong> confirma al instante (y permite auto-renovación, apagada por defecto); <strong>ATH Móvil</strong> muestra la espera con cuenta regresiva; <strong>Pago en recepción</strong> reserva la renovación como pendiente hasta que el personal cobre.", "Everything is prefilled: member details, test card and ATH Móvil number. <strong>Card</strong> confirms instantly (and allows auto-renew, off by default); <strong>ATH Móvil</strong> shows the countdown wait; <strong>Pay at front desk</strong> reserves the renewal as pending until staff collect."));
  }
  function ath(c) {
    return shell('<div class="m-content" style="padding-top:22px">' + App.athView({ amount: App.ten().tiers[vm.tier].price, phone: vm.athPhone || vm.phone, expired: vm.expired }) + "</div>",
      tx("La cuenta regresiva es real (10 minutos). Toca <strong>«Demo: simular aprobación»</strong> para continuar como si el miembro aprobara en su app.", "The countdown is real (10 minutes). Tap <strong>“Demo: simulate approval”</strong> to continue as if the member approved in their app."), tx("Pago con ATH Móvil", "ATH Móvil payment"));
  }
  function done(c) {
    var p = c.p, r = vm.res, t = App.ten();
    var paid = App.payLine(r.method, r.pay);
    var body = '<div class="m-content" style="padding-top:28px"><div style="text-align:center" class="stack-3"><div class="ok-badge">' + ic("check") + '</div><h1 style="font-size:26px;line-height:32px;margin-top:18px">' + tx("¡Listo, ", "You're renewed, ") + App.first(p.name) + '!</h1><p class="muted" style="font-size:15px;line-height:22px">' + tx("Tu membresía está activa hasta el ", "Your membership is active through ") + '<strong style="color:var(--n-900)">' + App.fd(r.exp) + "</strong>.</p></div>" +
      '<a class="mini-card plain" href="card.html?m=' + p.id + '"><div class="qr"><img src="' + App.qr(p.id) + '" alt="' + tx("Código QR", "QR code") + '"></div><div class="grow" style="position:relative"><div class="row" style="gap:6px;margin-bottom:6px"><svg style="width:20px;height:20px">' + App.mark(true) + '</svg><span style="font-size:12px;font-weight:600;opacity:.9">' + t.name + '</span></div><div style="font-weight:700;font-size:16px;line-height:20px">' + p.name + '</div><div style="font-size:12.5px;opacity:.88">' + App.tierName(p.tier) + '</div><div style="margin-top:8px"><span class="badge" style="background:rgba(255,255,255,.95);color:var(--ok-700)">' + ic("check-circle") + tx("Activa", "Active") + " · " + App.fds(r.exp) + "</span></div></div></a>" +
      '<div class="callout ok">' + ic("check-circle") + "<span>" + tx("Tu tarjeta digital ya está actualizada. Recepción verá tu nuevo estado en tu próxima visita.", "Your digital card is already updated. The front desk will see your new status on your next visit.") + "</span></div>" +
      '<div class="m-card m-card-pad" style="padding-top:10px;padding-bottom:10px"><div class="kv"><span class="k">' + tx("Recibo", "Receipt") + '</span><span class="v mono">' + r.receipt + '</span></div><div class="kv"><span class="k">' + tx("Plan", "Plan") + '</span><span class="v">' + App.tierName(p.tier) + "</span></div>" + (c.hh.length > 1 ? '<div class="kv"><span class="k">' + tx("Hogar", "Household") + '</span><span class="v">' + c.hh.length + tx(" personas", " people") + "</span></div>" : "") + '<div class="kv"><span class="k">' + tx("Pagado con", "Paid with") + '</span><span class="v">' + paid + '</span></div><div class="kv"><span class="k">' + tx("Total", "Total") + '</span><span class="v">' + App.money(r.amount) + '</span></div><div class="kv"><span class="k">' + tx("Auto-renovación", "Auto-renew") + '</span><span class="v"' + (r.auto ? ' style="color:var(--ok-700)"' : ' style="color:var(--n-600);font-weight:500"') + ">" + (r.auto ? tx("Activada · tarjeta", "On · card") : tx("Desactivada", "Off")) + "</span></div></div>" +
      '<div class="secure-note">' + ic("mail") + "<span>" + tx("Enviamos el recibo a ", "Receipt sent to ") + "<strong>" + p.email + "</strong>" + (p.sms !== false ? tx(" y por texto al ", " and by text to ") + "<strong>" + p.phone + "</strong>" : "") + '.</span></div><div class="stack-2"><a class="btn btn-primary btn-lg btn-block" href="card.html?m=' + p.id + '">' + ic("id", "i-sm") + tx("Ver mi tarjeta digital", "Open my digital card") + '</a><a class="btn btn-secondary btn-lg btn-block" href="portal.html?m=' + p.id + '">' + ic("home", "i-sm") + tx("Ir a mi portal", "Go to my portal") + "</a></div></div>";
    return shell(body, tx("El panel del dueño ya cuenta esta renovación (origen: " + (vm.src === "link" ? "enlace" : vm.src) + "). Sigue al portal y la tarjeta QR.", "The owner dashboard already counts this renewal (source: " + vm.src + "). Continue to the portal and QR card."));
  }

  /* pay at front desk: reserved, member keeps current status until staff collect */
  function pending(c) {
    var p = c.p, pp = p.payPending, t = App.ten();
    var body = '<div class="m-content" style="padding-top:28px" data-pending><div style="text-align:center" class="stack-3"><div class="ok-badge" style="background:var(--warn-600);box-shadow:0 0 0 10px var(--warn-50)">' + ic("hourglass") + '</div><h1 style="font-size:24px;line-height:30px;margin-top:18px">' + tx("Pendiente de pago en recepción", "Payment pending at the front desk") + '</h1><p class="muted" style="font-size:15px;line-height:22px">' + tx("Reservamos tu renovación, " + App.first(p.name) + ". Se completa cuando pagues en recepción.", "We reserved your renewal, " + App.first(p.name) + ". It completes when you pay at the front desk.") + "</p></div>" +
      '<div class="m-card m-card-pad stack-2"><div class="kv"><span class="k">' + tx("Monto", "Amount") + '</span><span class="v">' + App.money(pp.amount) + '</span></div><div class="kv"><span class="k">' + tx("Plan", "Plan") + '</span><span class="v">' + App.tierName(pp.tier) + '</span></div><div class="kv"><span class="k">' + tx("Paga a más tardar", "Pay by") + '</span><span class="v" style="color:var(--warn-700)">' + App.fd(pp.due) + '</span></div><div class="kv"><span class="k">' + tx("Estado ahora", "Status now") + '</span><span class="v">' + App.badge(c.st) + "</span></div></div>" +
      '<div class="callout tenant">' + ic("desk") + "<span>" + tx("Trae <strong>" + App.money(pp.amount) + "</strong> en efectivo o un cheque a nombre de <strong>" + t.name + "</strong> a recepción a más tardar el <strong>" + App.fd(pp.due, "es") + "</strong>. Tu membresía sigue " + App.txa(App.STATUS[c.st]).toLowerCase() + " hasta que el personal confirme el pago; entonces queda activa hasta el " + App.fd(newExpiry(p, pp.prev === "active" || pp.prev === "grace" ? pp.prev : c.st, pp.tier), "es") + ".", "Bring <strong>" + App.money(pp.amount) + "</strong> in cash or a check payable to <strong>" + t.name + "</strong> to the front desk by <strong>" + App.fd(pp.due, "en") + "</strong>. Your membership stays " + App.txa(App.STATUS[c.st]).toLowerCase() + " until staff confirm the payment; then it's active through " + App.fd(newExpiry(p, pp.prev === "active" || pp.prev === "grace" ? pp.prev : c.st, pp.tier), "en") + ".") + "</span></div>" +
      '<div class="secure-note">' + ic("mail") + "<span>" + tx("Te enviamos estas instrucciones a ", "We emailed these instructions to ") + "<strong>" + p.email + "</strong>.</span></div>" +
      '<div class="stack-2"><button type="button" class="btn btn-secondary btn-lg btn-block" data-act="payOnline">' + ic("card", "i-sm") + tx("Prefiero pagar ahora con tarjeta o ATH Móvil", "I'd rather pay now by card or ATH Móvil") + '</button><a class="btn btn-ghost btn-lg btn-block" href="portal.html?m=' + p.id + '">' + ic("home", "i-sm") + tx("Ir a mi portal", "Go to my portal") + "</a></div></div>";
    return shell(body, tx("Pago en recepción: la renovación queda <strong>pendiente</strong> y el miembro conserva su estado. En recepción aparece «Pago pendiente en recepción» con «Cobrar» de un toque.", "Pay at front desk: the renewal stays <strong>pending</strong> and the member keeps their status. The front desk shows “Payment pending at front desk” with one-tap “Collect”."), tx("Pago en recepción", "Pay at front desk"));
  }

  function render() {
    if (!m0) return invalid();
    var c = ctx();
    if (vm.view === "done") return done(c);
    if (c.p.payPending && vm.view !== "ath" && !vm.payOnline) return pending(c);
    if (vm.view === "ath") return ath(c);
    if (vm.startedRenewed || c.st === "suspended" || c.st === "cancelled" || c.st === "pending") return used(c);
    return form(c);
  }
  function complete() {
    var c = ctx();
    vm.res = App.renew(vm.pid, { tier: vm.tier, method: vm.method, pay: App.payInfo(vm, App.ten().tiers[vm.tier].price), autorenew: vm.autorenew, src: vm.src, step: vm.step, ch: vm.ch });
    App.athStop(); vm.view = "done"; App.rerender();
    var sc = document.getElementById("screen"); if (sc) sc.scrollTop = 0; window.scrollTo(0, 0);
  }
  function startAth() { vm.expired = false; App.athStart({ onExpire: function () { vm.expired = true; App.rerender(); } }); App.athTick(); }

  App.page({
    render: render,
    title: function () { return tx("Renueva tu membresía", "Renew your membership"); },
    after: function () { if (vm.view === "ath") App.athTick(); },
    handlers: Object.assign(App.payHandlers(vm, App.rerender), {
      tier: function (el) { if (el.disabled) return; vm.tier = el.dataset.v; App.keepScroll = true; App.rerender(); },
      pay: function () {
        var c = ctx(), pe = App.payCheck(vm); if (pe) { App.toast(pe, "warn"); return; }
        if (vm.method === "desk") { App.reservePay(vm.pid, { tier: vm.tier, src: vm.src, step: vm.step, ch: vm.ch }); vm.payOnline = false; vm.view = "form"; App.rerender(); var s0 = document.getElementById("screen"); if (s0) s0.scrollTop = 0; window.scrollTo(0, 0); return; }
        if (vm.method === "ath") { vm.view = "ath"; App.rerender(); var sc = document.getElementById("screen"); if (sc) sc.scrollTop = 0; window.scrollTo(0, 0); startAth(); return; }
        App.simulatePay(vm, App.ten().tiers[vm.tier].price, c.p, complete);
      },
      athApprove: function () { App.athStop(); App.modal({ sticky: true, render: App.spinner(tx("ATH Móvil aprobado · confirmando…", "ATH Móvil approved · confirming…")) }); setTimeout(function () { App.modalDef = null; App.renderModal(); complete(); }, 900); },
      payOnline: function () { vm.payOnline = true; vm.method = "card"; App.rerender(); },
      athOpen: function () { App.toast(tx("En un teléfono real se abriría la app ATH Móvil.", "On a real phone this opens the ATH Móvil app.")); },
      athCancel: function () { App.athStop(); vm.view = "form"; App.rerender(); },
      athRetry: function () { vm.expired = false; App.rerender(); startAth(); }
    })
  });
})();
