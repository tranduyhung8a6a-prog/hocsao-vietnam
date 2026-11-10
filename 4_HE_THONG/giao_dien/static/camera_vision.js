/**
 * camera_vision.js — Hệ thống Thị giác máy tính qua Camera & Đối chiếu đa phương thức (HọcSáo)
 * Phiên bản: 2.0 (Dual-Engine: MediaPipe 21-Khớp + Thị giác Quang học Thuần JS 100% Offline)
 * Tích hợp:
 * 1. Nhận diện 21 khớp xương bàn tay (MediaPipe Hands AI)
 * 2. Tự động dự phòng Thị giác quang học nhận diện da ngón tay (Pure JS Optical Engine)
 * 3. Kéo chỉnh vị trí 6 lỗ sáo trực quan (Draggable Calibration) theo cây sáo thật ngoài đời
 * 4. Thu âm Micro thời gian thực (Live Pitch, Hz, Cent)
 * 5. Chẩn đoán đa phương thức (Thế tay vs Âm thanh thực tế)
 */

class CameraVision {
  constructor(options = {}) {
    this.videoEl = document.getElementById(options.videoId || 'cameraVideo');
    this.canvasEl = document.getElementById(options.canvasId || 'cameraCanvas');
    this.feedbackEl = document.getElementById(options.feedbackId || 'ai-multimodal-feedback');
    this.targetNote = options.targetNote || 'Đô 1';

    this.stream = null;
    this.ctx = this.canvasEl ? this.canvasEl.getContext('2d') : null;
    this.isRunning = false;
    this.engineMode = 'optical'; // 'mediapipe' | 'optical'
    this.useMediaPipe = false;
    this.handsDetector = null;
    this.lastMediaPipeDetectTime = 0;

    // Trạng thái 6 lỗ sáo: true = bịt kín (đóng), false = mở
    this.holes = [true, true, true, true, true, true];

    // Chế độ căn chỉnh kéo thả vị trí 6 lỗ
    this.isCalibrating = false;
    this.draggingHoleIdx = -1;

    // Dữ liệu âm thanh Micro
    this.audioCtx = null;
    this.analyser = null;
    this.micStream = null;
    this.audioBuffer = null;
    this.currentAudio = {
      note: '---',
      frequency: 0,
      cents_offset: 0,
      rms: 0,
      is_breathing: false,
      octave: 4
    };

    // Tọa độ mặc định 6 lỗ sáo trên Canvas (tỷ lệ 0.0 - 1.0)
    this.defaultHolePositions = [
      { id: 1, x: 0.30, y: 0.52, name: 'Lỗ 1 (Trỏ T)' },
      { id: 2, x: 0.39, y: 0.53, name: 'Lỗ 2 (Giữa T)' },
      { id: 3, x: 0.48, y: 0.54, name: 'Lỗ 3 (Áp út T)' },
      { id: 4, x: 0.62, y: 0.56, name: 'Lỗ 4 (Trỏ P)' },
      { id: 5, x: 0.71, y: 0.57, name: 'Lỗ 5 (Giữa P)' },
      { id: 6, x: 0.80, y: 0.58, name: 'Lỗ 6 (Áp út P)' }
    ];

    // Nạp vị trí đã lưu nếu có
    this.holePositions = this._loadHolePositions();

    this.lastDiagnosisTime = 0;
    this.latestHandLandmarks = [];
    this.latestDiagnosisData = null;
    this.speechBubbleText = 'Đặt ngón tay lên các lỗ sáo để AI kiểm tra';

    this.init();
  }

  _loadHolePositions() {
    try {
      const saved = localStorage.getItem('hocsao_camera_holes_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 6) {
          return parsed;
        }
      }
    } catch (e) {}
    return JSON.parse(JSON.stringify(this.defaultHolePositions));
  }

  saveHolePositions() {
    try {
      localStorage.setItem('hocsao_camera_holes_v2', JSON.stringify(this.holePositions));
      this._updateStatus('Đã lưu vị trí 6 lỗ sáo của bạn thành công!', 'info');
    } catch (e) {}
  }

  resetHolePositions() {
    this.holePositions = JSON.parse(JSON.stringify(this.defaultHolePositions));
    try {
      localStorage.removeItem('hocsao_camera_holes_v2');
    } catch (e) {}
    this._updateStatus('Đã khôi phục vị trí 6 lỗ sáo về mặc định!', 'info');
  }

  toggleCalibration() {
    this.isCalibrating = !this.isCalibrating;
    const btn = document.getElementById('btn-calibrate-holes');
    if (btn) {
      if (this.isCalibrating) {
        btn.innerHTML = '<span>💾</span> Xong & Lưu Vị Trí';
        btn.style.background = '#22c55e';
        this._updateStatus('Chế độ căn chỉnh: Hãy dùng chuột KÉO các vòng tròn lỗ sáo trùng khớp với lỗ sáo thật của bạn trên màn hình!', 'warning');
      } else {
        btn.innerHTML = '<span>🎯</span> Căn Chỉnh Vị Trí 6 Lỗ';
        btn.style.background = 'var(--surface2)';
        this.saveHolePositions();
      }
    }
  }

  init() {
    this._bindHoleClicks();
    this._bindTargetNoteSelectors();
    this._setupCanvasInteractions();
  }

  async startCamera() {
    if (!this.videoEl || !this.canvasEl) return;

    // 1. Khởi động Webcam
    try {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
        });
      } catch (e1) {
        this.stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      this.videoEl.srcObject = this.stream;
      await this.videoEl.play();
      this.isRunning = true;
    } catch (err) {
      console.warn('Lỗi mở camera:', err);
      this._updateStatus('Không thể mở Camera (' + err.message + '). Hãy kiểm tra quyền camera hoặc bấm vào 6 nút lỗ sáo bên dưới.', 'warning');
      return;
    }

    // 2. Khởi động Micro đi kèm để đo âm thanh cùng lúc
    this._startMicrophone();

    // 3. Khởi tạo MediaPipe Hands nếu có thư viện
    this._initMediaPipeHands();

    // 4. Bắt đầu vòng lặp hiển thị
    this._renderLoop();
    this._updateStatus('Camera AI & Micro đã kích hoạt! Hãy đưa tay và sáo lên để hệ thống nhận diện.', 'info');
  }

  stopCamera() {
    this.isRunning = false;
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try { this.audioCtx.close(); } catch (e) {}
      this.audioCtx = null;
    }
    if (this.videoEl) {
      this.videoEl.srcObject = null;
    }
    if (this.ctx && this.canvasEl) {
      this.ctx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);
    }
  }

  _initMediaPipeHands() {
    if (typeof window.Hands !== 'undefined') {
      try {
        this.handsDetector = new window.Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        this.handsDetector.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        this.handsDetector.onResults((results) => {
          if (results && results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            this.latestHandLandmarks = results.multiHandLandmarks;
            this.lastMediaPipeDetectTime = Date.now();
            this.engineMode = 'mediapipe';
            this._processMediaPipeHandsToHoles(results);
          }
        });

        this.useMediaPipe = true;
        console.log('✅ MediaPipe Hands AI đã sẵn sàng!');
      } catch (e) {
        console.warn('MediaPipe Hands khởi tạo thất bại, dùng Chế độ Thị giác Quang học Thuần:', e);
        this.useMediaPipe = false;
        this.engineMode = 'optical';
      }
    } else {
      console.log('MediaPipe CDN chưa nạp, kích hoạt Chế độ Thị giác Quang học Thuần (Chạy 100% offline).');
      this.useMediaPipe = false;
      this.engineMode = 'optical';
    }
  }

  async _startMicrophone() {
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtxClass({ sampleRate: 22050 });
      const source = this.audioCtx.createMediaStreamSource(this.micStream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 2048;
      source.connect(this.analyser);
      this.audioBuffer = new Float32Array(this.analyser.fftSize);
      this._audioLoop();
    } catch (e) {
      console.warn('Không thể mở micro trong Camera AI:', e);
    }
  }

  _audioLoop() {
    if (!this.isRunning || !this.analyser) return;

    this.analyser.getFloatTimeDomainData(this.audioBuffer);

    // Tính RMS
    let sumSquares = 0;
    for (let i = 0; i < this.audioBuffer.length; i++) {
      sumSquares += this.audioBuffer[i] * this.audioBuffer[i];
    }
    const rms = Math.sqrt(sumSquares / this.audioBuffer.length);

    // Đo cao độ bằng Autocorrelation
    if (rms > 0.015) {
      const pitchHz = this._autoCorrelate(this.audioBuffer, this.audioCtx.sampleRate);
      if (pitchHz > 180 && pitchHz < 1500) {
        const noteInfo = this._hzToNote(pitchHz);
        this.currentAudio = {
          note: noteInfo.note,
          frequency: Math.round(pitchHz * 10) / 10,
          cents_offset: Math.round(noteInfo.cents * 10) / 10,
          rms: rms,
          is_breathing: true,
          octave: noteInfo.octave
        };

        this._updateLiveAudioBadge();
        // Gửi chẩn đoán khi có tiếng thổi
        this.requestDiagnosis();
      }
    } else {
      this.currentAudio.is_breathing = false;
      this._updateLiveAudioBadge(true);
    }

    setTimeout(() => this._audioLoop(), 60);
  }

  _autoCorrelate(buffer, sampleRate) {
    let SIZE = buffer.length;
    let MAX_SAMPLES = Math.floor(SIZE / 2);
    let best_offset = -1;
    let best_correlation = 0;
    let rms = 0;
    let foundGoodCorrelation = false;

    let correlations = new Array(MAX_SAMPLES);
    for (let i = 0; i < SIZE; i++) {
      let val = buffer[i];
      rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.012) return -1;

    let lastCorrelation = 1;
    for (let offset = 0; offset < MAX_SAMPLES; offset++) {
      let correlation = 0;
      for (let i = 0; i < MAX_SAMPLES; i++) {
        correlation += Math.abs(buffer[i] - buffer[i + offset]);
      }
      correlation = 1 - (correlation / MAX_SAMPLES);
      correlations[offset] = correlation;

      if ((correlation > 0.9) && (correlation > lastCorrelation)) {
        foundGoodCorrelation = true;
        if (correlation > best_correlation) {
          best_correlation = correlation;
          best_offset = offset;
        }
      } else if (foundGoodCorrelation) {
        let shift = (correlations[best_offset + 1] - correlations[best_offset - 1]) / correlations[best_offset];
        return sampleRate / (best_offset + (8 * shift));
      }
      lastCorrelation = correlation;
    }
    if (best_correlation > 0.01) {
      return sampleRate / best_offset;
    }
    return -1;
  }

  _hzToNote(freq) {
    const notes = [
      { name: 'Đô 1', freq: 261.63, oct: 4 },
      { name: 'Rê 1', freq: 293.66, oct: 4 },
      { name: 'Mi 1', freq: 329.63, oct: 4 },
      { name: 'Fa 1', freq: 349.23, oct: 4 },
      { name: 'Sol 1', freq: 392.00, oct: 4 },
      { name: 'La 1', freq: 440.00, oct: 4 },
      { name: 'Si 1', freq: 493.88, oct: 4 },
      { name: 'Đô 2', freq: 523.25, oct: 5 },
      { name: 'Rê 2', freq: 587.33, oct: 5 },
      { name: 'Mi 2', freq: 659.25, oct: 5 },
      { name: 'Fa 2', freq: 698.46, oct: 5 },
      { name: 'Sol 2', freq: 783.99, oct: 5 }
    ];
    let best = notes[0];
    let minDiff = 99999;
    for (let n of notes) {
      let diff = Math.abs(freq - n.freq);
      if (diff < minDiff) {
        minDiff = diff;
        best = n;
      }
    }
    const cents = 1200 * Math.log2(freq / best.freq);
    return { note: best.name, cents: cents, octave: best.oct };
  }

  _updateLiveAudioBadge(silent = false) {
    const badge = document.getElementById('cam-live-audio-badge');
    if (!badge) return;
    if (silent || !this.currentAudio.is_breathing) {
      badge.innerHTML = `<span style="opacity: 0.6;">🎤 Chờ tiếng sáo...</span>`;
      badge.style.borderColor = 'rgba(255,255,255,0.15)';
      badge.style.background = 'rgba(0,0,0,0.35)';
    } else {
      const { note, frequency, cents_offset } = this.currentAudio;
      const cSign = cents_offset >= 0 ? '+' : '';
      badge.innerHTML = `<span>🎤</span> <strong>${note}</strong> · ${frequency}Hz <span style="font-size: 0.75rem; color: #fde047;">(${cSign}${cents_offset}c)</span>`;
      badge.style.borderColor = '#22c55e';
      badge.style.background = 'rgba(34, 197, 94, 0.2)';
    }
  }

  // --- ENGINE A: XỬ LÝ MEDIAPIPE HANDS ---
  _processMediaPipeHandsToHoles(results) {
    if (!results || !results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      return;
    }

    const w = this.canvasEl.width;
    const h = this.canvasEl.height;

    // Lấy tọa độ các đầu ngón tay của tất cả bàn tay phát hiện được
    // 8: Index (trỏ), 12: Middle (giữa), 16: Ring (áp út)
    const fingerTips = [];
    for (const hand of results.multiHandLandmarks) {
      for (const idx of [8, 12, 16]) {
        const pt = hand[idx];
        if (pt) {
          fingerTips.push({
            x: (1 - pt.x) * w,
            y: pt.y * h
          });
        }
      }
    }

    let changed = false;
    const thresholdPx = 42; // Bán kính nhận diện che phủ

    for (let i = 0; i < 6; i++) {
      const pos = this.holePositions[i];
      const holeX = pos.x * w;
      const holeY = pos.y * h;

      let isCovered = false;
      for (const f of fingerTips) {
        const dx = f.x - holeX;
        const dy = f.y - holeY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= thresholdPx) {
          isCovered = true;
          break;
        }
      }

      if (this.holes[i] !== isCovered) {
        this.holes[i] = isCovered;
        changed = true;
      }
    }

    if (changed) {
      this._updateHoleUI();
      this.requestDiagnosis();
    }
  }

  // --- ENGINE B: THỊ GIÁC QUANG HỌC THUẦN (100% OFFLINE) ---
  _processOpticalDetection(w, h) {
    if (!this.ctx || this.isCalibrating) return;

    // Nếu MediaPipe vừa nhận diện được trong vòng 1.2s trước, ưu tiên MediaPipe
    if (Date.now() - this.lastMediaPipeDetectTime < 1200) {
      return;
    }

    this.engineMode = 'optical';
    let changed = false;
    const radius = 18;

    for (let i = 0; i < 6; i++) {
      const pos = this.holePositions[i];
      const cx = Math.floor(pos.x * w);
      const cy = Math.floor(pos.y * h);

      if (cx < radius || cx > w - radius || cy < radius || cy > h - radius) continue;

      try {
        const imgData = this.ctx.getImageData(cx - radius, cy - radius, radius * 2, radius * 2);
        const data = imgData.data;
        let skinPixels = 0;
        let totalSamples = 0;

        for (let j = 0; j < data.length; j += 16) { // Lấy mẫu cách quãng
          const r = data[j];
          const g = data[j + 1];
          const b = data[j + 2];
          totalSamples++;

          // Kiểm tra sắc thái da ngón tay (Skin tone rule)
          const isSkin = (r > 65) && (g > 40) && (b > 20) && (r > g) && (r > b) && (Math.abs(r - g) > 12);
          if (isSkin) {
            skinPixels++;
          }
        }

        const skinRatio = skinPixels / Math.max(1, totalSamples);
        const isCovered = skinRatio > 0.32;

        if (this.holes[i] !== isCovered) {
          this.holes[i] = isCovered;
          changed = true;
        }
      } catch (e) {}
    }

    if (changed) {
      this._updateHoleUI();
      this.requestDiagnosis();
    }
  }

  // --- TƯƠNG TÁC CANVAS (CHẠM & KÉO THẢ HIỆU CHỈNH LỖ SÁO) ---
  _setupCanvasInteractions() {
    if (!this.canvasEl) return;

    const getPos = (e) => {
      const rect = this.canvasEl.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: ((clientX - rect.left) / rect.width) * this.canvasEl.width,
        y: ((clientY - rect.top) / rect.height) * this.canvasEl.height
      };
    };

    // Bắt đầu ấn chuột / chạm tay
    const onStart = (e) => {
      const { x, y } = getPos(e);
      const w = this.canvasEl.width;
      const h = this.canvasEl.height;

      // Tìm lỗ gần nhất
      for (let i = 0; i < 6; i++) {
        const pos = this.holePositions[i];
        const hX = pos.x * w;
        const hY = pos.y * h;
        const dist = Math.hypot(x - hX, y - hY);

        if (dist <= 30) {
          if (this.isCalibrating) {
            this.draggingHoleIdx = i;
            if (e.cancelable) e.preventDefault();
            return;
          } else {
            // Chạm thường: bật tắt lỗ sáo
            this.toggleHole(i);
            return;
          }
        }
      }
    };

    // Kéo di chuyển trong chế độ căn chỉnh
    const onMove = (e) => {
      if (!this.isCalibrating || this.draggingHoleIdx < 0) return;
      const { x, y } = getPos(e);
      const w = this.canvasEl.width;
      const h = this.canvasEl.height;

      this.holePositions[this.draggingHoleIdx].x = Math.max(0.1, Math.min(0.95, x / w));
      this.holePositions[this.draggingHoleIdx].y = Math.max(0.1, Math.min(0.95, y / h));
      if (e.cancelable) e.preventDefault();
    };

    // Thả chuột / nhấc tay
    const onEnd = () => {
      this.draggingHoleIdx = -1;
    };

    this.canvasEl.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);

    this.canvasEl.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  }

  toggleHole(holeIndex) {
    if (holeIndex < 0 || holeIndex >= 6) return;
    this.holes[holeIndex] = !this.holes[holeIndex];
    this._updateHoleUI();
    this.requestDiagnosis();
  }

  setTargetNote(noteName) {
    this.targetNote = noteName;
    this.requestDiagnosis();
  }

  _bindHoleClicks() {
    for (let i = 1; i <= 6; i++) {
      const btn = document.getElementById(`cam-hole-btn-${i}`);
      if (btn) {
        btn.addEventListener('click', () => {
          this.toggleHole(i - 1);
        });
      }
    }
  }

  _bindTargetNoteSelectors() {
    const notePills = document.querySelectorAll('.cam-target-pill');
    notePills.forEach(pill => {
      pill.addEventListener('click', () => {
        notePills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const note = pill.getAttribute('data-note') || 'Đô 1';
        this.setTargetNote(note);
      });
    });
  }

  _updateHoleUI() {
    for (let i = 0; i < 6; i++) {
      const btn = document.getElementById(`cam-hole-btn-${i + 1}`);
      const dot = document.getElementById(`cam-hole-dot-${i + 1}`);
      const isClosed = this.holes[i];
      if (btn) {
        btn.classList.toggle('closed', isClosed);
        btn.classList.toggle('open', !isClosed);
      }
      if (dot) {
        dot.style.background = isClosed ? '#22c55e' : '#ef4444';
      }
    }
  }

  async requestDiagnosis() {
    const now = Date.now();
    if (now - this.lastDiagnosisTime < 250) return;
    this.lastDiagnosisTime = now;

    try {
      const res = await fetch('/api/loi-nhin/doi-chieu-da-phuong-thuc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          holes: this.holes,
          audio: this.currentAudio,
          target_note: this.targetNote
        })
      });
      if (res.ok) {
        const data = await res.json();
        this.latestDiagnosisData = data;
        this.speechBubbleText = data.diagnostic || 'Đang theo dõi ngón tay...';
        this._renderDiagnosis(data);
      }
    } catch (e) {}
  }

  _renderDiagnosis(data) {
    if (!this.feedbackEl) return;
    const { overall_status, diagnostic, tips, hand_note, audio_note, cents_offset } = data;

    let statusBorder = '#38bdf8';
    let statusBg = 'rgba(15, 23, 42, 0.85)';
    let icon = 'ℹ️';

    if (overall_status === 'success') {
      statusBorder = '#22c55e';
      statusBg = 'rgba(6, 78, 59, 0.5)';
      icon = '✅';
    } else if (overall_status === 'warning') {
      statusBorder = '#f59e0b';
      statusBg = 'rgba(120, 53, 15, 0.5)';
      icon = '⚠️';
    } else if (overall_status === 'danger') {
      statusBorder = '#ef4444';
      statusBg = 'rgba(127, 29, 29, 0.5)';
      icon = '❌';
    }

    let tipsHtml = '';
    if (tips && tips.length > 0) {
      tipsHtml = `<div style="margin-top: 8px; font-size: 0.84rem; color: #fde047;">
        ${tips.map(t => `<div>💡 <em>${t}</em></div>`).join('')}
      </div>`;
    }

    const cSign = (typeof cents_offset === 'number' && cents_offset >= 0) ? '+' : '';
    const centsDisplay = typeof cents_offset === 'number' ? `${cSign}${cents_offset.toFixed(1)}c` : '--';

    this.feedbackEl.style.borderColor = statusBorder;
    this.feedbackEl.style.background = statusBg;
    this.feedbackEl.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
        <div style="font-weight: 700; font-size: 0.98rem; display: flex; align-items: flex-start; gap: 8px; color: #fff;">
          <span style="font-size: 1.25rem;">${icon}</span>
          <span>${diagnostic}</span>
        </div>
        <div style="text-align: right; font-size: 0.78rem; opacity: 0.95; white-space: nowrap; color: var(--text-sec);">
          <div>Tay nhận diện: <strong style="color: #fff;">${hand_note}</strong></div>
          <div>Mic đo được: <strong style="color: #38bdf8;">${audio_note}</strong> (${centsDisplay})</div>
        </div>
      </div>
      ${tipsHtml}
    `;
  }

  _updateStatus(text, level = 'info') {
    if (!this.feedbackEl) return;
    this.feedbackEl.innerHTML = `<div style="font-size: 0.9rem; color: var(--text-sec);">ℹ️ ${text}</div>`;
  }

  async _renderLoop() {
    if (!this.isRunning) return;

    if (this.ctx && this.videoEl && this.videoEl.readyState >= 2) {
      const w = this.canvasEl.width;
      const h = this.canvasEl.height;

      // 1. Vẽ khung hình camera phản chiếu như gương
      this.ctx.save();
      this.ctx.scale(-1, 1);
      this.ctx.drawImage(this.videoEl, -w, 0, w, h);
      this.ctx.restore();

      // 2. Nếu có MediaPipe, gửi frame xử lý
      if (this.useMediaPipe && this.handsDetector) {
        try {
          await this.handsDetector.send({ image: this.videoEl });
        } catch (e) {}
      }

      // 3. Nếu MediaPipe không bắt được, chạy Engine B (Thị giác quang học thuần)
      this._processOpticalDetection(w, h);

      // 4. Vẽ khung xương bàn tay nếu có dữ liệu MediaPipe
      this._drawHandSkeleton(w, h);

      // 5. Vẽ thân sáo trúc & 6 lỗ sáo tương tác
      this._drawFluteOverlay(w, h);

      // 6. Vẽ thanh trạng thái HUD trên Canvas (Engine, Mic, Lời nhắc)
      this._drawCanvasHUD(w, h);
    }

    requestAnimationFrame(() => this._renderLoop());
  }

  _drawHandSkeleton(w, h) {
    if (!this.latestHandLandmarks || this.latestHandLandmarks.length === 0) return;
    // Nếu quá 1.5s chưa có frame mediapipe mới, bỏ qua
    if (Date.now() - this.lastMediaPipeDetectTime > 1500) return;

    const ctx = this.ctx;
    ctx.save();

    // Các cặp nối khớp xương bàn tay
    const CONNECTIONS = [
      [0,1],[1,2],[2,3],[3,4], // Thumb
      [0,5],[5,6],[6,7],[7,8], // Index
      [5,9],[9,10],[10,11],[11,12], // Middle
      [9,13],[13,14],[14,15],[15,16], // Ring
      [13,17],[17,18],[18,19],[19,20], // Pinky
      [0,17] // Palm base
    ];

    for (const hand of this.latestHandLandmarks) {
      // Vẽ các đường nối xương màu Cyan Neon
      ctx.lineWidth = 2.8;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';

      for (const [startIdx, endIdx] of CONNECTIONS) {
        const p1 = hand[startIdx];
        const p2 = hand[endIdx];
        if (p1 && p2) {
          ctx.beginPath();
          ctx.moveTo((1 - p1.x) * w, p1.y * h);
          ctx.lineTo((1 - p2.x) * w, p2.y * h);
          ctx.stroke();
        }
      }

      // Vẽ các khớp tròn
      for (let i = 0; i < hand.length; i++) {
        const p = hand[i];
        const px = (1 - p.x) * w;
        const py = p.y * h;
        const isTip = [4, 8, 12, 16, 20].includes(i);
        ctx.beginPath();
        ctx.arc(px, py, isTip ? 6.5 : 3.5, 0, Math.PI * 2);
        ctx.fillStyle = [8, 12, 16].includes(i) ? '#22c55e' : (isTip ? '#f59e0b' : '#38bdf8');
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  _drawFluteOverlay(w, h) {
    const ctx = this.ctx;
    ctx.save();

    const pFirst = this.holePositions[0];
    const pLast = this.holePositions[5];

    const startX = Math.max(20, (pFirst.x - 0.15) * w);
    const startY = (pFirst.y - 0.02) * h;
    const endX = Math.min(w - 20, (pLast.x + 0.14) * w);
    const endY = (pLast.y + 0.02) * h;

    // 1. Thân sáo trúc
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.lineWidth = 34;
    ctx.lineCap = 'round';
    ctx.strokeStyle = this.isCalibrating ? 'rgba(234, 179, 8, 0.45)' : 'rgba(217, 119, 6, 0.4)';
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.85)';
    ctx.stroke();

    // 2. Lỗ thổi (Embouchure hole)
    const embX = startX + (endX - startX) * 0.08;
    const embY = startY + (endY - startY) * 0.08;
    ctx.beginPath();
    ctx.ellipse(embX, embY, 10, 8, 0.05, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 3. Vẽ 6 Lỗ sáo
    for (let i = 0; i < 6; i++) {
      const pos = this.holePositions[i];
      const hX = pos.x * w;
      const hY = pos.y * h;
      const isClosed = this.holes[i];

      // Nếu đang trong chế độ căn chỉnh, vẽ viền nhấp nháy kéo thả
      if (this.isCalibrating) {
        ctx.beginPath();
        ctx.arc(hX, hY, 22, 0, Math.PI * 2);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      ctx.arc(hX, hY, 15, 0, Math.PI * 2);

      if (isClosed) {
        ctx.fillStyle = 'rgba(34, 197, 94, 0.95)'; // Xanh lá = Kín
        ctx.strokeStyle = '#ffffff';
      } else {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.9)'; // Đỏ = Mở
        ctx.strokeStyle = '#ffffff';
      }
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.stroke();

      // Số hiệu lỗ
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${i + 1}`, hX, hY);

      // Tên ngón tay bên trên lỗ
      ctx.fillStyle = isClosed ? '#4ade80' : '#fca5a5';
      ctx.font = 'bold 10px Inter, sans-serif';
      const fingerNames = ['Trỏ T', 'Giữa T', 'Áp út T', 'Trỏ P', 'Giữa P', 'Áp út P'];
      ctx.fillText(fingerNames[i], hX, hY - 24);
    }

    ctx.restore();
  }

  _drawCanvasHUD(w, h) {
    const ctx = this.ctx;
    ctx.save();

    // 1. Thẻ Chế độ AI góc trên bên trái
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(12, 12, 190, 32, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = this.engineMode === 'mediapipe' ? '#4ade80' : '#38bdf8';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const engineText = this.engineMode === 'mediapipe' ? '🤖 AI MediaPipe (21 Khớp)' : '👁️ AI Thị Giác Quang Học';
    ctx.fillText(engineText, 22, 28);

    // 2. Thẻ Micro góc trên bên phải
    ctx.fillStyle = this.currentAudio.is_breathing ? 'rgba(34, 197, 94, 0.25)' : 'rgba(15, 23, 42, 0.75)';
    ctx.strokeStyle = this.currentAudio.is_breathing ? '#22c55e' : 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.roundRect(w - 180, 12, 168, 32, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'right';
    if (this.currentAudio.is_breathing) {
      const cSign = this.currentAudio.cents_offset >= 0 ? '+' : '';
      ctx.fillText(`🎤 ${this.currentAudio.note} · ${this.currentAudio.frequency}Hz (${cSign}${this.currentAudio.cents_offset}c)`, w - 20, 28);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText('🎤 Chờ tiếng sáo...', w - 20, 28);
    }

    // 3. Bong bóng lời nhắc AI ở đáy màn hình
    if (this.speechBubbleText) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.beginPath();
      ctx.roundRect(20, h - 42, w - 40, 32, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`💡 AI Tutor: ${this.speechBubbleText}`, w / 2, h - 26);
    }

    ctx.restore();
  }
}

window.CameraVision = CameraVision;
