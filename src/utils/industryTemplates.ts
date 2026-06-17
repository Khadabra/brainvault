export type IndustryType = "umum" | "ipal" | "konstruksi" | "legal";

export interface IndustryWorkspace {
  id: IndustryType;
  title: string;
  badge: string;
  focus: string;
  icon: string;
  checklist: string[];
  questions: string[];
  auditPromptModifier: string;
  reportTemplateModifier: string;
}

export const INDUSTRY_WORKSPACES: IndustryWorkspace[] = [
  {
    id: "umum",
    title: "Umum / General Korporat",
    badge: "GENERAL",
    focus: "Kepatuhan Administratif, Integritas Tata Naskah, & Kelengkapan Rujukan Utama",
    icon: "Layout",
    checklist: [
      "Verifikasi identitas lengkap para pihak penandatangan draf",
      "Pemeriksaan konsistensi format penulangan dan penomoran pasal/bab",
      "Pemeriksaan kejelasan hak dan tanggung jawab administratif utama",
      "Verifikasi tanggal efektifitas perjanjian dan masa berlaku naskah",
      "Konfirmasi lampiran regulasi eksternal pendukung yang dirujuk"
    ],
    questions: [
      "Apakah seluruh tanda tangan dan kelengkapan lampiran draf sudah tercantum?",
      "Bagaimana tingkat kepatuhan tata naskah dan format penomoran dokumen ini?",
      "Apakah ada tumpang tindih klausul atau kontradiksi pasal administratif?",
      "Sebutkan hak dan kewajiban utama masing-masing pihak dalam draf dokumen ini."
    ],
    auditPromptModifier: `Pemeriksaan berfokus pada KPATUHAN ADMINISTRATIF UMUM dan INTEGRITAS TATA NASKAH.
Lakukan verifikasi kelengkapan pasal-pasal standar, konsistensi penomoran bab, kelengkapan rujukan eksternal, kejelasan pembagian hak dan kewajiban pihak terlibat, serta keaslian lampiran administratif.`,
    reportTemplateModifier: "Fokus Laporan: Laporan Penilaian Kelayakan Administratif dan Konsistensi Hukum Korporasi Umum."
  },
  {
    id: "ipal",
    title: "IPAL / WTP / WWTP (Sanitasi & Air)",
    badge: "LINGKUNGAN & IPAL",
    focus: "Baku Mutu Efluen KemenLHK, Debit Hidrolis, Perizinan AMDAL/UKL-UPL, & Spesifikasi Pompa/Diffuser",
    icon: "Filter",
    checklist: [
      "Verifikasi Kesesuaian parameter efluen (BOD, COD, TSS) standar Permen LHK No. P.68/2016",
      "Pemeriksaan kapasitas debit hidraulik desain (m3/hari) vs kalkulasi penumpukan sludge",
      "Kesesuaian standar spesifikasi pompa metering, blower udara aerasi, dan fine/coarse diffuser",
      "Verifikasi kepatuhan terhadap analisis dampak lingkungan (AMDAL, UKL-UPL atau DELH)",
      "Pemeriksaan detail gambar teknis tangki sedimentasi, koagulasi, dan flokulasi"
    ],
    questions: [
      "Apakah parameter efluen air limbah (BOD, COD, TSS, pH) memenuhi Permen LHK No. P.68/2016?",
      "Apakah perhitungan hidrolisis, debit inlet-outlet, dan volume tangki aerasi sudah sinkron?",
      "Bagaimana spesifikasi pompa dosis kimia (dosing pump) dan blower aerasi yang direncanakan?",
      "Apakah terdapat izin pembuangan air limbah (IPLC) atau Persetujuan Teknis (Pertek) dalam naskah?"
    ],
    auditPromptModifier: `Pemeriksaan berfokus pada BAKU MUTU EFLUEN, DESIGN PARAMETER IPAL/WTP/WWTP, DAN REGULASI KEMENTERIAN LINGKUNGAN HIDUP DAN KEHUTANAN (Permen LHK No. P.68/2016).
Analisis secara ketat kapasitas debit influent/effluent, kecukupan volume tangki pengolahan, spesifikasi pompa metering kimia, blower, diffuser aerasi, dan kelengkapan izin AMDAL/UKL-UPL/SPPL. Nyatakan jika ada ancaman pencemaran lingkungan atau penalti operasional.`,
    reportTemplateModifier: "Fokus Laporan: Berita Acara Kelayakan Teknis Sanitasi, Parameter Hidrolis, dan Kepatuhan Baku Mutu Lingkungan IPAL/WTP."
  },
  {
    id: "konstruksi",
    title: "Konstruksi, EPC & Sipil",
    badge: "EPC / SIPIL GEN-3",
    focus: "Spesifikasi Teknis Material (Beton SNI, Baja Ulir), Sondir SPT Tanah, & Liquidated Damages",
    icon: "HardHat",
    checklist: [
      "Kesesuaian kelas mutu beton bertulang (fc' 30 MPa vs K-350) dengan SNI 2847:2019",
      "Verifikasi keberadaan draf uji sondir mekanis (CPT) dan data kekuatan daya dukung tanah",
      "Analisis deviasi pembesian diameter baja tulangan (D13 vs D16) lintas gambar shop drawing",
      "Verifikasi klausul denda keterlambatan (Liquidated Damages) dan batasan termin serah terima",
      "Pemeriksaan keselarasan draf Bill of Quantities (BOQ) dengan Rencana Kerja dan Syarat (RKS)"
    ],
    questions: [
      "Apakah spesifikasi beton karakteristik fc 30 Mpa konsisten di seluruh bab RKS dan BOQ?",
      "Apakah draf mewajibkan uji contoh silinder beton 28 hari dan uji kuat tarik besi baja ulir?",
      "Sebutkan konsekuensi denda/penalti keterlambatan (Liquidated Damages) dalam draf kontrak?",
      "Apakah daya dukung tanah fondasi dijustifikasi oleh lampiran uji sondir tanah CPT yang valid?"
    ],
    auditPromptModifier: `Pemeriksaan berfokus pada TEKNIK SIPIL, SPESIFIKASI MATERIAL, MUTU BETON & BAJA (SNI 2847:2019 & SNI 1726:2019), SERTA PEMETAAN BOQ vs RKS.
Identifikasi inkonsistensi diameter pembesian, denda liquidated damages (keterlambatan), ketiadaan laporan sondir/daya dukung tanah, kesalahan konversi mutu beton (misal fc vs K), serta cacat metode kerja pelaksanaan lapangan.`,
    reportTemplateModifier: "Fokus Laporan: Dokumen Evaluasi Kelayakan Teknis Struktur Sipil, Standardisasi Material SNI, dan Risiko Milestones EPC."
  },
  {
    id: "legal",
    title: "Legalitas & Hukum Kontrak",
    badge: "LEGAL & HUKUM",
    focus: "Mitigasi Klausul Arbitrase (BANI), Keadaan Memaksa (Force Majeure), & Batasan Nilai Ganti Rugi",
    icon: "Scale",
    checklist: [
      "Pemeriksaan kejelasan batasan ganti rugi total (Limitation of Liability Caps)",
      "Verifikasi forum penyelesaian sengketa hukum (BANI, Pengadilan, atau Arbitrase Ad-HOC)",
      "Pemeriksaan klausul Keadaan Memaksa (Force Majeure) yang adil bagi kedua belah pihak",
      "Ketegasan hak pemutusan sepihak (Termination Event of Default) beserta konsekuensi draf",
      "Identifikasi keberadaan klausul jaminan ganti rugi (indemnification) pihak ketiga"
    ],
    questions: [
      "Bagaimanakah klausul Keadaan Memaksa (Force Majeure) dikondisikan pada naskah ini?",
      "Di mana forum penyelesaian sengketa disepakati jika terjadi pelanggaran kerja?",
      "Apakah batasan nilai tanggung jawab ganti rugi (Limitation of Liability) sudah seimbang?",
      "Adakah celah hukum pemutusan sepihak yang berpotensi merugikan posisi korporasi?"
    ],
    auditPromptModifier: `Pemeriksaan berfokus pada MITIGASI RISIKO LEGAL, ALOKASI LIABILITAS KONTRAKTUAL, DAN FORCE MAJEURE.
Evaluasi klausul Arbitrase (BANI/BANI Sovereign), kelayakan Limitation of Liability cap (maksimal besaran ganti rugi), ketegasan terminasi sepihak, hak eksklusif kekayaan intelektual (IP), perlindungan kerahasiaan NDA, serta jaminan ganti rugi (Indemnification).`,
    reportTemplateModifier: "Fokus Laporan: Lembar Opini Hukum (Legal Opinion), Kepatuhan Klausul Perjanjian, dan Mitigasi Risiko Sengketa."
  }
];
