/* Digital membership card with QR (each household adult has their own code). */
(function () {
  var tx = App.tx, ic = App.ic, vm = App.vm;
  var list0 = App.members(), id0 = App.q("m") || App.ts().current || App.ten().portalMember;
  var m0 = App.member(id0, list0) || App.member(App.ten().portalMember, list0);
  vm.who = m0.id;
  function render() {
    var t = App.ten(), list = App.members(), m = App.member(vm.who, list), p = App.primary(m, list), hh = App.household(p, list), st = App.status(m, list), pass = App.passes(m, list);
    var stc = { active: "var(--ok-700)", grace: "var(--warn-700)", lapsed: "var(--bad-700)", suspended: "var(--n-900)", pending: "var(--n-700)", cancelled: "var(--n-700)" }[st];
    var chips = hh.length > 1 ? '<div class="who" role="tablist">' + hh.map(function (x) { return '<button type="button" class="who-chip' + (x.id === m.id ? " is-on" : "") + '" data-act="who" data-v="' + x.id + '" aria-selected="' + (x.id === m.id) + '"><span class="avatar ' + (x.av || "av-1") + '">' + App.ini(x.name) + "</span><span>" + App.first(x.name) + "</span></button>"; }).join("") + "</div>" : "";
    var body = '<div class="c-top"><a class="btn btn-ghost btn-icon" href="portal.html?m=' + m0.id + '" aria-label="' + tx("Volver", "Back") + '">' + ic("arrow-left") + '</a><div class="grow" style="font-weight:700;font-size:16px">' + tx("Tarjeta digital", "Digital card") + "</div>" + App.langSeg(true) + "</div>" + chips +
      '<div class="big-card"><div class="bc-head"><div class="row" style="gap:10px;position:relative;z-index:1"><svg style="width:34px;height:34px">' + App.mark(true) + '</svg><div><div style="font-weight:700;font-size:15px;line-height:19px">' + t.name + '</div><div style="font-size:11.5px;opacity:.85">' + t.city + '</div></div></div><div style="margin-top:16px;position:relative;z-index:1"><div style="font-size:22px;font-weight:750;letter-spacing:-0.02em;line-height:28px">' + m.name + '</div><div style="font-size:13.5px;opacity:.9">' + App.tierName(p.tier) + " · " + (m.id === p.id ? tx("Titular", "Primary") : tx("Adulto del hogar", "Household adult")) + "</div></div></div>" +
      '<div class="bc-qr"><div class="qrbox"><img src="' + App.qr(m.id) + '" alt="' + tx("Código QR de entrada de ", "Check-in QR code for ") + m.name + '"><div class="mid"><svg style="width:38px;height:38px">' + App.mark() + '</svg></div></div><div class="small muted row" style="gap:6px">' + ic("sun", "i-sm") + tx("Sube el brillo de la pantalla para escanear", "Turn up your screen brightness to scan") + "</div></div>" +
      '<div class="bc-grid"><div><div class="eyebrow">' + tx("Estado", "Status") + '</div><div class="v" style="color:' + stc + '"><span class="row" style="gap:5px">' + ic(App.STATUS[st][2], "i-sm") + App.txa(App.STATUS[st]) + '</span></div></div><div><div class="eyebrow">' + tx("Vigente hasta", "Valid through") + '</div><div class="v">' + (p.expires ? App.fd(p.expires) : "—") + '</div></div><div><div class="eyebrow">' + tx("Miembro #", "Member #") + '</div><div class="v mono">' + m.id + '</div></div><div><div class="eyebrow">' + tx("Pases de invitado", "Guest passes") + '</div><div class="v">' + pass[0] + " / " + pass[1] + "</div></div></div></div>" +
      '<div class="c-actions"><button type="button" class="btn btn-lg btn-block" style="background:#fff;color:var(--tenant-800)" data-act="a2hs">' + ic("share", "i-sm") + tx("Agregar a la pantalla de inicio", "Add to home screen") + '</button><a class="btn btn-lg btn-block btn-glass" href="checkin.html?m=' + m.id + '">' + ic("scan", "i-sm") + tx("Demo: escanear en recepción", "Demo: scan at the front desk") + '</a><div class="xs" style="color:rgba(255,255,255,.75);text-align:center;line-height:17px">' + tx("Cada miembro del hogar tiene su propio código. Se actualiza al instante cuando renuevas.", "Each household member has their own code. Updates instantly after you renew.") + "</div></div>" +
      '<div class="m-foot"><span class="powered" style="color:rgba(255,255,255,.7)"><svg><use href="#rc-mark"/></svg>' + tx("Con la tecnología de Range Club", "Powered by Range Club") + '</span><div class="endorse-row">' + App.endorse(16, "endorse--chip") + "</div></div>";
    return App.mobileShell({ step: "card", noHeader: true, content: '<div class="m-page">' + body + "</div>", guide: tx("El QR identifica a la persona, no al pago: recepción ve el estado en vivo. Usa «Demo: escanear en recepción» para seguir al paso 5.", "The QR identifies the person, not the payment: the desk sees live status. Use “Demo: scan at the front desk” to go on to step 5.") });
  }
  App.page({
    render: render,
    title: function () { return tx("Tarjeta digital", "Digital card"); },
    handlers: {
      who: function (el) { vm.who = el.dataset.v; App.rerender(); },
      a2hs: function () { App.toast(tx("En el teléfono se agrega como app (PWA).", "On a phone it's added like an app (PWA).")); }
    }
  });
})();
