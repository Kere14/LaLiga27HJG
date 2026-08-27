/**
 * =========================================================================
 * PORRA QUINIELA LALIGA 1X2 - JAVASCRIPT FRONTEND
 * Conectado con Google Sheets (Base de datos) y GitHub Pages (Hosting)
 * =========================================================================
 */

// ⚠️ PEGA AQUÍ LA URL DE TU APLICACIÓN WEB DE GOOGLE APPS SCRIPT:
// Ejemplo: "https://script.google.com/macros/s/AKfycbx.../exec"
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzpy93XmLhwfVr5Y1MnyK576lACu9eThHfTRwdXx5tszhF8VYMnNKYyPHiAwUHKlxAm/exec";

// Datos de reserva (Fallback en caso de no tener configurado Google Sheets aún)
const LOCAL_FALLBACK_DATA = {
  users: [
    { id: "admin_user", username: "admin", password: "admin123", name: "Administrador", avatar: "👑", role: "admin" },
    { id: "u_carlos", username: "carlos", password: "1234", name: "Carlos", avatar: "🦁", role: "player" },
    { id: "u_laura", username: "laura", password: "1234", name: "Laura", avatar: "⚡", role: "player" }
  ],
  matches: [
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
  ],
  predictions: {
    "u_carlos": { "m1": "1", "m2": "1", "m3": "1", "m4": "X", "m5": "1", "m6": "1", "m7": "X", "m10": "2" },
    "u_laura": { "m1": "2", "m2": "X", "m3": "1", "m4": "2", "m5": "1", "m6": "1", "m7": "2", "m10": "2" }
  }
};

// Estado en memoria
let state = {
  users: [],
  matches: [],
  predictions: {}
};

// Usuario con sesión activa
let currentUser = null;

// ==================== INICIALIZACIÓN ====================
document.addEventListener("DOMContentLoaded", async () => {
  initAuthUI();
  initTabsUI();
  initAppEventListeners();

  await loadInitialState();
  checkCurrentSession();
});

// Helper de loader
function setSyncLoading(show, text = "Sincronizando con Google Sheets...") {
  const loader = document.getElementById("sync-loader");
  const loaderText = document.getElementById("sync-loader-text");
  if (loader && loaderText) {
    loaderText.textContent = text;
    loader.style.display = show ? "flex" : "none";
  }
}

// Cargar estado inicial (Google Sheets o LocalStorage)
async function loadInitialState() {
  if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim() !== "") {
    setSyncLoading(true, "Conectando con Google Sheets...");
    try {
      const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getState`);
      const json = await res.json();
      if (json.success && json.data) {
        state = json.data;
        // Si no hay partidos aún en Sheets, cargar demo
        if (!state.matches || state.matches.length === 0) {
          state.matches = LOCAL_FALLBACK_DATA.matches;
        }
        localStorage.setItem("quiniela_laliga_state", JSON.stringify(state));
      } else {
        throw new Error(json.error || "Respuesta no válida");
      }
    } catch (e) {
      console.warn("No se pudo conectar a Google Sheets, usando datos locales:", e);
      loadLocalState();
      showToast("⚠️ Modo local (sin conexión a Google Sheets)");
    } finally {
      setSyncLoading(false);
    }
  } else {
    loadLocalState();
  }
}

function loadLocalState() {
  const saved = localStorage.getItem("quiniela_laliga_state");
  if (saved) {
    try {
      state = JSON.parse(saved);
    } catch (e) {
      state = JSON.parse(JSON.stringify(LOCAL_FALLBACK_DATA));
    }
  } else {
    state = JSON.parse(JSON.stringify(LOCAL_FALLBACK_DATA));
  }
}

function saveLocalState() {
  localStorage.setItem("quiniela_laliga_state", JSON.stringify(state));
}

// Petición POST a Google Apps Script
async function postToCloud(action, payload = {}) {
  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.trim() === "") {
    // Si no hay URL, operar solo localmente
    saveLocalState();
    return { success: true };
  }

  setSyncLoading(true, "Guardando en Google Sheets...");
  try {
    const bodyData = JSON.stringify({ action, ...payload });
    const res = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      body: bodyData,
      headers: {
        "Content-Type": "text/plain;charset=utf-8" // Para evitar preflights CORS en Google Apps Script
      }
    });

    const json = await res.json();
    if (json.success) {
      if (json.data) {
        state = json.data;
        saveLocalState();
      }
      return json;
    } else {
      throw new Error(json.error || "Error al guardar");
    }
  } catch (e) {
    console.error("Error al enviar a Google Sheets:", e);
    saveLocalState();
    showToast("⚠️ Guardado solo localmente (Revisa tu URL de Google Apps Script)");
    return { success: false, error: e.toString() };
  } finally {
    setSyncLoading(false);
  }
}

// ==================== GESTIÓN DE SESIÓN Y LOGIN ====================
function checkCurrentSession() {
  const sessionUser = sessionStorage.getItem("quiniela_active_user");
  if (sessionUser) {
    try {
      const userObj = JSON.parse(sessionUser);
      const found = state.users.find(u => u.id === userObj.id || u.username.toLowerCase() === userObj.username.toLowerCase());
      if (found) {
        loginUserSuccess(found);
        return;
      }
    } catch (e) {
      console.error("Error en sesión:", e);
    }
  }
  showAuthScreen();
}

function showAuthScreen() {
  currentUser = null;
  sessionStorage.removeItem("quiniela_active_user");
  document.getElementById("auth-screen").style.display = "flex";
  document.getElementById("app-container").style.display = "none";
}

function loginUserSuccess(user) {
  currentUser = user;
  sessionStorage.setItem("quiniela_active_user", JSON.stringify(user));

  document.getElementById("auth-screen").style.display = "none";
  document.getElementById("app-container").style.display = "flex";

  document.getElementById("header-user-avatar").textContent = user.avatar || "👤";
  document.getElementById("header-user-name").textContent = user.name;
  
  const roleBadge = document.getElementById("header-user-role");
  if (user.role === "admin") {
    roleBadge.textContent = "👑 ADMINISTRADOR";
    roleBadge.className = "user-badge-role admin";
    document.querySelectorAll(".admin-only").forEach(el => el.style.display = "block");
  } else {
    roleBadge.textContent = "⚽ JUGADOR";
    roleBadge.className = "user-badge-role";
    document.querySelectorAll(".admin-only").forEach(el => el.style.display = "none");
  }

  switchTab("tab-clasificacion");
  renderAllViews();
  showToast(`¡Bienvenido/a, ${user.name}!`);
}

function initAuthUI() {
  const tabLoginBtn = document.getElementById("tab-login-btn");
  const tabRegBtn = document.getElementById("tab-register-btn");
  const formLogin = document.getElementById("form-login");
  const formReg = document.getElementById("form-register");

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

  // Login
  formLogin.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("login-username").value.trim().toLowerCase();
    const password = document.getElementById("login-password").value;

    const user = state.users.find(u => u.username.toLowerCase() === username && u.password === password);

    if (user) {
      document.getElementById("login-username").value = "";
      document.getElementById("login-password").value = "";
      loginUserSuccess(user);
    } else {
      alert("❌ Usuario o contraseña incorrectos.");
    }
  });

  // Registro
  formReg.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("reg-username").value.trim().toLowerCase();
    const name = document.getElementById("reg-name").value.trim();
    const avatar = document.getElementById("reg-avatar").value.trim() || "👤";
    const password = document.getElementById("reg-password").value;

    if (!username || !name || !password) return;

    if (state.users.some(u => u.username.toLowerCase() === username)) {
      alert("⚠️ Ese nombre de usuario ya existe. Elige otro.");
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

    // Guardar en Google Sheets / local
    state.users.push(newUser);
    state.predictions[newUser.id] = {};

    await postToCloud("registerUser", { user: newUser });

    document.getElementById("reg-username").value = "";
    document.getElementById("reg-name").value = "";
    document.getElementById("reg-password").value = "";

    loginUserSuccess(newUser);
    showToast("¡Cuenta creada y guardada!");
  });

  // Logout
  document.getElementById("btn-logout").addEventListener("click", () => {
    if (confirm("¿Deseas cerrar la sesión actual?")) {
      showAuthScreen();
      showToast("Sesión cerrada");
    }
  });
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
    if (b.getAttribute("data-tab") === tabId) {
      b.classList.add("active");
    } else {
      b.classList.remove("active");
    }
  });

  tabContents.forEach(c => {
    if (c.id === tabId) {
      c.classList.add("active");
    } else {
      c.classList.remove("active");
    }
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

// ==================== EVENT LISTENERS ====================
function initAppEventListeners() {
  // Botón Actualizar datos desde Google Sheets
  document.getElementById("btn-refresh-data").addEventListener("click", async () => {
    await loadInitialState();
    renderAllViews();
    showToast("🔄 Datos actualizados");
  });

  // Compartir en WhatsApp
  document.getElementById("btn-export-wa").addEventListener("click", exportRankingWhatsApp);

  // Guardar Mi Quiniela
  document.getElementById("btn-save-pronosticos").addEventListener("click", saveMyQuiniela);

  // Relleno Aleatorio
  document.getElementById("btn-random-fill").addEventListener("click", randomFillMyQuiniela);

  // Limpiar
  document.getElementById("btn-clear-my-preds").addEventListener("click", clearMyQuiniela);

  // Guardar Resultados Reales (Admin)
  document.getElementById("btn-save-real-results").addEventListener("click", saveAdminRealResults);

  // Añadir Partido (Admin)
  document.getElementById("form-add-match").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser || currentUser.role !== "admin") return;

    const localInput = document.getElementById("match-local");
    const visitorInput = document.getElementById("match-visitor");
    const dateInput = document.getElementById("match-date");

    const local = localInput.value.trim();
    const visitor = visitorInput.value.trim();
    const date = dateInput.value.trim() || "Por determinar";

    if (!local || !visitor) return;

    const newMatch = {
      id: "m_" + Date.now(),
      local,
      visitor,
      date,
      signResult: null
    };

    state.matches.push(newMatch);
    await postToCloud("addMatch", { match: newMatch });

    localInput.value = "";
    visitorInput.value = "";
    dateInput.value = "";

    renderAllViews();
    showToast("Partido añadido y sincronizado");
  });

  // Cargar Partidos Demo (Admin)
  document.getElementById("btn-admin-demo").addEventListener("click", async () => {
    if (!currentUser || currentUser.role !== "admin") return;
    if (confirm("¿Cargar los partidos demo en Google Sheets?")) {
      state.matches = LOCAL_FALLBACK_DATA.matches;
      await postToCloud("seedDemoData");
      renderAllViews();
      showToast("Partidos de demostración cargados");
    }
  });
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
  tbody.innerHTML = "";

  const players = state.users.filter(u => u.role === "player" || Object.keys(state.predictions[u.id] || {}).length > 0);

  if (players.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">No hay jugadores registrados todavía.</td></tr>`;
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
      if (pred && pred === match.signResult) {
        hits++;
      } else {
        misses++;
      }
    });

    const effectiveness = totalFinished > 0 ? Math.round((hits / totalFinished) * 100) : 0;

    return {
      user,
      hits,
      misses,
      effectiveness
    };
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
  table.innerHTML = "";

  const players = state.users.filter(u => u.role === "player" || Object.keys(state.predictions[u.id] || {}).length > 0);

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
          badgeClass = (predSign === match.signResult) ? "sign-hit" : "sign-miss";
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

  // Guardar en Google Sheets / local
  await postToCloud("savePredictions", {
    userId: currentUser.id,
    predictions: newPredictions
  });

  renderRankingTable();
  renderQuinielaMatrix();
  showToast(`¡Quiniela guardada en Google Sheets!`);
}

function randomFillMyQuiniela() {
  const signs = ["1", "X", "2"];
  const rows = document.querySelectorAll("#quiniela-matches-list .quiniela-options");
  
  rows.forEach(row => {
    const randomSign = signs[Math.floor(Math.random() * signs.length)];
    const buttons = row.querySelectorAll(".btn-1x2");
    buttons.forEach(b => {
      if (b.getAttribute("data-sign") === randomSign) {
        b.classList.add("selected");
      } else {
        b.classList.remove("selected");
      }
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

  await postToCloud("saveResults", { matches: updates });

  renderRankingTable();
  renderQuinielaMatrix();
  showToast("✅ Resultados guardados en Google Sheets y clasificación actualizada");
}

// ==================== TAB 4: PANEL ADMIN ====================
function renderAdminManageTab() {
  document.getElementById("matches-count").textContent = state.matches ? state.matches.length : 0;
  const matchesList = document.getElementById("admin-matches-manage-list");
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
        <button class="btn btn-danger-outline btn-sm btn-delete-match" data-match="${m.id}">🗑️</button>
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
          await postToCloud("deleteMatch", { matchId: mid });
          renderAllViews();
          showToast("Partido eliminado");
        }
      });
    });
  }

  // Lista de usuarios
  const usersList = document.getElementById("users-list");
  const userCount = document.getElementById("user-count");
  usersList.innerHTML = "";

  const players = state.users.filter(u => u.role === "player");
  userCount.textContent = players.length;

  if (players.length === 0) {
    usersList.innerHTML = `<li style="text-align: center; color: var(--text-muted); padding: 0.5rem;">No hay jugadores registrados</li>`;
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
        <button class="btn btn-danger-outline btn-sm btn-delete-user" data-user="${p.id}">🗑️ Eliminar</button>
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
          await postToCloud("deleteUser", { userId: uid });
          renderAllViews();
          showToast("Jugador eliminado");
        }
      });
    });
  }
}

// ==================== EXPORTAR A WHATSAPP ====================
function exportRankingWhatsApp() {
  const players = state.users.filter(u => u.role === "player" || Object.keys(state.predictions[u.id] || {}).length > 0);

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
      if (userPreds[match.id] === match.signResult) {
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
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}
