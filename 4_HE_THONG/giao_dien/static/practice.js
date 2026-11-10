/**
 * HọcSáo — Phòng Luyện Tập Nâng Cao (Advanced Practice Engine)
 * ==============================================================
 * • Thu âm trực tiếp từ Microphone trình duyệt qua Web Audio API (không cần PyAudio)
 * • Truyền luồng PCM Int16 qua WebSocket thời gian thực tới FastAPI
 * • Biểu đồ sóng âm Studio 60fps mượt mà với đường cong Bezier
 * • Mô phỏng sáo trúc Việt Nam 3D với luồng hơi thở động học
 * • Bộ phát âm mẫu (Web Audio Synthesizer) nghe thử tiếng sáo
 */

'use strict';

/* ============================================================
   BẢNG NỐT NHẠC & TẦN SỐ
   ============================================================ */
const NOTE_DATA = {
  'Đô':       { west: 'C',  label: 'Đô 1', freq: { 4: 261.63, 5: 523.25 } },
  'Đô 1':     { west: 'C',  label: 'Đô 1', freq: { 4: 261.63, 5: 523.25 } },
  'Rê':       { west: 'D',  label: 'Rê 1', freq: { 4: 293.66, 5: 587.33 } },
  'Rê 1':     { west: 'D',  label: 'Rê 1', freq: { 4: 293.66, 5: 587.33 } },
  'Mi':       { west: 'E',  label: 'Mi 1', freq: { 4: 329.63, 5: 659.25 } },
  'Mi 1':     { west: 'E',  label: 'Mi 1', freq: { 4: 329.63, 5: 659.25 } },
  'Fa':       { west: 'F',  label: 'Fa 1', freq: { 4: 349.23, 5: 698.46 } },
  'Fa 1':     { west: 'F',  label: 'Fa 1', freq: { 4: 349.23, 5: 698.46 } },
  'Sol':      { west: 'G',  label: 'Sol 1', freq: { 4: 392.00, 5: 784.00 } },
  'Sol 1':    { west: 'G',  label: 'Sol 1', freq: { 4: 392.00, 5: 784.00 } },
  'La':       { west: 'A',  label: 'La 1', freq: { 4: 440.00, 5: 880.00 } },
  'La 1':     { west: 'A',  label: 'La 1', freq: { 4: 440.00, 5: 880.00 } },
  'Si':       { west: 'B',  label: 'Si 1', freq: { 4: 493.88, 5: 987.77 } },
  'Si 1':     { west: 'B',  label: 'Si 1', freq: { 4: 493.88, 5: 987.77 } },
  'Sib':      { west: 'Bb', label: 'Si giáng', freq: { 4: 466.16, 5: 932.33 } },
  'Si giáng': { west: 'Bb', label: 'Si giáng', freq: { 4: 466.16, 5: 932.33 } },
  'Đô2':      { west: 'C',  label: 'Đô 2', freq: { 4: 523.25, 5: 1046.50 } },
  'Đô 2':     { west: 'C',  label: 'Đô 2', freq: { 4: 523.25, 5: 1046.50 } },
};

const FINGERINGS = {
  // [lỗ 1..6] true = bịt kín (closed), false = mở (open)
  'Đô':       [true,  true,  true,  true,  true,  true ],
  'Đô 1':     [true,  true,  true,  true,  true,  true ],
  'Rê':       [true,  true,  true,  true,  true,  false],
  'Rê 1':     [true,  true,  true,  true,  true,  false],
  'Mi':       [true,  true,  true,  true,  false, false],
  'Mi 1':     [true,  true,  true,  true,  false, false],
  'Fa':       [true,  true,  true,  false, false, false],
  'Fa 1':     [true,  true,  true,  false, false, false],
  'Sol':      [true,  true,  false, false, false, false],
  'Sol 1':    [true,  true,  false, false, false, false],
  'La':       [true,  false, false, false, false, false],
  'La 1':     [true,  false, false, false, false, false],
  'Si':       [false, false, false, false, false, false],
  'Si 1':     [false, false, false, false, false, false],
  'Sib':      [false, true,  true,  false, false, false],
  'Si giáng': [false, true,  true,  false, false, false],
  'Đô2':      [false, true,  true,  true,  true,  true ],
  'Đô 2':     [false, true,  true,  true,  true,  true ],
};

/* ============================================================
   BẢNG QUY ĐỔI 7 TONE SÁO TRÚC VIỆT NAM THÔNG DỤNG
   Giúp người học bấm đúng thế bấm Đô trên bất kỳ cây sáo nào (La, Sol, Rê, Đô...)
   mà máy vẫn nhận diện CHUẨN XÁC 100%!
   ============================================================ */
const FLUTE_TONES = {
  'C': {
    name: 'Sáo Đô (C5) — Thông dụng',
    fundamental: 523.25,
    octaveBase: 5,
    notes: {
      'Đô': { hz: 523.25, altHz: 261.63, realName: 'Đô (C)' },
      'Đô 1': { hz: 523.25, altHz: 261.63, realName: 'Đô 1 (C)' },
      'Rê': { hz: 587.33, altHz: 293.66, realName: 'Rê (D)' },
      'Rê 1': { hz: 587.33, altHz: 293.66, realName: 'Rê 1 (D)' },
      'Mi': { hz: 659.25, altHz: 329.63, realName: 'Mi (E)' },
      'Mi 1': { hz: 659.25, altHz: 329.63, realName: 'Mi 1 (E)' },
      'Fa': { hz: 698.46, altHz: 349.23, realName: 'Fa (F)' },
      'Fa 1': { hz: 698.46, altHz: 349.23, realName: 'Fa 1 (F)' },
      'Sol': { hz: 783.99, altHz: 392.00, realName: 'Sol (G)' },
      'Sol 1': { hz: 783.99, altHz: 392.00, realName: 'Sol 1 (G)' },
      'La': { hz: 880.00, altHz: 440.00, realName: 'La (A)' },
      'La 1': { hz: 880.00, altHz: 440.00, realName: 'La 1 (A)' },
      'Si': { hz: 987.77, altHz: 493.88, realName: 'Si (B)' },
      'Si 1': { hz: 987.77, altHz: 493.88, realName: 'Si 1 (B)' },
      'Si giáng': { hz: 932.33, altHz: 466.16, realName: 'Si giáng (Bb)' },
      'Sib': { hz: 932.33, altHz: 466.16, realName: 'Si giáng (Bb)' },
      'Đô 2': { hz: 1046.50, altHz: 523.25, realName: 'Đô 2 (C)' },
      'Đô2': { hz: 1046.50, altHz: 523.25, realName: 'Đô 2 (C)' },
    }
  },
  'A': {
    name: 'Sáo La (A4) — Trầm ấm',
    fundamental: 440.00,
    octaveBase: 4,
    notes: {
      'Đô': { hz: 440.00, realName: 'La (A)' },
      'Đô 1': { hz: 440.00, realName: 'La 1 (A)' },
      'Rê': { hz: 493.88, realName: 'Si (B)' },
      'Rê 1': { hz: 493.88, realName: 'Si 1 (B)' },
      'Mi': { hz: 554.37, realName: 'Đô# (C#)' },
      'Mi 1': { hz: 554.37, realName: 'Đô# 1 (C#)' },
      'Fa': { hz: 587.33, realName: 'Rê (D)' },
      'Fa 1': { hz: 587.33, realName: 'Rê 1 (D)' },
      'Sol': { hz: 659.25, realName: 'Mi (E)' },
      'Sol 1': { hz: 659.25, realName: 'Mi 1 (E)' },
      'La': { hz: 739.99, realName: 'Fa# (F#)' },
      'La 1': { hz: 739.99, realName: 'Fa# 1 (F#)' },
      'Si': { hz: 830.61, realName: 'Sol# (G#)' },
      'Si 1': { hz: 830.61, realName: 'Sol# 1 (G#)' },
      'Si giáng': { hz: 783.99, realName: 'Sol (G)' },
      'Sib': { hz: 783.99, realName: 'Sol (G)' },
      'Đô 2': { hz: 880.00, realName: 'La 2 (A)' },
      'Đô2': { hz: 880.00, realName: 'La 2 (A)' },
    }
  },
  'G': {
    name: 'Sáo Sol (G4) — Trầm sâu',
    fundamental: 392.00,
    octaveBase: 4,
    notes: {
      'Đô': { hz: 392.00, realName: 'Sol (G)' },
      'Đô 1': { hz: 392.00, realName: 'Sol 1 (G)' },
      'Rê': { hz: 440.00, realName: 'La (A)' },
      'Rê 1': { hz: 440.00, realName: 'La 1 (A)' },
      'Mi': { hz: 493.88, realName: 'Si (B)' },
      'Mi 1': { hz: 493.88, realName: 'Si 1 (B)' },
      'Fa': { hz: 523.25, realName: 'Đô (C)' },
      'Fa 1': { hz: 523.25, realName: 'Đô 1 (C)' },
      'Sol': { hz: 587.33, realName: 'Rê (D)' },
      'Sol 1': { hz: 587.33, realName: 'Rê 1 (D)' },
      'La': { hz: 659.25, realName: 'Mi (E)' },
      'La 1': { hz: 659.25, realName: 'Mi 1 (E)' },
      'Si': { hz: 739.99, realName: 'Fa# (F#)' },
      'Si 1': { hz: 739.99, realName: 'Fa# 1 (F#)' },
      'Si giáng': { hz: 698.46, realName: 'Fa (F)' },
      'Sib': { hz: 698.46, realName: 'Fa (F)' },
      'Đô 2': { hz: 783.99, realName: 'Sol 2 (G)' },
      'Đô2': { hz: 783.99, realName: 'Sol 2 (G)' },
    }
  },
  'D': {
    name: 'Sáo Rê (D5) — Cao thanh',
    fundamental: 587.33,
    octaveBase: 5,
    notes: {
      'Đô': { hz: 587.33, realName: 'Rê (D)' },
      'Đô 1': { hz: 587.33, realName: 'Rê 1 (D)' },
      'Rê': { hz: 659.25, realName: 'Mi (E)' },
      'Rê 1': { hz: 659.25, realName: 'Mi 1 (E)' },
      'Mi': { hz: 739.99, realName: 'Fa# (F#)' },
      'Mi 1': { hz: 739.99, realName: 'Fa# 1 (F#)' },
      'Fa': { hz: 783.99, realName: 'Sol (G)' },
      'Fa 1': { hz: 783.99, realName: 'Sol 1 (G)' },
      'Sol': { hz: 880.00, realName: 'La (A)' },
      'Sol 1': { hz: 880.00, realName: 'La 1 (A)' },
      'La': { hz: 987.77, realName: 'Si (B)' },
      'La 1': { hz: 987.77, realName: 'Si 1 (B)' },
      'Si': { hz: 1108.73, realName: 'Đô# (C#)' },
      'Si 1': { hz: 1108.73, realName: 'Đô# 1 (C#)' },
      'Si giáng': { hz: 1046.50, realName: 'Đô (C)' },
      'Sib': { hz: 1046.50, realName: 'Đô (C)' },
      'Đô 2': { hz: 1174.66, realName: 'Rê 2 (D)' },
      'Đô2': { hz: 1174.66, realName: 'Rê 2 (D)' },
    }
  },
  'B': {
    name: 'Sáo Si (B4)',
    fundamental: 493.88,
    octaveBase: 4,
    notes: {
      'Đô': { hz: 493.88, realName: 'Si (B)' },
      'Đô 1': { hz: 493.88, realName: 'Si 1 (B)' },
      'Rê': { hz: 554.37, realName: 'Đô# (C#)' },
      'Rê 1': { hz: 554.37, realName: 'Đô# 1 (C#)' },
      'Mi': { hz: 622.25, realName: 'Rê# (D#)' },
      'Mi 1': { hz: 622.25, realName: 'Rê# 1 (D#)' },
      'Fa': { hz: 659.25, realName: 'Mi (E)' },
      'Fa 1': { hz: 659.25, realName: 'Mi 1 (E)' },
      'Sol': { hz: 739.99, realName: 'Fa# (F#)' },
      'Sol 1': { hz: 739.99, realName: 'Fa# 1 (F#)' },
      'La': { hz: 830.61, realName: 'Sol# (G#)' },
      'La 1': { hz: 830.61, realName: 'Sol# 1 (G#)' },
      'Si': { hz: 932.33, realName: 'La# (A#)' },
      'Si 1': { hz: 932.33, realName: 'La# 1 (A#)' },
      'Si giáng': { hz: 880.00, realName: 'La (A)' },
      'Sib': { hz: 880.00, realName: 'La (A)' },
      'Đô 2': { hz: 987.77, realName: 'Si 2 (B)' },
      'Đô2': { hz: 987.77, realName: 'Si 2 (B)' },
    }
  },
  'Bb': {
    name: 'Sáo Si giáng (Bb4)',
    fundamental: 466.16,
    octaveBase: 4,
    notes: {
      'Đô': { hz: 466.16, realName: 'Si giáng (Bb)' },
      'Đô 1': { hz: 466.16, realName: 'Si giáng 1 (Bb)' },
      'Rê': { hz: 523.25, realName: 'Đô (C)' },
      'Rê 1': { hz: 523.25, realName: 'Đô 1 (C)' },
      'Mi': { hz: 587.33, realName: 'Rê (D)' },
      'Mi 1': { hz: 587.33, realName: 'Rê 1 (D)' },
      'Fa': { hz: 622.25, realName: 'Mi giáng (Eb)' },
      'Fa 1': { hz: 622.25, realName: 'Mi giáng 1 (Eb)' },
      'Sol': { hz: 698.46, realName: 'Fa (F)' },
      'Sol 1': { hz: 698.46, realName: 'Fa 1 (F)' },
      'La': { hz: 783.99, realName: 'Sol (G)' },
      'La 1': { hz: 783.99, realName: 'Sol 1 (G)' },
      'Si': { hz: 880.00, realName: 'La (A)' },
      'Si 1': { hz: 880.00, realName: 'La 1 (A)' },
      'Si giáng': { hz: 830.61, realName: 'La giáng (Ab)' },
      'Sib': { hz: 830.61, realName: 'La giáng (Ab)' },
      'Đô 2': { hz: 932.33, realName: 'Si giáng 2 (Bb)' },
      'Đô2': { hz: 932.33, realName: 'Si giáng 2 (Bb)' },
    }
  },
  'F': {
    name: 'Sáo Fa (F4) — Trầm',
    fundamental: 349.23,
    octaveBase: 4,
    notes: {
      'Đô': { hz: 349.23, realName: 'Fa (F)' },
      'Đô 1': { hz: 349.23, realName: 'Fa 1 (F)' },
      'Rê': { hz: 392.00, realName: 'Sol (G)' },
      'Rê 1': { hz: 392.00, realName: 'Sol 1 (G)' },
      'Mi': { hz: 440.00, realName: 'La (A)' },
      'Mi 1': { hz: 440.00, realName: 'La 1 (A)' },
      'Fa': { hz: 466.16, realName: 'Si giáng (Bb)' },
      'Fa 1': { hz: 466.16, realName: 'Si giáng 1 (Bb)' },
      'Sol': { hz: 523.25, realName: 'Đô (C)' },
      'Sol 1': { hz: 523.25, realName: 'Đô 1 (C)' },
      'La': { hz: 587.33, realName: 'Rê (D)' },
      'La 1': { hz: 587.33, realName: 'Rê 1 (D)' },
      'Si': { hz: 659.25, realName: 'Mi (E)' },
      'Si 1': { hz: 659.25, realName: 'Mi 1 (E)' },
      'Si giáng': { hz: 622.25, realName: 'Mi giáng (Eb)' },
      'Sib': { hz: 622.25, realName: 'Mi giáng (Eb)' },
      'Đô 2': { hz: 698.46, realName: 'Fa 2 (F)' },
      'Đô2': { hz: 698.46, realName: 'Fa 2 (F)' },
    }
  }
};

/**
 * Lấy tần số chuẩn của nốt dựa theo Tone sáo người dùng đang chọn.
 */
function getFluteTargetHz(noteName, detectedHz = null) {
  const toneKey = window.currentFluteTone || (document.getElementById('flute-type-select')?.value) || 'C';
  const toneConfig = FLUTE_TONES[toneKey] || FLUTE_TONES['C'];
  const noteInfo = toneConfig.notes[noteName] || toneConfig.notes['Sol'];

  // Nếu người dùng thổi sáo tone C ở quãng trầm (C4)
  if (toneKey === 'C' && detectedHz && detectedHz < 420 && noteInfo.altHz) {
    return noteInfo.altHz;
  }
  return noteInfo.hz;
}

/**
 * Kiểm tra xem nốt đang thổi có khớp với nốt mục tiêu không.
 * Tự động hỗ trợ 7 loại tone sáo (C, A, G, D, B, Bb, F)
 * và phân biệt chính xác Đô 1 vs Đô 2, Si giáng / Sib.
 */
function isMatchingFluteNote(detectedNote, detectedOctave, detectedHz, targetNote) {
  if (!detectedNote || !targetNote) return false;
  const toneKey = window.currentFluteTone || (document.getElementById('flute-type-select')?.value) || 'C';
  const toneConfig = FLUTE_TONES[toneKey] || FLUTE_TONES['C'];

  // Nếu sáo đang chọn không phải Tone C (ví dụ Sáo La A4, Sáo Sol G4...):
  // So sánh tần số thực tế với targetHz của thế bấm đó trên cây sáo này!
  if (toneKey !== 'C') {
    const targetHz = getFluteTargetHz(targetNote);
    if (detectedHz && targetHz) {
      // Cho phép lệch trong khoảng ±48 cent
      const centDiff = Math.abs(1200 * Math.log2(detectedHz / targetHz));
      if (centDiff <= 48) return true;
      // Kiểm tra xem có phải nhảy quãng tám của cùng nốt không
      const octaveDiff = Math.abs(1200 * Math.log2(detectedHz / (targetHz * 2)));
      if (octaveDiff <= 48 && targetNote.includes('2')) return true;
    }
    // Hoặc kiểm tra qua tên nốt âm thực
    const noteInfo = toneConfig.notes[targetNote];
    if (noteInfo && noteInfo.realName) {
      const realBase = noteInfo.realName.split(' ')[0].toLowerCase();
      const detBase = (detectedNote || '').trim().toLowerCase();
      if (detBase === realBase || detBase.startsWith(realBase)) return true;
    }
    return false;
  }

  // 1. Kiểm tra so sánh tần số mục tiêu chính xác theo Hz (độ lệch <= 48 cent)
  if (detectedHz && detectedHz > 0) {
    const targetHz = getFluteTargetHz(targetNote, detectedHz);
    if (targetHz) {
      const centDiff = Math.abs(1200 * Math.log2(detectedHz / targetHz));
      if (centDiff <= 48) return true;

      // Hỗ trợ trường hợp sáo C4 trầm: kiểm tra altHz
      const noteInfo = toneConfig.notes[targetNote];
      if (noteInfo && noteInfo.altHz) {
        const altCentDiff = Math.abs(1200 * Math.log2(detectedHz / noteInfo.altHz));
        if (altCentDiff <= 48) return true;
      }
    }
  }

  // 2. Kiểm tra theo tên xướng âm chuẩn hóa
  const dNorm = (detectedNote || '').trim().toLowerCase();
  const tNorm = (targetNote || '').trim().toLowerCase();

  const isTargetSib = (tNorm === 'sib' || tNorm === 'si giáng' || tNorm === 'si giang' || tNorm === 'bb');
  const isDetSib = (dNorm === 'si giáng' || dNorm === 'si giang' || dNorm === 'sib' || dNorm === 'bb');
  if (isTargetSib || isDetSib) return isTargetSib && isDetSib;

  const isTargetDo2 = (tNorm === 'đô2' || tNorm === 'đô 2' || tNorm === 'do2' || tNorm === 'do 2' || tNorm === 'c5' || tNorm === 'c6');
  const isTargetDo1 = (tNorm === 'đô' || tNorm === 'đô 1' || tNorm === 'do' || tNorm === 'do 1' || tNorm === 'c4');

  if (isTargetDo2) {
    if (dNorm === 'đô' || dNorm === 'do' || dNorm === 'c') {
      // Trên sáo C5 thông dụng: Đô 2 là C6 (~1046Hz, octave 6)
      // Trên sáo C4 trầm: Đô 2 là C5 (~523Hz, octave 5)
      if (detectedHz) {
        return detectedHz >= 750 || (detectedHz >= 480 && detectedHz <= 580 && detectedOctave === 5 && !isTargetDo1);
      }
      return detectedOctave >= 6 || (detectedOctave === 5 && !isTargetDo1);
    }
    return false;
  }

  if (isTargetDo1) {
    if (dNorm === 'đô' || dNorm === 'do' || dNorm === 'c') {
      // Trên sáo C5: Đô 1 là C5 (~523Hz)
      // Trên sáo C4: Đô 1 là C4 (~261Hz)
      if (detectedHz) {
        return detectedHz < 750;
      }
      return detectedOctave <= 5;
    }
    return false;
  }

  const strip = (s) => s.replace(/[0-9\s]/g, '');
  return strip(dNorm) === strip(tNorm);
}
window.isMatchingFluteNote = isMatchingFluteNote;

/* ============================================================
   BỘ PHÁT HIỆN CAO ĐỘ THỜI GIAN THỰC PHÍA TRÌNH DUYỆT (CLIENT PITCH DETECTOR)
   Sử dụng NSDF (Normalized Square Difference) kết hợp nội suy Parabolic
   Độ nhạy siêu cao, 0ms độ trễ mạng, hoạt động ngay cả khi WebSocket đang kết nối
   ============================================================ */
const CLIENT_NOTE_VIET = ['Đô', 'Đô#', 'Rê', 'Rê#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'Si giáng', 'Si'];
const CLIENT_NOTE_WEST = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

function hzToNote(freqHz) {
  if (!freqHz || freqHz <= 0) return null;
  const midiExact = 69.0 + 12.0 * Math.log2(freqHz / 440.0);
  const midiRound = Math.round(midiExact);
  const centOffset = (midiExact - midiRound) * 100.0;
  const noteIdx = ((midiRound % 12) + 12) % 12;
  const octave = Math.floor(midiRound / 12) - 1;
  return {
    hz: Math.round(freqHz * 10) / 10,
    note_viet: CLIENT_NOTE_VIET[noteIdx],
    note_western: CLIENT_NOTE_WEST[noteIdx],
    octave: octave,
    cent_offset: Math.round(centOffset * 10) / 10,
  };
}
window.hzToNote = hzToNote;

function detectPitchNSDF(buffer, sampleRate) {
  const SIZE = buffer.length;
  // 1. Tính RMS mức năng lượng âm thanh
  let sumSq = 0;
  for (let i = 0; i < SIZE; i++) {
    sumSq += buffer[i] * buffer[i];
  }
  const rms = Math.sqrt(sumSq / SIZE);
  // Ngưỡng siêu nhạy: 0.0006 giúp nhận diện ngay cả khi học viên thổi nhẹ hoặc mic laptop ở xa
  if (rms < 0.0006) return null;

  // Phạm vi lag: 180 Hz (~F3) đến 2200 Hz (~C7)
  const minLag = Math.max(2, Math.floor(sampleRate / 2200));
  const maxLag = Math.min(Math.floor(sampleRate / 180), Math.floor(SIZE / 2));
  if (minLag >= maxLag) return null;

  const lagCount = maxLag - minLag + 1;
  const nsdf = new Float32Array(lagCount);

  for (let lag = minLag; lag <= maxLag; lag++) {
    let r = 0;
    let m = 0;
    const limit = SIZE - lag;
    for (let i = 0; i < limit; i += 2) {
      const a = buffer[i];
      const b = buffer[i + lag];
      r += a * b;
      m += a * a + b * b;
    }
    nsdf[lag - minLag] = m > 0 ? (2.0 * r) / m : 0;
  }

  // Tìm đỉnh đầu tiên (First peak) trên ngưỡng 0.35 để chuẩn nốt gốc, tránh hài âm bậc 2
  let bestIdx = -1;
  for (let i = 1; i < lagCount - 1; i++) {
    if (nsdf[i] > 0.35 && nsdf[i] > nsdf[i - 1] && nsdf[i] >= nsdf[i + 1]) {
      bestIdx = i;
      break;
    }
  }

  // Dự phòng: nếu không thấy đỉnh > 0.35, tìm đỉnh cao nhất toàn cục trên 0.28
  if (bestIdx === -1) {
    let maxVal = 0.28;
    for (let i = 1; i < lagCount - 1; i++) {
      if (nsdf[i] > maxVal && nsdf[i] > nsdf[i - 1] && nsdf[i] >= nsdf[i + 1]) {
        maxVal = nsdf[i];
        bestIdx = i;
      }
    }
  }

  if (bestIdx === -1) return null;

  let bestLag = minLag + bestIdx;
  // Nội suy Parabolic để đạt độ chuẩn xác từng Cent
  if (bestIdx > 0 && bestIdx < lagCount - 1) {
    const s0 = nsdf[bestIdx - 1];
    const s1 = nsdf[bestIdx];
    const s2 = nsdf[bestIdx + 1];
    const denom = 2.0 * (2.0 * s1 - s0 - s2);
    if (denom !== 0) {
      bestLag += (s0 - s2) / denom;
    }
  }

  const hz = sampleRate / bestLag;
  if (hz < 180 || hz > 2200) return null;

  const noteInfo = hzToNote(hz);
  if (!noteInfo) return null;

  return {
    hz: noteInfo.hz,
    note_viet: noteInfo.note_viet,
    note_western: noteInfo.note_western,
    octave: noteInfo.octave,
    cent_offset: noteInfo.cent_offset,
    confidence: Math.min(1.0, Math.max(0.0, nsdf[bestIdx])),
    rms: Math.round(rms * 10000) / 10000,
    is_silent: false,
  };
}
window.detectPitchNSDF = detectPitchNSDF;

/* ============================================================
   BỘ TỔNG HỢP ÂM THANH SÁO TRÚC VIỆT NAM (BAMBOO FLUTE AUDIO ENGINE)
   ============================================================ */
/* ============================================================
   BỘ PHÁT ÂM THANH MẪU SÁO THẬT & BỘ TỔNG HỢP HỌC SÁO (BAMBOO FLUTE ENGINE)
   - Tải và phát trực tiếp 9 mẫu ghi âm sáo trúc thật của người dùng:
     do1.wav, re1.wav, mi1.wav, fa1.wav, sol1.wav, la1.wav, si1.wav, sib.wav, do2.wav
   - Độ trễ 0ms bằng AudioBufferSourceNode của Web Audio API
   - Tự động dự phòng sang bộ tổng hợp đa họa âm tự nhiên nếu mạng chậm
   ============================================================ */
class BambooFluteEngine {
  constructor() {
    this.audioCtx = null;
    this.noiseBuffer = null;
    this.isPlayingSequence = false;
    this.sampleBuffers = {}; // Map 'do1' -> AudioBuffer
    this.sampleUrls = {
      'do1': '/static/audio/samples/do1.wav',
      're1': '/static/audio/samples/re1.wav',
      'mi1': '/static/audio/samples/mi1.wav',
      'fa1': '/static/audio/samples/fa1.wav',
      'sol1': '/static/audio/samples/sol1.wav',
      'la1': '/static/audio/samples/la1.wav',
      'si1': '/static/audio/samples/si1.wav',
      'sib': '/static/audio/samples/sib.wav',
      'do2': '/static/audio/samples/do2.wav',
    };
    this._preloadPromise = null;
    // Tải lười khi người dùng click/thổi sáo, không nghẽn luồng trang khi mới mở
  }

  async loadSingleSample(key) {
    const url = this.sampleUrls[key];
    if (!url || this.sampleBuffers[key]) return this.sampleBuffers[key];
    try {
      const ctx = this._initContext();
      const res = await fetch(url);
      if (!res.ok) return null;
      const arrayBuf = await res.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arrayBuf);
      this.sampleBuffers[key] = decoded;
      return decoded;
    } catch (e) {
      return null;
    }
  }

  _initContext() {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    if (!this.noiseBuffer && this.audioCtx) {
      const bufferSize = Math.floor(this.audioCtx.sampleRate * 0.8);
      this.noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.5;
      }
    }
    return this.audioCtx;
  }

  _initPreload() {
    if (this._preloadPromise) return this._preloadPromise;
    this._preloadPromise = (async () => {
      try {
        const ctx = this._initContext();
        const loadPromises = Object.entries(this.sampleUrls).map(async ([key, url]) => {
          try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const arrayBuf = await res.arrayBuffer();
            const decoded = await ctx.decodeAudioData(arrayBuf);
            this.sampleBuffers[key] = decoded;
          } catch (e) {
            console.warn(`[BambooFluteEngine] Không tải được mẫu ${key}:`, e);
          }
        });
        await Promise.all(loadPromises);
      } catch (err) {
        console.warn('[BambooFluteEngine] Lỗi khởi tạo mẫu âm:', err);
      }
    })();
    return this._preloadPromise;
  }

  // Chuyển đổi tên nốt hoặc tần số Hz sang sampleKey
  resolveSampleKey(input) {
    if (typeof input === 'string') {
      const s = input.trim().toLowerCase();
      if (s === 'đô' || s === 'đô 1' || s === 'do' || s === 'do 1' || s === 'c' || s === 'c4' || s === 'c5') return 'do1';
      if (s === 'rê' || s === 'rê 1' || s === 're' || s === 're 1' || s === 'd' || s === 'd4' || s === 'd5') return 're1';
      if (s === 'mi' || s === 'mi 1' || s === 'e' || s === 'e4' || s === 'e5') return 'mi1';
      if (s === 'fa' || s === 'fa 1' || s === 'f' || s === 'f4' || s === 'f5') return 'fa1';
      if (s === 'sol' || s === 'sol 1' || s === 'g' || s === 'g4' || s === 'g5') return 'sol1';
      if (s === 'la' || s === 'la 1' || s === 'a' || s === 'a4' || s === 'a5') return 'la1';
      if (s === 'si' || s === 'si 1' || s === 'b' || s === 'b4' || s === 'b5') return 'si1';
      if (s === 'sib' || s === 'si giáng' || s === 'si giang' || s === 'bb') return 'sib';
      if (s === 'đô 2' || s === 'đô2' || s === 'do 2' || s === 'do2' || s === 'c6') return 'do2';
    } else if (typeof input === 'number') {
      const hz = input;
      // Nhận diện tần số (hỗ trợ cả quãng 4 và quãng 5)
      if ((hz >= 240 && hz <= 280) || (hz >= 505 && hz <= 555)) return 'do1';
      if ((hz >= 281 && hz <= 315) || (hz >= 575 && hz <= 630)) return 're1';
      if ((hz >= 316 && hz <= 340) || (hz >= 645 && hz <= 695)) return 'mi1';
      if ((hz >= 341 && hz <= 375) || (hz >= 698 && hz <= 745)) return 'fa1';
      if ((hz >= 376 && hz <= 415) || (hz >= 770 && hz <= 835)) return 'sol1';
      if ((hz >= 420 && hz <= 455) || (hz >= 860 && hz <= 915)) return 'la1';
      if ((hz >= 456 && hz <= 475) || (hz >= 916 && hz <= 955)) return 'sib';
      if ((hz >= 476 && hz <= 510) || (hz >= 970 && hz <= 1025)) return 'si1';
      if (hz >= 1026) return 'do2';
    }
    return null;
  }

  // Phát trực tiếp mẫu sáo thật đã ghi âm
  playRealSample(sampleKey, duration = 1.3, volume = 0.55) {
    try {
      const ctx = this._initContext();
      const buf = this.sampleBuffers[sampleKey];
      if (!buf) return false;

      const now = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = buf;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.03);
      const playDur = Math.min(duration, buf.duration);
      gain.gain.setValueAtTime(volume * 0.92, now + playDur - 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + playDur);

      src.connect(gain);
      gain.connect(ctx.destination);

      src.start(now);
      src.stop(now + playDur);
      return true;
    } catch (e) {
      console.warn('Lỗi playRealSample:', e);
      return false;
    }
  }

  // Hàm phát nốt chính: ưu tiên phát mẫu sáo thật, dự phòng tổng hợp oscillator
  playNote(freqOrName, duration = 1.3, options = {}) {
    const sampleKey = this.resolveSampleKey(freqOrName);
    if (sampleKey && !options.synthOnly) {
      if (this.playRealSample(sampleKey, duration, options.volume || 0.6)) {
        return;
      }
    }

    // Dự phòng: Tổng hợp sóng hình sin đa họa âm
    try {
      const freqHz = typeof freqOrName === 'number' ? freqOrName : (NOTE_DATA[freqOrName]?.freq[5] || 523.25);
      const ctx = this._initContext();
      const now = ctx.currentTime;
      const gainLevel = options.volume || 0.35;

      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freqHz, now);

      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freqHz * 2, now);

      const osc3 = ctx.createOscillator();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(freqHz * 3, now);

      const vibrato = ctx.createOscillator();
      const vibGain = ctx.createGain();
      vibrato.frequency.setValueAtTime(5.2, now);
      vibGain.gain.setValueAtTime(0, now);
      vibGain.gain.linearRampToValueAtTime(Math.max(1.5, freqHz * 0.01), now + 0.35);
      vibrato.connect(vibGain);
      vibGain.connect(osc1.frequency);
      vibGain.connect(osc2.frequency);

      const g1 = ctx.createGain();
      const g2 = ctx.createGain();
      const g3 = ctx.createGain();
      const masterGain = ctx.createGain();

      g1.gain.setValueAtTime(0.72, now);
      g2.gain.setValueAtTime(0.24, now);
      g3.gain.setValueAtTime(0.08, now);

      masterGain.gain.setValueAtTime(0.0001, now);
      masterGain.gain.linearRampToValueAtTime(gainLevel, now + 0.08);
      masterGain.gain.setValueAtTime(gainLevel * 0.9, now + duration - 0.2);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc1.connect(g1);
      osc2.connect(g2);
      osc3.connect(g3);
      g1.connect(masterGain);
      g2.connect(masterGain);
      g3.connect(masterGain);
      masterGain.connect(ctx.destination);

      vibrato.start(now);
      osc1.start(now);
      osc2.start(now);
      osc3.start(now);

      vibrato.stop(now + duration);
      osc1.stop(now + duration);
      osc2.stop(now + duration);
      osc3.stop(now + duration);
    } catch (e) {
      console.warn('Lỗi BambooFluteEngine.playNote:', e);
    }
  }

  // Tiếng chuông báo đạt nốt
  playChime(type = 'step') {
    try {
      const ctx = this._initContext();
      const now = ctx.currentTime;
      const f1 = type === 'victory' ? 523.25 : 659.25;
      const f2 = type === 'victory' ? 783.99 : 880.00;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f1, now);
      osc.frequency.setValueAtTime(f2, now + 0.08);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {}
  }

  playVictoryMelody() {
    try {
      const notes = ['Đô', 'Mi', 'Sol', 'Đô 2'];
      let t = 0;
      notes.forEach(n => {
        setTimeout(() => {
          this.playNote(n, 0.45, { volume: 0.5 });
        }, t * 1000);
        t += 0.25;
      });
    } catch (e) {}
  }

  // Phát toàn bộ bài hát mẫu với nốt sáo thật
  async playMelodySequence(notesArray, onStepChange = null, onComplete = null) {
    if (this.isPlayingSequence) return;
    this.isPlayingSequence = true;

    for (let i = 0; i < notesArray.length; i++) {
      if (!this.isPlayingSequence) break;
      const item = notesArray[i];
      if (typeof onStepChange === 'function') {
        onStepChange(i, item);
      }
      const dur = item.dur || 0.7;
      if (item.type === 'rest' || item.note === 'Lặng') {
        const beatSec = dur * (60 / 90);
        await new Promise(r => setTimeout(r, beatSec * 1000));
        continue;
      }
      this.playNote(item.note, dur, { volume: 0.65 });
      await new Promise(r => setTimeout(r, dur * 1000 + 40));
    }

    if (typeof onStepChange === 'function') {
      onStepChange(-1, null);
    }
    this.isPlayingSequence = false;
    if (typeof onComplete === 'function') {
      onComplete();
    }
  }

  stopSequence() {
    this.isPlayingSequence = false;
  }
}

const bambooFluteEngine = new BambooFluteEngine();
window.bambooFluteEngine = bambooFluteEngine;

function playFlutePreview(freqHz, duration = 1.3) {
  bambooFluteEngine.playNote(freqHz, duration);
}


/* ============================================================
   LỚP QUẢN LÝ MICROPHONE & PHÂN TÍCH ÂM THANH (HOCSAO AUDIO ENGINE)
   - Sử dụng AnalyserNode + requestAnimationFrame (Chuẩn W3C hiện đại nhất)
   - Hoàn toàn độc lập, không phụ thuộc ScriptProcessor cũ
   - Tự động chống trùng lặp getUserMedia, tương thích 100% mọi trình duyệt
   - Bắt âm siêu nhạy cho sáo trúc, không bao giờ bị đơ hay ngắt tiếng
   ============================================================ */
class HocSaoAudioEngine {
  constructor() {
    this.isRecording = false;
    this.audioCtx = null;
    this.mediaStream = null;
    this.sourceNode = null;
    this.highpassFilter = null;
    this.gainNode = null;
    this.analyserNode = null;

    this.timeDomainBuffer = null;
    this.rafId = null;
    this._startPromise = null;

    this.activeDeviceId = '';
    this.availableDevices = [];

    this.sampleRate = 48000;
    this.lastPitchDetectTime = 0;
    this.lastWsSendTime = 0;
    this.gainMultiplier = parseFloat(localStorage.getItem('hocsao_mic_gain')) || 1.6;

    this._resampleRatio = 1;
  }

  async start(preferredDeviceId = null) {
    if (this.isRecording && this.mediaStream && this.audioCtx && this.audioCtx.state === 'running' && !preferredDeviceId) {
      return true;
    }

    if (this._startPromise) {
      return await this._startPromise;
    }

    this._startPromise = this._initAudioInternal(preferredDeviceId);
    try {
      const res = await this._startPromise;
      return res;
    } finally {
      this._startPromise = null;
    }
  }

  async _initAudioInternal(preferredDeviceId) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const banner = document.getElementById('mic-permission-banner');
      if (banner) {
        banner.style.display = 'block';
        banner.innerHTML = `⚠️ Trình duyệt chặn Microphone hoặc không ở môi trường an toàn (HTTPS/localhost). Vui lòng mở app bằng <b>http://localhost:8000</b>.`;
      }
      showToast('⚠️ Trình duyệt không hỗ trợ truy cập Microphone.', 'error', 6000);
      return false;
    }

    try {
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(t => t.stop());
        this.mediaStream = null;
      }

      let audioConstraint = {
        echoCancellation: { ideal: false },
        noiseSuppression: { ideal: false },
        autoGainControl: { ideal: false },
      };
      if (preferredDeviceId) {
        audioConstraint.deviceId = { exact: preferredDeviceId };
        this.activeDeviceId = preferredDeviceId;
      }

      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraint });
      } catch (errSoft) {
        console.warn('Ràng buộc nâng cao thất bại, dùng fallback:', errSoft);
        try {
          const fallbackConstraint = preferredDeviceId ? { audio: { deviceId: { exact: preferredDeviceId } } } : { audio: true };
          stream = await navigator.mediaDevices.getUserMedia(fallbackConstraint);
        } catch (errFallback) {
          console.warn('Fallback thiết bị cụ thể thất bại, thử audio: true cơ bản:', errFallback);
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
      }

      this.mediaStream = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        this.audioCtx = new AudioCtx();
      }

      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      this.sampleRate = this.audioCtx.sampleRate;
      this._resampleRatio = this.sampleRate / 16000;

      // Xây dựng audio graph
      this.sourceNode = this.audioCtx.createMediaStreamSource(this.mediaStream);

      // Highpass filter 80Hz: lọc rung bàn nhưng giữ nguyên nốt Đô 1
      this.highpassFilter = this.audioCtx.createBiquadFilter();
      this.highpassFilter.type = 'highpass';
      this.highpassFilter.frequency.setValueAtTime(80, this.audioCtx.currentTime);
      this.highpassFilter.Q.setValueAtTime(0.7, this.audioCtx.currentTime);

      // Bộ khuếch đại nhạy âm
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.setValueAtTime(this.gainMultiplier, this.audioCtx.currentTime);

      // AnalyserNode
      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = 2048;
      this.timeDomainBuffer = new Float32Array(this.analyserNode.fftSize);

      this.sourceNode.connect(this.highpassFilter);
      this.highpassFilter.connect(this.gainNode);
      this.gainNode.connect(this.analyserNode);

      // Windows Chromium Audio Pull Engine:
      // Tạo một Mute GainNode (gain = 0) nối Analyser tới audioCtx.destination
      // để bắt buộc engine âm thanh kéo liên tục các quantum 128 mẫu qua đồ thị,
      // đảm bảo analyser buffer luôn có dữ liệu tươi mới mà không phát tiếng hú ra loa.
      if (!this.muteNode) {
        this.muteNode = this.audioCtx.createGain();
      }
      this.muteNode.gain.setValueAtTime(0, this.audioCtx.currentTime);
      try {
        this.analyserNode.connect(this.muteNode);
        this.muteNode.connect(this.audioCtx.destination);
      } catch (eMute) {
        console.warn('Lỗi nối muteNode tới destination:', eMute);
      }

      // Neo giữ biến vào window để chống Garbage Collection
      window._hocsao_audio_ctx = this.audioCtx;
      window._hocsao_stream = this.mediaStream;
      window._hocsao_source = this.sourceNode;
      window._hocsao_analyser = this.analyserNode;

      this.isRecording = true;

      // Bắt đầu vòng lặp đọc dữ liệu bằng requestAnimationFrame
      if (this.rafId) cancelAnimationFrame(this.rafId);
      this._runAudioLoop();

      // Cập nhật danh sách thiết bị
      this._enumerateInputDevices();

      // Cập nhật giao diện
      this._updateUIMicState(true);

      const banner = document.getElementById('mic-permission-banner');
      if (banner) banner.style.display = 'none';

      console.log(`🎤 [HọcSáo] Microphone kết nối thành công: ${this.sampleRate}Hz`);
      return true;

    } catch (err) {
      console.error('Lỗi khi mở microphone:', err);
      this._updateUIMicState(false, err);
      return false;
    }
  }

  stop() {
    this.isRecording = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    if (this.sourceNode) {
      try { this.sourceNode.disconnect(); } catch (e) {}
      this.sourceNode = null;
    }
    if (this.muteNode) {
      try { this.muteNode.disconnect(); } catch (e) {}
      this.muteNode = null;
    }
    this._updateUIMicState(false);
  }

  setGain(val) {
    this.gainMultiplier = Math.max(0.5, Math.min(4.0, parseFloat(val) || 1.6));
    localStorage.setItem('hocsao_mic_gain', this.gainMultiplier.toFixed(1));
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setValueAtTime(this.gainMultiplier, this.audioCtx.currentTime);
    }
    const labelEl = document.getElementById('mic-device-label');
    if (labelEl && this.isRecording) {
      const track = this.mediaStream?.getAudioTracks()[0];
      const activeLabel = track?.label || 'Microphone hệ thống';
      labelEl.textContent = `🎤 Đang dùng: ${activeLabel} (${this.sampleRate}Hz · Nhạy ${this.gainMultiplier}x)`;
    }
  }

  async _enumerateInputDevices() {
    try {
      if (!navigator.mediaDevices.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableDevices = devices.filter(d => d.kind === 'audioinput');

      const selectEl = document.getElementById('mic-device-selector');
      if (selectEl && this.availableDevices.length > 0) {
        selectEl.innerHTML = '';
        this.availableDevices.forEach((dev, idx) => {
          const opt = document.createElement('option');
          opt.value = dev.deviceId;
          opt.textContent = dev.label || `Microphone ${idx + 1}`;
          if (this.activeDeviceId === dev.deviceId) opt.selected = true;
          selectEl.appendChild(opt);
        });
        if (this.availableDevices.length > 1) {
          selectEl.style.display = 'inline-block';
          selectEl.onchange = (e) => this.start(e.target.value);
        }
      }

      const track = this.mediaStream?.getAudioTracks()[0];
      const activeLabel = track?.label || 'Microphone hệ thống';
      const deviceLabelEl = document.getElementById('mic-device-label');
      if (deviceLabelEl) {
        deviceLabelEl.textContent = `🎤 Đang dùng: ${activeLabel} (${this.sampleRate}Hz · Nhạy ${this.gainMultiplier}x)`;
      }
    } catch (e) {
      console.warn('Lỗi liệt kê thiết bị mic:', e);
    }
  }

  _updateUIMicState(isActive, error = null) {
    const pill = document.getElementById('mic-status-pill');
    const dot = document.getElementById('mic-dot-indicator');
    const label = document.getElementById('mic-pill-label');
    const btnQuick = document.getElementById('btn-toggle-mic-quick');
    const statusText = document.getElementById('mic-status-text');
    const banner = document.getElementById('mic-permission-banner');

    if (isActive) {
      if (pill) { pill.className = 'badge badge-green'; }
      if (dot) { dot.className = 'status-dot green'; }
      if (label) { label.textContent = 'Micro Đang Thu'; }
      if (btnQuick) {
        btnQuick.innerHTML = '<span>⏹</span> Tắt Mic';
        btnQuick.style.background = '#30363d';
      }
      if (statusText) {
        statusText.textContent = 'Đang bắt tiếng 🎵';
        statusText.style.color = 'var(--success)';
      }
      if (banner) banner.style.display = 'none';
    } else {
      if (pill) { pill.className = 'badge badge-orange'; }
      if (dot) { dot.className = 'status-dot orange'; }
      if (label) { label.textContent = 'Micro Chưa Bật'; }
      if (btnQuick) {
        btnQuick.innerHTML = '<span>🎙️</span> Bật Micro';
        btnQuick.style.background = '#238636';
      }
      if (statusText) {
        statusText.textContent = 'Chưa bật';
        statusText.style.color = 'var(--text-sec)';
      }

      if (error && banner) {
        banner.style.display = 'block';
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          banner.innerHTML = `
            <div style="display: flex; gap: 12px; align-items: flex-start;">
              <span style="font-size: 1.5rem;">🔒</span>
              <div>
                <b style="color: #fca5a5; font-size: 1rem;">TRÌNH DUYỆT ĐANG CHẶN QUYỀN MICROPHONE</b>
                <div style="margin-top: 6px; font-size: 0.85rem; line-height: 1.5; color: #cbd5e1;">
                  1. Nhìn lên góc trái thanh địa chỉ trình duyệt (cạnh <code>http://localhost:8000</code>).<br>
                  2. Bấm vào biểu tượng <b>Ổ Khóa 🔒</b> hoặc nút Cài đặt trang.<br>
                  3. Gạt mục <b>Microphone</b> sang <b>Cho phép (Allow)</b>.<br>
                  4. Sau đó bấm <a href="javascript:location.reload()" style="color: var(--accent); font-weight: 700;">Tải lại trang (F5)</a> để bắt đầu thổi sáo!
                </div>
              </div>
            </div>
          `;
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          banner.innerHTML = `⚠️ <b>Không tìm thấy thiết bị Microphone:</b> Máy tính chưa nhận diện được micro. Hãy cắm tai nghe có mic hoặc kiểm tra cổng cắm mic của bạn.`;
        } else if (error.name === 'NotReadableError') {
          banner.innerHTML = `⚠️ <b>Microphone đang bận:</b> Thiết bị thu âm đang bị ứng dụng khác (Zalo, Zoom, Google Meet) sử dụng. Hãy tắt bớt ứng dụng và thử lại.`;
        }
      }
    }
  }

  _runAudioLoop() {
    if (!this.isRecording || !this.analyserNode) return;

    // Tự động khôi phục AudioContext nếu bị trình duyệt tạm dừng
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try { this.audioCtx.resume(); } catch (e) {}
    }

    this.analyserNode.getFloatTimeDomainData(this.timeDomainBuffer);

    // 1. Tính RMS cho VU Meter
    let sumSq = 0;
    const len = this.timeDomainBuffer.length;
    for (let i = 0; i < len; i += 4) {
      sumSq += this.timeDomainBuffer[i] * this.timeDomainBuffer[i];
    }
    const rms = Math.sqrt(sumSq / (len / 4));
    const vuPercent = Math.min(100, Math.round(rms * 600));

    // Theo dõi mức im lặng tuyệt đối (giúp phát hiện mic bị gạt tắt trên bàn phím Fn+F4)
    if (rms < 0.00005) {
      this._zeroRmsFrames = (this._zeroRmsFrames || 0) + 1;
      if (this._zeroRmsFrames > 150) { // ~3 giây hoàn toàn không có tín hiệu
        const statusText = document.getElementById('mic-status-text');
        if (statusText && this.isRecording) {
          statusText.textContent = 'Tín hiệu 0% ⚠️';
          statusText.style.color = '#f59e0b';
        }
      }
    } else {
      this._zeroRmsFrames = 0;
      const statusText = document.getElementById('mic-status-text');
      if (statusText && this.isRecording) {
        statusText.textContent = 'Đang bắt tiếng 🎵';
        statusText.style.color = 'var(--success)';
      }
    }

    // Cập nhật thanh đo âm lượng phòng tập
    const vuEl = document.getElementById('mic-vu-fill');
    if (vuEl) {
      vuEl.style.width = `${vuPercent}%`;
      if (vuPercent > 70) vuEl.style.background = '#f85149';
      else if (vuPercent > 6) vuEl.style.background = '#3fb950';
      else vuEl.style.background = '#58a6ff';
    }

    // Cập nhật thanh đo âm lượng trong Game
    const gameVuEl = document.getElementById('game-mic-vu-fill');
    if (gameVuEl) {
      gameVuEl.style.width = `${vuPercent}%`;
      if (vuPercent > 70) gameVuEl.style.background = '#f85149';
      else if (vuPercent > 6) gameVuEl.style.background = '#3fb950';
      else gameVuEl.style.background = '#58a6ff';
    }

    // 2. Nhận diện cao độ cục bộ (Zero Latency NSDF) ~30 FPS
    const now = performance.now();
    if (now - this.lastPitchDetectTime > 32) {
      this.lastPitchDetectTime = now;
      const pitch = detectPitchNSDF(this.timeDomainBuffer, this.sampleRate);

      if (pitch) {
        // Cập nhật nhãn nốt trong Game
        const gameNoteBadge = document.getElementById('game-mic-note-badge');
        if (gameNoteBadge) {
          gameNoteBadge.textContent = `${pitch.note_viet} (${Math.round(pitch.hz)}Hz)`;
          gameNoteBadge.className = 'badge badge-green text-xs';
        }

        // Chuyển cho game nếu đang chơi
        if (window.fluteGame && typeof window.fluteGame.onAudioFrame === 'function') {
          window.fluteGame.onAudioFrame(pitch);
        }

        // Chuyển cho PracticeUI CHỈ KHI session chưa bật (để xem kim đo Tuner trước khi tập)
        // Khi session đã bật, toàn bộ điểm số và hơi thở PHẢI đến từ WebSocket Server!
        if (window.practiceUI && (!window.practiceUI.session || !window.practiceUI.session.active)) {
          window.practiceUI._updatePitchDisplayOnly(pitch);
        }
      } else {
        const gameNoteBadge = document.getElementById('game-mic-note-badge');
        if (gameNoteBadge) {
          gameNoteBadge.textContent = '—';
          gameNoteBadge.className = 'badge badge-blue text-xs';
        }
      }
    }

    // 3. Gửi âm thanh nén 16000Hz lên WebSocket Backend ~22 FPS
    if (window.practiceUI && window.practiceUI.session && window.practiceUI.session.active && window.practiceUI.session.ws && window.practiceUI.session.ws.readyState === WebSocket.OPEN) {
      if (now - this.lastWsSendTime > 45) {
        this.lastWsSendTime = now;
        this._sendPcmToWs(window.practiceUI.session.ws);
      }
    }

    this.rafId = requestAnimationFrame(this._runAudioLoop.bind(this));
  }

  _sendPcmToWs(ws) {
    const inputData = this.timeDomainBuffer;
    let samples16k;
    if (this.sampleRate === 16000) {
      samples16k = inputData;
    } else {
      const ratio = this._resampleRatio;
      const newLength = Math.round(inputData.length / ratio);
      samples16k = new Float32Array(newLength);
      for (let i = 0; i < newLength; i++) {
        const originIdx = i * ratio;
        const idx0 = Math.floor(originIdx);
        const idx1 = Math.min(idx0 + 1, inputData.length - 1);
        const frac = originIdx - idx0;
        samples16k[i] = inputData[idx0] * (1 - frac) + inputData[idx1] * frac;
      }
    }

    const pcm16 = new Int16Array(samples16k.length);
    for (let i = 0; i < samples16k.length; i++) {
      const s = Math.max(-1, Math.min(1, samples16k[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    try {
      ws.send(pcm16.buffer);
    } catch (e) {}
  }
}

window.hocsaoAudio = new HocSaoAudioEngine();

/* ============================================================
   LỚP QUẢN LÝ PHIÊN LUYỆN TẬP
   ============================================================ */
class PracticeSession {
  constructor(options = {}) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host || 'localhost:8000';
    this.wsUrl          = options.wsUrl || `${protocol}//${host}/ws/luyen-not`;
    this.onFrameCb      = options.onFrame || (() => {});
    this.onEndCb        = options.onSessionEnd || (() => {});
    this.onStatusCb     = options.onStatusChange || (() => {});

    this.ws             = null;
    this.active         = false;
    this.targetNote     = 'Sol';
    this.fluteType      = 'C';
    this._retryCount    = 0;
    this._maxRetries    = 5;
    this._intentionalClose = false;
    this._awaitingClose = false;
    this._stopTimeout   = null;
    this._frameCount    = 0;
    this._scoreSum      = 0;
    this._scoreCount    = 0;
  }

  start(targetNote, fluteType = 'C') {
    if (this.active) this.stop();

    this.targetNote  = targetNote;
    this.fluteType   = fluteType;
    this.active      = true;
    this._retryCount = 0;
    this._intentionalClose = false;
    this._awaitingClose = false;
    clearTimeout(this._stopTimeout);
    this._scoreSum   = 0;
    this._scoreCount = 0;
    this._frameCount = 0;

    this._connect();
  }

  async _startMicrophoneStream() {
    return await window.hocsaoAudio.start();
  }

  _stopMicrophoneStream() {}

  setTargetNote(newNote) {
    this.targetNote = newNote;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({
          action: 'change_target',
          note: newNote,
          flute: this.fluteType,
        }));
      } catch (e) {
        console.warn('[WS] Không thể gửi change_target:', e);
      }
    }
  }

  stop() {
    if (!this.active && !this._awaitingClose) return;
    this._intentionalClose = true;
    this.active = false;
    this._awaitingClose = true;

    // Gửi tín hiệu stop lên Server để server tính toán toàn bộ session và trả về session_end
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ action: 'stop' }));
      } catch (e) {
        console.warn('[WS] Không thể gửi action stop:', e);
      }
    }

    // Đợi server phản hồi thông điệp session_end (fallback 2.5s phòng sự cố mạng)
    clearTimeout(this._stopTimeout);
    this._stopTimeout = setTimeout(() => {
      if (this.ws) {
        try { this.ws.close(1000, 'Stop timeout fallback'); } catch (e) {}
        this.ws = null;
      }
      this.onStatusCb('stopped');
    }, 2500);
  }

  get averageScore() {
    if (this._scoreCount > 0) {
      return Math.round((this._scoreSum / this._scoreCount) * 10) / 10;
    }
    return 0;
  }

  /* ── Kết nối WebSocket ── */

  _connect() {
    this.onStatusCb('connecting');

    try {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.binaryType = 'arraybuffer';
    } catch (e) {
      console.error('[WS] Không thể tạo WebSocket:', e);
      this._scheduleRetry();
      return;
    }

    this.ws.onopen = async () => {
      console.log('[WS] Kết nối WebSocket thành công');
      this._retryCount = 0;
      this.onStatusCb('connected');

      // Gửi lệnh START
      this.ws.send(JSON.stringify({
        action: 'start',
        note: this.targetNote,
        flute: this.fluteType,
        timestamp: Date.now(),
      }));
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this._handleMessage(data);
      } catch (e) {
        console.warn('[WS] Dữ liệu lạ:', event.data);
      }
    };

    this.ws.onerror = (err) => {
      console.error('[WS] Lỗi kết nối:', err);
    };

    this.ws.onclose = (event) => {
      console.log(`[WS] Đóng kết nối: mã code=${event.code}`);
      this.onStatusCb('disconnected');
      this._stopMicrophoneStream();

      if (!this._intentionalClose && this.active) {
        this._scheduleRetry();
      }
    };
  }

  _handleMessage(data) {
    if (data.type === 'frame') {
      this._frameCount++;
      const s = data.score?.total_score;
      if (s != null && typeof s === 'number') {
        this._scoreSum += s;
        this._scoreCount++;
      }
      this.onFrameCb(data, this._frameCount);

    } else if (data.type === 'session_end' || data.type === 'summary') {
      clearTimeout(this._stopTimeout);
      const serverSummary = data.summary || {};
      const officialAvg = (serverSummary.average_score != null) ? serverSummary.average_score : this.averageScore;
      const officialFrames = (serverSummary.total_frames != null) ? serverSummary.total_frames : this._frameCount;

      this.onEndCb({
        ...serverSummary,
        average_score: officialAvg,
        averageScore: officialAvg,
        total_frames: officialFrames,
        frameCount: officialFrames,
        duration: serverSummary.duration || 0,
        grade: serverSummary.grade || 'B',
      });
      this.active = false;
      this.onStatusCb('ended');

      if (this._awaitingClose && this.ws) {
        try { this.ws.close(1000, 'Session ended'); } catch (e) {}
        this.ws = null;
      }

    } else if (data.type === 'error') {
      console.error('[WS] Lỗi từ máy chủ:', data.message);
      showToast(data.message || 'Lỗi từ máy chủ', 'error');
    }
  }

  _scheduleRetry() {
    if (this._retryCount >= this._maxRetries) {
      showToast(`Không thể kết nối sau ${this._maxRetries} lần. Vui lòng kiểm tra server!`, 'error');
      this.active = false;
      this.onStatusCb('failed');
      return;
    }
    const delay = Math.min(1000 * Math.pow(2, this._retryCount), 15000);
    this._retryCount++;
    this.onStatusCb('reconnecting');
    setTimeout(() => {
      if (this.active && !this._intentionalClose) {
        this._connect();
      }
    }, delay);
  }
}

/* ============================================================
   BIỂU ĐỒ CAO ĐỘ THỜI GIAN THỰC (STUDIO OSCILLOSCOPE CANVAS)
   ============================================================ */
class PitchCanvas {
  constructor(canvas, windowSeconds = 5) {
    this.canvas   = canvas;
    this.ctx      = canvas.getContext('2d');
    this.window   = windowSeconds * 1000;
    this.history  = [];
    this._raf     = null;
    this._running = false;

    // Màu sắc cao cấp
    this.colTarget = '#58a6ff';
    this.colInTune = '#3fb950';
    this.colWarn   = '#d29922';
    this.colOff    = '#f78166';

    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr  = window.devicePixelRatio || 1;
    this.canvas.width  = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);
    this._w = rect.width;
    this._h = rect.height;
  }

  start() {
    this._running = true;
    this.history  = [];
    this._loop();
  }

  stop() {
    this._running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
  }

  addPoint(actualHz, targetHz, isSilent = false) {
    const now = Date.now();
    this.history.push({
      t: now,
      hz: isSilent ? 0 : actualHz,
      target: targetHz,
    });
    const cutoff = now - this.window;
    while (this.history.length > 0 && this.history[0].t < cutoff) {
      this.history.shift();
    }
  }

  _loop() {
    if (!this._running) return;
    this._draw();
    this._raf = requestAnimationFrame(() => this._loop());
  }

  _draw() {
    const { ctx, _w: w, _h: h } = this;
    if (!w || !h) return;

    ctx.clearRect(0, 0, w, h);

    // Nền tối phòng thu âm
    ctx.fillStyle = '#161b22';
    ctx.fillRect(0, 0, w, h);

    if (this.history.length < 2) {
      ctx.fillStyle = 'rgba(139,148,158,0.4)';
      ctx.font = '13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🎙️ Thổi vào microphone để thấy sóng âm thanh...', w / 2, h / 2);
      ctx.textAlign = 'left';
      return;
    }

    const now = Date.now();
    const oldest = now - this.window;

    const targetFreq = this.history[this.history.length - 1]?.target || 392;
    const minF = targetFreq * 0.75;
    const maxF = targetFreq * 1.35;

    const toX = (t) => ((t - oldest) / this.window) * w;
    const toY = (f) => f > 0 ? h - ((f - minF) / (maxF - minF)) * (h * 0.8) - h * 0.1 : null;

    // 1. Vẽ các đường lưới tần số (Studio Grid)
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      const y = (h / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // 2. Đường chuẩn mục tiêu (Target Line)
    const targetY = toY(targetFreq);
    if (targetY != null) {
      ctx.strokeStyle = 'rgba(88,166,255,0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(0, targetY);
      ctx.lineTo(w, targetY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Nhãn mục tiêu
      ctx.fillStyle = '#58a6ff';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(`Chuẩn: ${Math.round(targetFreq)} Hz`, 10, targetY - 6);
    }

    // 3. Đường cao độ thực tế của người dùng (Smooth Waveform)
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 1; i < this.history.length; i++) {
      const p1 = this.history[i - 1];
      const p2 = this.history[i];

      const x1 = toX(p1.t);
      const y1 = toY(p1.hz);
      const x2 = toX(p2.t);
      const y2 = toY(p2.hz);

      if (y1 == null || y2 == null) continue;

      // Đổi màu đường sóng theo độ lệch
      const diffCent = Math.abs(1200 * Math.log2(p2.hz / targetFreq));
      if (diffCent < 15) {
        ctx.strokeStyle = this.colInTune;
      } else if (diffCent < 35) {
        ctx.strokeStyle = this.colWarn;
      } else {
        ctx.strokeStyle = this.colOff;
      }

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }
}

/* ============================================================
   BỘ ĐIỀU KHIỂN THỔI THEO BÀI (FOLLOW-ALONG CONTROLLER: ĐỒ - RÊ - MI - ĐỒ)
   ============================================================ */
/* ============================================================
   BỘ ĐIỀU KHIỂN BÀI TẬP & GAME LUYỆN SÁO CHO NGƯỜI MỚI (SONG EXERCISE GAME)
   - Tích hợp bài sáo PDF "Lý Cây Đa" (59 nốt nhịp 2/4) & "Đồ Rê Mi Đồ"
   - Đếm nhịp Metronome trực quan, đếm ngược 3-2-1
   - Băng chuyền 5 nốt (Note Carousel) hiển thị lời ca & thế bấm mini
   - Nhận diện Microphone & thanh đo thời gian giữ nốt thời gian thực
   ============================================================ */
class SongExerciseGameController {
  constructor(practiceUI) {
    this.practiceUI = practiceUI;
    this.active = false;
    this.isPlayingDemo = false;
    this.currentStep = 0;
    this.holdMs = 0;
    this.targetHoldMs = 700; // Cần giữ nốt ổn định 0.7 giây
    this.score = 0;
    this.combo = 0;

    // Metronome 2/4
    this.metronomeInterval = null;
    this.metroStep = 0;

    // Kho bài tập
    this.exercises = {
      'ly_cay_da': {
        id: 'ly_cay_da',
        title: 'Lý Cây Đa (Dân Ca Quan Họ Bắc Bộ)',
        bpm: 90,
        meter: '2/4',
        notes: [
          // Ô 1 (Nhịp 2/4 - Phách 1: Lặng, Phách 2: Đô 1)
          { type: 'rest', note: 'Lặng', dur: 1.0, lyric: '𝄽', measure: 1, beat: 0.0 },
          { note: 'Đô',   dur: 1.0, lyric: 'Trèo', measure: 1, beat: 1.0 },

          // Ô 2
          { note: 'Rê',   dur: 1.0, lyric: 'lên',  measure: 2, beat: 2.0 },
          { note: 'Rê',   dur: 0.5, lyric: 'quán', measure: 2, beat: 3.0 },
          { note: 'Đô',   dur: 0.25, lyric: 'dốc', measure: 2, beat: 3.5 },
          { note: 'Rê',   dur: 0.25, lyric: 'ngồi', measure: 2, beat: 3.75 },

          // Ô 3
          { note: 'Mi',   dur: 1.0, lyric: 'gốc',  measure: 3, beat: 4.0, breath: true },
          { note: 'Rê',   dur: 0.5, lyric: 'cây',  measure: 3, beat: 5.0 },
          { note: 'Đô',   dur: 0.25, lyric: 'đa',  measure: 3, beat: 5.5 },
          { note: 'Rê',   dur: 0.25, lyric: 'rằng', measure: 3, beat: 5.75 },

          // Ô 4
          { note: 'Mi',   dur: 0.5, lyric: 'cây',  measure: 4, beat: 6.0 },
          { note: 'Rê',   dur: 0.5, lyric: 'đa',   measure: 4, beat: 6.5 },
          { note: 'Đô',   dur: 0.5, lyric: 'ơi',   measure: 4, beat: 7.0 },
          { note: 'Rê',   dur: 0.5, lyric: 'cây',  measure: 4, beat: 7.5 },

          // Ô 5
          { note: 'Đô',   dur: 0.5, lyric: 'đa',   measure: 5, beat: 8.0, breath: true },
          { note: 'Đô',   dur: 0.5, lyric: 'rằng', measure: 5, beat: 8.5 },
          { note: 'Rê',   dur: 0.5, lyric: 'tôi',  measure: 5, beat: 9.0 },
          { note: 'Đô',   dur: 0.25, lyric: 'lý',  measure: 5, beat: 9.5 },
          { note: 'Rê',   dur: 0.25, lyric: 'con', measure: 5, beat: 9.75 },

          // Ô 6
          { note: 'Mi',   dur: 0.5, lyric: 'cây',  measure: 6, beat: 10.0 },
          { note: 'Rê',   dur: 0.5, lyric: 'đa',   measure: 6, beat: 10.5 },
          { note: 'Đô',   dur: 0.5, lyric: 'rằng', measure: 6, beat: 11.0 },
          { note: 'Rê',   dur: 0.5, lyric: 'tôi',  measure: 6, beat: 11.5 },

          // Ô 7
          { note: 'Đô',   dur: 0.5, lyric: 'lới',  measure: 7, beat: 12.0, breath: true },
          { note: 'Đô',   dur: 0.5, lyric: 'con',  measure: 7, beat: 12.5 },
          { note: 'Rê',   dur: 0.5, lyric: 'cây',  measure: 7, beat: 13.0 },
          { note: 'Đô',   dur: 0.25, lyric: 'đa',  measure: 7, beat: 13.5 },
          { note: 'Rê',   dur: 0.25, lyric: 'ơi',  measure: 7, beat: 13.75 },

          // Ô 8
          { note: 'Mi',   dur: 0.5, lyric: 'thầy', measure: 8, beat: 14.0 },
          { note: 'Rê',   dur: 0.5, lyric: 'cây',  measure: 8, beat: 14.5 },
          { note: 'Đô',   dur: 0.5, lyric: 'đa',   measure: 8, beat: 15.0 },
          { note: 'Rê',   dur: 0.5, lyric: 'rằng', measure: 8, beat: 15.5 },

          // Ô 9 (Nốt trắng ngân dài 2 phách, nối sang Ô 10)
          { note: 'Đô',   dur: 2.0, lyric: 'tôi',  measure: 9, beat: 16.0, tieToNext: true },

          // Ô 10 (Nốt đen 1 phách nối từ Ô 9, lấy hơi)
          { note: 'Đô',   dur: 1.0, lyric: 'ơi',   measure: 10, beat: 18.0, tiedFromPrev: true, breath: true },
          { note: 'Đô',   dur: 0.5, lyric: 'ai',   measure: 10, beat: 19.0 },
          { note: 'Mi',   dur: 0.5, lyric: 'đem',  measure: 10, beat: 19.5 },

          // Ô 11
          { note: 'Rê',   dur: 0.5, lyric: 'a',    measure: 11, beat: 20.0 },
          { note: 'Rê',   dur: 0.5, lyric: 'lý',   measure: 11, beat: 20.5 },
          { note: 'Đô',   dur: 0.5, lyric: 'tình', measure: 11, beat: 21.0 },
          { note: 'Mi',   dur: 0.5, lyric: 'tính', measure: 11, beat: 21.5 },

          // Ô 12 (Nốt móc đơn chấm dôi 0.75 + móc kép 0.25 + luyến)
          { note: 'Rê',   dur: 0.75, lyric: 'tang', measure: 12, beat: 22.0, isDotted: true },
          { note: 'Đô',   dur: 0.25, lyric: 'tình', measure: 12, beat: 22.75 },
          { note: 'Sol',  dur: 0.5, lyric: 'tính', measure: 12, beat: 23.0 },
          { note: 'Sol',  dur: 0.5, lyric: 'tang', measure: 12, beat: 23.5, slurToNext: true },

          // Ô 13 (Nốt Đô 1 luyến từ Sol Ô 12, vọt lên Đô 2)
          { note: 'Đô',   dur: 0.5, lyric: 'cho',  measure: 13, beat: 24.0, slurredFromPrev: true, breath: true },
          { note: 'Đô 2', dur: 0.5, lyric: 'đứng', measure: 13, beat: 24.5 },
          { note: 'Sol',  dur: 0.5, lyric: 'ở',    measure: 13, beat: 25.0 },
          { note: 'Sol',  dur: 0.5, lyric: 'đấy',  measure: 13, beat: 25.5 },

          // Ô 14 (Nốt đen chấm dôi 1.5 phách)
          { note: 'Sol',  dur: 1.5, lyric: 'trông', measure: 14, beat: 26.0, isDotted: true, breath: true },
          { note: 'Đô 2', dur: 0.5, lyric: 'cho',  measure: 14, beat: 27.5 },

          // Ô 15 (Móc đơn chấm dôi 0.75 + móc kép 0.25)
          { note: 'Sol',  dur: 0.75, lyric: 'đứng', measure: 15, beat: 28.0, isDotted: true },
          { note: 'Đô 2', dur: 0.25, lyric: 'ở',    measure: 15, beat: 28.75 },
          { note: 'La',   dur: 0.5, lyric: 'đấy',  measure: 15, beat: 29.0 },
          { note: 'Sol',  dur: 0.5, lyric: 'trông', measure: 15, beat: 29.5 },

          // Ô 16
          { note: 'Fa',   dur: 0.5, lyric: 'khen', measure: 16, beat: 30.0 },
          { note: 'Fa',   dur: 0.5, lyric: 'ai',   measure: 16, beat: 30.5 },
          { note: 'La',   dur: 0.5, lyric: 'đẽo',  measure: 16, beat: 31.0 },
          { note: 'Sol',  dur: 0.25, lyric: 'khéo', measure: 16, beat: 31.5 },
          { note: 'La',   dur: 0.25, lyric: 'lại',  measure: 16, beat: 31.75 },

          // Ô 17
          { note: 'Đô 2', dur: 0.5, lyric: 'vá',   measure: 17, beat: 32.0 },
          { note: 'La',   dur: 0.5, lyric: 'khéo', measure: 17, beat: 32.5 },
          { note: 'Sol',  dur: 0.5, lyric: 'may',  measure: 17, beat: 33.0 },
          { note: 'La',   dur: 0.5, lyric: 'rằng', measure: 17, beat: 33.5 },

          // Ô 18
          { note: 'Sol',  dur: 0.5, lyric: 'tôi',  measure: 18, beat: 34.0, breath: true },
          { note: 'Sol',  dur: 0.5, lyric: 'khen', measure: 18, beat: 34.5 },
          { note: 'La',   dur: 0.5, lyric: 'ai',   measure: 18, beat: 35.0 },
          { note: 'Sol',  dur: 0.25, lyric: 'đẽo', measure: 18, beat: 35.5 },
          { note: 'La',   dur: 0.25, lyric: 'khéo', measure: 18, beat: 35.75 },

          // Ô 19
          { note: 'Đô 2', dur: 0.5, lyric: 'vá',   measure: 19, beat: 36.0 },
          { note: 'La',   dur: 0.5, lyric: 'khéo', measure: 19, beat: 36.5 },
          { note: 'Sol',  dur: 0.5, lyric: 'may',  measure: 19, beat: 37.0 },
          { note: 'La',   dur: 0.5, lyric: 'rằng', measure: 19, beat: 37.5 },

          // Ô 20 (Nốt Sol trắng 2 phách nối sang Ô 21)
          { note: 'Sol',  dur: 2.0, lyric: 'tôi',  measure: 20, beat: 38.0, tieToNext: true },

          // Ô 21 (Nốt Sol đen 1 phách nối từ Ô 20 + Dấu lặng đen 1 phách kết thúc bài)
          { note: 'Sol',  dur: 1.0, lyric: 'ơi',   measure: 21, beat: 40.0, tiedFromPrev: true },
          { type: 'rest', note: 'Lặng', dur: 1.0, lyric: '𝄽', measure: 21, beat: 41.0 }
        ]
      },
      'doremi': {
        id: 'doremi',
        title: 'Đồ Rê Mi Đồ (Giai Điệu Vỡ Lòng)',
        bpm: 76,
        meter: '4/4',
        notes: [
          { note: 'Đô', dur: 1.0, lyric: 'Kìa' },
          { note: 'Rê', dur: 1.0, lyric: 'con' },
          { note: 'Mi', dur: 1.0, lyric: 'bướm' },
          { note: 'Đô', dur: 1.2, lyric: 'vàng' }
        ]
      },
      'ngu_cung': {
        id: 'ngu_cung',
        title: '5 Nốt Ngũ Cung Bắc Bộ',
        bpm: 80,
        meter: '2/4',
        notes: [
          { note: 'Đô',  dur: 1.0, lyric: 'Đô 1' },
          { note: 'Rê',  dur: 1.0, lyric: 'Rê 1' },
          { note: 'Mi',  dur: 1.0, lyric: 'Mi 1' },
          { note: 'Sol', dur: 1.0, lyric: 'Sol 1' },
          { note: 'La',  dur: 1.2, lyric: 'La 1' }
        ]
      }
    };

    this.currentExerciseKey = 'ly_cay_da';
    this.currentSong = this.exercises[this.currentExerciseKey];

    this._bindDOM();
    this.renderCarousel();
  }

  _bindDOM() {
    this.selExercise   = document.getElementById('practice-exercise-select');
    this.btnStart      = document.getElementById('btn-song-start-play');
    this.btnDemo       = document.getElementById('btn-song-demo-play');
    this.btnSkip       = document.getElementById('btn-song-skip-note');
    this.btnRestart    = document.getElementById('btn-song-restart');
    this.carouselEl    = document.getElementById('note-highway-carousel');
    this.promptEl      = document.getElementById('song-instruction-prompt');
    this.holdCounterEl = document.getElementById('song-hold-counter');
    this.progressFill  = document.getElementById('song-hold-progress-fill');
    this.progressText  = document.getElementById('song-progress-text');
    this.scoreEl       = document.getElementById('song-game-score');
    this.comboEl       = document.getElementById('song-game-combo');
    this.countdownEl   = document.getElementById('countdown-overlay');
    this.countdownNum  = document.getElementById('countdown-number');
    this.metroDot1     = document.getElementById('metro-dot-1');
    this.metroDot2     = document.getElementById('metro-dot-2');

    if (this.selExercise) {
      this.selExercise.addEventListener('change', (e) => {
        this.selectExercise(e.target.value);
      });
    }

    if (this.btnStart) {
      this.btnStart.addEventListener('click', () => this.togglePlay());
    }

    if (this.btnDemo) {
      this.btnDemo.addEventListener('click', () => this.playDemo());
    }

    if (this.btnSkip) {
      this.btnSkip.addEventListener('click', () => {
        if (!this.active) return;
        this.goToStep(this.currentStep + 1);
        showToast('Đã bỏ qua nốt!', 'info', 1000);
      });
    }

    if (this.btnRestart) {
      this.btnRestart.addEventListener('click', () => {
        this.restart();
      });
    }
  }

  selectExercise(key) {
    if (!this.exercises[key]) key = 'ly_cay_da';
    this.currentExerciseKey = key;
    this.currentSong = this.exercises[key];
    this.currentStep = 0;
    this.holdMs = 0;
    this.score = 0;
    this.combo = 0;
    this._updateScoreUI();
    this.renderCarousel();

    const tempoBadge = document.getElementById('song-tempo-badge');
    if (tempoBadge) {
      tempoBadge.textContent = `Nhịp ${this.currentSong.meter} · ${this.currentSong.bpm} BPM`;
    }
    const metroBpm = document.getElementById('metro-bpm-text');
    if (metroBpm) {
      metroBpm.textContent = `${this.currentSong.bpm} BPM`;
    }
    if (this.progressText) {
      this.progressText.textContent = `0 / ${this.currentSong.notes.length} nốt`;
    }
  }

  startMetronome() {
    this.stopMetronome();
    const intervalMs = Math.round((60 / (this.currentSong.bpm || 90)) * 1000);
    this.metroStep = 0;
    this.metronomeInterval = setInterval(() => {
      this.metroStep = (this.metroStep + 1) % 2;
      if (this.metroDot1 && this.metroDot2) {
        if (this.metroStep === 1) {
          this.metroDot1.className = 'metronome-dot beat-1';
          this.metroDot2.className = 'metronome-dot';
        } else {
          this.metroDot1.className = 'metronome-dot';
          this.metroDot2.className = 'metronome-dot beat-2';
        }
      }
    }, intervalMs);
  }

  stopMetronome() {
    if (this.metronomeInterval) {
      clearInterval(this.metronomeInterval);
      this.metronomeInterval = null;
    }
    if (this.metroDot1) this.metroDot1.className = 'metronome-dot';
    if (this.metroDot2) this.metroDot2.className = 'metronome-dot';
  }

  async togglePlay() {
    if (this.active) {
      this.stop();
    } else {
      await this.start();
    }
  }

  async start() {
    if (this.isPlayingDemo) {
      bambooFluteEngine.stopSequence();
      this.isPlayingDemo = false;
      if (this.btnDemo) this.btnDemo.textContent = '🎧 Nghe mẫu sáo cả bài';
    }

    // Đảm bảo micro đã bật
    if (this.practiceUI && (!this.practiceUI.session || !this.practiceUI.session.active)) {
      this.practiceUI.handleStart();
    }

    // Đếm ngược 3... 2... 1...
    if (this.countdownEl && this.countdownNum) {
      this.countdownEl.style.display = 'block';
      if (this.carouselEl) this.carouselEl.style.display = 'none';

      for (let n = 3; n >= 1; n--) {
        this.countdownNum.textContent = n;
        bambooFluteEngine.playNote(440, 0.12, { volume: 0.3, synthOnly: true });
        await new Promise(r => setTimeout(r, 700));
      }
      this.countdownNum.textContent = 'THỔI!';
      bambooFluteEngine.playNote(880, 0.25, { volume: 0.4, synthOnly: true });
      await new Promise(r => setTimeout(r, 400));
      this.countdownEl.style.display = 'none';
      if (this.carouselEl) this.carouselEl.style.display = 'flex';
    }

    this.active = true;
    this.currentStep = 0;
    this.holdMs = 0;
    this.score = 0;
    this.combo = 0;
    this._updateScoreUI();
    this.startMetronome();

    if (this.btnStart) {
      this.btnStart.textContent = '⏹ Dừng Luyện Bài';
      this.btnStart.style.background = '#e53e3e';
    }

    this.goToStep(0);
    showToast(`🎵 Bắt đầu luyện bài: ${this.currentSong.title}`, 'success', 2500);
  }

  stop() {
    this.active = false;
    this.holdMs = 0;
    clearTimeout(this._restTimer);
    this.stopMetronome();
    this._updateHoldUI(0);

    if (this.btnStart) {
      this.btnStart.textContent = '▶ Bắt Đầu Luyện Bài';
      this.btnStart.style.background = 'var(--accent)';
    }

    if (this.promptEl) {
      this.promptEl.textContent = '👉 Bấm "Bắt Đầu Luyện Bài" để bắt đầu thử thách!';
    }
  }

  restart() {
    this.stop();
    this.selectExercise(this.currentExerciseKey);
    this.start();
  }

  goToStep(stepIdx) {
    if (!this.currentSong || !this.currentSong.notes) return;
    if (stepIdx >= this.currentSong.notes.length) {
      this.onSongComplete();
      return;
    }

    this.currentStep = stepIdx;
    this.holdMs = 0;
    const noteItem = this.currentSong.notes[stepIdx];

    this._updateHoldUI(0);
    this.renderCarousel();

    if (this.progressText) {
      this.progressText.textContent = `${stepIdx + 1} / ${this.currentSong.notes.length} nốt`;
    }

    // XỬ LÝ NỐT LẶNG: Nghỉ phách theo đúng nhịp điệu, tự động chuyển nốt tiếp theo
    if (noteItem.type === 'rest' || noteItem.note === 'Lặng') {
      if (this.promptEl) {
        this.promptEl.textContent = `Ô ${noteItem.measure || ''}: 𝄽 DẤU LẶNG ĐEN — Nghỉ lấy hơi ${noteItem.dur} phách...`;
        this.promptEl.style.color = '#e6a23c';
      }
      clearTimeout(this._restTimer);
      const restMs = (noteItem.dur || 1.0) * (60 / (this.currentSong.bpm || 90)) * 1000;
      this._restTimer = setTimeout(() => {
        if (this.active && this.currentStep === stepIdx) {
          this.goToStep(stepIdx + 1);
        }
      }, restMs);
      return;
    }

    if (this.promptEl) {
      this.promptEl.textContent = `Ô ${noteItem.measure || ''} (Nốt ${stepIdx + 1}/${this.currentSong.notes.length}): Thổi nốt "${noteItem.note}" (Lời: "${noteItem.lyric}")`;
      this.promptEl.style.color = '#fff';
    }

    // Cập nhật thế bấm trên cây sáo mô phỏng lớn
    window.selectedNote = noteItem.note;
    updateFingeringGuide(noteItem.note);

    if (this.practiceUI && this.practiceUI.session && this.practiceUI.session.active) {
      this.practiceUI.session.setTargetNote(noteItem.note);
    }
  }

  renderCarousel() {
    if (!this.carouselEl || !this.currentSong) return;
    const notes = this.currentSong.notes || [];
    const idx = this.currentStep;

    let html = '';
    for (let offset = -2; offset <= 2; offset++) {
      const i = idx + offset;
      if (i < 0 || i >= notes.length) {
        html += `<div style="width: 72px; opacity: 0; pointer-events: none;"></div>`;
        continue;
      }
      const item = notes[i];
      const isCurrent = (offset === 0);
      const isPassed = (offset < 0);

      // Sơ đồ thế bấm mini 6 lỗ thu nhỏ
      const fingering = FINGERINGS[item.note] || [true, true, true, true, true, true];
      const dotsHtml = fingering.map(closed => 
        `<span style="width: 7px; height: 7px; border-radius: 50%; display: inline-block; background: ${closed ? '#f78166' : '#21262d'}; border: 1px solid ${closed ? '#ffa28b' : '#484f58'};"></span>`
      ).join('');

      if (isCurrent) {
        if (item.type === 'rest' || item.note === 'Lặng') {
          html += `
            <div class="song-flow-badge current" style="border: 2px solid #e6a23c; background: rgba(230, 162, 60, 0.18); padding: 10px 14px; border-radius: 12px; min-width: 95px; transform: scale(1.12); box-shadow: 0 0 20px rgba(230, 162, 60, 0.45); text-align: center;">
              <div style="font-size: 0.65rem; color: #e6a23c; text-transform: uppercase; font-weight: 800;">𝄽 NGHỈ PHÁCH 𝄽</div>
              <div style="font-size: 1.5rem; font-weight: 900; color: #ffd700; margin: 2px 0;">𝄽 Lặng</div>
              <div style="font-size: 0.85rem; color: #e6a23c; font-weight: 700;">${item.dur} phách</div>
              <div style="font-size: 0.72rem; color: #c9d1d9; margin-top: 5px;">Nghỉ lấy hơi</div>
            </div>
          `;
        } else {
          html += `
            <div class="song-flow-badge current" style="border: 2px solid #ffd700; background: rgba(255, 215, 0, 0.14); padding: 10px 14px; border-radius: 12px; min-width: 95px; transform: scale(1.12); box-shadow: 0 0 20px rgba(255, 215, 0, 0.45); text-align: center;">
              <div style="font-size: 0.65rem; color: #ffd700; text-transform: uppercase; font-weight: 800;">● ĐANG THỔI ●</div>
              <div style="font-size: 1.5rem; font-weight: 900; color: #fff; margin: 2px 0;">${item.note}</div>
              <div style="font-size: 0.85rem; color: #7ee787; font-weight: 700;">"${item.lyric}"</div>
              <div style="display: flex; gap: 3px; justify-content: center; margin-top: 5px;">${dotsHtml}</div>
            </div>
          `;
        }
      } else if (isPassed) {
        html += `
          <div class="song-flow-badge passed" style="opacity: 0.6; min-width: 68px; text-align: center; padding: 6px 10px; border-radius: 8px; background: rgba(63, 185, 80, 0.1);">
            <div style="font-size: 0.68rem; color: #3fb950; font-weight: 700;">✔ Xong</div>
            <div style="font-size: 1.1rem; font-weight: 800; color: #c9d1d9;">${item.note}</div>
            <div style="font-size: 0.72rem; color: var(--text-sec);">${item.lyric}</div>
          </div>
        `;
      } else {
        html += `
          <div class="song-flow-badge upcoming" style="opacity: 0.65; min-width: 68px; text-align: center; padding: 6px 10px; border-radius: 8px; background: var(--surface2);">
            <div style="font-size: 0.65rem; color: var(--text-sec);">Sắp tới</div>
            <div style="font-size: 1.1rem; font-weight: 800; color: #c9d1d9;">${item.note}</div>
            <div style="font-size: 0.72rem; color: var(--text-sec);">${item.lyric}</div>
          </div>
        `;
      }
    }

    this.carouselEl.innerHTML = html;
  }

  _updateHoldUI(ratio) {
    if (this.progressFill) {
      this.progressFill.style.width = `${Math.min(100, Math.round(ratio * 100))}%`;
    }
    if (this.holdCounterEl) {
      const currSec = (this.holdMs / 1000).toFixed(1);
      const targetSec = (this.targetHoldMs / 1000).toFixed(1);
      this.holdCounterEl.textContent = `${currSec}s / ${targetSec}s`;
    }
  }

  _updateScoreUI() {
    if (this.scoreEl) this.scoreEl.textContent = this.score;
    if (this.comboEl) this.comboEl.textContent = `x${this.combo}`;
  }

  onFrame(data) {
    if (!this.active || this.isPlayingDemo) return;

    const currentNoteItem = this.currentSong.notes[this.currentStep];
    if (!currentNoteItem || currentNoteItem.type === 'rest' || currentNoteItem.note === 'Lặng') return;

    if (!data.pitch || data.pitch.is_silent) {
      if (this.holdMs > 0) {
        this.holdMs = Math.max(0, this.holdMs - 40);
        this._updateHoldUI(this.holdMs / this.targetHoldMs);
      }
      return;
    }

    const { note_viet, octave, hz, cent_offset, isSimulated } = data.pitch;
    const isTarget = isMatchingFluteNote(note_viet, octave, hz, currentNoteItem.note);
    const isInTune = Math.abs(cent_offset) <= 45 || isSimulated;

    if (isTarget && isInTune) {
      this.holdMs += isSimulated ? this.targetHoldMs : 90;
      const progress = Math.min(1.0, this.holdMs / this.targetHoldMs);
      this._updateHoldUI(progress);

      if (this.promptEl) {
        this.promptEl.textContent = `🎯 ĐÚNG NỐT! Giữ hơi thêm một chút... (${Math.round(progress * 100)}%)`;
        this.promptEl.style.color = '#7ee787';
      }

      if (this.holdMs >= this.targetHoldMs) {
        bambooFluteEngine.playChime('step');
        this.score += 100;
        this.combo += 1;
        this._updateScoreUI();
        this.goToStep(this.currentStep + 1);
      }
    } else {
      if (this.holdMs > 0) {
        this.holdMs = Math.max(0, this.holdMs - 35);
        this._updateHoldUI(this.holdMs / this.targetHoldMs);
      }
      if (this.promptEl && !isTarget) {
        this.promptEl.textContent = `Bạn đang thổi "${note_viet || '?'}", cần nốt "${currentNoteItem.note}" (${currentNoteItem.lyric})`;
        this.promptEl.style.color = '#fca5a5';
      }
    }
  }

  onSongComplete() {
    this.stop();
    bambooFluteEngine.playVictoryMelody();
    showToast(`🎉 CHÚC MỪNG! Bạn đã hoàn thành bài ${this.currentSong.title}! Điểm: ${this.score}`, 'success', 5000);
    
    // Mở modal vinh danh
    const modalVic = document.getElementById('game-victory-modal');
    if (modalVic) {
      const songTitleEl = document.getElementById('victory-song-title');
      const scoreEl = document.getElementById('victory-final-score');
      const comboEl = document.getElementById('victory-max-combo');
      const rankEl = document.getElementById('victory-rank');
      if (songTitleEl) songTitleEl.textContent = this.currentSong.title;
      if (scoreEl) scoreEl.textContent = this.score;
      if (comboEl) comboEl.textContent = `x${this.combo}`;
      if (rankEl) rankEl.textContent = this.score >= 5000 ? 'S' : (this.score >= 3000 ? 'A' : 'B');
      modalVic.style.display = 'flex';
      modalVic.classList.add('open');
    }
  }

  async playDemo() {
    if (this.isPlayingDemo) {
      bambooFluteEngine.stopSequence();
      this.isPlayingDemo = false;
      if (this.btnDemo) this.btnDemo.textContent = '🎧 Nghe mẫu sáo cả bài';
      return;
    }

    if (this.active) this.stop();

    this.isPlayingDemo = true;
    if (this.btnDemo) this.btnDemo.textContent = '⏹ Dừng nghe mẫu';
    showToast(`🎧 Đang phát mẫu sáo thật bài "${this.currentSong.title}"...`, 'info', 3000);

    await bambooFluteEngine.playMelodySequence(
      this.currentSong.notes,
      (idx, item) => {
        if (idx >= 0 && item) {
          this.currentStep = idx;
          this.renderCarousel();
          updateFingeringGuide(item.note);
          if (this.promptEl) {
            this.promptEl.textContent = `Mẫu sáo thật: ${item.note} ("${item.lyric}")`;
            this.promptEl.style.color = '#58a6ff';
          }
        } else {
          this.currentStep = 0;
          this.renderCarousel();
          if (this.promptEl) {
            this.promptEl.textContent = '👉 Bấm "Bắt Đầu Luyện Bài" để bắt đầu thử thách!';
            this.promptEl.style.color = '#fff';
          }
        }
      },
      () => {
        this.isPlayingDemo = false;
        if (this.btnDemo) this.btnDemo.textContent = '🎧 Nghe mẫu sáo cả bài';
      }
    );
  }
}
window.SongExerciseGameController = SongExerciseGameController;
window.FollowAlongController = SongExerciseGameController;


class PracticeUI {
  constructor() {
    this.noteNameEl      = document.getElementById('note-name');
    this.noteOctaveEl    = document.getElementById('note-octave');
    this.noteWestEl      = document.getElementById('note-west');
    this.noteStatusEl    = document.getElementById('note-status');
    this.centNeedle      = document.querySelector('.cent-needle');
    this.centFill        = document.querySelector('.cent-fill');
    this.tunerLed        = document.getElementById('tuner-center-led');
    this.arrowUp         = document.getElementById('pitch-arrow-up');
    this.arrowDown       = document.getElementById('pitch-arrow-down');

    this.scoreRingFill   = document.getElementById('ring-fill');
    this.scoreValueEl    = document.getElementById('ring-score-val');
    this.scoreGradeEl    = document.getElementById('ring-score-grade');
    this.breathBarEl     = document.querySelector('.breath-bar');
    this.breathSteamEl   = document.getElementById('flute-breath-smoke');
    this.feedbackPanel   = document.querySelector('.feedback-panel');

    this.statDuration    = document.getElementById('stat-duration');
    this.statAvgScore    = document.getElementById('stat-avg-score');
    this.startBtn        = document.getElementById('btn-start');
    this.stopBtn         = document.getElementById('btn-stop');
    this.fluteSelect     = document.getElementById('flute-type-select');
    this.timerDisplay    = document.getElementById('timer-display');
    this.statusDot       = document.getElementById('status-dot');
    this.statusLabel     = document.getElementById('status-label');

    this._ringR = 44;
    this._ringC = 2 * Math.PI * this._ringR;
    if (this.scoreRingFill) {
      this.scoreRingFill.style.strokeDasharray  = this._ringC;
      this.scoreRingFill.style.strokeDashoffset = this._ringC;
    }

    this.session      = null;
    this.timerInterval = null;
    this.startTime    = null;
    this.pitchCanvas  = null;
    this._totalScore  = 0;
    this._frameCount  = 0;
    this._currentCent = 0;
    this._targetCent  = 0;

    this._initCanvas();
    this._bindEvents();
    this.dialTuner = (typeof PrecisionDialTuner !== 'undefined' && document.getElementById('dialTunerCanvas')) 
      ? new PrecisionDialTuner('dialTunerCanvas') 
      : null;
    window.dialTuner = this.dialTuner;
    this.followAlong  = new FollowAlongController(this);
    this._setStatus('idle');
    this._startNeedlePhysicsLoop();
  }

  _initCanvas() {
    const canvasEl = document.getElementById('pitchCanvas');
    if (canvasEl) {
      this.pitchCanvas = new PitchCanvas(canvasEl, 5);
    }
  }

  _bindEvents() {
    if (this.startBtn) this.startBtn.addEventListener('click', () => this.handleStart());
    if (this.stopBtn)  this.stopBtn.addEventListener('click', () => this.handleStop());

    const btnToggleMic = document.getElementById('btn-toggle-mic-quick');
    if (btnToggleMic) {
      btnToggleMic.addEventListener('click', async () => {
        if (window.hocsaoAudio && window.hocsaoAudio.isRecording) {
          window.hocsaoAudio.stop();
          showToast('Đã tắt Microphone', 'info', 2000);
        } else if (window.hocsaoAudio) {
          const ok = await window.hocsaoAudio.start();
          if (ok) showToast('Microphone đã bật! Hãy thổi sáo hoặc phát âm thử 🎵', 'success', 3000);
        }
      });
    }

    const gainSlider = document.getElementById('mic-gain-slider');
    const gainVal = document.getElementById('mic-gain-val');
    if (gainSlider) {
      const saved = localStorage.getItem('hocsao_mic_gain') || '1.6';
      gainSlider.value = saved;
      if (gainVal) gainVal.textContent = `${saved}x`;
      gainSlider.addEventListener('input', (e) => {
        const v = parseFloat(e.target.value).toFixed(1);
        if (gainVal) gainVal.textContent = `${v}x`;
        if (window.hocsaoAudio) window.hocsaoAudio.setGain(v);
      });
    }
  }

  /* ── Quán tính kim đo Tuner mềm mại & Tiết kiệm CPU ── */
  _startNeedlePhysicsLoop() {
    let lastRendered = 0;
    const update = () => {
      this._currentCent += (this._targetCent - this._currentCent) * 0.22;
      if (Math.abs(this._currentCent - lastRendered) > 0.05) {
        lastRendered = this._currentCent;
        this._renderCentNeedle(this._currentCent);
      }
      requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  _renderCentNeedle(cent) {
    const clamped = Math.max(-50, Math.min(50, cent));
    const pct = ((clamped + 50) / 100) * 100; // 0 - 100%

    if (this.centNeedle) {
      this.centNeedle.style.left = `${pct}%`;
    }

    if (this.centFill) {
      const halfW = (Math.abs(clamped) / 50) * 50;
      if (clamped >= 0) {
        this.centFill.style.left  = '50%';
        this.centFill.style.width = `${halfW}%`;
      } else {
        this.centFill.style.left  = `${50 - halfW}%`;
        this.centFill.style.width = `${halfW}%`;
      }
    }

    // Đèn LED Tuner trung tâm
    const isPerfect = Math.abs(clamped) < 12;
    if (this.tunerLed) {
      this.tunerLed.className = isPerfect ? 'tuner-led active' : 'tuner-led';
    }

    // Mũi tên chỉ dẫn hướng hơi
    if (this.arrowUp && this.arrowDown) {
      if (clamped < -15) {
        this.arrowUp.classList.add('pulse');
        this.arrowDown.classList.remove('pulse');
      } else if (clamped > 15) {
        this.arrowDown.classList.add('pulse');
        this.arrowUp.classList.remove('pulse');
      } else {
        this.arrowUp.classList.remove('pulse');
        this.arrowDown.classList.remove('pulse');
      }
    }
  }

  /* ── Bắt đầu / Dừng ── */

  async handleStart() {
    const targetNote = window.selectedNote || 'Sol';
    const fluteType  = this.fluteSelect?.value || 'C';

    // 1. Phản hồi giao diện NGAY LẬP TỨC 100% (Zero latency, không đợi mic hay mạng)
    this._setUIActive(true);
    this._startTimer();
    this._setStatus('connecting');

    // 2. Khởi tạo session nếu chưa có
    if (!this.session) {
      this.session = new PracticeSession({
        onFrame:        (data, n) => this.onFrame(data, n),
        onSessionEnd:   (summary) => this.onSessionEnd(summary),
        onStatusChange: (status)  => this._setStatus(status),
      });
    }

    // 3. Khởi chạy PracticeSession kết nối WebSocket backend
    try {
      this.session.start(targetNote, fluteType);
    } catch (errWs) {
      console.warn('Practice session WS connect warning:', errWs);
    }

    // 4. Khởi chạy đồ thị cao độ canvas
    if (this.pitchCanvas) {
      this.pitchCanvas.start();
    }

    // 5. Thử bật microphone hệ thống (Timeout 2.5s nếu trình duyệt đang chờ user cấp quyền)
    let micOk = false;
    try {
      if (window.hocsaoAudio) {
        micOk = await Promise.race([
          window.hocsaoAudio.start(),
          new Promise(resolve => setTimeout(() => resolve(false), 2500))
        ]);
      }
    } catch (errMic) {
      console.warn('Microphone start error:', errMic);
      micOk = false;
    }

    const banner = document.getElementById('mic-permission-banner');
    if (!micOk) {
      // Micro bị chặn quyền hoặc máy chưa có micro
      // TUYỆT ĐỐI KHÔNG RETURN: Luôn giữ session chạy và kích hoạt phím 1-8
      if (banner) {
        if (!banner.innerHTML || banner.innerHTML.trim() === '') {
          banner.innerHTML = `
            <div style="display: flex; gap: 12px; align-items: flex-start;">
              <span style="font-size: 1.5rem;">🎙️</span>
              <div style="flex: 1;">
                <b style="color: #fca5a5; font-size: 1rem;">CHƯA CÓ TÍN HIỆU MICROPHONE — ĐÃ BẬT CHẾ ĐỘ BÀN PHÍM</b>
                <div style="margin-top: 6px; font-size: 0.85rem; line-height: 1.5; color: #cbd5e1;">
                  • <b>Bạn vẫn luyện tập & chơi game bình thường:</b> Bấm phím số <b>1 đến 8</b> trên bàn phím (hoặc phím số Numpad) tương ứng 8 nốt sáo (Đô, Rê, Mi, Fa, Sol, La, Si, Đô 2).<br>
                  • <b>Để thổi bằng sáo thật:</b> Bấm vào biểu tượng <b>Ổ khóa 🔒</b> cạnh địa chỉ web trên trình duyệt ➔ Cho phép (Allow) <b>Microphone</b> ➔ F5 lại trang.
                </div>
              </div>
            </div>
          `;
        }
        banner.style.display = 'block';
        banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      this._setStatus('active');
      showToast('⚠️ Chưa nhận được Mic. Đã bật CHẾ ĐỘ PHÍM (Bấm 1-8 trên bàn phím để thổi nốt sáo)!', 'info', 6000);
    } else {
      if (banner) banner.style.display = 'none';
      this._setStatus('connected');
      showToast(`Bắt đầu luyện nốt ${targetNote}! Hãy thổi vào microphone 🎵`, 'success', 3500);
    }
  }

  handleStop() {
    if (this.session) {
      this.session.stop();
      // Không gán this.session = null ngay để chờ gói tin session_end từ WebSocket về
    }
    if (this.followAlong && this.followAlong.active) {
      this.followAlong.holdMs = 0;
      this.followAlong._updateHoldUI(0);
    }
    this._stopTimer();
    if (this.pitchCanvas) this.pitchCanvas.stop();
    if (this.dialTuner) this.dialTuner.setSilent();
    this._setUIActive(false);
    this._setStatus('idle');
    this._targetCent = 0;
  }

  /* Cập nhật hiển thị kim đo cao độ trực quan khi chưa bắt đầu phiên chấm điểm */
  _updatePitchDisplayOnly(pitch) {
    if (this.dialTuner) {
      if (!pitch || pitch.is_silent) {
        this.dialTuner.setSilent();
      } else {
        this.dialTuner.update(pitch);
      }
    }
    if (!pitch || pitch.is_silent) {
      this._targetCent = 0;
      this._setNoteDisplay('—', '', 'Chưa có âm', '🎵 Hãy thổi vào sáo...', 'silent');
      if (this.breathSteamEl) this.breathSteamEl.classList.remove('active');
      return;
    }
    const targetNote = window.selectedNote || 'Sol';
    const isTarget = isMatchingFluteNote(pitch.note_viet, pitch.octave, pitch.hz, targetNote);
    this._targetCent = isTarget ? pitch.cent_offset : (pitch.cent_offset > 0 ? 48 : -48);
    const statusText = this._getPitchStatus(pitch.cent_offset, pitch.note_viet, targetNote, pitch.octave, pitch.hz);
    const cssClass   = this._getPitchClass(pitch.cent_offset, pitch.note_viet, targetNote, pitch.octave, pitch.hz);
    this._setNoteDisplay(pitch.note_viet, pitch.octave, `(${pitch.note_western || ''}${pitch.octave || ''})`, statusText, cssClass);
    if (this.pitchCanvas && pitch.hz > 0) {
      this.pitchCanvas.addPoint(pitch.hz, this._getTargetHz(pitch.hz), false);
    }
  }

  _startTimer() {
    this.startTime = Date.now();
    this.timerInterval = setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - this.startTime) / 1000);
      const m = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
      const s = String(elapsedSec % 60).padStart(2, '0');
      if (this.timerDisplay) this.timerDisplay.textContent = `${m}:${s}`;
      if (this.statDuration) this.statDuration.textContent = `${m}:${s}`;
    }, 500);
  }

  _stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /* ── Xử lý từng khung dữ liệu (onFrame) ── */

  onFrame(data, n) {
    this._frameCount = n;

    // Chuyển tiếp luồng âm thanh cho Game Thổi Sáo (Flute Highway Game)
    if (window.fluteGame && typeof window.fluteGame.onAudioFrame === 'function') {
      window.fluteGame.onAudioFrame(data.pitch);
    }

    // Thu thập mẫu tần số khi đang dò tone sáo tự động
    if (window.fluteToneDetector && window.fluteToneDetector.active && data.pitch && !data.pitch.is_silent && data.pitch.hz > 0) {
      window.fluteToneDetector.addSample(data.pitch.hz);
    }

    // Cập nhật chế độ thổi theo bài (Đồ - Rê - Mi - Đồ)
    if (this.followAlong) {
      this.followAlong.onFrame(data);
    }

    // 1. Cập nhật cao độ & Đồng hồ Precision Dial Tuner
    if (data.pitch) {
      if (this.dialTuner) {
        if (data.pitch.is_silent) {
          this.dialTuner.setSilent();
        } else {
          this.dialTuner.update(data.pitch);
        }
      }
      const { note_viet, octave, cent_offset, hz, is_silent } = data.pitch;
      const targetNote = window.selectedNote || 'Sol';

      if (is_silent) {
        this._targetCent = 0;
        this._setNoteDisplay('—', '', 'Chưa có âm', '🎵 Hãy thổi vào sáo...', 'silent');
        if (this.breathSteamEl) this.breathSteamEl.classList.remove('active');
        if (this.pitchCanvas) this.pitchCanvas.addPoint(0, this._getTargetHz(), true);
      } else {
        const isTarget = isMatchingFluteNote(note_viet, octave, hz, targetNote);
        this._targetCent = isTarget ? cent_offset : (cent_offset > 0 ? 48 : -48);

        const statusText = this._getPitchStatus(cent_offset, note_viet, targetNote, octave, hz);
        const cssClass   = this._getPitchClass(cent_offset, note_viet, targetNote, octave, hz);
        this._setNoteDisplay(note_viet, octave, `(${data.pitch.note_western}${octave})`, statusText, cssClass);

        if (this.pitchCanvas && hz > 0) {
          this.pitchCanvas.addPoint(hz, this._getTargetHz(hz), false);
        }
      }
    }

    // 2. Cập nhật điểm số
    if (data.score) {
      const score = data.score.total_score ?? 0;
      this._updateScore(score);
      this._totalScore = (this._totalScore * (n - 1) + score) / n;
      if (this.statAvgScore) {
        this.statAvgScore.textContent = Math.round(this._totalScore);
      }
    }

    // 3. Cập nhật cột hơi thở & luồng khí thổi sáo
    if (data.breath) {
      const rmsNorm = data.breath.rms_normalized ?? (data.breath.rms ? Math.min(1, data.breath.rms * 6) : 0);
      const isBreathing = data.breath.is_breathing;
      if (this.breathBarEl) {
        this.breathBarEl.style.width = `${Math.min(100, Math.round(rmsNorm * 100))}%`;
      }
      const breathLabel = document.getElementById('breath-status-label');
      if (breathLabel) {
        if (rmsNorm > 0.4 && rmsNorm < 0.9) {
          breathLabel.textContent = 'Đủ hơi ✔';
          breathLabel.className = 'badge badge-green text-xs';
        } else if (rmsNorm >= 0.9) {
          breathLabel.textContent = 'Hơi mạnh 🔥';
          breathLabel.className = 'badge badge-orange text-xs';
        } else if (rmsNorm > 0.05) {
          breathLabel.textContent = 'Hơi yếu 💨';
          breathLabel.className = 'badge badge-blue text-xs';
        } else {
          breathLabel.textContent = 'Chưa có hơi';
          breathLabel.className = 'badge badge-blue text-xs';
        }
      }
      if (this.breathSteamEl) {
        if (isBreathing && rmsNorm > 0.08) {
          this.breathSteamEl.classList.add('active');
        } else {
          this.breathSteamEl.classList.remove('active');
        }
      }
    }

    // 4. Cập nhật gợi ý sửa
    if (data.feedback && Array.isArray(data.feedback)) {
      this._updateFeedback(data.feedback);
    }
  }

  onSessionEnd(summary) {
    this._stopTimer();
    if (this.pitchCanvas) this.pitchCanvas.stop();
    this._setUIActive(false);
    this._setStatus('idle');
    this._showSummaryModal(summary);
  }

  /* ── Helper Render ── */

  _setNoteDisplay(name, octave, west, status, cssClass) {
    if (this.noteNameEl)   this.noteNameEl.textContent   = name;
    if (this.noteOctaveEl) this.noteOctaveEl.textContent = octave ? `${octave}` : '';
    if (this.noteWestEl)   this.noteWestEl.textContent   = west;
    if (this.noteStatusEl) this.noteStatusEl.textContent = status;

    const display = document.querySelector('.pitch-display');
    if (display) {
      display.className = `pitch-display ${cssClass}`;
    }
  }

  _updateScore(score) {
    if (this.scoreRingFill) {
      const offset = this._ringC - (score / 100) * this._ringC;
      this.scoreRingFill.style.strokeDashoffset = offset;

      let color = '#f85149';
      let grade = 'F';
      if (score >= 90) { color = '#ffd700'; grade = 'S'; }
      else if (score >= 80) { color = '#3fb950'; grade = 'A'; }
      else if (score >= 65) { color = '#58a6ff'; grade = 'B'; }
      else if (score >= 50) { color = '#d29922'; grade = 'C'; }

      this.scoreRingFill.style.stroke = color;
      if (this.scoreValueEl) this.scoreValueEl.textContent = Math.round(score);
      if (this.scoreGradeEl) {
        this.scoreGradeEl.textContent = grade;
        this.scoreGradeEl.style.color = color;
      }
    }
  }

  _updateFeedback(feedbackList) {
    if (!this.feedbackPanel) return;
    this.feedbackPanel.innerHTML = '';

    feedbackList.slice(0, 3).forEach(fb => {
      const msg  = typeof fb === 'object' ? fb.message : fb;
      const type = (typeof fb === 'object' ? fb.severity : 'INFO').toLowerCase();

      const el = document.createElement('div');
      el.className = `feedback-item ${type}`;

      let icon = '💡';
      if (type === 'success') icon = '🌟';
      if (type === 'warning') icon = '⚠️';
      if (type === 'error')   icon = '🎯';

      el.innerHTML = `
        <span class="fb-icon">${icon}</span>
        <span class="fb-msg">${msg}</span>
      `;
      this.feedbackPanel.appendChild(el);
    });
  }

  _setStatus(status) {
    const MAP = {
      idle:         { dot: 'gray',   label: 'Chờ bắt đầu' },
      connecting:   { dot: 'yellow', label: 'Đang kết nối...' },
      connected:    { dot: 'green',  label: 'Đang thu âm thời gian thực' },
      reconnecting: { dot: 'yellow', label: 'Đang thử lại...' },
      disconnected: { dot: 'red',    label: 'Mất kết nối' },
      stopped:      { dot: 'gray',   label: 'Đã dừng' },
    };
    const s = MAP[status] || { dot: 'gray', label: status };
    if (this.statusDot)   this.statusDot.className = `status-dot ${s.dot}`;
    if (this.statusLabel) this.statusLabel.textContent = s.label;
  }

  _setUIActive(active) {
    if (this.startBtn) {
      this.startBtn.disabled = active;
      if (active) {
        this.startBtn.innerHTML = '<span class="pulse-icon" style="font-size: 1.15rem;">⏳</span> Đang thổi...';
        this.startBtn.style.opacity = '0.75';
        this.startBtn.style.cursor = 'not-allowed';
        this.startBtn.classList.remove('btn-pulse-action');
      } else {
        this.startBtn.innerHTML = '<span aria-hidden="true" style="font-size: 1.15rem;">▶</span> Bắt đầu thổi';
        this.startBtn.style.opacity = '1';
        this.startBtn.style.cursor = 'pointer';
        this.startBtn.classList.add('btn-pulse-action');
      }
    }
    if (this.stopBtn) {
      this.stopBtn.disabled = !active;
      if (active) {
        this.stopBtn.style.opacity = '1';
        this.stopBtn.style.cursor = 'pointer';
        this.stopBtn.style.background = '#ef4444';
        this.stopBtn.style.color = '#ffffff';
        this.stopBtn.style.borderColor = '#dc2626';
        this.stopBtn.style.boxShadow = '0 0 14px rgba(239, 68, 68, 0.45)';
      } else {
        this.stopBtn.style.opacity = '0.45';
        this.stopBtn.style.cursor = 'not-allowed';
        this.stopBtn.style.background = 'var(--surface2)';
        this.stopBtn.style.color = 'var(--text)';
        this.stopBtn.style.borderColor = 'var(--border)';
        this.stopBtn.style.boxShadow = 'none';
      }
    }
  }

  _getPitchStatus(cent, noteViet = null, targetNote = null, octave = null, hz = null) {
    const isTarget = isMatchingFluteNote(noteViet, octave, hz, targetNote);
    if (!isTarget) {
      const isTargetDo2 = (targetNote === 'Đô 2' || targetNote === 'Đô2');
      const isDetDo1 = (noteViet === 'Đô' && (hz ? hz < 380 : (octave && octave <= 4)));
      if (isTargetDo2 && isDetDo1) {
        return `⚠️ Đang thổi Đô 1 — Để lên Đô 2: Mở ngón trỏ 1, bấm kín 5 ngón 2..6 và tăng hơi!`;
      }
      const isTargetDo1 = (targetNote === 'Đô' || targetNote === 'Đô 1');
      const isDetDo2 = (noteViet === 'Đô' && (hz ? hz > 950 : (octave && octave >= 6)));
      if (isTargetDo1 && isDetDo2) {
        return `⚠️ Thổi quá mạnh vọt lên quãng cao — Cần bịt kín 6 lỗ và thổi nhẹ, êm.`;
      }
      return `⚠️ Đang nghe: nốt ${noteViet} (Cần thổi nốt ${targetNote})`;
    }
    const abs = Math.abs(cent);
    if (abs < 14) return `✨ Đúng nốt ${targetNote || ''} — Rất chuẩn! (In Tune)`;
    if (abs < 26) return cent > 0 ? '↑ Hơi cao một chút (Thổi êm lại)' : '↓ Hơi thấp một chút (Thổi thêm hơi)';
    if (abs < 42) return cent > 0 ? '↑↑ Cao quá (Giảm bớt luồng hơi)' : '↓↓ Thấp quá (Thổi mạnh hơn nữa)';
    return '✗ Lệch cao độ nhiều';
  }

  _getPitchClass(cent, noteViet = null, targetNote = null, octave = null, hz = null) {
    const isTarget = isMatchingFluteNote(noteViet, octave, hz, targetNote);
    if (!isTarget) {
      return 'wrong-note';
    }
    const abs = Math.abs(cent);
    if (abs < 14) return 'in-tune';
    if (abs < 28) return cent > 0 ? 'sharp' : 'flat';
    return 'off';
  }

  _getTargetHz(detectedHz = null) {
    const note = window.selectedNote || 'Sol';
    const info = NOTE_DATA[note] || NOTE_DATA['Sol'];
    // Tự động thích ứng nếu người dùng thổi sáo quãng 5 (>520Hz)
    if (detectedHz && detectedHz > 520 && info.freq[5]) {
      return info.freq[5];
    }
    return info.freq[4] || 392.0;
  }

  _showSummaryModal(summary) {
    const backdrop = document.getElementById('summary-modal');
    if (!backdrop) return;

    const avgScore = (summary.average_score != null) ? summary.average_score : ((summary.averageScore != null) ? summary.averageScore : 0);
    const grade = summary.grade || (avgScore >= 90 ? 'S' : (avgScore >= 80 ? 'A' : (avgScore >= 65 ? 'B' : (avgScore >= 50 ? 'C' : 'D'))));
    const duration = summary.duration_sec ?? summary.duration ?? 0;
    const frames = summary.total_frames ?? summary.frameCount ?? 0;
    const note = summary.target_note || window.selectedNote || 'Sol';

    document.getElementById('summary-grade').textContent = grade;
    document.getElementById('summary-score').textContent = Math.round(avgScore);
    document.getElementById('summary-duration').textContent = `${Math.round(duration)}s`;
    document.getElementById('summary-note').textContent = note;
    document.getElementById('summary-frames').textContent = frames;

    backdrop.classList.add('open');

    document.getElementById('summary-close')?.addEventListener('click', () => {
      backdrop.classList.remove('open');
    }, { once: true });

    document.getElementById('summary-practice-again')?.addEventListener('click', () => {
      backdrop.classList.remove('open');
      setTimeout(() => this.handleStart(), 300);
    }, { once: true });
  }
}

/* ============================================================
   CHỌN NỐT & PHÁT ÂM MẪU SÁO TRÚC
   ============================================================ */
function initNoteSelection() {
  window.selectedNote = 'Sol';

  const noteCards = document.querySelectorAll('.note-card[data-note]');
  noteCards.forEach(card => {
    // Click thẻ nốt
    card.addEventListener('click', (e) => {
      // Nếu bấm nút nghe thử thì không kích hoạt lại chọn nốt
      if (e.target.closest('.btn-play-preview')) return;

      noteCards.forEach(c => c.classList.remove('active', 'pulse-active'));
      card.classList.add('active', 'pulse-active');
      window.selectedNote = card.getAttribute('data-note');

      updateFingeringGuide(window.selectedNote);

      // Nếu đang trong phiên luyện tập, chuyển ngay nốt mục tiêu cho máy chủ
      if (window.practiceUI && window.practiceUI.session && window.practiceUI.session.active) {
        window.practiceUI.session.setTargetNote(window.selectedNote);
      }

      // Tự động phát âm thanh mẫu khi người dùng click (tránh autoplay warning trên page load)
      if (e && e.isTrusted) {
        const hz = NOTE_DATA[window.selectedNote]?.freq[4] || 392.0;
        playFlutePreview(hz, 0.8);
        showToast(`Đã chọn nốt ${window.selectedNote}`, 'info', 1200);
      }
    });

    // Nút nghe thử âm thanh sáo mẫu
    const btnPlay = card.querySelector('.btn-play-preview');
    if (btnPlay) {
      btnPlay.addEventListener('click', (e) => {
        e.stopPropagation();
        const note = card.getAttribute('data-note');
        const hz = NOTE_DATA[note]?.freq[4] || 392.0;
        playFlutePreview(hz, 1.5);
        showToast(`🔊 Đang phát âm mẫu sáo trúc nốt ${note}...`, 'info', 1500);
      });
    }
  });

  updateFingeringGuide('Sol');
}

function updateFingeringGuide(noteName) {
  let key = (noteName || 'Sol').trim();
  if (!FINGERINGS[key]) {
    if (key.includes('Đô 2') || key === 'Do2' || key === 'Đô2') key = 'Đô 2';
    else if (key.includes('Đô') || key === 'Do') key = 'Đô 1';
    else if (key.includes('Rê') || key === 'Re') key = 'Rê 1';
    else if (key.includes('Mi')) key = 'Mi 1';
    else if (key.includes('Fa')) key = 'Fa 1';
    else if (key.includes('Sol')) key = 'Sol 1';
    else if (key.includes('La')) key = 'La 1';
    else if (key.includes('Sib') || key.includes('Si giáng')) key = 'Sib';
    else if (key.includes('Si')) key = 'Si 1';
  }
  const fingering = FINGERINGS[key] || FINGERINGS['Sol 1'] || FINGERINGS['Sol'];
  if (!fingering) return;

  // fingering là [Lỗ 6, Lỗ 5, Lỗ 4, Lỗ 3, Lỗ 2, Lỗ 1]
  // Lỗ 6 (Trỏ T) gần lỗ thổi nhất -> index 0
  // Lỗ 1 (Áp út P) gần đuôi sáo nhất -> index 5
  const holes = document.querySelectorAll('.hole-large[data-hole]');
  holes.forEach(hole => {
    const num = parseInt(hole.getAttribute('data-hole'), 10);
    const idx = num - 1; // Lỗ 1 (Trỏ T) -> index 0; Lỗ 6 (Áp P) -> index 5 (Chuẩn bảng phấn)
    const isClosed = fingering[idx];
    hole.className = 'hole-large ' + (isClosed ? 'closed' : 'open');
    if (isClosed) {
      hole.classList.add('finger-target');
    }
  });

  const guideTitle = document.getElementById('fingering-note-name');
  if (guideTitle) guideTitle.textContent = key;
}


/* ============================================================
   BỘ DÒ TONE SÁO TỰ ĐỘNG & QUẢN LÝ TONE SÁO
   ============================================================ */
function setFluteTone(toneKey) {
  if (!FLUTE_TONES[toneKey]) toneKey = 'C';
  window.currentFluteTone = toneKey;
  localStorage.setItem('hocsao_flute_tone', toneKey);

  const sel = document.getElementById('flute-type-select');
  if (sel && sel.value !== toneKey) {
    sel.value = toneKey;
  }

  const toneConfig = FLUTE_TONES[toneKey];

  // Cập nhật phụ đề trên các thẻ nốt để người dùng biết âm thực tế
  document.querySelectorAll('.note-card[data-note]').forEach(card => {
    const noteName = card.getAttribute('data-note');
    const noteInfo = toneConfig.notes[noteName];
    const westEl = card.querySelector('.note-west');
    if (westEl && noteInfo) {
      if (toneKey === 'C') {
        const d = NOTE_DATA[noteName];
        westEl.textContent = `${d?.west || ''} · ${Math.round(noteInfo.hz)}Hz`;
      } else {
        westEl.textContent = `Âm thật: ${noteInfo.realName} (${Math.round(noteInfo.hz)}Hz)`;
      }
    }
  });

  // Cập nhật huy hiệu tone trên Tuner nếu có
  const badgeEl = document.getElementById('current-tone-badge');
  if (badgeEl) {
    badgeEl.textContent = toneConfig.name;
  }

  if (window.practiceUI && window.practiceUI.session && window.practiceUI.session.active) {
    window.practiceUI.session.fluteType = toneKey;
  }
}

class FluteToneDetector {
  constructor() {
    this.active = false;
    this.samples = [];
  }

  startDetection() {
    this.active = true;
    this.samples = [];

    const modal = document.getElementById('modal-detect-tone');
    if (modal) {
      modal.classList.add('open');
      modal.style.display = 'flex';
    }

    const statusEl = document.getElementById('detect-tone-status');
    if (statusEl) statusEl.textContent = 'Đang lắng nghe... Hãy bịt kín 6 lỗ và thổi đều đặn!';

    const meterEl = document.getElementById('detect-tone-progress');
    if (meterEl) meterEl.style.width = '0%';

    const resEl = document.getElementById('detect-tone-result');
    if (resEl) resEl.style.display = 'none';

    // Bắt đầu microphone nếu chưa bật
    if (window.practiceUI && (!window.practiceUI.session || !window.practiceUI.session.active)) {
      window.practiceUI.handleStart();
    }

    let elapsed = 0;
    const interval = setInterval(() => {
      if (!this.active) {
        clearInterval(interval);
        return;
      }
      elapsed += 100;
      const pct = Math.min(100, Math.round((elapsed / 3200) * 100));
      if (meterEl) meterEl.style.width = `${pct}%`;

      if (elapsed >= 3200) {
        clearInterval(interval);
        this.finishDetection();
      }
    }, 100);
  }

  addSample(hz) {
    if (!this.active) return;
    if (hz >= 220 && hz <= 1400) {
      this.samples.push(hz);
      const statusEl = document.getElementById('detect-tone-status');
      if (statusEl && this.samples.length > 5) {
        statusEl.textContent = `🎯 Đã thu nhận âm sắc (~${Math.round(hz)}Hz)... Đang phân tích...`;
      }
    }
  }

  finishDetection() {
    this.active = false;
    if (this.samples.length < 5) {
      showToast('⚠️ Chưa nghe rõ tiếng sáo. Vui lòng bấm kín 6 lỗ và thổi mạnh dứt khoát hơn!', 'warning', 4500);
      this.closeModal();
      return;
    }

    this.samples.sort((a, b) => a - b);
    const medianHz = this.samples[Math.floor(this.samples.length / 2)];

    let bestTone = 'C';
    let minDiff = Infinity;

    const candidates = [
      { key: 'C', hz: 523.25 },
      { key: 'C', hz: 261.63 },
      { key: 'A', hz: 440.00 },
      { key: 'G', hz: 392.00 },
      { key: 'D', hz: 587.33 },
      { key: 'B', hz: 493.88 },
      { key: 'Bb', hz: 466.16 },
      { key: 'F', hz: 349.23 },
    ];

    for (const c of candidates) {
      const centDiff = Math.abs(1200 * Math.log2(medianHz / c.hz));
      if (centDiff < minDiff) {
        minDiff = centDiff;
        bestTone = c.key;
      }
    }

    setFluteTone(bestTone);
    const toneInfo = FLUTE_TONES[bestTone];
    const resEl = document.getElementById('detect-tone-result');
    if (resEl) {
      resEl.textContent = `🎉 Kết quả: ${toneInfo.name} (~${Math.round(medianHz)}Hz)!`;
      resEl.style.display = 'block';
    }

    showToast(`🎯 Tuyệt vời! Đã nhận diện cây sáo của bạn: ${toneInfo.name}!`, 'success', 5000);

    setTimeout(() => {
      this.closeModal();
    }, 2200);
  }

  closeModal() {
    this.active = false;
    const modal = document.getElementById('modal-detect-tone');
    if (modal) {
      modal.classList.remove('open');
      modal.style.display = 'none';
    }
  }
}
window.fluteToneDetector = new FluteToneDetector();

/* ============================================================
   KHỞI TẠO TRANG
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initNoteSelection();
  window.practiceUI = new PracticeUI();

  // Tương tác bấm ngón trực tiếp trên thân cây sáo mô phỏng
  const fluteHoles = document.querySelectorAll('.bamboo-flute-body .hole-large[data-hole]');
  const holeNames = {
    1: { finger: 'Ngón trỏ tay trái', note: 'Đô 2', desc: 'Mở ngón này khi thổi nốt Đô 2' },
    2: { finger: 'Ngón giữa tay trái', note: 'La 1', desc: 'Mở cùng các lỗ dưới khi thổi nốt La 1' },
    3: { finger: 'Ngón áp út tay trái', note: 'Sol 1', desc: 'Mở cùng các lỗ dưới khi thổi nốt Sol 1' },
    4: { finger: 'Ngón trỏ tay phải', note: 'Fa 1', desc: 'Mở toàn bộ tay phải khi thổi nốt Fa 1' },
    5: { finger: 'Ngón giữa tay phải', note: 'Mi 1', desc: 'Mở lỗ 5 và 6 khi thổi nốt Mi 1' },
    6: { finger: 'Ngón áp út tay phải', note: 'Rê 1', desc: 'Mở ngón này khi thổi nốt Rê 1' }
  };
  fluteHoles.forEach(h => {
    h.addEventListener('click', (e) => {
      e.stopPropagation();
      const num = parseInt(h.getAttribute('data-hole'), 10);
      const info = holeNames[num] || { finger: `Lỗ ${num}`, desc: '' };
      showToast(`👉 Lỗ ${num}: ${info.finger}. ${info.desc}`, 'info', 2500);
      if (window.bambooFluteEngine) {
        window.bambooFluteEngine.playNote(info.note, 0.6);
      }
    });
  });

  const mouthpiece = document.getElementById('flute-mouthpiece-el');
  if (mouthpiece) {
    mouthpiece.addEventListener('click', () => {
      showToast('💨 Lỗ thổi: Đặt môi dưới che 1/3 lỗ thổi, mím nhẹ khóe môi và thổi luồng hơi mỏng đều!', 'info', 3500);
    });
  }

  // Khởi tạo nhẹ nhàng bộ giải mã âm thanh trên cử chỉ người dùng đầu tiên (không bật mic ép buộc)
  const resumeAudioOnGesture = () => {
    if (window.bambooFluteEngine) {
      window.bambooFluteEngine._initPreload();
    }
  };
  document.addEventListener('pointerdown', resumeAudioOnGesture, { once: true, passive: true });

  // Khôi phục Tone sáo đã lưu hoặc khởi tạo
  const savedTone = localStorage.getItem('hocsao_flute_tone') || 'C';
  setFluteTone(savedTone);

  // Sự kiện khi người dùng đổi tone sáo trên dropdown
  const toneSelect = document.getElementById('flute-type-select');
  if (toneSelect) {
    toneSelect.value = savedTone;
    toneSelect.addEventListener('change', (e) => {
      setFluteTone(e.target.value);
      showToast(`Đã chuyển sang ${FLUTE_TONES[e.target.value]?.name}`, 'info', 2000);
    });
  }

  // Sự kiện nút Dò Tone Sáo Tự Động
  const btnDetectTone = document.getElementById('btn-auto-detect-flute');
  if (btnDetectTone) {
    btnDetectTone.addEventListener('click', () => {
      window.fluteToneDetector.startDetection();
    });
  }

  const btnCloseDetect = document.getElementById('btn-close-detect-tone');
  if (btnCloseDetect) {
    btnCloseDetect.addEventListener('click', () => {
      window.fluteToneDetector.closeModal();
    });
  }

  // Khôi phục AudioContext khi người dùng nhấn chuột hoặc chạm màn hình
  const resumeAudioContext = () => {
    if (window.hocsaoAudio && window.hocsaoAudio.audioCtx && window.hocsaoAudio.audioCtx.state === 'suspended') {
      window.hocsaoAudio.audioCtx.resume();
    }
  };
  document.addEventListener('pointerdown', resumeAudioContext, { passive: true });
});

/* ============================================================
   BỘ MÔ PHỎNG PHÍM SÁO ẢO QUA BÀN PHÍM (KEYBOARD SIMULATOR)
   Giúp test nhanh phòng tập và game ngay cả khi chưa có sáo hoặc chưa cắm mic!
   Phím 1 -> 8 tương ứng 8 nốt: Đô, Rê, Mi, Fa, Sol, La, Si, Đô 2
   ============================================================ */
const KEY_MAP_NOTES = {
  '1': { note_viet: 'Đô',   hz: 523.25, west: 'C', octave: 5 },
  '2': { note_viet: 'Rê',   hz: 587.33, west: 'D', octave: 5 },
  '3': { note_viet: 'Mi',   hz: 659.25, west: 'E', octave: 5 },
  '4': { note_viet: 'Fa',   hz: 698.46, west: 'F', octave: 5 },
  '5': { note_viet: 'Sol',  hz: 783.99, west: 'G', octave: 5 },
  '6': { note_viet: 'La',   hz: 880.00, west: 'A', octave: 5 },
  '7': { note_viet: 'Si',   hz: 987.77, west: 'B', octave: 5 },
  '8': { note_viet: 'Đô 2', hz: 1046.50, west: 'C', octave: 6 },
};

window.simulateFluteKey = function(key) {
  const noteInfo = KEY_MAP_NOTES[key];
  if (!noteInfo) return;

  const synthPitch = {
    hz: noteInfo.hz,
    note_viet: noteInfo.note_viet,
    note_western: noteInfo.west,
    octave: noteInfo.octave,
    cent_offset: 0,
    confidence: 1.0,
    rms: 0.12,
    is_silent: false,
    isSimulated: true
  };

  // Cập nhật nhãn nốt trong game
  const gameNoteBadge = document.getElementById('game-mic-note-badge');
  if (gameNoteBadge) {
    gameNoteBadge.textContent = `${noteInfo.note_viet} (Phím ${key})`;
    gameNoteBadge.className = 'badge badge-green text-xs';
  }

  // Phát âm thanh tiếng sáo mẫu qua bộ synthesizer
  if (window.bambooFluteEngine) {
    window.bambooFluteEngine.playNote(noteInfo.note_viet, 0.4);
  }

  // Chuyển tới Game Thổi Sáo
  if (window.fluteGame && typeof window.fluteGame.onAudioFrame === 'function') {
    window.fluteGame.onAudioFrame(synthPitch);
  }

  // Cập nhật thế bấm trên cây sáo mô phỏng lớn
  window.selectedNote = noteInfo.note_viet;
  updateFingeringGuide(noteInfo.note_viet);

  // Chuyển tới PracticeUI
  if (window.practiceUI) {
    if (!window.practiceUI.session || !window.practiceUI.session.active) {
      window.practiceUI._updatePitchDisplayOnly(synthPitch);
    } else if (window.practiceUI.followAlong && window.practiceUI.followAlong.active) {
      window.practiceUI.followAlong.onFrame({
        type: 'frame',
        pitch: synthPitch,
        isSimulated: true
      });
    }
  }
};

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
  let keyNum = null;
  if (e.key >= '1' && e.key <= '8') {
    keyNum = e.key;
  } else if (e.code && (e.code.startsWith('Digit') || e.code.startsWith('Numpad'))) {
    const digit = e.code.slice(-1);
    if (digit >= '1' && digit <= '8') keyNum = digit;
  }
  if (keyNum && KEY_MAP_NOTES[keyNum]) {
    simulateFluteKey(keyNum);
  }
});
