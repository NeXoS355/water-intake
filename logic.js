import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-messaging.js";

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
// Firebase Konfiguration
// ============================================

const firebaseConfig = {
  apiKey: "AIzaSyBoLabzHIJQzenkaN28wf29HbX3P1CPEqE",
  authDomain: "water-intake-ded46.firebaseapp.com",
  projectId: "water-intake-ded46",
  storageBucket: "water-intake-ded46.firebasestorage.app",
  messagingSenderId: "703290574513",
  appId: "1:703290574513:web:5d5c370facae9ba5810490",
  measurementId: "G-FXZX32HTL6"
};

// Firebase initialisieren
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Nachrichten empfangen, wenn die Anwendung aktiv ist
onMessage(messaging, (payload) => {
  console.log('Nachricht empfangen:', payload);
  if (payload.notification) {
    showToast(payload.notification.title, 'success');
  }
});

// Funktion zum Aktivieren der Benachrichtigungen
async function enableNotifications() {
  try {
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

    const currentToken = await getToken(messaging, {
      vapidKey: "BMzoBwTBIVGc8By7WNE1H6x_scsGlXhkylwE0IW-akUU_hhR-1IGAXOOXE47ZlxDC8Jok-KZ1A_K-7exZm4PkH8",
      serviceWorkerRegistration: registration
    });

    if (currentToken) {
      console.log('FCM Token:', currentToken);
      safeSetItem('fcmToken', currentToken);
      showToast('Benachrichtigungen aktiviert!', 'success');
    } else {
      showToast('Kein Token erhalten', 'error');
    }
  } catch (error) {
    console.error('Fehler:', error);
    showToast(`Fehler: ${error.message}`, 'error');
  }
}

window.enableNotifications = enableNotifications;

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
  if (waterFill && goal > 0) {
    const percentage = Math.min((total / goal) * 100, 100);
    waterFill.style.height = `${percentage}%`;
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

// Datum & Uhrzeit mit aktuellen Daten vorbelegen
const today = new Date();
const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
const timeString = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

document.getElementById('datum').value = dateString;
document.getElementById('uhrzeit').value = timeString;

// Charts erstellen
const items = safeParseJSON(safeGetItem('history'), []);
if (items && items.length > 0) {
  // Nach Datum sortieren (neueste zuerst)
  items.sort((a, b) => {
    const [d1, m1, y1] = a.datum.split('.');
    const [d2, m2, y2] = b.datum.split('.');
    return new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1);
  });

  // Tägliche Summen berechnen
  const dailyTotals = {};
  for (const item of items) {
    dailyTotals[item.datum] = (dailyTotals[item.datum] || 0) + item.menge;
  }

  // Charts erstellen (max 7 Tage)
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

// URL Parameter verarbeiten
const urlParams = new URLSearchParams(window.location.search);

const paraMenge = validateMenge(urlParams.get("menge"));
if (paraMenge !== null) {
  addWasser(paraMenge);
  window.history.pushState({}, document.title, "/");
}

const paraSetGoal = validateGoal(urlParams.get("setGoal"));
if (paraSetGoal !== null) {
  document.getElementById("DailyGoal").value = paraSetGoal;
  changeGoal();
  window.history.pushState({}, document.title, "/");
}

const paraReset = urlParams.get("reset");
if (paraReset === "1") {
  clearStorage();
  window.history.pushState({}, document.title, "/");
  window.location.reload();
}

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
  if (!dateInput) {
    showToast('Bitte Datum auswählen', 'error');
    return;
  }

  const date = new Date(dateInput).toLocaleDateString("de-DE");
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

  // Prüfen ob das der heutige Chart ist
  const todayString = new Date().toLocaleDateString("de-DE");
  if (date === todayString) {
    todayChartIndex = id;
  }

  const data = {
    labels: ["Getrunken", ""],
    datasets: [{
      data: [totalValue, goalValue],
      backgroundColor: ["#64B5F6", "#E0E0E0"],
      borderColor: ["#64B5F6", "#E0E0E0"],
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

function updateTodayChart() {
  // Falls heute noch kein Chart existiert, erstellen wir einen neuen
  const todayString = new Date().toLocaleDateString("de-DE");

  if (todayChartIndex === null) {
    // Heute ist der erste Eintrag - Chart an Position 0 erstellen
    const remaining = total < goal ? goal - total : 0;
    createChart(total, remaining, 0, todayString);
    return;
  }

  // Existierenden Chart aktualisieren
  const chart = chartInstances[todayChartIndex];
  if (chart) {
    const remaining = total < goal ? goal - total : 0;
    chart.data.datasets[0].data = [total, remaining];
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

// Funktionen global verfügbar machen
window.addWasser = addWasser;
window.changeGoal = changeGoal;
window.clearStorage = clearStorage;
