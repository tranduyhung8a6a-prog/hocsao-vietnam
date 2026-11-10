/**
 * HọcSáo — Game Thổi Sáo Trúc & Khổ Nhạc Đi Ngang (Flute Sheet Staff & Highway)
 * ==============================================================================
 * • CHẾ ĐỘ 1 (MẶC ĐỊNH): Khổ nhạc 5 dòng kẻ cuộn ngang chuẩn nhạc lý sáo trúc
 *   - Các nốt nhạc (Đô 1 -> Đô 2) đặt chính xác trên 5 dòng kẻ & khe nhạc
 *   - Đầu nốt oval nghiêng 3D, đuôi nốt, cờ móc đơn, nốt chấm dôi, vạch kẻ phụ
 *   - Kèm vạch chia ô nhịp 2/4 và số thứ tự ô nhịp ("Ô 1, Ô 2...") chuẩn xác
 *   - Kèm tên nốt tiếng Việt, lời ca tiếng Việt và sơ đồ thế bấm 6 lỗ
 * • TÍNH NĂNG MỚI ĐẬM CHẤT NGHỆ THUẬT & GẦN GŨI:
 *   1. CÂY SÁO TRÚC 3D TRỰC QUAN TRÊN MÀN HÌNH:
 *      - Thân sáo tre trúc vàng óng với mắt tre, lỗ thổi phát ra luồng hơi
 *      - 6 lỗ bấm đổi màu thời gian thực: chỉ dẫn lỗ cần bịt kín / mở cho nốt sắp tới
 *      - Phản hồi ánh sáng xanh ngọc bích (Emerald) tức thì khi người dùng thổi đúng
 *      - Hiển thị tên ngón tay cụ thể (Trỏ T, Giữa T, Áp út T, Trỏ P, Giữa P, Áp út P)
 *   2. ĐỒNG HỒ KIM ĐO CAO ĐỘ & HƠI THỞ (BREATH & PITCH CENTS NEEDLE):
 *      - Đo độ non hơi / già hơi (Cents offset -50 đến +50)
 *      - Báo hiệu: "🎯 Chuẩn cao độ", "◄ Hơi non", "► Hơi già"
 *   3. BÀN PHÍM ẢO 8 NỐT SÁO TRỰC TIẾP (TOUCH / CLICK NOTE KEYS)
 *   4. THU ÂM & NGHE LẠI TIẾNG SÁO CỦA TÔI (RECORD & PLAYBACK)
 *   5. VÒNG LẶP ĐOẠN LUYỆN TẬP (A-B LOOPER)
 *   6. THƯ VIỆN 6 BÀI DÂN CA GẦN GŨI (Lý Cây Đa, Bèo Dạt Mây Trôi, Trống Cơm, Thần Thoại...)
 *   7. BỘ GÕ NHỊP METRONOME (TẮC - TÙNG)
 */

'use strict';

/* ============================================================
   BẢNG THẾ BẤM 6 LỖ SÁO TRÚC VIỆT NAM (CHUẨN BẢNG PHẤN)
   Lỗ 1 (Trỏ T) gần lỗ thổi -> Lỗ 6 (Áp út P) gần đuôi sáo
   true = Bịt kín (chấm đỏ cam), false = Mở (vòng tròn xám)
   ============================================================ */
const FINGERINGS_GAME = {
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
  'Đô 2':     [false, true,  true,  true,  true,  true ],
  'Đô2':      [false, true,  true,  true,  true,  true ],
  'Rê 2':     [false, true,  true,  true,  true,  false],
  'Mi 2':     [false, true,  true,  true,  false, false],
};

const FLUTE_FINGER_NAMES = [
  'Trỏ T (Lỗ 1)',
  'Giữa T (Lỗ 2)',
  'Áp út T (Lỗ 3)',
  'Trỏ P (Lỗ 4)',
  'Giữa P (Lỗ 5)',
  'Áp út P (Lỗ 6)'
];

/* ============================================================
   KHO 6 BÀI HÁT DÂN CA & SÁO TRÚC VIỆT NAM GẦN GŨI
   ============================================================ */
const FLUTE_SONGS = [
  {
    id: 'ly_cay_da',
    title: 'Lý Cây Đa (Dân Ca Quan Họ Bắc Bộ)',
    subtitle: 'Bản nhạc PDF chuẩn 100% — Nhịp 2/4 · Tempo 90 BPM · 21 Ô Nhịp',
    difficulty: 2,
    stars: '⭐⭐',
    bpm: 90,
    meter: '2/4',
    desc: 'Bản nhạc sáo trúc kinh điển của vùng Kinh Bắc. Giai điệu mượt mà, đúng từng nốt, dấu chấm dôi, dấu lặng, luyến và lấy hơi theo bản phổ PDF gốc.',
    sections: [
      { id: 'all', title: 'Toàn bộ bài hát (Ô 1 - 21 · 42 phách)', start: 0, end: 75 },
      { id: 'sec1', title: 'Khổ 1: Trèo lên quán dốc (Ô 1 - 6)', start: 0, end: 23 },
      { id: 'sec2', title: 'Khổ 2: Ai đem a lý tình tính tang (Ô 7 - 14)', start: 23, end: 50 },
      { id: 'sec3', title: 'Khổ 3: Khen ai đẽo khéo vá may (Ô 15 - 21)', start: 50, end: 75 },
    ],
    notes: [
      // Ô 1 (Nhịp 2/4 - Phách 1: Lặng đen, Phách 2: Đô 1)
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

      // Ô 12 (Nốt móc đơn chấm dôi 0.75 + móc kép 0.25 + luyến sang Ô 13)
      { note: 'Rê',   dur: 0.75, lyric: 'tang', measure: 12, beat: 22.0, isDotted: true },
      { note: 'Đô',   dur: 0.25, lyric: 'tình', measure: 12, beat: 22.75 },
      { note: 'Sol',  dur: 0.5, lyric: 'tính', measure: 12, beat: 23.0 },
      { note: 'Sol',  dur: 0.5, lyric: 'tang', measure: 12, beat: 23.5, slurToNext: true },

      // Ô 13 (Nốt Đô 1 luyến từ Sol Ô 12, lướt lên Đô 2)
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
  {
    id: 'beo_dat_may_troi',
    title: 'Bèo Dạt Mây Trôi (Dân Ca Quan Họ Bắc Ninh)',
    subtitle: 'Giai điệu da diết, mộc mạc — Nhịp 2/4 · Tempo 76 BPM',
    difficulty: 2,
    stars: '⭐⭐',
    bpm: 76,
    meter: '2/4',
    desc: 'Khúc hát dân ca Quan họ tha thiết, gắn liền với tiếng sáo trúc Việt Nam qua nhiều thế hệ. Luyện hơi dài và luyến nốt êm dịu.',
    sections: [
      { id: 'all', title: 'Toàn bộ bài hát' },
      { id: 'sec1', title: 'Đoạn 1: Bèo dạt mây trôi chốn xa xôi...', start: 0, end: 12 },
      { id: 'sec2', title: 'Đoạn 2: Chim ca tang tính tình...', start: 12, end: 24 }
    ],
    notes: [
      // Ô 1 - 4: Bèo dạt mây trôi...
      { note: 'Sol', dur: 0.5, lyric: 'Bèo', measure: 1, beat: 0.0 },
      { note: 'Đô',  dur: 1.5, lyric: 'dạt', measure: 1, beat: 0.5 },
      { note: 'Rê',  dur: 0.5, lyric: 'mây', measure: 2, beat: 2.0 },
      { note: 'Mi',  dur: 1.5, lyric: 'trôi', measure: 2, beat: 2.5 },
      { note: 'Sol', dur: 0.5, lyric: 'chốn', measure: 3, beat: 4.0 },
      { note: 'La',  dur: 1.5, lyric: 'xa',  measure: 3, beat: 4.5 },
      { note: 'Sol', dur: 2.0, lyric: 'xôi...', measure: 4, beat: 6.0 },

      // Ô 5 - 8: Anh ơi em vẫn đợi...
      { note: 'Sol', dur: 0.5, lyric: 'Anh', measure: 5, beat: 8.0 },
      { note: 'Đô 2', dur: 1.0, lyric: 'ơi', measure: 5, beat: 8.5 },
      { note: 'La',  dur: 0.5, lyric: 'em',  measure: 5, beat: 9.5 },
      { note: 'Sol', dur: 0.5, lyric: 'vẫn', measure: 6, beat: 10.0 },
      { note: 'Mi',  dur: 1.0, lyric: 'đợi', measure: 6, beat: 10.5 },
      { note: 'Rê',  dur: 0.5, lyric: 'người', measure: 6, beat: 11.5 },
      { note: 'Đô',  dur: 0.5, lyric: 'bèo', measure: 7, beat: 12.0 },
      { note: 'Rê',  dur: 0.5, lyric: 'dạt', measure: 7, beat: 12.5 },
      { note: 'Mi',  dur: 0.5, lyric: 'mây', measure: 7, beat: 13.0 },
      { note: 'Rê',  dur: 0.5, lyric: 'trôi', measure: 7, beat: 13.5 },
      { note: 'Đô',  dur: 2.0, lyric: 'trôi...', measure: 8, beat: 14.0 },

      // Ô 9 - 12: Chim ca tang tính tình...
      { note: 'Mi',  dur: 0.5, lyric: 'Chim', measure: 9, beat: 16.0 },
      { note: 'Sol', dur: 0.5, lyric: 'ca',   measure: 9, beat: 16.5 },
      { note: 'La',  dur: 1.0, lyric: 'tang', measure: 9, beat: 17.0 },
      { note: 'Sol', dur: 0.5, lyric: 'tính', measure: 10, beat: 18.0 },
      { note: 'Mi',  dur: 0.5, lyric: 'tình', measure: 10, beat: 18.5 },
      { note: 'Rê',  dur: 1.0, lyric: 'tình', measure: 10, beat: 19.0 },
      { note: 'Đô',  dur: 0.5, lyric: 'cá',   measure: 11, beat: 20.0 },
      { note: 'Rê',  dur: 0.5, lyric: 'lội',  measure: 11, beat: 20.5 },
      { note: 'Mi',  dur: 0.5, lyric: 'dưới', measure: 11, beat: 21.0 },
      { note: 'Rê',  dur: 0.5, lyric: 'nước', measure: 11, beat: 21.5 },
      { note: 'Đô',  dur: 2.0, lyric: 'trông!', measure: 12, beat: 22.0 },
    ]
  },
  {
    id: 'trong_com',
    title: 'Trống Cơm (Dân Ca Đồng Bằng Bắc Bộ)',
    subtitle: 'Rộn ràng, vui tươi, ngón linh hoạt — Nhịp 2/4 · Tempo 104 BPM',
    difficulty: 3,
    stars: '⭐⭐⭐',
    bpm: 104,
    meter: '2/4',
    desc: 'Điệu hát trống cơm rộn rã tưng bừng. Luyện ngón tay lanh lẹ và phản xạ nhịp điệu nhanh.',
    sections: [
      { id: 'all', title: 'Toàn bộ bài hát' },
      { id: 'sec1', title: 'Đoạn 1: Tình bằng có cái trống cơm...', start: 0, end: 12 },
      { id: 'sec2', title: 'Đoạn 2: Một bầy tang tình con sít...', start: 12, end: 24 }
    ],
    notes: [
      { note: 'Sol', dur: 0.5, lyric: 'Tình', measure: 1, beat: 0.0 },
      { note: 'Đô',  dur: 0.5, lyric: 'bằng', measure: 1, beat: 0.5 },
      { note: 'Đô',  dur: 0.5, lyric: 'có',   measure: 1, beat: 1.0 },
      { note: 'Rê',  dur: 0.5, lyric: 'cái',  measure: 1, beat: 1.5 },
      { note: 'Mi',  dur: 1.0, lyric: 'trống', measure: 2, beat: 2.0 },
      { note: 'Sol', dur: 1.0, lyric: 'cơm',  measure: 2, beat: 3.0 },
      { note: 'La',  dur: 0.5, lyric: 'khen', measure: 3, beat: 4.0 },
      { note: 'Sol', dur: 0.5, lyric: 'ai',   measure: 3, beat: 4.5 },
      { note: 'Mi',  dur: 0.5, lyric: 'khéo', measure: 3, beat: 5.0 },
      { note: 'Rê',  dur: 0.5, lyric: 'vỗ',   measure: 3, beat: 5.5 },
      { note: 'Đô',  dur: 2.0, lyric: 'ơi...', measure: 4, beat: 6.0 },

      { note: 'Sol', dur: 0.5, lyric: 'Ố',   measure: 5, beat: 8.0 },
      { note: 'La',  dur: 0.5, lyric: 'mấy', measure: 5, beat: 8.5 },
      { note: 'Sol', dur: 0.5, lyric: 'bông', measure: 5, beat: 9.0 },
      { note: 'Mi',  dur: 0.5, lyric: 'mà',  measure: 5, beat: 9.5 },
      { note: 'Sol', dur: 1.0, lyric: 'nên', measure: 6, beat: 10.0 },
      { note: 'Đô',  dur: 1.0, lyric: 'bông', measure: 6, beat: 11.0 },
      { note: 'Rê',  dur: 0.5, lyric: 'ố',   measure: 7, beat: 12.0 },
      { note: 'Mi',  dur: 0.5, lyric: 'mấy', measure: 7, beat: 12.5 },
      { note: 'Rê',  dur: 0.5, lyric: 'bông', measure: 7, beat: 13.0 },
      { note: 'Đô',  dur: 0.5, lyric: 'mà',  measure: 7, beat: 13.5 },
      { note: 'Đô',  dur: 2.0, lyric: 'nên bông!', measure: 8, beat: 14.0 },
    ]
  },
  {
    id: 'than_thoai',
    title: 'Thần Thoại (Nhạc Khúc Sáo Trúc Kinh Điển)',
    subtitle: 'Giai điệu lãng mạn, nốt cao vút — Nhịp 2/4 · Tempo 76 BPM',
    difficulty: 2,
    stars: '⭐⭐',
    bpm: 76,
    meter: '2/4',
    desc: 'Bản sáo trúc trữ tình được hầu hết người học sáo yêu thích. Luyện chuyển giữa các nốt Sol, La, Đô 2 và Rê 2 mượt mà.',
    sections: [
      { id: 'all', title: 'Toàn bộ bài hát' },
      { id: 'sec1', title: 'Đoạn 1: Vạn năm trôi...', start: 0, end: 12 },
      { id: 'sec2', title: 'Đoạn 2: Trời cao đất chứng...', start: 12, end: 24 }
    ],
    notes: [
      { note: 'Mi',  dur: 0.5, lyric: 'Vạn', measure: 1, beat: 0.0 },
      { note: 'Sol', dur: 0.5, lyric: 'năm', measure: 1, beat: 0.5 },
      { note: 'La',  dur: 1.0, lyric: 'trôi', measure: 1, beat: 1.0 },
      { note: 'Sol', dur: 0.5, lyric: 'mối', measure: 2, beat: 2.0 },
      { note: 'Mi',  dur: 0.5, lyric: 'duyên', measure: 2, beat: 2.5 },
      { note: 'Rê',  dur: 1.0, lyric: 'nồng', measure: 2, beat: 3.0 },
      { note: 'Đô',  dur: 0.5, lyric: 'dù',  measure: 3, beat: 4.0 },
      { note: 'Rê',  dur: 0.5, lyric: 'cho', measure: 3, beat: 4.5 },
      { note: 'Mi',  dur: 0.5, lyric: 'sóng', measure: 3, beat: 5.0 },
      { note: 'Sol', dur: 0.5, lyric: 'gió', measure: 3, beat: 5.5 },
      { note: 'La',  dur: 2.0, lyric: 'ngăn...', measure: 4, beat: 6.0 },

      { note: 'Đô 2', dur: 0.5, lyric: 'Trời', measure: 5, beat: 8.0 },
      { note: 'La',  dur: 0.5, lyric: 'cao', measure: 5, beat: 8.5 },
      { note: 'Sol', dur: 1.0, lyric: 'đất', measure: 5, beat: 9.0 },
      { note: 'Mi',  dur: 0.5, lyric: 'chứng', measure: 6, beat: 10.0 },
      { note: 'Sol', dur: 0.5, lyric: 'cho', measure: 6, beat: 10.5 },
      { note: 'La',  dur: 1.0, lyric: 'tình', measure: 6, beat: 11.0 },
      { note: 'Sol', dur: 0.5, lyric: 'mãi', measure: 7, beat: 12.0 },
      { note: 'Mi',  dur: 0.5, lyric: 'không', measure: 7, beat: 12.5 },
      { note: 'Rê',  dur: 0.5, lyric: 'nhạt', measure: 7, beat: 13.0 },
      { note: 'Mi',  dur: 0.5, lyric: 'phai', measure: 7, beat: 13.5 },
      { note: 'Đô',  dur: 2.0, lyric: 'nhòa!', measure: 8, beat: 14.0 },
    ]
  },
  {
    id: 'buom_vang',
    title: 'Kìa Con Bướm Vàng (Nhập Môn Sáo Trúc)',
    subtitle: 'Giai điệu vui tươi, dễ thuộc — Nhịp 2/4 · Tempo 90 BPM',
    difficulty: 1,
    stars: '⭐',
    bpm: 90,
    meter: '2/4',
    desc: 'Bản nhạc nhập môn tuyệt vời cho người mới bắt đầu cầm cây sáo trúc. Luyện 3 nốt cơ bản Đô - Rê - Mi kết hợp Sol - La.',
    sections: [{ id: 'all', title: 'Toàn bộ bài hát' }],
    notes: [
      { note: 'Đô',  dur: 0.5, lyric: 'Kìa', measure: 1, beat: 0.0 },
      { note: 'Rê',  dur: 0.5, lyric: 'con', measure: 1, beat: 0.5 },
      { note: 'Mi',  dur: 0.5, lyric: 'bướm', measure: 1, beat: 1.0 },
      { note: 'Đô',  dur: 0.5, lyric: 'vàng', measure: 1, beat: 1.5 },
      { note: 'Đô',  dur: 0.5, lyric: 'Kìa', measure: 2, beat: 2.0 },
      { note: 'Rê',  dur: 0.5, lyric: 'con', measure: 2, beat: 2.5 },
      { note: 'Mi',  dur: 0.5, lyric: 'bướm', measure: 2, beat: 3.0 },
      { note: 'Đô',  dur: 0.5, lyric: 'vàng', measure: 2, beat: 3.5 },
      { note: 'Mi',  dur: 0.5, lyric: 'Xòe', measure: 3, beat: 4.0 },
      { note: 'Fa',  dur: 0.5, lyric: 'đôi', measure: 3, beat: 4.5 },
      { note: 'Sol', dur: 1.0, lyric: 'cánh', measure: 3, beat: 5.0 },
      { note: 'Mi',  dur: 0.5, lyric: 'xòe', measure: 4, beat: 6.0 },
      { note: 'Fa',  dur: 0.5, lyric: 'đôi', measure: 4, beat: 6.5 },
      { note: 'Sol', dur: 1.0, lyric: 'cánh', measure: 4, beat: 7.0 },
      { note: 'Sol', dur: 0.5, lyric: 'Bướm', measure: 5, beat: 8.0 },
      { note: 'La',  dur: 0.5, lyric: 'bướm', measure: 5, beat: 8.5 },
      { note: 'Sol', dur: 0.5, lyric: 'bay',  measure: 5, beat: 9.0 },
      { note: 'Fa',  dur: 0.5, lyric: 'lượn', measure: 5, beat: 9.5 },
      { note: 'Mi',  dur: 1.0, lyric: 'bướm', measure: 6, beat: 10.0 },
      { note: 'Đô',  dur: 2.0, lyric: 'bay!', measure: 6, beat: 11.0 },
    ]
  },
  {
    id: 'ngu_cung',
    title: '5 Nốt Ngũ Cung Bắc Bộ (Luyện Hơi & Bấm Ngón)',
    subtitle: 'Đô - Rê - Mi - Sol - La — Nhịp 2/4 · Tempo 80 BPM',
    difficulty: 1,
    stars: '⭐',
    bpm: 80,
    meter: '2/4',
    desc: 'Luyện tập 5 nốt gốc truyền thống của âm nhạc dân gian Việt Nam. Rèn luyện cột hơi đầy đặn và ngón tay mở đóng dứt khoát.',
    sections: [{ id: 'all', title: 'Toàn bộ bài hát' }],
    notes: [
      { note: 'Đô',  dur: 1.0, lyric: 'Đô 1', measure: 1, beat: 0.0 },
      { note: 'Rê',  dur: 1.0, lyric: 'Rê 1', measure: 1, beat: 1.0 },
      { note: 'Mi',  dur: 1.0, lyric: 'Mi 1', measure: 2, beat: 2.0 },
      { note: 'Sol', dur: 1.0, lyric: 'Sol 1', measure: 2, beat: 3.0 },
      { note: 'La',  dur: 2.0, lyric: 'La 1', measure: 3, beat: 4.0 },
      { note: 'La',  dur: 1.0, lyric: 'La 1', measure: 4, beat: 6.0 },
      { note: 'Sol', dur: 1.0, lyric: 'Sol 1', measure: 4, beat: 7.0 },
      { note: 'Mi',  dur: 1.0, lyric: 'Mi 1', measure: 5, beat: 8.0 },
      { note: 'Rê',  dur: 1.0, lyric: 'Rê 1', measure: 5, beat: 9.0 },
      { note: 'Đô',  dur: 2.0, lyric: 'Đô 1', measure: 6, beat: 10.0 },
    ]
  }
];

/* Bảng màu sắc rực rỡ và ấm áp cho từng nốt */
const LANE_COLORS = {
  'Đô':   { bg: '#ef4444', glow: 'rgba(239, 68, 68, 0.7)', text: '#fff' },
  'Đô 1': { bg: '#ef4444', glow: 'rgba(239, 68, 68, 0.7)', text: '#fff' },
  'Rê':   { bg: '#f97316', glow: 'rgba(249, 115, 22, 0.7)', text: '#fff' },
  'Rê 1': { bg: '#f97316', glow: 'rgba(249, 115, 22, 0.7)', text: '#fff' },
  'Mi':   { bg: '#eab308', glow: 'rgba(234, 179, 8, 0.7)', text: '#fff' },
  'Mi 1': { bg: '#eab308', glow: 'rgba(234, 179, 8, 0.7)', text: '#fff' },
  'Fa':   { bg: '#22c55e', glow: 'rgba(34, 197, 94, 0.7)', text: '#fff' },
  'Fa 1': { bg: '#22c55e', glow: 'rgba(34, 197, 94, 0.7)', text: '#fff' },
  'Sol':  { bg: '#06b6d4', glow: 'rgba(6, 182, 212, 0.7)', text: '#fff' },
  'Sol 1':{ bg: '#06b6d4', glow: 'rgba(6, 182, 212, 0.7)', text: '#fff' },
  'La':   { bg: '#3b82f6', glow: 'rgba(59, 130, 246, 0.7)', text: '#fff' },
  'La 1': { bg: '#3b82f6', glow: 'rgba(59, 130, 246, 0.7)', text: '#fff' },
  'Si':   { bg: '#a855f7', glow: 'rgba(168, 85, 247, 0.7)', text: '#fff' },
  'Si 1': { bg: '#a855f7', glow: 'rgba(168, 85, 247, 0.7)', text: '#fff' },
  'Sib':  { bg: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.7)', text: '#fff' },
  'Đô 2': { bg: '#ec4899', glow: 'rgba(236, 72, 153, 0.7)', text: '#fff' },
  'Rê 2': { bg: '#f43f5e', glow: 'rgba(244, 63, 94, 0.7)', text: '#fff' },
  'Mi 2': { bg: '#fb923c', glow: 'rgba(251, 146, 60, 0.7)', text: '#fff' },
};

/* Câu khen thưởng động viên thân thiện */
const CHEER_MESSAGES = [
  'Thổi dẻo hơi lắm! ✨',
  'Tiếng sáo mượt mà quá! 🌟',
  'Đúng chuẩn nghệ nhân sáo trúc! 🔥',
  'Hơi thở rất đều và đẹp! 🎋',
  'Bấm ngón rất dứt khoát! 👏',
  'Tuyệt đỉnh! Giữ vững phong độ! 🎶'
];

/* Tần số chuẩn sáo C5 (Đô 5 Hz chuẩn sáo trúc) */
const NOTE_BASE_HZ = {
  'Đô': 523.25, 'Đô 1': 523.25,
  'Rê': 587.33, 'Rê 1': 587.33,
  'Mi': 659.25, 'Mi 1': 659.25,
  'Fa': 698.46, 'Fa 1': 698.46,
  'Sol': 783.99, 'Sol 1': 783.99,
  'La': 880.00, 'La 1': 880.00,
  'Si': 987.77, 'Si 1': 987.77,
  'Sib': 932.33,
  'Đô 2': 1046.50,
  'Rê 2': 1174.66,
  'Mi 2': 1318.51
};

function getFluteTargetHz(name) {
  if (!name) return 783.99;
  const n = name.trim();
  return NOTE_BASE_HZ[n] || 783.99;
}

/* ============================================================
   LỚP ĐỘNG CƠ GAME THỔI SÁO & KHỔ NHẠC ĐI NGANG
   ============================================================ */
class FluteGameEngine {
  constructor(canvasId = 'fluteGameCanvas') {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.isPlaying = false;
    this.isPaused = false;
    this.isDemoPlaying = false;
    
    // Chế độ hiển thị: 'staff' (Khổ nhạc 5 dòng kẻ đi ngang) | 'highway' (Thác nước rơi dọc)
    this.viewMode = 'staff';
    
    // Chế độ chơi: 'wait' (Dừng đợi thổi đúng nốt) | 'flow' (Trôi theo nhịp điệu)
    this.gameMode = 'wait';
    
    this.speedMultiplier = 1.0;
    this.metronomeEnabled = true;
    this._metroAudioCtx = null;
    this._lastMetroBeat = -1;

    // Vòng lặp luyện đoạn A-B Looper
    this.loopEnabled = false;

    // Thu âm & Nghe lại
    this.recordEnabled = false;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.lastRecordedBlobUrl = null;

    this.currentSongIndex = 0;
    this.currentSong = FLUTE_SONGS[0];
    this.selectedSection = 'all';

    // Điểm số & chỉ số
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.perfectCount = 0;
    this.goodCount = 0;
    this.missCount = 0;
    this.pitchContourHistory = [];

    // Danh sách nốt & hiệu ứng
    this.gameNotes = [];
    this.activeNoteIndex = 0;
    this.pitchContourHistory = []; // Lịch sử đường cao độ SoundCheck (Ảnh 2)
    this.particles = [];
    this.floatingTexts = [];

    // Vị trí vạch chuẩn
    this.hitLineX = 220; // Vị trí vạch trên khổ nhạc đi ngang
    this.hitLineY = 380; // Vị trí vạch trên thác nước rơi dọc
    this.scrollX = 0;

    // Khoảng cách pixel cho 1 phách (beat) trên khổ nhạc ngang
    this.pxPerBeat = 135;

    // Vòng lặp animation
    this.animFrameId = null;
    this.lastTime = 0;
    this.elapsedPlayTime = 0;

    // Giữ nốt
    this.holdTimerMs = 0;
    this.requiredHoldMs = 180;

    // Kim đo cao độ & hơi thở thời gian thực
    this.currentCents = 0;
    this.currentRms = 0;
    this.lastDetectedNote = null;
    this.lastMatchedTime = 0;

    this._setupResize();
    this._bindDOM();
    this.resize();
    this._renderIdlePreview();
  }

  /* Âm thanh gõ nhịp Metronome (Tắc - Tùng) */
  playMetronomeClick(isDownbeat = true) {
    if (!this.metronomeEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!this._metroAudioCtx || this._metroAudioCtx.state === 'closed') {
        this._metroAudioCtx = new AudioCtx();
      }
      const ctx = this._metroAudioCtx;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(isDownbeat ? 1200 : 750, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.035);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {}
  }

  resize() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = rect.width > 0 ? rect.width : (parent ? parent.clientWidth : 1000) || 1000;
    const h = (parent && parent.clientHeight > 0) ? parent.clientHeight : 540;

    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    if (this.ctx.resetTransform) {
      this.ctx.resetTransform();
    } else if (this.ctx.setTransform) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    this.ctx.scale(dpr, dpr);
    this.width = w;
    this.height = h;
    this.hitLineY = this.height - 75;
    this.hitLineX = Math.min(260, Math.max(180, Math.round(w * 0.22)));
  }

  _setupResize() {
    window.addEventListener('resize', () => {
      this.resize();
      if (!this.isPlaying && !this.isDemoPlaying) {
        this._renderIdlePreview();
      }
    });
  }

  _bindDOM() {
    // 1. Chuyển đổi Khổ Nhạc Đi Ngang vs Thác Nước Rơi
    const btnViewStaff = document.getElementById('btn-view-staff');
    const btnViewHighway = document.getElementById('btn-view-highway');
    if (btnViewStaff && btnViewHighway) {
      btnViewStaff.addEventListener('click', () => {
        this.viewMode = 'staff';
        btnViewStaff.style.background = 'var(--accent, #e6a23c)';
        btnViewStaff.style.color = '#fff';
        btnViewHighway.style.background = 'transparent';
        btnViewHighway.style.color = 'var(--text-sec)';
        if (!this.isPlaying && !this.isDemoPlaying) this._renderIdlePreview();
        showToast('🎼 Chế độ Khổ Nhạc Cuộn Ngang: 5 dòng kẻ chuẩn ký âm kèm lời bài hát & cây sáo trúc trực quan!', 'info', 2500);
      });
      btnViewHighway.addEventListener('click', () => {
        this.viewMode = 'highway';
        btnViewHighway.style.background = 'var(--accent, #e6a23c)';
        btnViewHighway.style.color = '#fff';
        btnViewStaff.style.background = 'transparent';
        btnViewStaff.style.color = 'var(--text-sec)';
        if (!this.isPlaying && !this.isDemoPlaying) this._renderIdlePreview();
        showToast('🎹 Chế độ Thác Nước Rơi: Phong cách Piano Tiles truyền thống!', 'info', 2500);
      });
    }

    // 2. Chọn bài hát
    const songSelect = document.getElementById('game-song-select');
    if (songSelect) {
      songSelect.innerHTML = FLUTE_SONGS.map((s, idx) => `
        <option value="${idx}">🎶 ${s.title} (${s.stars} · ${s.notes.length} nốt)</option>
      `).join('');
      songSelect.addEventListener('change', (e) => {
        this.selectSong(parseInt(e.target.value));
      });
    }

    // 3. Nút Bật / Tắt Tiếng Gõ Nhịp Metronome
    const btnMetro = document.getElementById('btn-toggle-metronome');
    if (btnMetro) {
      btnMetro.addEventListener('click', () => {
        this.metronomeEnabled = !this.metronomeEnabled;
        btnMetro.innerHTML = this.metronomeEnabled ? '<span>🔔</span> Nhịp: BẬT' : '<span>🔕</span> Nhịp: TẮT';
        btnMetro.style.background = this.metronomeEnabled ? 'var(--surface2)' : '#334155';
        showToast(this.metronomeEnabled ? 'Đã bật tiếng gõ nhịp Metronome (Tắc - Tùng)' : 'Đã tắt tiếng gõ nhịp', 'info', 1800);
      });
    }

    // 4. Chọn đoạn bài hát (Section Selector)
    const sectionSelect = document.getElementById('game-section-select');
    if (sectionSelect) {
      sectionSelect.addEventListener('change', (e) => {
        this.selectedSection = e.target.value;
        if (this.isPlaying) this.stopGame();
        if (this.isDemoPlaying) this.stopDemo();
        this._prepareGameNotes();
        this._renderIdlePreview();
        showToast(`Đã chọn: ${e.target.options[e.target.selectedIndex].text}`, 'info', 2000);
      });
    }

    // 5. Nút Bắt đầu / Dừng
    const btnPlay = document.getElementById('btn-game-play');
    if (btnPlay) {
      btnPlay.addEventListener('click', () => {
        if (this.isPlaying) this.stopGame();
        else this.startGame();
      });
    }

    // 6. Nút Nghe mẫu sáo
    const btnDemo = document.getElementById('btn-game-demo');
    if (btnDemo) {
      btnDemo.addEventListener('click', () => {
        if (this.isDemoPlaying) this.stopDemo();
        else this.playSongDemo();
      });
    }

    // 7. Chế độ Chờ Thổi vs Nhịp Điệu
    const btnModeWait = document.getElementById('btn-mode-wait');
    const btnModeFlow = document.getElementById('btn-mode-flow');
    const modeBadge = document.getElementById('game-mode-badge');
    if (btnModeWait && btnModeFlow) {
      btnModeWait.addEventListener('click', () => {
        this.gameMode = 'wait';
        btnModeWait.style.background = 'var(--accent, #e6a23c)';
        btnModeWait.style.color = '#fff';
        btnModeFlow.style.background = 'transparent';
        btnModeFlow.style.color = 'var(--text-sec)';
        if (modeBadge) {
          modeBadge.textContent = '🐢 Chế độ Chờ Thổi: Nốt sẽ đợi bạn!';
          modeBadge.className = 'badge badge-blue text-xs';
        }
        showToast('🐢 Chế độ Chờ: Nốt sẽ dừng tại vạch đợi bạn bấm và thổi đúng mới đi tiếp!', 'info', 3000);
      });
      btnModeFlow.addEventListener('click', () => {
        this.gameMode = 'flow';
        btnModeFlow.style.background = 'var(--accent, #e6a23c)';
        btnModeFlow.style.color = '#fff';
        btnModeWait.style.background = 'transparent';
        btnModeWait.style.color = 'var(--text-sec)';
        if (modeBadge) {
          modeBadge.textContent = '⚡ Chế độ Nhịp Điệu: Nốt cuộn liên tục theo BPM!';
          modeBadge.className = 'badge badge-orange text-xs';
        }
        showToast('⚡ Chế độ Nhịp Điệu: Nốt cuộn liên tục theo phách, thử thách phản xạ!', 'info', 3000);
      });
    }

    // 8. Tốc độ chơi
    const speedSelect = document.getElementById('game-speed-select');
    if (speedSelect) {
      speedSelect.addEventListener('change', (e) => {
        this.speedMultiplier = parseFloat(e.target.value) || 1.0;
      });
    }

    // 9. Vòng lặp luyện tập (A-B Looper)
    const btnLoop = document.getElementById('btn-toggle-loop');
    if (btnLoop) {
      btnLoop.addEventListener('click', () => {
        this.loopEnabled = !this.loopEnabled;
        btnLoop.innerHTML = this.loopEnabled ? '<span>🔁</span> Lặp Đoạn: BẬT' : '<span>🔁</span> Lặp Đoạn: TẮT';
        btnLoop.style.background = this.loopEnabled ? 'var(--accent, #e6a23c)' : 'var(--surface2)';
        btnLoop.style.color = this.loopEnabled ? '#fff' : 'var(--text)';
        showToast(this.loopEnabled ? '🔁 Đã BẬT vòng lặp: Bài sẽ tự động lặp lại để bạn tập luyện liên tục!' : 'Đã TẮT vòng lặp', 'info', 2500);
      });
    }

    // 10. Thu âm & Nghe lại
    const btnRecord = document.getElementById('btn-toggle-record');
    if (btnRecord) {
      btnRecord.addEventListener('click', () => {
        this.recordEnabled = !this.recordEnabled;
        btnRecord.innerHTML = this.recordEnabled ? '<span>🔴</span> Thu Âm: ĐANG BẬT' : '<span>🎙️</span> Thu Âm: TẮT';
        btnRecord.style.background = this.recordEnabled ? '#ef4444' : 'var(--surface2)';
        btnRecord.style.color = '#fff';
        showToast(this.recordEnabled ? '🎙️ Đã BẬT thu âm: Tiếng sáo của bạn sẽ được lưu lại để nghe lại sau khi chơi!' : 'Đã TẮT thu âm', 'info', 2500);
      });
    }

    // 11. Bàn phím ảo 8 nốt sáo trực tiếp trên giao diện
    const virtualKeys = document.querySelectorAll('.virtual-flute-key');
    virtualKeys.forEach(btn => {
      btn.addEventListener('click', () => {
        const note = btn.getAttribute('data-note');
        if (note) this.triggerManualNote(note);
      });
    });
  }

  selectSong(indexOrId) {
    if (this.isPlaying) this.stopGame();
    if (this.isDemoPlaying) this.stopDemo();

    let idx = 0;
    if (typeof indexOrId === 'number' && !isNaN(indexOrId)) {
      idx = Math.max(0, Math.min(FLUTE_SONGS.length - 1, indexOrId));
    } else if (typeof indexOrId === 'string') {
      const found = FLUTE_SONGS.findIndex(s => s.id === indexOrId);
      idx = found >= 0 ? found : (parseInt(indexOrId) || 0);
    }

    this.currentSongIndex = idx;
    this.currentSong = FLUTE_SONGS[idx];

    // Cập nhật section selector nếu có
    const secSelect = document.getElementById('game-section-select');
    if (secSelect && this.currentSong.sections) {
      secSelect.innerHTML = this.currentSong.sections.map(s => `
        <option value="${s.id}">${s.title}</option>
      `).join('');
      this.selectedSection = 'all';
    }

    const titleEl = document.getElementById('game-song-title');
    const descEl = document.getElementById('game-song-desc');
    if (titleEl) titleEl.textContent = this.currentSong.title;
    if (descEl) descEl.textContent = `${this.currentSong.desc} · Nhịp ${this.currentSong.meter || '2/4'} · ${this.currentSong.bpm} BPM`;

    this._prepareGameNotes();
    this._renderIdlePreview();
  }

  /* Chuẩn bị danh sách nốt dựa theo tiết tấu nhịp điệu chính xác */
  _prepareGameNotes() {
    this.gameNotes = [];
    let rawNotes = this.currentSong.notes || [];

    // Lọc theo đoạn nếu được chọn
    if (this.selectedSection !== 'all' && this.currentSong.sections) {
      const sec = this.currentSong.sections.find(s => s.id === this.selectedSection);
      if (sec && sec.start !== undefined && sec.end !== undefined) {
        rawNotes = rawNotes.slice(sec.start, sec.end);
      }
    }

    let currentBeat = 0;
    let currentY = -60;
    const baseSpacingY = 160;

    rawNotes.forEach((item, idx) => {
      const dur = item.dur || 1.0;
      const beatStart = item.beat !== undefined ? item.beat : currentBeat;
      const beatEnd = beatStart + dur;
      currentBeat = beatEnd;

      // Tọa độ trên khổ nhạc đi ngang (X)
      const staffX = beatStart * this.pxPerBeat;
      const noteW = Math.max(50, Math.min(180, dur * this.pxPerBeat));

      // Tọa độ trên thác nước rơi dọc (Y)
      const tileH = Math.max(55, Math.min(120, dur * 70));

      this.gameNotes.push({
        index: idx,
        note: item.note,
        type: item.type || 'note',
        lyric: item.lyric || '',
        dur: dur,
        measure: item.measure || (Math.floor(beatStart / 2) + 1),
        beatStart: beatStart,
        beatEnd: beatEnd,
        staffX: staffX,
        noteW: noteW,
        breath: !!item.breath,
        isDotted: !!item.isDotted || (dur === 0.75 || dur === 1.5),
        tieToNext: !!item.tieToNext,
        slurToNext: !!item.slurToNext,
        tiedFromPrev: !!item.tiedFromPrev,
        slurredFromPrev: !!item.slurredFromPrev,
        y: currentY,
        height: tileH,
        isHit: false,
        isMissed: false,
        alpha: 1.0,
        glowPulse: 0
      });

      currentY -= (tileH + baseSpacingY * (dur > 1.0 ? 1.4 : 1.0));
    });

    this.activeNoteIndex = 0;
    this.scrollX = 0;
  }

  /* Bấm nốt thủ công từ bàn phím ảo hoặc chạm màn hình */
  triggerManualNote(noteName) {
    if (!noteName) return;

    // Phát âm thanh tiếng sáo mẫu
    if (window.bambooFluteEngine) {
      window.bambooFluteEngine.playNote(noteName, 0.4);
    }

    // Hiệu ứng bấm nút ảo
    const keyBtn = document.querySelector(`.virtual-flute-key[data-note="${noteName}"]`);
    if (keyBtn) {
      keyBtn.classList.add('active-tap');
      setTimeout(() => keyBtn.classList.remove('active-tap'), 180);
    }

    const synthPitch = {
      hz: getFluteTargetHz(noteName),
      note_viet: noteName,
      octave: noteName.includes('2') ? 5 : 4,
      confidence: 1.0,
      rms: 0.15,
      is_silent: false,
      isSimulated: true
    };

    this.onAudioFrame(synthPitch);
  }

  /* ── Bắt đầu ván chơi ── */
  async startGame() {
    if (this.isPlaying) return;

    let micOk = true;
    if (window.hocsaoAudio) {
      try {
        micOk = await window.hocsaoAudio.start();
      } catch (e) {
        micOk = false;
      }
    }
    if (!micOk) {
      showToast('ℹ️ Đang vào game ở chế độ Bàn Phím (Phím 1-8 hoặc Chạm nút ảo)! Bạn có thể cho phép Micro để thổi sáo thật.', 'info', 4500);
      const banner = document.getElementById('mic-permission-banner');
      if (banner) banner.style.display = 'block';
    } else {
      const banner = document.getElementById('mic-permission-banner');
      if (banner) banner.style.display = 'none';

      // Khởi động MediaRecorder nếu người dùng đã bật thu âm
      if (this.recordEnabled && window._hocsao_stream && window.MediaRecorder) {
        try {
          this.recordedChunks = [];
          this.mediaRecorder = new MediaRecorder(window._hocsao_stream);
          this.mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) this.recordedChunks.push(e.data);
          };
          this.mediaRecorder.start(200);
        } catch (eRec) {
          console.warn('Không thể khởi động MediaRecorder:', eRec);
        }
      }
    }

    this.resize();
    this.isPlaying = true;
    this.isPaused = false;
    this.isDemoPlaying = false;

    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.perfectCount = 0;
    this.goodCount = 0;
    this.missCount = 0;
    this.activeNoteIndex = 0;
    this.holdTimerMs = 0;
    this.particles = [];
    this.floatingTexts = [];
    this.elapsedPlayTime = 0;
    this._lastMetroBeat = -1;

    this._prepareGameNotes();
    this._updateScoreUI();

    const btnPlay = document.getElementById('btn-game-play');
    if (btnPlay) {
      btnPlay.innerHTML = '<span>⏹</span> Dừng Lại';
      btnPlay.style.background = '#ef4444';
    }

    this.lastTime = performance.now();
    this._gameLoop(this.lastTime);

    const modeName = this.viewMode === 'staff' ? 'Khổ Nhạc 5 Dòng Kẻ' : 'Thác Nước Rơi';
    showToast(`🎮 Bắt đầu: ${this.currentSong.title} (${modeName})! Thổi sáo thật hoặc gõ phím 1-8.`, 'success', 3000);
  }

  stopGame() {
    this.isPlaying = false;
    this.isPaused = false;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

    // Dừng thu âm nếu đang chạy
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
        setTimeout(() => this._finalizeRecording(), 300);
      } catch (e) {}
    }

    const btnPlay = document.getElementById('btn-game-play');
    if (btnPlay) {
      btnPlay.innerHTML = '<span>▶</span> Bắt Đầu Chơi';
      btnPlay.style.background = 'var(--accent, #e6a23c)';
    }

    this._renderIdlePreview();
    showToast('Đã dừng ván chơi.', 'info', 1500);
  }

  /* Tạo bản nghe lại sau khi thu âm */
  _finalizeRecording() {
    if (this.recordedChunks.length === 0) return;
    try {
      const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
      if (this.lastRecordedBlobUrl) URL.revokeObjectURL(this.lastRecordedBlobUrl);
      this.lastRecordedBlobUrl = URL.createObjectURL(blob);

      const playbackCard = document.getElementById('recording-playback-card');
      const audioPlayer = document.getElementById('recorded-audio-player');
      const downloadLink = document.getElementById('recorded-audio-download');

      if (playbackCard && audioPlayer) {
        audioPlayer.src = this.lastRecordedBlobUrl;
        if (downloadLink) {
          downloadLink.href = this.lastRecordedBlobUrl;
          downloadLink.download = `HocSao_${this.currentSong.id}_${Date.now()}.webm`;
        }
        playbackCard.style.display = 'block';
        showToast('🎧 Bản thu âm tiếng sáo của bạn đã sẵn sàng để nghe lại!', 'success', 4000);
      }
    } catch (e) {
      console.warn('Lỗi xử lý file thu âm:', e);
    }
  }

  /* ── Vòng lặp chính Game Loop (60 FPS) ── */
  _gameLoop(time) {
    if (!this.isPlaying && !this.isDemoPlaying) return;

    const dt = Math.min(0.08, (time - this.lastTime) / 1000);
    this.lastTime = time;

    this._update(dt);
    this._renderCanvas();

    this.animFrameId = requestAnimationFrame(this._gameLoop.bind(this));
  }

  /* Cập nhật logic vị trí nốt và nhịp phách */
  _update(dt) {
    if (this.isPaused) return;

    const bpm = this.currentSong.bpm || 90;
    const speed = this.speedMultiplier;
    const beatsPerSec = (bpm / 60) * speed;

    this.elapsedPlayTime += dt * speed;
    const currentPlayingBeat = this.elapsedPlayTime * (bpm / 60);

    // Gõ nhịp Metronome (Tắc ở phách 1, Tùng ở phách 2)
    const intBeat = Math.floor(currentPlayingBeat);
    if (intBeat !== this._lastMetroBeat && intBeat >= 0) {
      this._lastMetroBeat = intBeat;
      const isDownbeat = (intBeat % 2 === 0);
      this.playMetronomeClick(isDownbeat);
    }

    // ── XỬ LÝ CHẾ ĐỘ 1: KHỔ NHẠC ĐI NGANG ──
    if (this.viewMode === 'staff') {
      const activeNote = this.gameNotes[this.activeNoteIndex];

      // Xử lý nốt lặng (Rest): tự động hoàn thành theo đúng thời gian phách nghỉ
      if (activeNote && activeNote.type === 'rest') {
        const screenX = this.hitLineX + (activeNote.staffX - this.scrollX);
        if (this.gameMode === 'wait') {
          const desiredScrollX = activeNote.staffX;
          this.scrollX += (desiredScrollX - this.scrollX) * Math.min(1.0, dt * 7.5);
          if (Math.abs(desiredScrollX - this.scrollX) < 4) {
            this.holdTimerMs += dt * 1000;
            const restTargetMs = (activeNote.dur * (60 / bpm)) * 1000;
            if (this.holdTimerMs >= restTargetMs) {
              activeNote.isHit = true;
              this.activeNoteIndex++;
              this.holdTimerMs = 0;
            }
          }
        } else {
          if (screenX <= this.hitLineX) {
            activeNote.isHit = true;
            this.activeNoteIndex++;
            this.holdTimerMs = 0;
          }
        }
      } else if (this.gameMode === 'wait') {
        // Chế độ Chờ: cuộn mượt đưa nốt mục tiêu vào đúng vạch phán định
        if (activeNote) {
          const desiredScrollX = activeNote.staffX;
          this.scrollX += (desiredScrollX - this.scrollX) * Math.min(1.0, dt * 7.5);
        }
      } else {
        // Chế độ Nhịp điệu: cuộn liên tục theo phách
        this.scrollX = currentPlayingBeat * this.pxPerBeat;

        // Tự động phán định Miss nếu nốt trôi qua vạch phán định quá 45px (không tính nốt lặng)
        if (activeNote && !activeNote.isHit && !activeNote.isMissed && activeNote.type !== 'rest') {
          const screenX = this.hitLineX + (activeNote.staffX - this.scrollX);
          if (screenX < this.hitLineX - 45) {
            this._triggerMiss(activeNote);
          }
        }
      }
    }

    // ── XỬ LÝ CHẾ ĐỘ 2: THÁC NƯỚC RƠI DỌC ──
    else {
      const speedY = 240 * speed * (bpm / 90);

      this.gameNotes.forEach(tile => {
        if (!tile.isHit) {
          if (this.gameMode === 'flow') {
            tile.y += speedY * dt;
            if (tile.y > this.hitLineY + 60 && !tile.isMissed) {
              this._triggerMiss(tile);
            }
          } else {
            const activeTile = this.gameNotes[this.activeNoteIndex];
            if (activeTile && activeTile === tile) {
              if (tile.y < this.hitLineY - tile.height) {
                tile.y += speedY * 1.5 * dt;
              } else {
                tile.y = this.hitLineY - tile.height;
              }
            }
          }
        }
      });
    }

    // Cập nhật hiệu ứng hạt pháo hoa nổ
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.alpha -= dt * 2.2;
      if (p.alpha <= 0) this.particles.splice(i, 1);
    }

    // Cập nhật chữ bay điểm số (PERFECT, GREAT...)
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= dt * 45;
      ft.alpha -= dt * 1.4;
      if (ft.alpha <= 0) this.floatingTexts.splice(i, 1);
    }

    // Kiểm tra hoàn thành bài hát
    if (this.activeNoteIndex >= this.gameNotes.length) {
      if (this.isPlaying) {
        if (this.loopEnabled) {
          // Lặp lại đoạn nếu bật A-B Looper
          setTimeout(() => {
            if (this.isPlaying) {
              this.activeNoteIndex = 0;
              this.scrollX = 0;
              this.elapsedPlayTime = 0;
              this._prepareGameNotes();
              showToast('🔁 Lặp lại đoạn đang tập! Thổi dẻo hơi tiếp nhé!', 'info', 2000);
            }
          }, 600);
        } else {
          setTimeout(() => this._handleGameVictory(), 600);
        }
      }
    }
  }

  /* ── Xử lý khi nhận luồng âm thanh từ Micro hoặc Phím Bàn Phím ── */
  onAudioFrame(pitchData) {
    if ((!this.isPlaying && !this.isDemoPlaying) || !pitchData || pitchData.is_silent) {
      this.holdTimerMs = 0;
      return;
    }

    const activeNote = this.gameNotes[this.activeNoteIndex];
    if (!activeNote || activeNote.isHit || activeNote.type === 'rest') return;

    const detectedNote = pitchData.note_viet;
    const targetNote = activeNote.note;
    const targetHz = getFluteTargetHz(targetNote);

    // Tính Cents offset (-50 đến +50)
    if (pitchData.hz && targetHz) {
      const cents = Math.round(1200 * Math.log2(pitchData.hz / targetHz));
      this.currentCents = Math.max(-50, Math.min(50, cents));
      this.currentRms = pitchData.rms || 0;
      this.lastDetectedNote = detectedNote;
      this._updateTunerUI(this.currentCents, detectedNote, targetNote);
    }

    // Kiểm tra nốt khớp (xét cả Tên Nốt và Quãng Tám Octave)
    const isMatched = isFluteNoteMatch(detectedNote, pitchData.octave, targetNote);

    // Ghi nhận điểm cho đường cao độ Pitch Contour (SoundCheck Style - Ảnh 2)
    if (this.viewMode === 'staff') {
      const cents = this.currentCents || 0;
      const absC = Math.abs(cents);
      let status = 'error';
      let tooltip = null;

      if (isMatched) {
        if (absC <= 20) {
          status = 'perfect'; // Xanh lá cây
        } else {
          status = 'warning'; // Cam (non hơi / già hơi)
          tooltip = cents < -20 ? 'Non hơi' : 'Già hơi';
        }
      } else if (detectedNote && detectedNote !== '—') {
        status = 'error'; // Đỏ (sai nốt hoặc sai quãng tám)
        tooltip = 'Wrong note';
      }

      this.pitchContourHistory.push({
        staffX: this.scrollX + this.hitLineX,
        cents: cents,
        status: status,
        tooltip: tooltip,
        rms: pitchData.rms || 0.05
      });

      if (this.pitchContourHistory.length > 700) {
        this.pitchContourHistory.shift();
      }
    }

    if (isMatched) {
      // ── KIỂM TRA KHOẢNG CÁCH ĐẾN VẠCH PHÁN ĐỊNH ──
      // Tuyệt đối không cho phép ăn điểm khi nốt chưa tới vạch!
      if (this.viewMode === 'staff') {
        const screenX = this.hitLineX + (activeNote.staffX - this.scrollX);
        const distToHit = screenX - this.hitLineX; // > 0 là nốt chưa tới vạch; < 0 là đã trôi qua
        const maxEarlyDist = (this.gameMode === 'wait') ? 24 : 32;
        const maxLateDist = (this.gameMode === 'wait') ? 24 : 36;

        if (distToHit > maxEarlyDist || distToHit < -maxLateDist) {
          // Nốt chưa tới vạch hoặc đã qua quá xa -> Chưa kích hoạt hit
          return;
        }
      } else {
        const tileHitY = activeNote.y + activeNote.height;
        const distY = this.hitLineY - tileHitY;
        const maxDistY = (this.gameMode === 'wait') ? 24 : 32;

        if (Math.abs(distY) > maxDistY) {
          // Chưa rơi tới vạch
          return;
        }
      }
      this.lastMatchedTime = performance.now();

      // Nếu là phím giả lập (bấm 1-8 hoặc click nút ảo), kích hoạt ăn điểm NGAY TỨC THÌ
      if (pitchData.isSimulated) {
        this._triggerHit(activeNote, true);
        return;
      }

      // Thổi sáo thật qua Micro: đo độ ổn định ~0.15s
      this.holdTimerMs += 45;
      if (this.holdTimerMs >= this.requiredHoldMs) {
        const isPerfect = Math.abs(this.currentCents) <= 18;
        this._triggerHit(activeNote, isPerfect);
        this.holdTimerMs = 0;
      }
    } else {
      this.holdTimerMs = Math.max(0, this.holdTimerMs - 30);
    }
  }

  /* Cập nhật đồng hồ kim đo cao độ trên giao diện */
  _updateTunerUI(cents, detectedNote, targetNote) {
    const tunerNeedle = document.getElementById('cents-needle');
    const tunerText = document.getElementById('cents-text-val');
    const tunerStatus = document.getElementById('cents-status-msg');

    if (tunerNeedle) {
      // Cents dao động từ -50 đến +50, map thành góc quay hoặc %
      const percent = Math.max(5, Math.min(95, 50 + cents));
      tunerNeedle.style.left = `${percent}%`;
    }

    if (tunerText) {
      const sign = cents > 0 ? `+${cents}` : `${cents}`;
      tunerText.textContent = `${sign} cents`;
      tunerText.style.color = Math.abs(cents) <= 12 ? '#3fb950' : (cents < 0 ? '#eab308' : '#f97316');
    }

    if (tunerStatus) {
      if (Math.abs(cents) <= 12) {
        tunerStatus.innerHTML = '<span style="color:#3fb950;font-weight:800;">🎯 Chuẩn Cao Độ!</span>';
      } else if (cents < -12) {
        tunerStatus.innerHTML = '<span style="color:#eab308;font-weight:700;">◄ Hơi non (Thổi mạnh thêm)</span>';
      } else {
        tunerStatus.innerHTML = '<span style="color:#f97316;font-weight:700;">► Hơi già (Xoay sáo vào trong)</span>';
      }
    }
  }

  /* Kích hoạt ăn điểm khi thổi trúng nốt */
  _triggerHit(tile, isPerfect = true) {
    if (!tile || tile.isHit) return;
    tile.isHit = true;

    const points = isPerfect ? 100 : 70;
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;

    const comboBonus = Math.min(50, Math.floor(this.combo / 5) * 10);
    this.score += (points + comboBonus);

    if (isPerfect) this.perfectCount++;
    else this.goodCount++;

    this._updateScoreUI();

    // Lời động viên vui vẻ mỗi khi đạt mốc combo
    if (this.combo > 0 && this.combo % 5 === 0) {
      const cheerIdx = Math.floor(Math.random() * CHEER_MESSAGES.length);
      showToast(`🔥 Combo x${this.combo}: ${CHEER_MESSAGES[cheerIdx]}`, 'success', 2200);
    }

    // Tọa độ nổ hạt hiệu ứng
    let effectX, effectY;
    if (this.viewMode === 'staff') {
      effectX = this.hitLineX;
      effectY = this._getStaffYForNote(tile.note);
    } else {
      effectX = this.width / 2;
      effectY = this.hitLineY;
    }

    this._spawnHitParticles(effectX, effectY, isPerfect ? '#ffd700' : '#3fb950');
    this._spawnFloatingText(isPerfect ? `PERFECT ✨ +${points + comboBonus}` : `GREAT 🌟 +${points}`, effectX, effectY - 20, isPerfect ? '#ffd700' : '#3fb950');

    // Âm thanh chúc mừng
    if (window.bambooFluteEngine) {
      window.bambooFluteEngine.playChime('step');
    }

    this.activeNoteIndex++;
    this.holdTimerMs = 0;
  }

  /* Kích hoạt Miss khi nốt trôi qua mà không thổi kịp */
  _triggerMiss(tile) {
    if (!tile || tile.isHit || tile.isMissed) return;
    tile.isMissed = true;
    this.missCount++;
    this.combo = 0;
    this._updateScoreUI();

    const effectX = (this.viewMode === 'staff') ? this.hitLineX - 30 : this.width / 2;
    const effectY = (this.viewMode === 'staff') ? this._getStaffYForNote(tile.note) : this.hitLineY + 20;

    this._spawnFloatingText('MISS 💔', effectX, effectY, '#ef4444');
    this.activeNoteIndex++;
    this.holdTimerMs = 0;
  }

  _spawnHitParticles(x, y, color) {
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4.5 + 2.0;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 4.0 + 2.0,
        color: color,
        alpha: 1.0
      });
    }
  }

  _spawnFloatingText(text, x, y, color) {
    this.floatingTexts.push({
      text: text,
      x: x,
      y: y,
      color: color,
      alpha: 1.0
    });
  }

  _updateScoreUI() {
    const scoreEl = document.getElementById('game-score-val');
    const comboEl = document.getElementById('game-combo-val');
    if (scoreEl) scoreEl.textContent = this.score.toLocaleString('vi-VN');
    if (comboEl) {
      comboEl.textContent = `x${this.combo}`;
      comboEl.style.color = this.combo > 5 ? '#ffd700' : 'var(--accent, #e6a23c)';
    }
  }

  /* Tính tọa độ Y chuẩn xác của nốt trên 5 dòng kẻ khuông nhạc */
  _getStaffYForNote(noteName) {
    const staffCenterY = 135; // Đặt khuông nhạc ở nửa trên canvas
    const lineSpacing = 16;
    const stepH = lineSpacing / 2; // 8px mỗi nấc dòng/khe

    // Line 1 (Mi 1) nằm ở staffCenterY + 32px
    const yLine1 = staffCenterY + 32;

    const s = (noteName || 'Sol').trim();
    if (s.includes('Đô 1') || s === 'Đô' || s === 'Do') return yLine1 + stepH * 2; // Ledger line dưới (-2 steps)
    if (s.includes('Rê 1') || s === 'Rê' || s === 'Re') return yLine1 + stepH * 1; // Ngay dưới dòng 1 (-1 step)
    if (s.includes('Mi 1') || s === 'Mi') return yLine1;                           // Trên Dòng 1 (0 step)
    if (s.includes('Fa 1') || s === 'Fa') return yLine1 - stepH * 1;               // Khe 1 (+1 step)
    if (s.includes('Sol 1') || s === 'Sol') return yLine1 - stepH * 2;             // Trên Dòng 2 (+2 steps)
    if (s.includes('La 1') || s === 'La') return yLine1 - stepH * 3;               // Khe 2 (+3 steps)
    if (s.includes('Si 1') || s === 'Si' || s.includes('Sib')) return yLine1 - stepH * 4; // Trên Dòng 3 (+4 steps)
    if (s.includes('Đô 2') || s === 'Đô2') return yLine1 - stepH * 5;              // Khe 3 (+5 steps)
    if (s.includes('Rê 2') || s === 'Rê2') return yLine1 - stepH * 6;              // Trên Dòng 4 (+6 steps)
    if (s.includes('Mi 2') || s === 'Mi2') return yLine1 - stepH * 7;              // Khe 4 (+7 steps)

    return yLine1 - stepH * 2; // Mặc định Sol 1
  }

  /* ============================================================
     VẼ KHUNG HÌNH CHÍNH (RENDER CANVAS)
     ============================================================ */
  _renderCanvas() {
    const { ctx, width: w, height: h } = this;
    if (!w || !h) return;

    ctx.clearRect(0, 0, w, h);

    if (this.viewMode === 'staff') {
      this._renderHorizontalStaff(ctx, w, h);
    } else {
      this._renderVerticalHighway(ctx, w, h);
    }

    // Vẽ hạt nổ pháo hoa
    this.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Vẽ chữ bay điểm số (PERFECT, GREAT...)
    this.floatingTexts.forEach(ft => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.fillStyle = ft.color;
      ctx.font = '900 16px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 12;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });
  }

  /* ── 1. RENDER KHỔ NHẠC 5 DÒNG KẺ CUỘN NGANG & CÂY SÁO TRÚC 3D TRỰC QUAN ── */
  _renderHorizontalStaff(ctx, w, h) {
    const staffCenterY = 135;
    const lineSpacing = 16;
    const yTop = staffCenterY - 32;    // Dòng 5 (Fa 2)
    const yBottom = staffCenterY + 32; // Dòng 1 (Mi 1)

    // A. Nền giấy nhạc cổ truyền cao cấp (Giấy dó sẫm / Warm Parchment Lantern)
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#100e0a');
    bgGrad.addColorStop(0.35, '#17140f');
    bgGrad.addColorStop(0.65, '#1a1611');
    bgGrad.addColorStop(1, '#0e0b07');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // B. Vùng sáng tiêu điểm ở khuông nhạc
    const staffGlow = ctx.createLinearGradient(0, yTop - 25, 0, yBottom + 70);
    staffGlow.addColorStop(0, 'rgba(230, 162, 60, 0.04)');
    staffGlow.addColorStop(0.5, 'rgba(255, 215, 0, 0.07)');
    staffGlow.addColorStop(1, 'rgba(230, 162, 60, 0.02)');
    ctx.fillStyle = staffGlow;
    ctx.fillRect(0, yTop - 25, w, (yBottom - yTop) + 95);

    // C. 5 DÒNG KẺ KHUÔNG NHẠC CHUẨN XÁC
    ctx.lineWidth = 1.3;
    for (let i = 0; i < 5; i++) {
      const lineY = yTop + i * lineSpacing;
      ctx.strokeStyle = (i === 1 || i === 3) ? 'rgba(255, 235, 180, 0.5)' : 'rgba(255, 235, 180, 0.38)';
      ctx.beginPath();
      ctx.moveTo(0, lineY);
      ctx.lineTo(w, lineY);
      ctx.stroke();
    }

    // D. VẠCH CHIA Ô NHỊP & SỐ Ô NHỊP (MEASURE BARS)
    const totalBeats = Math.max(40, this.gameNotes[this.gameNotes.length - 1]?.beatEnd || 40);
    const beatsPerMeasure = 2; // Nhịp 2/4
    const totalMeasures = Math.ceil(totalBeats / beatsPerMeasure) + 4;

    ctx.save();
    for (let m = 0; m <= totalMeasures; m++) {
      const beatNum = m * beatsPerMeasure;
      const barX = this.hitLineX + (beatNum * this.pxPerBeat - this.scrollX);

      if (barX >= -50 && barX <= w + 50) {
        if (m === 21) {
          // Vạch nhịp kép kết thúc bài ở Ô 21 (Double barline)
          ctx.strokeStyle = 'rgba(255, 220, 150, 0.8)';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(barX - 4, yTop);
          ctx.lineTo(barX - 4, yBottom);
          ctx.stroke();

          ctx.lineWidth = 3.6;
          ctx.beginPath();
          ctx.moveTo(barX, yTop);
          ctx.lineTo(barX, yBottom);
          ctx.stroke();

          ctx.fillStyle = '#ffd700';
          ctx.font = '800 11px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('KẾT', barX - 10, yTop - 9);
        } else {
          // Vạch nhịp đơn bình thường
          ctx.strokeStyle = 'rgba(255, 220, 150, 0.28)';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(barX, yTop);
          ctx.lineTo(barX, yBottom);
          ctx.stroke();

          // Số thứ tự ô nhịp
          ctx.fillStyle = 'rgba(255, 220, 150, 0.65)';
          ctx.font = '700 11px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`Ô ${m + 1}`, barX + 22, yTop - 9);
        }
      }
    }
    ctx.restore();

    // E. VẼ CÁC NỐT NHẠC DI CHUYỂN
    this.gameNotes.forEach((tile, idx) => {
      const screenX = this.hitLineX + (tile.staffX - this.scrollX);

      // Chỉ vẽ những nốt nằm trong màn hình
      if (screenX < -80 || screenX > w + 80) return;

      const distToHit = screenX - this.hitLineX;
      const absDistToHit = Math.abs(distToHit);

      // NỐT CHỈ SÁNG KHI THỰC SỰ CHẠM ĐÚNG VÀO VẠCH PHÁN ĐỊNH (TRONG PHẠM VI 12px)
      // Khắc phục triệt để lỗi "thanh chưa tới mà nốt đã sáng": khi nốt ở xa giữ nguyên màu trắng chuẩn nhạc lý!
      const isAtHitLine = (idx === this.activeNoteIndex) && (absDistToHit <= 12);
      const isApproaching = false;

      const isCurrent = isAtHitLine;
      const isPast = (idx < this.activeNoteIndex);
      const noteY = this._getStaffYForNote(tile.note);
      const col = LANE_COLORS[tile.note] || { bg: '#ffd700', glow: 'rgba(255, 215, 0, 0.7)' };

      ctx.save();

      // 1. KÝ HIỆU DẤU LẶNG ĐEN 𝄽 (QUARTER REST) CHUẨN XÁC
      if (tile.type === 'rest' || tile.note === 'Lặng') {
        ctx.save();
        ctx.strokeStyle = isAtHitLine ? '#ffd700' : 'rgba(255, 235, 180, 0.88)';
        ctx.fillStyle = isAtHitLine ? '#ffd700' : 'rgba(255, 235, 180, 0.88)';
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Vẽ ký hiệu dấu lặng đen chuẩn khuông nhạc
        ctx.beginPath();
        ctx.moveTo(screenX - 4, staffCenterY - 14);
        ctx.lineTo(screenX + 4, staffCenterY - 6);
        ctx.lineTo(screenX - 4, staffCenterY + 2);
        ctx.lineTo(screenX + 4, staffCenterY + 8);
        ctx.quadraticCurveTo(screenX + 2, staffCenterY + 15, screenX - 3, staffCenterY + 13);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 220, 150, 0.75)';
        ctx.font = '700 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('𝄽 Lặng', screenX, yBottom + 26);

        ctx.restore();
        return; // Đã vẽ dấu lặng xong, không vẽ thân/đuôi nốt
      }

      // Nốt Đô 1 (ở dưới dòng 1): Vẽ DÒNG KẺ PHỤ NGANG THÂN NỐT
      if (tile.note.includes('Đô 1') || tile.note === 'Đô' || tile.note === 'Do') {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(screenX - 13, noteY);
        ctx.lineTo(screenX + 13, noteY);
        ctx.stroke();
      }

      // ĐẦU NỐT HÌNH OVAL CHUẨN KÝ ÂM 3D (OVAL TILTED)
      ctx.save();
      ctx.translate(screenX, noteY);
      ctx.rotate(-0.35); // Nghiêng góc ký âm chuẩn
      ctx.beginPath();
      ctx.ellipse(0, 0, 8.5, 6.0, 0, 0, Math.PI * 2);

      // CHỈ PHÁT SÁNG KHI NỐT CHẠM ĐÚNG VÀO VẠCH PHÁN ĐỊNH
      if (tile.isHit) {
        ctx.shadowColor = '#3fb950';
        ctx.shadowBlur = 16;
      } else if (isAtHitLine) {
        ctx.shadowColor = col.glow || '#ffd700';
        ctx.shadowBlur = 22;
      } else {
        ctx.shadowBlur = 0;
      }

      if (tile.isHit) {
        ctx.fillStyle = '#3fb950'; // Đã thổi trúng: màu xanh lá
        ctx.fill();
      } else if (tile.dur >= 2.0) {
        // Nốt trắng: rỗng ruột viền sáng óng khi chạm vạch
        ctx.strokeStyle = isAtHitLine ? '#ffd700' : '#ffffff';
        ctx.lineWidth = 2.8;
        ctx.stroke();
      } else {
        // Nốt đen / móc đơn: CHỈ đổi màu khi chạm đúng vạch, còn ở xa giữ màu trắng thuần khiết
        ctx.fillStyle = isAtHitLine ? (col.bg || '#ffd700') : '#ffffff';
        ctx.fill();
      }
      ctx.restore();

      // ĐUÔI NỐT (STEM)
      ctx.strokeStyle = isAtHitLine ? '#ffd700' : 'rgba(255, 255, 255, 0.88)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      if (noteY >= staffCenterY) {
        ctx.moveTo(screenX + 7.5, noteY);
        ctx.lineTo(screenX + 7.5, noteY - 34);
        ctx.stroke();

        // CỜ MÓC NỐT (FLAG) nếu là nốt móc đơn (dur <= 0.5)
        if (tile.dur <= 0.5) {
          ctx.beginPath();
          ctx.moveTo(screenX + 7.5, noteY - 34);
          ctx.bezierCurveTo(screenX + 16, noteY - 26, screenX + 18, noteY - 14, screenX + 10, noteY - 8);
          ctx.stroke();
        }
        // CỜ MÓC THỨ 2 nếu là nốt móc kép 16th (dur <= 0.25)
        if (tile.dur <= 0.25) {
          ctx.beginPath();
          ctx.moveTo(screenX + 7.5, noteY - 26);
          ctx.bezierCurveTo(screenX + 15, noteY - 19, screenX + 17, noteY - 10, screenX + 9, noteY - 5);
          ctx.stroke();
        }
      } else {
        ctx.moveTo(screenX - 7.5, noteY);
        ctx.lineTo(screenX - 7.5, noteY + 34);
        ctx.stroke();

        if (tile.dur <= 0.5) {
          ctx.beginPath();
          ctx.moveTo(screenX - 7.5, noteY + 34);
          ctx.bezierCurveTo(screenX + 2, noteY + 26, screenX + 4, noteY + 14, screenX - 4, noteY + 8);
          ctx.stroke();
        }
        if (tile.dur <= 0.25) {
          ctx.beginPath();
          ctx.moveTo(screenX - 7.5, noteY + 26);
          ctx.bezierCurveTo(screenX + 2, noteY + 19, screenX + 4, noteY + 10, screenX - 4, noteY + 5);
          ctx.stroke();
        }
      }

      // DẤU CHẤM DÔI (DOT) nếu là nốt chấm dôi (dur = 1.5, 0.75 hoặc isDotted)
      if (tile.isDotted || tile.dur === 1.5 || tile.dur === 0.75) {
        ctx.fillStyle = isAtHitLine ? '#ffd700' : '#ffffff';
        ctx.beginPath();
        const dotY = (Math.abs(noteY - staffCenterY) % lineSpacing < 3) ? (noteY - 4) : noteY;
        ctx.arc(screenX + 14, dotY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // DẤU LẤY HƠI / NGẮT CÂU (BREATH MARK COMMA ',')
      if (tile.breath) {
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 22px "Times New Roman", Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText(',', screenX + 16, yTop - 5);
      }

      // DẤU NỐI / DẤU LUYẾN SANG NỐT KẾ TIẾP (TIE / SLUR CURVE)
      if (tile.tieToNext || tile.slurToNext) {
        const nextTile = this.gameNotes[idx + 1];
        if (nextTile) {
          const nextScreenX = this.hitLineX + (nextTile.staffX - this.scrollX);
          const nextNoteY = this._getStaffYForNote(nextTile.note);
          ctx.strokeStyle = tile.tieToNext ? 'rgba(255, 215, 0, 0.85)' : 'rgba(126, 231, 135, 0.85)';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          const tieY = Math.max(noteY, nextNoteY) + 11;
          const midX = (screenX + nextScreenX) / 2;
          ctx.moveTo(screenX + 4, noteY + 7);
          ctx.quadraticCurveTo(midX, tieY + 8, nextScreenX - 4, nextNoteY + 7);
          ctx.stroke();
        }
      }

      // DẤU GIÁNG ♭ nếu là nốt Sib
      if (tile.note.includes('Sib') || tile.note.includes('giáng')) {
        ctx.fillStyle = '#ffd700';
        ctx.font = '700 16px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('♭', screenX - 12, noteY + 5);
      }

      // TÊN NỐT TIẾNG VIỆT TO RÕ BÊN DƯỚI DÒNG KẺ 1
      ctx.fillStyle = isAtHitLine ? '#ffd700' : (tile.isHit ? '#3fb950' : '#ffffff');
      ctx.font = isAtHitLine ? '900 16px Inter, sans-serif' : '800 14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(tile.note, screenX, yBottom + 26);

      // LỜI BÀI HÁT IN ĐẬM RÕ RÀNG
      if (tile.lyric) {
        ctx.fillStyle = isAtHitLine ? '#7ee787' : (tile.isHit ? '#3fb950' : 'rgba(255, 255, 255, 0.85)');
        ctx.font = isAtHitLine ? '800 14px Inter, sans-serif' : '700 13px Inter, sans-serif';
        ctx.fillText(`"${tile.lyric}"`, screenX, yBottom + 45);
      }

      ctx.restore();
    });

    // E.2. ĐƯỜNG CAO ĐỘ & SÓNG ÂM THANH THỜI GIAN THỰC (SOUNDCHECK STYLE - ẢNH 2)
    ctx.save();
    const ribbonY = yBottom + 72; // Vị trí tâm dải sóng âm
    const ribbonH = 34;

    // Dải băng nền sóng âm mờ dưới khuông nhạc
    ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.fillRect(0, ribbonY - ribbonH / 2, w, ribbonH);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, ribbonY);
    ctx.lineTo(w, ribbonY);
    ctx.stroke();

    // Nhãn SoundCheck Live Feedback
    ctx.font = '700 9px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.textAlign = 'left';
    ctx.fillText('SOUNDCHECK LIVE PITCH CONTOUR', this.hitLineX + 16, ribbonY - 10);

    // Vẽ đường cong cao độ liên tục chạy qua các nốt
    if (this.pitchContourHistory && this.pitchContourHistory.length > 1) {
      for (let i = 1; i < this.pitchContourHistory.length; i++) {
        const p1 = this.pitchContourHistory[i - 1];
        const p2 = this.pitchContourHistory[i];

        const x1 = p1.staffX - this.scrollX;
        const x2 = p2.staffX - this.scrollX;

        // Chỉ vẽ đoạn nằm trong màn hình
        if (x2 < -20 || x1 > w + 20) continue;

        const y1 = ribbonY - (p1.cents / 50) * 14;
        const y2 = ribbonY - (p2.cents / 50) * 14;

        let strokeCol = '#22c55e'; // Green
        let glowCol = 'rgba(34, 197, 94, 0.5)';
        if (p2.status === 'warning') {
          strokeCol = '#f59e0b';   // Orange
          glowCol = 'rgba(245, 158, 11, 0.5)';
        } else if (p2.status === 'error') {
          strokeCol = '#ef4444';   // Red
          glowCol = 'rgba(239, 68, 68, 0.5)';
        }

        ctx.strokeStyle = strokeCol;
        ctx.shadowColor = glowCol;
        ctx.shadowBlur = 6;
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Bong bóng Tooltip "Wrong note" nếu có lỗi (chỉ vẽ tại các mốc thưa)
        if (p2.tooltip && i % 8 === 0 && x2 >= this.hitLineX - 60 && x2 <= w - 40) {
          ctx.save();
          ctx.shadowBlur = 0;
          ctx.font = '800 10px Inter, sans-serif';
          const tipWidth = ctx.measureText(p2.tooltip).width + 14;
          const tipY = y2 - 20;

          // Hộp đen bo góc viền đỏ
          ctx.fillStyle = '#0f172a';
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.roundRect(x2 - tipWidth / 2, tipY - 14, tipWidth, 18, 5);
          ctx.fill();
          ctx.stroke();

          // Mũi tên nhỏ trỏ xuống đường sóng
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.moveTo(x2 - 4, tipY + 4);
          ctx.lineTo(x2 + 4, tipY + 4);
          ctx.lineTo(x2, tipY + 8);
          ctx.closePath();
          ctx.fill();

          // Chữ tooltip
          ctx.fillStyle = '#fca5a5';
          ctx.textAlign = 'center';
          ctx.fillText(p2.tooltip, x2, tipY);
          ctx.restore();
        }
      }
    }
    ctx.restore();

    // F. VẠCH PHÁN ĐỊNH (HIT LINE) PHÁT SÁNG CỐ ĐỊNH Ở X = hitLineX
    ctx.save();
    ctx.strokeStyle = '#e6a23c';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(230, 162, 60, 0.9)';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(this.hitLineX, yTop - 25);
    ctx.lineTo(this.hitLineX, yBottom + 55);
    ctx.stroke();

    // Mũi tên định hướng trên đỉnh vạch phán định
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#e6a23c';
    ctx.beginPath();
    ctx.moveTo(this.hitLineX, yTop - 12);
    ctx.lineTo(this.hitLineX - 8, yTop - 26);
    ctx.lineTo(this.hitLineX + 8, yTop - 26);
    ctx.closePath();
    ctx.fill();

    ctx.font = '800 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('🎯 VẠCH THỔI', this.hitLineX, yTop - 32);
    ctx.restore();

    // G. KHÓA SOL (TREBLE CLEF) & SỐ CHỈ NHỊP CỐ ĐỊNH Ở ĐẦU KHUÔNG (X = 0..160)
    const headCover = ctx.createLinearGradient(0, 0, this.hitLineX, 0);
    headCover.addColorStop(0, 'rgba(16, 14, 10, 0.98)');
    headCover.addColorStop(0.75, 'rgba(16, 14, 10, 0.88)');
    headCover.addColorStop(1, 'rgba(16, 14, 10, 0.0)');
    ctx.fillStyle = headCover;
    ctx.fillRect(0, 0, this.hitLineX, 260);

    // Vẽ lại 5 dòng kẻ cố định bên trái
    ctx.lineWidth = 1.3;
    for (let i = 0; i < 5; i++) {
      const lineY = yTop + i * lineSpacing;
      ctx.strokeStyle = 'rgba(255, 235, 180, 0.45)';
      ctx.beginPath();
      ctx.moveTo(0, lineY);
      ctx.lineTo(this.hitLineX, lineY);
      ctx.stroke();
    }

    // Biểu tượng Khóa Sol (𝄞)
    ctx.fillStyle = '#ffd700';
    ctx.font = '900 52px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('𝄞', 42, staffCenterY + 4);

    // Số chỉ nhịp 2/4
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 20px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('2', 85, staffCenterY - 12);
    ctx.fillText('4', 85, staffCenterY + 16);

    // Vạch ngăn đầu khuông nhạc
    ctx.strokeStyle = 'rgba(255, 235, 180, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(108, yTop);
    ctx.lineTo(108, yBottom);
    ctx.stroke();

    // ── H. RENDER CÂY SÁO TRÚC VIỆT NAM 3D TRỰC QUAN (PHÍA DƯỚI CANVAS) ──
    this._renderInteractiveBambooFlute(ctx, w, h);
  }

  /* ── VẼ CÂY SÁO TRÚC VIỆT NAM 3D TRỰC QUAN & 6 LỖ BẤM ĐỘNG ── */
  _renderInteractiveBambooFlute(ctx, w, h) {
    const activeNote = this.gameNotes[this.activeNoteIndex];
    const targetNoteName = activeNote ? activeNote.note : (this.currentSong.notes[0]?.note || 'Sol');
    const targetFingering = FINGERINGS_GAME[targetNoteName] || [true, true, false, false, false, false];

    // Xác định xem người dùng có đang thổi đúng nốt không
    const isRecentlyMatched = (performance.now() - this.lastMatchedTime) < 300;

    // Vị trí thân sáo
    const fluteY = h - 90;
    const fluteH = 34;
    const fluteX1 = 40;
    const fluteX2 = w - 40;
    const fluteW = fluteX2 - fluteX1;

    ctx.save();

    // 1. Khung nền đỡ sáo (Bamboo Stand Background)
    const standGrad = ctx.createLinearGradient(0, fluteY - 50, 0, h);
    standGrad.addColorStop(0, 'rgba(0, 0, 0, 0.35)');
    standGrad.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
    ctx.fillStyle = standGrad;
    ctx.fillRect(0, fluteY - 50, w, h - (fluteY - 50));

    // Đường viền ngăn cách trang nhã
    ctx.strokeStyle = 'rgba(230, 162, 60, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, fluteY - 48);
    ctx.lineTo(w - 20, fluteY - 48);
    ctx.stroke();

    // 2. Thân sáo tre trúc (Vàng óng tre mộc với ánh sáng trụ 3D)
    const tubeGrad = ctx.createLinearGradient(0, fluteY, 0, fluteY + fluteH);
    tubeGrad.addColorStop(0, '#a16207');   // Vàng sẫm tre già
    tubeGrad.addColorStop(0.3, '#d97706'); // Vàng hổ phách
    tubeGrad.addColorStop(0.5, '#fde68a'); // Ánh sáng bóng trụ
    tubeGrad.addColorStop(0.8, '#b45309');
    tubeGrad.addColorStop(1, '#78350f');
    ctx.fillStyle = tubeGrad;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(fluteX1, fluteY, fluteW, fluteH, 8);
    } else {
      ctx.rect(fluteX1, fluteY, fluteW, fluteH);
    }
    ctx.fill();

    // Viền kim loại đầu sáo & đuôi sáo
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(fluteX1, fluteY, 8, fluteH);
    ctx.fillRect(fluteX2 - 8, fluteY, 8, fluteH);

    // Các mắt tre (Bamboo nodes / khớp tre tự nhiên)
    const nodeXs = [
      fluteX1 + fluteW * 0.18,
      fluteX1 + fluteW * 0.45,
      fluteX1 + fluteW * 0.78
    ];
    nodeXs.forEach(nx => {
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(nx, fluteY - 1);
      ctx.lineTo(nx, fluteY + fluteH + 1);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(254, 243, 199, 0.6)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(nx + 2, fluteY);
      ctx.lineTo(nx + 2, fluteY + fluteH);
      ctx.stroke();
    });

    // 3. Lỗ thổi (Embouchure Hole) ở đầu bên trái
    const blowHoleX = fluteX1 + 55;
    const blowHoleY = fluteY + fluteH / 2;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(blowHoleX, blowHoleY, 11, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Nhãn "Lỗ Thổi"
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = '700 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🌬️ Lỗ Thổi', blowHoleX, fluteY - 12);

    // Luồng hơi thở phát sáng nếu người chơi đang thổi
    if (isRecentlyMatched) {
      ctx.save();
      ctx.fillStyle = 'rgba(52, 211, 153, 0.45)';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(blowHoleX, blowHoleY, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 4. 6 Lỗ bấm sáo trúc (Lỗ 1 đến Lỗ 6)
    // Tách thành 2 nhóm: Tay Trái (Lỗ 1, 2, 3) và Tay Phải (Lỗ 4, 5, 6)
    const holeStartX = fluteX1 + Math.max(160, fluteW * 0.28);
    const holeAvailableW = fluteX2 - holeStartX - 30;
    const holeSpacing = Math.min(65, holeAvailableW / 6.5);

    // Nhãn phân biệt tay
    const leftHandCenterX = holeStartX + holeSpacing * 1.0;
    const rightHandCenterX = holeStartX + holeSpacing * 4.2;

    ctx.fillStyle = '#fde68a';
    ctx.font = '800 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✋ TAY TRÁI (Lỗ 1 - 2 - 3)', leftHandCenterX, fluteY - 14);
    ctx.fillText('🤚 TAY PHẢI (Lỗ 4 - 5 - 6)', rightHandCenterX, fluteY - 14);

    for (let h = 0; h < 6; h++) {
      // Có khoảng cách nghỉ rộng hơn giữa Lỗ 3 và Lỗ 4 (giữa 2 tay)
      const gapBonus = h >= 3 ? 16 : 0;
      const hx = holeStartX + h * holeSpacing + gapBonus;
      const hy = fluteY + fluteH / 2;
      const isClosed = targetFingering[h];

      ctx.save();

      // Nền lòng lỗ khoét sâu vào thân tre
      ctx.fillStyle = '#0a0d14';
      ctx.beginPath();
      ctx.arc(hx, hy, 10, 0, Math.PI * 2);
      ctx.fill();

      // Trạng thái lỗ ngón tay
      if (isRecentlyMatched) {
        // Người dùng đang thổi đúng: Sáng xanh ngọc bích rực rỡ!
        ctx.fillStyle = '#10b981';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(hx, hy, isClosed ? 8.5 : 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (isClosed) {
        // Cần bịt kín: Chấm đỏ cam hổ phách
        ctx.fillStyle = '#f97316';
        ctx.shadowColor = 'rgba(249, 115, 22, 0.8)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(hx, hy, 8.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Cần mở: Vòng tròn rỗng
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(hx, hy, 8.5, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // Số thứ tự lỗ & trạng thái (Bịt / Mở)
      ctx.fillStyle = isClosed ? '#fb923c' : 'rgba(255, 255, 255, 0.55)';
      ctx.font = '700 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`L${h + 1}`, hx, fluteY + fluteH + 16);
      ctx.font = '600 10px Inter, sans-serif';
      ctx.fillText(isClosed ? 'Bịt' : 'Mở', hx, fluteY + fluteH + 28);
    }

    // 5. Câu chỉ dẫn thế bấm tổng quát ở góc trái dưới
    ctx.fillStyle = '#ffd700';
    ctx.font = '800 12px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`👉 Thế bấm nốt "${targetNoteName}":`, fluteX1 + 10, fluteY - 32);

    // Tóm tắt ngón bấm
    let closedCount = targetFingering.filter(Boolean).length;
    let summaryText = closedCount === 6 ? 'Bịt kín cả 6 lỗ' : (closedCount === 0 ? 'Mở cả 6 lỗ' : `Bịt ${closedCount} lỗ`);
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 12px Inter, sans-serif';
    ctx.fillText(`(${summaryText})`, fluteX1 + 160, fluteY - 32);

    ctx.restore();
  }

  /* ── 2. RENDER THÁC NƯỚC RƠI DỌC (VERTICAL HIGHWAY) ── */
  _renderVerticalHighway(ctx, w, h) {
    const gradBg = ctx.createLinearGradient(0, 0, 0, h);
    gradBg.addColorStop(0, '#0e121a');
    gradBg.addColorStop(1, '#161b24');
    ctx.fillStyle = gradBg;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const laneW = w / 4;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(i * laneW, 0);
      ctx.lineTo(i * laneW, h);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(230, 162, 60, 0.9)';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(230, 162, 60, 0.8)';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(20, this.hitLineY);
    ctx.lineTo(w - 20, this.hitLineY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(230, 162, 60, 0.95)';
    ctx.font = '700 11px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('🎯 VẠCH THỔI CHUẨN', w - 24, this.hitLineY - 8);

    this.gameNotes.forEach((tile, idx) => {
      if (tile.y + tile.height < -50 || tile.y > h + 50 || tile.isHit) return;

      const tileHitY = tile.y + tile.height;
      const distY = this.hitLineY - tileHitY;
      const absDistY = Math.abs(distY);
      // Chỉ sáng khi viên gạch chạm vào vạch phán định
      const isAtHitLine = (idx === this.activeNoteIndex) && (absDistY <= 26);

      const col = LANE_COLORS[tile.note] || { bg: '#3b82f6', glow: 'rgba(59, 130, 246, 0.6)', text: '#fff' };
      const tileW = Math.min(260, w * 0.58);
      const tileX = (w - tileW) / 2;

      ctx.save();
      if (isAtHitLine) {
        ctx.shadowColor = col.glow;
        ctx.shadowBlur = 26;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = col.bg;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(tileX, tile.y, tileW, tile.height, 10);
      } else {
        ctx.rect(tileX, tile.y, tileW, tile.height);
      }
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = col.text || '#ffffff';
      ctx.font = '900 17px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(tile.note, w / 2, tile.y + 24);

      if (tile.lyric) {
        ctx.font = '700 13px Inter, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`"${tile.lyric}"`, w / 2, tile.y + 44);
      }
      ctx.restore();
    });
  }

  /* ── Màn hình chờ khi chưa bắt đầu ── */
  _renderIdlePreview() {
    const { ctx, width: w, height: h } = this;
    if (!w || !h) return;

    this._prepareGameNotes();
    this.scrollX = 0;
    this._renderCanvas();

    ctx.save();
    ctx.fillStyle = 'rgba(10, 8, 5, 0.68)';
    ctx.fillRect(0, 0, w, h);

    const modeName = this.viewMode === 'staff' ? 'Khổ Nhạc 5 Dòng Kẻ' : 'Thác Nước Rơi';

    ctx.fillStyle = '#ffd700';
    ctx.font = '900 24px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`🎶 ${this.currentSong.title}`, w / 2, h / 2 - 28);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 15px Inter, sans-serif';
    ctx.fillText(`Chế độ: ${modeName} · Nhịp ${this.currentSong.meter || '2/4'} (${this.currentSong.bpm} BPM)`, w / 2, h / 2 + 4);

    ctx.fillStyle = 'var(--text-sec, #cbd5e1)';
    ctx.font = '500 13px Inter, sans-serif';
    ctx.fillText('👉 Bấm "BẮT ĐẦU CHƠI" (hoặc "NGHE BẢN MẪU") để hòa nhịp cùng tiếng sáo trúc!', w / 2, h / 2 + 32);

    ctx.restore();
  }

  /* ── Phát toàn bộ bản nhạc mẫu bằng engine sáo trúc ── */
  async playSongDemo() {
    if (this.isDemoPlaying || !window.bambooFluteEngine) return;
    this.isDemoPlaying = true;
    this.isPlaying = false;

    const btnDemo = document.getElementById('btn-game-demo');
    if (btnDemo) {
      btnDemo.innerHTML = '<span>⏹</span> Dừng Mẫu';
      btnDemo.style.background = '#f97316';
    }

    showToast(`🔊 Đang phát bản sáo mẫu: ${this.currentSong.title}...`, 'info', 3000);

    this._prepareGameNotes();
    this.activeNoteIndex = 0;
    this.lastTime = performance.now();
    this.elapsedPlayTime = 0;
    this._lastMetroBeat = -1;
    this._gameLoop(this.lastTime);

    for (let i = 0; i < this.gameNotes.length; i++) {
      if (!this.isDemoPlaying) break;
      this.activeNoteIndex = i;
      const activeTile = this.gameNotes[i];

      if (this.viewMode === 'staff') {
        this.scrollX = activeTile.staffX;
      } else {
        activeTile.y = this.hitLineY - activeTile.height;
      }

      if (activeTile.type === 'rest' || activeTile.note === 'Lặng') {
        const waitMs = (activeTile.dur * (60 / this.currentSong.bpm)) * 1000;
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }

      const targetHz = getFluteTargetHz(activeTile.note);
      window.bambooFluteEngine.playNote(activeTile.note, activeTile.dur * 0.9);

      this._triggerHit(activeTile, true);

      const waitMs = (activeTile.dur * (60 / this.currentSong.bpm)) * 1000;
      await new Promise(r => setTimeout(r, waitMs));
    }

    this.stopDemo();
  }

  stopDemo() {
    this.isDemoPlaying = false;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

    const btnDemo = document.getElementById('btn-game-demo');
    if (btnDemo) {
      btnDemo.innerHTML = '<span>🔊</span> Nghe Mẫu Sáo Thật';
      btnDemo.style.background = 'var(--surface2)';
    }

    this._renderIdlePreview();
    showToast('Đã dừng bản sáo mẫu.', 'info', 1500);
  }

  /* ── Xử lý khi hoàn thành toàn bộ bài hát ── */
  _handleGameVictory() {
    this.isPlaying = false;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

    // Dừng thu âm nếu đang bật
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
        setTimeout(() => this._finalizeRecording(), 300);
      } catch (e) {}
    }

    if (window.bambooFluteEngine) {
      window.bambooFluteEngine.playVictoryMelody();
    }

    const totalNotes = this.gameNotes.length;
    const hitNotes = this.perfectCount + this.goodCount;
    const lengthPlayedPct = totalNotes > 0 ? Math.min(100, Math.round((hitNotes / totalNotes) * 100)) : 100;
    const pitchScorePct = hitNotes > 0 ? Math.min(100, Math.round(((this.perfectCount * 1.0 + this.goodCount * 0.8) / hitNotes) * 100)) : 0;
    const rhythmScorePct = totalNotes > 0 ? Math.min(100, Math.round(((this.perfectCount * 1.0 + this.goodCount * 0.75) / totalNotes) * 100)) : 0;
    const totalScore100 = Math.round(pitchScorePct * 0.45 + rhythmScorePct * 0.35 + lengthPlayedPct * 0.20);

    let rank = 'B';
    let starCount = '⭐⭐';
    if (totalScore100 >= 92) { rank = 'S'; starCount = '⭐⭐⭐⭐⭐'; }
    else if (totalScore100 >= 80) { rank = 'A'; starCount = '⭐⭐⭐⭐'; }
    else if (totalScore100 >= 60) { rank = 'B'; starCount = '⭐⭐⭐'; }
    else { rank = 'C'; starCount = '⭐⭐'; }

    const modal = document.getElementById('game-victory-modal');
    if (modal) {
      const setTitle = document.getElementById('victory-song-title');
      if (setTitle && this.currentSong) setTitle.textContent = this.currentSong.title;
      const setRank = document.getElementById('victory-rank');
      if (setRank) setRank.textContent = rank;
      const setStars = document.getElementById('victory-stars');
      if (setStars) setStars.textContent = starCount;
      const setFinal = document.getElementById('victory-final-score');
      if (setFinal) setFinal.textContent = totalScore100;
      const setScore = document.getElementById('victory-score');
      if (setScore) setScore.textContent = this.score.toLocaleString('vi-VN');
      const setCombo = document.getElementById('victory-max-combo');
      if (setCombo) setCombo.textContent = `x${this.maxCombo}`;
      const setAcc = document.getElementById('victory-accuracy');
      if (setAcc) setAcc.textContent = `${totalScore100}%`;

      // Cập nhật 3 vòng tròn chỉ số SoundCheck (Ảnh 2)
      const setLength = document.getElementById('sc-length-score');
      if (setLength) setLength.textContent = lengthPlayedPct;
      const setPitch = document.getElementById('sc-pitch-score');
      if (setPitch) setPitch.textContent = pitchScorePct;
      const setRhythm = document.getElementById('sc-rhythm-score');
      if (setRhythm) setRhythm.textContent = rhythmScorePct;

      const ringScore = document.getElementById('sc-ring-score-circle');
      if (ringScore) ringScore.style.strokeDashoffset = `${2 * Math.PI * 45 * (1 - totalScore100 / 100)}`;
      const ringLength = document.getElementById('sc-ring-length-circle');
      if (ringLength) ringLength.style.strokeDashoffset = `${2 * Math.PI * 32 * (1 - lengthPlayedPct / 100)}`;
      const ringPitch = document.getElementById('sc-ring-pitch-circle');
      if (ringPitch) ringPitch.style.strokeDashoffset = `${2 * Math.PI * 32 * (1 - pitchScorePct / 100)}`;
      const ringRhythm = document.getElementById('sc-ring-rhythm-circle');
      if (ringRhythm) ringRhythm.style.strokeDashoffset = `${2 * Math.PI * 32 * (1 - rhythmScorePct / 100)}`;
      const setPerf = document.getElementById('victory-perfect');
      if (setPerf) setPerf.textContent = this.perfectCount;
      const setGood = document.getElementById('victory-good');
      if (setGood) setGood.textContent = this.goodCount;
      const setMiss = document.getElementById('victory-miss');
      if (setMiss) setMiss.textContent = this.missCount;

      modal.style.display = 'flex';
      modal.classList.add('open');
    }

    const btnPlay = document.getElementById('btn-game-play');
    if (btnPlay) {
      btnPlay.innerHTML = '<span>▶</span> Bắt Đầu Chơi';
      btnPlay.style.background = 'var(--accent, #e6a23c)';
    }
  }
}

// Hàm so sánh nốt sáo chuẩn xác (xét cả Tên nốt và Quãng tám)
function isFluteNoteMatch(detectedNote, detectedOctave, targetNote) {
  if (!detectedNote || !targetNote) return false;
  const d = detectedNote.trim().toLowerCase();
  const t = targetNote.trim().toLowerCase();

  const isTargetQ2 = t.includes('2') || t.includes('c5') || t.includes('d5') || t.includes('e5') || t.includes('f5') || t.includes('g5') || t.includes('a5') || t.includes('b5');
  const userOct = detectedOctave || 4;

  // Kiểm tra tên nốt gốc
  let baseMatched = false;
  if (t.includes('đô') || t.includes('do') || t.includes('c')) baseMatched = (d === 'đô' || d === 'do' || d.includes('đô') || d.includes('do'));
  else if (t.includes('rê') || t.includes('re') || t.includes('d')) baseMatched = (d.includes('rê') || d.includes('re'));
  else if (t.includes('mi') || t.includes('e')) baseMatched = d.includes('mi');
  else if (t.includes('fa#') || t.includes('f#')) baseMatched = d.includes('fa#');
  else if (t.includes('fa') || t.includes('f')) baseMatched = (d.includes('fa') && !d.includes('fa#'));
  else if (t.includes('sol') || t.includes('g')) baseMatched = d.includes('sol');
  else if (t.includes('la') || t.includes('a')) baseMatched = (d.includes('la') && !d.includes('la#'));
  else if (t.includes('sib') || t.includes('si giáng') || t.includes('bb')) baseMatched = (d.includes('sib') || d.includes('giáng') || d.includes('la#'));
  else if (t.includes('si') || t.includes('b')) baseMatched = (d.includes('si') && !d.includes('giáng'));
  else baseMatched = (d === t);

  if (!baseMatched) return false;

  // Nếu bài yêu cầu Quãng 2: BẮT BUỘC người học phải thổi ở Quãng 2 (Octave >= 5)
  if (isTargetQ2) {
    return userOct >= 5;
  } else {
    // Nếu bài yêu cầu Quãng 1: Không được nhảy lên Quãng 2 (userOct phải <= 4)
    if (userOct >= 5) {
      return false; // Thổi quá mạnh vọt lên quãng 2 -> Không tính điểm
    }
    return true;
  }
}

// Khởi tạo Game khi trang tải
let fluteGame = null;
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('fluteGameCanvas')) {
    fluteGame = new FluteGameEngine('fluteGameCanvas');
    window.fluteGame = fluteGame;
  }
});
