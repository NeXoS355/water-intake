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
// Theme-Management
// ============================================

const THEME_COLORS = {
  dark: '#0B0F19',
  light: '#F0F4F8'
};

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
let calendarViewDate = new Date();
let calendarReady = false;

const MONTHS_DE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
                   'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

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

function getStreak() {
  const items = safeParseJSON(safeGetItem('history'), []);
  if (!items || items.length === 0) return 0;

  const dailyTotals = {};
  for (const item of items) {
    dailyTotals[item.datum] = (dailyTotals[item.datum] || 0) + item.menge;
  }

  const effectiveGoal = goal > 0 ? goal : 2000;
  const today = new Date();
  const todayStr = today.toLocaleDateString("de-DE");

  // Wenn heute das Ziel noch nicht erreicht, ab gestern zählen
  let startOffset = (dailyTotals[todayStr] || 0) >= effectiveGoal ? 0 : 1;

  let streak = 0;
  for (let i = startOffset; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toLocaleDateString("de-DE");
    if ((dailyTotals[dateStr] || 0) >= effectiveGoal) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function updateStreakDisplay() {
  const el = document.getElementById('streakDisplay');
  if (!el) return;
  const streak = getStreak();
  if (streak > 0) {
    document.getElementById('streakCount').textContent = streak;
    el.style.display = 'flex';
  } else {
    el.style.display = 'none';
  }
}

function updateGlassMarkers() {
  const container = document.getElementById('glassMarkers');
  if (!container) return;

  container.innerHTML = '';

  const items = safeParseJSON(safeGetItem('history'), []);
  const todayString = new Date().toLocaleDateString("de-DE");
  const todayItems = (items || []).filter(item => item.datum === todayString);

  if (todayItems.length === 0) return;

  todayItems.sort((a, b) => {
    if (!a.zeit && !b.zeit) return 0;
    if (!a.zeit) return 1;
    if (!b.zeit) return -1;
    return a.zeit.localeCompare(b.zeit);
  });

  const effectiveGoal = goal > 0 ? goal : 2000;
  const glassBody = document.querySelector('.glass-body');
  const glass = document.querySelector('.glass');
  const glassBodyHeight = glassBody ? glassBody.offsetHeight : 200;
  const glassPaddingTop = glass ? parseFloat(getComputedStyle(glass).paddingTop) : 10;

  let cumulative = 0;

  todayItems.forEach((item, index) => {
    cumulative += item.menge;
    const percentage = Math.min((cumulative / effectiveGoal) * 100, 100);
    const topPx = glassPaddingTop + (1 - percentage / 100) * glassBodyHeight;
    const isLatest = index === todayItems.length - 1;

    const marker = document.createElement('div');
    marker.className = 'glass-marker' + (isLatest ? ' glass-marker-latest' : '');
    marker.style.top = `${topPx}px`;

    const line = document.createElement('div');
    line.className = 'glass-marker-line';

    const timeLabel = document.createElement('span');
    timeLabel.className = 'glass-marker-time';
    timeLabel.textContent = item.zeit || '';

    marker.appendChild(line);
    marker.appendChild(timeLabel);
    container.appendChild(marker);
  });
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
updateGlassMarkers();
updateStreakDisplay();

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
    updateGlassMarkers();
    if (calendarReady) renderCalendar();
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

// Kalender erstellen (nach URL-Params, damit neue Einträge enthalten sind)
renderCalendar();
calendarReady = true;

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
  const timeInput = document.getElementById('uhrzeit')?.value || null;
  items.push({ datum: date, menge: validMenge, zeit: timeInput });

  // Speichern
  if (safeSetItem('history', JSON.stringify(items))) {
    // UI aktualisieren wenn es für heute ist
    if (date === todayString) {
      total += validMenge;
      updateWaterDisplay();
      updateTodayChart();
      updateGlassMarkers();
      updateStreakDisplay();
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
    updateGlassMarkers();
    updateStreakDisplay();
    showToast(`Tagesziel: ${goal} ml`, 'success');
  }
}

// ============================================
// Kalender
// ============================================

function renderCalendar() {
  const grid = document.getElementById('calendarGrid');
  const label = document.getElementById('calMonthLabel');
  if (!grid || !label) return;

  const year = calendarViewDate.getFullYear();
  const month = calendarViewDate.getMonth();

  label.textContent = `${MONTHS_DE[month]} ${year}`;

  const items = safeParseJSON(safeGetItem('history'), []);
  const dailyTotals = {};
  for (const item of (Array.isArray(items) ? items : [])) {
    dailyTotals[item.datum] = (dailyTotals[item.datum] || 0) + item.menge;
  }

  const effectiveGoal = goal > 0 ? goal : 2000;
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();

  // Wochentag des 1. (Mo=0 … So=6)
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  grid.innerHTML = '';

  // Leere Felder vor dem 1.
  for (let i = 0; i < firstWeekday; i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-day cal-day--empty';
    empty.setAttribute('aria-hidden', 'true');
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = new Date(year, month, d).toLocaleDateString("de-DE");
    const isToday = (year === todayYear && month === todayMonth && d === todayDay);
    const isFuture = !isToday && new Date(year, month, d) > new Date(todayYear, todayMonth, todayDay);
    const dayTotal = dailyTotals[dateStr] || 0;

    let statusClass = '';
    if (!isFuture && dayTotal > 0) {
      statusClass = dayTotal >= effectiveGoal ? ' cal-day--goal' : ' cal-day--partial';
    }

    const cell = document.createElement('div');
    cell.className = 'cal-day' + statusClass +
      (isToday ? ' cal-day--today' : '') +
      (isFuture ? ' cal-day--future' : '');
    cell.setAttribute('role', 'gridcell');
    if (!isFuture && dayTotal > 0) cell.title = `${dayTotal} ml`;

    const num = document.createElement('span');
    num.className = 'cal-day-num';
    num.textContent = d;
    cell.appendChild(num);

    if (!isFuture) {
      cell.classList.add('cal-day--clickable');
      cell.addEventListener('click', () => showDayDetail(dateStr));
    }

    grid.appendChild(cell);
  }
}

function updateTodayChart() {
  renderCalendar();
}

// Swipe-Navigation für den Kalender (Mobile)
(function () {
  let touchStartX = 0;
  let touchStartY = 0;
  const section = document.getElementById('calendarSection') ||
                  document.querySelector('.calendar-section');
  if (!section) return;

  section.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  section.addEventListener('touchend', e => {
    const dx = touchStartX - e.changedTouches[0].clientX;
    const dy = Math.abs(touchStartY - e.changedTouches[0].clientY);
    if (Math.abs(dx) > 45 && dy < 60) {
      calendarViewDate.setMonth(calendarViewDate.getMonth() + (dx > 0 ? 1 : -1));
      renderCalendar();
    }
  }, { passive: true });
}());

// ============================================
// Tagesdetail-Modal
// ============================================

function showDayDetail(dateStr) {
  const modal = document.getElementById('dayModal');
  if (!modal) return;

  const parts = dateStr.split('.');
  const date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  const dateFormatted = date.toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const allItems = safeParseJSON(safeGetItem('history'), []);
  const dayItems = (Array.isArray(allItems) ? allItems : []).filter(item => item.datum === dateStr);
  dayItems.sort((a, b) => {
    if (!a.zeit && !b.zeit) return 0;
    if (!a.zeit) return 1;
    if (!b.zeit) return -1;
    return a.zeit.localeCompare(b.zeit);
  });
  const dayTotal = dayItems.reduce((sum, item) => sum + item.menge, 0);
  const effectiveGoal = goal > 0 ? goal : 2000;
  const percent = Math.min((dayTotal / effectiveGoal) * 100, 100);

  document.getElementById('dayModalDate').textContent = dateFormatted;
  document.getElementById('dayModalAmount').textContent = `${dayTotal} ml`;

  const goalTextEl = document.getElementById('dayModalGoalText');
  if (dayTotal === 0) {
    goalTextEl.textContent = 'Kein Eintrag';
  } else if (dayTotal >= effectiveGoal) {
    goalTextEl.textContent = 'Ziel erreicht';
  } else {
    goalTextEl.textContent = `von ${effectiveGoal} ml Ziel`;
  }

  // Balken auf 0 zurücksetzen, dann animieren
  const bar = document.getElementById('dayModalBarFill');
  bar.style.transition = 'none';
  bar.style.width = '0%';
  requestAnimationFrame(() => {
    bar.style.transition = '';
    bar.style.width = `${percent}%`;
  });

  const entriesEl = document.getElementById('dayModalEntries');
  entriesEl.innerHTML = '';
  if (dayItems.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'day-modal-empty';
    empty.textContent = 'Keine Einträge für diesen Tag';
    entriesEl.appendChild(empty);
  } else {
    dayItems.forEach(item => {
      const row = document.createElement('div');
      row.className = 'day-modal-entry';
      const time = document.createElement('span');
      time.className = 'day-modal-entry-time';
      time.textContent = item.zeit || '—';
      const amount = document.createElement('span');
      amount.className = 'day-modal-entry-amount';
      amount.textContent = `+${item.menge} ml`;
      row.appendChild(time);
      row.appendChild(amount);
      entriesEl.appendChild(row);
    });
  }

  modal.setAttribute('aria-hidden', 'false');
  modal.classList.add('day-modal--open');
}

function closeDayModal() {
  const modal = document.getElementById('dayModal');
  if (!modal) return;
  modal.classList.remove('day-modal--open');
  modal.setAttribute('aria-hidden', 'true');
}

document.getElementById('dayModal')?.addEventListener('click', e => {
  if (e.target.classList.contains('day-modal-backdrop')) closeDayModal();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeDayModal();
});

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
window.addEventListener('resize', updateGlassMarkers);

document.getElementById('goal')?.addEventListener('click', changeGoal);
document.getElementById('reset')?.addEventListener('click', clearStorage);

document.querySelectorAll('.water-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const menge = parseInt(btn.dataset.menge, 10);
    addWasser(menge);
  });
});

document.getElementById('calPrev')?.addEventListener('click', () => {
  calendarViewDate.setMonth(calendarViewDate.getMonth() - 1);
  renderCalendar();
});

document.getElementById('calNext')?.addEventListener('click', () => {
  calendarViewDate.setMonth(calendarViewDate.getMonth() + 1);
  renderCalendar();
});
