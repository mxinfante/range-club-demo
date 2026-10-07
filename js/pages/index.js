/* Presenter start page: recommended click path (mirrors the spec's demo script), controls, reset. */
(function () {
  var tx = App.tx, ic = App.ic;
  function name(id) { var m = App.member(id); return m ? m.name : id; }
  function done(n) {
    var ts = App.ts(), ev = ts.events, has = function (f) { return ev.some(f); };
    return ({
      1: has(function (e) { return e.type === "signup"; }),
      2: !!ts.outbox.run,
      3: has(function (e) { return e.type === "renewal" && e.src === "link"; }),
      5: has(function (e) { return e.type === "checkin"; }),
      7: has(function (e) { return e.type === "checkin" && e.where === "kiosk"; })
    })[n] || false;
  }
  function render() {
    var t = App.ten(), other = App.tkey() === "guayama" ? "salinas" : "guayama", od = window.RC_DATA[other];
    var lm = t.linkMember, dk = t.deskDemo;
    var extra = {
      1: '<div class="sl-links"><a class="btn btn-primary" href="signup.html">' + ic("user-plus", "i-sm") + tx("Abrir inscripción", "Open sign-up") + "</a></div>" +
        '<ul class="sl-beats"><li>' + tx("Prueba la validación: una fecha de nacimiento de menor de 21 muestra el error en línea.", "Try the check: a date of birth under 21 shows the inline error.") + "</li><li>" + tx("Firma con el dedo o el ratón; elige el relevo en español o inglés.", "Sign with a finger or mouse; pick the Spanish or English waiver.") + "</li><li>" + tx("Paga con ATH Móvil para ver la espera de aprobación (o PayPal/tarjeta).", "Pay with ATH Móvil to show the approval wait (or PayPal/card).") + "</li></ul>",
      2: '<div class="sl-links"><a class="btn btn-primary" href="dashboard.html">' + ic("dashboard", "i-sm") + tx("Abrir el panel", "Open the dashboard") + '</a><a class="btn btn-secondary" href="outbox.html">' + ic("send", "i-sm") + tx("Bandeja de demo", "Demo outbox") + "</a></div>" +
        '<ul class="sl-beats"><li>' + tx("En el panel toca «Ejecutar recordatorios de hoy».", "On the dashboard tap “Run today's reminders”.") + "</li><li>" + tx("Abre el texto para ", "Open the text to ") + "<strong>" + name(lm) + "</strong>" + tx(" (vence mañana) y toca el enlace.", " (expires tomorrow) and tap the link.") + "</li></ul>",
      3: '<div class="sl-links"><a class="btn btn-primary" href="renew.html?m=' + lm + '&src=link&step=d1&ch=sms">' + ic("renew", "i-sm") + tx("Abrir el enlace de ", "Open the link for ") + App.first(name(lm)) + "</a></div>" +
        '<ul class="sl-beats"><li>' + tx("Datos ya llenos, sin contraseña.", "Pre-filled, no password.") + "</li><li>" + tx("ATH Móvil: «Aprueba en ATH Móvil» con 10 minutos en vivo; usa «Demo: simular aprobación».", "ATH Móvil: “Approve in ATH Móvil” with a live 10-minute countdown; use “Demo: simulate approval”.") + "</li><li>" + tx("PayPal o tarjeta: confirma al instante y permite auto-renovación.", "PayPal or card: confirms instantly and allows auto-renew.") + "</li></ul>",
      4: '<div class="sl-links"><a class="btn btn-primary" href="portal.html">' + ic("home", "i-sm") + tx("Portal del miembro", "Member portal") + '</a><a class="btn btn-secondary" href="card.html">' + ic("card", "i-sm") + tx("Tarjeta digital (QR)", "Digital card (QR)") + "</a></div>",
      5: '<div class="sl-links"><a class="btn btn-primary" href="checkin.html">' + ic("login", "i-sm") + tx("Abrir recepción", "Open front desk") + "</a></div>" +
        '<ol class="sl-beats sl-num"><li><a href="checkin.html?m=' + dk[0] + '">' + name(dk[0]) + "</a> · " + tx("pasa", "cleared") + "</li><li><a href=\"checkin.html?m=" + dk[1] + '">' + name(dk[1]) + "</a> · " + tx("vencida → «Renovar ahora» → entra", "lapsed → “Renew now” → checked in") + "</li><li><a href=\"checkin.html?m=" + dk[2] + '">' + name(dk[2]) + "</a> · " + tx("relevo viejo → firma en la tableta", "old waiver → signs on the tablet") + "</li></ol>",
      6: '<div class="sl-links"><a class="btn btn-primary" href="dashboard.html">' + ic("dashboard", "i-sm") + tx("Volver al panel", "Back to the dashboard") + '</a><a class="btn btn-secondary" href="members.html">' + ic("users", "i-sm") + tx("Miembros", "Members") + "</a></div>",
      7: '<div class="sl-links"><a class="btn btn-primary" href="kiosk.html">' + ic("tablet", "i-sm") + tx("Abrir quiosco", "Open kiosk") + "</a></div>",
      8: '<div class="sl-links"><a class="btn btn-primary" href="dashboard.html?tenant=' + other + '"><svg class="tenant-mark" style="width:20px;height:20px"><use href="#' + od.mark + '-inv"/></svg>' + tx("Cambiar a ", "Switch to ") + od.name + "</a></div>" +
        '<ul class="sl-beats"><li>' + tx("Recorre panel, recepción, miembros y portal: otra marca, otros miembros.", "Walk through dashboard, front desk, members and portal: another brand, other members.") + "</li></ul>"
    };
    var steps = App.STEPS.map(function (s) {
      var title = s.n === 8 ? tx("Cambiar a ", "Switch to ") + od.name : App.txa(s.t);
      var ok = done(s.n);
      return '<li class="sl-step' + (ok ? " is-done" : "") + '"><span class="sl-n">' + (ok ? ic("check", "i-sm") : s.n) + '</span><div class="sl-body"><div class="row between wrap" style="gap:8px"><h3>' + title + "</h3>" + (ok ? '<span class="badge badge--active">' + ic("check-circle") + tx("Hecho", "Done") + "</span>" : "") + "</div><p>" + App.txa(s.d) + "</p>" + (extra[s.n] || "") + "</div></li>";
    }).join("");
    return '<div class="start-page">' +
      '<header class="start-top"><a class="rc-logo" href="index.html"><svg><use href="#rc-mark"/></svg><span>Range Club</span></a><span class="badge badge--neutral start-proto-tag">' + tx("Prototipo navegable", "Clickable prototype") + "</span><span class=\"grow\"></span>" + App.langSeg() + "</header>" +
      '<div class="start-grid"><main class="start-main">' +
      '<div class="eyebrow">' + tx("Guion de demo · unos 15 minutos · en español", "Demo script · about 15 minutes · in Spanish") + "</div>" +
      "<h1>" + tx("Demo para administradores de clubes de tiro", "Demo for gun range administrators") + "</h1>" +
      '<p class="lead">' + tx("Sigue estos pasos en orden. Todo es ficticio y se guarda solo en este navegador: no hay servidor, no se envían mensajes y no se mueve dinero.", "Follow these steps in order. Everything is fictional and stays in this browser: no server, no messages sent and no money moved.") + "</p>" +
      '<div class="start-ctl-mobile">' + App.tenantSeg() + '<button type="button" class="btn btn-secondary btn-sm" data-act="resetDemo">' + ic("renew", "i-sm") + tx("Reiniciar demo", "Reset demo") + "</button></div>" +
      '<ol class="sl">' + steps + "</ol></main>" +
      '<aside class="start-side">' +
      '<section class="card card-pad stack-3"><h2 class="h3">' + tx("Controles", "Controls") + '</h2>' +
      '<div class="ctl"><div class="ctl-l">' + tx("Club (inquilino)", "Range (tenant)") + "</div>" + App.tenantSeg() + "</div>" +
      '<div class="pick is-on" style="cursor:default"><svg class="tenant-mark" style="width:36px;height:36px">' + App.mark() + '</svg><span class="grow"><strong>' + t.name + '</strong><span class="xs subtle" style="display:block">' + t.host + " · " + t.city + "</span></span></div>" +
      '<div class="ctl"><div class="ctl-l">' + tx("Idioma de la interfaz", "Interface language") + "</div>" + App.langSeg() + "</div>" +
      '<button type="button" class="btn btn-secondary btn-block" data-act="resetDemo">' + ic("renew", "i-sm") + tx("Reiniciar demo", "Reset demo") + "</button>" +
      '<p class="xs subtle">' + tx("Reinicia antes de cada presentación. El club y el idioma se recuerdan entre páginas.", "Reset before each presentation. Range and language are remembered across pages.") + "</p></section>" +
      '<section class="card card-pad stack-2"><h2 class="h3">' + tx("Fecha de la demo", "Demo date") + '</h2><p class="small">' + App.fdl(App.TODAY) + '</p><p class="xs subtle">' + tx("Estados calculados con gracia de " + t.grace + " días y edad mínima de " + t.minAge + " años.", "Statuses use a " + t.grace + "-day grace period and a minimum age of " + t.minAge + ".") + "</p></section>" +
      '<section class="card card-pad stack-2"><h2 class="h3">' + tx("Real vs. simulado", "Real vs. simulated") + '</h2><p class="small"><strong>' + tx("Funciona de verdad:", "Really works:") + "</strong> " + tx("aislamiento por club, interfaz bilingüe, versiones y firma del relevo, ciclo de renovación y enlaces, reglas de entrada, métricas.", "range isolation, bilingual UI, waiver versions and signing, renewal lifecycle and links, check-in rules, metrics.") + '</p><p class="small"><strong>' + tx("Simulado:", "Simulated:") + "</strong> " + tx("email y texto (bandeja en pantalla), aprobación de ATH Móvil, PayPal sandbox, tareas programadas (botón de demo), subdominios por club.", "email and text (on-screen outbox), ATH Móvil approval, PayPal sandbox, scheduled jobs (demo button), per-range subdomains.") + "</p></section>" +
      '<section class="card card-pad stack-2"><h2 class="h3">' + tx("Todas las pantallas", "All screens") + '</h2><div class="all-links">' +
      [["dashboard.html", "dashboard", "Panel", "Dashboard"], ["checkin.html", "login", "Recepción", "Front desk"], ["members.html", "users", "Miembros", "Members"], ["outbox.html", "send", "Bandeja de demo", "Demo outbox"], ["signup.html", "user-plus", "Inscripción", "Sign-up"], ["renew.html", "renew", "Renovación", "Renewal"], ["portal.html", "home", "Portal", "Portal"], ["card.html", "card", "Tarjeta digital", "Digital card"], ["kiosk.html", "tablet", "Quiosco", "Kiosk"]].map(function (l) { return '<a href="' + l[0] + '">' + ic(l[1], "i-sm") + tx(l[2], l[3]) + "</a>"; }).join("") +
      "</div></section></aside></div></div>";
  }
  App.page({ render: render, title: function () { return tx("Demo para presentar", "Presenter start"); } });
})();
