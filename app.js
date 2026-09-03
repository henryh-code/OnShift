/* ===========================================================
   Diensten Dashboard — app.js
   State management, localStorage-migraties, bewonerszoekbalk,
   agenda, taken, noodcontacten, stadsteams en sancties.
   =========================================================== */

(function(){
  "use strict";
  
  // ---------- Splash screen (alleen bij koude start) ----------
  var splashOverlay = document.getElementById("splashOverlay");
  if(splashOverlay){
    if(splashOverlay.style.display === "none"){
      // al gezien deze sessie (warme start) — direct verwijderen, geen vertraging
      splashOverlay.remove();
    }else{
      splashOverlay.addEventListener("transitionend", function(){
        splashOverlay.remove();
      });
      setTimeout(function(){
        splashOverlay.classList.add("splash-fade-out");
        try{ sessionStorage.setItem("onshift_splash_shown", "true"); }catch(e){ /* sessionStorage niet beschikbaar */ }
      }, 1100);
    }
  }

  var STORAGE_KEY = "wb_diensten_dashboard";
  var LEGACY_KEYS = ["wb_diensten_dashboard_v4", "wb_diensten_dashboard_v3", "wb_diensten_dashboard_v2", "wb_diensten_dashboard_v1"];

  var STATUS_ORDER = ["unseen", "seen", "absent"];
  var STATUS_META = {
    unseen: { label: "Nog niet gezien", cls: "st-unseen" },
    seen:   { label: "Gezien",           cls: "st-seen" },
    absent: { label: "Afwezig / verlof", cls: "st-absent" }
  };

  var DEFAULT_TASKS = [
    { id: "t1", text: "Medicatieronde ochtend afgetekend", done: false },
    { id: "t2", text: "Medicatieronde avond afgetekend", done: false },
    { id: "t3", text: "Rapportages bijgewerkt in dossier", done: false },
    { id: "t4", text: "Maaltijdbegeleiding / koken begeleid", done: false },
    { id: "t5", text: "Avondronde & veiligheidscheck gedaan", done: false },
    { id: "t6", text: "Huishoudelijke ondersteuning gecontroleerd", done: false }
  ];

  var DEFAULT_RESIDENTS = [
    { id: "r1", name: "J. de Vries", room: "101", status: "unseen", note: "", clientnr: "", locker: "", isAttention: false, attentionNote: "" },
    { id: "r2", name: "M. El Amrani", room: "102", status: "unseen", note: "", clientnr: "", locker: "", isAttention: false, attentionNote: "" },
    { id: "r3", name: "R. Boersema", room: "103", status: "unseen", note: "", clientnr: "", locker: "", isAttention: false, attentionNote: "" },
    { id: "r4", name: "S. Kowalski", room: "104", status: "unseen", note: "", clientnr: "", locker: "", isAttention: false, attentionNote: "" },
    { id: "r5", name: "T. Hendriks", room: "105", status: "unseen", note: "", clientnr: "", locker: "", isAttention: false, attentionNote: "" },
    { id: "r6", name: "L. van Dijk", room: "106", status: "unseen", note: "", clientnr: "", locker: "", isAttention: false, attentionNote: "" }
  ];

  var DEFAULT_CONTACTS = [
    { id: "c1", name: "Alarm (levensbedreigend)", number: "112" },
    { id: "c2", name: "Bereikbaarheidsdienst", number: "06 - 00 00 00 00" },
    { id: "c3", name: "Beveiliging pand", number: "06 - 11 11 11 11" },
    { id: "c4", name: "Huisartsenpost", number: "0900 - 000 000" },
    { id: "c5", name: "Crisisdienst GGZ", number: "0800 - 000 000" },
    { id: "c6", name: "Politie (geen spoed)", number: "0900 - 8844" }
  ];

  var TEAM_KEYS = ["volwassenen", "jongvolwassenen", "veldwerkers"];
  var TEAM_LABELS = { volwassenen: "Volwassenen", jongvolwassenen: "Jongvolwassenen", veldwerkers: "Veldwerkers" };

  var DEFAULT_STADSTEAM = [
    { id: "s1", name: "P. Willemsen", team: "volwassenen", phone: "06 - 22 33 44 55", email: "p.willemsen@stadsteam.nl" },
    { id: "s2", name: "F. Yilmaz", team: "jongvolwassenen", phone: "06 - 33 44 55 66", email: "f.yilmaz@stadsteam.nl" },
    { id: "s3", name: "K. Bakker", team: "veldwerkers", phone: "06 - 44 55 66 77", email: "k.bakker@stadsteam.nl" }
  ];

  var DEFAULT_PANELS_OPEN = {
    overdracht: true,
    aandacht: true,
    taken: true,
    bewoners: true,
    agendaVandaag: true,
    contacten: true,
    stadsteam: true,
    beheerBewoners: true,
    beheerContacten: true,
    beheerStadsteam: false,
    beheerData: false,
    sanctiesWarnings: true,
    sanctiesBans: true
  };

  function uid(prefix){
    return prefix + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
  }

function openZorgNedLink(url){
  var isStandalone = window.navigator.standalone === true ||
    (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches);
  var isIOS = /iP(hone|od|ad)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (isStandalone && isIOS) {
    // Forceert openen in de native Safari-app i.p.v. de WebSheet-overlay,
    // zodat de 2FA/Authenticator-sessie bewaard blijft.
    window.location.href = url.replace(/^https:\/\//, "x-safari-https://");
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

  function todayISO(){
    var d = new Date();
    var m = ("0" + (d.getMonth() + 1)).slice(-2);
    var day = ("0" + d.getDate()).slice(-2);
    return d.getFullYear() + "-" + m + "-" + day;
  }

  function defaultState(){
    var t = todayISO();
    var parts = t.split("-");
    return {
      handoverNote: "",
      tasks: JSON.parse(JSON.stringify(DEFAULT_TASKS)),
      residents: JSON.parse(JSON.stringify(DEFAULT_RESIDENTS)),
      contacts: JSON.parse(JSON.stringify(DEFAULT_CONTACTS)),
      stadsteam: JSON.parse(JSON.stringify(DEFAULT_STADSTEAM)),
      events: [],
      warnings: [],
      bans: [],
      panelsOpen: JSON.parse(JSON.stringify(DEFAULT_PANELS_OPEN)),
      agendaView: "month",
      agendaSelectedDate: t,
      calYear: parseInt(parts[0], 10),
      calMonth: parseInt(parts[1], 10) - 1,
      dashboardSort: "naam",
      dashboardSelectedResidentId: null
    };
  }

  // ---------- Normalisatie / migratie ----------
  function normalizeResident(r, i){
    r = r || {};
    var status = "unseen";
    if(r.status === "seen" || r.status === "absent" || r.status === "unseen"){
      status = r.status;
    }else if(typeof r.seen === "boolean"){
      status = r.seen ? "seen" : "unseen"; // migratie van oude boolean 'seen'
    }
    return {
      id: r.id || uid("res"),
      name: typeof r.name === "string" ? r.name : ("Bewoner " + (i + 1)),
      room: typeof r.room === "string" ? r.room : "",
      status: status,
      note: typeof r.note === "string" ? r.note : "",
      clientnr: typeof r.clientnr === "string" ? r.clientnr : "",
      locker: typeof r.locker === "string" ? r.locker : "",
      isAttention: !!r.isAttention,
      attentionNote: typeof r.attentionNote === "string" ? r.attentionNote : ""
    };
  }

  function normalizeWarning(w){
    w = w || {};
    return {
      id: w.id || uid("warn"),
      residentId: typeof w.residentId === "string" ? w.residentId : "",
      date: typeof w.date === "string" ? w.date : todayISO(),
      level: typeof w.level === "string" ? w.level : "1e waarschuwing",
      note: typeof w.note === "string" ? w.note : ""
    };
  }

  function normalizeBan(b){
    b = b || {};
    return {
      id: b.id || uid("ban"),
      name: typeof b.name === "string" ? b.name : "",
      clientnr: typeof b.clientnr === "string" ? b.clientnr : "",
      reason: typeof b.reason === "string" ? b.reason : "",
      untilDate: typeof b.untilDate === "string" ? b.untilDate : "",
      untilTime: typeof b.untilTime === "string" ? b.untilTime : ""
    };
  }

  function normalizeTask(t){
    t = t || {};
    return { id: t.id || uid("task"), text: typeof t.text === "string" ? t.text : "", done: !!t.done };
  }

  function normalizeContact(c){
    c = c || {};
    return { id: c.id || uid("contact"), name: typeof c.name === "string" ? c.name : "", number: typeof c.number === "string" ? c.number : "" };
  }

  function normalizeStadsteamContact(s){
    s = s || {};
    return {
      id: s.id || uid("stads"),
      name: typeof s.name === "string" ? s.name : "",
      team: TEAM_KEYS.indexOf(s.team) !== -1 ? s.team : "volwassenen",
      phone: typeof s.phone === "string" ? s.phone : "",
      email: typeof s.email === "string" ? s.email : ""
    };
  }

  function normalizePanelsOpen(parsed, legacyAccordionOpen){
    var base = JSON.parse(JSON.stringify(DEFAULT_PANELS_OPEN));
    if(parsed && typeof parsed === "object"){
      Object.keys(base).forEach(function(key){
        if(typeof parsed[key] === "boolean") base[key] = parsed[key];
      });
    }
    if(typeof parsed !== "object" || parsed === null || typeof parsed.contacten !== "boolean"){
      if(typeof legacyAccordionOpen === "boolean") base.contacten = legacyAccordionOpen;
    }
    return base;
  }

  function normalizeEvent(e){
    e = e || {};
    return {
      id: e.id || uid("ev"),
      date: typeof e.date === "string" ? e.date : todayISO(),
      time: typeof e.time === "string" ? e.time : "",
      title: typeof e.title === "string" ? e.title : "",
      residentId: typeof e.residentId === "string" ? e.residentId : null
    };
  }

  function normalizeLoadedData(parsed){
    var base = defaultState();
    if(!parsed || typeof parsed !== "object") return base;
    return {
      handoverNote: typeof parsed.handoverNote === "string" ? parsed.handoverNote : base.handoverNote,
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks.map(normalizeTask) : base.tasks,
      residents: Array.isArray(parsed.residents) ? parsed.residents.map(normalizeResident) : base.residents,
      contacts: Array.isArray(parsed.contacts) ? parsed.contacts.map(normalizeContact) : base.contacts,
      stadsteam: Array.isArray(parsed.stadsteam) ? parsed.stadsteam.map(normalizeStadsteamContact) : base.stadsteam,
      events: Array.isArray(parsed.events) ? parsed.events.map(normalizeEvent) : base.events,
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings.map(normalizeWarning) : base.warnings,
      bans: Array.isArray(parsed.bans) ? parsed.bans.map(normalizeBan) : base.bans,
      panelsOpen: normalizePanelsOpen(parsed.panelsOpen, parsed.accordionOpen),
      agendaView: (parsed.agendaView === "day" ? "day" : "month"),
      agendaSelectedDate: typeof parsed.agendaSelectedDate === "string" ? parsed.agendaSelectedDate : base.agendaSelectedDate,
      calYear: typeof parsed.calYear === "number" ? parsed.calYear : base.calYear,
      calMonth: typeof parsed.calMonth === "number" ? parsed.calMonth : base.calMonth,
      dashboardSort: (parsed.dashboardSort === "kamer" ? "kamer" : "naam"),
      dashboardSelectedResidentId: typeof parsed.dashboardSelectedResidentId === "string" ? parsed.dashboardSelectedResidentId : null
    };
  }

  function readRawFromAnyKey(){
    try{
      var raw = localStorage.getItem(STORAGE_KEY);
      if(raw) return raw;
      for(var i = 0; i < LEGACY_KEYS.length; i++){
        raw = localStorage.getItem(LEGACY_KEYS[i]);
        if(raw) return raw;
      }
    }catch(e){ /* localStorage niet beschikbaar */ }
    return null;
  }

  function loadState(){
    try{
      var raw = readRawFromAnyKey();
      if(!raw) return defaultState();
      return normalizeLoadedData(JSON.parse(raw));
    }catch(e){
      return defaultState();
    }
  }

  function saveState(){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      flashSaveHint();
    }catch(e){ /* localStorage niet beschikbaar - stil negeren */ }
  }

  var state = loadState();

  // ---------- Save hint ----------
  var saveHintEl = document.getElementById("saveHint");
  var saveHintTimer = null;
  function flashSaveHint(){
    if(!saveHintEl) return;
    saveHintEl.textContent = "Opgeslagen";
    if(saveHintTimer) clearTimeout(saveHintTimer);
    saveHintTimer = setTimeout(function(){ saveHintEl.textContent = ""; }, 1400);
  }

  // ---------- Datum helpers ----------
  var days = ["zondag","maandag","dinsdag","woensdag","donderdag","vrijdag","zaterdag"];
  var months = ["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"];

  function pad2(n){ return ("0" + n).slice(-2); }
  function isoOf(year, month, day){ return year + "-" + pad2(month + 1) + "-" + pad2(day); }

  // ---------- Tijdselector helpers (uur-dropdown + kwartier-minuten) ----------
  function buildHourOptions(selectEl){
    selectEl.innerHTML = "";
    var noneOpt = document.createElement("option");
    noneOpt.value = "";
    noneOpt.textContent = "Hele dag";
    selectEl.appendChild(noneOpt);
    for(var h = 0; h < 24; h++){
      var hh = pad2(h);
      var opt = document.createElement("option");
      opt.value = hh;
      opt.textContent = hh;
      selectEl.appendChild(opt);
    }
  }

  function syncMinuteDisabled(hourSel, minuteSel){
    minuteSel.disabled = (hourSel.value === "");
  }

  function readTimeFromSelects(hourSel, minuteSel){
    if(hourSel.value === "") return "";
    return hourSel.value + ":" + minuteSel.value;
  }

  function resetTimeSelects(hourSel, minuteSel){
    hourSel.value = "";
    minuteSel.value = "00";
    syncMinuteDisabled(hourSel, minuteSel);
  }

  function formatDateLabel(iso){
    var parts = iso.split("-");
    var d = new Date(parseInt(parts[0],10), parseInt(parts[1],10) - 1, parseInt(parts[2],10));
    return days[d.getDay()] + " " + d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear();
  }

  function shiftDateISO(iso, deltaDays){
    var parts = iso.split("-");
    var d = new Date(parseInt(parts[0],10), parseInt(parts[1],10) - 1, parseInt(parts[2],10));
    d.setDate(d.getDate() + deltaDays);
    return isoOf(d.getFullYear(), d.getMonth(), d.getDate());
  }

  var now = new Date();
  document.getElementById("shiftDate").textContent =
    days[now.getDay()] + " " + now.getDate() + " " + months[now.getMonth()] + " " + now.getFullYear();

  function getResidentById(id){
    return state.residents.filter(function(r){ return r.id === id; })[0];
  }

  // ---------- Tabs ----------
  var tabButtons = document.querySelectorAll(".tab-btn[data-tab]");
  var TAB_PANEL_IDS = {
    dashboard: "panelDashboard",
    agenda: "panelAgenda",
    bewoners: "panelBewoners",
    sancties: "panelSancties",
    contacten: "panelContacten",
    beheer: "panelBeheer"
  };

  function activateTab(tab){
    tabButtons.forEach(function(btn){
      var isActive = btn.getAttribute("data-tab") === tab;
      btn.classList.toggle("active", isActive);
      if(isActive && typeof btn.scrollIntoView === "function"){
        btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    });
    Object.keys(TAB_PANEL_IDS).forEach(function(key){
      var panel = document.getElementById(TAB_PANEL_IDS[key]);
      if(panel) panel.classList.toggle("active", key === tab);
    });
    if(tab === "bewoners") renderResidentsFullList();
    if(tab === "contacten"){ renderStadsteamListTab(); renderContactsTab(); }
    if(tab === "sancties"){ renderWarningsList(); renderBansList(); }
  }

  tabButtons.forEach(function(btn){
    btn.addEventListener("click", function(){ activateTab(btn.getAttribute("data-tab")); });
  });

  // ---------- Overdracht ----------
  var handoverEl = document.getElementById("handoverNote");
  var handoverDebounce = null;
  handoverEl.addEventListener("input", function(){
    state.handoverNote = handoverEl.value;
    if(handoverDebounce) clearTimeout(handoverDebounce);
    handoverDebounce = setTimeout(saveState, 350);
  });

  // ---------- Checklist ----------
  var taskListEl = document.getElementById("taskList");
  var taskCountEl = document.getElementById("taskCount");

  function renderTasks(){
    taskListEl.innerHTML = "";
    var doneCount = 0;
    state.tasks.forEach(function(task){
      if(task.done) doneCount++;

      var li = document.createElement("li");
      li.className = "task-row" + (task.done ? " done" : "");

      var checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = task.done;
      checkbox.id = "chk-" + task.id;
      checkbox.addEventListener("change", function(){
        task.done = checkbox.checked;
        saveState();
        renderTasks();
      });

      var label = document.createElement("label");
      label.className = "task-label";
      label.setAttribute("for", "chk-" + task.id);
      label.textContent = task.text;

      var removeBtn = document.createElement("button");
      removeBtn.className = "remove-btn";
      removeBtn.type = "button";
      removeBtn.setAttribute("aria-label", "Taak verwijderen");
      removeBtn.textContent = "✕";
      removeBtn.addEventListener("click", function(){
        state.tasks = state.tasks.filter(function(t){ return t.id !== task.id; });
        saveState();
        renderTasks();
      });

      li.appendChild(checkbox);
      li.appendChild(label);
      li.appendChild(removeBtn);
      taskListEl.appendChild(li);
    });

    taskCountEl.textContent = doneCount + "/" + state.tasks.length;
  }

  var newTaskInput = document.getElementById("newTaskInput");
  var addTaskBtn = document.getElementById("addTaskBtn");

  function addTask(){
    var val = newTaskInput.value.trim();
    if(!val) return;
    state.tasks.push({ id: uid("task"), text: val, done: false });
    newTaskInput.value = "";
    saveState();
    renderTasks();
  }

  addTaskBtn.addEventListener("click", addTask);
  newTaskInput.addEventListener("keydown", function(e){
    if(e.key === "Enter"){ e.preventDefault(); addTask(); }
  });

  // ======================================================
  // ---------- Bewoners: Dashboard (compact combobox) -----
  // ======================================================
  var residentSummary = document.getElementById("residentSummary");
  var residentSearch = document.getElementById("residentSearch");
  var residentSearchWrap = document.getElementById("residentSearchWrap");
  var clearResidentSearchBtn = document.getElementById("clearResidentSearch");
  var residentDropdown = document.getElementById("residentDropdown");
  var residentDetailWrap = document.getElementById("residentDetailWrap");
  var sortDropdownWrap = document.getElementById("sortDropdownWrap");
  var sortDropdownBtn = document.getElementById("sortDropdownBtn");
  var sortDropdownMenu = document.getElementById("sortDropdownMenu");
  var sortDropdownLabel = document.getElementById("sortDropdownLabel");
  var sortDropdownOptions = sortDropdownMenu.querySelectorAll(".sort-dropdown-option");

  function sortedResidents(){
    var list = state.residents.slice();
    if(state.dashboardSort === "kamer"){
      list.sort(function(a, b){
        var ra = (a.room || "").trim();
        var rb = (b.room || "").trim();
        if(ra === "" && rb === "") return a.name.localeCompare(b.name, "nl");
        if(ra === "") return 1;
        if(rb === "") return -1;
        return ra.localeCompare(rb, "nl", { numeric: true, sensitivity: "base" });
      });
    }else{
      list.sort(function(a, b){ return a.name.localeCompare(b.name, "nl"); });
    }
    return list;
  }

  function filteredResidents(query){
    var q = (query || "").trim().toLowerCase();
    var list = sortedResidents();
    if(!q) return list;
    return list.filter(function(r){ return r.name.toLowerCase().indexOf(q) !== -1; });
  }

  function renderResidentSummary(){
    var seen = 0, absent = 0, unseen = 0;
    state.residents.forEach(function(r){
      if(r.status === "seen") seen++;
      else if(r.status === "absent") absent++;
      else unseen++;
    });
    residentSummary.innerHTML =
      "<strong>" + seen + "</strong> gezien · <strong>" + absent + "</strong> afwezig · <strong>" + unseen + "</strong> nog niet gezien" +
      " <span style=\"color:var(--text-faint)\">(" + state.residents.length + " totaal)</span>";
  }

  function renderResidentDropdown(){
    var query = residentSearch.value;
    var list = filteredResidents(query);
    residentDropdown.innerHTML = "";

    var activeBan = query.trim() ? activeBanForName(query) : null;
    if(activeBan){
      var banWarning = document.createElement("div");
      banWarning.className = "resident-dropdown-ban-warning";
      var untilText = activeBan.untilDate
        ? (activeBan.untilDate + (activeBan.untilTime ? " " + activeBan.untilTime : ""))
        : "onbekende datum";
      banWarning.textContent = "⚠️ LET OP: ACTIEF PANDVERBOD voor " + activeBan.name + " tot " + untilText +
        (activeBan.reason ? " (" + activeBan.reason + ")" : "");
      residentDropdown.appendChild(banWarning);
    }

    if(list.length === 0){
      var empty = document.createElement("div");
      empty.className = "resident-dropdown-empty";
      empty.textContent = "Geen bewoners gevonden.";
      residentDropdown.appendChild(empty);
      return;
    }

    list.forEach(function(resident){
      var row = document.createElement("div");
      row.className = "resident-option" + (resident.id === state.dashboardSelectedResidentId ? " selected" : "");

      var dot = document.createElement("span");
      dot.className = "rdot " + STATUS_META[resident.status].cls;
      row.appendChild(dot);

      var nameEl = document.createElement("span");
      nameEl.className = "roname";
      nameEl.textContent = resident.name;
      row.appendChild(nameEl);

      if(resident.room){
        var roomEl = document.createElement("span");
        roomEl.className = "roroom";
        roomEl.textContent = "Kamer " + resident.room;
        row.appendChild(roomEl);
      }

      row.addEventListener("click", function(){ selectResident(resident.id); });
      residentDropdown.appendChild(row);
    });
  }

  function openDropdown(){ renderResidentDropdown(); residentDropdown.classList.add("open"); }
  function closeDropdown(){ residentDropdown.classList.remove("open"); }

  function updateClearButtonVisibility(){
    clearResidentSearchBtn.classList.toggle("visible", residentSearch.value.length > 0);
  }

  residentSearch.addEventListener("focus", openDropdown);
  residentSearch.addEventListener("input", function(){
    openDropdown();
    updateClearButtonVisibility();
  });
  residentSearch.addEventListener("keydown", function(e){
    if(e.key === "Enter"){
      e.preventDefault();
      var list = filteredResidents(residentSearch.value);
      if(list.length > 0) selectResident(list[0].id);
    }else if(e.key === "Escape"){
      closeDropdown();
    }
  });

  clearResidentSearchBtn.addEventListener("click", function(){
    residentSearch.value = "";
    updateClearButtonVisibility();
    openDropdown();
    residentSearch.focus();
  });

  document.addEventListener("click", function(e){
    if(!residentSearchWrap.contains(e.target)) closeDropdown();
  });

  function selectResident(id){
    state.dashboardSelectedResidentId = id;
    var resident = getResidentById(id);
    residentSearch.value = resident ? resident.name : "";
    updateClearButtonVisibility();
    saveState();
    closeDropdown();
    renderResidentDetail();
  }

  function buildStatusIndicator(resident){
    var wrap = document.createElement("div");
    wrap.className = "status-indicator-wrap";

    var mainBtn = document.createElement("button");
    mainBtn.type = "button";
    mainBtn.className = "status-dot-btn";
    mainBtn.setAttribute("aria-label", "Status wisselen (huidig: " + STATUS_META[resident.status].label + ")");

    var dotSpan = document.createElement("span");
    dotSpan.className = "status-dot-visual " + STATUS_META[resident.status].cls;

    mainBtn.appendChild(dotSpan);
    mainBtn.addEventListener("click", function(){
      var idx = STATUS_ORDER.indexOf(resident.status);
      resident.status = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
      afterResidentStatusChange();
    });
    wrap.appendChild(mainBtn);

    var popover = document.createElement("div");
    popover.className = "status-popover";
    STATUS_ORDER.forEach(function(key){
      var opt = document.createElement("button");
      opt.type = "button";
      opt.className = "status-popover-option";
      var d = document.createElement("span");
      d.className = "status-dot-visual " + STATUS_META[key].cls;
      var t = document.createElement("span");
      t.textContent = STATUS_META[key].label;
      opt.appendChild(d);
      opt.appendChild(t);
      opt.addEventListener("click", function(e){
        e.stopPropagation();
        resident.status = key;
        afterResidentStatusChange();
      });
      popover.appendChild(opt);
    });
    wrap.appendChild(popover);

    function afterResidentStatusChange(){
      saveState();
      renderResidentDetail();
      renderResidentSummary();
      if(residentDropdown.classList.contains("open")) renderResidentDropdown();
      renderResidentsFullList();
    }

    return wrap;
  }

  function renderResidentDetail(){
    residentDetailWrap.innerHTML = "";
    var resident = getResidentById(state.dashboardSelectedResidentId);

    if(!resident){
      var empty = document.createElement("div");
      empty.className = "resident-detail-empty";
      empty.textContent = "Zoek of kies hierboven een bewoner om de status en notitie te bekijken of aan te passen.";
      residentDetailWrap.appendChild(empty);
      return;
    }

    var card = document.createElement("div");
    card.className = "resident-detail-card " + STATUS_META[resident.status].cls;

    // ---- Kop: naam, kamer, kluis, aandacht, vorige/volgende ----
    var head = document.createElement("div");
    head.className = "resident-detail-head";

    var nameWrap = document.createElement("div");
    nameWrap.className = "resident-detail-name-wrap";

    nameWrap.appendChild(buildStatusIndicator(resident));

    var nameEl = document.createElement("span");
    nameEl.className = "resident-detail-name";
    nameEl.textContent = resident.name;
    nameWrap.appendChild(nameEl);

    if(resident.room){
      var roomBadge = document.createElement("span");
      roomBadge.className = "resident-detail-room";
      roomBadge.textContent = "Kamer " + resident.room;
      nameWrap.appendChild(roomBadge);
    }

    if(resident.locker){
      var lockerBadge = document.createElement("span");
      lockerBadge.className = "resident-detail-room";
      lockerBadge.textContent = "Kluis " + resident.locker;
      nameWrap.appendChild(lockerBadge);
    }

    if(resident.isAttention){
      var attentionBadge = document.createElement("span");
      attentionBadge.className = "attention-flag-badge";
      attentionBadge.textContent = "🚩 Aandacht";
      nameWrap.appendChild(attentionBadge);
    }

        if(resident.clientnr){
      var zorgnedUrl = "https://utrecht.zorgned.nl/prod/applicatie/Regie?lcclientnr=" + encodeURIComponent(resident.clientnr) + "&section=1";
      var zorgnedLink = document.createElement("button");
      zorgnedLink.type = "button";
      zorgnedLink.className = "zorgned-badge";
      zorgnedLink.textContent = "ZorgNed ↗";
      zorgnedLink.setAttribute("aria-label", "Open cliëntdossier in ZorgNed");
      zorgnedLink.addEventListener("click", function(){ openZorgNedLink(zorgnedUrl); });
      nameWrap.appendChild(zorgnedLink);
    }

    head.appendChild(nameWrap);

    var nav = document.createElement("div");
    nav.className = "resident-nav";

    var prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.className = "resident-nav-btn";
    prevBtn.setAttribute("aria-label", "Vorige bewoner");
    prevBtn.textContent = "‹";
    prevBtn.addEventListener("click", function(){ navigateResident(-1); });

    var nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "resident-nav-btn";
    nextBtn.setAttribute("aria-label", "Volgende bewoner");
    nextBtn.textContent = "›";
    nextBtn.addEventListener("click", function(){ navigateResident(1); });

    nav.appendChild(prevBtn);
    nav.appendChild(nextBtn);
    head.appendChild(nav);

    card.appendChild(head);

    // ---- Notitie ----
    var noteInput = document.createElement("input");
    noteInput.type = "text";
    noteInput.className = "resident-note";
    noteInput.placeholder = "Dienstnotitie, bijv. gesprek 14:00...";
    noteInput.value = resident.note || "";
    var noteDebounce = null;
    noteInput.addEventListener("input", function(){
      resident.note = noteInput.value;
      if(noteDebounce) clearTimeout(noteDebounce);
      noteDebounce = setTimeout(saveState, 350);
    });
    card.appendChild(noteInput);

    // ---- Aandachtsdossier toggle ----
    var attentionWrap = document.createElement("div");
    attentionWrap.className = "attention-toggle-wrap";

    var attentionLabel = document.createElement("label");
    attentionLabel.className = "attention-toggle-label";

    var attentionCheckbox = document.createElement("input");
    attentionCheckbox.type = "checkbox";
    attentionCheckbox.checked = !!resident.isAttention;

    var attentionLabelText = document.createElement("span");
    attentionLabelText.textContent = "Op aandachtslijst zetten";

    attentionLabel.appendChild(attentionCheckbox);
    attentionLabel.appendChild(attentionLabelText);
    attentionWrap.appendChild(attentionLabel);

    var attentionNoteInput = document.createElement("input");
    attentionNoteInput.type = "text";
    attentionNoteInput.className = "resident-note attention-note-input";
    attentionNoteInput.placeholder = "Waarom aandacht nodig is...";
    attentionNoteInput.value = resident.attentionNote || "";
    attentionNoteInput.style.display = resident.isAttention ? "block" : "none";
    var attentionNoteDebounce = null;
    attentionNoteInput.addEventListener("input", function(){
      resident.attentionNote = attentionNoteInput.value;
      if(attentionNoteDebounce) clearTimeout(attentionNoteDebounce);
      attentionNoteDebounce = setTimeout(function(){
        saveState();
        renderAandachtCard();
      }, 350);
    });

    attentionCheckbox.addEventListener("change", function(){
      resident.isAttention = attentionCheckbox.checked;
      attentionNoteInput.style.display = resident.isAttention ? "block" : "none";
      saveState();
      renderResidentDetail();
      renderAandachtCard();
      renderResidentsFullList();
    });

    attentionWrap.appendChild(attentionNoteInput);
    card.appendChild(attentionWrap);

    residentDetailWrap.appendChild(card);
  }

  function navigateResident(delta){
    var list = sortedResidents();
    if(list.length === 0) return;
    var idx = list.findIndex(function(r){ return r.id === state.dashboardSelectedResidentId; });
    if(idx === -1) idx = 0;
    else idx = (idx + delta + list.length) % list.length;
    selectResident(list[idx].id);
  }

  // ======================================================
  // ---------- Aandachtsdossiers & Alertheid (Dashboard) --
  // ======================================================
  var attentionList = document.getElementById("attentionList");
  var attentionCountEl = document.getElementById("attentionCount");

  function renderAandachtCard(){
    var flagged = sortedResidents().filter(function(r){ return r.isAttention; });
    attentionCountEl.textContent = flagged.length + (flagged.length === 1 ? " dossier" : " dossiers");
    attentionList.innerHTML = "";

    if(flagged.length === 0){
      var empty = document.createElement("li");
      empty.className = "empty-note";
      empty.textContent = "Geen actieve aandachtsdossiers.";
      attentionList.appendChild(empty);
      return;
    }

    flagged.forEach(function(resident){
      var li = document.createElement("li");
      li.className = "attention-row";

      var main = document.createElement("div");
      main.className = "attention-row-main";

      var nameEl = document.createElement("span");
      nameEl.className = "attention-row-name";
      nameEl.textContent = "🚩 " + resident.name;
      main.appendChild(nameEl);

      if(resident.attentionNote){
        var noteEl = document.createElement("div");
        noteEl.className = "attention-row-note";
        noteEl.textContent = resident.attentionNote;
        main.appendChild(noteEl);
      }

      li.appendChild(main);

      var openBtn = document.createElement("button");
      openBtn.type = "button";
      openBtn.className = "resident-nav-btn";
      openBtn.setAttribute("aria-label", "Open " + resident.name + " op het Dashboard");
      openBtn.textContent = "›";
      openBtn.addEventListener("click", function(){ selectResident(resident.id); });
      li.appendChild(openBtn);

      attentionList.appendChild(li);
    });
  }

  function updateSortDropdownUI(){
    sortDropdownLabel.textContent = state.dashboardSort === "kamer" ? "Kamer" : "Naam";
    sortDropdownOptions.forEach(function(opt){
      opt.classList.toggle("active", opt.getAttribute("data-sort") === state.dashboardSort);
    });
  }

  function closeSortDropdown(){
    sortDropdownMenu.classList.remove("open");
    sortDropdownBtn.setAttribute("aria-expanded", "false");
  }

  function toggleSortDropdown(){
    var isOpen = sortDropdownMenu.classList.contains("open");
    if(isOpen){
      closeSortDropdown();
    }else{
      sortDropdownMenu.classList.add("open");
      sortDropdownBtn.setAttribute("aria-expanded", "true");
    }
  }

  sortDropdownBtn.addEventListener("click", function(e){
    e.stopPropagation();
    toggleSortDropdown();
  });

  sortDropdownOptions.forEach(function(opt){
    opt.addEventListener("click", function(){
      state.dashboardSort = opt.getAttribute("data-sort");
      saveState();
      updateSortDropdownUI();
      closeSortDropdown();
      if(residentDropdown.classList.contains("open")) renderResidentDropdown();
    });
  });

  document.addEventListener("click", function(e){
    if(!sortDropdownWrap.contains(e.target)) closeSortDropdown();
  });

  // ======================================================
  // ---------- Bewoners beheren (Beheer tab) --------------
  // ======================================================
  var residentManageList = document.getElementById("residentManageList");
  var newResidentInput = document.getElementById("newResidentInput");
  var newResidentRoom = document.getElementById("newResidentRoom");
  var newResidentClientnr = document.getElementById("newResidentClientnr");
  var newResidentLocker = document.getElementById("newResidentLocker");
  var addResidentBtn = document.getElementById("addResidentBtn");

  function renderResidentManage(){
    residentManageList.innerHTML = "";
    if(state.residents.length === 0){
      var empty = document.createElement("li");
      empty.className = "empty-note";
      empty.textContent = "Nog geen bewoners toegevoegd.";
      residentManageList.appendChild(empty);
      return;
    }
    state.residents.forEach(function(resident){
      var li = document.createElement("li");
      li.className = "manage-row";

      var editWrap = document.createElement("div");
      editWrap.className = "edit-row";

      var nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.className = "f-main";
      nameInput.value = resident.name;
      nameInput.setAttribute("aria-label", "Naam bewoner");
      var nameDebounce = null;
      nameInput.addEventListener("input", function(){
        resident.name = nameInput.value;
        if(nameDebounce) clearTimeout(nameDebounce);
        nameDebounce = setTimeout(function(){
          saveState();
          renderResidentSummary();
          if(state.dashboardSelectedResidentId === resident.id) renderResidentDetail();
          if(residentDropdown.classList.contains("open")) renderResidentDropdown();
          refreshResidentSelects();
          refreshWarningResidentSelect();
          renderResidentsFullList();
        }, 350);
      });

      var roomInput = document.createElement("input");
      roomInput.type = "text";
      roomInput.className = "f-side";
      roomInput.placeholder = "Kamer";
      roomInput.value = resident.room || "";
      roomInput.setAttribute("aria-label", "Kamernummer");
      var roomDebounce = null;
      roomInput.addEventListener("input", function(){
        resident.room = roomInput.value;
        if(roomDebounce) clearTimeout(roomDebounce);
        roomDebounce = setTimeout(function(){
          saveState();
          if(state.dashboardSelectedResidentId === resident.id) renderResidentDetail();
          if(residentDropdown.classList.contains("open")) renderResidentDropdown();
          refreshResidentSelects();
          refreshWarningResidentSelect();
          renderResidentsFullList();
        }, 350);
      });

      var clientnrInput = document.createElement("input");
      clientnrInput.type = "text";
      clientnrInput.className = "f-side";
      clientnrInput.placeholder = "Cliëntnr.";
      clientnrInput.value = resident.clientnr || "";
      clientnrInput.setAttribute("aria-label", "Cliëntnummer (ZorgNed)");
      var clientnrDebounce = null;
      clientnrInput.addEventListener("input", function(){
        resident.clientnr = clientnrInput.value;
        if(clientnrDebounce) clearTimeout(clientnrDebounce);
        clientnrDebounce = setTimeout(function(){
          saveState();
          if(state.dashboardSelectedResidentId === resident.id) renderResidentDetail();
        }, 350);
      });

      var lockerInput = document.createElement("input");
      lockerInput.type = "text";
      lockerInput.className = "f-side";
      lockerInput.placeholder = "Kluis";
      lockerInput.value = resident.locker || "";
      lockerInput.setAttribute("aria-label", "Kluisnummer");
      var lockerDebounce = null;
      lockerInput.addEventListener("input", function(){
        resident.locker = lockerInput.value;
        if(lockerDebounce) clearTimeout(lockerDebounce);
        lockerDebounce = setTimeout(function(){
          saveState();
          if(state.dashboardSelectedResidentId === resident.id) renderResidentDetail();
          renderResidentsFullList();
        }, 350);
      });

      editWrap.appendChild(nameInput);
      editWrap.appendChild(roomInput);
      editWrap.appendChild(clientnrInput);
      editWrap.appendChild(lockerInput);
      li.appendChild(editWrap);

      var removeBtn = document.createElement("button");
      removeBtn.className = "remove-btn";
      removeBtn.type = "button";
      removeBtn.setAttribute("aria-label", "Bewoner verwijderen");
      removeBtn.textContent = "✕";
      removeBtn.addEventListener("click", function(){
        state.residents = state.residents.filter(function(r){ return r.id !== resident.id; });
        if(state.dashboardSelectedResidentId === resident.id) state.dashboardSelectedResidentId = null;
        saveState();
        renderResidentManage();
        renderResidentSummary();
        renderResidentDetail();
        refreshResidentSelects();
        refreshWarningResidentSelect();
        if(residentDropdown.classList.contains("open")) renderResidentDropdown();
        renderResidentsFullList();
        renderAandachtCard();
      });
      li.appendChild(removeBtn);

      residentManageList.appendChild(li);
    });
  }

  function addResident(){
    var val = newResidentInput.value.trim();
    if(!val) return;
    state.residents.push({
      id: uid("res"),
      name: val,
      room: newResidentRoom.value.trim(),
      status: "unseen",
      note: "",
      clientnr: newResidentClientnr.value.trim(),
      locker: newResidentLocker.value.trim(),
      isAttention: false,
      attentionNote: ""
    });
    newResidentInput.value = "";
    newResidentRoom.value = "";
    newResidentClientnr.value = "";
    newResidentLocker.value = "";
    saveState();
    renderResidentManage();
    renderResidentSummary();
    refreshResidentSelects();
    refreshWarningResidentSelect();
    if(residentDropdown.classList.contains("open")) renderResidentDropdown();
    renderResidentsFullList();
  }

  addResidentBtn.addEventListener("click", addResident);
  [newResidentInput, newResidentRoom, newResidentClientnr, newResidentLocker].forEach(function(el){
    el.addEventListener("keydown", function(e){
      if(e.key === "Enter"){ e.preventDefault(); addResident(); }
    });
  });

  // ======================================================
  // ---------- Bewoners: volledige lijst (tabblad) --------
  // ======================================================
  var residentsFullList = document.getElementById("residentsFullList");
  var residentStatusFiltersEl = document.getElementById("residentStatusFilters");
  var residentStatusFilterBtns = residentStatusFiltersEl.querySelectorAll(".filter-pill");
  var residentStatusFilter = "alle";

  function filteredResidentsForFullList(){
    var list = sortedResidents();
    if(residentStatusFilter === "alle") return list;
    return list.filter(function(r){ return r.status === residentStatusFilter; });
  }

  function renderResidentsFullList(){
    var list = filteredResidentsForFullList();
    residentsFullList.innerHTML = "";

    if(list.length === 0){
      var empty = document.createElement("li");
      empty.className = "empty-note";
      empty.textContent = "Geen bewoners gevonden.";
      residentsFullList.appendChild(empty);
      return;
    }

    list.forEach(function(resident){
      var li = document.createElement("li");
      li.className = "resident-full-row";
      li.setAttribute("tabindex", "0");
      li.setAttribute("role", "button");
      li.setAttribute("aria-label", "Open " + resident.name + " op het Dashboard");

      li.appendChild(buildStatusIndicator(resident));

      var main = document.createElement("div");
      main.className = "resident-full-main";

      var top = document.createElement("div");
      top.className = "resident-full-top";

      var nameEl = document.createElement("span");
      nameEl.className = "resident-full-name";
      nameEl.textContent = (resident.isAttention ? "🚩 " : "") + resident.name;
      top.appendChild(nameEl);

      if(resident.room){
        var roomEl = document.createElement("span");
        roomEl.className = "resident-full-room";
        roomEl.textContent = "Kamer " + resident.room;
        top.appendChild(roomEl);
      }

      if(resident.locker){
        var lockerEl = document.createElement("span");
        lockerEl.className = "resident-full-room";
        lockerEl.textContent = "Kluis " + resident.locker;
        top.appendChild(lockerEl);
      }

      var residentWarningCount = warningsForResident(resident.id).length;
      if(residentWarningCount > 0){
        var warnBadge = document.createElement("button");
        warnBadge.type = "button";
        warnBadge.className = "warning-count-badge";
        warnBadge.textContent = "⚠️ " + residentWarningCount;
        warnBadge.setAttribute("aria-label", "Bekijk waarschuwingen van " + resident.name);
        warnBadge.addEventListener("click", function(e){
          e.stopPropagation();
          activateTab("sancties");
          setTimeout(function(){
            var firstWarning = warningsForResident(resident.id)[0];
            if(!firstWarning) return;
            var rowEl = document.getElementById("warning-" + firstWarning.id);
            if(rowEl){
              rowEl.scrollIntoView({ behavior: "smooth", block: "center" });
              rowEl.classList.add("warning-row-highlight");
              setTimeout(function(){ rowEl.classList.remove("warning-row-highlight"); }, 1600);
            }
          }, 150);
        });
        top.appendChild(warnBadge);
      }

      main.appendChild(top);

      if(resident.note){
        var noteEl = document.createElement("div");
        noteEl.className = "resident-full-note";
        noteEl.textContent = resident.note;
        main.appendChild(noteEl);
      }

      li.appendChild(main);

      var arrow = document.createElement("span");
      arrow.className = "resident-full-arrow";
      arrow.textContent = "›";
      li.appendChild(arrow);

      function openOnDashboard(){
        selectResident(resident.id);
        activateTab("dashboard");
      }

      li.addEventListener("click", function(e){
        if(e.target.closest(".status-indicator-wrap") || e.target.closest(".warning-count-badge")) return;
        openOnDashboard();
      });
      li.addEventListener("keydown", function(e){
        if(e.target.closest(".status-indicator-wrap") || e.target.closest(".warning-count-badge")) return;
        if(e.key === "Enter" || e.key === " "){
          e.preventDefault();
          openOnDashboard();
        }
      });

      residentsFullList.appendChild(li);
    });
  }

  residentStatusFilterBtns.forEach(function(btn){
    btn.addEventListener("click", function(){
      residentStatusFilter = btn.getAttribute("data-status");
      residentStatusFilterBtns.forEach(function(b){ b.classList.toggle("active", b === btn); });
      renderResidentsFullList();
    });
  });

  // ---------- Bewoner-select (Koppel bewoner) voor afspraken ----------
  var newDayEventResident = document.getElementById("newDayEventResident");
  var newTodayEventResident = document.getElementById("newTodayEventResident");

  function refreshResidentSelects(){
    [newDayEventResident, newTodayEventResident].forEach(function(sel){
      if(!sel) return;
      var currentVal = sel.value;
      sel.innerHTML = "";
      var noneOpt = document.createElement("option");
      noneOpt.value = "";
      noneOpt.textContent = "Koppel bewoner (optioneel)";
      sel.appendChild(noneOpt);

      var list = state.residents.slice().sort(function(a, b){ return a.name.localeCompare(b.name, "nl"); });
      list.forEach(function(r){
        var opt = document.createElement("option");
        opt.value = r.id;
        opt.textContent = r.name + (r.room ? " (Kamer " + r.room + ")" : "");
        sel.appendChild(opt);
      });

      if(list.some(function(r){ return r.id === currentVal; })) sel.value = currentVal;
      else sel.value = "";
    });
  }

  // ---------- Inklapbare dashboard-kaarten (generieke panel-toggle) ----------
  var panelHeads = document.querySelectorAll(".card-head[data-panel]");

  function setPanelVisual(key){
    var head = document.querySelector('.card-head[data-panel="' + key + '"]');
    if(!head) return;
    var chevron = head.querySelector(".card-chevron");
    var isOpen = state.panelsOpen[key] !== false;
    head.setAttribute("aria-expanded", isOpen ? "true" : "false");
    if(chevron) chevron.style.transform = isOpen ? "rotate(180deg)" : "rotate(0deg)";
  }

  function applyPanelState(key, animate){
    var body = document.getElementById("panelBody-" + key);
    if(!body) return;
    var isOpen = state.panelsOpen[key] !== false;
    setPanelVisual(key);

    if(!animate){
      body.style.transition = "none";
      if(isOpen){
        body.style.maxHeight = "none";
        body.style.overflow = "visible";
      }else{
        body.style.maxHeight = "0px";
        body.style.overflow = "hidden";
      }
      void body.offsetHeight; // forceer reflow
      body.style.transition = "";
      return;
    }

    if(isOpen){
      body.style.overflow = "hidden";
      body.style.maxHeight = body.scrollHeight + "px";
      var onOpenEnd = function(e){
        if(e.target !== body || e.propertyName !== "max-height") return;
        body.style.maxHeight = "none";
        body.style.overflow = "visible";
        body.removeEventListener("transitionend", onOpenEnd);
      };
      body.addEventListener("transitionend", onOpenEnd);
    }else{
      body.style.overflow = "hidden";
      body.style.maxHeight = body.scrollHeight + "px";
      void body.offsetHeight; // forceer reflow
      requestAnimationFrame(function(){
        body.style.maxHeight = "0px";
      });
    }
  }

  function togglePanel(key){
    state.panelsOpen[key] = !(state.panelsOpen[key] !== false);
    saveState();
    applyPanelState(key, true);
  }

  panelHeads.forEach(function(head){
    var key = head.getAttribute("data-panel");
    head.addEventListener("click", function(){ togglePanel(key); });
    head.addEventListener("keydown", function(e){
      if(e.key === "Enter" || e.key === " "){
        e.preventDefault();
        togglePanel(key);
      }
    });
  });

  function applyAllPanelStates(){
    Object.keys(DEFAULT_PANELS_OPEN).forEach(function(key){
      applyPanelState(key, false);
    });
  }

  // ---------- Contacten (Dashboard + tabblad, read-only) ----------
  var contactListDashboard = document.getElementById("contactListDashboard");
  var contactListTab = document.getElementById("contactListTab");

  function renderContactsInto(targetEl, clickablePhone){
    targetEl.innerHTML = "";
    if(state.contacts.length === 0){
      var empty = document.createElement("div");
      empty.className = "empty-note";
      empty.textContent = "Nog geen contacten ingesteld (via tab Beheer).";
      targetEl.appendChild(empty);
      return;
    }
    state.contacts.forEach(function(contact){
      var li = document.createElement("li");
      var isUrgent = contact.number.replace(/\s/g,"") === "112";
      li.className = "contact-row" + (isUrgent ? " urgent" : "");

      var nameEl = document.createElement("span");
      nameEl.className = "contact-name";
      nameEl.textContent = contact.name;

      var numEl;
      if(clickablePhone){
        numEl = document.createElement("a");
        numEl.href = "tel:" + contact.number.replace(/[^0-9+]/g, "");
        numEl.className = "contact-number contact-number-link";
      }else{
        numEl = document.createElement("span");
        numEl.className = "contact-number";
      }
      numEl.textContent = contact.number;

      li.appendChild(nameEl);
      li.appendChild(numEl);
      targetEl.appendChild(li);
    });
  }

  function renderContactsDashboard(){
    renderContactsInto(contactListDashboard, false);
  }

  function renderContactsTab(){
    renderContactsInto(contactListTab, true);
  }

  // ---------- Contacten beheren (inline bewerkbaar) ----------
  var contactManageList = document.getElementById("contactManageList");
  var newContactName = document.getElementById("newContactName");
  var newContactNumber = document.getElementById("newContactNumber");
  var addContactBtn = document.getElementById("addContactBtn");

  function renderContactManage(){
    contactManageList.innerHTML = "";
    if(state.contacts.length === 0){
      var empty = document.createElement("li");
      empty.className = "empty-note";
      empty.textContent = "Nog geen contacten toegevoegd.";
      contactManageList.appendChild(empty);
      return;
    }
    state.contacts.forEach(function(contact){
      var li = document.createElement("li");
      li.className = "manage-row";

      var editWrap = document.createElement("div");
      editWrap.className = "edit-row";

      var nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.className = "f-main";
      nameInput.value = contact.name;
      nameInput.setAttribute("aria-label", "Naam contact");
      var nameDebounce = null;
      nameInput.addEventListener("input", function(){
        contact.name = nameInput.value;
        if(nameDebounce) clearTimeout(nameDebounce);
        nameDebounce = setTimeout(function(){ saveState(); renderContactsDashboard(); renderContactsTab(); }, 350);
      });

      var numInput = document.createElement("input");
      numInput.type = "tel";
      numInput.className = "f-main";
      numInput.value = contact.number;
      numInput.setAttribute("aria-label", "Telefoonnummer");
      var numDebounce = null;
      numInput.addEventListener("input", function(){
        contact.number = numInput.value;
        if(numDebounce) clearTimeout(numDebounce);
        numDebounce = setTimeout(function(){ saveState(); renderContactsDashboard(); renderContactsTab(); }, 350);
      });

      editWrap.appendChild(nameInput);
      editWrap.appendChild(numInput);
      li.appendChild(editWrap);

      var removeBtn = document.createElement("button");
      removeBtn.className = "remove-btn";
      removeBtn.type = "button";
      removeBtn.setAttribute("aria-label", "Contact verwijderen");
      removeBtn.textContent = "✕";
      removeBtn.addEventListener("click", function(){
        state.contacts = state.contacts.filter(function(c){ return c.id !== contact.id; });
        saveState();
        renderContactManage();
        renderContactsDashboard();
        renderContactsTab();
      });
      li.appendChild(removeBtn);

      contactManageList.appendChild(li);
    });
  }

  function addContact(){
    var name = newContactName.value.trim();
    var number = newContactNumber.value.trim();
    if(!name || !number) return;
    state.contacts.push({ id: uid("contact"), name: name, number: number });
    newContactName.value = "";
    newContactNumber.value = "";
    saveState();
    renderContactManage();
    renderContactsDashboard();
    renderContactsTab();
  }

  addContactBtn.addEventListener("click", addContact);
  [newContactName, newContactNumber].forEach(function(el){
    el.addEventListener("keydown", function(e){
      if(e.key === "Enter"){ e.preventDefault(); addContact(); }
    });
  });

  // ======================================================
  // ---------- Stadsteam Backup (dashboard + tabblad) -----
  // ======================================================
  var stadsteamSearch = document.getElementById("stadsteamSearch");
  var stadsteamFilters = document.getElementById("stadsteamFilters");
  var stadsteamList = document.getElementById("stadsteamList");
  var stadsteamFilterBtns = stadsteamFilters.querySelectorAll(".filter-pill");
  var stadsteamActiveFilter = "alle";

  var stadsteamSearchTab = document.getElementById("stadsteamSearchTab");
  var stadsteamFiltersTab = document.getElementById("stadsteamFiltersTab");
  var stadsteamListTab = document.getElementById("stadsteamListTab");
  var stadsteamFilterBtnsTab = stadsteamFiltersTab.querySelectorAll(".filter-pill");
  var stadsteamActiveFilterTab = "alle";

  function filteredStadsteamBy(query, activeFilter){
    var q = (query || "").trim().toLowerCase();
    return state.stadsteam
      .filter(function(s){
        if(activeFilter !== "alle" && s.team !== activeFilter) return false;
        if(!q) return true;
        return s.name.toLowerCase().indexOf(q) !== -1 ||
               TEAM_LABELS[s.team].toLowerCase().indexOf(q) !== -1 ||
               (s.email || "").toLowerCase().indexOf(q) !== -1;
      })
      .sort(function(a, b){ return a.name.localeCompare(b.name, "nl"); });
  }

  function renderStadsteamListInto(targetEl, query, activeFilter){
    var list = filteredStadsteamBy(query, activeFilter);
    targetEl.innerHTML = "";

    if(list.length === 0){
      var empty = document.createElement("li");
      empty.className = "stadsteam-empty";
      empty.textContent = "Geen contacten gevonden.";
      targetEl.appendChild(empty);
      return;
    }

    list.forEach(function(s){
      var li = document.createElement("li");
      li.className = "stadsteam-item";

      var top = document.createElement("div");
      top.className = "stadsteam-item-top";

      var nameEl = document.createElement("span");
      nameEl.className = "stadsteam-name";
      nameEl.textContent = s.name;
      top.appendChild(nameEl);

      var teamEl = document.createElement("span");
      teamEl.className = "team-label team-" + s.team;
      teamEl.textContent = TEAM_LABELS[s.team];
      top.appendChild(teamEl);

      li.appendChild(top);

      var contactRow = document.createElement("div");
      contactRow.className = "stadsteam-item-contact";

      if(s.phone){
        var phoneEl = document.createElement("span");
        phoneEl.className = "stadsteam-text";
        phoneEl.textContent = s.phone;
        contactRow.appendChild(phoneEl);
      }
      if(s.email){
        var emailLink = document.createElement("a");
        emailLink.className = "stadsteam-link";
        emailLink.href = "mailto:" + s.email;
        emailLink.textContent = s.email;
        contactRow.appendChild(emailLink);
      }
      if(!s.phone && !s.email){
        var noContact = document.createElement("span");
        noContact.className = "stadsteam-link";
        noContact.style.color = "var(--text-faint)";
        noContact.textContent = "Geen telefoon/e-mail bekend";
        contactRow.appendChild(noContact);
      }

      li.appendChild(contactRow);
      targetEl.appendChild(li);
    });
  }

  function renderStadsteamList(){
    renderStadsteamListInto(stadsteamList, stadsteamSearch.value, stadsteamActiveFilter);
  }

  function renderStadsteamListTab(){
    renderStadsteamListInto(stadsteamListTab, stadsteamSearchTab.value, stadsteamActiveFilterTab);
  }

  stadsteamSearch.addEventListener("input", renderStadsteamList);

  stadsteamFilterBtns.forEach(function(btn){
    btn.addEventListener("click", function(){
      stadsteamActiveFilter = btn.getAttribute("data-team");
      stadsteamFilterBtns.forEach(function(b){ b.classList.toggle("active", b === btn); });
      renderStadsteamList();
    });
  });

  stadsteamSearchTab.addEventListener("input", renderStadsteamListTab);

  stadsteamFilterBtnsTab.forEach(function(btn){
    btn.addEventListener("click", function(){
      stadsteamActiveFilterTab = btn.getAttribute("data-team");
      stadsteamFilterBtnsTab.forEach(function(b){ b.classList.toggle("active", b === btn); });
      renderStadsteamListTab();
    });
  });

  // ---------- Stadsteam Backup beheren (Beheer tab, inline bewerkbaar) ----------
  var stadsteamManageList = document.getElementById("stadsteamManageList");
  var newStadsteamName = document.getElementById("newStadsteamName");
  var newStadsteamTeam = document.getElementById("newStadsteamTeam");
  var newStadsteamPhone = document.getElementById("newStadsteamPhone");
  var newStadsteamEmail = document.getElementById("newStadsteamEmail");
  var addStadsteamBtn = document.getElementById("addStadsteamBtn");
  var stadsteamEditingId = null;

  function renderStadsteamManage(){
    stadsteamManageList.innerHTML = "";
    if(state.stadsteam.length === 0){
      var empty = document.createElement("li");
      empty.className = "empty-note";
      empty.textContent = "Nog geen stadsteam-contacten toegevoegd.";
      stadsteamManageList.appendChild(empty);
      return;
    }

    state.stadsteam.slice().sort(function(a, b){ return a.name.localeCompare(b.name, "nl"); }).forEach(function(contact){
      var li = document.createElement("li");
      li.className = "manage-row";

      if(stadsteamEditingId === contact.id){
        var editWrap = document.createElement("div");
        editWrap.className = "edit-row";

        var nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.className = "f-main";
        nameInput.value = contact.name;
        nameInput.setAttribute("aria-label", "Naam");

        var teamSelect = document.createElement("select");
        TEAM_KEYS.forEach(function(key){
          var opt = document.createElement("option");
          opt.value = key;
          opt.textContent = TEAM_LABELS[key];
          if(key === contact.team) opt.selected = true;
          teamSelect.appendChild(opt);
        });

        var phoneInput = document.createElement("input");
        phoneInput.type = "tel";
        phoneInput.className = "f-side";
        phoneInput.placeholder = "Telefoon";
        phoneInput.value = contact.phone;

        var emailInput = document.createElement("input");
        emailInput.type = "email";
        emailInput.className = "f-side";
        emailInput.placeholder = "E-mail";
        emailInput.value = contact.email;

        editWrap.appendChild(nameInput);
        editWrap.appendChild(teamSelect);
        editWrap.appendChild(phoneInput);
        editWrap.appendChild(emailInput);
        li.appendChild(editWrap);

        var saveBtn = document.createElement("button");
        saveBtn.className = "remove-btn";
        saveBtn.type = "button";
        saveBtn.setAttribute("aria-label", "Opslaan");
        saveBtn.textContent = "✓";
        saveBtn.addEventListener("click", function(){
          contact.name = nameInput.value.trim();
          contact.team = teamSelect.value;
          contact.phone = phoneInput.value.trim();
          contact.email = emailInput.value.trim();
          stadsteamEditingId = null;
          saveState();
          renderStadsteamManage();
          renderStadsteamList();
          renderStadsteamListTab();
        });
        li.appendChild(saveBtn);

        var cancelBtn = document.createElement("button");
        cancelBtn.className = "remove-btn";
        cancelBtn.type = "button";
        cancelBtn.setAttribute("aria-label", "Annuleren");
        cancelBtn.textContent = "✕";
        cancelBtn.addEventListener("click", function(){
          stadsteamEditingId = null;
          renderStadsteamManage();
        });
        li.appendChild(cancelBtn);
      }else{
        var textEl = document.createElement("div");
        textEl.className = "manage-row-text";

        var nameSpan = document.createElement("span");
        nameSpan.className = "stadsteam-name";
        nameSpan.textContent = contact.name;
        textEl.appendChild(nameSpan);
        textEl.appendChild(document.createTextNode(" "));

        var teamSpan = document.createElement("span");
        teamSpan.className = "team-label team-" + contact.team;
        teamSpan.textContent = TEAM_LABELS[contact.team];
        textEl.appendChild(teamSpan);

        var detailParts = [];
        if(contact.phone) detailParts.push(contact.phone);
        if(contact.email) detailParts.push(contact.email);
        if(detailParts.length > 0){
          var detailSpan = document.createElement("span");
          detailSpan.style.color = "var(--text-faint)";
          detailSpan.style.fontSize = "12px";
          detailSpan.style.marginLeft = "8px";
          detailSpan.textContent = detailParts.join(" · ");
          textEl.appendChild(detailSpan);
        }

        li.appendChild(textEl);

        var editBtn = document.createElement("button");
        editBtn.className = "remove-btn";
        editBtn.type = "button";
        editBtn.setAttribute("aria-label", "Bewerken");
        editBtn.textContent = "✎";
        editBtn.addEventListener("click", function(){
          stadsteamEditingId = contact.id;
          renderStadsteamManage();
        });
        li.appendChild(editBtn);

        var removeBtn = document.createElement("button");
        removeBtn.className = "remove-btn";
        removeBtn.type = "button";
        removeBtn.setAttribute("aria-label", "Verwijderen");
        removeBtn.textContent = "✕";
        removeBtn.addEventListener("click", function(){
          state.stadsteam = state.stadsteam.filter(function(s){ return s.id !== contact.id; });
          if(stadsteamEditingId === contact.id) stadsteamEditingId = null;
          saveState();
          renderStadsteamManage();
          renderStadsteamList();
          renderStadsteamListTab();
        });
        li.appendChild(removeBtn);
      }

      stadsteamManageList.appendChild(li);
    });
  }

  function addStadsteamContact(){
    var name = newStadsteamName.value.trim();
    if(!name) return;
    state.stadsteam.push({
      id: uid("stads"),
      name: name,
      team: newStadsteamTeam.value,
      phone: newStadsteamPhone.value.trim(),
      email: newStadsteamEmail.value.trim()
    });
    newStadsteamName.value = "";
    newStadsteamPhone.value = "";
    newStadsteamEmail.value = "";
    newStadsteamTeam.value = "volwassenen";
    saveState();
    renderStadsteamManage();
    renderStadsteamList();
    renderStadsteamListTab();
  }

  addStadsteamBtn.addEventListener("click", addStadsteamContact);
  [newStadsteamName, newStadsteamPhone, newStadsteamEmail].forEach(function(el){
    el.addEventListener("keydown", function(e){
      if(e.key === "Enter"){ e.preventDefault(); addStadsteamContact(); }
    });
  });

  // ======================================================
  // ---------- Sancties: Officiële waarschuwingen ---------
  // ======================================================
  var warningsList = document.getElementById("warningsList");
  var warningsCountEl = document.getElementById("warningsCount");
  var newWarningResident = document.getElementById("newWarningResident");
  var newWarningDate = document.getElementById("newWarningDate");
  var newWarningLevel = document.getElementById("newWarningLevel");
  var newWarningNote = document.getElementById("newWarningNote");
  var addWarningBtn = document.getElementById("addWarningBtn");

  function refreshWarningResidentSelect(){
    if(!newWarningResident) return;
    var currentVal = newWarningResident.value;
    newWarningResident.innerHTML = "";
    var list = state.residents.slice().sort(function(a, b){ return a.name.localeCompare(b.name, "nl"); });
    list.forEach(function(r){
      var opt = document.createElement("option");
      opt.value = r.id;
      opt.textContent = r.name + (r.room ? " (Kamer " + r.room + ")" : "");
      newWarningResident.appendChild(opt);
    });
    if(list.some(function(r){ return r.id === currentVal; })) newWarningResident.value = currentVal;
  }

  function warningsForResident(residentId){
    return state.warnings.filter(function(w){ return w.residentId === residentId; });
  }

  function renderWarningsList(){
    var list = state.warnings.slice().sort(function(a, b){ return b.date < a.date ? -1 : (b.date > a.date ? 1 : 0); });
    warningsCountEl.textContent = String(list.length);
    warningsList.innerHTML = "";

    if(list.length === 0){
      var empty = document.createElement("li");
      empty.className = "empty-note";
      empty.textContent = "Nog geen waarschuwingen geregistreerd.";
      warningsList.appendChild(empty);
      return;
    }

    list.forEach(function(w){
      var resident = getResidentById(w.residentId);
      var li = document.createElement("li");
      li.className = "warning-row";
      li.id = "warning-" + w.id;

      var main = document.createElement("div");
      main.className = "warning-row-main";

      var top = document.createElement("div");
      top.className = "warning-row-top";

      var nameEl = document.createElement("span");
      nameEl.className = "warning-row-name";
      nameEl.textContent = resident ? resident.name : "(verwijderde bewoner)";
      top.appendChild(nameEl);

      var levelEl = document.createElement("span");
      levelEl.className = "warning-level-badge";
      levelEl.textContent = w.level;
      top.appendChild(levelEl);

      var dateEl = document.createElement("span");
      dateEl.className = "warning-row-date";
      dateEl.textContent = w.date;
      top.appendChild(dateEl);

      main.appendChild(top);

      if(w.note){
        var noteEl = document.createElement("div");
        noteEl.className = "warning-row-note";
        noteEl.textContent = w.note;
        main.appendChild(noteEl);
      }

      li.appendChild(main);

      var removeBtn = document.createElement("button");
      removeBtn.className = "remove-btn";
      removeBtn.type = "button";
      removeBtn.setAttribute("aria-label", "Waarschuwing verwijderen");
      removeBtn.textContent = "✕";
      removeBtn.addEventListener("click", function(){
        state.warnings = state.warnings.filter(function(x){ return x.id !== w.id; });
        saveState();
        renderWarningsList();
        renderResidentsFullList();
      });
      li.appendChild(removeBtn);

      warningsList.appendChild(li);
    });
  }

  function addWarning(){
    if(!newWarningResident.value) return;
    state.warnings.push({
      id: uid("warn"),
      residentId: newWarningResident.value,
      date: newWarningDate.value || todayISO(),
      level: newWarningLevel.value,
      note: newWarningNote.value.trim()
    });
    newWarningNote.value = "";
    saveState();
    renderWarningsList();
    renderResidentsFullList();
  }

  addWarningBtn.addEventListener("click", addWarning);
  newWarningNote.addEventListener("keydown", function(e){
    if(e.key === "Enter"){ e.preventDefault(); addWarning(); }
  });
  newWarningDate.value = todayISO();

  // ======================================================
  // ---------- Sancties: Pandverboden & Schorsingen -------
  // ======================================================
  var bansList = document.getElementById("bansList");
  var bansCountEl = document.getElementById("bansCount");
  var newBanName = document.getElementById("newBanName");
  var newBanClientnr = document.getElementById("newBanClientnr");
  var newBanReason = document.getElementById("newBanReason");
  var newBanUntilDate = document.getElementById("newBanUntilDate");
  var newBanUntilTime = document.getElementById("newBanUntilTime");
  var addBanBtn = document.getElementById("addBanBtn");

  function banUntilTimestamp(ban){
    if(!ban.untilDate) return null;
    return new Date(ban.untilDate + "T" + (ban.untilTime || "23:59") + ":00").getTime();
  }

  function isBanActive(ban){
    var ts = banUntilTimestamp(ban);
    if(ts === null) return true;
    return ts > Date.now();
  }

  function activeBanForName(name){
    var q = (name || "").trim().toLowerCase();
    if(!q) return null;
    return state.bans.filter(isBanActive).find(function(b){
      return b.name.toLowerCase().indexOf(q) !== -1 || q.indexOf(b.name.toLowerCase()) !== -1;
    }) || null;
  }

  function renderBansList(){
    var list = state.bans.slice().sort(function(a, b){
      var aActive = isBanActive(a), bActive = isBanActive(b);
      if(aActive !== bActive) return aActive ? -1 : 1;
      return a.name.localeCompare(b.name, "nl");
    });
    bansCountEl.textContent = String(list.length);
    bansList.innerHTML = "";

    if(list.length === 0){
      var empty = document.createElement("li");
      empty.className = "empty-note";
      empty.textContent = "Nog geen pandverboden of schorsingen geregistreerd.";
      bansList.appendChild(empty);
      return;
    }

    list.forEach(function(ban){
      var active = isBanActive(ban);
      var li = document.createElement("li");
      li.className = "ban-row" + (active ? " ban-active" : " ban-expired");

      var main = document.createElement("div");
      main.className = "ban-row-main";

      var top = document.createElement("div");
      top.className = "ban-row-top";

      var nameEl = document.createElement("span");
      nameEl.className = "ban-row-name";
      nameEl.textContent = ban.name;
      top.appendChild(nameEl);

            if(ban.clientnr){
        var zorgnedUrl = "https://utrecht.zorgned.nl/prod/applicatie/Regie?lcclientnr=" + encodeURIComponent(ban.clientnr) + "&section=1";
        var zorgnedLink = document.createElement("button");
        zorgnedLink.type = "button";
        zorgnedLink.className = "zorgned-badge";
        zorgnedLink.textContent = "ZorgNed ↗";
        zorgnedLink.addEventListener("click", function(){ openZorgNedLink(zorgnedUrl); });
        top.appendChild(zorgnedLink);
      }

      var statusBadge = document.createElement("span");
      statusBadge.className = active ? "ban-status-badge ban-status-active" : "ban-status-badge ban-status-expired";
      statusBadge.textContent = active ? "Actief" : "Verlopen";
      top.appendChild(statusBadge);

      main.appendChild(top);

      var reasonEl = document.createElement("div");
      reasonEl.className = "ban-row-reason";
      reasonEl.textContent = ban.reason || "(geen reden opgegeven)";
      main.appendChild(reasonEl);

      var untilEl = document.createElement("div");
      untilEl.className = "ban-row-until";
      untilEl.textContent = ban.untilDate
        ? ("Tot " + ban.untilDate + (ban.untilTime ? " " + ban.untilTime : ""))
        : "Geen einddatum bekend";
      main.appendChild(untilEl);

      li.appendChild(main);

      var removeBtn = document.createElement("button");
      removeBtn.className = "remove-btn";
      removeBtn.type = "button";
      removeBtn.setAttribute("aria-label", "Verbod verwijderen");
      removeBtn.textContent = "✕";
      removeBtn.addEventListener("click", function(){
        state.bans = state.bans.filter(function(x){ return x.id !== ban.id; });
        saveState();
        renderBansList();
      });
      li.appendChild(removeBtn);

      bansList.appendChild(li);
    });
  }

  function addBan(){
    var name = newBanName.value.trim();
    if(!name) return;
    state.bans.push({
      id: uid("ban"),
      name: name,
      clientnr: newBanClientnr.value.trim(),
      reason: newBanReason.value.trim(),
      untilDate: newBanUntilDate.value,
      untilTime: newBanUntilTime.value
    });
    newBanName.value = "";
    newBanClientnr.value = "";
    newBanReason.value = "";
    newBanUntilDate.value = "";
    newBanUntilTime.value = "";
    saveState();
    renderBansList();
  }

  addBanBtn.addEventListener("click", addBan);
  newBanReason.addEventListener("keydown", function(e){
    if(e.key === "Enter"){ e.preventDefault(); addBan(); }
  });

  // ---------- Agenda: helpers ----------
  function eventsForDate(iso){
    return state.events
      .filter(function(ev){ return ev.date === iso; })
      .slice()
      .sort(function(a, b){
        var at = a.time || "99:99";
        var bt = b.time || "99:99";
        return at < bt ? -1 : (at > bt ? 1 : 0);
      });
  }

  function countsByMonth(year, month){
    var counts = {};
    var prefix = year + "-" + pad2(month + 1);
    state.events.forEach(function(ev){
      if(ev.date.indexOf(prefix) === 0){
        counts[ev.date] = (counts[ev.date] || 0) + 1;
      }
    });
    return counts;
  }

  function buildAgendaRow(ev, includeRemove, onRemove){
    var row = document.createElement("div");

    var timeEl = document.createElement("span");
    timeEl.className = "agenda-time" + (ev.time ? "" : " notime");
    timeEl.textContent = ev.time ? ev.time : "heel de dag";
    row.appendChild(timeEl);

    var titleEl = document.createElement("span");
    titleEl.className = "agenda-title";
    titleEl.textContent = ev.title;
    row.appendChild(titleEl);

    if(ev.residentId){
      var resident = getResidentById(ev.residentId);
      if(resident){
        var tag = document.createElement("span");
        tag.className = "agenda-resident-tag";
        tag.textContent = resident.name;
        row.appendChild(tag);
      }
    }

    if(includeRemove){
      var removeBtn = document.createElement("button");
      removeBtn.className = "remove-btn";
      removeBtn.type = "button";
      removeBtn.setAttribute("aria-label", "Afspraak verwijderen");
      removeBtn.textContent = "✕";
      removeBtn.addEventListener("click", onRemove);
      row.appendChild(removeBtn);
    }

    return row;
  }

  // ---------- Agenda vandaag (compact, Dashboard) ----------
  var agendaTodayList = document.getElementById("agendaTodayList");
  var agendaTodayCount = document.getElementById("agendaTodayCount");
  var goToAgendaBtn = document.getElementById("goToAgendaBtn");
  var newTodayEventHour = document.getElementById("newTodayEventHour");
  var newTodayEventMinute = document.getElementById("newTodayEventMinute");
  var newTodayEventTitle = document.getElementById("newTodayEventTitle");
  var addTodayEventBtn = document.getElementById("addTodayEventBtn");
  buildHourOptions(newTodayEventHour);
  newTodayEventHour.addEventListener("change", function(){ syncMinuteDisabled(newTodayEventHour, newTodayEventMinute); });
  syncMinuteDisabled(newTodayEventHour, newTodayEventMinute);

  function renderAgendaToday(){
    var today = todayISO();
    var todays = eventsForDate(today);
    agendaTodayCount.textContent = todays.length + (todays.length === 1 ? " afspraak" : " afspraken");
    agendaTodayList.innerHTML = "";

    if(todays.length === 0){
      var empty = document.createElement("div");
      empty.className = "agenda-empty";
      empty.textContent = "Geen afspraken gepland voor vandaag.";
      agendaTodayList.appendChild(empty);
      return;
    }

    todays.forEach(function(ev){
      var li = document.createElement("li");
      li.className = "agenda-mini-item";
      var row = buildAgendaRow(ev, false, null);
      while(row.firstChild) li.appendChild(row.firstChild);
      agendaTodayList.appendChild(li);
    });
  }

  function addTodayEvent(){
    var title = newTodayEventTitle.value.trim();
    if(!title) return;
    state.events.push({
      id: uid("ev"),
      date: todayISO(),
      time: readTimeFromSelects(newTodayEventHour, newTodayEventMinute),
      title: title,
      residentId: newTodayEventResident.value || null
    });
    newTodayEventTitle.value = "";
    resetTimeSelects(newTodayEventHour, newTodayEventMinute);
    newTodayEventResident.value = "";
    saveState();
    renderAgendaToday();
    if(state.agendaSelectedDate === todayISO()) renderDayView();
    renderMonthView();
  }

  addTodayEventBtn.addEventListener("click", addTodayEvent);
  newTodayEventTitle.addEventListener("keydown", function(e){
    if(e.key === "Enter"){ e.preventDefault(); addTodayEvent(); }
  });

  goToAgendaBtn.addEventListener("click", function(){
    var today = todayISO();
    state.agendaSelectedDate = today;
    state.agendaView = "day";
    saveState();
    activateTab("agenda");
    renderAgendaViewSwitch();
    renderDayView();
  });

  // ---------- Agenda tab: view switch ----------
  var viewBtnMonth = document.getElementById("viewBtnMonth");
  var viewBtnDay = document.getElementById("viewBtnDay");
  var monthViewEl = document.getElementById("monthView");
  var dayViewEl = document.getElementById("dayView");

  function renderAgendaViewSwitch(){
    var isMonth = state.agendaView === "month";
    viewBtnMonth.classList.toggle("active", isMonth);
    viewBtnDay.classList.toggle("active", !isMonth);
    monthViewEl.style.display = isMonth ? "block" : "none";
    dayViewEl.style.display = isMonth ? "none" : "block";
  }

  viewBtnMonth.addEventListener("click", function(){
    state.agendaView = "month";
    var parts = state.agendaSelectedDate.split("-");
    state.calYear = parseInt(parts[0], 10);
    state.calMonth = parseInt(parts[1], 10) - 1;
    saveState();
    renderAgendaViewSwitch();
    renderMonthView();
  });

  viewBtnDay.addEventListener("click", function(){
    state.agendaView = "day";
    saveState();
    renderAgendaViewSwitch();
    renderDayView();
  });

  // ---------- Maandweergave ----------
  var calGrid = document.getElementById("calGrid");
  var calMonthLabel = document.getElementById("calMonthLabel");
  var calPrevBtn = document.getElementById("calPrevBtn");
  var calNextBtn = document.getElementById("calNextBtn");

  function renderMonthView(){
    var year = state.calYear;
    var month = state.calMonth;
    var today = todayISO();

    calMonthLabel.textContent = months[month].charAt(0).toUpperCase() + months[month].slice(1) + " " + year;

    var firstOfMonth = new Date(year, month, 1);
    var jsFirstDay = firstOfMonth.getDay();
    var leading = (jsFirstDay + 6) % 7;
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var counts = countsByMonth(year, month);

    calGrid.innerHTML = "";

    for(var i = 0; i < leading; i++){
      var blank = document.createElement("div");
      blank.className = "cal-cell empty";
      calGrid.appendChild(blank);
    }

    for(var d = 1; d <= daysInMonth; d++){
      var iso = isoOf(year, month, d);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cal-cell";
      if(iso === today) btn.classList.add("today");
      if(iso === state.agendaSelectedDate) btn.classList.add("selected");

      var numSpan = document.createElement("span");
      numSpan.textContent = d;
      btn.appendChild(numSpan);

      var count = counts[iso] || 0;
      if(count > 0){
        var dotSpan = document.createElement("span");
        dotSpan.className = "cal-dot" + (count > 1 ? " multi" : "");
        if(count > 1) dotSpan.textContent = count;
        btn.appendChild(dotSpan);
      }

      (function(iso){
        btn.addEventListener("click", function(){
          state.agendaSelectedDate = iso;
          state.agendaView = "day";
          saveState();
          renderAgendaViewSwitch();
          renderDayView();
          renderMonthView();
        });
      })(iso);

      calGrid.appendChild(btn);
    }
  }

  calPrevBtn.addEventListener("click", function(){
    state.calMonth -= 1;
    if(state.calMonth < 0){ state.calMonth = 11; state.calYear -= 1; }
    saveState();
    renderMonthView();
  });

  calNextBtn.addEventListener("click", function(){
    state.calMonth += 1;
    if(state.calMonth > 11){ state.calMonth = 0; state.calYear += 1; }
    saveState();
    renderMonthView();
  });

  // ---------- Dagweergave ----------
  var dayLabel = document.getElementById("dayLabel");
  var dayAgendaList = document.getElementById("dayAgendaList");
  var dayPrevBtn = document.getElementById("dayPrevBtn");
  var dayNextBtn = document.getElementById("dayNextBtn");
  var backToMonthBtn = document.getElementById("backToMonthBtn");
  var newDayEventHour = document.getElementById("newDayEventHour");
  var newDayEventMinute = document.getElementById("newDayEventMinute");
  var newDayEventTitle = document.getElementById("newDayEventTitle");
  var addDayEventBtn = document.getElementById("addDayEventBtn");
  buildHourOptions(newDayEventHour);
  newDayEventHour.addEventListener("change", function(){ syncMinuteDisabled(newDayEventHour, newDayEventMinute); });
  syncMinuteDisabled(newDayEventHour, newDayEventMinute);

  function renderDayView(){
    var iso = state.agendaSelectedDate;
    var isToday = iso === todayISO();

    dayLabel.textContent = (isToday ? "Vandaag — " : "") + formatDateLabel(iso);
    dayLabel.classList.toggle("today-label", isToday);

    var items = eventsForDate(iso);
    dayAgendaList.innerHTML = "";

    if(items.length === 0){
      var empty = document.createElement("div");
      empty.className = "agenda-empty";
      empty.textContent = "Geen afspraken op deze dag.";
      dayAgendaList.appendChild(empty);
    }else{
      items.forEach(function(ev){
        var row = buildAgendaRow(ev, true, function(){
          state.events = state.events.filter(function(e){ return e.id !== ev.id; });
          saveState();
          renderDayView();
          renderAgendaToday();
          renderMonthView();
        });
        row.className = "day-agenda-item";
        dayAgendaList.appendChild(row);
      });
    }
  }

  function addDayEvent(){
    var title = newDayEventTitle.value.trim();
    if(!title) return;
    state.events.push({
      id: uid("ev"),
      date: state.agendaSelectedDate,
      time: readTimeFromSelects(newDayEventHour, newDayEventMinute),
      title: title,
      residentId: newDayEventResident.value || null
    });
    newDayEventTitle.value = "";
    resetTimeSelects(newDayEventHour, newDayEventMinute);
    newDayEventResident.value = "";
    saveState();
    renderDayView();
    renderAgendaToday();
    renderMonthView();
  }

  addDayEventBtn.addEventListener("click", addDayEvent);
  newDayEventTitle.addEventListener("keydown", function(e){
    if(e.key === "Enter"){ e.preventDefault(); addDayEvent(); }
  });

  dayPrevBtn.addEventListener("click", function(){
    state.agendaSelectedDate = shiftDateISO(state.agendaSelectedDate, -1);
    saveState();
    renderDayView();
  });

  dayNextBtn.addEventListener("click", function(){
    state.agendaSelectedDate = shiftDateISO(state.agendaSelectedDate, 1);
    saveState();
    renderDayView();
  });

  backToMonthBtn.addEventListener("click", function(){
    state.agendaView = "month";
    var parts = state.agendaSelectedDate.split("-");
    state.calYear = parseInt(parts[0], 10);
    state.calMonth = parseInt(parts[1], 10) - 1;
    saveState();
    renderAgendaViewSwitch();
    renderMonthView();
  });

  // ======================================================
  // ---------- Gegevensbeheer & back-up -------------------
  // ======================================================
  var exportDataBtn = document.getElementById("exportDataBtn");
  var importToggleBtn = document.getElementById("importToggleBtn");
  var importPanel = document.getElementById("importPanel");
  var importTextarea = document.getElementById("importTextarea");
  var importConfirmBtn = document.getElementById("importConfirmBtn");
  var importCancelBtn = document.getElementById("importCancelBtn");
  var dataMsg = document.getElementById("dataMsg");
  var dataMsgTimer = null;

  function showDataMsg(text, persist){
    dataMsg.textContent = text;
    if(dataMsgTimer) clearTimeout(dataMsgTimer);
    if(!persist){
      dataMsgTimer = setTimeout(function(){ dataMsg.textContent = ""; }, 3200);
    }
  }

  function copyToClipboard(text){
    if(navigator.clipboard && navigator.clipboard.writeText){
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function(resolve, reject){
      try{
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        var ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if(ok) resolve(); else reject(new Error("copy failed"));
      }catch(e){ reject(e); }
    });
  }

  exportDataBtn.addEventListener("click", function(){
    var json = JSON.stringify(state, null, 2);
    copyToClipboard(json).then(function(){
      showDataMsg("Gekopieerd naar klembord!");
    }).catch(function(){
      importPanel.style.display = "block";
      importTextarea.value = json;
      importTextarea.focus();
      importTextarea.select();
      showDataMsg("Automatisch kopiëren niet gelukt — selecteer en kopieer de tekst hieronder handmatig.", true);
    });
  });

  importToggleBtn.addEventListener("click", function(){
    importPanel.style.display = "block";
    importTextarea.value = "";
    importTextarea.focus();
    showDataMsg("");
  });

  importCancelBtn.addEventListener("click", function(){
    importPanel.style.display = "none";
    importTextarea.value = "";
    showDataMsg("");
  });

  importConfirmBtn.addEventListener("click", function(){
    var raw = importTextarea.value.trim();
    if(!raw){ showDataMsg("Plak eerst de geëxporteerde JSON-tekst hierboven."); return; }
    var parsed;
    try{
      parsed = JSON.parse(raw);
    }catch(e){
      showDataMsg("Ongeldige JSON — controleer de geplakte tekst.");
      return;
    }
    state = normalizeLoadedData(parsed);
    saveState();
    renderAll();
    importPanel.style.display = "none";
    importTextarea.value = "";
    showDataMsg("Gegevens hersteld.");
  });

  // ---------- Reset ----------
  var resetBtn = document.getElementById("resetBtn");
  var modalOverlay = document.getElementById("modalOverlay");
  var modalCancel = document.getElementById("modalCancel");
  var modalConfirm = document.getElementById("modalConfirm");

  resetBtn.addEventListener("click", function(){ modalOverlay.classList.add("open"); });
  modalCancel.addEventListener("click", function(){ modalOverlay.classList.remove("open"); });
  modalOverlay.addEventListener("click", function(e){
    if(e.target === modalOverlay) modalOverlay.classList.remove("open");
  });

  modalConfirm.addEventListener("click", function(){
    state.handoverNote = "";
    state.tasks.forEach(function(t){ t.done = false; });
    state.residents.forEach(function(r){ r.status = "unseen"; r.note = ""; });
    state.dashboardSelectedResidentId = null;

    saveState();
    handoverEl.value = "";
    residentSearch.value = "";
    updateClearButtonVisibility();
    renderTasks();
    renderResidentSummary();
    renderResidentDetail();
    renderResidentManage();
    if(residentDropdown.classList.contains("open")) renderResidentDropdown();
    renderResidentsFullList();
    renderAandachtCard();
    modalOverlay.classList.remove("open");
  });

  // ---------- Init / volledige herrender (ook na import) ----------
  function renderAll(){
    handoverEl.value = state.handoverNote;
    residentSearch.value = "";
    updateClearButtonVisibility();
    closeDropdown();
    sortDropdownLabel.textContent = state.dashboardSort === "kamer" ? "Kamer" : "Naam";
    sortDropdownOptions.forEach(function(opt){
      opt.classList.toggle("active", opt.getAttribute("data-sort") === state.dashboardSort);
    });
    closeSortDropdown();

    renderTasks();
    renderResidentSummary();
    renderResidentDetail();
    renderResidentManage();
    refreshResidentSelects();
    renderResidentsFullList();
    renderAandachtCard();
    renderContactsDashboard();
    renderContactManage();
    renderContactsTab();
    renderStadsteamList();
    renderStadsteamManage();
    renderStadsteamListTab();
    refreshWarningResidentSelect();
    renderWarningsList();
    renderBansList();
    applyAllPanelStates();
    renderAgendaToday();
    renderAgendaViewSwitch();
    renderMonthView();
    renderDayView();
  }

  renderAll();

})();
