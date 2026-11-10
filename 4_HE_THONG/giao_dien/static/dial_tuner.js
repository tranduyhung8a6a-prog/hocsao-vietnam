/**
 * dial_tuner.js - Precision Chromatic Dial Tuner
 * ==============================================================================
 * Mô phỏng đồng hồ đo cao độ kim tròn phong cách Studio Vintage / Chuyên Nghiệp.
 * Hiển thị chính xác cent offset (-50 đến +50), kim đo phản hồi mượt mà 60 FPS,
 * vạch chia cent chi tiết, đèn báo chuẩn cao độ và nốt nhạc mạ vàng sang trọng.
 * 
 * Lấy cảm hứng trực tiếp từ thiết kế Tuner Studio (Ảnh 1).
 * ==============================================================================
 */

class PrecisionDialTuner {
  constructor(canvasId) {
    this.canvas = typeof canvasId === 'string' ? document.getElementById(canvasId) : canvasId;
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.targetCent = 0;
    this.currentCent = 0;
    this.targetHz = 0;
    this.currentHz = 0;
    this.noteName = '—';
    this.octave = '';
    this.noteWestern = '';
    this.hasSignal = false;
    this.isInTune = false;
    this.animId = null;

    // Kích thước chuẩn
    this.width = 340;
    this.height = 270;
    this.centerX = this.width / 2;
    this.centerY = 205;     // Tâm xoay của kim đo
    this.radius = 145;      // Bán kính cung độ

    this._setupDpr();
    this._startLoop();
  }

  _setupDpr() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  update(pitch) {
    if (!pitch || pitch.is_silent || !pitch.hz || pitch.hz <= 0) {
      this.hasSignal = false;
      this.targetCent = 0;
      return;
    }

    this.hasSignal = true;
    this.targetCent = Math.max(-50, Math.min(50, Number(pitch.cent_offset) || 0));
    this.targetHz = Math.round((pitch.hz || 0) * 10) / 10;
    this.noteName = pitch.note_viet || '—';
    this.octave = pitch.octave !== undefined && pitch.octave !== null ? String(pitch.octave) : '';
    this.noteWestern = pitch.note_western || '';
    this.isInTune = Math.abs(this.targetCent) <= 5.0;
  }

  setSilent() {
    this.hasSignal = false;
    this.targetCent = 0;
    this.noteName = '—';
    this.octave = '';
    this.noteWestern = '';
    this.isInTune = false;
  }

  _startLoop() {
    const loop = () => {
      // Lerp mượt mà cho kim đo
      this.currentCent += (this.targetCent - this.currentCent) * 0.18;
      this.currentHz += (this.targetHz - this.currentHz) * 0.22;
      this._draw();
      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);
  }

  _draw() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const cx = this.centerX;
    const cy = this.centerY;
    const r = this.radius;

    ctx.clearRect(0, 0, w, h);

    // ── 1. NỀN ĐỒNG HỒ KIM TRÒN 3D & VỎ KIM LOẠI ──
    // Vỏ ngoài bo tròn
    const bgGrad = ctx.createRadialGradient(cx, cy - 30, 10, cx, cy, r + 40);
    bgGrad.addColorStop(0, '#0a1526');
    bgGrad.addColorStop(0.65, '#040913');
    bgGrad.addColorStop(1, '#020408');

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r + 24, Math.PI, 0, false);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = bgGrad;
    ctx.fill();

    // Viền kim loại mạ vàng / crôm sáng bóng phía trên (Outer Metallic Bezel)
    ctx.lineWidth = 4;
    const bezelGrad = ctx.createLinearGradient(0, cy - r - 20, w, cy - r - 20);
    bezelGrad.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
    bezelGrad.addColorStop(0.2, 'rgba(255, 235, 180, 0.85)');
    bezelGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
    bezelGrad.addColorStop(0.8, 'rgba(255, 235, 180, 0.85)');
    bezelGrad.addColorStop(1, 'rgba(255, 255, 255, 0.2)');
    ctx.strokeStyle = bezelGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 16, Math.PI + 0.15, -0.15, false);
    ctx.stroke();

    // Cung viền trắng phía trong
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(cx, cy, r + 4, Math.PI + 0.35, -0.35, false);
    ctx.stroke();
    ctx.restore();

    // ── 2. VẠCH CHIA CENT TỪ -50 ĐẾN +50 ──
    // Góc mở từ -52° (-50 cent) đến +52° (+50 cent) so với phương thẳng đứng
    const maxAngleRad = (52 * Math.PI) / 180;
    const totalTicks = 50; // chia mỗi 2 cent

    ctx.save();
    for (let c = -50; c <= 50; c += 1) {
      const angle = (c / 50) * maxAngleRad - Math.PI / 2;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      const isCenter = (c === 0);
      const isMajor = (c === -50 || c === -25 || c === 25 || c === 50);
      const isSemiMajor = (c % 10 === 0 && !isMajor && !isCenter);
      const isMinor = (c % 2 === 0 && !isMajor && !isSemiMajor && !isCenter);

      if (!isCenter && !isMajor && !isSemiMajor && !isMinor) continue;

      let tickLen = 6;
      let tickWidth = 1.2;
      let tickColor = 'rgba(56, 189, 248, 0.55)'; // Xanh lam nhạt

      if (isCenter) {
        tickLen = 18;
        tickWidth = 2.8;
        tickColor = this.isInTune ? '#22c55e' : '#38bdf8';
      } else if (isMajor) {
        tickLen = 14;
        tickWidth = 2.2;
        tickColor = '#38bdf8';
      } else if (isSemiMajor) {
        tickLen = 9;
        tickWidth = 1.6;
        tickColor = 'rgba(56, 189, 248, 0.75)';
      }

      const x1 = cx + (r - tickLen) * cosA;
      const y1 = cy + (r - tickLen) * sinA;
      const x2 = cx + r * cosA;
      const y2 = cy + r * sinA;

      ctx.strokeStyle = tickColor;
      ctx.lineWidth = tickWidth;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.restore();

    // ── 3. NHÃN KÝ HIỆU (-50, -25 ♭, 0, ♯ 25, +50) ──
    ctx.save();
    ctx.fillStyle = '#38bdf8';
    ctx.font = '800 13px Inter, sans-serif';
    ctx.textAlign = 'center';

    // -50 Cent
    const a50L = (-50 / 50) * maxAngleRad - Math.PI / 2;
    ctx.fillText('-50', cx + (r - 28) * Math.cos(a50L) + 6, cy + (r - 28) * Math.sin(a50L) + 6);

    // -25 Cent ♭ (Giáng)
    const a25L = (-25 / 50) * maxAngleRad - Math.PI / 2;
    ctx.fillText('-25  ♭', cx + (r - 26) * Math.cos(a25L), cy + (r - 26) * Math.sin(a25L) + 6);

    // Tam giác hướng âm
    ctx.fillStyle = '#7c2d12';
    ctx.beginPath();
    const triXL = cx + (r - 24) * Math.cos(a25L) + 24;
    const triYL = cy + (r - 24) * Math.sin(a25L) + 2;
    ctx.moveTo(triXL, triYL - 6);
    ctx.lineTo(triXL - 7, triYL);
    ctx.lineTo(triXL, triYL + 6);
    ctx.closePath();
    ctx.fill();

    // +25 Cent ♯ (Thăng)
    const a25R = (25 / 50) * maxAngleRad - Math.PI / 2;
    ctx.fillStyle = '#7c2d12';
    ctx.beginPath();
    const triXR = cx + (r - 24) * Math.cos(a25R) - 24;
    const triYR = cy + (r - 24) * Math.sin(a25R) + 2;
    ctx.moveTo(triXR, triYR - 6);
    ctx.lineTo(triXR + 7, triYR);
    ctx.lineTo(triXR, triYR + 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#38bdf8';
    ctx.fillText('♯  25', cx + (r - 26) * Math.cos(a25R), cy + (r - 26) * Math.sin(a25R) + 6);

    // +50 Cent
    const a50R = (50 / 50) * maxAngleRad - Math.PI / 2;
    ctx.fillText('50', cx + (r - 28) * Math.cos(a50R) - 6, cy + (r - 28) * Math.sin(a50R) + 6);
    ctx.restore();

    // ── 4. ÁNH SÁNG & KHÍ HƠI TRUNG TÂM (FLAME GLOW) ──
    const needleAngle = (this.currentCent / 50) * maxAngleRad - Math.PI / 2;

    if (this.hasSignal) {
      ctx.save();
      const flameGrad = ctx.createRadialGradient(
        cx + (r - 35) * Math.cos(needleAngle),
        cy + (r - 35) * Math.sin(needleAngle),
        2,
        cx + (r - 35) * Math.cos(needleAngle),
        cy + (r - 35) * Math.sin(needleAngle),
        28
      );

      if (this.isInTune) {
        // Ánh xanh ngọc khi thổi chuẩn
        flameGrad.addColorStop(0, 'rgba(34, 197, 94, 0.95)');
        flameGrad.addColorStop(0.4, 'rgba(56, 189, 248, 0.5)');
        flameGrad.addColorStop(1, 'rgba(34, 197, 94, 0.0)');
      } else {
        // Ánh lửa đỏ cam khi lệch
        flameGrad.addColorStop(0, 'rgba(244, 63, 94, 0.85)');
        flameGrad.addColorStop(0.4, 'rgba(239, 68, 68, 0.35)');
        flameGrad.addColorStop(1, 'rgba(244, 63, 94, 0.0)');
      }

      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.arc(
        cx + (r - 35) * Math.cos(needleAngle),
        cy + (r - 35) * Math.sin(needleAngle),
        28,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.restore();
    }

    // ── 5. KIM ĐO CAO ĐỘ (TUNER NEEDLE) ──
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(needleAngle + Math.PI / 2);

    // Bóng đổ kim
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 2;

    // Thân kim nhọn (Tapered Needle)
    ctx.beginPath();
    ctx.moveTo(-3, 0);
    ctx.lineTo(-1.2, -r + 14);
    ctx.lineTo(0, -r + 8);
    ctx.lineTo(1.2, -r + 14);
    ctx.lineTo(3, 0);
    ctx.closePath();

    if (this.isInTune) {
      ctx.fillStyle = '#22c55e'; // Xanh ngọc chuẩn
    } else {
      // Kim đỏ cam rực rỡ như ảnh 1
      const needleGrad = ctx.createLinearGradient(0, 0, 0, -r);
      needleGrad.addColorStop(0, '#f43f5e');
      needleGrad.addColorStop(0.7, '#ef4444');
      needleGrad.addColorStop(1, '#ff6b81');
      ctx.fillStyle = needleGrad;
    }
    ctx.fill();

    // Sống kim ở giữa tạo khối nổi 3D
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -r + 10);
    ctx.stroke();

    ctx.restore();

    // ── 6. KHỐI TRỤ TRUNG TÂM & MẶT HIỂN THỊ ĐIỆN TỬ (CENTER DIAL) ──
    // Vành tròn ngăn cách bên dưới
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 98, Math.PI + 0.1, -0.1, false);
    ctx.strokeStyle = 'rgba(255, 235, 180, 0.45)';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Nền tối bóng sâu cho cụm hiển thị số liệu
    const innerGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 96);
    innerGrad.addColorStop(0, '#0c1a2f');
    innerGrad.addColorStop(0.8, '#050c18');
    innerGrad.addColorStop(1, '#02050a');
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 96, 0, Math.PI * 2);
    ctx.fill();

    // A. CHỈ SỐ CENT CHÍNH XÁC: ± 00.0 cent
    let centText = '± 00.0 cent';
    if (this.hasSignal) {
      const sign = this.currentCent > 0.05 ? '+' : (this.currentCent < -0.05 ? '-' : '±');
      const absVal = Math.abs(this.currentCent).toFixed(1);
      centText = `${sign} ${absVal.padStart(4, '0')} cent`;
    }

    ctx.fillStyle = this.isInTune ? '#4ade80' : '#ffffff';
    ctx.font = '700 19px Inter, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(centText, cx, cy - 38);

    // B. ĐƯỜNG KẺ GẠCH CHÂN TRẮNG NGANG
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cx - 75, cy - 30);
    ctx.lineTo(cx + 75, cy - 30);
    ctx.stroke();

    // C. TÊN NỐT TO PHONG CÁCH VÀNG KIM SANG TRỌNG (SERIF GOLD FONT - ẢNH 1)
    let displayNote = this.noteName !== '—' ? this.noteName : (this.noteWestern || '—');
    if (this.noteWestern && this.noteWestern !== '?' && this.noteWestern !== '—') {
      displayNote = `${this.noteWestern}${this.octave}`;
    }

    // Font Serif vàng kim giống hình 1
    const goldGrad = ctx.createLinearGradient(0, cy - 25, 0, cy + 25);
    goldGrad.addColorStop(0, '#fffbeb');
    goldGrad.addColorStop(0.35, '#fde047');
    goldGrad.addColorStop(0.7, '#eab308');
    goldGrad.addColorStop(1, '#ca8a04');

    ctx.fillStyle = this.hasSignal ? goldGrad : 'rgba(255, 255, 255, 0.2)';
    ctx.shadowColor = this.isInTune ? 'rgba(74, 222, 128, 0.7)' : 'rgba(234, 179, 8, 0.45)';
    ctx.shadowBlur = this.hasSignal ? 14 : 0;
    ctx.font = '900 48px "Times New Roman", Georgia, serif';
    ctx.fillText(displayNote, cx, cy + 18);

    // D. TẦN SỐ HZ THỰC TẾ
    ctx.shadowBlur = 0;
    ctx.font = '600 11px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    const hzText = (this.hasSignal && this.currentHz > 0) ? `@ ${this.currentHz.toFixed(1)} Hz` : '@ Sẵn sàng bắt âm';
    ctx.fillText(hzText, cx, cy + 42);

    ctx.restore();
  }
}

// Gán biến toàn cục
window.PrecisionDialTuner = PrecisionDialTuner;
