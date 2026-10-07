/* Range Club clickable demo — fictional tenant data. Nothing here is real:
   names are made up, phones use 555, emails use example.com.
   Each tenant (range) has its own members, tiers, staff and baseline metrics;
   pages only ever read the current tenant's block (tenant isolation). */
window.RC_TODAY = "2026-10-07"; // fixed demo date (status rules are computed from it)

window.RC_DATA = {
  guayama: {
    key: "guayama", name: "Guayama Gun Club", city: "Guayama, PR", zip: "00784", host: "guayama.rangeclub.app",
    mark: "ggc-mark", phone: "(787) 555-0100", email: "socios@guayama.example.com", prefix: "GGC",
    owner: { first: "Marisol", name: "Marisol Ortiz Vega", ini: "MO", phone: "(787) 555-0101" },
    staff: { name: "Luis Feliciano", ini: "LF", short: "Luis F." },
    waiver: { v: 4, date: "2026-09-01" }, grace: 7, checkinInGrace: true, orientationRequired: true, minAge: 21,
    guestFee: 15, maxGuests: 2,
    linkMember: "GGC-10482", portalMember: "GGC-10482",
    deskDemo: ["GGC-10391", "GGC-10288", "GGC-10512"], // cleared · lapsed · missing waiver (demo script order)
    kioskDemo: ["GGC-10391", "GGC-10734", "GGC-10512", "GGC-10288"],
    newIds: ["GGC-10901", "GGC-10902", "GGC-10903", "GGC-10904", "GGC-10905", "GGC-10906"],
    receiptBase: 4817,
    tiers: {
      ind: { es: "Individual anual", en: "Individual annual", price: 240, term: "year", hh: 1, passes: 4 },
      fam: { es: "Familiar anual", en: "Family annual", price: 360, term: "year", hh: 4, passes: 6 },
      famplus: { es: "Familiar Plus anual", en: "Family Plus annual", price: 450, term: "year", hh: 6, passes: 12 },
      mon: { es: "Individual mensual", en: "Individual monthly", price: 25, term: "month", hh: 1, passes: 0 },
      mil: { es: "Militar y veteranos anual", en: "Military & veterans annual", price: 192, term: "year", hh: 1, passes: 4, elig: ["Requisito: DD-214 o ID militar en recepción", "Eligibility: DD-214 or military ID at the front desk"] },
      law: { es: "Agentes del orden anual", en: "Law enforcement annual", price: 192, term: "year", hh: 1, passes: 4, elig: ["Requisito: identificación de la agencia en recepción", "Eligibility: agency ID checked at the front desk"] }
    },
    signupTiers: ["ind", "fam", "famplus", "mon", "mil", "law"],
    base: {
      active: 1284, dueN: 118, dueV: 27460, dueAuto: 46, rate: 86.7, rateDelta: 15.7, ratePrev: 71.0, rateRenewed: 129, rateDue: 149,
      risk: 9840, graceN: 38, graceV: 8640, failedN: 5, failedV: 1200, lapsedN: 14, lapsedV: 3360,
      src: { link: 98, portal: 8, desk: 16, auto: 46 },
      steps: { d30: [19, 0], d14: [15, 0], d7: [18, 7], d1: [13, 5], d0: [8, 4], g3: [6, 3] },
      days: [33, 41, 68, 59, 0, 27, 30, 35, 44, 72, 63, 0, 29, 37], hours: [3.1, 4.6, 5.4, 4.0, 3.5, 3.9, 4.8, 6.2, 7.9, 7.4, 4.4],
      months: [72.4, 74.1, 78.9, 81.6, 84.2, 86.7],
      counts: { all: 1402, pending: 9, active: 1246, grace: 38, lapsed: 71, suspended: 3, cancelled: 35 }, households: 1061
    },
    members: [
      { id: "GGC-10482", name: "Javier Rosado Colón", av: "av-2", p: 5, email: "javier.rosado@example.com", phone: "(787) 555-0142", tier: "fam", expires: "2026-10-08", used: 2, waiver: { v: 4, date: "2026-09-03", lang: "es" }, orient: { done: "2026-03-15", exp: "2027-03-15" }, last: "2026-10-03", pref: "es", sms: true, dob: "1986-02-14", since: 2019, pay: [["2025-10-08", 360, "ath"]] },
      { id: "GGC-10483", name: "Lizbeth Colón Reyes", av: "av-3", p: 1, hh: "GGC-10482", email: "lizbeth.colon@example.com", phone: "(787) 555-0149", waiver: { v: 3, date: "2025-10-12", lang: "es" }, orient: { done: "2026-03-15", exp: "2027-03-15" }, last: "2026-09-20", gender: "f", dob: "1988-06-02" },
      { id: "GGC-10484", name: "Gabriela Rosado Colón", av: "av-7", p: 3, hh: "GGC-10482", email: "gabriela.rosado@example.com", phone: "(787) 555-0150", waiver: { v: 4, date: "2026-09-03", lang: "es" }, orient: { done: "2026-03-15", exp: "2027-03-15" }, last: "2026-10-03", gender: "f", dob: "2002-03-22" },
      { id: "GGC-10391", name: "Gabriel Torres Medina", av: "av-1", p: 0, email: "gabriel.tm@example.com", phone: "(787) 555-0131", tier: "ind", expires: "2027-03-14", used: 1, autorenew: "paypal", waiver: { v: 4, date: "2026-09-05", lang: "es" }, orient: { done: "2026-02-10", exp: "2027-02-10" }, last: "2026-10-02", dob: "1979-11-30", since: 2021 },
      { id: "GGC-10734", name: "Keila Rodríguez Vega", av: "av-4", p: 3, email: "keila.rv@example.com", phone: "(787) 555-0174", tier: "ind", expires: "2026-10-02", used: 3, waiver: { v: 4, date: "2026-09-12", lang: "es" }, orient: { done: "2026-01-20", exp: "2027-01-20" }, last: "2026-09-26", gender: "f", dob: "1991-04-18", since: 2024 },
      { id: "GGC-10288", name: "Raúl Pagán Soto", av: "av-1", p: 2, email: "raul.pagan@example.com", phone: "(939) 555-0128", tier: "fam", expires: "2026-09-28", used: 6, waiver: { v: 4, date: "2026-09-02", lang: "es" }, orient: { done: "2026-05-04", exp: "2027-05-04" }, last: "2026-09-14", dob: "1975-08-09", since: 2018, pay: [["2025-09-28", 360, "card"]] },
      { id: "GGC-10289", name: "Marta Soto Rivera", av: "av-6", p: 6, hh: "GGC-10288", email: "marta.soto@example.com", phone: "(939) 555-0129", waiver: { v: 4, date: "2026-09-02", lang: "es" }, orient: { done: "2026-05-04", exp: "2027-05-04" }, last: "2026-09-14", gender: "f", dob: "1977-01-15" },
      { id: "GGC-10290", name: "Andrés Pagán Soto", av: "av-5", p: 2, hh: "GGC-10288", email: "andres.ps@example.com", phone: "(939) 555-0130", waiver: { v: 4, date: "2026-09-02", lang: "es" }, orient: { done: "2026-05-04", exp: "2027-05-04" }, last: "2026-08-30", dob: "2001-12-03" },
      { id: "GGC-10512", name: "Sofía Marrero Díaz", av: "av-3", p: 6, email: "sofia.marrero@example.com", phone: "(787) 555-0185", tier: "ind", expires: "2027-06-02", used: 0, autorenew: "paypal", waiver: { v: 3, date: "2026-01-12", lang: "es" }, orient: { done: "2026-06-02", exp: "2027-06-02" }, last: "2026-08-19", gender: "f", dob: "1993-09-27", since: 2023 },
      { id: "GGC-10655", name: "Ángel Morales Ortiz", av: "av-5", p: 4, email: "angel.morales@example.com", phone: "(787) 555-0166", tier: "mil", expires: "2026-10-14", used: 1, waiver: { v: 4, date: "2026-09-09", lang: "en" }, orient: { done: "2025-10-02", exp: "2026-10-02" }, last: "2026-09-28", pref: "en", sms: true, dob: "1968-05-21", since: 2016 },
      { id: "GGC-10127", name: "Wilfredo Báez Cruz", av: "av-7", p: 4, email: "w.baez@example.com", phone: "(787) 555-0112", tier: "ind", expires: "2027-01-09", used: 0, autorenew: "paypal", status: "suspended", incident: { date: "2026-10-03", es: "manejo inseguro en el carril 4", en: "unsafe handling on lane 4", by: "Carlos Méndez" }, waiver: { v: 4, date: "2026-09-01", lang: "es" }, orient: { done: "2026-01-09", exp: "2027-01-09" }, last: "2026-10-03", dob: "1982-07-07", since: 2020 },
      { id: "GGC-10899", name: "Yadiel Ortiz Negrón", av: "av-5", p: 0, email: "yadiel.on@example.com", phone: "(787) 555-0198", tier: "ind", status: "pending", waiver: { v: 4, date: "2026-10-05", lang: "es" }, orient: null, last: null, dob: "1999-02-11", since: 2026 },
      { id: "GGC-10233", name: "Carmen Vázquez Rivera", av: "av-3", p: 1, email: "carmen.vr@example.com", phone: "(787) 555-0123", tier: "fam", expires: "2026-10-14", used: 2, autorenew: "paypal", waiver: { v: 4, date: "2026-09-08", lang: "es" }, orient: { done: "2026-03-01", exp: "2027-03-01" }, last: "2026-10-01", gender: "f", dob: "1980-10-10", since: 2017 },
      { id: "GGC-10318", name: "Andrés Figueroa Lugo", av: "av-6", p: 2, email: "andres.fl@example.com", phone: "(787) 555-0118", tier: "mon", expires: "2026-08-31", status: "cancelled", waiver: { v: 3, date: "2025-11-02", lang: "es" }, orient: { done: "2025-11-02", exp: "2026-11-02" }, last: "2026-08-22", dob: "1996-03-03", since: 2025 },
      { id: "GGC-10561", name: "Héctor Burgos Pagán", av: "av-7", p: 4, email: "hector.bp@example.com", phone: "(787) 555-0194", tier: "law", expires: "2026-09-27", used: 4, waiver: { v: 4, date: "2026-09-04", lang: "es" }, orient: { done: "2026-02-27", exp: "2027-02-27" }, last: "2026-09-02", dob: "1984-12-12", since: 2022 },
      { id: "GGC-10402", name: "Natalia Cruz Ortiz", av: "av-2", p: 1, email: "natalia.co@example.com", phone: "(787) 555-0163", tier: "fam", expires: "2026-09-25", used: 5, waiver: { v: 4, date: "2026-09-03", lang: "es" }, orient: { done: "2026-01-25", exp: "2027-01-25" }, last: "2026-09-10", gender: "f", dob: "1985-05-05", since: 2020 },
      { id: "GGC-10377", name: "Edwin Ocasio Ruiz", av: "av-1", p: 0, email: "edwin.or@example.com", phone: "(787) 555-0177", tier: "ind", expires: "2026-09-26", used: 4, waiver: { v: 4, date: "2026-09-06", lang: "es" }, orient: { done: "2026-03-26", exp: "2027-03-26" }, last: "2026-09-21", dob: "1990-01-30", since: 2023 },
      { id: "GGC-10455", name: "Yamilette Santiago Rivera", av: "av-4", p: 6, email: "yamilette.sr@example.com", phone: "(787) 555-0119", tier: "ind", expires: "2026-09-24", used: 2, waiver: { v: 4, date: "2026-09-02", lang: "es" }, orient: { done: "2026-04-24", exp: "2027-04-24" }, last: "2026-09-12", gender: "f", dob: "1994-07-19", since: 2024 },
      { id: "GGC-10389", name: "Rosa Meléndez Cruz", av: "av-6", p: 3, email: "rosa.mc@example.com", phone: "(939) 555-0187", tier: "ind", expires: "2026-09-29", used: 1, waiver: { v: 4, date: "2026-09-11", lang: "es" }, orient: { done: "2026-03-29", exp: "2027-03-29" }, last: "2026-09-18", gender: "f", dob: "1987-02-08", since: 2022 },
      { id: "GGC-10366", name: "Pedro Santiago Vélez", av: "av-5", p: 2, email: "pedro.sv@example.com", phone: "(787) 555-0136", tier: "ind", expires: "2026-10-04", used: 2, waiver: { v: 4, date: "2026-09-07", lang: "es" }, orient: { done: "2026-04-04", exp: "2027-04-04" }, last: "2026-09-27", dob: "1972-06-14", since: 2019 },
      { id: "GGC-10444", name: "Maritza Colón Alicea", av: "av-4", p: 1, email: "maritza.ca@example.com", phone: "(787) 555-0144", tier: "ind", expires: "2026-10-07", used: 0, waiver: { v: 4, date: "2026-09-15", lang: "es" }, orient: { done: "2026-04-07", exp: "2027-04-07" }, last: "2026-10-04", gender: "f", dob: "1983-03-17", since: 2021 },
      { id: "GGC-10498", name: "Nilda Ramos Ortiz", av: "av-3", p: 6, email: "nilda.ro@example.com", phone: "(787) 555-0158", tier: "fam", expires: "2026-10-21", used: 3, waiver: { v: 4, date: "2026-09-10", lang: "es" }, orient: { done: "2026-01-21", exp: "2027-01-21" }, last: "2026-09-29", gender: "f", dob: "1978-09-09", since: 2018 },
      { id: "GGC-10521", name: "Luis Ángel Rivera Soto", av: "av-1", p: 0, email: "luisangel.rs@example.com", phone: "(787) 555-0161", tier: "ind", expires: "2026-11-06", used: 1, waiver: { v: 4, date: "2026-09-13", lang: "es" }, orient: { done: "2026-05-06", exp: "2027-05-06" }, last: "2026-09-30", dob: "1995-11-06", since: 2025 }
    ]
  },
  salinas: {
    key: "salinas", name: "Club de Tiro Salinas", city: "Salinas, PR", zip: "00751", host: "salinas.rangeclub.app",
    mark: "cts-mark", phone: "(787) 555-0200", email: "socios@salinas.example.com", prefix: "CTS",
    owner: { first: "Ramón", name: "Ramón Alicea Vega", ini: "RA", phone: "(787) 555-0201" },
    staff: { name: "Noemí Pagán Ruiz", ini: "NP", short: "Noemí P." },
    waiver: { v: 3, date: "2026-08-15" }, grace: 7, checkinInGrace: true, orientationRequired: true, minAge: 21,
    guestFee: 12, maxGuests: 2,
    linkMember: "CTS-20317", portalMember: "CTS-20317",
    deskDemo: ["CTS-20144", "CTS-20093", "CTS-20371"],
    kioskDemo: ["CTS-20144", "CTS-20488", "CTS-20371", "CTS-20093"],
    newIds: ["CTS-20901", "CTS-20902", "CTS-20903", "CTS-20904", "CTS-20905", "CTS-20906"],
    receiptBase: 1932,
    tiers: {
      ind: { es: "Socio anual", en: "Member annual", price: 210, term: "year", hh: 1, passes: 4 },
      fam: { es: "Socio familiar anual", en: "Family member annual", price: 330, term: "year", hh: 4, passes: 6 },
      famplus: { es: "Socio familiar Plus anual", en: "Family member Plus annual", price: 420, term: "year", hh: 6, passes: 12 },
      mon: { es: "Socio mensual", en: "Member monthly", price: 22, term: "month", hh: 1, passes: 0 },
      mil: { es: "Militar y veteranos", en: "Military & veterans", price: 180, term: "year", hh: 1, passes: 4, elig: ["Requisito: DD-214 o ID militar en recepción", "Eligibility: DD-214 or military ID at the front desk"] },
      law: { es: "Agentes del orden", en: "Law enforcement", price: 180, term: "year", hh: 1, passes: 4, elig: ["Requisito: identificación de la agencia en recepción", "Eligibility: agency ID checked at the front desk"] }
    },
    signupTiers: ["ind", "fam", "famplus", "mon", "mil", "law"],
    base: {
      active: 612, dueN: 54, dueV: 11880, dueAuto: 19, rate: 81.2, rateDelta: 9.4, ratePrev: 71.8, rateRenewed: 56, rateDue: 69,
      risk: 5610, graceN: 23, graceV: 4980, failedN: 3, failedV: 630, lapsedN: 9, lapsedV: 1950,
      src: { link: 41, portal: 5, desk: 12, auto: 19 },
      steps: { d30: [8, 0], d14: [6, 0], d7: [8, 3], d1: [6, 2], d0: [3, 2], g3: [2, 1] },
      days: [14, 19, 36, 31, 0, 12, 15, 16, 22, 39, 30, 0, 13, 17], hours: [1.6, 2.4, 2.9, 2.1, 1.7, 1.9, 2.4, 3.1, 4.2, 3.8, 2.0],
      months: [71.5, 72.5, 75.4, 77.5, 79.4, 81.2],
      counts: { all: 672, pending: 4, active: 589, grace: 23, lapsed: 38, suspended: 1, cancelled: 17 }, households: 503
    },
    members: [
      { id: "CTS-20317", name: "Mariela Santos Ortiz", av: "av-2", p: 3, email: "mariela.santos@example.com", phone: "(939) 555-0187", tier: "fam", expires: "2026-10-14", used: 2, waiver: { v: 3, date: "2026-08-20", lang: "es" }, orient: { done: "2026-04-11", exp: "2027-04-11" }, last: "2026-09-28", pref: "es", sms: true, gender: "f", dob: "1984-09-12", since: 2020, pay: [["2025-10-14", 330, "card"]] },
      { id: "CTS-20318", name: "Gustavo Ortiz Rivera", av: "av-3", p: 2, hh: "CTS-20317", email: "gustavo.or@example.com", phone: "(939) 555-0188", waiver: { v: 2, date: "2025-10-20", lang: "es" }, orient: { done: "2026-04-11", exp: "2027-04-11" }, last: "2026-09-21", dob: "1982-02-27" },
      { id: "CTS-20319", name: "Sebastián Santos Ortiz", av: "av-7", p: 0, hh: "CTS-20317", email: "sebastian.so@example.com", phone: "(939) 555-0189", waiver: { v: 3, date: "2026-08-20", lang: "es" }, orient: { done: "2026-04-11", exp: "2027-04-11" }, last: "2026-09-28", dob: "2003-01-05" },
      { id: "CTS-20144", name: "Iván Colón Rosario", av: "av-1", p: 2, email: "ivan.cr@example.com", phone: "(787) 555-0214", tier: "ind", expires: "2027-02-22", used: 2, autorenew: "paypal", waiver: { v: 3, date: "2026-08-18", lang: "es" }, orient: { done: "2026-02-22", exp: "2027-02-22" }, last: "2026-10-01", dob: "1981-06-30", since: 2021 },
      { id: "CTS-20488", name: "Marilyn Ortiz Báez", av: "av-6", p: 6, email: "marilyn.ob@example.com", phone: "(787) 555-0248", tier: "ind", expires: "2026-10-03", used: 1, waiver: { v: 3, date: "2026-08-22", lang: "es" }, orient: { done: "2026-03-03", exp: "2027-03-03" }, last: "2026-09-24", gender: "f", dob: "1989-12-01", since: 2023 },
      { id: "CTS-20093", name: "Luis Vélez Torres", av: "av-1", p: 0, email: "luis.velez@example.com", phone: "(787) 555-0231", tier: "fam", expires: "2026-09-26", used: 6, waiver: { v: 3, date: "2026-08-16", lang: "es" }, orient: { done: "2026-05-01", exp: "2027-05-01" }, last: "2026-09-12", dob: "1974-03-25", since: 2017, pay: [["2025-09-26", 330, "ath"]] },
      { id: "CTS-20094", name: "Ana Torres Lugo", av: "av-4", p: 1, hh: "CTS-20093", email: "ana.tl@example.com", phone: "(787) 555-0232", waiver: { v: 3, date: "2026-08-16", lang: "es" }, orient: { done: "2026-05-01", exp: "2027-05-01" }, last: "2026-09-12", gender: "f", dob: "1976-10-02" },
      { id: "CTS-20095", name: "Joel Vélez Torres", av: "av-7", p: 2, hh: "CTS-20093", email: "joel.vt@example.com", phone: "(787) 555-0233", waiver: { v: 3, date: "2026-08-16", lang: "es" }, orient: { done: "2026-05-01", exp: "2027-05-01" }, last: "2026-09-05", dob: "2000-07-14" },
      { id: "CTS-20371", name: "Glorimar Santiago Pérez", av: "av-3", p: 3, email: "glorimar.sp@example.com", phone: "(939) 555-0271", tier: "ind", expires: "2027-04-30", used: 0, autorenew: "paypal", waiver: { v: 2, date: "2026-03-04", lang: "es" }, orient: { done: "2026-04-30", exp: "2027-04-30" }, last: "2026-09-06", gender: "f", dob: "1992-08-08", since: 2022 },
      { id: "CTS-20219", name: "Edgardo Rivera Cintrón", av: "av-5", p: 5, email: "edgardo.rc@example.com", phone: "(787) 555-0219", tier: "mil", expires: "2026-11-03", used: 1, waiver: { v: 3, date: "2026-08-25", lang: "es" }, orient: { done: "2025-09-25", exp: "2026-09-25" }, last: "2026-09-27", dob: "1966-04-04", since: 2015 },
      { id: "CTS-20057", name: "Rafael Meléndez Ortiz", av: "av-7", p: 4, email: "rafael.mo@example.com", phone: "(787) 555-0257", tier: "ind", expires: "2026-12-17", used: 0, autorenew: "paypal", status: "suspended", incident: { date: "2026-10-01", es: "disparo fuera de la línea de fuego en la estación 2", en: "fired outside the firing line at station 2", by: "Wanda Colón" }, waiver: { v: 3, date: "2026-08-17", lang: "es" }, orient: { done: "2025-12-17", exp: "2026-12-17" }, last: "2026-10-01", dob: "1979-01-19", since: 2019 },
      { id: "CTS-20890", name: "Nelson Rodríguez Lebrón", av: "av-5", p: 2, email: "nelson.rl@example.com", phone: "(939) 555-0290", tier: "ind", status: "pending", waiver: { v: 3, date: "2026-10-04", lang: "es" }, orient: null, last: null, dob: "1998-05-15", since: 2026 },
      { id: "CTS-20266", name: "Brenda Santos Rivera", av: "av-4", p: 1, email: "brenda.sr@example.com", phone: "(787) 555-0266", tier: "fam", expires: "2027-06-06", used: 1, waiver: { v: 3, date: "2026-08-19", lang: "es" }, orient: { done: "2026-06-06", exp: "2027-06-06" }, last: "2026-09-29", gender: "f", dob: "1983-11-23", since: 2021 },
      { id: "CTS-20267", name: "Francisco Alicea Rivera", av: "av-1", p: 4, hh: "CTS-20266", email: "francisco.ar@example.com", phone: "(787) 555-0267", waiver: { v: 3, date: "2026-08-19", lang: "es" }, orient: { done: "2026-06-06", exp: "2027-06-06" }, last: "2026-09-29", dob: "1980-09-30" },
      { id: "CTS-20180", name: "Dalia Medina Ocasio", av: "av-6", p: 6, email: "dalia.mo@example.com", phone: "(939) 555-0280", tier: "mon", expires: "2026-08-31", status: "cancelled", waiver: { v: 2, date: "2026-02-01", lang: "es" }, orient: { done: "2026-02-01", exp: "2027-02-01" }, last: "2026-08-20", gender: "f", dob: "1997-06-21", since: 2026 },
      { id: "CTS-20402", name: "Iris Rivera Meléndez", av: "av-6", p: 1, email: "iris.rm@example.com", phone: "(939) 555-0244", tier: "ind", expires: "2026-09-25", used: 2, waiver: { v: 3, date: "2026-08-21", lang: "es" }, orient: { done: "2026-03-25", exp: "2027-03-25" }, last: "2026-09-15", gender: "f", dob: "1988-02-14", since: 2022 },
      { id: "CTS-20345", name: "Carlos Alvarado Cintrón", av: "av-1", p: 0, email: "carlos.ac@example.com", phone: "(787) 555-0258", tier: "ind", expires: "2026-09-28", used: 1, waiver: { v: 3, date: "2026-08-23", lang: "es" }, orient: { done: "2026-03-28", exp: "2027-03-28" }, last: "2026-09-15", dob: "1977-07-07", since: 2020 },
      { id: "CTS-20410", name: "Wilmer Torres Aponte", av: "av-5", p: 2, email: "wilmer.ta@example.com", phone: "(787) 555-0262", tier: "ind", expires: "2026-09-27", used: 0, waiver: { v: 3, date: "2026-08-24", lang: "es" }, orient: { done: "2026-03-27", exp: "2027-03-27" }, last: "2026-09-19", dob: "1986-10-31", since: 2024 },
      { id: "CTS-20433", name: "Zuleika Pérez Rivera", av: "av-4", p: 3, email: "zuleika.pr@example.com", phone: "(939) 555-0279", tier: "mil", expires: "2026-09-24", used: 2, waiver: { v: 3, date: "2026-08-26", lang: "es" }, orient: { done: "2026-03-24", exp: "2027-03-24" }, last: "2026-09-11", gender: "f", dob: "1970-12-24", since: 2018 },
      { id: "CTS-20455", name: "Yesenia Ortiz Colón", av: "av-3", p: 6, email: "yesenia.oc@example.com", phone: "(787) 555-0255", tier: "ind", expires: "2026-10-08", used: 1, waiver: { v: 3, date: "2026-08-27", lang: "es" }, orient: { done: "2026-04-08", exp: "2027-04-08" }, last: "2026-10-02", gender: "f", dob: "1990-03-03", since: 2023 },
      { id: "CTS-20377", name: "Elvin Torres Santos", av: "av-1", p: 4, email: "elvin.ts@example.com", phone: "(787) 555-0277", tier: "fam", expires: "2026-10-21", used: 2, waiver: { v: 3, date: "2026-08-28", lang: "es" }, orient: { done: "2026-01-21", exp: "2027-01-21" }, last: "2026-09-25", dob: "1979-05-05", since: 2019 },
      { id: "CTS-20299", name: "Lourdes Pagán Ríos", av: "av-6", p: 1, email: "lourdes.pr@example.com", phone: "(939) 555-0299", tier: "ind", expires: "2026-10-04", used: 3, waiver: { v: 3, date: "2026-08-29", lang: "en" }, orient: { done: "2026-04-04", exp: "2027-04-04" }, last: "2026-09-30", pref: "en", gender: "f", dob: "1969-08-18", since: 2016 }
    ]
  }
};
