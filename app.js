/**
 * =========================================================================
 * PORRA QUINIELA LALIGA 1X2 - JAVASCRIPT FRONTEND (v2.2)
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

// Partidos base de LaLiga por defecto
const DEFAULT_MATCHES = [
  { id: "m1", local: "Real Madrid", visitor: "Barcelona", date: "Sábado 21:00", signResult: "1" },
  { id: "m2", local: "Atlético de Madrid", visitor: "Athletic Club", date: "Sábado 18:30", signResult: "X" },
  { id: "m3", local: "Real Sociedad", visitor: "Villarreal", date: "Domingo 16:15", signResult: "1" },
  { id: "m4", local: "Sevilla", visitor: "Real Betis", date: "Domingo 21:00", signResult: null },
  { id: "m5", local: "Valencia", visitor: "Celta de Vigo", date: "Viernes 21:00", signResult: "1" },
  { id: "m6", local: "Girona", visitor: "Osasuna", date: "Sábado 16:15", signResult: "1" },
  { id: "m7", local: "Rayo Vallecano", visitor: "Getafe", date: "Domingo 14:00", signResult: "X" },
  { id: "m8", local: "Mallorca", visitor: "Las Palmas", date: "Domingo 18:30", signResult: null },
  { id: "m9", local: "Deportivo Alavés", visitor: "Espanyol", date: "Lunes 21:00", signResult: null },
  { id: "m10", local: "Leganés", visitor: "Real Valladolid", date: "Viernes 19:00", signResult: "2" }
];

// Estado global en memoria
let state = {
  users: [DEFAULT_ADMIN],
  matches: [...DEFAULT_MATCHES],
  predictions: {}
};

// Usuario con sesión activa
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
    console.error("Error crítico durante inicialización:", err);
  }
});

// Loader visual
function setSyncLoading(show, text = "Sincronizando...") {
  const loader = document.getElementById("sync-loader");
  const loaderText = document.getElementById("sync-loader-text");
  if (loader && loaderText) {
    loaderText.textContent = text;
    loader.style.display = show ? "flex" : "none";
  }
}

// Actualizar badge de diagnóstico de conexión
function updateConnectionBadge(type, message) {
  const badge = document.getElementById("connection-status-badge");
  if (!badge) return;

  badge.className = "connection-badge";
  if (type === "connected") {
    badge.classList.add("status-connected");
    badge.innerHTML = `<span>🟢 Google Sheets Conectado</span>`;
  } else if (type === "local") {
    badge.classList.add("status-local");
    badge.innerHTML = `<span>🟡 Modo Local Activo (${message || 'Listo para jugar'})</span>`;
  } else {
    badge.classList.add("status-checking");
    badge.innerHTML = `<span>🔄 Comprobando conexión...</span>`;
  }
}

// Carga y guardado local
function loadLocalState() {
  const saved = localStorage.getItem("quiniela_laliga_state");
  if (saved) {
    try {
      state = JSON.parse(saved);
    } catch (e) {
      console.warn("Error parseando local storage:", e);
    }
  }

  if (!state.users || !Array.isArray(state.users) || state.users.length === 0) {
    state.users = [DEFAULT_ADMIN];
  } else if (!state.users.some(u => String(u.username).toLowerCase() === "admin")) {
    state.users.unshift(DEFAULT_ADMIN);
  }

  if (!state.matches || !Array.isArray(state.matches) || state.matches.length === 0) {
    state.matches = [...DEFAULT_MATCHES];
  }

  if (!state.predictions || typeof state.predictions !== "object") {
    state.predictions = {};
  }

  saveLocalState();
}

function saveLocalState() {
  try {
    localStorage.setItem("quiniela_laliga_state", JSON.stringify(state));
  } catch (e) {
    console.error("No se pudo guardar en localStorage:", e);
  }
}

// Probar y sincronizar con Google Sheets en segundo plano
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

      if (json.data.matches && json.data.matches.length > 0) {
        state.matches = json.data.matches;
      }

      if (json.data.predictions) {
        state.predictions = json.data.predictions;
      }

      saveLocalState();
      if (currentUser) renderAllViews();
    } else {
      updateConnectionBadge("local", "Google Sheets no devolvió datos válidos");
    }
  } catch (e) {
    console.warn("Aviso de conexión a Google Sheets:", e);
    updateConnectionBadge("local", "Operando en modo local");
  }
}

// Envío a Google Apps Script
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
        state = json.data;
        if (!state.users.some(u => String(u.username).toLowerCase() === "admin")) {
          state.users.unshift(DEFAULT_ADMIN);
        }
        saveLocalState();
      }
      return json;
    }
  } catch (errPost) {
    console.warn("POST no completado, intentando alternativa GET:", errPost);
    try {
      const encodedPayload = encodeURIComponent(JSON.stringify(payload));
      const resGet = await fetch(`${GOOGLE_SCRIPT_URL}?action=${action}&payload=${encodedPayload}`, {
        method: "GET",
        mode: "cors",
        redirect: "follow"
      });
      const jsonGet = await resGet.json();
      if (jsonGet && jsonGet.success && jsonGet.data) {
        state = jsonGet.data;
        saveLocalState();
      }
      return jsonGet;
    } catch (errGet) {
      console.warn("Google Sheets inaccesible en este momento. Guardado localmente:", errGet);
      saveLocalState();
    }
  } finally {
    setSyncLoading(false);
  }
  return { success: true };
}

// ==================== GESTIÓN DE SESIÓN Y LOGIN ====================
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
      console.error("Error leyendo sesión:", e);
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
    alert("Por favor, introduce tu usuario y contraseña.");
    return;
  }

  // Comprobar si es Admin
  if (username === "admin" && (password === "admin123" || password === "admin")) {
    const adminUser = state.users.find(u => String(u.username).toLowerCase() === "admin") || DEFAULT_ADMIN;
    if (usernameInput) usernameInput.value = "";
    if (passwordInput) passwordInput.value = "";
    loginUserSuccess(adminUser);
    return;
  }

  // Comprobar jugador
  const user = state.users.find(u => String(u.username).toLowerCase() === username && String(u.password).trim() === password);

  if (user) {
    if (usernameInput) usernameInput.value = "";
    if (passwordInput) passwordInput.value = "";
    loginUserSuccess(user);
  } else {
    alert(`❌ Usuario o contraseña no encontrados.\n\nPrueba:\n- Usuario: admin\n- Contraseña: admin123\n\nO pulsa en 'Registrarse' arriba para crear una cuenta nueva.`);
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
    alert("Por favor, completa todos los campos del registro.");
    return;
  }

  if (state.users.some(u => String(u.username).toLowerCase() === username)) {
    alert("⚠️ Ese nombre de usuario ya está registrado. Por favor, elige otro.");
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

  // Guardar localmente
  state.users.push(newUser);
  if (!state.predictions[newUser.id]) {
    state.predictions[newUser.id] = {};
  }
  saveLocalState();

  if (usernameInput) usernameInput.value = "";
  if (nameInput) nameInput.value = "";
  if (passwordInput) passwordInput.value = "";

  loginUserSuccess(newUser);
  showToast("✨ ¡Cuenta creada con éxito!");

  // Enviar a Google Sheets
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

  // Botón Entrar
  const btnLogin = document.getElementById("btn-login-submit");
  if (btnLogin) {
    btnLogin.addEventListener("click", executeLogin);
  }

  // Acceso Rápido Admin
  const btnQuickAdmin = document.getElementById("btn-quick-admin");
  if (btnQuickAdmin) {
    btnQuickAdmin.addEventListener("click", () => {
      const adminUser = state.users.find(u => String(u.username).toLowerCase() === "admin") || DEFAULT_ADMIN;
      loginUserSuccess(adminUser);
    });
  }

  // Botón Registro
  const btnReg = document.getElementById("btn-reg-submit");
  if (btnReg) {
    btnReg.addEventListener("click", executeRegister);
  }

  // Permitir pulsar Enter en los inputs
  const inputs = document.querySelectorAll("#form-login input, #form-register input");
  inputs.forEach(inp => {
    inp.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        if (inp.closest("#form-login")) executeLogin();
        else executeRegister();
      }
    });
  });

  // Logout
  const btnLogout = document.getElementById("btn-logout");
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      if (confirm("¿Deseas cerrar la sesión?")) {
        showAuthScreen();
        showToast("Sesión cerrada");
      }
    });
  }
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

  if (tabId === "tab-clasificacion") {
    renderRankingTable();
    renderQuinielaMatrix();
  } else if (tabId === "tab-pronosticos") {
    renderMyQuinielaForm();
  } else if (tabId === "tab-resultados" && currentUser && currentUser.role === "admin") {
    renderAdminResultsForm();
  } else if (tabId === "tab-gestion" && currentUser && currentUser.role === "admin") {
    renderAdminManageTab();
  }
}

// ==================== EVENT LISTENERS GENERALES ====================
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

  // Form Añadir Partido (Admin)
  const formAddMatch = document.getElementById("form-add-match");
  if (formAddMatch) {
    formAddMatch.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!currentUser || currentUser.role !== "admin") return;

      const localInput = document.getElementById("match-local");
      const visitorInput = document.getElementById("match-visitor");
      const dateInput = document.getElementById("match-date");

      const local = localInput ? localInput.value.trim() : "";
      const visitor = visitorInput ? visitorInput.value.trim() : "";
      const date = dateInput ? (dateInput.value.trim() || "Por determinar") : "Por determinar";

      if (!local || !visitor) return;

      const newMatch = {
        id: "m_" + Date.now(),
        local,
        visitor,
        date,
        signResult: null
      };

      state.matches.push(newMatch);
      saveLocalState();
      renderAllViews();
      showToast("Partido añadido");

      if (localInput) localInput.value = "";
      if (visitorInput) visitorInput.value = "";
      if (dateInput) dateInput.value = "";

      await sendToCloud("addMatch", { match: newMatch });
    });
  }

  // Cargar Demo (Admin)
  const btnAdminDemo = document.getElementById("btn-admin-demo");
  if (btnAdminDemo) {
    btnAdminDemo.addEventListener("click", async () => {
      if (!currentUser || currentUser.role !== "admin") return;
      if (confirm("¿Cargar partidos de LaLiga de prueba?")) {
        state.matches = [...DEFAULT_MATCHES];
        saveLocalState();
        renderAllViews();
        showToast("Partidos de demostración cargados");
        await sendToCloud("seedDemoData");
      }
    });
  }
}

function renderAllViews() {
  renderRankingTable();
  renderQuinielaMatrix();
  renderMyQuinielaForm();
  if (currentUser && currentUser.role === "admin") {
    renderAdminResultsForm();
    renderAdminManageTab();
  }
}

// ==================== TAB 1: CLASIFICACIÓN Y MATRIZ ====================
function renderRankingTable() {
  const tbody = document.getElementById("ranking-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const players = (state.users || []).filter(u => u.role === "player" || Object.keys(state.predictions[u.id] || {}).length > 0);

  if (players.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">No hay jugadores registrados todavía. Pulsa en 'Mi Quiniela 1X2' para hacer tus apuestas.</td></tr>`;
    return;
  }

  const finishedMatches = (state.matches || []).filter(m => m.signResult !== null && m.signResult !== "");
  const totalFinished = finishedMatches.length;

  const stats = players.map(user => {
    const userPreds = state.predictions[user.id] || {};
    let hits = 0;
    let misses = 0;

    finishedMatches.forEach(match => {
      const pred = userPreds[match.id];
      if (pred && String(pred).trim() === String(match.signResult).trim()) {
        hits++;
      } else {
        misses++;
      }
    });

    const effectiveness = totalFinished > 0 ? Math.round((hits / totalFinished) * 100) : 0;
    return { user, hits, misses, effectiveness };
  });

  stats.sort((a, b) => b.hits - a.hits || b.effectiveness - a.effectiveness);

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
      <td><span class="pts-pill">${item.hits} ${item.hits === 1 ? 'acierto' : 'aciertos'}</span></td>
      <td><span style="color: #38bdf8; font-weight: 600;">${item.effectiveness}%</span></td>
      <td style="color: #f87171;">${item.misses}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderQuinielaMatrix() {
  const table = document.getElementById("matrix-table");
  if (!table) return;
  table.innerHTML = "";

  const players = (state.users || []).filter(u => u.role === "player" || Object.keys(state.predictions[u.id] || {}).length > 0);

  if (!state.matches || state.matches.length === 0 || players.length === 0) {
    table.innerHTML = `<tr><td style="padding: 1.5rem; text-align: center; color: var(--text-muted);">Sin partidos o jugadores para mostrar el cuadro</td></tr>`;
    return;
  }

  let theadHtml = `<thead><tr><th>#</th><th>Partido</th><th>Resultado Real</th>`;
  players.forEach(p => {
    const isMe = currentUser && currentUser.id === p.id;
    theadHtml += `<th>${p.avatar || '👤'} ${p.name} ${isMe ? '(Tú)' : ''}</th>`;
  });
  theadHtml += `</tr></thead>`;

  let tbodyHtml = `<tbody>`;
  state.matches.forEach((match, idx) => {
    const hasResult = match.signResult !== null && match.signResult !== "";
    const realSignHtml = hasResult 
      ? `<span class="sign-badge sign-official">${match.signResult}</span>` 
      : `<span class="text-muted" style="font-size: 0.8rem;">Pendiente</span>`;

    tbodyHtml += `<tr>
      <td style="font-weight: 700; color: var(--text-muted);">${idx + 1}</td>
      <td class="match-name-cell">
        <span>${match.local} - ${match.visitor}</span>
        <div style="font-size: 0.72rem; color: var(--text-muted);">${match.date || ''}</div>
      </td>
      <td>${realSignHtml}</td>`;

    players.forEach(p => {
      const predSign = state.predictions[p.id] && state.predictions[p.id][match.id];
      if (!predSign) {
        tbodyHtml += `<td><span class="text-muted">-</span></td>`;
      } else {
        let badgeClass = "sign-pending";
        if (hasResult) {
          badgeClass = (String(predSign).trim() === String(match.signResult).trim()) ? "sign-hit" : "sign-miss";
        }
        tbodyHtml += `<td><span class="sign-badge ${badgeClass}">${predSign}</span></td>`;
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

  if (!state.matches || state.matches.length === 0) {
    container.innerHTML = `<p class="text-muted" style="text-align: center; padding: 2rem;">No hay partidos programados para la quiniela.</p>`;
    return;
  }

  const myPreds = state.predictions[currentUser.id] || {};

  state.matches.forEach((match, idx) => {
    const row = document.createElement("div");
    row.className = "quiniela-row";

    const currentSign = myPreds[match.id] || null;

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

  if (!state.predictions[currentUser.id]) {
    state.predictions[currentUser.id] = {};
  }

  const rows = document.querySelectorAll("#quiniela-matches-list .quiniela-options");
  const newPredictions = {};

  rows.forEach(row => {
    const matchId = row.getAttribute("data-match");
    const selectedBtn = row.querySelector(".btn-1x2.selected");

    if (selectedBtn) {
      const sign = selectedBtn.getAttribute("data-sign");
      newPredictions[matchId] = sign;
    }
  });

  state.predictions[currentUser.id] = newPredictions;
  saveLocalState();
  renderRankingTable();
  renderQuinielaMatrix();
  showToast(`¡Quiniela guardada!`);

  await sendToCloud("savePredictions", {
    userId: currentUser.id,
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

  showToast("🎲 Quiniela rellenada. Pulsa en 'Guardar Mi Quiniela'");
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

  if (!state.matches || state.matches.length === 0) {
    container.innerHTML = `<p class="text-muted" style="text-align: center; padding: 2rem;">No hay partidos en la jornada.</p>`;
    return;
  }

  state.matches.forEach((match, idx) => {
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

  const rows = document.querySelectorAll(".admin-results-options");
  const updates = [];

  rows.forEach(row => {
    const matchId = row.getAttribute("data-match");
    const selectedBtn = row.querySelector(".btn-1x2.selected-admin");
    const match = state.matches.find(m => m.id === matchId);

    if (match) {
      match.signResult = selectedBtn ? selectedBtn.getAttribute("data-sign") : null;
      updates.push({ id: match.id, signResult: match.signResult });
    }
  });

  saveLocalState();
  renderRankingTable();
  renderQuinielaMatrix();
  showToast("✅ Resultados actualizados");

  await sendToCloud("saveResults", { matches: updates });
}

// ==================== TAB 4: PANEL ADMIN ====================
function renderAdminManageTab() {
  const matchesCountEl = document.getElementById("matches-count");
  if (matchesCountEl) matchesCountEl.textContent = state.matches ? state.matches.length : 0;
  
  const matchesList = document.getElementById("admin-matches-manage-list");
  if (matchesList) {
    matchesList.innerHTML = "";
    if (!state.matches || state.matches.length === 0) {
      matchesList.innerHTML = `<li style="text-align: center; color: var(--text-muted); padding: 0.5rem;">No hay partidos</li>`;
    } else {
      state.matches.forEach((m, idx) => {
        const li = document.createElement("li");
        li.className = "user-list-item";
        li.innerHTML = `
          <div>
            <strong>${idx + 1}. ${m.local} vs ${m.visitor}</strong>
            <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">${m.date || ''} | Signo: ${m.signResult || 'Pendiente'}</span>
          </div>
          <button type="button" class="btn btn-danger-outline btn-sm btn-delete-match" data-match="${m.id}">🗑️</button>
        `;
        matchesList.appendChild(li);
      });

      matchesList.querySelectorAll(".btn-delete-match").forEach(btn => {
        btn.addEventListener("click", async (e) => {
          const mid = e.currentTarget.getAttribute("data-match");
          if (confirm("¿Eliminar este partido de la quiniela?")) {
            state.matches = state.matches.filter(m => m.id !== mid);
            Object.keys(state.predictions).forEach(uid => {
              delete state.predictions[uid][mid];
            });
            saveLocalState();
            renderAllViews();
            showToast("Partido eliminado");
            await sendToCloud("deleteMatch", { matchId: mid });
          }
        });
      });
    }
  }

  // Lista de usuarios
  const usersList = document.getElementById("users-list");
  const userCount = document.getElementById("user-count");
  if (usersList && userCount) {
    usersList.innerHTML = "";
    const players = (state.users || []).filter(u => u.role === "player");
    userCount.textContent = players.length;

    if (players.length === 0) {
      usersList.innerHTML = `<li style="text-align: center; color: var(--text-muted); padding: 0.5rem;">No hay jugadores registrados todavía</li>`;
    } else {
      players.forEach(p => {
        const li = document.createElement("li");
        li.className = "user-list-item";
        li.innerHTML = `
          <div class="user-cell">
            <span style="font-size: 1.2rem;">${p.avatar || '👤'}</span>
            <div>
              <div>${p.name} <span class="text-muted" style="font-size: 0.8rem;">(@${p.username})</span></div>
            </div>
          </div>
          <button type="button" class="btn btn-danger-outline btn-sm btn-delete-user" data-user="${p.id}">🗑️ Eliminar</button>
        `;
        usersList.appendChild(li);
      });

      usersList.querySelectorAll(".btn-delete-user").forEach(btn => {
        btn.addEventListener("click", async (e) => {
          const uid = e.currentTarget.getAttribute("data-user");
          const player = state.users.find(u => u.id === uid);
          if (confirm(`¿Eliminar al jugador ${player ? player.name : ''}?`)) {
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
}

// ==================== EXPORTAR A WHATSAPP ====================
function exportRankingWhatsApp() {
  const players = (state.users || []).filter(u => u.role === "player" || Object.keys(state.predictions[u.id] || {}).length > 0);

  if (players.length === 0) {
    showToast("No hay participantes para exportar");
    return;
  }

  const finishedMatches = (state.matches || []).filter(m => m.signResult !== null && m.signResult !== "");
  const totalFinished = finishedMatches.length;

  const stats = players.map(user => {
    const userPreds = state.predictions[user.id] || {};
    let hits = 0;
    finishedMatches.forEach(match => {
      if (userPreds[match.id] && String(userPreds[match.id]).trim() === String(match.signResult).trim()) {
        hits++;
      }
    });
    return { user, hits };
  });

  stats.sort((a, b) => b.hits - a.hits);

  let text = `⚽ *CLASIFICACIÓN QUINIELA LALIGA 1X2* ⚽\n`;
  text += `📊 Partidos jugados: ${totalFinished}/${state.matches ? state.matches.length : 0}\n\n`;

  stats.forEach((item, index) => {
    let medal = index === 0 ? "🥇" : (index === 1 ? "🥈" : (index === 2 ? "🥉" : `${index + 1}º`));
    text += `${medal} *${item.user.name}*: ${item.hits} aciertos\n`;
  });

  text += `\n🎯 ¡Haz tus pronósticos 1X2 para la próxima jornada!`;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showToast("📋 ¡Ranking copiado! Listo para pegar en WhatsApp");
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
