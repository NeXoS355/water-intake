// HTTPS erzwingen (Sicherheit)
if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
  location.replace(`https:${window.location.href.substring(window.location.protocol.length)}`);
}

// ============================================
// Toast-Nachrichten
// ============================================

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast ${type} show`;

  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// ============================================
// Storage-Hilfsfunktionen mit Fehlerbehandlung
// ============================================

function isLocalStorageAvailable() {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

function safeGetItem(key, defaultValue = null) {
  try {
    if (!isLocalStorageAvailable()) {
      console.warn('localStorage nicht verfügbar');
      return defaultValue;
    }
    const value = localStorage.getItem(key);
    return value !== null ? value : defaultValue;
  } catch (error) {
    console.error(`Fehler beim Lesen von "${key}":`, error);
    return defaultValue;
  }
}

function safeSetItem(key, value) {
  try {
    if (!isLocalStorageAvailable()) {
      showToast('Speichern nicht möglich', 'error');
      return false;
    }
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error(`Fehler beim Speichern von "${key}":`, error);
    if (error.name === 'QuotaExceededError') {
      showToast('Speicher voll', 'error');
    } else {
      showToast('Fehler beim Speichern', 'error');
    }
    return false;
  }
}

function safeParseJSON(jsonString, defaultValue = null) {
  try {
    return jsonString ? JSON.parse(jsonString) : defaultValue;
  } catch (error) {
    console.error('Fehler beim Parsen von JSON:', error);
    return defaultValue;
  }
}

// ============================================
// Firebase (lazy-loaded, non-blocking)
// ============================================

let messaging = null;

async function initFirebase() {
  try {
    const [{ initializeApp }, { getMessaging, onMessage }] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/11.1.0/firebase-messaging.js")
    ]);

    const firebaseConfig = {
      apiKey: "AIzaSyBoLabzHIJQzenkaN28wf29HbX3P1CPEqE",
      authDomain: "water-intake-ded46.firebaseapp.com",
      projectId: "water-intake-ded46",
      storageBucket: "water-intake-ded46.firebasestorage.app",
      messagingSenderId: "703290574513",
      appId: "1:703290574513:web:5d5c370facae9ba5810490",
      measurementId: "G-FXZX32HTL6"
    };

    const app = initializeApp(firebaseConfig);
    messaging = getMessaging(app);

    onMessage(messaging, (payload) => {
      console.log('Nachricht empfangen:', payload);
      if (payload.notification) {
        showToast(payload.notification.title, 'success');
      }
    });

    console.log('Firebase initialisiert');
  } catch (error) {
    console.warn('Firebase konnte nicht geladen werden:', error.message);
  }
}

// Firebase im Hintergrund laden
initFirebase();

// Funktion zum Aktivieren der Benachrichtigungen
async function enableNotifications() {
  try {
    if (!messaging) {
      await initFirebase();
      if (!messaging) {
        showToast('Firebase nicht verfügbar', 'error');
        return;
      }
    }

    if (!('Notification' in window)) {
      showToast('Browser unterstützt keine Benachrichtigungen', 'error');
      return;
    }

    if (!('serviceWorker' in navigator)) {
      showToast('Browser unterstützt keine Service Worker', 'error');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      showToast('Benachrichtigungen nicht erlaubt', 'error');
      return;
    }

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log('Service Worker registriert:', registration);

    const { getToken } = await import("https://www.gstatic.com/firebasejs/11.1.0/firebase-messaging.js");
    const currentToken = await getToken(messaging, {
      vapidKey: "BMzoBwTBIVGc8By7WNE1H6x_scsGlXhkylwE0IW-akUU_hhR-1IGAXOOXE47ZlxDC8Jok-KZ1A_K-7exZm4PkH8",
      serviceWorkerRegistration: registration
    });

    if (currentToken) {
      console.log('FCM Token:', currentToken);
      safeSetItem('fcmToken', currentToken);
      updateNotificationButton();
      showToast('Benachrichtigungen aktiviert!', 'success');
    } else {
      showToast('Kein Token erhalten', 'error');
    }
  } catch (error) {
    console.error('Fehler:', error);
    showToast(`Fehler: ${error.message}`, 'error');
  }
}

// Funktion zum Deaktivieren der Benachrichtigungen
async function disableNotifications() {
  try {
    if (messaging) {
      const { deleteToken } = await import("https://www.gstatic.com/firebasejs/11.1.0/firebase-messaging.js");
      await deleteToken(messaging);
    }
    localStorage.removeItem('fcmToken');

    // Service Worker deregistrieren
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      await reg.unregister();
    }

    updateNotificationButton();
    showToast('Benachrichtigungen deaktiviert', 'success');
  } catch (error) {
    console.error('Fehler beim Deaktivieren:', error);
    showToast(`Fehler: ${error.message}`, 'error');
  }
}

// Toggle-Funktion für den Button
function toggleNotifications() {
  if (safeGetItem('fcmToken')) {
    disableNotifications();
  } else {
    enableNotifications();
  }
}

// Button-Text je nach Status aktualisieren
function updateNotificationButton() {
  const btn = document.getElementById('notifications');
  if (!btn) return;
  if (safeGetItem('fcmToken')) {
    btn.innerHTML = '<i class="fa-solid fa-bell-slash"></i>';
    btn.setAttribute('aria-label', 'Benachrichtigungen deaktivieren');
  } else {
    btn.innerHTML = '<i class="fa-solid fa-bell"></i>';
    btn.setAttribute('aria-label', 'Benachrichtigungen aktivieren');
  }
}

document.getElementById('notifications')?.addEventListener('click', toggleNotifications);

// ============================================
// Theme-Management
// ============================================

const THEME_COLORS = {
  dark: '#0B0F19',
  light: '#F0F4F8'
};

let chartsReady = false;

function getChartColors() {
  const theme = document.documentElement.getAttribute('data-theme');
  if (theme === 'light') {
    return { filled: '#0891B2', remaining: '#E0E0E0' };
  }
  return { filled: '#00D4FF', remaining: 'rgba(255, 255, 255, 0.08)' };
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  safeSetItem('theme', theme);

  // Meta theme-color aktualisieren
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', THEME_COLORS[theme] || THEME_COLORS.dark);
  }

  // Toggle-UI aktualisieren
  const toggle = document.getElementById('theme-toggle');
  const labelLight = document.getElementById('label-light');
  const labelDark = document.getElementById('label-dark');

  if (toggle) {
    if (theme === 'dark') {
      toggle.classList.add('active');
    } else {
      toggle.classList.remove('active');
    }
  }

  if (labelLight) {
    labelLight.classList.toggle('active', theme === 'light');
  }
  if (labelDark) {
    labelDark.classList.toggle('active', theme === 'dark');
  }

  // Charts mit neuen Farben neu aufbauen (nur wenn bereits initialisiert)
  if (chartsReady) {
    rebuildAllCharts();
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  setTheme(current === 'dark' ? 'light' : 'dark');
}

// Theme aus localStorage laden
const savedTheme = safeGetItem('theme', 'dark');
setTheme(savedTheme);

document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);

// ============================================
// Validierung
// ============================================

const MIN_MENGE = 50;
const MAX_MENGE = 2000;
const MIN_GOAL = 500;
const MAX_GOAL = 10000;

function validateMenge(menge) {
  const value = parseInt(menge, 10);
  return (!isNaN(value) && value >= MIN_MENGE && value <= MAX_MENGE) ? value : null;
}

function validateGoal(goalValue) {
  const value = parseInt(goalValue, 10);
  return (!isNaN(value) && value >= MIN_GOAL && value <= MAX_GOAL) ? value : null;
}

// ============================================
// App-State
// ============================================

let total = 0;
let goal = 0;
const chartInstances = {}; // Speichert Chart-Instanzen für Live-Updates
let todayChartIndex = null; // Index des heutigen Charts

// ============================================
// UI-Update Funktionen
// ============================================

function updateWaterDisplay() {
  // Total anzeigen
  const totalElement = document.getElementById("total");
  if (totalElement) {
    totalElement.textContent = total;
  }

  // Wasserfüllung aktualisieren (prozentual zum Tagesziel)
  const waterFill = document.getElementById("waterFill");
  if (waterFill) {
    const effectiveGoal = goal > 0 ? goal : 2000;
    const percentage = Math.min((total / effectiveGoal) * 100, 100);
    waterFill.style.height = `${percentage}%`;
    waterFill.style.opacity = total > 0 ? '1' : '0';
  }
}

function getTodayTotal() {
  const items = safeParseJSON(safeGetItem('history'), []);
  if (!items || items.length === 0) return 0;

  const todayString = new Date().toLocaleDateString("de-DE");
  let todayTotal = 0;

  for (const item of items) {
    if (item.datum === todayString) {
      todayTotal += item.menge;
    }
  }

  return todayTotal;
}

// ============================================
// App initialisieren
// ============================================

// Tagesziel laden
const storedGoal = safeGetItem("DailyGoal");
if (storedGoal) {
  goal = parseInt(storedGoal, 10) || 0;
}
document.getElementById("DailyGoal").value = goal;

// Heutigen Total berechnen
total = getTodayTotal();
updateWaterDisplay();

// Benachrichtigungs-Button initialisieren
updateNotificationButton();

// Datum & Uhrzeit mit aktuellen Daten vorbelegen
function updateDateTimeInputs() {
  const now = new Date();
  document.getElementById('datum').value =
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  document.getElementById('uhrzeit').value =
    `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

updateDateTimeInputs();

// Datum & Uhrzeit aktualisieren wenn die App wieder in den Vordergrund kommt
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    updateDateTimeInputs();
  }
});

// URL Parameter verarbeiten (vor Charts, damit Einträge sofort sichtbar sind)
const urlParams = new URLSearchParams(window.location.search);

const paraMenge = validateMenge(urlParams.get("menge"));
if (paraMenge !== null) {
  addWasser(paraMenge);
}

const paraSetGoal = validateGoal(urlParams.get("setGoal"));
if (paraSetGoal !== null) {
  document.getElementById("DailyGoal").value = paraSetGoal;
  changeGoal();
}

const paraReset = urlParams.get("reset");
if (paraReset === "1") {
  clearStorage();
}

// URL immer bereinigen wenn Parameter vorhanden waren
if (window.location.search) {
  window.history.replaceState({}, document.title, '/');
}

// Charts erstellen (nach URL-Params, damit neue Einträge enthalten sind)
rebuildAllCharts();
chartsReady = true;

// ============================================
// Funktionen
// ============================================

function addWasser(menge) {
  const validMenge = validateMenge(menge);
  if (validMenge === null) {
    showToast(`Ungültige Menge (${MIN_MENGE}-${MAX_MENGE} ml)`, 'error');
    return;
  }

  const dateInput = document.getElementById('datum')?.value;
  const date = dateInput
    ? new Date(dateInput).toLocaleDateString("de-DE")
    : new Date().toLocaleDateString("de-DE");
  const todayString = new Date().toLocaleDateString("de-DE");

  // Aktuellen History-Array laden
  let items = safeParseJSON(safeGetItem('history'), []);
  if (!Array.isArray(items)) items = [];

  // Neuen Eintrag hinzufügen
  items.push({ datum: date, menge: validMenge });

  // Speichern
  if (safeSetItem('history', JSON.stringify(items))) {
    // UI aktualisieren wenn es für heute ist
    if (date === todayString) {
      total += validMenge;
      updateWaterDisplay();
      updateTodayChart();
    }
    showToast(`+${validMenge} ml hinzugefügt`, 'success');
  }
}

function changeGoal() {
  const inputGoal = document.getElementById("DailyGoal")?.value;
  const validGoal = validateGoal(inputGoal);

  if (validGoal === null) {
    showToast(`Ungültiges Ziel (${MIN_GOAL}-${MAX_GOAL} ml)`, 'error');
    document.getElementById("DailyGoal").value = goal;
    return;
  }

  goal = validGoal;
  if (safeSetItem("DailyGoal", String(goal))) {
    updateWaterDisplay();
    updateTodayChart();
    showToast(`Tagesziel: ${goal} ml`, 'success');
  }
}

function createChart(totalValue, goalValue, id, date) {
  const canvas = document.getElementById(`myChart${id}`);
  if (!canvas) return;

  // Existierende Chart-Instanz zerstören, bevor eine neue erstellt wird
  if (chartInstances[id]) {
    chartInstances[id].destroy();
  }

  // Prüfen ob das der heutige Chart ist
  const todayString = new Date().toLocaleDateString("de-DE");
  if (date === todayString) {
    todayChartIndex = id;
  }

  const chartColors = getChartColors();

  const data = {
    labels: ["Getrunken", ""],
    datasets: [{
      data: [totalValue, goalValue],
      backgroundColor: [chartColors.filled, chartColors.remaining],
      borderColor: [chartColors.filled, chartColors.remaining],
      borderWidth: 1
    }]
  };

  const options = {
    cutout: '60%',
    animation: {
      animateRotate: true,
      animateScale: true
    },
    plugins: {
      legend: { display: false }
    }
  };

  const ctx = canvas.getContext('2d');
  const chartInstance = new Chart(ctx, { type: 'doughnut', data, options });

  // Chart-Instanz speichern für spätere Updates
  chartInstances[id] = chartInstance;

  const descElement = document.getElementById(`desc${id}`);
  const valElement = document.getElementById(`val${id}`);

  if (descElement) descElement.textContent = date;
  if (valElement) valElement.textContent = totalValue;
}

function rebuildAllCharts() {
  // Alle bestehenden Charts zerstören
  for (const id in chartInstances) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
  todayChartIndex = null;

  // Beschriftungen zurücksetzen
  for (let i = 0; i < 7; i++) {
    const descEl = document.getElementById(`desc${i}`);
    const valEl = document.getElementById(`val${i}`);
    if (descEl) descEl.textContent = '';
    if (valEl) valEl.textContent = '';
  }

  const items = safeParseJSON(safeGetItem('history'), []);
  if (!items || items.length === 0) return;

  // Tägliche Summen berechnen
  const dailyTotals = {};
  for (const item of items) {
    dailyTotals[item.datum] = (dailyTotals[item.datum] || 0) + item.menge;
  }

  // Nach Datum sortieren (neueste zuerst)
  const dates = Object.keys(dailyTotals);
  dates.sort((a, b) => {
    const [d1, m1, y1] = a.split('.');
    const [d2, m2, y2] = b.split('.');
    return new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1);
  });

  for (let i = 0; i < Math.min(dates.length, 7); i++) {
    const date = dates[i];
    const dayTotal = dailyTotals[date];
    const remaining = dayTotal < goal ? goal - dayTotal : 0;
    createChart(dayTotal, remaining, i, date);
  }
}

function updateTodayChart() {
  if (todayChartIndex === null) {
    // Heute ist der erste Eintrag - alle Charts neu aufbauen,
    // damit die bisherigen Tage korrekt nach rechts rutschen
    rebuildAllCharts();
    return;
  }

  // Existierenden Chart aktualisieren
  const chart = chartInstances[todayChartIndex];
  if (chart) {
    const chartColors = getChartColors();
    const remaining = total < goal ? goal - total : 0;
    chart.data.datasets[0].data = [total, remaining];
    chart.data.datasets[0].backgroundColor = [chartColors.filled, chartColors.remaining];
    chart.data.datasets[0].borderColor = [chartColors.filled, chartColors.remaining];
    chart.update('active');

    // Wert-Anzeige aktualisieren
    const valElement = document.getElementById(`val${todayChartIndex}`);
    if (valElement) valElement.textContent = total;
  }
}

function clearStorage() {
  if (confirm('Alle Daten löschen?')) {
    try {
      localStorage.clear();
      showToast('Daten gelöscht', 'success');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      showToast('Fehler beim Löschen', 'error');
    }
  }
}

// Event-Listener registrieren
document.getElementById('goal')?.addEventListener('click', changeGoal);
document.getElementById('reset')?.addEventListener('click', clearStorage);

document.querySelectorAll('.water-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const menge = parseInt(btn.dataset.menge, 10);
    addWasser(menge);
  });
});
