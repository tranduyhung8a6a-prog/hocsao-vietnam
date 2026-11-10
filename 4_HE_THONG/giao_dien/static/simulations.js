/**
 * HọcSáo — Bộ Mô Phỏng Tương Tác Nhạc Lý & Sáo Trúc (Interactive Theory Simulations)
 * ===================================================================================
 * 1. Mô phỏng Cao độ & Khuôn nhạc Khóa Sol (15 nốt từ Đô 1 đến Đô 3)
 * 2. Mô phỏng Trường độ & Dấu lặng (Nghe độ ngân nốt tròn, trắng, đen, đơn, kép)
 * 3. Mô phỏng Cường độ (Nghe âm lượng ppp đến ff)
 * 4. Mô phỏng Đập phách & Nhịp (Hoạt họa ↓ đập xuống, ↑ nhấc lên, gõ nhịp 2/4, 3/4, 4/4, 3/8, 6/8)
 * 5. Mô phỏng Thế bấm 9 nốt sáo trúc 6 lỗ chuẩn bảng phấn
 */

'use strict';

// ── Audio Context dùng chung cho toàn bộ mô phỏng ──
let _simAudioCtx = null;
function getSimAudioContext() {
  if (!_simAudioCtx || _simAudioCtx.state === 'closed') {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    _simAudioCtx = new AudioCtx();
  }
  if (_simAudioCtx.state === 'suspended') {
    _simAudioCtx.resume();
  }
  return _simAudioCtx;
}

// Hàm phát tiếng sáo mẫu mô phỏng
function playSimFluteTone(freqHz, duration = 1.0, gainLevel = 0.3) {
  try {
    const ctx = getSimAudioContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freqHz, now);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freqHz * 2, now);

    // Rung nhẹ tự nhiên
    const vib = ctx.createOscillator();
    const vibGain = ctx.createGain();
    vib.frequency.setValueAtTime(5.0, now);
    vibGain.gain.setValueAtTime(1.5, now);
    vib.connect(vibGain);
    vibGain.connect(osc1.frequency);

    const g1 = ctx.createGain();
    const g2 = ctx.createGain();
    const master = ctx.createGain();

    g1.gain.setValueAtTime(0.75, now);
    g2.gain.setValueAtTime(0.2, now);

    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(gainLevel, now + 0.08);
    master.gain.setValueAtTime(gainLevel * 0.9, now + duration - 0.1);
    master.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc1.connect(g1);
    osc2.connect(g2);
    g1.connect(master);
    g2.connect(master);
    master.connect(ctx.destination);

    vib.start(now);
    osc1.start(now);
    osc2.start(now);
    vib.stop(now + duration);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
  } catch (e) {
    console.warn('Lỗi phát âm thanh mô phỏng:', e);
  }
}

// Phát tiếng gõ nhịp Metronome (Click)
function playSimTick(isStrong = false) {
  try {
    const ctx = getSimAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isStrong ? 1000 : 650, now);

    gain.gain.setValueAtTime(isStrong ? 0.4 : 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  } catch (e) {}
}


/* ============================================================
   1. MÔ PHỎNG CAO ĐỘ VÀ KHUÔN NHẠC KHÓA SOL (MỤC 2)
   ============================================================ */
const STAFF_NOTES_DATA = [
  { name: 'Đô 1', west: 'C1', freq: 261.63, posDesc: 'Dòng kẻ phụ thứ 1 phía dưới', staffY: 96, isLedger: true },
  { name: 'Rê 1', west: 'D1', freq: 293.66, posDesc: 'Sát phía dưới dòng kẻ thứ 1', staffY: 88, isLedger: false },
  { name: 'Mi 1', west: 'E1', freq: 329.63, posDesc: 'Nằm trên dòng kẻ thứ 1', staffY: 80, isLedger: false },
  { name: 'Fa 1', west: 'F1', freq: 349.23, posDesc: 'Ở khe thứ 1 (giữa dòng 1 và dòng 2)', staffY: 72, isLedger: false },
  { name: 'Son 1', west: 'G1', freq: 392.00, posDesc: 'Nằm trên dòng kẻ thứ 2 (Khóa Sol)', staffY: 64, isLedger: false },
  { name: 'La 1', west: 'A1', freq: 440.00, posDesc: 'Ở khe thứ 2 (giữa dòng 2 và dòng 3)', staffY: 56, isLedger: false },
  { name: 'Si 1', west: 'B1', freq: 493.88, posDesc: 'Nằm trên dòng kẻ thứ 3', staffY: 48, isLedger: false },
  { name: 'Đô 2', west: 'C2', freq: 523.25, posDesc: 'Ở khe thứ 3', staffY: 40, isLedger: false },
  { name: 'Rê 2', west: 'D2', freq: 587.33, posDesc: 'Nằm trên dòng kẻ thứ 4', staffY: 32, isLedger: false },
  { name: 'Mi 2', west: 'E2', freq: 659.25, posDesc: 'Ở khe thứ 4', staffY: 24, isLedger: false },
  { name: 'Fa 2', west: 'F2', freq: 698.46, posDesc: 'Nằm trên dòng kẻ thứ 5', staffY: 16, isLedger: false },
  { name: 'Son 2', west: 'G2', freq: 783.99, posDesc: 'Sát phía trên dòng kẻ thứ 5', staffY: 8, isLedger: false },
  { name: 'La 2', west: 'A2', freq: 880.00, posDesc: 'Nằm trên dòng kẻ phụ thứ 1 phía trên', staffY: 0, isLedger: true },
  { name: 'Si 2', west: 'B2', freq: 987.77, posDesc: 'Sát phía trên dòng kẻ phụ thứ 1', staffY: -8, isLedger: false },
  { name: 'Đô 3', west: 'C3', freq: 1046.50, posDesc: 'Nằm trên dòng kẻ phụ thứ 2 phía trên', staffY: -16, isLedger: true },
];

function initStaffSimulator() {
  const container = document.getElementById('sim-staff-container');
  if (!container) return;

  container.innerHTML = `
    <div class="card p-20" style="background: var(--surface2); border: 1px solid var(--accent); margin: 20px 0; border-radius: var(--radius-md);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
        <h4 style="margin: 0; color: var(--accent); font-size: 1rem;">🎼 Mô Phỏng Trực Quan: 15 Nốt Nhạc Trên Khuôn Nhạc Khóa Sol</h4>
        <span style="font-size: 0.8rem; color: var(--text-sec);">Bấm vào từng nốt để nghe âm & xem vị trí dòng/khe</span>
      </div>

      <!-- Khuôn nhạc SVG trực quan -->
      <div style="background: #111827; border-radius: 8px; padding: 16px; text-align: center; border: 1px solid var(--border); overflow-x: auto;">
        <svg id="staff-svg" viewBox="0 0 540 140" style="width: 100%; max-width: 540px; height: 140px; margin: 0 auto; display: block;">
          <!-- 5 Dòng kẻ chính (từ dòng 5 ở trên y=30 đến dòng 1 ở dưới y=94) -->
          <!-- Quy ước: dòng 5 = y=30, dòng 4 = y=46, dòng 3 = y=62, dòng 2 = y=78, dòng 1 = y=94 -->
          <line x1="30" y1="30" x2="510" y2="30" stroke="#4b5563" stroke-width="2" />
          <line x1="30" y1="46" x2="510" y2="46" stroke="#4b5563" stroke-width="2" />
          <line x1="30" y1="62" x2="510" y2="62" stroke="#4b5563" stroke-width="2" />
          <line x1="30" y1="78" x2="510" y2="78" stroke="#4b5563" stroke-width="2" />
          <line x1="30" y1="94" x2="510" y2="94" stroke="#4b5563" stroke-width="2" />

          <!-- Khóa Sol cách điệu -->
          <text x="35" y="86" font-size="56" fill="#00c9a7" font-family="serif" style="user-select:none;">𝄞</text>

          <!-- Dòng phụ dưới (y=110) và dòng phụ trên (y=14) khi cần -->
          <line id="ledger-bottom-1" x1="240" y1="110" x2="280" y2="110" stroke="#9ca3af" stroke-width="2" style="display:none;" />
          <line id="ledger-top-1" x1="240" y1="14" x2="280" y2="14" stroke="#9ca3af" stroke-width="2" style="display:none;" />

          <!-- Đầu nốt nhạc hiển thị -->
          <ellipse id="staff-notehead" cx="260" cy="78" rx="8" ry="6" fill="#00c9a7" transform="rotate(-20 260 78)" />
          <line id="staff-stem" x1="267" y1="78" x2="267" y2="40" stroke="#00c9a7" stroke-width="2.5" />
        </svg>

        <div id="staff-note-info" style="margin-top: 10px; font-weight: 600; color: #fff; font-size: 0.95rem;">
          Đang chọn: <span style="color: var(--accent);">Son 1 (G1)</span> — Nằm trên dòng kẻ thứ 2 (Khóa Sol)
        </div>
      </div>

      <!-- Danh sách 15 nút chọn nốt -->
      <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; justify-content: center;">
        ${STAFF_NOTES_DATA.map((n, i) => `
          <button class="btn-staff-note ${n.name === 'Son 1' ? 'active' : ''}" data-idx="${i}" 
            style="padding: 6px 10px; font-size: 0.8rem; border-radius: 6px; border: 1px solid var(--border); background: var(--surface); color: var(--text); cursor: pointer; transition: all 0.2s;">
            ${n.name}
          </button>
        `).join('')}
      </div>
    </div>
  `;

  // Xử lý sự kiện bấm nốt
  const buttons = container.querySelectorAll('.btn-staff-note');
  const notehead = document.getElementById('staff-notehead');
  const stem = document.getElementById('staff-stem');
  const info = document.getElementById('staff-note-info');
  const ledgerBottom1 = document.getElementById('ledger-bottom-1');
  const ledgerTop1 = document.getElementById('ledger-top-1');

  function updateStaff(idx) {
    const d = STAFF_NOTES_DATA[idx];
    buttons.forEach((b, i) => {
      if (i === idx) {
        b.style.background = 'var(--accent)';
        b.style.color = '#fff';
        b.style.borderColor = 'var(--accent)';
      } else {
        b.style.background = 'var(--surface)';
        b.style.color = 'var(--text)';
        b.style.borderColor = 'var(--border)';
      }
    });

    // Tính toán tọa độ Y (dòng 1 = 94, dòng 2 = 78, dòng 3 = 62, dòng 4 = 46, dòng 5 = 30)
    // Khoảng cách mỗi bậc (dòng -> khe) = 8px
    // Đô 1 (dòng phụ 1 dưới): y = 110
    // Rê 1: 102
    // Mi 1: 94
    // Fa 1: 86
    // Son 1: 78
    // La 1: 70
    // Si 1: 62
    // Đô 2: 54
    // Rê 2: 46
    // Mi 2: 38
    // Fa 2: 30
    // Son 2: 22
    // La 2: 14
    // Si 2: 6
    // Đô 3: -2
    const yMap = [110, 102, 94, 86, 78, 70, 62, 54, 46, 38, 30, 22, 14, 6, -2];
    const targetY = yMap[idx];

    notehead.setAttribute('cy', targetY);
    notehead.setAttribute('transform', `rotate(-20 260 ${targetY})`);

    // Quay đuôi nốt theo quy tắc Mục 6:
    // Nốt Si 1 (idx=6) quay lên/xuống. Nốt thấp hơn Si 1 (idx < 6) đuôi quay lên. Nốt cao hơn (idx > 6) đuôi quay xuống.
    if (idx < 6) {
      stem.setAttribute('x1', '267');
      stem.setAttribute('y1', targetY);
      stem.setAttribute('x2', '267');
      stem.setAttribute('y2', targetY - 36);
    } else {
      stem.setAttribute('x1', '253');
      stem.setAttribute('y1', targetY);
      stem.setAttribute('x2', '253');
      stem.setAttribute('y2', targetY + 36);
    }

    // Hiển thị dòng kẻ phụ
    ledgerBottom1.style.display = (idx === 0) ? 'block' : 'none'; // Đô 1
    ledgerTop1.style.display = (idx >= 12) ? 'block' : 'none';    // La 2, Đô 3

    info.innerHTML = `Đang chọn: <span style="color: var(--accent);">${d.name} (${d.west})</span> — ${d.posDesc}`;
    playSimFluteTone(d.freq, 0.8);
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-idx'));
      updateStaff(idx);
    });
  });
}


/* ============================================================
   2. MÔ PHỎNG TRƯỜNG ĐỘ & CÁC HÌNH NỐT (MỤC 3 & 12)
   ============================================================ */
const NOTE_SVGS = {
  'tron': `<svg width="40" height="40" viewBox="0 0 40 40"><ellipse cx="20" cy="20" rx="12" ry="7.5" fill="none" stroke="var(--accent)" stroke-width="3" transform="rotate(-20 20 20)"/><ellipse cx="20" cy="20" rx="4.5" ry="2.5" fill="none" stroke="var(--accent)" stroke-width="1.8" transform="rotate(-30 20 20)"/></svg>`,
  'trang': `<svg width="40" height="40" viewBox="0 0 40 40"><ellipse cx="16" cy="26" rx="8.5" ry="5.5" fill="none" stroke="var(--accent)" stroke-width="2.6" transform="rotate(-20 16 26)"/><line x1="23.5" y1="25" x2="23.5" y2="6" stroke="var(--accent)" stroke-width="2.6"/></svg>`,
  'den': `<svg width="40" height="40" viewBox="0 0 40 40"><ellipse cx="16" cy="26" rx="8.5" ry="5.5" fill="var(--accent)" transform="rotate(-20 16 26)"/><line x1="23.5" y1="25" x2="23.5" y2="6" stroke="var(--accent)" stroke-width="2.6"/></svg>`,
  'don': `<svg width="40" height="40" viewBox="0 0 40 40"><ellipse cx="14" cy="26" rx="8" ry="5.2" fill="var(--accent)" transform="rotate(-20 14 26)"/><line x1="21" y1="25" x2="21" y2="6" stroke="var(--accent)" stroke-width="2.6"/><path d="M21 6 C27 9 29 16 26 21" stroke="var(--accent)" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg>`,
  'kep': `<svg width="40" height="40" viewBox="0 0 40 40"><ellipse cx="14" cy="27" rx="8" ry="5.2" fill="var(--accent)" transform="rotate(-20 14 27)"/><line x1="21" y1="26" x2="21" y2="5" stroke="var(--accent)" stroke-width="2.6"/><path d="M21 5 C27 8 29 13 26 17" stroke="var(--accent)" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M21 11 C27 14 29 19 26 23" stroke="var(--accent)" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>`,
};

const REST_SVGS = {
  'lang_tron': `<svg width="34" height="22" viewBox="0 0 34 22"><line x1="2" y1="9" x2="32" y2="9" stroke="#9ca3af" stroke-width="1.5"/><rect x="11" y="9" width="12" height="6.5" fill="var(--accent2)"/><text x="17" y="21" font-size="7" fill="#9ca3af" text-anchor="middle">dòng 4</text></svg>`,
  'lang_trang': `<svg width="34" height="22" viewBox="0 0 34 22"><line x1="2" y1="13" x2="32" y2="13" stroke="#9ca3af" stroke-width="1.5"/><rect x="11" y="6.5" width="12" height="6.5" fill="var(--accent2)"/><text x="17" y="21" font-size="7" fill="#9ca3af" text-anchor="middle">dòng 3</text></svg>`,
  'lang_den': `<svg width="24" height="24" viewBox="0 0 24 24"><path d="M10 2 L15 8 L9 13 C14 14 13 18 10 22" stroke="var(--accent2)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  'lang_don': `<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="10" cy="7" r="2.5" fill="var(--accent2)"/><path d="M12 6 C14 6 16 8.5 15 11 L9 21" stroke="var(--accent2)" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>`,
  'lang_kep': `<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="10" cy="6" r="2.2" fill="var(--accent2)"/><circle cx="8" cy="11.5" r="2.2" fill="var(--accent2)"/><path d="M12 5 C14 5 15 7.5 14 9.5 M10 10.5 C12 10.5 13 12.5 12 14.5 L7 21" stroke="var(--accent2)" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`,
};

const DURATION_DATA = [
  { key: 'tron', name: 'Nốt Tròn', beats: 4, desc: 'Bằng 4 phách (ngân dài nhất)', restName: 'Dấu lặng tròn', restKey: 'lang_tron', restDesc: 'Treo dưới dòng 4' },
  { key: 'trang', name: 'Nốt Trắng', beats: 2, desc: 'Bằng 2 phách (1/2 nốt tròn)', restName: 'Dấu lặng trắng', restKey: 'lang_trang', restDesc: 'Tựa trên dòng 3' },
  { key: 'den', name: 'Nốt Đen', beats: 1, desc: 'Bằng 1 phách chuẩn', restName: 'Dấu lặng đen', restKey: 'lang_den', restDesc: 'Nghỉ 1 phách' },
  { key: 'don', name: 'Nốt Móc Đơn', beats: 0.5, desc: 'Bằng 1/2 phách', restName: 'Dấu lặng đơn', restKey: 'lang_don', restDesc: 'Nghỉ 1/2 phách' },
  { key: 'kep', name: 'Nốt Móc Kép', beats: 0.25, desc: 'Bằng 1/4 phách', restName: 'Dấu lặng kép', restKey: 'lang_kep', restDesc: 'Nghỉ 1/4 phách' },
];

function initDurationSimulator() {
  const container = document.getElementById('sim-duration-container');
  if (!container) return;

  container.innerHTML = `
    <div class="card p-20" style="background: var(--surface2); border: 1px solid var(--accent); margin: 20px 0; border-radius: var(--radius-md);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
        <h4 style="margin: 0; color: var(--accent); font-size: 1rem;">⏱️ Mô Phỏng Trực Quan Hình Nốt & Dấu Lặng</h4>
        <span style="font-size: 0.8rem; color: var(--text-sec);">Bấm vào từng thẻ để nghe độ dài ngân vang thực tế</span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px;">
        ${DURATION_DATA.map((d, i) => `
          <div class="card p-12 text-center duration-card" data-idx="${i}" style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; cursor: pointer; transition: all 0.2s;">
            <div style="height: 44px; display: flex; align-items: center; justify-content: center; margin-bottom: 4px;">
              ${NOTE_SVGS[d.key]}
            </div>
            <div style="font-weight: 700; font-size: 0.88rem; color: #fff;">${d.name}</div>
            <div style="font-size: 0.78rem; color: var(--accent); font-weight: 700; margin-top: 2px;">${d.beats} Phách</div>
            
            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed var(--border); display: flex; flex-direction: column; align-items: center; gap: 2px;">
              <span style="font-size: 0.7rem; color: var(--text-sec);">${d.restName}:</span>
              <div style="height: 26px; display: flex; align-items: center; justify-content: center;">
                ${REST_SVGS[d.restKey]}
              </div>
            </div>

            <button class="btn btn-sm btn-play-dur" style="margin-top: 8px; width: 100%; font-size: 0.75rem; padding: 4px 6px; background: var(--surface2); border: 1px solid var(--border); border-radius: 4px; color: var(--text); cursor: pointer;">
              ▶ Ngân ${d.beats}s
            </button>
          </div>
        `).join('')}
      </div>
      <div id="duration-status" style="margin-top: 12px; text-align: center; font-size: 0.85rem; color: var(--text-sec);">
        💡 Quy tắc: 1 Nốt Tròn = 2 Trắng = 4 Đen = 8 Móc Đơn = 16 Móc Kép
      </div>
    </div>
  `;

  container.querySelectorAll('.duration-card').forEach(card => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.getAttribute('data-idx'));
      const d = DURATION_DATA[idx];
      const durSec = d.beats * 0.8; // Quy đổi 1 phách = 0.8s
      playSimFluteTone(440, durSec);
      
      card.style.borderColor = 'var(--accent)';
      card.style.transform = 'scale(0.98)';
      const status = document.getElementById('duration-status');
      if (status) status.innerHTML = `🔊 Đang ngân <strong style="color:var(--accent);">${d.name}</strong> (${d.beats} phách = ${durSec.toFixed(1)} giây)`;

      setTimeout(() => {
        card.style.borderColor = 'var(--border)';
        card.style.transform = 'none';
      }, durSec * 1000);
    });
  });
}


/* ============================================================
   3. MÔ PHỎNG CƯỜNG ĐỘ (MỤC 4)
   ============================================================ */
const DYNAMICS_DATA = [
  { sym: 'ppp', name: 'Pianississimo', desc: 'Cực kỳ nhẹ', gain: 0.05 },
  { sym: 'pp',  name: 'Pianissimo',     desc: 'Rất nhẹ',      gain: 0.10 },
  { sym: 'p',   name: 'Piano',          desc: 'Nhẹ',          gain: 0.18 },
  { sym: 'mp',  name: 'Mezzo-piano',    desc: 'Nhẹ vừa',      gain: 0.30 },
  { sym: 'f',   name: 'Forte',          desc: 'Mạnh',         gain: 0.60 },
  { sym: 'ff',  name: 'Fortissimo',     desc: 'Rất mạnh',     gain: 0.90 },
];

function initDynamicsSimulator() {
  const container = document.getElementById('sim-dynamics-container');
  if (!container) return;

  container.innerHTML = `
    <div class="card p-20" style="background: var(--surface2); border: 1px solid var(--accent); margin: 20px 0; border-radius: var(--radius-md);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
        <h4 style="margin: 0; color: var(--accent); font-size: 1rem;">🔊 Mô Phỏng Ký Hiệu Cường Độ (Mạnh — Nhẹ)</h4>
        <span style="font-size: 0.8rem; color: var(--text-sec);">Bấm để cảm nhận âm lượng thực tế</span>
      </div>

      <div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">
        ${DYNAMICS_DATA.map(d => `
          <button class="btn-dyn" data-gain="${d.gain}" data-name="${d.name}" data-desc="${d.desc}" data-sym="${d.sym}"
            style="flex: 1; min-width: 80px; padding: 12px 8px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--text); cursor: pointer; text-align: center; transition: all 0.2s;">
            <div style="font-size: 1.4rem; font-weight: 800; font-style: italic; color: var(--accent);">${d.sym}</div>
            <div style="font-size: 0.75rem; font-weight: 600; margin-top: 4px;">${d.desc}</div>
          </button>
        `).join('')}
      </div>
      <div id="dyn-info" style="margin-top: 12px; text-align: center; font-size: 0.85rem; color: var(--text-sec);">
        Bấm vào một ký hiệu để nghe sự khác biệt về độ mạnh - nhẹ
      </div>
    </div>
  `;

  container.querySelectorAll('.btn-dyn').forEach(btn => {
    btn.addEventListener('click', () => {
      const gain = parseFloat(btn.getAttribute('data-gain'));
      const sym = btn.getAttribute('data-sym');
      const name = btn.getAttribute('data-name');
      const desc = btn.getAttribute('data-desc');

      playSimFluteTone(392, 1.2, gain);
      const info = document.getElementById('dyn-info');
      if (info) info.innerHTML = `Đang phát cường độ <strong style="color:var(--accent);">${sym} (${name})</strong> — ${desc}`;
    });
  });
}


/* ============================================================
   4. MÔ PHỎNG ĐẬP PHÁCH & SỐ CHỈ NHỊP (MỤC 9, 10, 11)
   ============================================================ */
let _metroTimer = null;
let _metroRunning = false;
let _currentBeat = 0;
let _currentSignature = '2/4';

const TIME_SIGNATURES = {
  '2/4': { beats: 2, desc: 'Phách 1 MẠNH — Phách 2 NHẸ' },
  '3/4': { beats: 3, desc: 'Phách 1 MẠNH — Phách 2 NHẸ — Phách 3 NHẸ' },
  '4/4': { beats: 4, desc: 'Phách 1 MẠNH — Phách 2 NHẸ — Phách 3 MẠNH VỪA — Phách 4 NHẸ' },
  '3/8': { beats: 3, desc: '3 Phách móc đơn' },
  '6/8': { beats: 6, desc: '6 Phách móc đơn (Nhịp kép)' }
};

function initMetronomeSimulator() {
  const container = document.getElementById('sim-metronome-container');
  if (!container) return;

  container.innerHTML = `
    <div class="card p-20" style="background: var(--surface2); border: 1px solid var(--accent); margin: 20px 0; border-radius: var(--radius-md);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
        <h4 style="margin: 0; color: var(--accent); font-size: 1rem;">🥁 Mô Phỏng Đập Phách (↓ Đập xuống — ↑ Nhấc lên)</h4>
        <span style="font-size: 0.8rem; color: var(--text-sec);">Hoạt họa nhịp điệu thời gian thực</span>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: center;">
        <!-- Khối điều khiển nhịp -->
        <div>
          <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
            ${Object.keys(TIME_SIGNATURES).map(sig => `
              <button class="btn-sig ${sig === '2/4' ? 'active' : ''}" data-sig="${sig}"
                style="padding: 6px 12px; border-radius: 6px; border: 1px solid var(--border); background: ${sig === '2/4' ? 'var(--accent)' : 'var(--surface)'}; color: ${sig === '2/4' ? '#fff' : 'var(--text)'}; cursor: pointer; font-weight: 700;">
                ${sig}
              </button>
            `).join('')}
          </div>

          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
            <label style="font-size: 0.85rem; color: var(--text-sec); min-width: 60px;">Tốc độ:</label>
            <input type="range" id="metro-bpm" min="40" max="140" value="70" style="flex: 1;" />
            <span id="bpm-val" style="font-weight: 700; width: 50px; text-align: right;">70 BPM</span>
          </div>

          <button id="btn-toggle-metro" class="btn btn-primary" style="width: 100%; padding: 10px; font-weight: 700; background: var(--accent); color: #fff; border: none; border-radius: 6px; cursor: pointer;">
            ▶ BẮT ĐẦU ĐẬP NHỊP
          </button>
        </div>

        <!-- Khối hoạt họa đập phách -->
        <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 16px; text-align: center;">
          <div id="metro-arrow" style="font-size: 3.5rem; line-height: 1; transition: transform 0.15s ease; color: var(--accent);">
            ↓
          </div>
          <div id="metro-action" style="font-weight: 800; font-size: 1.1rem; margin-top: 6px; color: #fff;">
            ĐẬP XUỐNG
          </div>
          <div id="metro-beat-label" style="font-size: 0.85rem; color: var(--text-sec); margin-top: 4px;">
            Phách: 1 / 2 (MẠNH)
          </div>
        </div>
      </div>

      <div id="sig-desc" style="margin-top: 12px; font-size: 0.85rem; color: var(--text-sec); text-align: center;">
        Quy luật: ${TIME_SIGNATURES['2/4'].desc}
      </div>
    </div>
  `;

  const btnToggle = document.getElementById('btn-toggle-metro');
  const bpmInput = document.getElementById('metro-bpm');
  const bpmVal = document.getElementById('bpm-val');
  const arrow = document.getElementById('metro-arrow');
  const actionText = document.getElementById('metro-action');
  const beatLabel = document.getElementById('metro-beat-label');
  const sigDesc = document.getElementById('sig-desc');
  const sigButtons = container.querySelectorAll('.btn-sig');

  bpmInput.addEventListener('input', () => {
    bpmVal.textContent = `${bpmInput.value} BPM`;
    if (_metroRunning) {
      stopMetronome();
      startMetronome();
    }
  });

  sigButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      sigButtons.forEach(b => {
        b.style.background = 'var(--surface)';
        b.style.color = 'var(--text)';
      });
      btn.style.background = 'var(--accent)';
      btn.style.color = '#fff';
      _currentSignature = btn.getAttribute('data-sig');
      _currentBeat = 0;
      sigDesc.textContent = `Quy luật: ${TIME_SIGNATURES[_currentSignature].desc}`;
      if (_metroRunning) {
        stopMetronome();
        startMetronome();
      }
    });
  });

  function tick() {
    const totalBeats = TIME_SIGNATURES[_currentSignature].beats;
    _currentBeat = (_currentBeat % totalBeats) + 1;
    const isStrong = (_currentBeat === 1);
    const isMedium = (_currentSignature === '4/4' && _currentBeat === 3);

    playSimTick(isStrong);

    // Giai đoạn 1: ĐẬP XUỐNG (↓)
    arrow.textContent = '↓';
    arrow.style.transform = 'translateY(8px)';
    arrow.style.color = isStrong ? '#ef4444' : (isMedium ? '#eab308' : 'var(--accent)');
    actionText.textContent = 'ĐẬP XUỐNG (↓)';
    actionText.style.color = isStrong ? '#ef4444' : '#fff';
    beatLabel.textContent = `Phách: ${_currentBeat} / ${totalBeats} (${isStrong ? 'MẠNH' : (isMedium ? 'MẠNH VỪA' : 'NHẸ')})`;

    // Giai đoạn 2: NHẤC LÊN (↑) ở nửa sau của phách
    const bpm = parseInt(bpmInput.value) || 70;
    const beatDuration = 60000 / bpm;
    setTimeout(() => {
      if (!_metroRunning) return;
      arrow.textContent = '↑';
      arrow.style.transform = 'translateY(-8px)';
      arrow.style.color = 'var(--text-sec)';
      actionText.textContent = 'NHẤC LÊN (↑)';
      actionText.style.color = 'var(--text-sec)';
    }, beatDuration / 2);
  }

  function startMetronome() {
    _metroRunning = true;
    btnToggle.textContent = '⏹ DỪNG ĐẬP NHỊP';
    btnToggle.style.background = '#ef4444';
    const bpm = parseInt(bpmInput.value) || 70;
    tick();
    _metroTimer = setInterval(tick, 60000 / bpm);
  }

  function stopMetronome() {
    _metroRunning = false;
    btnToggle.textContent = '▶ BẮT ĐẦU ĐẬP NHỊP';
    btnToggle.style.background = 'var(--accent)';
    clearInterval(_metroTimer);
    arrow.style.transform = 'none';
  }

  btnToggle.addEventListener('click', () => {
    if (_metroRunning) stopMetronome();
    else startMetronome();
  });
}


/* ============================================================
   5. MÔ PHỎNG THẾ BẤM SÁO TRÚC 9 NỐT CHUẨN BẢNG PHẤN (MỤC 14 & 15)
   ============================================================ */
const FLUTE_9_NOTES = [
  { name: 'Đô 1', west: 'C4', freq: 261.63, holes: [true,  true,  true,  true,  true,  true],  desc: 'Bịt kín toàn bộ 6 lỗ' },
  { name: 'Rê 1', west: 'D4', freq: 293.66, holes: [true,  true,  true,  true,  true,  false], desc: 'Mở lỗ thứ 6' },
  { name: 'Mi 1', west: 'E4', freq: 329.63, holes: [true,  true,  true,  true,  false, false], desc: 'Mở lỗ 5, 6' },
  { name: 'Fa 1', west: 'F4', freq: 349.23, holes: [true,  true,  true,  false, false, false], desc: 'Mở lỗ 4, 5, 6' },
  { name: 'Sol 1', west: 'G4', freq: 392.00, holes: [true,  true,  false, false, false, false], desc: 'Mở lỗ 3, 4, 5, 6 (Bịt lỗ 1, 2)' },
  { name: 'La 1', west: 'A4', freq: 440.00, holes: [true,  false, false, false, false, false], desc: 'Chỉ bịt lỗ 1' },
  { name: 'Si 1', west: 'B4', freq: 493.88, holes: [false, false, false, false, false, false], desc: 'Mở toàn bộ 6 lỗ' },
  { name: 'Si giáng 1', west: 'Bb4', freq: 466.16, holes: [false, true, true, false, false, false], desc: 'Mở lỗ 1, bịt lỗ 2 và 3, mở lỗ 4, 5, 6 (chuẩn bảng phấn ○ ● ● ○ ○ ○)' },
  { name: 'Đô 2', west: 'C5', freq: 523.25, holes: [false, true,  true,  true,  true,  true],  desc: 'Mở lỗ 1, bấm kín 5 lỗ 2, 3, 4, 5, 6 (chuẩn bảng phấn)' },
];

function initFluteSimulator() {
  const container = document.getElementById('sim-flute-container');
  if (!container) return;

  container.innerHTML = `
    <div class="card p-20" style="background: var(--surface2); border: 2px solid var(--accent); margin: 24px 0; border-radius: var(--radius-md);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
        <h4 style="margin: 0; color: var(--accent); font-size: 1.05rem;">🎋 Mô Phỏng Tương Tác: Thân Sáo Trúc 6 Lỗ & 9 Thế Bấm</h4>
        <span style="font-size: 0.8rem; color: #aaa;">🔴 Bịt kín (Bấm ngón) | ⚪ Mở ngón</span>
      </div>

      <!-- Mô phỏng thân sáo trúc đồ họa -->
      <div style="background: #111827; border-radius: 12px; padding: 24px 16px; text-align: center; border: 1px solid var(--border);">
        <div style="position: relative; max-width: 580px; height: 50px; margin: 0 auto; background: linear-gradient(180deg, #d4974f 0%, #b3732e 50%, #87511c 100%); border-radius: 25px; box-shadow: inset 0 2px 5px rgba(255,255,255,0.3), 0 8px 20px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: space-between; padding: 0 24px;">
          
          <!-- Lỗ thổi -->
          <div title="Lỗ thổi" style="width: 22px; height: 16px; background: #22150a; border-radius: 50%; border: 2px solid #5a3512; box-shadow: inset 0 2px 4px #000; position: relative;">
            <span style="position: absolute; top: -20px; left: -10px; font-size: 0.65rem; color: #fbbf24; font-weight: 700; white-space: nowrap;">LỖ THỔI</span>
          </div>

          <!-- Nhóm 3 lỗ tay trái: 1, 2, 3 -->
          <div style="display: flex; gap: 20px; align-items: center;">
            <div class="sim-flute-hole" id="sim-hole-1" data-h="1" style="width: 18px; height: 18px; border-radius: 50%; border: 2px solid #fff; background: #ef4444; position: relative; transition: all 0.2s;">
              <span style="position: absolute; bottom: -20px; left: 4px; font-size: 0.7rem; color: #9ca3af; font-weight: 700;">1</span>
            </div>
            <div class="sim-flute-hole" id="sim-hole-2" data-h="2" style="width: 18px; height: 18px; border-radius: 50%; border: 2px solid #fff; background: #ef4444; position: relative; transition: all 0.2s;">
              <span style="position: absolute; bottom: -20px; left: 4px; font-size: 0.7rem; color: #9ca3af; font-weight: 700;">2</span>
            </div>
            <div class="sim-flute-hole" id="sim-hole-3" data-h="3" style="width: 18px; height: 18px; border-radius: 50%; border: 2px solid #fff; background: #ef4444; position: relative; transition: all 0.2s;">
              <span style="position: absolute; bottom: -20px; left: 4px; font-size: 0.7rem; color: #9ca3af; font-weight: 700;">3</span>
            </div>
          </div>

          <!-- Khoảng cách giữa 2 tay -->
          <div style="width: 20px; height: 100%; border-right: 2px dashed rgba(255,255,255,0.2);"></div>

          <!-- Nhóm 3 lỗ tay phải: 4, 5, 6 -->
          <div style="display: flex; gap: 20px; align-items: center;">
            <div class="sim-flute-hole" id="sim-hole-4" data-h="4" style="width: 18px; height: 18px; border-radius: 50%; border: 2px solid #fff; background: #ef4444; position: relative; transition: all 0.2s;">
              <span style="position: absolute; bottom: -20px; left: 4px; font-size: 0.7rem; color: #9ca3af; font-weight: 700;">4</span>
            </div>
            <div class="sim-flute-hole" id="sim-hole-5" data-h="5" style="width: 18px; height: 18px; border-radius: 50%; border: 2px solid #fff; background: #ef4444; position: relative; transition: all 0.2s;">
              <span style="position: absolute; bottom: -20px; left: 4px; font-size: 0.7rem; color: #9ca3af; font-weight: 700;">5</span>
            </div>
            <div class="sim-flute-hole" id="sim-hole-6" data-h="6" style="width: 18px; height: 18px; border-radius: 50%; border: 2px solid #fff; background: #fff; position: relative; transition: all 0.2s;">
              <span style="position: absolute; bottom: -20px; left: 4px; font-size: 0.7rem; color: #9ca3af; font-weight: 700;">6</span>
            </div>
          </div>

          <!-- Lỗ định âm ở đuôi sáo -->
          <div title="Lỗ định âm" style="width: 14px; height: 14px; background: #22150a; border-radius: 50%; border: 2px solid #5a3512; position: relative;">
            <span style="position: absolute; top: -20px; right: -12px; font-size: 0.65rem; color: #aaa; white-space: nowrap;">ĐỊNH ÂM</span>
          </div>
        </div>

        <div id="sim-flute-info" style="margin-top: 32px; font-weight: 700; color: #fff; font-size: 1rem;">
          Nốt đang chọn: <span style="color: var(--accent);">Rê 1 (D4)</span> — Mở lỗ thứ 6
        </div>
      </div>

      <!-- 9 Phím nốt bấm chọn mô phỏng -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 8px; margin-top: 16px;">
        ${FLUTE_9_NOTES.map((n, idx) => `
          <button class="btn-sim-flute-note ${n.name === 'Rê 1' ? 'active' : ''}" data-idx="${idx}"
            style="padding: 10px 8px; border-radius: 8px; border: 1px solid var(--border); background: ${n.name === 'Rê 1' ? 'var(--accent)' : 'var(--surface)'}; color: ${n.name === 'Rê 1' ? '#fff' : 'var(--text)'}; cursor: pointer; text-align: center; transition: all 0.2s;">
            <div style="font-weight: 800; font-size: 0.95rem;">${n.name}</div>
            <div style="font-size: 0.72rem; color: ${n.name === 'Rê 1' ? '#fff' : 'var(--text-sec)'}; margin-top: 2px;">${n.west}</div>
          </button>
        `).join('')}
      </div>
    </div>
  `;

  const buttons = container.querySelectorAll('.btn-sim-flute-note');
  const info = document.getElementById('sim-flute-info');

  function updateFlute(idx, shouldPlayAudio = true) {
    const note = FLUTE_9_NOTES[idx];
    buttons.forEach((btn, i) => {
      if (i === idx) {
        btn.style.background = 'var(--accent)';
        btn.style.color = '#fff';
      } else {
        btn.style.background = 'var(--surface)';
        btn.style.color = 'var(--text)';
      }
    });

    for (let h = 1; h <= 6; h++) {
      const holeEl = document.getElementById(`sim-hole-${h}`);
      if (!holeEl) continue;
      const isClosed = note.holes[h - 1];
      if (isClosed) {
        holeEl.style.background = '#ef4444';
        holeEl.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.7)';
      } else {
        holeEl.style.background = '#fff';
        holeEl.style.boxShadow = 'none';
      }
    }

    info.innerHTML = `Nốt đang chọn: <span style="color: var(--accent);">${note.name} (${note.west} - ${note.freq} Hz)</span> — ${note.desc}`;
    if (shouldPlayAudio) {
      playSimFluteTone(note.freq, 1.0);
    }
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-idx'));
      updateFlute(idx, true);
    });
  });

  // Mặc định chọn nốt Đô 1 (không tự phát âm thanh khi mới tải trang)
  updateFlute(0, false);
}

// Tự động khởi động tất cả các bộ mô phỏng khi tải trang
document.addEventListener('DOMContentLoaded', () => {
  initStaffSimulator();
  initDurationSimulator();
  initDynamicsSimulator();
  initMetronomeSimulator();
  initFluteSimulator();
});
