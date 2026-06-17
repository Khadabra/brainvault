# Changelog - BrainVault AI

Semua catatan perubahan penting untuk proyek ini didokumentasikan di bawah ini.

---

## [v0.2.0] - 2026-06-17

### ⚡ Dioptimalkan (Performance Optimization & Latency Reduction)
* **Log Kinerja Server & Durasi Eksekusi (Task 1)**: Menambahkan log pengembang internal pada endpoint `/api/chat` untuk mendokumentasikan panjang prompt, panjang konteks dokumen, panjang riwayat obrolan, panjang jawaban hasil generasi, dan total durasi eksekusi dalam hitungan detik.
* **Pembatasan Ukuran Respons (Task 3)**: Membatasi keluaran maksimum model generasi konten lewat parameter `maxOutputTokens: 1800` di dalam sasis `generateContent()` guna memangkas overhead pemrosesan teks yang berlebihan, mengurangi latensi respons panjang tanpa mempengaruhi akurasi dan kualitas QA dokumen standar.

---

## [v0.1.0] - 2026-06-09 (BrainVault AI MVP)

### 🚀 Ditambahkan (Langkah 3 - AI Question Answering & RAG)
* **API Route `/api/chat` (Express Backend)**: Engine proxy aman yang meneruskan pertanyaan pengguna, context teks dokumen aktif, dan riwayat obrolan ke Google Gemini API.
* **Resilience Fallback Array**: Menambahkan daftar model cadangan teratur (`gemini-2.5-flash`, `gemini-3.1-flash-lite`, `gemini-flash-latest`, `gemini-3.1-pro-preview`) dengan delay backoff 400ms untuk menanggulangi Error Transient 503 (High Demand) dari server hulu Google.
* **`chatService.ts`**: Layanan chat untuk menyimpan history percakapan secara terpisah berbasis ID dokumen unik pengguna ke dalam `localStorage`.
* **`ChatWindow.tsx`**: Obrolan interaktif yang dilengkapi empty state dinamis ketika dokumen belum terpilih, starter question rekomendasi untuk membantu Irfan memulai obrolan, status visual loading "Menganalisis dokumen..." saat AI merumuskan balasan, serta tombol konfirmasi Hapus Riwayat instan.
* **`ChatInput.tsx`**: Masukan teks yang mendukung input multi-baris asinkron, auto-grow height, submit otomatis dengan Enter, dan pencegahan request kosong.
* **`MessageBubble.tsx`**: Bubble chat interaktif dengan diferensiasi warna ikon pengguna & AI, serta formatter parser markdown khusus untuk menyajikan tulisan tebal, list bulat, list berkode angka, serta inline code secara rapi.

### 🛠 Dioptimalkan & Diperbaiki (Stabilitas & Checkpoint)
* **Resiliensi Tombol Hapus Riwayat**: Mengembangkan komponen sasis konfirmasi pop-under mini "Ya, Hapus/Batal" yang elegan langsung pada tombol Hapus Riwayat di `ChatWindow.tsx` untuk kemudahan navigasi tanpa memblokir input lainnya.
* **TypeScript Key-Props Issue**: Mengatasi error kompilasi TS2322 di `ChatWindow.tsx` dengan menambahkan parameter opsional `key` ke dalam interface properti `MessageBubbleProps`.
* **CDN Web Worker URL**: Memposisikan `workerSrc` `pdfjs-dist` langsung ke server distribusi CDN global UNPKG murni yang merefleksikan file versi `.mjs` dengan andal, mengeliminasi isu "Failed to fetch dynamically imported module".
* **Kandungan File Terpakai**: Memastikan seluruh berkas fungsionalitas diintegrasikan penuh ke dalam dua tab workspace utama di `App.tsx` (Tab Chat AI & Tab Inspektor Teks).
* **Validasi Interaksi**: Mengunci kolom teks dan menonaktifkan tombol kirim jika tidak ada dokumen aktif yang sedang dipilih oleh Irfan, menjamin tidak ada request kosong yang dikirim ke proxy server.

---

## [v0.0.9] - 2026-06-09

### 📥 Ditambahkan (Langkah 2 - Local PDF Processing)
* **`pdfjs-dist` Parser**: Utilitas asinkron di `pdfParser.ts` untuk membaca dan mengekstrak teks asli PDF page-by-page di browser pengguna.
* **`storageService.ts`**: Mengintegrasikan database `localStorage` klien untuk menyimpan metadata dokumen (ID, nama file, ukuran berkas, teks murni, dan tanggal unggah).
* **`DocumentUpload.tsx`**: Drag & drop zone komponen visual yang tangguh dilengkapi pembatas filetype terarah (.pdf), penjejak persentase loading bar, dan peringatan batas memori local storage browser.
* **`DocumentList.tsx`**: Daftar list dokumen pengetahuan dengan hitungan ukuran berkas (KB/MB), karakter, tanggal unggah, indikator dokumen aktif, dan tombol hapus instan yang sinkron.
* **Desain UI Interaktif**: Struktur layout sasis dua kolom di `App.tsx` dengan header mentor dan indikator status sinkronisasi.
