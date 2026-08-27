/**
 * =========================================================================
 * PORRA QUINIELA LALIGA 1X2 - JAVASCRIPT FRONTEND (v3.1)
 * Sistema: Cada jornada tiene 3 partidos.
 * Puntuación: 1 acierto = 1 pt | 2 aciertos = 3 pts | 3 aciertos (Pleno) = 5 pts
 * Privacidad: Los pronósticos de los demás jugadores permanecen ocultos (🔒)
 * =========================================================================
 */

// ⚠️ PEGA AQUÍ LA URL DE TU APLICACIÓN WEB DE GOOGLE APPS SCRIPT:
// Ejemplo: "https://script.google.com/macros/s/AKfycbx.../exec"
const GOOGLE_SCRIPT_URL = "";

// Usuario Administrador Base
const DEFAULT_ADMIN = {
  id: "admin_user",
  username: "admin",
  password: "admin123",
  name: "Administrador",
  avatar: "👑",
  role: "admin"
};

// Jornadas de ejemplo iniciales (3 partidos por jornada)
const DEFAULT_JORNADAS = [
  {
    id: "j1",
    name: "Jornada 1",
    matches: [
      { id: "m1_1", local: "Real Madrid", visitor: "Barcelona", date: "Sábado 21:00", signResult: "1" },
      { id: "m1_2", local: "Atlético de Madrid", visitor: "Athletic Club", date: "Sábado 18:30", signResult: "X" },
      { id: "m1_3", local: "Real Sociedad", visitor: "Villarreal", date: "Domingo 16:15", signResult: "1" }
    ]
  },
  {
    id: "j2",
    name: "Jornada 2",
    matches: [
      { id: "m2_1", local: "Sevilla", visitor: "Real Betis", date: "Sábado 21:00", signResult: "2" },
      { id: "m2_2", local: "Valencia", visitor: "Celta de Vigo", date: "Domingo 18:30", signResult: "1" },
      { id: "m2_3", local: "Girona", visitor: "Osasuna", date: "Domingo 21:00", signResult: "1" }
    ]
  },
  {
    id: "j3",
    name: "Jornada 3",
    matches: [
      { id: "m3_1", local: "Rayo Vallecano", visitor: "Getafe", date: "Sábado 16:15", signResult: null },
      { id: "m3_2", local: "Mallorca", visitor: "Las Palmas", date: "Sábado 18:30", signResult: null },
      { id: "m3_3", local: "Deportivo Alavés", visitor: "Espanyol", date: "Domingo 21:00", signResult: null }
    ]
  }
];

// Estado global en memoria
let state = {
  users: [
    DEFAULT_ADMIN,
    { id: "u_carlos", username: "carlos", password: "1234", name: "Carlos", avatar: "🦁", role: "player" },
    { id: "u_laura", username: "laura", password: "1234", name: "Laura", avatar: "⚡", role: "player" },
    { id: "u_mikel", username: "mikel", password: "1234", name: "Mikel", avatar: "🎯", role: "player" }
  ],
  jornadas: [...DEFAULT_JORNADAS],
  selectedJornadaId: "j1",
  predictions: {
    "u_carlos": {
      "j1": { "m1_1": "1", "m1_2": "X", "m1_3": "1" },
      "j2": { "m2_1": "1", "m2_2": "1", "m2_3": "1" },
      "j3": { "m3_1": "1", "m3_2": "X", "m3_3": "1" }
    },
    "u_laura": {
      "j1": { "m1_1": "1", "m1_2": "1", "m1_3": "1" },
      "j2": { "m2_1": "2", "m2_2": "1", "m2_3": "1" },
      "j3": { "m3_1": "X", "m3_2": "1", "m3_3": "2" }
    },
    "u_mikel": {
      "j1": { "m1_1": "2", "m1_2": "X", "m1_3": "2" },
      "j2": { "m2_1": "X", "m2_2": "X", "m2_3": "1" },
      "j3": { "m3_1": "1", "m3_2": "1", "m3_3": "1" }
    }
  }
};

let currentUser = null;

// ==================== INICIALIZACIÓN ====================
document.addEventListener("DOMContentLoaded", () => {
  try {
    loadLocalState();
    initAuthUI();
    initTabsUI();
    initAppEventListeners();
    checkCurrentSession();
    testAndSyncGoogleSheets();
  } catch (err) {
    console.error("Error en inicialización:", err);
  }
});

function setSyncLoading(show, text = "Sincronizando...") {
  const loader = document.getElementById("sync-loader");
  const loaderText = document.getElementById("sync-loader-text");
  if (loader && loaderText) {
    loaderText.textContent = text;
    loader.style.display = show ? "flex" : "none";
  }
}

function updateConnectionBadge(type, message) {
  const badge = document.getElementById("connection-status-badge");
  if (!badge) return;

  badge.className = "connection-badge";
  if (type === "connected") {
    badge.classList.add("status-connected");
    badge.innerHTML = `<span>🟢 Google Sheets Conectado</span>`;
  } else if (type === "local") {
    badge.classList.add("status-local");
    badge.innerHTML = `<span>🟡 Modo Local Activo (${message || 'Listo'})</span>`;
  } else {
    badge.classList.add("status-checking");
    badge.innerHTML = `<span>🔄 Comprobando conexión...</span>`;
  }
}

function loadLocalState() {
  const saved = localStorage.getItem("quiniela_laliga_state_jornadas");
  if (saved) {
    try {
      state = JSON.parse(saved);
    } catch (e) {
      console.warn("Error parseando local state:", e);
    }
  }

  if (!state.users || !Array.isArray(state.users) || state.users.length === 0) {
    state.users = [DEFAULT_ADMIN];
  } else if (!state.users.some(u => String(u.username).toLowerCase() === "admin")) {
    state.users.unshift(DEFAULT_ADMIN);
  }

  if (!state.jornadas || !Array.isArray(state.jornadas) || state.jornadas.length === 0) {
    state.jornadas = JSON.parse(JSON.stringify(DEFAULT_JORNADAS));
  }

  if (!state.selectedJornadaId || !state.jornadas.some(j => j.id === state.selectedJornadaId)) {
    state.selectedJornadaId = state.jornadas[0].id;
  }

  if (!state.predictions || typeof state.predictions !== "object") {
    state.predictions = {};
  }

  saveLocalState();
}

function saveLocalState() {
  try {
    localStorage.setItem("quiniela_laliga_state_jornadas", JSON.stringify(state));
  } catch (e) {
    console.error("No se pudo guardar en localStorage:", e);
  }
}

async function testAndSyncGoogleSheets() {
  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.trim() === "") {
    updateConnectionBadge("local", "URL de Sheets pendiente");
    return;
  }

  try {
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getState`, {
      method: "GET",
      mode: "cors",
      redirect: "follow"
    });

    const json = await res.json();
    if (json && json.success && json.data) {
      updateConnectionBadge("connected");

      if (json.data.users && json.data.users.length > 0) {
        state.users = json.data.users;
      }
      if (!state.users.some(u => String(u.username).toLowerCase() === "admin")) {
        state.users.unshift(DEFAULT_ADMIN);
      }

      if (json.data.jornadas && json.data.jornadas.length > 0) {
        state.jornadas = json.data.jornadas;
      }

      if (json.data.predictions) {
        state.predictions = json.data.predictions;
      }

      if (!state.jornadas.some(j => j.id === state.selectedJornadaId)) {
        state.selectedJornadaId = state.jornadas[0].id;
      }

      saveLocalState();
      renderJornadaSelector();
      if (currentUser) renderAllViews();
    } else {
      updateConnectionBadge("local", "Google Sheets no devolvió datos válidos");
    }
  } catch (e) {
    console.warn("Aviso de conexión a Google Sheets:", e);
    updateConnectionBadge("local", "Operando en modo local");
  }
}

async function sendToCloud(action, payload = {}) {
  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.trim() === "") {
    saveLocalState();
    return { success: true };
  }

  setSyncLoading(true, "Guardando en Google Sheets...");
  try {
    const res = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action, ...payload }),
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      redirect: "follow"
    });

    const json = await res.json();
    if (json && json.success) {
      if (json.data) {
        state.jornadas = json.data.jornadas || state.jornadas;
        state.users = json.data.users || state.users;
        state.predictions = json.data.predictions || state.predictions;
        if (!state.users.some(u => String(u.username).toLowerCase() === "admin")) {
          state.users.unshift(DEFAULT_ADMIN);
        }
        saveLocalState();
      }
      return json;
    }
  } catch (errPost) {
    console.warn("POST a Google Sheets falló, guardando localmente:", errPost);
    saveLocalState();
  } finally {
    setSyncLoading(false);
  }
  return { success: true };
}

// ==================== REGLA DE PUNTOS ====================
function getPointsFromHits(hitsCount) {
  if (hitsCount >= 3) return 5;
  if (hitsCount === 2) return 3;
  if (hitsCount === 1) return 1;
  return 0;
}

function evaluateUserJornada(userId, jornada) {
  const userPreds = (state.predictions[userId] && state.predictions[userId][jornada.id]) || {};
  let hits = 0;
  let matchesWithResult = 0;

  jornada.matches.forEach(m => {
    if (m.signResult !== null && m.signResult !== "") {
      matchesWithResult++;
      const userSign = userPreds[m.id];
      if (userSign && String(userSign).trim() === String(m.signResult).trim()) {
        hits++;
      }
    }
  });

  const points = getPointsFromHits(hits);
  const isFinished = matchesWithResult === 3;

  return {
    hits,
    points,
    matchesWithResult,
    isFinished,
    isPleno: hits === 3,
    isDoble: hits === 2,
    isSimple: hits === 1
  };
}

// ==================== SESIÓN Y LOGIN ====================
function checkCurrentSession() {
  const sessionUser = sessionStorage.getItem("quiniela_active_user");
  if (sessionUser) {
    try {
      const userObj = JSON.parse(sessionUser);
      const found = state.users.find(u => String(u.username).toLowerCase() === String(userObj.username).toLowerCase());
      if (found) {
        loginUserSuccess(found);
        return;
      }
    } catch (e) {
      console.error("Error sesión:", e);
    }
  }
  showAuthScreen();
}

function showAuthScreen() {
  currentUser = null;
  sessionStorage.removeItem("quiniela_active_user");
  const authScreen = document.getElementById("auth-screen");
  const appContainer = document.getElementById("app-container");
  if (authScreen) authScreen.style.display = "flex";
  if (appContainer) appContainer.style.display = "none";
}

function loginUserSuccess(user) {
  currentUser = user;
  sessionStorage.setItem("quiniela_active_user", JSON.stringify(user));

  const authScreen = document.getElementById("auth-screen");
  const appContainer = document.getElementById("app-container");
  if (authScreen) authScreen.style.display = "none";
  if (appContainer) appContainer.style.display = "flex";

  const avatarEl = document.getElementById("header-user-avatar");
  const nameEl = document.getElementById("header-user-name");
  const roleBadge = document.getElementById("header-user-role");

  if (avatarEl) avatarEl.textContent = user.avatar || "👤";
  if (nameEl) nameEl.textContent = user.name;
  
  if (roleBadge) {
    if (user.role === "admin") {
      roleBadge.textContent = "👑 ADMINISTRADOR";
      roleBadge.className = "user-badge-role admin";
      document.querySelectorAll(".admin-only").forEach(el => el.style.display = "block");
    } else {
      roleBadge.textContent = "⚽ JUGADOR";
      roleBadge.className = "user-badge-role";
      document.querySelectorAll(".admin-only").forEach(el => el.style.display = "none");
    }
  }

  renderJornadaSelector();
  switchTab("tab-clasificacion");
  renderAllViews();
  showToast(`¡Bienvenido/a, ${user.name}!`);
}

function executeLogin() {
  const usernameInput = document.getElementById("login-username");
  const passwordInput = document.getElementById("login-password");
  
  const username = usernameInput ? usernameInput.value.trim().toLowerCase() : "";
  const password = passwordInput ? passwordInput.value.trim() : "";

  if (!username || !password) {
    alert("Por favor, escribe usuario y contraseña.");
    return;
  }

  if (username === "admin" && (password === "admin123" || password === "admin")) {
    const adminUser = state.users.find(u => String(u.username).toLowerCase() === "admin") || DEFAULT_ADMIN;
    if (usernameInput) usernameInput.value = "";
    if (passwordInput) passwordInput.value = "";
    loginUserSuccess(adminUser);
    return;
  }

  const user = state.users.find(u => String(u.username).toLowerCase() === username && String(u.password).trim() === password);

  if (user) {
    if (usernameInput) usernameInput.value = "";
    if (passwordInput) passwordInput.value = "";
    loginUserSuccess(user);
  } else {
    alert("❌ Usuario o contraseña incorrectos. Por favor, verifica tus datos o regístrate en la pestaña superior.");
  }
}

function executeRegister() {
  const usernameInput = document.getElementById("reg-username");
  const nameInput = document.getElementById("reg-name");
  const avatarInput = document.getElementById("reg-avatar");
  const passwordInput = document.getElementById("reg-password");

  const username = usernameInput ? usernameInput.value.trim().toLowerCase() : "";
  const name = nameInput ? nameInput.value.trim() : "";
  const avatar = avatarInput ? (avatarInput.value.trim() || "👤") : "👤";
  const password = passwordInput ? passwordInput.value.trim() : "";

  if (!username || !name || !password) {
    alert("Por favor, rellena todos los campos.");
    return;
  }

  if (state.users.some(u => String(u.username).toLowerCase() === username)) {
    alert("⚠️ Ese usuario ya existe. Prueba con otro.");
    return;
  }

  const newUser = {
    id: "u_" + Date.now(),
    username,
    password,
    name,
    avatar,
    role: "player"
  };

  state.users.push(newUser);
  if (!state.predictions[newUser.id]) {
    state.predictions[newUser.id] = {};
  }
  saveLocalState();

  if (usernameInput) usernameInput.value = "";
  if (nameInput) nameInput.value = "";
  if (passwordInput) passwordInput.value = "";

  loginUserSuccess(newUser);
  showToast("✨ ¡Cuenta registrada con éxito!");

  sendToCloud("registerUser", { user: newUser });
}

function initAuthUI() {
  const tabLoginBtn = document.getElementById("tab-login-btn");
  const tabRegBtn = document.getElementById("tab-register-btn");
  const formLogin = document.getElementById("form-login");
  const formReg = document.getElementById("form-register");

  if (tabLoginBtn && tabRegBtn && formLogin && formReg) {
    tabLoginBtn.addEventListener("click", () => {
      tabLoginBtn.classList.add("active");
      tabRegBtn.classList.remove("active");
      formLogin.style.display = "flex";
      formReg.style.display = "none";
    });

    tabRegBtn.addEventListener("click", () => {
      tabRegBtn.classList.add("active");
      tabLoginBtn.classList.remove("active");
      formReg.style.display = "flex";
      formLogin.style.display = "none";
    });
  }

  const btnLogin = document.getElementById("btn-login-submit");
  if (btnLogin) btnLogin.addEventListener("click", executeLogin);

  const btnReg = document.getElementById("btn-reg-submit");
  if (btnReg) btnReg.addEventListener("click", executeRegister);

  const inputs = document.querySelectorAll("#form-login input, #form-register input");
  inputs.forEach(inp => {
    inp.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        if (inp.closest("#form-login")) executeLogin();
        else executeRegister();
      }
    });
  });

  const btnLogout = document.getElementById("btn-logout");
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      if (confirm("¿Cerrar sesión?")) {
        showAuthScreen();
        showToast("Sesión cerrada");
      }
    });
  }
}

// ==================== SELECTOR DE JORNADAS ====================
function renderJornadaSelector() {
  const select = document.getElementById("select-active-jornada");
  if (!select) return;
  select.innerHTML = "";

  if (!state.jornadas || state.jornadas.length === 0) {
    select.innerHTML = `<option value="">Sin jornadas creadas</option>`;
    return;
  }

  state.jornadas.forEach(j => {
    const opt = document.createElement("option");
    opt.value = j.id;
    opt.textContent = `⚽ ${j.name}`;
    if (j.id === state.selectedJornadaId) opt.selected = true;
    select.appendChild(opt);
  });

  select.onchange = (e) => {
    state.selectedJornadaId = e.target.value;
    saveLocalState();
    renderAllViews();
  };
}

function getActiveJornada() {
  if (!state.jornadas || state.jornadas.length === 0) return null;
  return state.jornadas.find(j => j.id === state.selectedJornadaId) || state.jornadas[0];
}

// ==================== TABS Y NAVEGACIÓN ====================
function initTabsUI() {
  const tabButtons = document.querySelectorAll(".tabs-nav .tab-btn");
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetTabId = btn.getAttribute("data-tab");
      switchTab(targetTabId);
    });
  });
}

function switchTab(tabId) {
  const tabButtons = document.querySelectorAll(".tabs-nav .tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach(b => {
    if (b.getAttribute("data-tab") === tabId) b.classList.add("active");
    else b.classList.remove("active");
  });

  tabContents.forEach(c => {
    if (c.id === tabId) c.classList.add("active");
    else c.classList.remove("active");
  });

  renderAllViews();
}

// ==================== EVENT LISTENERS ====================
function initAppEventListeners() {
  const btnRefresh = document.getElementById("btn-refresh-data");
  if (btnRefresh) {
    btnRefresh.addEventListener("click", async () => {
      await testAndSyncGoogleSheets();
      renderAllViews();
      showToast("🔄 Datos actualizados");
    });
  }

  const btnExport = document.getElementById("btn-export-wa");
  if (btnExport) btnExport.addEventListener("click", exportRankingWhatsApp);

  const btnSavePreds = document.getElementById("btn-save-pronosticos");
  if (btnSavePreds) btnSavePreds.addEventListener("click", saveMyQuiniela);

  const btnRand = document.getElementById("btn-random-fill");
  if (btnRand) btnRand.addEventListener("click", randomFillMyQuiniela);

  const btnClear = document.getElementById("btn-clear-my-preds");
  if (btnClear) btnClear.addEventListener("click", clearMyQuiniela);

  const btnSaveResults = document.getElementById("btn-save-real-results");
  if (btnSaveResults) btnSaveResults.addEventListener("click", saveAdminRealResults);

  // Form Crear Nueva Jornada de 3 partidos (Admin)
  const formCreateJornada = document.getElementById("form-create-jornada");
  if (formCreateJornada) {
    formCreateJornada.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!currentUser || currentUser.role !== "admin") return;

      const jName = document.getElementById("new-jornada-name").value.trim();
      const m1Local = document.getElementById("m1-local").value.trim();
      const m1Visitor = document.getElementById("m1-visitor").value.trim();
      const m1Date = document.getElementById("m1-date").value.trim();

      const m2Local = document.getElementById("m2-local").value.trim();
      const m2Visitor = document.getElementById("m2-visitor").value.trim();
      const m2Date = document.getElementById("m2-date").value.trim();

      const m3Local = document.getElementById("m3-local").value.trim();
      const m3Visitor = document.getElementById("m3-visitor").value.trim();
      const m3Date = document.getElementById("m3-date").value.trim();

      if (!jName || !m1Local || !m1Visitor || !m2Local || !m2Visitor || !m3Local || !m3Visitor) {
        alert("Por favor completa los nombres de los 3 partidos.");
        return;
      }

      const jId = "j_" + Date.now();
      const newJornada = {
        id: jId,
        name: jName,
        matches: [
          { id: `${jId}_m1`, local: m1Local, visitor: m1Visitor, date: m1Date || "Por determinar", signResult: null },
          { id: `${jId}_m2`, local: m2Local, visitor: m2Visitor, date: m2Date || "Por determinar", signResult: null },
          { id: `${jId}_m3`, local: m3Local, visitor: m3Visitor, date: m3Date || "Por determinar", signResult: null }
        ]
      };

      state.jornadas.push(newJornada);
      state.selectedJornadaId = newJornada.id;
      saveLocalState();
      renderJornadaSelector();
      renderAllViews();
      showToast(`¡${jName} creada con sus 3 partidos!`);

      formCreateJornada.reset();
      await sendToCloud("createJornada", { jornada: newJornada });
    });
  }

  // Demo Jornadas (Admin)
  const btnAdminDemo = document.getElementById("btn-admin-demo");
  if (btnAdminDemo) {
    btnAdminDemo.addEventListener("click", async () => {
      if (!currentUser || currentUser.role !== "admin") return;
      if (confirm("¿Cargar las 3 jornadas de demostración?")) {
        state.jornadas = JSON.parse(JSON.stringify(DEFAULT_JORNADAS));
        state.selectedJornadaId = state.jornadas[0].id;
        saveLocalState();
        renderJornadaSelector();
        renderAllViews();
        showToast("Jornadas demo cargadas");
        await sendToCloud("seedDemoData");
      }
    });
  }
}

function renderAllViews() {
  const activeJornada = getActiveJornada();
  const jTitle = activeJornada ? activeJornada.name : "Jornada";

  const pTitle = document.getElementById("pronosticos-jornada-title");
  if (pTitle) pTitle.textContent = jTitle;

  const aTitle = document.getElementById("admin-results-jornada-title");
  if (aTitle) aTitle.textContent = jTitle;

  const mTitle = document.getElementById("matrix-jornada-title");
  if (mTitle) mTitle.textContent = jTitle;

  renderRankingTable();
  renderQuinielaMatrix();
  renderMyQuinielaForm();

  if (currentUser && currentUser.role === "admin") {
    renderAdminResultsForm();
    renderAdminManageTab();
  }
}

// ==================== TAB 1: CLASIFICACIÓN GENERAL & MATRIZ ====================
function renderRankingTable() {
  const tbody = document.getElementById("ranking-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const players = (state.users || []).filter(u => u.role === "player" || Object.keys(state.predictions[u.id] || {}).length > 0);

  if (players.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">No hay jugadores registrados todavía.</td></tr>`;
    return;
  }

  const stats = players.map(user => {
    let totalPoints = 0;
    let plenos = 0;
    let dobles = 0;
    let simples = 0;
    let jornadasCount = 0;

    (state.jornadas || []).forEach(j => {
      const evaluation = evaluateUserJornada(user.id, j);
      if (evaluation.matchesWithResult > 0) {
        jornadasCount++;
        totalPoints += evaluation.points;
        if (evaluation.isPleno) plenos++;
        else if (evaluation.isDoble) dobles++;
        else if (evaluation.isSimple) simples++;
      }
    });

    return { user, totalPoints, plenos, dobles, simples, jornadasCount };
  });

  stats.sort((a, b) => b.totalPoints - a.totalPoints || b.plenos - a.plenos || b.dobles - a.dobles);

  stats.forEach((item, index) => {
    const tr = document.createElement("tr");
    let posClass = "";
    if (index === 0) posClass = "gold";
    else if (index === 1) posClass = "silver";
    else if (index === 2) posClass = "bronze";

    const isCurrent = currentUser && currentUser.id === item.user.id;
    if (isCurrent) {
      tr.style.borderColor = "var(--primary)";
      tr.style.background = "rgba(16, 185, 129, 0.1)";
    }

    tr.innerHTML = `
      <td><span class="pos-badge ${posClass}">${index + 1}</span></td>
      <td>
        <div class="user-cell">
          <span style="font-size: 1.3rem;">${item.user.avatar || '👤'}</span>
          <span>${item.user.name} ${isCurrent ? '<strong>(Tú)</strong>' : ''}</span>
        </div>
      </td>
      <td><span class="pts-pill">${item.totalPoints} pts</span></td>
      <td style="color: #fbbf24; font-weight: 700;">🌟 ${item.plenos}</td>
      <td style="color: #38bdf8; font-weight: 600;">✌️ ${item.dobles}</td>
      <td style="color: #4ade80;">⚽ ${item.simples}</td>
      <td style="color: var(--text-muted);">${item.jornadasCount}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderQuinielaMatrix() {
  const table = document.getElementById("matrix-table");
  if (!table) return;
  table.innerHTML = "";

  const activeJornada = getActiveJornada();
  if (!activeJornada || !activeJornada.matches || activeJornada.matches.length === 0) {
    table.innerHTML = `<tr><td style="padding: 1.5rem; text-align: center; color: var(--text-muted);">Sin partidos en esta jornada</td></tr>`;
    return;
  }

  const players = (state.users || []).filter(u => u.role === "player" || Object.keys(state.predictions[u.id] || {}).length > 0);

  // Cabecera
  let theadHtml = `<thead><tr><th>#</th><th>Partido (3 por Jornada)</th><th>Resultado Real</th>`;
  players.forEach(p => {
    const isMe = currentUser && currentUser.id === p.id;
    const isAdmin = currentUser && currentUser.role === "admin";
    const userEvaluation = evaluateUserJornada(p.id, activeJornada);
    
    // Si la jornada ha concluido o si soy yo o si soy admin, mostrar puntos conseguidos
    let puntosHtml = "";
    if (isMe || isAdmin || userEvaluation.isFinished) {
      let tagClass = "jornada-pts-0";
      if (userEvaluation.points === 5) tagClass = "jornada-pts-5";
      else if (userEvaluation.points === 3) tagClass = "jornada-pts-3";
      else if (userEvaluation.points === 1) tagClass = "jornada-pts-1";

      puntosHtml = `<span class="jornada-pts-tag ${tagClass}">+${userEvaluation.points} pts (${userEvaluation.hits}/3)</span>`;
    } else {
      // Si está pendiente, no mostrar los aciertos provisionales a otros
      const hasPredictions = state.predictions[p.id] && state.predictions[p.id][activeJornada.id] && Object.keys(state.predictions[p.id][activeJornada.id]).length > 0;
      puntosHtml = `<span class="jornada-pts-tag ${hasPredictions ? 'jornada-pts-1' : 'jornada-pts-0'}">${hasPredictions ? '🔒 Apostado' : '⏳ Pendiente'}</span>`;
    }

    theadHtml += `<th>
      <div>${p.avatar || '👤'} ${p.name} ${isMe ? '(Tú)' : ''}</div>
      ${puntosHtml}
    </th>`;
  });
  theadHtml += `</tr></thead>`;

  // Filas de los 3 partidos
  let tbodyHtml = `<tbody>`;
  activeJornada.matches.forEach((match, idx) => {
    const hasResult = match.signResult !== null && match.signResult !== "";
    const realSignHtml = hasResult 
      ? `<span class="sign-badge sign-official">${match.signResult}</span>` 
      : `<span class="text-muted" style="font-size: 0.8rem;">Pendiente</span>`;

    tbodyHtml += `<tr>
      <td style="font-weight: 700; color: var(--text-muted);">${idx + 1}</td>
      <td class="match-name-cell">
        <span>${match.local} vs ${match.visitor}</span>
        <div style="font-size: 0.75rem; color: var(--text-muted);">${match.date || ''}</div>
      </td>
      <td>${realSignHtml}</td>`;

    players.forEach(p => {
      const userPreds = (state.predictions[p.id] && state.predictions[p.id][activeJornada.id]) || {};
      const predSign = userPreds[match.id];

      const isMe = currentUser && currentUser.id === p.id;
      const isAdmin = currentUser && currentUser.role === "admin";

      if (!predSign) {
        tbodyHtml += `<td><span class="text-muted">-</span></td>`;
      } else {
        // REGLA DE PRIVACIDAD:
        // Solo el propio jugador o el Admin pueden ver el pronóstico antes o durante.
        // Los demás jugadores ven un icono de candado 🔒 mientras el partido no tenga resultado.
        if (isMe || isAdmin || hasResult) {
          let badgeClass = "sign-pending";
          if (hasResult) {
            badgeClass = (String(predSign).trim() === String(match.signResult).trim()) ? "sign-hit" : "sign-miss";
          }
          tbodyHtml += `<td><span class="sign-badge ${badgeClass}">${predSign}</span></td>`;
        } else {
          // Oculto para otros participantes antes de jugarse
          tbodyHtml += `<td><span class="sign-badge sign-hidden" title="Pronóstico privado hasta que se juegue el partido">🔒</span></td>`;
        }
      }
    });

    tbodyHtml += `</tr>`;
  });
  tbodyHtml += `</tbody>`;

  table.innerHTML = theadHtml + tbodyHtml;
}

// ==================== TAB 2: MI QUINIELA 1X2 ====================
function renderMyQuinielaForm() {
  const container = document.getElementById("quiniela-matches-list");
  if (!container) return;
  container.innerHTML = "";

  if (!currentUser) return;

  const activeJornada = getActiveJornada();
  if (!activeJornada || !activeJornada.matches || activeJornada.matches.length === 0) {
    container.innerHTML = `<p class="text-muted" style="text-align: center; padding: 2rem;">No hay partidos en esta jornada.</p>`;
    return;
  }

  const userPreds = (state.predictions[currentUser.id] && state.predictions[currentUser.id][activeJornada.id]) || {};

  activeJornada.matches.forEach((match, idx) => {
    const row = document.createElement("div");
    row.className = "quiniela-row";

    const currentSign = userPreds[match.id] || null;

    row.innerHTML = `
      <div class="quiniela-match-info">
        <span class="match-number-badge">${idx + 1}</span>
        <div class="match-names">
          <span>${match.local}</span>
          <span class="team-vs">vs</span>
          <span>${match.visitor}</span>
        </div>
        <span class="match-timing">🕒 ${match.date || ''}</span>
      </div>
      <div class="quiniela-options" data-match="${match.id}">
        <button type="button" class="btn-1x2 ${currentSign === '1' ? 'selected' : ''}" data-sign="1">1</button>
        <button type="button" class="btn-1x2 ${currentSign === 'X' ? 'selected' : ''}" data-sign="X">X</button>
        <button type="button" class="btn-1x2 ${currentSign === '2' ? 'selected' : ''}" data-sign="2">2</button>
      </div>
    `;

    const buttons = row.querySelectorAll(".btn-1x2");
    buttons.forEach(btn => {
      btn.addEventListener("click", () => {
        const isAlreadySelected = btn.classList.contains("selected");
        buttons.forEach(b => b.classList.remove("selected"));
        if (!isAlreadySelected) {
          btn.classList.add("selected");
        }
      });
    });

    container.appendChild(row);
  });
}

async function saveMyQuiniela() {
  if (!currentUser) return;
  const activeJornada = getActiveJornada();
  if (!activeJornada) return;

  if (!state.predictions[currentUser.id]) {
    state.predictions[currentUser.id] = {};
  }
  if (!state.predictions[currentUser.id][activeJornada.id]) {
    state.predictions[currentUser.id][activeJornada.id] = {};
  }

  const rows = document.querySelectorAll("#quiniela-matches-list .quiniela-options");
  const newPredictions = {};

  rows.forEach(row => {
    const matchId = row.getAttribute("data-match");
    const selectedBtn = row.querySelector(".btn-1x2.selected");

    if (selectedBtn) {
      newPredictions[matchId] = selectedBtn.getAttribute("data-sign");
    }
  });

  state.predictions[currentUser.id][activeJornada.id] = newPredictions;
  saveLocalState();
  renderRankingTable();
  renderQuinielaMatrix();
  showToast(`¡Pronósticos de ${activeJornada.name} guardados en privado!`);

  await sendToCloud("savePredictions", {
    userId: currentUser.id,
    jornadaId: activeJornada.id,
    predictions: newPredictions
  });
}

function randomFillMyQuiniela() {
  const signs = ["1", "X", "2"];
  const rows = document.querySelectorAll("#quiniela-matches-list .quiniela-options");
  
  rows.forEach(row => {
    const randomSign = signs[Math.floor(Math.random() * signs.length)];
    const buttons = row.querySelectorAll(".btn-1x2");
    buttons.forEach(b => {
      if (b.getAttribute("data-sign") === randomSign) b.classList.add("selected");
      else b.classList.remove("selected");
    });
  });

  showToast("🎲 Pronósticos rellenados. Pulsa en 'Guardar Mis 3 Pronósticos'");
}

function clearMyQuiniela() {
  const buttons = document.querySelectorAll("#quiniela-matches-list .btn-1x2");
  buttons.forEach(b => b.classList.remove("selected"));
  showToast("Pronósticos desmarcados");
}

// ==================== TAB 3: RESULTADOS REALES (ADMIN) ====================
function renderAdminResultsForm() {
  const container = document.getElementById("admin-results-list");
  if (!container) return;
  container.innerHTML = "";

  const activeJornada = getActiveJornada();
  if (!activeJornada || !activeJornada.matches || activeJornada.matches.length === 0) {
    container.innerHTML = `<p class="text-muted" style="text-align: center; padding: 2rem;">No hay partidos en esta jornada.</p>`;
    return;
  }

  activeJornada.matches.forEach((match, idx) => {
    const row = document.createElement("div");
    row.className = "quiniela-row";

    const currentResult = match.signResult || null;

    row.innerHTML = `
      <div class="quiniela-match-info">
        <span class="match-number-badge">${idx + 1}</span>
        <div class="match-names">
          <span>${match.local}</span>
          <span class="team-vs">vs</span>
          <span>${match.visitor}</span>
        </div>
        <span class="match-timing">🕒 ${match.date || ''}</span>
      </div>
      <div class="quiniela-options admin-results-options" data-match="${match.id}">
        <button type="button" class="btn-1x2 ${currentResult === '1' ? 'selected-admin' : ''}" data-sign="1">1</button>
        <button type="button" class="btn-1x2 ${currentResult === 'X' ? 'selected-admin' : ''}" data-sign="X">X</button>
        <button type="button" class="btn-1x2 ${currentResult === '2' ? 'selected-admin' : ''}" data-sign="2">2</button>
      </div>
    `;

    const buttons = row.querySelectorAll(".btn-1x2");
    buttons.forEach(btn => {
      btn.addEventListener("click", () => {
        const isAlreadySelected = btn.classList.contains("selected-admin");
        buttons.forEach(b => b.classList.remove("selected-admin"));
        if (!isAlreadySelected) {
          btn.classList.add("selected-admin");
        }
      });
    });

    container.appendChild(row);
  });
}

async function saveAdminRealResults() {
  if (!currentUser || currentUser.role !== "admin") return;
  const activeJornada = getActiveJornada();
  if (!activeJornada) return;

  const rows = document.querySelectorAll(".admin-results-options");
  const updates = [];

  rows.forEach(row => {
    const matchId = row.getAttribute("data-match");
    const selectedBtn = row.querySelector(".btn-1x2.selected-admin");
    const match = activeJornada.matches.find(m => m.id === matchId);

    if (match) {
      match.signResult = selectedBtn ? selectedBtn.getAttribute("data-sign") : null;
      updates.push({ id: match.id, signResult: match.signResult });
    }
  });

  saveLocalState();
  renderRankingTable();
  renderQuinielaMatrix();
  showToast(`✅ Resultados de ${activeJornada.name} guardados y puntos calculados`);

  await sendToCloud("saveResults", { matches: updates });
}

// ==================== TAB 4: PANEL ADMIN ====================
function renderAdminManageTab() {
  const countSpan = document.getElementById("jornadas-count");
  if (countSpan) countSpan.textContent = state.jornadas ? state.jornadas.length : 0;

  const jornadasList = document.getElementById("admin-jornadas-list");
  if (jornadasList) {
    jornadasList.innerHTML = "";
    (state.jornadas || []).forEach((j, idx) => {
      const li = document.createElement("li");
      li.className = "user-list-item";
      li.innerHTML = `
        <div>
          <strong>${j.name}</strong>
          <span style="font-size: 0.8rem; color: var(--text-muted); display: block;">
            ${j.matches.map(m => `${m.local}-${m.visitor} [${m.signResult || '?'}]`).join(' | ')}
          </span>
        </div>
        <button type="button" class="btn btn-danger-outline btn-sm btn-delete-jornada" data-jornada="${j.id}">🗑️ Borrar</button>
      `;
      jornadasList.appendChild(li);
    });

    jornadasList.querySelectorAll(".btn-delete-jornada").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const jId = e.currentTarget.getAttribute("data-jornada");
        if (confirm("¿Eliminar esta jornada y todos sus pronósticos?")) {
          state.jornadas = state.jornadas.filter(j => j.id !== jId);
          if (state.selectedJornadaId === jId && state.jornadas.length > 0) {
            state.selectedJornadaId = state.jornadas[0].id;
          }
          saveLocalState();
          renderJornadaSelector();
          renderAllViews();
          showToast("Jornada eliminada");
          await sendToCloud("deleteJornada", { jornadaId: jId });
        }
      });
    });
  }

  const usersList = document.getElementById("users-list");
  const userCount = document.getElementById("user-count");
  if (usersList && userCount) {
    usersList.innerHTML = "";
    const players = (state.users || []).filter(u => u.role === "player");
    userCount.textContent = players.length;

    players.forEach(p => {
      const li = document.createElement("li");
      li.className = "user-list-item";
      li.innerHTML = `
        <div class="user-cell">
          <span style="font-size: 1.2rem;">${p.avatar || '👤'}</span>
          <div>${p.name} <span class="text-muted" style="font-size: 0.8rem;">(@${p.username})</span></div>
        </div>
        <button type="button" class="btn btn-danger-outline btn-sm btn-delete-user" data-user="${p.id}">🗑️</button>
      `;
      usersList.appendChild(li);
    });

    usersList.querySelectorAll(".btn-delete-user").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const uid = e.currentTarget.getAttribute("data-user");
        const player = state.users.find(u => u.id === uid);
        if (confirm(`¿Eliminar a ${player ? player.name : ''}?`)) {
          state.users = state.users.filter(u => u.id !== uid);
          delete state.predictions[uid];
          saveLocalState();
          renderAllViews();
          showToast("Jugador eliminado");
          await sendToCloud("deleteUser", { userId: uid });
        }
      });
    });
  }
}

// ==================== EXPORTAR A WHATSAPP ====================
function exportRankingWhatsApp() {
  const activeJornada = getActiveJornada();
  const players = (state.users || []).filter(u => u.role === "player" || Object.keys(state.predictions[u.id] || {}).length > 0);

  if (players.length === 0) {
    showToast("No hay participantes");
    return;
  }

  const stats = players.map(user => {
    let totalPoints = 0;
    let plenos = 0;
    (state.jornadas || []).forEach(j => {
      const ev = evaluateUserJornada(user.id, j);
      totalPoints += ev.points;
      if (ev.isPleno) plenos++;
    });
    const currentJornadaEv = activeJornada ? evaluateUserJornada(user.id, activeJornada) : { points: 0, hits: 0 };
    return { user, totalPoints, plenos, currentPts: currentJornadaEv.points, currentHits: currentJornadaEv.hits };
  });

  stats.sort((a, b) => b.totalPoints - a.totalPoints);

  let text = `⚽ *CLASIFICACIÓN GENERAL PORRA LALIGA* ⚽\n`;
  text += `🎯 *Puntuación:* 1 acierto = 1p | 2 aciertos = 3p | 3 aciertos (Pleno) = 5p\n\n`;

  stats.forEach((item, index) => {
    let medal = index === 0 ? "🥇" : (index === 1 ? "🥈" : (index === 2 ? "🥉" : `${index + 1}º`));
    text += `${medal} *${item.user.name}*: ${item.totalPoints} pts (🌟 ${item.plenos} plenos)\n`;
  });

  if (activeJornada) {
    text += `\n📊 *Puntos en ${activeJornada.name}:*\n`;
    stats.forEach(item => {
      text += `• ${item.user.name}: +${item.currentPts} pts (${item.currentHits}/3 aciertos)\n`;
    });
  }

  text += `\n📲 ¡Haz tus 3 pronósticos para la próxima jornada!`;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showToast("📋 ¡Resumen copiado para WhatsApp!");
    }).catch(() => {
      showToast("No se pudo copiar automáticamente");
    });
  } else {
    alert(text);
  }
}

// ==================== TOAST HELPER ====================
let toastTimeout;
function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}
