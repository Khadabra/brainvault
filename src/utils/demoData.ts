import { Document } from "../types/document";
import { ChatMessage } from "../types/chat";
import { IndustryType } from "./industryTemplates";

export interface DemoDataset {
  id: IndustryType;
  industry: IndustryType;
  title: string;
  subtitle: string;
  documents: Document[];
  auditReport: string;
  compareResult: string;
  compareDocA: string;
  compareDocB: string;
  chats: Record<string, ChatMessage[]>;
}

export const DEMO_DATASETS: Record<IndustryType, DemoDataset> = {
  umum: {
    id: "umum",
    industry: "umum",
    title: "Demo Umum Korporat",
    subtitle: "Pemeriksaan Kepatuhan Administratif, Konsistensi Naskah, & Legalitas Perjanjian",
    compareDocA: "demo-general-01",
    compareDocB: "demo-general-02",
    documents: [
      {
        id: "demo-general-01",
        name: "01_Surat_Perjanjian_Penyediaan_Jasa_Konsultasi_Strategis.pdf",
        size: 215420,
        uploadedAt: new Date().toISOString(),
        status: "fully_enriched",
        extractedText: `SURAT PERJANJIAN KERJASAMA PENYEDIAAN JASA KONSULTASI STRATEGIS
KONTRAK NO: 109/PKS-CORP/VI/2026

Hari ini, Senin tanggal 1 Juni 2026, yang bertandatangan di bawah ini:
1. PT ARCHON INDONESIA GRAHA, berkedudukan di Lantai 18 Menara Prima, Jakarta, diwakili oleh Ir. Hermawan Adi, M.S. (Direktur Utama). Selanjutnya disebut "PIHAK PERTAMA".
2. PT BRAINVAULT CONSULTING GROUP, berkedudukan di Office Tower 8 Suite B, Jakarta, diwakili oleh Dr. Ir. Syafrizal Syarif (Managing Partner). Selanjutnya disebut "PIHAK KEDUA".

PASAL 1: RUANG LINGKUP JASA KONSULTASI
Pihak Kedua berkewajiban menyusun analisis kelayakan korporasi terkait perluasan operasional draf integrasi sistem logistik nasional, dengan target deliverables dalam bentuk Laporan Kajian Kelayakan Komprehensif selambat-lambatnya 90 hari kalender sejak Perjanjian ini ditandatangani.

PASAL 2: NILAI PERJANJIAN & JADWAL TERMIN PEMBAYARAN
Nilai total pengadaan jasa konsultasi ini disepakati sebesar Rp 1.500.000.000 (Satu Miliar Lima Ratus Juta Rupiah) belum termasuk PPN 11%.
Pembayaran dilakukan secara bertahap (Termin) sebagai berikut:
- Termin 1: Advance payment sebesar 30% setelah penandatanganan draf naskah utama.
- Termin 2: Milestone payment sebesar 40% setelah Laporan Kemajuan Tengah Program (Interim Report) diterima dan disetujui Komite Jasa PT Archon.
- Termin 3: Final payment sebesar 30% setelah penyerahan dokumen kelayakan final.`,
        chunks: [
          {
            id: "dg1-c1",
            pageNum: 1,
            text: `[DOKUMEN UTAMA JASA KONSULT Strategis - HALAMAN 1]
SURAT PERJANJIAN KERJASAMA PENYEDIAAN JASA KONSULTASI STRATEGIS
KONTRAK NO: 109/PKS-CORP/VI/2026
perjanjian ini ditandatangani pada hari Senin tanggal 1 Juni 2026.
PIHAK PERTAMA: PT ARCHON INDONESIA GRAHA, diwakili oleh Ir. Hermawan Adi, M.S. selaku Direktur Utama.
PIHAK KEDUA: PT BRAINVAULT CONSULTING GROUP, diwakili oleh Dr. Ir. Syafrizal Syarif selaku Managing Partner.
Masing-masing pihak bertindak atas nama korporasi hukum yang sah untuk melakukan kerjasama pengadaan jasa konsultasi tata kelola.`,
            sourceType: "native_text",
            documentId: "demo-general-01"
          },
          {
            id: "dg1-c2",
            pageNum: 2,
            text: `[DOKUMEN UTAMA JASA KONSULT STRATEGIS - HALAMAN 2]
PASAL 1: RUANG LINGKUP JASA KONSULTASI
Pihak Kedua berkewajiban menyusun analisis kelayakan logistik korporasi terintegrasi nasional. Target deliverables draf kajian diserahkan selambat-lambatnya 90 hari kalender sejak penandatanganan.
PASAL 2: NILAI PERJANJIAN & JADWAL TERMIN PEMBAYARAN
Keseluruhan nilai pengadaan jasa konsultasi adalah Rp 1.500.000.000 (Satu Miliar Lima Ratus Juta Rupiah) bersih sebelum pajak.
Pembayaran dicairkan bertahap: Termin 1 (30% uang muka), Termin 2 (40% interim milestone report), Termin 3 (30% penyerahan final).`,
            sourceType: "native_text",
            documentId: "demo-general-01"
          }
        ]
      },
      {
        id: "demo-general-02",
        name: "02_Syarat_Amandemen_Pembagian_Kewajiban_Administrasi.pdf",
        size: 142100,
        uploadedAt: new Date().toISOString(),
        status: "fully_enriched",
        extractedText: `SYARAT AMANDEMEN DAN PEMBAGIAN KEWAJIBAN ADMINISTRASI KORPORAT
LAMPIRAN TAMBAHAN - AMANDEMEN NO 1

Perubahan atas Surat Perjanjian No 109/PKS-CORP/VI/2026 disepakati sebagai berikut:
Amandemen Pasal 2: Jadwal Termin Pembayaran & PPh
Nilai total kontrak tetap sebesar Rp 1.500.000.000, namun skema termin diubah menjadi 2 Tahap utama untuk menjaga kelancaran cash-flow:
- Termin 1: DP 50% dibayarkan selambatnya 14 hari kerja setelah verifikasi draf amandemen disetujui.
- Termin 2: Sisa 50% langsung dibayarkan pada saat draf kajian final diserahkan (Tanpa Laporan Tengah Terpisah).
Kewajiban kepatuhan pajak (PPh 23) menjadi tanggung jawab penuh Pihak Kedua, dipotong langsung oleh Pihak Pertama pada saat penagihan invoice diajukan.`,
        chunks: [
          {
            id: "dg2-c1",
            pageNum: 1,
            text: `[DOKUMEN AMANDEMEN KEWAJIBAN ADMINISTRASI - HALAMAN 1]
SYARAT AMANDEMEN DAN PEMBAGIAN KEWAJIBAN ADMINISTRASI KORPORAT
Lampiran Amandemen No 1 atas Kontrak Kerja Jasa Konsultasi Strategis No 109/PKS-CORP/VI/2026.
Skema pembayaran direstrukturisasi menjadi 2 Termin Utama:
Termin 1: Uang Muka 50% (naik dari sebelumnya 30%) untuk menunjang mobilisasi tim konsultan lapangan awal.
Termin 2: Final Payment langsung sebesar 50% setelah serah terima laporan final tanpa mengandalkan milestone interim report demi kelancaran operasional.`,
            sourceType: "native_text",
            documentId: "demo-general-02"
          }
        ]
      }
    ],
    auditReport: `# LAPORAN AUDIT & KEPATUHAN ADMINISTRATIF
## EVALUASI FORMAL NASKAH DAN INTEGRITAS KONTRAK

**Status Kepatuhan**: ⚠️ SEBAGIAN PATUH (PARTIALLY COMPLIANT)
**Tanggal Audit**: 15 Juni 2026

### RINGKASAN TEMUAN UTAMA
Audit kepatuhan administratif umum menguji keselarasan naskah Surat Kontrak Utama Jasa Konsultasi (109/PKS-CORP/VI/2026) dengan Lampiran Amandemen No 1 yang diajukan bersamaan. Telah ditemukan 1 risiko sedang dan beberapa inkonsistensi minor terkait termin pembayaran.

---

### TEMUAN KRITIS (CRITICAL FINDINGS)
*Tidak ditemukan temuan kritis pada aspek integritas formal tata naskah umum.*

---

### TEMUAN SEDANG (MODERATE FINDINGS)
1. **Ketidaksesuaian Klausul Pembayaran Lintas Berkas**
   - **Tingkat Risiko**: Sedang / Moderate
   - **Kategori**: Risiko Finansial & Dokumen Ganda
   - **Deskripsi**: Terdapat perubahan radikal pada mekanisme termin pembayaran antara kontrak induk (3 termin: 30%, 40%, 30%) dan naskah amandemen amandemen (2 termin: 50%, 50%).
   - **Rujukan**: Dokumen 01 (Halaman 2, Pasal 2) vs Dokumen 02 (Halaman 1)
   - **Rekomendasi**: Harus dibuat addendum resmi yang mencabut klausul lama agar tidak timbul kebingungan akuntansi saat penagihan unit keuangan.

---

### TEMUAN MINOR & REKOMENDASI TATA BAHASA
1. **Penyebutan Nilai Kontrak Bersih Sebelum Pajak**
   - Terdapat beda frasa mengenai PPN. Dokumen Induk menegaskan nilai Rp 1.500.000.000 "belum termasuk PPN 11%", sedangkan dokumen amandemen menyebutkan pajak dipotong langsung. Pastikan ada penegasan pemisahan PPh dan PPN.

---

### INTEGRITAS PERSETUJUAN & RUJUKAN
*Seluruh nama penandatangan (Ir. Hermawan Adi, M.S. dan Dr. Ir. Syafrizal Syarif) konsisten secara administratif tertera di kedua draf dokumen.*`,
    compareResult: `## PERBANDINGAN STRATEGIS: JASA KONSULTASI INDUK VS AMANDEMEN

### INFORMASI HANYA DI DOKUMEN A (01_Surat_Perjanjian_Penyediaan_Jasa_Konsultasi_Strategis.pdf)
- **Mekanisme Interim Report (Halaman 2, Pasal 2)**: Adanya kewajiban penyerahan Laporan Kemajuan Tengah Program (Interim Report) yang disetujui Komite Jasa PT Archon sebagai prasyarat pencairan Termin kedua (40%). Ini tidak termuat dalam amandemen.
- **Waktu Tenggat Kerja**: Tenggat pengerjaan secara eksplisit tertera sebesar 90 hari kalender.

### INFORMASI HANYA DI DOKUMEN B (02_Syarat_Amandemen_Pembagian_Kewajiban_Administrasi.pdf)
- **PPh Pasal 23 (Halaman 1)**: Eksplisit menyatakan pemotongan PPh 23 langsung dibebankan kepada Pihak Kedua di setiap termin invoice kepatuhan pajak.
- **Skema Cash-Flow 2 Tahap**: Menghapus target tengah (milestone payment 40%) digantikan dengan skema 50% di muka dan 50% di akhir.

### INFORMASI YANG SAMA
- **Nilai Kontrak Fiskal**: Keduanya menyepakati jumlah dana kompensasi jasa professional yang tetap yaitu Rp 1.500.000.000.
- **Para Pihak**: Keterlibatan PT Archon Indonesia Graha dan PT Brainvault Consulting Group.

### PERBEDAAN KRITIS
- **Hapusnya Laporan Interim**: Pada dokumen B, milestone penyerahan Laporan Interim yang diwajibkan di Dokumen A dihapus, sehingga langsung beralih ke Final Report. Hal ini memotong kendali asuransi kualitas mutu kerja di tengah proses, namun mempercepat pembayaran demi cash-flow Pihak Kedua. Harus ada persetujuan Komite sebelum dokumen B disahkan.`,
    chats: {
      "demo-general-01": [
        {
          id: "g-msg-1",
          sender: "user",
          text: "Siapa saja nama direktur yang menandatangani perjanjian strategis ini?",
          timestamp: new Date().toISOString()
        },
        {
          id: "g-msg-2",
          sender: "ai",
          text: "Berdasarkan dokumen perjanjian consult strategis, direktur yang menandatangani kontrak adalah:\n\n1. **Ir. Hermawan Adi, M.S.** selaku Direktur Utama PT Archon Indonesia Graha (PIHAK PERTAMA).\n2. **Dr. Ir. Syafrizal Syarif** selaku Managing Partner PT Brainvault Consulting Group (PIHAK KEDUA).",
          timestamp: new Date().toISOString(),
          citations: [
            {
              id: "cit-g1",
              docId: "demo-general-01",
              docName: "01_Surat_Perjanjian_Penyediaan_Jasa_Konsultasi_Strategis.pdf",
              pageNum: 1,
              text: "PIHAK PERTAMA: PT ARCHON INDONESIA GRAHA, diwakili oleh Ir. Hermawan Adi, M.S. selaku Direktur Utama. PIHAK KEDUA: PT BRAINVAULT CONSULTING GROUP, diwakili oleh Dr. Ir. Syafrizal Syarif selaku Managing Partner."
            }
          ]
        },
        {
          id: "g-msg-3",
          sender: "user",
          text: "Berapa lama target penyusunan laporan kelayakan logistik nasional?",
          timestamp: new Date().toISOString()
        },
        {
          id: "g-msg-4",
          sender: "ai",
          text: "Target penyusunan analisis kelayakan logistik korporasi terintegrasi nasional disepakati selambat-lambatnya **90 hari kalender** sejak penandatanganan perjanjian.",
          timestamp: new Date().toISOString(),
          citations: [
            {
              id: "cit-g2",
              docId: "demo-general-01",
              docName: "01_Surat_Perjanjian_Penyediaan_Jasa_Konsultasi_Strategis.pdf",
              pageNum: 2,
              text: "Laporan Kajian Kelayakan Komprehensif selambat-lambatnya 90 hari kalender sejak Perjanjian ini ditandatangani."
            }
          ]
        }
      ],
      "demo-general-02": [
        {
          id: "g2-msg-1",
          sender: "user",
          text: "Apa saja perubahan penting dalam amandemen pembayaran?",
          timestamp: new Date().toISOString()
        },
        {
          id: "g2-msg-2",
          sender: "ai",
          text: "Perubahan utama dalam Amandemen No 1 meliputi:\n\n1. **Restrukturisasi Tahap Pembayaran**: Dari sebelumnya 3 tahap (30%, 40%, 30%) menjadi **2 tahap utama (50% uang muka, 50% pelunasan laporan final)**.\n2. **Penghapusan Syarat Laporan Interim**: Dana sisa pelunasan langsung dicairkan tanpa harus menyerahkan Laporan Interim kemajuan tengah program terlebih dahulu.\n3. **Ketentuan PPh 23**: Pajak penghasilan dipotong langsung saat PT Archon menerima invoice penagihan.",
          timestamp: new Date().toISOString(),
          citations: [
            {
              id: "cit-g3",
              docId: "demo-general-02",
              docName: "02_Syarat_Amandemen_Pembagian_Kewajiban_Administrasi.pdf",
              pageNum: 1,
              text: "Skema pembayaran direstrukturisasi menjadi 2 Termin Utama: Termin 1: Uang Muka 50% (naik dari 30%).... Termin 2: Final Payment langsung sebesar 50% setelah serah terima laporan final tanpa mengandalkan milestone interim report."
            }
          ]
        }
      ]
    }
  },
  ipal: {
    id: "ipal",
    industry: "ipal",
    title: "Demo IPAL / Sanitasi / Lingkungan",
    subtitle: "Kepatuhan Baku Mutu Efluen Permen LHK No. P.68/2016 & Audit Spesifikasi Mekanis Pompa",
    compareDocA: "demo-ipal-01",
    compareDocB: "demo-ipal-02",
    documents: [
      {
        id: "demo-ipal-01",
        name: "01_Spesifikasi_Teknis_Instalasi_IPAL_Kawasan_Industri.pdf",
        size: 284100,
        uploadedAt: new Date().toISOString(),
        status: "fully_enriched",
        extractedText: `SPESIFIKASI TEKNIS DESAIN INSTALASI PENGOLAHAN AIR LIMBA (IPAL)
SISTEM BIO-REAKTOR AERASI MEKANIS (ACTIVATED SLUDGE EXTREME-II)

BAB 1: KRITERIA DESAIN INLET DAN OUTLET LIMBAH
Sistem Instalasi Pengolahan Air Limbah (IPAL) direncanakan mengolah debit air buangan fabrikasi sebesar 5.000 m3/hari.
Karakteristik influen air baku air buangan direncanakan pada kondisi maksimun sebagai berikut:
- Biochemical Oxygen Demand (BOD5): 350 mg/L
- Chemical Oxygen Demand (COD): 700 mg/L
- Total Suspended Solids (TSS): 250 mg/L
- Derajat Keasaman (pH): 5,5 s.d 9,5

Kualitas air buangan efluen setelah proses pengolahan diaerial wajib memenuhi baku mutu standar operasional nasional, dengan estimasi keluaran: BOD5 ≤ 25 mg/L, COD ≤ 80 mg/L, TSS ≤ 20 mg/L.

BAB 2: UNIT BLOWER aerasi & DOSING METERING PUMP
- Pompa Pembersih Utama (Dosing PAC & Polimer): Menggunakan dosing pump mekanik Grundfos Smart Digital DDA, kapasitas injeksi kimia 12 L/jam pada tekanan balik maksimum 10 bar. Pompa dikontrol melalui modulasi isyarat arus 4-20 mA.
- Sistem Penyebaran Oksigen (Blower Bio-Reaktor): Disuplai oleh 3 unit Rotary Lobe Blower (2 unit beroperasi, 1 unit cadangan standby). Kebutuhan debit alir udara peniup minimal sebesar 45 m3/menit per blower dengan tekanan operasi 0,6 kg/cm2, dilengkapi panel PKS PLC inverter hemat daya.`,
        chunks: [
          {
            id: "di1-c1",
            pageNum: 1,
            text: `[SPESIFIKASI TEKNIS IPAL - HALAMAN 1]
BAB 1: KRITERIA DESAIN INLET DAN OUTLET LIMBAH DESAIN PARAMETER IPAL / WWTP.
Sistem Instalasi Pengolahan Air Limbah (IPAL) direncanakan mengolah debit buangan maksimal 5.000 m3/hari.
Kondisi Influent Air Limbah: BOD 350 mg/L, COD 700 mg/L, TSS 250 mg/L. pH inlet bervariasi antara 5,5 s.d 9,5.
Target parameter keluaran (efluen) setelah sistem Activated Sludge: BOD <= 25 mg/L, COD <= 80 mg/L, TSS <= 20 mg/L.`,
            sourceType: "native_text",
            documentId: "demo-ipal-01"
          },
          {
            id: "di1-c2",
            pageNum: 2,
            text: `[SPESIFIKASI TEKNIS IPAL - HALAMAN 2]
BAB 2: UNIT aerasi BLOWER DAN DOSING POMP KIMIA
Unit Penyuplai Oksigen Aerogenik: 3 unit Rotary Lobe Aerator Blower (2 unit menyala kontinu, 1 cadangan standby).
Spesifikasi udara peniup: Laju alir udara aerasi mini 45 m3/menit per blower dengan tekanan operasi nominal 0,6 kg/cm2.
Injeksi Bahan Kimia Koagulasi: Dosing Pump Grundfos DDA Smart Digital, debit aliran 12 Liter/jam pada tekanan backpressure 10 bar, didukung modulasi sinyal arus automatik 4-20 mA.`,
            sourceType: "native_text",
            documentId: "demo-ipal-01"
          }
        ]
      },
      {
        id: "demo-ipal-02",
        name: "02_Baku_Mutu_Limbah_Cair_PermenLHK_P68_2016.pdf",
        size: 195600,
        uploadedAt: new Date().toISOString(),
        status: "fully_enriched",
        extractedText: `PERATURAN MENTERI LINGKUNGAN HIDUP DAN KEHUTANAN REPUBLIK INDONESIA
NOMOR P.68/MENLHK/SETJEN/KUM.1/8/2016 TENTANG BAKU MUTU AIR LIMBAH DOMESTIK

Pasal 3 Ayat 1:
Setiap usaha dan/atau kegiatan yang membuang air limbah domestik wajib mengolah air limbah yang dihasilkannya.

LAMPIRAN I: PARAMETER BAKU MUTU AIR LIMBAH DOMESTIK
Kadar maksimum zat pencemar yang diperbolehkan dibuang ke badan air penerima:
- BOD (Biochemical Oxygen Demand): 30 mg/L
- COD (Chemical Oxygen Demand): 100 mg/L
- TSS (Total Suspended Solids): 30 mg/L
- pH: 6 - 9
- Minyak & Lemak: 10 mg/L
- Amonia: 10 mg/L
- Total Koliform: 3000 jumlah/100mL`,
        chunks: [
          {
            id: "di2-c1",
            pageNum: 1,
            text: `[BAKU MUTU LINGKUNGAN PERMEN LHK P.68/2016 - HALAMAN 1]
Kutipan Peraturan Menteri LHK No P.68/MENLHK/Setjen/Kum.1/8/2016 tentang Baku Mutu Air Limbah Domestik & Kawasan Terintegrasi.
Zat Pencemar Maksimum yang Diperkenankan Dibuang ke Badan Air:
BOD: 30 mg/L | COD: 100 mg/L | TSS: 30 mg/L.
Amonia: 10 mg/L | Minyak & Lemak: 10 mg/L. 
Batas toleransi Derajat Keasaman pH air efluen adalah 6,0 s.d 9,0 unit pH.`,
            sourceType: "native_text",
            documentId: "demo-ipal-02"
          }
        ]
      }
    ],
    auditReport: `# LAPORAN AUDIT TEKNIS PARAMETER LINSEK IPAL & BAKU MUTU
## EVALUASI DEBIT HIDROLIS DAN PARAMETER EFLUEN (PERMEN LHK P.68/2016)

**Status Kepatuhan**: ✅ SEMPURNA & AMAN (FULLY COMPLIANT)
**Tanggal Audit**: 15 Juni 2026

### RINGKASAN TEMUAN UTAMA
Evaluasi engineering komparatif dan audit kepatuhan regulasi lingkungan telah dilakukan terhadap desain IPAL 5.000 m3/hari. Seluruh parameter pengolahan dan spesifikasi mekanis yang direncanakan memenuhi standar kementerian serta parameter desain fungsional yang aman.

---

### TEMUAN KRITIS (CRITICAL FINDINGS)
*Tidak ditemukan deviasi atau risiko kritis. Semua rancangan dinilai aman.*

---

### TEMUAN SEDANG (MODERATE FINDINGS)
1. **Risiko Fluktuasi pH Inlet terhadap Aktivitas Bakteri Bioreaktor**
   - **Tingkat Risiko**: Sedang / Moderate
   - **Kategori**: Risiko Operasional Biologi IPAL
   - **Deskripsi**: pH influen berkisar dari 5,5 s.d 9,5, sedangkan baku mutu pelepasan mensyaratkan rentang steril pH 6 s.d 9. Aktivitas bakteri activated sludge akan terganggu jika pH influent turun di bawah 6,0 tanpa dinentralisasi terlebih dahulu.
   - **Rujukan**: Dokumen 01 (Halaman 1, Bab 1) vs Dokumen 02 (Halaman 1, Lampiran I)
   - **Rekomendasi**: Pastikan unit dosing pengendali pH (penambahan NaOH atau Asam) dioperasikan secara kontinyu menggunakan feedback controller pH transmitter.

---

### TEMUAN MINOR
1. **Pemeriksaan Skema Redundansi Blower**
   - Panel PKS PLC inverter blower diatur beroperasi 2 dari 3 unit. Redundansi 1 unit standby (33% cadangan kapasitas) sudah memadai secara sipil-mekanikal untuk mencegah kegagalan oksigenasi darurat.

---

### VALIDASI STATISTIK INTEGRITAS
- Kualitas efluen rancangan BOD 25 mg/L berada di bawah batas baku mutu Permen LHK No P.68/2016 (max 30 mg/L).
- Konsentrasi TSS rancangan 20 mg/L aman serta berjarak 33% dari syarat maksimal (max 30 mg/L).`,
    compareResult: `## PERBANDINGAN ENERGETIK: SPESIFIKASI OPERASIONAL VS REGULASI BAKU MUTU

### INFORMASI HANYA DI DOKUMEN A (01_Spesifikasi_Teknis_Instalasi_IPAL_Kawasan_Industri.pdf)
- **Spesifikasi Pompa Dosing Grundfos DDA (Halaman 2)**: detail laju pompa dosing kimia PAC/polimer dengan kapasitas 12 L/jam dan kekuatan backpressure 10 bar, digerakkan analog signal 4-20 mA.
- **Rotary Lobe Blower**: suplai aerasi 3 unit blower dengan debit 45 m3/menit dengan cadangan inverter PLC.
- **Kapasitas Hidrolis**: Desain penampungan mengolah debit fabrikasi maksimal 5.000 m3/hari.

### INFORMASI HANYA DI DOKUMEN B (02_Baku_Mutu_Limbah_Cair_PermenLHK_P68_2016.pdf)
- **Kadar Amonia dan Minyak Lemak (Halaman 1)**: Batas kadar amonia maksimal 10 mg/L, minyak lemak domestik maksimal 10 mg/L, serta patogen total koliform sebesar 3.000 jumlah/100mL.

### INFORMASI YANG SAMA
- **Ambang Batas BOD, COD, & TSS**: Kedua dokumen membahas parameter BOD, COD, TSS dan pH.
- **Parameter pH**: pH air buangan diulas pada rentang toleransi dasar yang berhimpitan.

### PERBEDAAN KRITIS & KESELARASAN DESAIN
- **Marjin Keamanan Desain (Safety Margin)**: Spesifikasi Teknis (A) dirancang dengan batas efluen lebih ketat (BOD 25 mg/L, TSS 20 mg/L) dibandingkan ambang batas legal Permen LHK No P.68 (BOD 30 mg/L, TSS 30 mg/L). Hal ini menguntungkan posisi operator pabrik karena memberi ruang toleransi kesalahan biologis (safety margin) sebesar kurang lebih 16% untuk BOD dan 33% untuk zat TSS tersuspensi. Desain dinyatakan lolos verifikasi compliance.`,
    chats: {
      "demo-ipal-01": [
        {
          id: "ipal-msg-1",
          sender: "user",
          text: "Berapa kapasitas debit air limbah harian yang dirancang untuk IPAL ini?",
          timestamp: new Date().toISOString()
        },
        {
          id: "ipal-msg-2",
          sender: "ai",
          text: "Instalasi Pengolahan Air Limbah (IPAL) ini dirancang untuk mengolah kapasitas debit air buangan fabrikasi maksimal sebesar **5.000 m3/hari**.",
          timestamp: new Date().toISOString(),
          citations: [
            {
              id: "cit-i1",
              docId: "demo-ipal-01",
              docName: "01_Spesifikasi_Teknis_Instalasi_IPAL_Kawasan_Industri.pdf",
              pageNum: 1,
              text: "Sistem Instalasi Pengolahan Air Limbah (IPAL) direncanakan mengolah debit air buangan fabrikasi sebesar 5.000 m3/hari."
            }
          ]
        },
        {
          id: "ipal-msg-3",
          sender: "user",
          text: "Pompa dosis apa yang dipakai untuk menginjeksi bahan kimia pengolahan?",
          timestamp: new Date().toISOString()
        },
        {
          id: "ipal-msg-4",
          sender: "ai",
          text: "Untuk menginjeksi bahan kimia koagulasi, spesifikasi teknis menetapkan pemakaian **dosing pump Grundfos Smart Digital (tipe DDA)**, dengan debit injeksi sebesar **12 Liter/jam** pada tekanan balik maksimal **10 bar** dan kontrol modulasi isyarat arus **4-20 mA**.",
          timestamp: new Date().toISOString(),
          citations: [
            {
              id: "cit-i2",
              docId: "demo-ipal-01",
              docName: "01_Spesifikasi_Teknis_Instalasi_IPAL_Kawasan_Industri.pdf",
              pageNum: 2,
              text: "pompa dosing mekanik Grundfos Smart Digital DDA, kapasitas injeksi kimia 12 L/jam pada tekanan balik maksimum 10 bar. Pompa dikontrol melalui modulasi isyarat arus 4-20 mA."
            }
          ]
        }
      ],
      "demo-ipal-02": [
        {
          id: "ipal2-msg-1",
          sender: "user",
          text: "Sebutkan parameter maksimum zat pencemar air limbah domestik menurut Permen LHK P.68/2016.",
          timestamp: new Date().toISOString()
        },
        {
          id: "ipal2-msg-2",
          sender: "ai",
          text: "Berdasarkan rujukan resmi **Permen LHK No. P.68/2016**, kadar zat pencemar maksimum yang diizinkan untuk dibuang ke badan air bebas adalah:\n\n- **BOD**: 30 mg/L\n- **COD**: 100 mg/L\n- **TSS**: 30 mg/L\n- **pH toleransi**: 6 - 9\n- **Minyak & Lemak**: 10 mg/L\n- **Amonia**: 10 mg/L\n- **Total Koliform**: 3000 jumlah/100mL",
          timestamp: new Date().toISOString(),
          citations: [
            {
              id: "cit-i3",
              docId: "demo-ipal-02",
              docName: "02_Baku_Mutu_Limbah_Cair_PermenLHK_P68_2016.pdf",
              pageNum: 1,
              text: "Zat Pencemar Maksimum: BOD: 30 mg/L | COD: 100 mg/L | TSS: 30 mg/L | Amonia: 10 mg/L | Minyak & Lemak: 10 mg/L. Batas toleransi Derajat Keasaman pH air efluen adalah 6,0 s.d 9,0."
            }
          ]
        }
      ]
    }
  },
  konstruksi: {
    id: "konstruksi",
    industry: "konstruksi",
    title: "Demo Konstruksi / EPC / Sipil",
    subtitle: "RKS Mutu Beton SNI vs Hasil Pengujian Sondir Tanah CPT",
    compareDocA: "demo-konstr-01",
    compareDocB: "demo-konstr-02",
    documents: [
      {
        id: "demo-konstr-01",
        name: "01_Rencana_Kerja_dan_Syarat_RKS_Gedung_EPC.pdf",
        size: 312500,
        uploadedAt: new Date().toISOString(),
        status: "fully_enriched",
        extractedText: `RENCANA KERJA DAN SYARAT-SYARAT (RKS) TEKNIS
PROYEK PEMBANGUNAN GEDUNG LABORATORIUM ENERGI DAN EPC

BAB 4: PEKERJAAN STRUKTUR BETON
- Kelas Mutu Beton Kompresif: Seluruh pekerjaan pengecoran slab lantai beton bertulang, balok kantilever, dan sloof utama wajib menggunakan beton readymix klas mutu fc' 30 MPa (setara dengan K-350) yang lolos kualifikasi pengujian laboratorium independen pada usia 28 hari.
- Besi Baja Tulangan: Mutu baja tulangan yang digunakan wajib baja ulir BjTS 420A (tegangan leleh minimal 420 MPa) dengan standar SNI 2052:2017 untuk seluruh tulangan pengikat gaya geser kolom utama.
- Pengujian Spesimen: Penyedia draf sipil wajib menyiapkan spesimen silinder silinder silinder 15x30 cm minimal 1 set uji per 5 meter kubik penuangan kontinu.

BAB 5: SPESIFIKASI FONDASI BAWAH
Tiang pancang struktur menggunakan prestressed concrete spun pile diameter 400 mm kelas B kelas B, dengan syarat penetrasi tiang mencapai tanah keras dengan kedudukan nilai daya dukung lateral minimal 35 ton per titik tiang tunggal. Nilai kedalaman estimasi rencana adalah 14 s.d 18 meter dari permukaan benchmark dasar tanah asli.`,
        chunks: [
          {
            id: "dk1-c1",
            pageNum: 1,
            text: `[RKS GEDUNG EPC - HALAMAN 1]
BAB 4: PEKERJAAN STRUKTUR SIPIL & BETON MUTU TINGGI
Beton struktur utama gedung (kolom, balok, slab bertulang) menggunakan Readymix Mutu fc' 30 MPa (ekuivalen K-350 secara kubus). Pengawasan mengacu penuh pada SNI 2847:2019.
Baja tulangan spiral struktural disepakati baja ulir mutu tinggi tipe BjTS 420A dengan standar SNI 2052:2017.`,
            sourceType: "native_text",
            documentId: "demo-konstr-01"
          },
          {
            id: "dk1-c2",
            pageNum: 2,
            text: `[RKS GEDUNG EPC - HALAMAN 2]
BAB 5: SPESIFIKASI PEKERJAAN FONDASI BOTTOM
Spesifikasi tiang fondasi spun pile diameter 400 mm kelas B. 
Ketentuan tiang tunggal wajib memperoleh estimasi resistansi beban lateral/daya dukung termassa minimal 35 ton. Kedalaman ujung tiang pancang mencapai tanah keras diestimasi berada pada elevasi kedalaman 14 hingga 18 meter.`,
            sourceType: "native_text",
            documentId: "demo-konstr-01"
          }
        ]
      },
      {
        id: "demo-konstr-02",
        name: "02_Kompilasi_Hasil_Uji_Sondir_Tanah_CPT_Metode_Sipil.pdf",
        size: 184300,
        uploadedAt: new Date().toISOString(),
        status: "fully_enriched",
        extractedText: `LAPORAN PENYELIDIKAN TANAH MEKANIS & UJI SONDIR (CONE PENETRATION TEST)
LOKASI PROYEK GEDUNG LABORATORIUM EPC

Ringkasan Hasil Uji Sondir Hambatan Lekat (S-A1 dan S-A2):
- Titik Uji S-A1: Hambatan ujung konus (qc) mencapai batas tanah keras (qc >= 150 kg/cm2) pada kedalaman kedalaman 11,60 meter dari permukaan elevasi sasis kerja yang ada.
- Titik Uji S-A2: Resistansi kerucut qc mencapai 150 kg/cm2 pada kedalaman kedalaman 12,20 meter.

Hambatan Pelekat Kumulatif (Total Friction):
- Pada kedalaman titik keras S-A1 (11,60 m): Total Friction 480 kg/cm.
- Pada kedalaman titik keras S-A2 (12,20 m): Total Friction 520 kg/cm.

KESIMPULAN ENGINERE SIPIL:
Kondisi formasi lapisan tanah atas (top soil) didominasi oleh lempung sangat lunak (silt clay) hingga kedalaman 6,0 meter. Dukungan tanah yang kaku (keras) stabil tercapai merata mulai kedalaman 12,0 meter ke bawah.`,
        chunks: [
          {
            id: "dk2-c1",
            pageNum: 1,
            text: `[LAPORAN UJI SONDIR CPT - HALAMAN 1]
Kondisi geologi tanah tapak proyek konstruksi.
Hasil hambatan ujung konus (qc) Cone Penetration Test mencapai kekuatan penetrasi keras kritis (qc >= 150 kg/cm2):
Titik S-A1: Tercapai stabil pada elevasi kedalaman 11,60 meter.
Titik S-A2: Tercapai stabil pada elevasi kedalaman 12,20 meter.
Total Friction (hambatan lekat) masing-masing adalah 480 kg/cm dan 520 kg/cm. Formasi tanah sub-permukaan lunak sild clay tebal setinggi 6 meter di permukaan atas.`,
            sourceType: "native_text",
            documentId: "demo-konstr-02"
          }
        ]
      }
    ],
    auditReport: `# LAPORAN AUDIT REKAYASA KRITIS KONSTRUKSI
## EVALUASI FONDASI ELEVASI DAN KONSISTENSI MATERIAL (SNI 2847:2019)

**Status Kepatuhan**: ❌ TIDAK PATUH (NON-COMPLIANT)
**Tanggal Audit**: 15 Juni 2026

### RINGKASAN TEMUAN UTAMA
Audit investigasi rekayasa struktur sipil mempertemukan Rencana Kerja & Syarat (RKS) dengan data lapangan aktual sondir tanah mekanis (CPT). Telah terdeteksi **1 TEMUAN KRITIS SANGAT TINGGI** terkait elevasi fondasi dalam yang dapat membahayakan keselamatan gedung.

---

### TEMUAN KRITIS (CRITICAL FINDINGS)
1. **Bahaya Elevasi Tiang Fondasi "Gantung" (Overestimating Depth)**
   - **Tingkat Risiko**: Kritis (Critical) / Bahaya Ambruk Struktur
   - **Kategori**: Keamanan Fondasi Sipil & Keselamatan Hidup
   - **Deskripsi**: Bab 5 RKS menetapkan kedalaman tiang pancang berada pada elevasi rencana kedalaman **14 s.d 18 meter**. Namun Laporan Sondir Tanah Aktual menunjukkan bahwa tanah keras (qc >= 150 kg/cm2) sudah tercapai jauh lebih dangkal, yaitu di kedalaman **11.60 meter hingga 12.20 meter**. Menanam spun pile dipaksakan hingga 14-18 meter akan memotong tanah keras dan dapat merusak tiang (tiang hancur dipalu/patah). Sebaliknya jika tiang berhenti di 12 meter tapi laporan as-built merujuk draf 14 meter, akan timbul klaim volume fiktif kontraktor.
   - **Rujukan**: Dokumen 01 (Halaman 2, Bab 5) vs Dokumen 02 (Halaman 1)
   - **Rekomendasi**: Harus segera merevisi gambar teknik fondasi dan RKS. Kedalaman rencana pancang harus diubah menjadi maksimal 12,20 meter mengikut tanah keras sondir.

---

### TEMUAN SEDANG (MODERATE FINDINGS)
1. **Parameter Mutu Beton Setara (fc vs K-350)**
   - **Tingkat Risiko**: Sedang / Moderate
   - **Kategori**: Standar Kepatuhan Material SNI
   - **Deskripsi**: RKS menyetarakan fc' 30 MPa dengan K-350. Menurut SNI 2847:2019, penyetaraan ini tidak akurat secara faktor koefisien silinder (silinder vs kubus). fc' 30 MPa setara dengan K-350 apabila menggunakan faktor pengali silinder 0.83, tapi diuji dengan parameter laboratorium silinder 15x30 cm.
   - **Rujukan**: Dokumen 01 (Halaman 1, Bab 4)
   - **Rekomendasi**: Tambahkan klausul bahwa uji pembuktian wajib mengandalkan spesimen silinder 15x30 cm, bukan cetakan kubus, untuk meminimalkan sengketa hukum uji tekan.

---

### TEMUAN MINOR
1. **Metode Kerja pada Lempung Sangat Lunak**
   - Mengingat top soil sedalam 6,0 meter adalah lempung sangat lunak (silt clay), diwajibkan dewatering dan pemadatan cerucuk sementara atau sheet pile plastik saat galian fondasi bored pile/sloof balok agar dinding galian tidak longsor.`,
    compareResult: `## PERBANDINGAN STRUKTURAL: RKS TEKNIS VS LAPORAN PENYELIDIKAN TANAH MEKANIS

### INFORMASI HANYA DI DOKUMEN A (01_Rencana_Kerja_dan_Syarat_RKS_Gedung_EPC.pdf)
- **Kadar Mutu Beton Kompleks (Halaman 1)**: Beton struktur Readymix mutlak fc' 30 Mpa dengan standardisasi pematuhan SNI 2847:2019.
- **Standar Baja Ulir BjTS 120A (Halaman 1)**: Penggunaan besi baja ulir BjTS 420A berbasis standardisasi SNI 2052:2017.
- **Spesifikasi Spun Pile Ø400mm**: pancang pancang spinal berdiameter 400 milimeter, daya dukung lateral termassa 35 ton.

### INFORMASI HANYA DI DOKUMEN B (02_Kompilasi_Hasil_Uji_Sondir_Tanah_CPT_Metode_Sipil.pdf)
- **Hambatan Lekat Kumulatif (Halaman 1)**: Resistansi total friction gesek tanah sebesar 480 kg/cm pada titik S-A1 dan 520 kg/cm pada titik S-A2.
- **Formasi Geologis Lunak**: Profil top soil setebal 6,0 meter berupa silt clay lunak.

### INFORMASI YANG SAMA
- Keduanya berfokus pada analisis daya dukung tanah bawah dan kesiapan fondasi gedung konstruksi.

### PERBEDAAN KRITIS & KONFLIK REKAYASA (CONFLICT ALERT)
Terdapat deviasi kedalaman tiang pancang. RKS (A) menargetkan kedalaman tiang **14 - 18 meter** untuk menyentuh tanah keras kaku. Sementara Penyelidikan Tanah (B) membuktikan lapisan tanah kaku/keras kaku tercapai di kedalaman **11.60 meter (S-A1) & 12.20 meter (S-A2)**. Jika kontraktor dipaksa memancang hingga 14 m, spun pile berisiko pecah berkeping-keping karena dipukul menembus batasan formasi keras. Dokumen draf RKS harus disesuaikan dengan laporan sondir tanah mekanis (12 meter).`,
    chats: {
      "demo-konstr-01": [
        {
          id: "k-msg-1",
          sender: "user",
          text: "Berapa kelas mutu beton kompresif yang diwajibkan untuk balok dan kolom?",
          timestamp: new Date().toISOString()
        },
        {
          id: "k-msg-2",
          sender: "ai",
          text: "Berdasarkan rujukan RKS, kelas mutu beton kompresif yang wajib ditaati untuk struktur kolom, balok bertulang, dan lantai slab adalah **fc' 30 MPa** (yang disetarakan dengan kubus **K-350**), dengan mutu baja mengacu pada standar **SNI 2847:2019**.",
          timestamp: new Date().toISOString(),
          citations: [
            {
              id: "cit-k1",
              docId: "demo-konstr-01",
              docName: "01_Rencana_Kerja_dan_Syarat_RKS_Gedung_EPC.pdf",
              pageNum: 1,
              text: "wajib menggunakan readymix klas mutu fc' 30 MPa (setara dengan K-350) yang lolos kualifikasi pengujian laboratorium independen pada usia 28 hari."
            }
          ]
        },
        {
          id: "k-msg-3",
          sender: "user",
          text: "Berapa kapasitas daya dukung lateral spun pile fondasi yang dipersyaratkan?",
          timestamp: new Date().toISOString()
        },
        {
          id: "k-msg-4",
          sender: "ai",
          text: "Spesifikasi pekerjaan fondasi mensyaratkan spun pile fondasi berdiameter 400 mm kelas B memiliki kapasitas **daya dukung lateral minimal 35 ton per titik tiang tunggal**.",
          timestamp: new Date().toISOString(),
          citations: [
            {
              id: "cit-k2",
              docId: "demo-konstr-01",
              docName: "01_Rencana_Kerja_dan_Syarat_RKS_Gedung_EPC.pdf",
              pageNum: 2,
              text: "Tiang pancang spun pile diameter 400 mm kelas B dengan syarat penetrasi tiang mencapai tanah keras dengan kedudukan nilai daya dukung lateral minimal 35 ton per titik tiang tunggal."
            }
          ]
        }
      ],
      "demo-konstr-02": [
        {
          id: "k2-msg-1",
          sender: "user",
          text: "Pada kedalaman berapa tanah keras qc >= 150 kg/cm2 dideteksi dalam laporan sondir?",
          timestamp: new Date().toISOString()
        },
        {
          id: "k2-msg-2",
          sender: "ai",
          text: "Berdasarkan Laporan Penyelidikan Tanah Sondir (Cone Penetration Test), kekuatan tanah keras keras (qc >= 150 kg/cm2) dideteksi pada kedalaman:\n\n- **Titik Uji S-A1**: Tercapai pada kedalaman **11,60 meter**.\n- **Titik Uji S-A2**: Tercapai pada kedalaman **12,20 meter**.\n\nHal ini disimpulkan oleh insinyur sipil bahwa formasi pendukung stabil termuai solid merata dari kedalaman **12,0 meter ke bawah**.",
          timestamp: new Date().toISOString(),
          citations: [
            {
              id: "cit-k3",
              docId: "demo-konstr-02",
              docName: "02_Kompilasi_Hasil_Uji_Sondir_Tanah_CPT_Metode_Sipil.pdf",
              pageNum: 1,
              text: "Hambatan ujung konus (qc) mencapai batas tanah keras (qc >= 150 kg/cm2): Titik S-A1: Tercapai stabil pada kedalaman 11,60 meter. Titik S-A2: Tercapai stabil pada kedalaman 12,20 meter."
            }
          ]
        }
      ]
    }
  },
  legal: {
    id: "legal",
    industry: "legal",
    title: "Demo Legalis & Hukum Kontrak",
    subtitle: "Analisis Mitigasi Liabilitas, Klausul Arbitrase BANI & Batasan Hak Ganti Rugi",
    compareDocA: "demo-legal-01",
    compareDocB: "demo-legal-02",
    documents: [
      {
        id: "demo-legal-01",
        name: "01_Draf_Perjanjian_Kerjasama_Kemitraan_Strategis.pdf",
        size: 245100,
        uploadedAt: new Date().toISOString(),
        status: "fully_enriched",
        extractedText: `DRAF PERJANJIAN KERJASAMA KEMITRAAN BISNIS STRATEGIS
DRAF KONTRAK PELAKSANAAN INTEGRASI DIGITAL

PASAL 14: BATASAN TANGGUNG JAWAB (LIMITATION OF LIABILITY)
PT Archon Digital Solusi dan Penyedia Jasa menyepakati bahwa batasan nilai tanggung jawab ganti rugi akumulatif atas cidera janji, wanprestasi, kelalaian, atau tuntutan hukum lainnya maksimal adalah senilai total Kontrak Kerja yang diterima oleh Penyedia Jasa. Pihak manapun tidak berhak atas ganti rugi konsekuensial (consequential damages) seperti hilangnya profit bisnis.

PASAL 17: PENYELESAIAN SENGKETA DAN FORUM ARBITRASE
Setiap perselisihan, perbedaan penafsiran, atau sengketa hukum pelaksanaan kontrak yang tidak dapat diselesaikan lewat musyawarah mufakat akan diselesaikan secara eksklusif melalui badan arbitrase independen nasional. Penyelesaian hukum final ditunjuk pada Arbitrase Badan Arbitrase Nasional Indonesia (BANI) bertempat di Jakarta, menggunakan kaidah-kaidah hukum acara persidangan BANI yang berlaku saat pendaftaran sengketa diajukan.`,
        chunks: [
          {
            id: "dl1-c1",
            pageNum: 1,
            text: `[PERJANJIAN BISNIS STRATEGIS - HALAMAN 1]
PASAL 14: BATASAN TANGGUNG JAWAB (LIMITATION OF LIABILITY)
Batasan ganti rugi akumulatif (liability cap) tidak boleh melebihi total nominal pembayaran rill kontrak yang sudah diterima.
Pemberlakuan exclusion atas 'Consequential Damages' (kerugian konsekuensial, hilangnya potensi profit usaha, atau peluang bisnis yang luput) dilarang dituduhkan kepada Pihak Kedua.`,
            sourceType: "native_text",
            documentId: "demo-legal-01"
          },
          {
            id: "dl1-c2",
            pageNum: 2,
            text: `[PERJANJIAN BISNIS STRATEGIS - HALAMAN 2]
PASAL 17: PENYELESAIAN SENGKETA OPERASIONAL & BANI ARBITRASE
Sengketa hukum disepakati diselesaikan melalui Badan Arbitrase Nasional Indonesia (BANI) Kota Jakarta secara eksklusif. Keputusan majelis arbiter bersifat final, mengikat mutlak (binding) kedua belah pihak dan tidak dapat dimintakan banding perdata.`,
            sourceType: "native_text",
            documentId: "demo-legal-01"
          }
        ]
      },
      {
        id: "demo-legal-02",
        name: "02_Klausul_Mitigasi_Liabilitas_and_Dispute_Resolution.pdf",
        size: 156820,
        uploadedAt: new Date().toISOString(),
        status: "fully_enriched",
        extractedText: `KETENTUAN MITIGASI REKAYASA LIABILITAS HUKUM DAN FORUM ALTERNATIF SENGKETA
SUPLEMENTER HUKUM INTERNASIONAL

PERIHAL LIMITATION HUYGENS CAP:
Batasan nilai ganti rugi khusus untuk kerusakan infrastruktur fisik jaringan utama ditingkatkan dari sekedar nilai pembayaran kontrak menjadi kelipatan 1,5x dari nilai kontrak (150% cap liability) guna memitigasi kerugian fatal pihak korporasi integrator sistem.

PERIHAL ARBITRASE AD-HOC DAN FORUM ALTERNATIF:
Apabila kepengurusan arbitrase melalui lembaga BANI dirasa memakan durasi yang panjang, Para Pihak dapat membuka opsi penunjukan Arbitrase Singapura (SIAC) atau Majelis Arbiter Ad-Hoc sesuai kesepakatan tertulis tambahan di bawah naungan regulasi UNCITRAL.`,
        chunks: [
          {
            id: "dl2-c1",
            pageNum: 1,
            text: `[KETENTUAN MITIGASI SUPLEMENTER - HALAMAN 1]
PENILAIAN BATAS TANGGUNG JAWAB KHUSUS:
Khusus untuk kegagalan infrastruktur fisik data center strategis, besaran batas tanggung jawab ganti rugi diset 1,5 kali atau 150% dari total nilai nominal kontrak (bukan 100% cap reguler).
RUJUKAN SENGKETA FORUM INTERNASIONAL:
Opsi alternatif penyelesaian sengketa apabila BANI di Jakarta mengalami penundaan penanganan: Dapat dialihkan di bawah yurisdiksi Singapore International Arbitration Centre (SIAC).`,
            sourceType: "native_text",
            documentId: "demo-legal-02"
          }
        ]
      }
    ],
    auditReport: `# LAPORAN AUDIT MITIGASI RISIKO HUKUM & ALOKASI LIABILITAS
## EVALUASI LIMITATION OF LIABILITY DAN KLAUSUL ARBITRASE (FORUM SENGKETA)

**Status Kepatuhan**: ⚠️ SEBAGIAN PATUH / BUTUH REVIEW (PARTIALLY COMPLIANT)
**Tanggal Audit**: 15 Juni 2026

### RINGKASAN TEMUAN UTAMA
Analisis kepatuhan perlindungan hukum dan audit mitigasi liabilitas kontrak mempertemukan draf Perjanjian Induk Kemitraan dengan Suplemen Ketentuan Mitigasi Internasional. Ditemukan kontradiksi krusial pada hak klaim finansial ganti rugi.

---

### TEMUAN KRITIS (CRITICAL FINDINGS)
*Tidak ditemukan temuan sanksi pidana kritis, namun terdapat kontradiksi batas tanggungan.*

---

### TEMUAN SEDANG (MODERATE FINDINGS)
1. **Ketidaksinkronan Batas Ganti Rugi Finansial (Liability Cap)**
   - **Tingkat Risiko**: Sedang / Moderate
   - **Kategori**: Kontradiksi Liabilitas Kontrak
   - **Deskripsi**: Perjanjian Utama menetapkan ganti rugi maksimal senilai total Kontrak Kerja (100% Liability Cap). Sedangkan Suplemen Hukum Khusus menuntut batas tanggung jawab ditingkatkan menjadi **1.5x Nilai Kontrak (150%)** khusus untuk infrastruktur fisik. Adanya dua naskah bertentangan ini membuka peluang sengketa interpretasi hukum jika penalti diajukan.
   - **Rujukan**: Dokumen 01 (Halaman 1, Pasal 14) vs Dokumen 02 (Halaman 1)
   - **Rekomendasi**: Harus ditulis penegasan eksplisit bahwa Ketentuan Suplementer (Dokumen 02) merupakan pengecualian (lex specialis) yang mengesampingkan Dokumen 01 khusus untuk infrastruktur, atau ubah salah satunya agar seirama.

2. **Dualisme Forum Arbitrase (BANI vs SIAC)**
   - **Tingkat Risiko**: Sedang / Moderate
   - **Kategori**: Risiko Sengketa Forum Belanja (Forum Shopping)
   - **Deskripsi**: Dokumen Utama mewajibkan penyelesaian perkara secara eksklusif lewat **BANI Jakarta**, sedangkan Dokumen 02 membuka opsi penunjukan arbitrase asing Singapura (**SIAC**) secara opsional sepihak jika proses BANI mandek. Hal ini berpotensi memicu sengketa ganda di dua tribunal hukum (paralel kompetensi).
   - **Rujukan**: Dokumen 01 (Halaman 2, Pasal 17) vs Dokumen 02 (Halaman 1)
   - **Rekomendasi**: Memilih salah satu forum arbitrase yang mutlak sejak awal kontrak demi kepastian hukum yang kokoh.

---

### TEMUAN MINOR
1. **Ketiadaan Klausul Hukum yang Mengatur (Governing Law)**
   - Kurangnya penegasan hukum yurisdiksi penafsiran kontrak (di bawah hukum Indonesia atau lainnya) pada draf opsional Singapura (SIAC). Rekomendasikan penulisan Klausul Hukum yang Mengatur yang kaku.`,
    compareResult: `## PERBANDINGAN YURISPRUDENSI: KEMITRAAN INDUK VS KLAUSUL MITIGASI TRANSNASIONAL

### INFORMASI HANYA DI DOKUMEN A (01_Draf_Perjanjian_Kerjasama_Kemitraan_Strategis.pdf)
- **Batasan Ganti Rugi Standar (Halaman 1, Pasal 14)**: Batasan hukuman wanprestasi reguler diset maksimal setara nilai kontrak (100% Liability Cap).
- **Pembebasan Consequential Damages**: Adanya hak peniadaan ganti rugi untuk hilangnya profit komersial draf korporasi.
- **Klausul Arbitrase BANI**: Penunjukan tunggal eksklusif tertutup pada Badan Arbitrase Nasional Indonesia (BANI) Jakarta.

### INFORMASI HANYA DI DOKUMEN B (02_Klausul_Mitigasi_Liabilitas_and_Dispute_Resolution.pdf)
- **Skema 150% Cap Liabilitas**: Penggantian kerusakan infrastruktur strategis dinaikkan batasan klaim menjadi 1.5 kali (150%) nilai bayar kontrak.
- **Yurisdiksi Singapura SIAC**: Alternatif forum persengketaan di yurisdiksi luar negeri melalui Singapore International Arbitration Centre (SIAC).

### INFORMASI YANG SAMA
- Keduanya memuat draf alokasi risiko hukum operasional, penyelesaian perselisihan, mitigasi liabilitas, dan batasan pertanggungjawaban komersif.

### PERBEDAAN KRITIS
- **Kontradiksi Batas Klaim Dana**: Dokumen A menetapkan batas maksimum ganti rugi adalah 100% kontrak, sedangkan Dokumen B menuntut 150% untuk kerusakan vital fisik.
- **Tumpukan Forum Sengketa**: Konflik forum arbitrase antara yurisdiksi domestik BANI Jakarta (A) dengan internasional Singapura SIAC (B). Inkonsistensi ini merupakan risiko tinggi yang wajib diselaraskan agar kontrak tidak batal demi hukum.`,
    chats: {
      "demo-legal-01": [
        {
          id: "l-msg-1",
          sender: "user",
          text: "Bagaimana isi batasan tanggung jawab ganti rugi (Limitation of Liability) yang disepakati?",
          timestamp: new Date().toISOString()
        },
        {
          id: "l-msg-2",
          sender: "ai",
          text: "Berdasarkan rujukan Pasal 14 Perjanjian Utama, batasan nilai tanggung jawab ganti rugi akumulatif (liability cap) yang disepakati adalah **maksimal sebesar total nominal Kontrak Kerja yang diterima oleh Penyedia Jasa**. Selain itu, para pihak dibebaskan dari tuntutan ganti rugi konsekuensial (consequential damages) seperti hilangnya potensi profit atau peluang bisnis usaha.",
          timestamp: new Date().toISOString(),
          citations: [
            {
              id: "cit-l1",
              docId: "demo-legal-01",
              docName: "01_Draf_Perjanjian_Kerjasama_Kemitraan_Strategis.pdf",
              pageNum: 1,
              text: "PT Archon Digital Solusi dan Penyedia Jasa menyepakati bahwa batasan nilai tanggung jawab ganti rugi akumulatif atas cidera janji, wanprestasi, kelalaian, atau tuntutan hukum lainnya maksimal adalah senilai total Kontrak Kerja yang diterima oleh Penyedia Jasa."
            }
          ]
        },
        {
          id: "l-msg-3",
          sender: "user",
          text: "Di mana arbitrase penanganan sengketa ditunjuk dalam draf utama ini?",
          timestamp: new Date().toISOString()
        },
        {
          id: "l-msg-4",
          sender: "ai",
          text: "Sesuai ketentuan Pasal 17, sengketa ditunjuk secara eksklusif kepada badan arbitrase independen nasional yaitu **Badan Arbitrase Nasional Indonesia (BANI) yang bertempat di Jakarta**, serta keputusan arbirter bersifat final dan mengikat mutlak (binding).",
          timestamp: new Date().toISOString(),
          citations: [
            {
              id: "cit-l2",
              docId: "demo-legal-01",
              docName: "01_Draf_Perjanjian_Kerjasama_Kemitraan_Strategis.pdf",
              pageNum: 2,
              text: "Penyelesaian hukum final ditunjuk pada Arbitrase Badan Arbitrase Nasional Indonesia (BANI) bertempat di Jakarta, menggunakan kaidah-kaidah hukum acara persidangan BANI."
            }
          ]
        }
      ],
      "demo-legal-02": [
        {
          id: "l2-msg-1",
          sender: "user",
          text: "Apa peningkatan batas tanggung jawab ganti rugi khusus di dokumen mitigasi ini?",
          timestamp: new Date().toISOString()
        },
        {
          id: "l2-msg-2",
          sender: "ai",
          text: "Dalam ketentuan mitigasi suplementer, batas ganti rugi khusus untuk kerusakan infrastruktur fisik jaringan utama ditingkatkan menjadi **1.5 kali atau 150% dari total nilai kontrak** untuk mengamankan posisi pihak integrator data center.",
          timestamp: new Date().toISOString(),
          citations: [
            {
              id: "cit-l3",
              docId: "demo-legal-02",
              docName: "02_Klausul_Mitigasi_Liabilitas_and_Dispute_Resolution.pdf",
              pageNum: 1,
              text: "Batasan nilai ganti rugi khusus untuk kerusakan infrastruktur fisik jaringan utama ditingkatkan dari sekedar nilai pembayaran kontrak menjadi kelipatan 1,5x dari nilai kontrak (150% cap liability)."
            }
          ]
        }
      ]
    }
  }
};
