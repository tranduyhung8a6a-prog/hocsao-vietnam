/**
 * HọcSáo — Main Application JS
 * Dark mode · Vietnamese flute learning app
 * No frameworks — vanilla JS
 */

'use strict';

/* ============================================================
   GLOBAL APP STATE
   ============================================================ */
window.App = {
  version: '0.1.0',
  theme: 'dark',                 // only dark mode for now
  audioPermission: false,        // microphone granted?
  currentNote: null,             // { note_viet, note_west, octave }
  currentFluteType: 'C',         // 'C' | 'D' | 'G'
  sessionActive: false,
  stats: { today: 0, week: 0, total: 0 },
  _toastQueue: [],
  _toastRunning: false,
};

/* ============================================================
   DOM READY
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNavActiveState();
  loadStats();
  setupAudioPermissionTrigger();
  console.log(`🎵 HọcSáo v${App.version} khởi động`);
});

/* ============================================================
   THEME
   ============================================================ */
function initTheme() {
  const saved = localStorage.getItem('hocsao_theme') || 'dark';
  App.theme = saved;
  document.documentElement.setAttribute('data-theme', saved);
}

function setTheme(theme) {
  App.theme = theme;
  localStorage.setItem('hocsao_theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
}

/* ============================================================
   NAVIGATION ACTIVE STATE
   ============================================================ */
function initNavActiveState() {
  const path = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-link[data-path]');

  navLinks.forEach(link => {
    const linkPath = link.getAttribute('data-path');
    link.classList.remove('active');

    if (linkPath === '/' && path === '/') {
      link.classList.add('active');
    } else if (linkPath !== '/' && path.startsWith(linkPath)) {
      link.classList.add('active');
    }
  });
}

/* ============================================================
   TOAST NOTIFICATION SYSTEM
   ============================================================ */
const TOAST_ICONS = {
  success: '✅',
  warning: '⚠️',
  error:   '❌',
  info:    'ℹ️',
};

const TOAST_DURATION = {
  success: 3000,
  warning: 4000,
  error:   5000,
  info:    3500,
};

/**
 * Show a toast notification.
 * @param {string} message  - Message text (Vietnamese)
 * @param {'success'|'warning'|'error'|'info'} type
 * @param {number} [duration] - ms override
 */
function showToast(message, type = 'info', duration) {
  const container = getOrCreateToastContainer();
  const dur = duration ?? TOAST_DURATION[type] ?? 3500;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${TOAST_ICONS[type] ?? 'ℹ️'}</span>
    <span class="toast-msg">${escapeHtml(message)}</span>
    <button class="toast-close" aria-label="Đóng thông báo" onclick="dismissToast(this.parentElement)">✕</button>
  `;

  container.appendChild(toast);

  // Auto-dismiss
  const timer = setTimeout(() => dismissToast(toast), dur);
  toast._timer = timer;

  return toast;
}

function dismissToast(toast) {
  if (!toast || toast._dismissed) return;
  toast._dismissed = true;
  clearTimeout(toast._timer);
  toast.classList.add('hiding');
  toast.addEventListener('animationend', () => toast.remove(), { once: true });
  // Fallback remove
  setTimeout(() => toast.remove(), 400);
}

function getOrCreateToastContainer() {
  let c = document.getElementById('toast-container');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toast-container';
    c.className = 'toast-container';
    c.setAttribute('aria-label', 'Thông báo');
    document.body.appendChild(c);
  }
  return c;
}

// Expose globally
window.showToast = showToast;
window.dismissToast = dismissToast;

/* ============================================================
   AUDIO PERMISSION
   ============================================================ */
function setupAudioPermissionTrigger() {
  // Try silent check first (for repeat visits)
  if (navigator.permissions) {
    navigator.permissions.query({ name: 'microphone' }).then(result => {
      if (result.state === 'granted') {
        App.audioPermission = true;
      }
    }).catch(() => {});
  }
}

/**
 * Request microphone permission with a friendly dialog.
 * Returns Promise<boolean>
 */
async function requestAudioPermission() {
  if (App.audioPermission) return true;

  // Show our custom dialog first
  const confirmed = await showPermissionDialog();
  if (!confirmed) return false;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Stop all tracks (we just needed the grant)
    stream.getTracks().forEach(t => t.stop());
    App.audioPermission = true;
    showToast('Quyền microphone đã được cấp! 🎤', 'success');
    return true;
  } catch (err) {
    console.error('Microphone permission denied:', err);
    showToast('Không thể truy cập microphone. Vui lòng kiểm tra cài đặt trình duyệt.', 'error');
    return false;
  }
}

function showPermissionDialog() {
  return new Promise(resolve => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    backdrop.innerHTML = `
      <div class="permission-dialog" role="dialog" aria-modal="true" aria-labelledby="perm-title">
        <div class="permission-icon" aria-hidden="true">🎤</div>
        <h2 class="permission-title" id="perm-title">Quyền truy cập Microphone</h2>
        <p class="permission-desc">
          HọcSáo cần quyền truy cập microphone để lắng nghe tiếng sáo của bạn
          và phân tích cao độ theo thời gian thực.<br><br>
          Âm thanh <strong>không được lưu</strong> hay gửi đến bất kỳ máy chủ nào.
        </p>
        <div class="flex gap-12 justify-center">
          <button class="btn btn-secondary" id="perm-deny">Từ chối</button>
          <button class="btn btn-primary" id="perm-allow">🎵 Cho phép</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add('open'));

    const close = (val) => {
      backdrop.classList.remove('open');
      setTimeout(() => backdrop.remove(), 300);
      resolve(val);
    };

    backdrop.querySelector('#perm-allow').addEventListener('click', () => close(true));
    backdrop.querySelector('#perm-deny').addEventListener('click', () => close(false));
    backdrop.addEventListener('click', e => { if (e.target === backdrop) close(false); });
  });
}

window.requestAudioPermission = requestAudioPermission;

/* ============================================================
   HELPER FUNCTIONS
   ============================================================ */

/**
 * Format note name with subscript octave.
 * @param {string} note_viet - e.g. "Đô"
 * @param {number} octave    - e.g. 4
 * @returns {string}         - "Đô₄"
 */
function formatNote(note_viet, octave) {
  const SUBSCRIPTS = { 0:'₀',1:'₁',2:'₂',3:'₃',4:'₄',5:'₅',6:'₆',7:'₇',8:'₈',9:'₉' };
  const sub = String(octave).split('').map(d => SUBSCRIPTS[d] ?? d).join('');
  return `${note_viet}${sub}`;
}

/**
 * Convert cent offset to 0–100 percentage for meter display.
 * Range: -50 to +50 cents → 0 to 100%
 * @param {number} cent
 * @returns {number} 0–100
 */
function centToPercent(cent) {
  const clamped = Math.max(-50, Math.min(50, cent));
  return (clamped + 50);  // 0–100
}

/**
 * Convert score 0–100 to grade letter and color.
 * @param {number} score
 * @returns {{ grade: string, color: string, label: string }}
 */
function scoreToGrade(score) {
  if (score >= 95) return { grade: 'S', color: '#d29922', label: 'Xuất sắc' };
  if (score >= 85) return { grade: 'A', color: '#3fb950', label: 'Giỏi' };
  if (score >= 70) return { grade: 'B', color: '#58a6ff', label: 'Khá' };
  if (score >= 50) return { grade: 'C', color: '#f78166', label: 'Trung bình' };
  return { grade: 'F', color: '#f85149', label: 'Cần cố gắng' };
}

/**
 * Format seconds as MM:SS
 */
function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Simple HTML escape
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Debounce function
 */
function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// Expose helpers
window.formatNote    = formatNote;
window.centToPercent = centToPercent;
window.scoreToGrade  = scoreToGrade;
window.formatDuration = formatDuration;

/* ============================================================
   STATS LOADER
   ============================================================ */
async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    if (!res.ok) return;
    const data = await res.json();
    App.stats = data;
    renderStats(data);
  } catch (e) {
    // API not ready yet — silent fail
  }
}

function renderStats(data) {
  const map = {
    'stat-today': data.today ?? 0,
    'stat-week':  data.week  ?? 0,
    'stat-total': data.total ?? 0,
  };
  Object.entries(map).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) animateCount(el, val);
  });
}

function animateCount(el, target) {
  const start = 0;
  const duration = 800;
  const startTime = performance.now();
  const update = (now) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + eased * (target - start));
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

/* ============================================================
   SEARCH FILTER (for theory page)
   ============================================================ */
function initSearchFilter(inputId, cardSelector) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.addEventListener('input', debounce(() => {
    const q = input.value.trim().toLowerCase();
    const cards = document.querySelectorAll(cardSelector);
    let visible = 0;

    cards.forEach(card => {
      const text = card.textContent.toLowerCase();
      const match = !q || text.includes(q);
      card.style.display = match ? '' : 'none';
      if (match) visible++;
    });

    // Empty state
    const emptyEl = document.getElementById('search-empty');
    if (emptyEl) emptyEl.style.display = visible === 0 ? '' : 'none';
  }, 200));
}

window.initSearchFilter = initSearchFilter;

/* ============================================================
   SESSION TIMER (shared by practice page)
   ============================================================ */
class SessionTimer {
  constructor(displayEl) {
    this.el = displayEl;
    this.seconds = 0;
    this._interval = null;
  }

  start() {
    this.seconds = 0;
    this._interval = setInterval(() => {
      this.seconds++;
      if (this.el) this.el.textContent = formatDuration(this.seconds);
    }, 1000);
  }

  stop() {
    clearInterval(this._interval);
    this._interval = null;
  }

  reset() {
    this.stop();
    this.seconds = 0;
    if (this.el) this.el.textContent = '00:00';
  }

  get elapsed() { return this.seconds; }
}

window.SessionTimer = SessionTimer;

/* ============================================================
   GENERIC MODAL HELPERS
   ============================================================ */
function openModal(backdropEl) {
  backdropEl.style.display = 'flex';
  requestAnimationFrame(() => backdropEl.classList.add('open'));
}

function closeModal(backdropEl) {
  backdropEl.classList.remove('open');
  setTimeout(() => { backdropEl.style.display = 'none'; }, 300);
}

window.openModal  = openModal;
window.closeModal = closeModal;
