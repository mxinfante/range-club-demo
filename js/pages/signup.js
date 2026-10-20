/* Online sign-up (mobile): plan → details (no date of birth; license yes/no, household adults) → bilingual waiver
   (typed name + drawn signature) → notifications consent (SMS opt-in unchecked by default) → confirm → pending member.
   No in-app payments: the member pays at the club office and an admin activates them (payment type, reference, date).
   No online 21+ step: desk staff verify 21+ with a photo ID for spectators. */
(function () {
  var tx = App.tx, ic = App.ic, vm = App.vm;
  var T = App.ten();
  vm.view = "plan"; vm.tier = T.signupTiers.indexOf("fam") >= 0 ? "fam" : T.signupTiers[0];
  /* Every field starts prefilled with this club's fictional sample (RC_DATA.<club>.demo.signup); all stay editable. */
  var DS = T.demo.signup;
  function sample() { return { name: DS.name, phone: DS.phone, email: DS.email, town: DS.town, zip: DS.zip, emer: DS.emer, licNo: DS.licNo, licExp: DS.licExp, pref: App.L() }; }
  vm.f = sample();
  vm.hh = []; vm.lic = true; vm.add = { name: DS.adult.name }; vm.err = {}; vm.wl = App.L(); vm.agree = false; vm.sigName = DS.name; vm.sigTouched = false; vm.sig = null; vm.read = 0;
  vm.emailOk = true; vm.sms = false; vm.method = "desk"; vm.autorenew = false; vm.signup = true;
  var TOWNS = ["Guayama", "Salinas", "Arroyo", "Patillas", "Cayey", "Santa Isabel", "Coamo", "Aibonito", "Ponce", "Juana Díaz"];
  var VIEWS = ["plan", "details", "waiver", "consent", "pay"]; /* "pay" = confirm step; nothing is charged online */

  /* ---------- validation */
  function parseDob(s) {
    s = String(s || "").trim(); var d, mo, y, m;
    if ((m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/))) { d = +m[1]; mo = +m[2]; y = +m[3]; }
    else if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/))) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else return null;
    var dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
    return dt.toISOString().slice(0, 10);
  }
  function validateDetails() {
    var f = vm.f, e = {};
    if (f.name.trim().split(/\s+/).length < 2) e.name = tx("Escribe nombre y apellido(s).", "Enter first and last name.");
    if (f.phone.replace(/\D/g, "").length !== 10) e.phone = tx("Escribe un móvil de 10 dígitos, por ejemplo (787) 555-0190.", "Enter a 10-digit mobile, e.g. (787) 555-0190.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = tx("Escribe un email válido.", "Enter a valid email.");
    if (vm.lic && !/^[A-Za-z0-9-]{6,}$/.test(f.licNo.trim())) e.licNo = tx("Escribe el número de tu Licencia de Armas.", "Enter your gun license (Licencia de Armas) number.");
    var le = parseDob(f.licExp); if (!vm.lic) { /* spectator: no license fields */ }
    else if (!le) e.licExp = tx("Fecha no válida. Usa dd/mm/aaaa.", "Invalid date. Use dd/mm/yyyy.");
    else if (le < App.TODAY) e.licExp = tx("Tu licencia está vencida. Para tirar necesitas una licencia vigente (Reglamento 9172).", "Your license has expired. You need a valid license to shoot (Reglamento 9172).");
    if (!/^\d{5}$/.test(f.zip.trim())) e.zip = tx("Código postal de 5 dígitos.", "5-digit ZIP code.");
    return e;
  }

  /* ---------- pieces */
  function stepHead(i, right) {
    var dots = VIEWS.map(function (v, k) { return '<span class="step-dot' + (k <= i ? " is-done" : "") + '"></span>'; }).join("");
    var names = [tx("Plan", "Plan"), tx("Tus datos", "Your details"), tx("Relevo", "Waiver"), tx("Avisos", "Notifications"), tx("Confirmar", "Confirm")];
    return '<div><div class="row between small muted" style="margin-bottom:8px;gap:8px"><span>' + tx("Paso ", "Step ") + (i + 1) + tx(" de ", " of ") + VIEWS.length + " · " + names[i] + "</span><span>" + (right || "") + '</span></div><div class="stepper">' + dots + "</div></div>";
  }
  function field(key, label, opts) {
    opts = opts || {}; var err = vm.err[key], val = opts.val != null ? opts.val : vm.f[key];
    return '<div class="field"><label class="label" for="f-' + key + '">' + label + "</label><input class=\"input" + (err ? " is-invalid" : opts.valid ? " is-valid" : "") + '" id="f-' + key + '" data-f="' + key + '" value="' + App.esc(val) + '"' + (opts.attrs || "") + (err ? ' aria-invalid="true" aria-describedby="e-' + key + '"' : "") + ">" +
      (err ? '<span class="help is-error" id="e-' + key + '" role="alert">' + ic("alert") + "<span>" + err + "</span></span>" : opts.help ? opts.help : "") + "</div>";
  }
  function licHelp(v) {
    var iso = parseDob(v); if (!iso) return '<span class="help">' + tx("Te recordaremos 6 meses antes.", "We'll remind you 6 months ahead.") + "</span>";
    var d = App.diff(iso, App.TODAY);
    if (d < 0) return '<span class="help is-error">' + ic("alert") + "<span>" + tx("Vencida: sin licencia vigente no puedes tirar.", "Expired: you can't shoot without a valid license.") + "</span></span>";
    return '<span class="help is-valid">' + ic("check-circle") + "<span>" + tx("Vigente · te avisamos desde 180 días antes", "Valid · reminders start 180 days ahead") + "</span></span>";
  }
  function shell(content, guide, sub) { return App.mobileShell({ step: "signup", sub: sub || tx("Inscripción", "Sign-up"), content: '<div class="m-page">' + content + '<div class="m-foot">' + App.powered() + "</div></div>", guide: guide }); }
  function backBtn(to) { return '<button type="button" class="btn btn-ghost btn-block" data-act="go" data-v="' + to + '">' + ic("arrow-left", "i-sm") + tx("Atrás", "Back") + "</button>"; }

  /* ---------- views */
  function vPlan() {
    var t = App.ten();
    var cards = t.signupTiers.map(function (k) {
      var x = t.tiers[k], on = vm.tier === k;
      var desc = x.hh > 1 ? tx("Hasta " + x.hh + " personas de tu hogar · " + x.passes + " pases de invitado al año", "Up to " + x.hh + " people in your household · " + x.passes + " guest passes per year") : x.term === "month" ? tx("Solo tú · se renueva cada mes · sin pases de invitado", "Just you · renews monthly · no guest passes") : tx("Solo tú · " + x.passes + " pases de invitado al año", "Just you · " + x.passes + " guest passes per year");
      return '<button type="button" class="radio-card' + (on ? " is-selected" : "") + '" data-act="tier" data-v="' + k + '" aria-pressed="' + on + '"><span class="radio"></span><div class="grow"><div class="row between"><strong>' + tx(x.es, x.en) + '</strong><span class="tier-price">' + App.money(x.price, false) + "<small>" + (x.term === "month" ? tx("/mes", "/mo") : tx("/año", "/yr")) + '</small></span></div><div class="small muted">' + desc + "</div>" + (k === "fam" ? '<div style="margin-top:8px"><span class="pill-tag">' + tx("Más popular", "Most popular") + "</span></div>" : "") + (x.elig ? '<div class="row xs" style="margin-top:6px;gap:5px;color:var(--n-600)">' + ic("id", "i-xs") + "<span>" + App.txa(x.elig) + "</span></div>" : "") + "</div></button>";
    }).join("");
    return shell('<div class="m-content">' + stepHead(0, tx("Aprox. 4 min en total", "About 4 min total")) + '<div><h1 style="font-size:24px;line-height:31px">' + tx("Hazte socio de ", "Join ") + t.name + '</h1><p class="muted" style="margin-top:6px;font-size:15px;line-height:22px">' + tx("Elige tu membresía. Puedes cambiar de plan al renovar.", "Choose your membership. You can change plans at renewal.") + '</p></div><div class="stack-3">' + cards + "</div>" +
      '<div class="callout">' + ic("info") + "<span>" + tx("Inscríbete aquí y paga en la oficina del club. No cobramos nada en línea.", "Sign up here and pay at the club office. Nothing is charged online.") + '</span></div><button type="button" class="btn btn-primary btn-xl btn-block" data-act="go" data-v="details">' + tx("Continuar", "Continue") + ic("arrow-right", "i-sm") + '</button><div class="small muted" style="text-align:center">' + tx("¿Ya eres socio? ", "Already a member? ") + '<a href="portal.html">' + tx("Entra a tu portal", "Open your portal") + "</a></div></div>",
      tx("El plan Familiar ya está elegido y todos los campos vienen llenos: solo toca <strong>«Continuar»</strong> en cada paso.", "The Family plan is preselected and every field is prefilled: just tap <strong>“Continue”</strong> on each step."));
  }
  function vDetails() {
    var t = App.ten(), tr = t.tiers[vm.tier], f = vm.f;
    var hhList = vm.hh.map(function (h, i) { return '<div class="list-row hh-line"><div class="avatar av-' + ((i % 6) + 2) + '">' + App.ini(h.name) + '</div><div class="grow"><div style="font-weight:600">' + App.esc(h.name) + '</div><div class="xs subtle">' + tx("Adulto · invitación propia al relevo", "Adult · own waiver invite") + '</div></div><button type="button" class="icon-btn" data-act="hhDel" data-v="' + i + '" aria-label="' + tx("Quitar", "Remove") + '">' + ic("x", "i-sm") + "</button></div>"; }).join("");
    var room = tr.hh - 1 - vm.hh.length;
    var household = tr.hh > 1 ? '<div class="divider" style="margin:4px 0"></div><div class="row between"><div class="sec">' + tx("Tu hogar", "Your household") + '</div><span class="small muted">' + (1 + vm.hh.length) + tx(" de ", " of ") + tr.hh + tx(" personas", " people") + '</span></div><div class="m-card" style="overflow:hidden"><div class="list-row hh-line"><div class="avatar av-2">' + (f.name.trim() ? App.ini(f.name) : "?") + '</div><div class="grow"><div style="font-weight:600">' + (App.esc(App.first(f.name.trim() || tx("Tú", "You")))) + ' <span class="subtle">' + tx("(tú)", "(you)") + '</span></div><div class="xs subtle">' + tx("Titular · paga el hogar", "Primary · pays for the household") + '</div></div><span class="badge badge--tenant">' + tx("Paga", "Payer") + "</span></div>" + hhList +
      (room > 0 ? '<div class="hh-add"><div class="row between"><span style="font-weight:650;font-size:14px">' + tx("Agregar persona (opcional)", "Add person (optional)") + '</span><span class="xs subtle">' + tx("Solo adultos", "Adults only") + "</span></div>" +
        '<div class="field"><label class="label" for="a-name">' + tx("Nombre completo", "Full name") + '</label><input class="input' + (vm.err.aname ? " is-invalid" : "") + '" id="a-name" data-a="name" value="' + App.esc(vm.add.name) + '">' + (vm.err.aname ? '<span class="help is-error" role="alert">' + ic("alert") + "<span>" + vm.err.aname + "</span></span>" : "") + "</div>" +
        '<button type="button" class="btn btn-secondary btn-sm" data-act="hhAdd" style="align-self:flex-start">' + ic("user-plus", "i-sm") + tx("Agregar al hogar", "Add to household") + "</button></div>" : "") + "</div>" +
      '<div class="callout">' + ic("info") + "<span>" + tx("Cada adulto del hogar firma su propio relevo.", "Each adult in the household signs their own waiver.") + "</span></div>" : "";
    var errs = Object.keys(vm.err).filter(function (k) { return k !== "aname"; }).length;
    return shell('<div class="m-content">' + stepHead(1, App.tierName(vm.tier)) + '<div class="row between" style="gap:10px;align-items:flex-start"><h1 style="font-size:24px;line-height:31px">' + tx("Tus datos", "Your details") + '</h1><button type="button" class="btn btn-secondary btn-sm demo-fill" data-act="fill">' + ic("renew", "i-sm") + tx("Restaurar ejemplo", "Restore sample") + "</button></div>" +
      '<div class="prefill-note">' + ic("check-circle") + "<span>" + tx("Datos de ejemplo ya llenos. Puedes editarlos.", "Sample data already filled in. You can edit it.") + "</span></div>" +
      (errs ? '<div class="callout warn" role="alert">' + ic("alert") + "<span>" + tx("Revisa los campos marcados.", "Please fix the highlighted fields.") + "</span></div>" : "") +
      field("name", tx("Nombre completo", "Full name"), { attrs: ' autocomplete="name"' }) +
      '<div class="two">' + field("phone", tx("Móvil", "Mobile"), { attrs: ' inputmode="tel" autocomplete="tel" placeholder="(787) 555-0000"' }) + "</div>" +
      field("email", "Email", { attrs: ' inputmode="email" autocomplete="email" placeholder="nombre@example.com"' }) +
      '<div class="field"><span class="label">' + tx("¿Tienes Licencia de Armas?", "Do you have a gun license?") + '</span><div class="seg" style="align-self:flex-start"><button type="button" data-act="lic" data-v="yes" aria-pressed="' + vm.lic + '" style="height:34px;min-width:90px;font-size:13px">' + tx("Sí", "Yes") + '</button><button type="button" data-act="lic" data-v="no" aria-pressed="' + !vm.lic + '" style="height:34px;min-width:90px;font-size:13px">' + tx("No, soy espectador", "No, spectator") + '</button></div></div>' +
      (vm.lic ? '<div class="two">' + field("licNo", tx("Licencia de Armas (número)", "Gun license (number)"), { attrs: ' autocomplete="off" style="font-family:var(--mono, monospace)"', help: '<span class="help" id="h-licNo">' + tx("Se guarda cifrado; después solo verás ", "Stored encrypted; afterwards you'll only see ") + App.mask(f.licNo) + ". " + tx("Sin fotos del carnet.", "No card photos.") + "</span>" }) + field("licExp", tx("Vence la licencia", "License expires"), { attrs: ' inputmode="numeric" placeholder="dd/mm/aaaa"', help: licHelp(f.licExp) }) + "</div>" : '<div class="callout info">' + ic("id") + "<span>" + tx("En recepción verificaremos que tienes 21 años o más con una identificación con foto.", "At the front desk we'll check that you're 21 or older with a photo ID.") + "</span></div>") +
      '<div class="two"><div class="field"><label class="label" for="f-town">' + tx("Municipio", "Town (municipio)") + '</label><select class="select input" id="f-town" data-f="town">' + (TOWNS.indexOf(f.town) < 0 && f.town ? [f.town] : []).concat(TOWNS).map(function (x) { return "<option" + (x === f.town ? " selected" : "") + ">" + x + "</option>"; }).join("") + "</select></div>" + field("zip", tx("Código postal", "ZIP code"), { attrs: ' inputmode="numeric" maxlength="5"' }) + "</div>" +
      field("emer", tx("Contacto de emergencia (opcional)", "Emergency contact (optional)"), { attrs: ' placeholder="' + tx("Nombre · teléfono", "Name · phone") + '"' }) +
      '<div class="field"><span class="label">' + tx("Idioma preferido para emails, textos y recibos", "Preferred language for emails, texts and receipts") + '</span><div class="seg" style="align-self:flex-start"><button type="button" data-act="pref" data-v="es" aria-pressed="' + (f.pref === "es") + '" style="height:34px;min-width:90px;font-size:13px">Español</button><button type="button" data-act="pref" data-v="en" aria-pressed="' + (f.pref === "en") + '" style="height:34px;min-width:90px;font-size:13px">English</button></div></div>' +
      household + '<div class="stack-2"><button type="button" class="btn btn-primary btn-xl btn-block" data-act="toWaiver">' + tx("Continuar al relevo", "Continue to waiver") + ic("arrow-right", "i-sm") + "</button>" + backBtn("plan") + "</div></div>",
      tx("Todo viene lleno con datos de ejemplo: toca <strong>«Continuar al relevo»</strong>. No pedimos fecha de nacimiento. Con <strong>«No, soy espectador»</strong> se ve el aviso de verificación con identificación en recepción. El adulto del hogar ya está escrito: «Agregar al hogar» es opcional.", "Everything is prefilled with sample data: tap <strong>“Continue to waiver”</strong>. No date of birth is asked. <strong>“No, spectator”</strong> shows the photo-ID check notice for the front desk. The household adult is prefilled too: “Add to household” is optional."));
  }
  function vWaiver() {
    var t = App.ten(), wt = App.waiverText(vm.wl), nameOk = vm.sigName && App.norm(vm.sigName) === App.norm(vm.f.name);
    return shell('<div class="m-content">' + stepHead(2, tx("Aprox. 2 min", "About 2 min")) + '<div><h1 style="font-size:23px;line-height:30px">' + tx("Relevo de responsabilidad y reglas del club", "Release of liability and range rules") + '</h1><div class="row" style="margin-top:8px;gap:6px;flex-wrap:wrap"><span class="badge badge--tenant">' + ic("waiver") + tx("Versión ", "Version ") + t.waiver.v + tx(" · publicada ", " · published ") + App.fd(t.waiver.date) + "</span></div></div>" +
      '<div class="field"><span class="label">' + tx("Leer y firmar el relevo en", "Read and sign the waiver in") + '</span><div class="langpick" role="radiogroup">' + [["es", "Español"], ["en", "English"]].map(function (l) { return '<button type="button" class="lp' + (vm.wl === l[0] ? " is-on" : "") + '" role="radio" aria-checked="' + (vm.wl === l[0]) + '" data-act="wl" data-v="' + l[0] + '"><span class="flag">' + l[0].toUpperCase() + "</span>" + l[1] + "</button>"; }).join("") + '</div><span class="help">' + tx("Tu firma registra el idioma que elegiste. El abogado del club determina qué idioma rige.", "Your signature records the language you chose. The range's attorney decides which language governs.") + "</span></div>" +
      '<div class="stack-2"><div class="doc" id="doc" lang="' + vm.wl + '" tabindex="0" aria-label="' + (vm.wl === "en" ? "Waiver text" : "Texto del relevo") + '">' + wt.map(function (s) { return "<h3>" + s[0] + "</h3><p>" + s[1] + "</p>"; }).join("") + '</div><div class="xs subtle">' + tx("Texto de ejemplo, no es asesoría legal: el club y su abogado redactan el relevo final.", "Sample text, not legal advice: the range and its attorney write the final waiver.") + '</div><div class="read-bar"><i id="readbar" style="width:' + Math.round(vm.read * 100) + '%"></i></div><div class="row xs" id="readnote" style="gap:5px;font-weight:600;color:' + (vm.read >= 0.98 ? "var(--ok-700)" : "var(--n-500)") + '">' + ic(vm.read >= 0.98 ? "check-circle" : "info", "i-xs") + "<span>" + (vm.read >= 0.98 ? tx("Leído hasta el final", "Read to the end") : tx("Desliza para leer todo el relevo", "Scroll to read the whole waiver")) + "</span></div></div>" +
      '<label class="check' + (vm.err.agree ? " is-invalid" : "") + '"><input type="checkbox" data-act="agree"' + (vm.agree ? " checked" : "") + '><span class="check-box">' + ic("check") + '</span><span style="font-size:14.5px;line-height:21px">' + tx("He leído y acepto el relevo", "I have read and agree to the waiver") + " (" + tx("versión ", "version ") + t.waiver.v + ", " + (vm.wl === "en" ? tx("en inglés", "English") : tx("en español", "Spanish")) + ").</span></label>" +
      (vm.err.agree ? '<span class="help is-error" role="alert" style="margin-top:-8px">' + ic("alert") + "<span>" + vm.err.agree + "</span></span>" : "") +
      '<div class="field"><label class="label" for="sig-name">' + tx("Escribe tu nombre legal completo", "Type your full legal name") + '</label><input class="input' + (vm.err.sigName ? " is-invalid" : nameOk ? " is-valid" : "") + '" id="sig-name" data-s="1" value="' + App.esc(vm.sigName) + '" placeholder="' + App.esc(vm.f.name) + '" autocomplete="off">' + (vm.err.sigName ? '<span class="help is-error" role="alert">' + ic("alert") + "<span>" + vm.err.sigName + "</span></span>" : '<span class="help">' + tx("Debe coincidir con: ", "Must match: ") + "<strong>" + App.esc(vm.f.name) + "</strong></span>") + "</div>" +
      '<div class="field"><span class="label">' + tx("Firma con tu dedo (o el ratón)", "Sign with your finger (or mouse)") + '</span><div class="sigpad' + (vm.err.sig ? " is-invalid" : "") + '"><canvas id="sig" aria-label="' + tx("Área de firma", "Signature area") + '"></canvas>' + (vm.sig ? "" : App.sigTapBtn()) + '<button type="button" class="clear" data-act="sigClear">' + ic("x", "i-xs") + tx("Borrar", "Clear") + '</button><span class="base"></span><span class="x">×</span><span class="lbl">' + tx("Firma", "Signature") + "</span></div>" + (vm.err.sig ? '<span class="help is-error" role="alert">' + ic("alert") + "<span>" + vm.err.sig + "</span></span>" : "") + "</div>" +
      '<div class="callout tenant">' + ic("shield") + "<span>" + tx("Guardamos la versión y el texto exacto que firmaste, el idioma, la fecha y hora, y tu IP o dispositivo. Te enviamos una copia en PDF por email. Los relevos firmados nunca se editan ni se borran.", "We keep the exact version and text you signed, the language, date and time, and your IP address or device. A PDF copy is emailed to you. Signed waivers can never be edited or deleted.") + "</span></div>" +
      '<div class="stack-2"><button type="button" class="btn btn-primary btn-xl btn-block" data-act="sign">' + ic("pen", "i-sm") + tx("Firmar relevo", "Sign waiver") + "</button>" + backBtn("details") + "</div></div>",
      tx("El nombre ya está escrito. Marca <strong>«He leído y acepto»</strong> (por ley empieza sin marcar), toca <strong>«Toca para firmar»</strong> y luego <strong>«Firmar relevo»</strong>. Puedes cambiar a <strong>inglés</strong> o dibujar la firma a mano.", "The name is already typed. Check <strong>“I have read and agree”</strong> (legally it starts unchecked), tap <strong>“Tap to sign”</strong>, then <strong>“Sign waiver”</strong>. You can switch to <strong>English</strong> or draw the signature by hand."), tx("Inscripción · Relevo", "Sign-up · Waiver"));
  }
  function vConsent() {
    var t = App.ten(), f = vm.f;
    return shell('<div class="m-content">' + stepHead(3, '<span class="row" style="gap:4px;color:var(--ok-700);font-weight:600">' + ic("check-circle", "i-xs") + tx("Relevo firmado", "Waiver signed") + "</span>") + '<h1 style="font-size:24px;line-height:31px">' + tx("¿Cómo te avisamos?", "How should we reach you?") + "</h1>" +
      '<div class="m-card m-card-pad stack-4"><label class="check"><input type="checkbox" data-act="emailOk"' + (vm.emailOk ? " checked" : "") + '><span class="check-box">' + ic("check") + '</span><span><strong style="font-size:15px">Email</strong><br><span class="small muted">' + tx("Recordatorios de renovación y recibos a ", "Renewal reminders and receipts to ") + App.esc(f.email) + "</span></span></label><div class=\"divider\"></div>" +
      '<label class="check"><input type="checkbox" id="sms-consent" data-act="sms"' + (vm.sms ? " checked" : "") + '><span class="check-box">' + ic("check") + '</span><span><strong style="font-size:15px">' + tx("Mensajes de texto (opcional)", "Text messages (optional)") + '</strong><br><span class="small" style="color:var(--n-700);line-height:19px;display:block;margin-top:2px">' + tx("Sí, quiero recibir mensajes de texto de " + t.name + " sobre mi membresía (recordatorios de renovación y recibos) al " + App.esc(f.phone) + ". La frecuencia varía. Pueden aplicar cargos por mensajes y datos. Responde STOP para cancelar o HELP para ayuda. Aceptar no es condición de compra.", "Yes, I want to receive text messages from " + t.name + " about my membership (renewal reminders and receipts) at " + App.esc(f.phone) + ". Frequency varies. Msg & data rates may apply. Reply STOP to cancel, HELP for help. Consent is not a condition of purchase.") + "</span></span></label>" +
      '<div class="secure-note" style="margin-left:34px">' + ic("shield") + "<span>" + tx("Guardamos la fecha, la hora y el texto exacto de cada consentimiento. Email y texto se registran por separado.", "We store the date, time and exact wording of each consent. Email and text are tracked separately.") + "</span></div></div>" +
      (!vm.emailOk ? '<div class="callout">' + ic("info") + "<span>" + tx("Sin email ni texto no recibirás recordatorios; los recibos se envían igual porque son transaccionales.", "Without email or text you won't get reminders; receipts are still sent because they're transactional.") + "</span></div>" : "") +
      '<div class="stack-2"><button type="button" class="btn btn-primary btn-xl btn-block" data-act="go" data-v="pay">' + tx("Continuar", "Continue") + ic("arrow-right", "i-sm") + "</button>" + backBtn("waiver") + "</div></div>",
      tx("Por cumplimiento, el consentimiento para textos (SMS) viene <strong>desmarcado</strong>: un toque lo marca. Si lo marca, recibirá el texto de bienvenida. Luego toca <strong>«Continuar»</strong>.", "For compliance, text (SMS) consent starts <strong>unchecked</strong>: one tap checks it. If checked, they get the welcome text. Then tap <strong>“Continue to payment”</strong>."));
  }
  function vPay() {
    var t = App.ten(), tr = t.tiers[vm.tier], exp = tr.term === "month" ? App.addMonths(App.TODAY, 1) : App.addMonths(App.TODAY, 12);
    vm.phone = vm.f.phone;
    return shell('<div class="m-content">' + stepHead(4, App.money(tr.price)) + '<h1 style="font-size:24px;line-height:31px">' + tx("Confirma tu inscripción", "Confirm your sign-up") + "</h1>" +
      '<div class="m-card m-card-pad" style="padding-top:8px;padding-bottom:8px"><div class="kv"><span class="k">' + tx("Plan", "Plan") + '</span><span class="v">' + App.tierName(vm.tier) + '</span></div><div class="kv"><span class="k">' + tx("Hogar", "Household") + '</span><span class="v">' + (1 + vm.hh.length) + ((1 + vm.hh.length) === 1 ? tx(" persona", " person") : tx(" personas", " people")) + '</span></div><div class="kv"><span class="k">' + tx("Primer período", "First period") + '</span><span class="v">' + App.fd(App.TODAY) + " – " + App.fd(exp) + '</span></div><div class="kv"><span class="k" style="font-weight:700;color:var(--n-900)">' + tx("A pagar en la oficina", "To pay at the office") + '</span><span class="v" style="font-size:17px">' + App.money(tr.price) + "</span></div></div>" +
      '<div class="callout tenant">' + ic("desk") + "<span>" + tx("Paga en la oficina del club con efectivo, tarjeta, cheque o ATH Móvil. Luego el administrador registra tu pago y activa tu membresía.", "Pay at the club office by cash, card, check or ATH Móvil. Then the admin records your payment and activates your membership.") + "</span></div>" +
      (!vm.lic ? '<div class="callout info">' + ic("id") + "<span>" + tx("En recepción verificaremos que tienes 21 años o más con una identificación con foto.", "At the front desk we'll check that you're 21 or older with a photo ID.") + "</span></div>" : "") +
      '<div class="stack-2"><button type="button" class="btn btn-tenant btn-xl btn-block" data-act="pay">' + ic("desk", "i-sm") + tx("Registrarme y pagar en la oficina", "Register and pay at the office") + "</button>" + backBtn("consent") + "</div></div>",
      tx("Sin pagos en la app: toca <strong>«Registrarme y pagar en la oficina»</strong>. El miembro queda pendiente hasta que pague en la oficina y el administrador lo active.", "No in-app payments: tap <strong>“Register and pay at the office”</strong>. The member stays pending until they pay at the office and the admin activates them."));
  }
  function vDone() {
    var t = App.ten(), m = App.member(vm.newId);
    if (!m) { vm.view = "plan"; return vPlan(); }
    if (m.payPending) return vPending(m);
    return shell('<div class="m-content" style="padding-top:28px"><div style="text-align:center" class="stack-3"><div class="ok-badge">' + ic("check") + '</div><h1 style="font-size:26px;line-height:32px;margin-top:18px">' + tx("¡Bienvenido/a, ", "Welcome, ") + App.first(m.name) + '!</h1><p class="muted" style="font-size:15px;line-height:22px">' + tx("Tu membresía está activa hasta el ", "Your membership is active through ") + '<strong style="color:var(--n-900)">' + App.fd(m.expires) + "</strong>.</p></div>" +
      '<a class="mini-card plain" href="card.html?m=' + m.id + '"><div class="qr"><img src="' + App.qr(m.id) + '" alt="' + tx("Código QR", "QR code") + '"></div><div class="grow" style="position:relative"><div class="row" style="gap:6px;margin-bottom:6px"><svg style="width:20px;height:20px">' + App.mark(true) + '</svg><span style="font-size:12px;font-weight:600;opacity:.9">' + t.name + '</span></div><div style="font-weight:700;font-size:16px;line-height:20px">' + m.name + '</div><div style="font-size:12.5px;opacity:.88">' + App.tierName(m.tier) + " · " + m.id + '</div><div style="margin-top:8px"><span class="badge" style="background:rgba(255,255,255,.95);color:var(--ok-700)">' + ic("check-circle") + tx("Activa", "Active") + "</span></div></div></a>" +
      '<div class="m-card m-card-pad stack-2"><div class="row" style="gap:8px">' + ic("check-circle", "i-sm") + "<span>" + tx("Relevo v" + t.waiver.v + " firmado en " + (m.waiver.lang === "en" ? "inglés" : "español") + " · PDF enviado a ", "Waiver v" + t.waiver.v + " signed in " + (m.waiver.lang === "en" ? "English" : "Spanish") + " · PDF sent to ") + m.email + '</span></div><div class="row" style="gap:8px">' + ic(m.sms ? "sms" : "mail", "i-sm") + "<span>" + (m.sms ? tx("Textos aceptados · te enviamos la bienvenida al ", "Texts accepted · welcome text sent to ") + m.phone : tx("Sin textos · avisos solo por email", "No texts · email notices only")) + "</span></div>" + (vm.hh.length ? '<div class="row" style="gap:8px">' + ic("users", "i-sm") + "<span>" + vm.hh.length + tx(" adulto(s) del hogar recibirán su invitación para firmar su relevo", " household adult(s) will get an invite to sign their own waiver") + "</span></div>" : "") + "</div>" +
      '<div class="callout warn">' + ic("orientation") + "<span>" + tx("Siguiente paso: completa la orientación de seguridad en recepción en tu primera visita.", "Next step: complete the safety orientation at the front desk on your first visit.") + "</span></div>" +
      '<div class="stack-2"><a class="btn btn-primary btn-lg btn-block" href="card.html?m=' + m.id + '">' + ic("id", "i-sm") + tx("Ver mi tarjeta digital", "Open my digital card") + '</a><a class="btn btn-secondary btn-lg btn-block" href="portal.html?m=' + m.id + '">' + ic("home", "i-sm") + tx("Ir a mi portal", "Go to my portal") + "</a></div></div>",
      tx("Inscripción completa: el miembro ya aparece en Miembros y en recepción (con orientación pendiente). Siguiente: el dueño ejecuta los recordatorios de hoy.", "Sign-up complete: the member now shows in Members and at the desk (orientation pending). Next: the owner runs today's reminders."), tx("Inscripción completa", "Sign-up complete"));
  }

  function vPending(m) {
    var t = App.ten(), pp = m.payPending;
    return shell('<div class="m-content" style="padding-top:28px" data-pending><div style="text-align:center" class="stack-3"><div class="ok-badge" style="background:var(--warn-600);box-shadow:0 0 0 10px var(--warn-50)">' + ic("hourglass") + '</div><h1 style="font-size:24px;line-height:30px;margin-top:18px">' + tx("Te registramos como miembro pendiente; paga en la oficina para activar", "You're registered as a pending member; pay at the office to activate") + '</h1><p class="muted" style="font-size:15px;line-height:22px">' + tx("Gracias, " + App.first(m.name) + ". Tu membresía queda <strong>Pendiente</strong> hasta que pagues en la oficina del club y el administrador la active.", "Thanks, " + App.first(m.name) + ". Your membership stays <strong>Pending</strong> until you pay at the club office and the admin activates it.") + "</p></div>" +
      '<div class="m-card m-card-pad stack-2"><div class="kv"><span class="k">' + tx("Miembro", "Member") + '</span><span class="v">' + m.name + '<br><span class="xs subtle">' + m.id + '</span></span></div><div class="kv"><span class="k">' + tx("Plan", "Plan") + '</span><span class="v">' + App.tierName(pp.tier) + '</span></div><div class="kv"><span class="k">' + tx("Monto", "Amount") + '</span><span class="v">' + App.money(pp.amount) + '</span></div><div class="kv"><span class="k">' + tx("Paga a más tardar", "Pay by") + '</span><span class="v" style="color:var(--warn-700)">' + App.fd(pp.due) + '</span></div><div class="kv"><span class="k">' + tx("Estado", "Status") + '</span><span class="v">' + App.badge("pending") + "</span></div></div>" +
      '<div class="callout tenant">' + ic("desk") + "<span>" + tx("Paga <strong>" + App.money(pp.amount) + "</strong> en la oficina de <strong>" + t.name + "</strong> a más tardar el <strong>" + App.fd(pp.due, "es") + "</strong> con efectivo, tarjeta, cheque o ATH Móvil. Cuando el administrador registre tu pago (tipo, número de referencia y fecha), tu membresía queda activa y tu tarjeta digital lista. Ese día también haces la orientación de seguridad.", "Pay <strong>" + App.money(pp.amount) + "</strong> at the <strong>" + t.name + "</strong> office by <strong>" + App.fd(pp.due, "en") + "</strong> by cash, card, check or ATH Móvil. Once the admin records your payment (type, reference number and date), your membership is active and your digital card is ready. Do the safety orientation that day too.") + "</span></div>" +
      (m.spectator ? '<div class="callout info">' + ic("id") + "<span>" + tx("En recepción verificaremos que tienes 21 años o más con una identificación con foto.", "At the front desk we'll check that you're 21 or older with a photo ID.") + "</span></div>" : "") +
      '<div class="m-card m-card-pad stack-2"><div class="row" style="gap:8px">' + ic("check-circle", "i-sm") + "<span>" + tx("Relevo v" + t.waiver.v + " firmado · PDF enviado a ", "Waiver v" + t.waiver.v + " signed · PDF sent to ") + m.email + '</span></div><div class="row" style="gap:8px">' + ic("mail", "i-sm") + "<span>" + tx("Te enviamos estas instrucciones por email.", "We emailed you these instructions.") + "</span></div></div>" +
      '<div class="stack-2"><a class="btn btn-primary btn-lg btn-block" href="portal.html?m=' + m.id + '">' + ic("home", "i-sm") + tx("Ir a mi portal", "Go to my portal") + "</a></div></div>",
      tx("La inscripción queda <strong>Pendiente</strong>. Cuando paga en la oficina, el administrador registra el tipo de pago, el número de referencia y la fecha, y activa al miembro.", "The sign-up stays <strong>Pending</strong>. When they pay at the office, the admin records payment type, reference number and date, and activates the member."), tx("Miembro pendiente", "Pending member"));
  }

  function render() {
    return ({ plan: vPlan, details: vDetails, waiver: vWaiver, consent: vConsent, pay: vPay, done: vDone })[vm.view]();
  }
  function goView(v) { vm.view = v; vm.err = {}; App.rerender(); var sc = document.getElementById("screen"); if (sc) sc.scrollTop = 0; window.scrollTo(0, 0); }
  function focusFirstError() { var el = document.querySelector(".is-invalid"); if (el) { el.scrollIntoView({ block: "center" }); if (el.focus) el.focus(); } }

  function createMember() {
    var t = App.ten(), ts = App.ts(), tr = t.tiers[vm.tier], f = vm.f;
    var id = App.nextId() || (t.prefix + "-1099" + ts.added.length);
    var exp = tr.term === "month" ? App.addMonths(App.TODAY, 1) : App.addMonths(App.TODAY, 12), atDesk = true; /* no in-app payments */
    var m = { id: id, name: f.name.trim().replace(/\s+/g, " "), av: "av-4", p: 6, email: f.email.trim(), phone: f.phone.trim(), tier: vm.tier, expires: atDesk ? null : exp, status: atDesk ? "pending" : null, used: 0,
      autorenew: vm.autorenew && vm.method === "card" ? "card" : null, waiver: { v: t.waiver.v, date: App.TODAY, lang: vm.wl }, orient: null, last: null,
      pref: f.pref, sms: !!vm.sms, emailOk: vm.emailOk, since: 2026, spectator: !vm.lic, pay: atDesk ? [] : [[App.TODAY, tr.price, vm.method]], town: f.town, zip: f.zip, emer: f.emer.trim(), lic: vm.lic ? { no: f.licNo.trim().toUpperCase(), exp: parseDob(f.licExp) } : null, newSignup: true };
    ts.added.push(m); App.save();
    vm.hh.forEach(function (h, i) { var hid = App.nextId() || (id + "-" + (i + 2)); ts.added.push({ id: hid, name: h.name, av: "av-" + ((i % 6) + 2), p: (i + 2) % 7, hh: id, email: "", phone: "", waiver: null, orient: null, last: null, newSignup: true }); App.save(); });
    App.event({ type: "signup", id: id, name: m.name, amount: tr.price, tier: vm.tier, method: vm.method, pay: App.payInfo(vm, tr.price) });
    App.event({ type: "waiver", id: id, name: m.name, lang: vm.wl, where: "online" });
    if (atDesk) App.reservePay(id, { kind: "signup", tier: vm.tier, src: "signup", due: App.addDays(App.TODAY, t.grace) });
    else App.queueMsg({ kind: "welcome", mid: id, ch: (vm.sms ? ["sms"] : []).concat(["email"]) });
    ts.current = id; App.save();
    vm.newId = id; goView("done");
  }

  App.page({
    render: render,
    title: function () { return tx("Inscríbete", "Sign up"); },
    after: function () {
      var root = document.getElementById("root");
      root.querySelectorAll("[data-f]").forEach(function (el) {
        var ev = el.tagName === "SELECT" ? "change" : "input";
        el.addEventListener(ev, function () {
          vm.f[el.dataset.f] = el.value;
          if (vm.err[el.dataset.f]) { var chk = validateDetails(); if (!chk[el.dataset.f]) { vm.err[el.dataset.f] = null; el.classList.remove("is-invalid"); var eh = el.parentNode.querySelector(".help.is-error"); if (eh) eh.remove(); } }
        });
      });
      root.querySelectorAll("[data-a]").forEach(function (el) {
        el.addEventListener("input", function () {
          vm.add[el.dataset.a] = el.value;
        });
      });
      var sn = document.getElementById("sig-name"); if (sn) sn.addEventListener("input", function () { vm.sigName = sn.value; vm.sigTouched = true; var ok = App.norm(sn.value) === App.norm(vm.f.name); sn.classList.toggle("is-valid", ok); if (ok && vm.err.sigName) { vm.err.sigName = null; sn.classList.remove("is-invalid"); var e = sn.parentNode.querySelector(".help.is-error"); if (e) e.remove(); } });
      var doc = document.getElementById("doc");
      if (doc) {
        var upd = function () { var r = doc.scrollHeight <= doc.clientHeight + 2 ? 1 : (doc.scrollTop + doc.clientHeight) / doc.scrollHeight; vm.read = Math.max(vm.read, r); var b = document.getElementById("readbar"); if (b) b.style.width = Math.round(vm.read * 100) + "%"; var n = document.getElementById("readnote"); if (n && vm.read >= 0.98) { n.style.color = "var(--ok-700)"; n.innerHTML = ic("check-circle", "i-xs") + "<span>" + tx("Leído hasta el final", "Read to the end") + "</span>"; } };
        doc.addEventListener("scroll", upd); upd();
      }
      var c = document.getElementById("sig"); if (c) App.initSig(c, vm.sig, function (s) { vm.sig = s; if (s.len > 40 && vm.err.sig) { vm.err.sig = null; c.parentNode.classList.remove("is-invalid"); var e = c.parentNode.parentNode.querySelector(".help.is-error"); if (e) e.remove(); } });
    },
    handlers: Object.assign({}, {
      tier: function (el) { vm.tier = el.dataset.v; var tr = App.ten().tiers[vm.tier]; if (vm.hh.length > tr.hh - 1) vm.hh = vm.hh.slice(0, Math.max(0, tr.hh - 1)); App.keepScroll = true; App.rerender(); },
      go: function (el) { var v = el.dataset.v; if (v === "pay" && !vm.emailOk && !vm.sms) { /* allowed: receipts are transactional */ } goView(v); },
      fill: function () { var pref = vm.f.pref; vm.f = sample(); vm.f.pref = pref; vm.add = { name: DS.adult.name }; vm.err = {}; App.keepScroll = true; App.rerender(); },
      lic: function (el) { vm.lic = el.dataset.v === "yes"; vm.err = {}; App.keepScroll = true; App.rerender(); },
      pref: function (el) { vm.f.pref = el.dataset.v; App.keepScroll = true; App.rerender(); },
      hhAdd: function () {
        var tr = App.ten().tiers[vm.tier], nm = vm.add.name.trim(); vm.err.aname = null;
        if (nm.split(/\s+/).length < 2) { vm.err.aname = tx("Escribe nombre y apellido.", "Enter first and last name."); App.keepScroll = true; App.rerender(); return; }
        if (vm.hh.length >= tr.hh - 1) return;
        vm.hh.push({ name: nm }); vm.add = { name: "" }; App.keepScroll = true; App.rerender();
      },
      hhDel: function (el) { vm.hh.splice(+el.dataset.v, 1); App.keepScroll = true; App.rerender(); },
      toWaiver: function () { vm.err = validateDetails(); if (Object.keys(vm.err).length) { App.keepScroll = true; App.rerender(); focusFirstError(); return; } if (!vm.sigTouched) vm.sigName = vm.f.name; goView("waiver"); },
      wl: function (el) { vm.wl = el.dataset.v; vm.read = 0; App.keepScroll = true; App.rerender(); },
      agree: function (el) { vm.agree = el.checked; if (vm.agree && vm.err.agree) { vm.err.agree = null; App.keepScroll = true; App.rerender(); } },
      sigClear: function () { vm.sig = null; App.keepScroll = true; App.rerender(); },
      sigTap: function (el) { var c = document.getElementById("sig"); if (!c) return; el.remove(); App.autoSign(c, vm.f.name, function (sg) { vm.sig = sg; if (vm.err.sig) { vm.err.sig = null; c.parentNode.classList.remove("is-invalid"); var e = c.parentNode.parentNode.querySelector(".help.is-error"); if (e) e.remove(); } }); },
      sign: function () {
        var e = {};
        if (!vm.agree) e.agree = tx("Marca que leíste y aceptas el relevo.", "Check that you read and agree to the waiver.");
        if (App.norm(vm.sigName) !== App.norm(vm.f.name)) e.sigName = vm.sigName ? tx("El nombre no coincide con el de tus datos: " + vm.f.name, "Name doesn't match your details: " + vm.f.name) : tx("Escribe tu nombre legal completo.", "Type your full legal name.");
        if (!vm.sig || vm.sig.len < 40) e.sig = tx("Firma en el recuadro con el dedo o el ratón.", "Sign in the box with your finger or mouse.");
        vm.err = e; if (Object.keys(e).length) { App.keepScroll = true; App.rerender(); focusFirstError(); return; }
        App.toast(tx("Relevo firmado", "Waiver signed")); goView("consent");
      },
      emailOk: function (el) { vm.emailOk = el.checked; App.keepScroll = true; App.rerender(); },
      sms: function (el) { vm.sms = el.checked; },
      pay: function () {
        createMember(); /* registers a pending member; the admin activates after payment at the office */
      }
    })
  });
})();
