import React from "react";
import { 
  Sparkles, 
  ArrowRight, 
  Layers, 
  ShieldCheck, 
  FileText, 
  ClipboardCheck, 
  Brain, 
  Search, 
  FolderOpen, 
  CheckCircle2, 
  Database,
  RefreshCw,
  GitCompare,
  Scroll,
  Activity
} from "lucide-react";
import { motion } from "motion/react";
import { IndustryType } from "../../utils/industryTemplates";

interface EnterpriseLandingPageProps {
  onSelectDemoDataset: (type: IndustryType) => void;
  onTriggerUpload: () => void;
  onStartDemo?: () => void;
  onEnterApp?: () => void;
}

export default function EnterpriseLandingPage({ 
  onSelectDemoDataset,
  onTriggerUpload,
  onStartDemo,
  onEnterApp,
}: EnterpriseLandingPageProps) {
  
  const handleScrollToDemo = () => {
    const el = document.getElementById("demo-experience-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleScrollToWorkflow = () => {
    const el = document.getElementById("workflow-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="flex-grow min-h-screen w-full overflow-y-auto bg-[#0F1115] text-[#F5F5F5] font-sans scrollbar-thin">
      
      {/* Executive Header Navbar */}
      <header className="sticky top-0 z-50 w-full bg-[#161A20]/85 backdrop-blur-md border-b border-[#262D37] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#C7A86D] text-[#0F1115] flex items-center justify-center font-extrabold text-base shadow-sm">
              BV
            </div>
            <div className="text-left">
              <h1 className="text-sm font-bold tracking-tight text-[#F5F5F5] leading-none mb-1">
                BrainVault AI
              </h1>
              <p className="text-[9px] text-[#C7A86D] uppercase tracking-wider font-semibold leading-none">
                Enterprise Document Intelligence
              </p>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-6 text-xs text-[#9BA3AF] font-bold">
            <button onClick={handleScrollToDemo} className="hover:text-white transition cursor-pointer">Sampel Sektor</button>
            <button onClick={handleScrollToWorkflow} className="hover:text-white transition cursor-pointer">Cara Kerja</button>
            <button 
              onClick={() => {
                const el = document.getElementById("features-section");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }} 
              className="hover:text-white transition cursor-pointer"
            >
              Fitur Utama
            </button>
          </nav>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleScrollToDemo}
              className="px-4 py-2 bg-[#161A20] hover:bg-[#1B2028] text-white hover:text-amber-400 text-xs font-semibold rounded border border-[#262D37] transition cursor-pointer select-none"
            >
              Lihat Demo
            </button>
            <button
              onClick={onEnterApp}
              className="px-4 py-2 bg-[#C7A86D] hover:bg-[#D6B978] text-[#0F1115] text-xs font-bold rounded transition cursor-pointer shadow-md select-none"
            >
              Masuk Workspace
            </button>
          </div>
        </div>
      </header>

      {/* Visual background ambient grids / radial points */}
      <div className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-32 border-b border-[#1B2028]">
        {/* Subtle radial highlights */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-[#C7A86D]/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/4 left-[15%] w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 relative z-10 text-center space-y-6">
          {/* Tagline / status badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#C7A86D]/10 border border-[#C7A86D]/20 rounded-full text-[11px] font-semibold text-[#C7A86D] tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C7A86D] animate-ping" />
            Enterprise Document Intelligence Workspace
          </div>

          {/* Section 1: Hero Headlines */}
          <h1 className="max-w-4xl mx-auto text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-[1.15] font-display">
            Analisis, Bandingkan, Audit, dan Buat Laporan Dokumen dalam Hitungan Menit.
          </h1>

          <p className="max-w-2xl mx-auto text-sm md:text-base text-[#9BA3AF] leading-relaxed font-sans">
            BrainVault AI membantu tim teknik, konstruksi, legal, dan operasional memahami ribuan halaman dokumen secara cepat dan terstruktur. <span className="text-[#C7A86D] block mt-1.5 text-xs md:text-sm font-semibold">Jelajahi contoh alur kerja tanpa mengunggah dokumen pribadi.</span>
          </p>

          {/* Call to Actions (CTA) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
            <button
              onClick={onEnterApp}
              className="w-full sm:w-auto px-7 py-3.5 bg-[#C7A86D] hover:bg-[#D6B978] text-[#0F1115] text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_20px_rgba(199,168,109,0.2)] transform active:scale-98 select-none font-sans"
            >
              <span>Masuk Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleScrollToDemo}
              className="w-full sm:w-auto px-7 py-3.5 bg-[#161A20] hover:bg-[#1B2028] text-[#9BA3AF] hover:text-[#F5F5F5] text-xs font-semibold rounded-lg border border-[#262D37] transition duration-200 cursor-pointer flex items-center justify-center gap-2 select-none"
            >
              <span>Lihat Demo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section 6: Statistik Berjalan (Demo Metrics Banner) */}
      <div className="bg-[#161A20]/40 border-y border-[#262D37] py-6.5">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <div className="text-2xl md:text-3xl font-extrabold text-white font-mono">8</div>
            <div className="text-[10px] text-[#9BA3AF] uppercase tracking-wider font-semibold">Total Dokumen Demo</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl md:text-3xl font-extrabold text-[#C7A86D] font-mono">542</div>
            <div className="text-[10px] text-[#9BA3AF] uppercase tracking-wider font-semibold">Halaman Teranalisis</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl md:text-3xl font-extrabold text-amber-500 font-mono">12</div>
            <div className="text-[10px] text-[#9BA3AF] uppercase tracking-wider font-semibold">Temuan Audit</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl md:text-3xl font-extrabold text-red-500 font-mono">3</div>
            <div className="text-[10px] text-[#9BA3AF] uppercase tracking-wider font-semibold">Risiko Kritis Terdeteksi</div>
          </div>
        </div>
      </div>

      {/* Section 5: Contoh Alur Kerja / Sampel Sektor */}
      <section id="demo-experience-section" className="py-16 bg-[#0F1115] relative">
        <div className="max-w-5xl mx-auto px-6 space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white font-display">
              Contoh Alur Kerja & Sampel Sektor
            </h2>
            <p className="text-xs md:text-sm text-[#9BA3AF] max-w-xl mx-auto">
              Pelajari kapabilitas penuh kecerdasan dokumen RAG BrainVault AI menggunakan sampel alur kerja riil tanpa harus mengunggah dokumen internal organisasi Anda terlebih dahulu. Silakan pilih salah satu sampel sektor:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Demo IPAL */}
            <div className="bg-[#161A20] border border-[#262D37] hover:border-[#C7A86D]/80 rounded-xl p-6 flex flex-col justify-between transition-all group hover:shadow-[0_4px_25px_rgba(199,168,109,0.06)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#C7A86D]/2 rounded-full blur-[30px] pointer-events-none" />
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-lg bg-[#C7A86D]/10 text-[#C7A86D] border border-[#C7A86D]/20 flex items-center justify-center font-bold text-lg">
                  💧
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-white group-hover:text-[#C7A86D] transition duration-150">
                    Sektor IPAL & Sanitasi
                  </h3>
                  <p className="text-xs text-[#9BA3AF] leading-relaxed">
                    Evaluasi design engineering parameter debit hidrolis 5.000 m3/hari terhadap standar legalitas baku efluen KemenLHK Permen LHK P.68/2016.
                  </p>
                </div>
              </div>
              <button
                onClick={() => onSelectDemoDataset("ipal")}
                className="mt-6 w-full py-2.5 bg-[#C7A86D] hover:bg-[#D6B978] text-[#0F1115] text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Muat Sampel IPAL</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Demo Konstruksi */}
            <div className="bg-[#161A20] border border-[#262D37] hover:border-[#C7A86D]/80 rounded-xl p-6 flex flex-col justify-between transition-all group hover:shadow-[0_4px_25px_rgba(199,168,109,0.06)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/2 rounded-full blur-[30px] pointer-events-none" />
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 flex items-center justify-center font-bold text-lg">
                  🚧
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-white group-hover:text-[#C7A86D] transition duration-150">
                    Sektor Konstruksi & Sipil
                  </h3>
                  <p className="text-xs text-[#9BA3AF] leading-relaxed">
                    Uji silang spesifikasi fondasi pancang RKS Teknis dengan hasil laporan sondir tanah mekanis (CPT) nyata untuk mendeteksi deviasi kritis.
                  </p>
                </div>
              </div>
              <button
                onClick={() => onSelectDemoDataset("konstruksi")}
                className="mt-6 w-full py-2.5 bg-[#C7A86D] hover:bg-[#D6B978] text-[#0F1115] text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Muat Sampel Konstruksi</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Demo Legal */}
            <div className="bg-[#161A20] border border-[#262D37] hover:border-[#C7A86D]/80 rounded-xl p-6 flex flex-col justify-between transition-all group hover:shadow-[0_4px_25px_rgba(199,168,109,0.06)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/2 rounded-full blur-[30px] pointer-events-none" />
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-lg">
                  ⚖️
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-white group-hover:text-[#C7A86D] transition duration-150">
                    Sektor Legalitas & Kontrak
                  </h3>
                  <p className="text-xs text-[#9BA3AF] leading-relaxed">
                    Ulas celah risiko hukum sengketa arbitrase pasif (BANI vs SIAC) serta limitasi ganti rugi liabilitas kontrak suplementer.
                  </p>
                </div>
              </div>
              <button
                onClick={() => onSelectDemoDataset("legal")}
                className="mt-6 w-full py-2.5 bg-[#C7A86D] hover:bg-[#D6B978] text-[#0F1115] text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Muat Sampel Legal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Simple alternative to upload */}
          <div className="pt-4 flex items-center justify-center gap-3">
            <span className="text-[11px] text-[#6B7280]">Atau jika ingin menggunakan dokumen milik Anda sendiri:</span>
            <button
              onClick={onTriggerUpload}
              className="text-[#C7A86D] hover:text-[#D6B978] text-[11px] font-bold underline flex items-center gap-1 cursor-pointer font-sans"
            >
              <span>Mulai Unggah PDF Baru</span>
              <FileText className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Section 2: Use Cases */}
      <section className="py-16 bg-[#161A20]/30 border-t border-[#1B2028]">
        <div className="max-w-5xl mx-auto px-6 space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white font-display">
              Fokus Kasus Penggunaan Korporasi
            </h2>
            <p className="text-xs md:text-sm text-[#9BA3AF] max-w-xl mx-auto">
              Dirancang untuk mengatasi rintangan pengawasan kepatuhan di bawah asuransi jaminan industri spesifik:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* IPAL / WTP / WWTP */}
            <div className="bg-[#161A20] border border-[#262D37] rounded-xl p-5 space-y-3">
              <span className="text-xs font-bold text-[#C7A86D] uppercase tracking-wider block border-b border-[#262D37] pb-2">IPAL / WTP / WWTP</span>
              <ul className="space-y-2.5 text-xs text-[#9BA3AF] list-disc list-inside">
                <li>Audit spesifikasi</li>
                <li>Kepatuhan baku mutu</li>
                <li>Analisis operasional</li>
              </ul>
            </div>

            {/* Konstruksi / EPC */}
            <div className="bg-[#161A20] border border-[#262D37] rounded-xl p-5 space-y-3">
              <span className="text-xs font-bold text-[#C7A86D] uppercase tracking-wider block border-b border-[#262D37] pb-2">Konstruksi / EPC</span>
              <ul className="space-y-2.5 text-xs text-[#9BA3AF] list-disc list-inside">
                <li>Bandingkan RKS dan Drawing</li>
                <li>Audit serah terima</li>
                <li>Identifikasi risiko proyek</li>
              </ul>
            </div>

            {/* Legal / Kontrak */}
            <div className="bg-[#161A20] border border-[#262D37] rounded-xl p-5 space-y-3">
              <span className="text-xs font-bold text-[#C7A86D] uppercase tracking-wider block border-b border-[#262D37] pb-2">Legal / Kontrak</span>
              <ul className="space-y-2.5 text-xs text-[#9BA3AF] list-disc list-inside">
                <li>Analisis klausul</li>
                <li>Risiko kontrak</li>
                <li>Perbedaan dokumen</li>
              </ul>
            </div>

            {/* Operasional */}
            <div className="bg-[#161A20] border border-[#262D37] rounded-xl p-5 space-y-3">
              <span className="text-xs font-bold text-[#C7A86D] uppercase tracking-wider block border-b border-[#262D37] pb-2">Operasional</span>
              <ul className="space-y-2.5 text-xs text-[#9BA3AF] list-disc list-inside">
                <li>SOP</li>
                <li>Checklist</li>
                <li>Kepatuhan internal</li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* Section 3: Workflow */}
      <section id="workflow-section" className="py-16 bg-[#0F1115] border-t border-[#1B2028]">
        <div className="max-w-5xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white font-display">
              Alur Kerja Intelligence Workspace
            </h2>
            <p className="text-xs md:text-sm text-[#9BA3AF]">
              Bagaimana BrainVault memproses dan mengomparasi data dokumen secara mulus:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
            
            {/* Step 1 */}
            <div className="bg-[#161A20] border border-[#262D37] rounded-lg p-4 text-center space-y-2 relative">
              <div className="w-6 h-6 rounded-full bg-[#C7A86D] text-[#0F1115] text-[11px] font-bold flex items-center justify-center mx-auto">1</div>
              <h4 className="text-xs font-bold text-white">Unggah Dokumen</h4>
              <p className="text-[10px] text-[#9BA3AF]">Menerima berkas PDF teknis, regulasi, draf kemitraan, atau as-built report.</p>
            </div>

            {/* Line / Arrow for large screens */}
            <div className="hidden md:flex items-center justify-center text-[#6B7280]">
              <ArrowRight className="w-5 h-5 text-[#C7A86D]/40" />
            </div>

            {/* Step 2 */}
            <div className="bg-[#161A20] border border-[#262D37] rounded-lg p-4 text-center space-y-2 relative">
              <div className="w-6 h-6 rounded-full bg-[#C7A86D] text-[#0F1115] text-[11px] font-bold flex items-center justify-center mx-auto">2</div>
              <h4 className="text-xs font-bold text-white">Analisis</h4>
              <p className="text-[10px] text-[#9BA3AF]">Vision OCR menyerap gambar dan teks rincian klausul, rujukan, tabel secara otomatis.</p>
            </div>

            {/* Arrow */}
            <div className="hidden md:flex items-center justify-center text-[#6B7280]">
              <ArrowRight className="w-5 h-5 text-[#C7A86D]/40" />
            </div>

            {/* Step 3 */}
            <div className="bg-[#161A20] border border-[#262D37] rounded-lg p-4 text-center space-y-2 relative">
              <div className="w-6 h-6 rounded-full bg-[#C7A86D] text-[#0F1115] text-[11px] font-bold flex items-center justify-center mx-auto">3</div>
              <h4 className="text-xs font-bold text-white">Bandingkan</h4>
              <p className="text-[10px] text-[#9BA3AF]">Uji silang rujukan lintas berkas untuk mencari bentrokan klausul dan spesifikasi.</p>
            </div>

            {/* Arrow */}
            <div className="hidden md:flex items-center justify-center text-[#6B7280]">
              <ArrowRight className="w-5 h-5 text-[#C7A86D]/40" />
            </div>

            {/* Step 4 */}
            <div className="bg-[#161A20] border border-[#262D37] rounded-lg p-4 text-center space-y-2 relative">
              <div className="w-6 h-6 rounded-full bg-[#C7A86D] text-[#0F1115] text-[11px] font-bold flex items-center justify-center mx-auto">4</div>
              <h4 className="text-xs font-bold text-white">Audit</h4>
              <p className="text-[10px] text-[#9BA3AF]">Analisis asuransi kepatuhan sektoral mengidentifikasi klasifikasi risiko & deviasi.</p>
            </div>

            {/* Arrow */}
            <div className="hidden md:flex items-center justify-center text-[#6B7280]">
              <ArrowRight className="w-5 h-5 text-[#C7A86D]/40" />
            </div>

            {/* Step 5 */}
            <div className="bg-[#161A20] border border-[#262D37] rounded-lg p-4 text-center space-y-2 relative">
              <div className="w-6 h-6 rounded-full bg-[#C7A86D] text-[#0F1115] text-[11px] font-bold flex items-center justify-center mx-auto">5</div>
              <h4 className="text-xs font-bold text-white">Laporan</h4>
              <p className="text-[10px] text-[#9BA3AF]">Komposisi berita acara ringkasan eksekutif dan lembar denda yang siap dicetak.</p>
            </div>

          </div>
        </div>
      </section>

      {/* Section 4: Fitur Utama */}
      <section id="features-section" className="py-16 bg-[#161A20]/30 border-t border-[#1B2028]">
        <div className="max-w-5xl mx-auto px-6 space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white font-display">
              Fitur Utama Platform
            </h2>
            <p className="text-xs md:text-sm text-[#9BA3AF] max-w-xl mx-auto">
              Perkakas terpadu berkinerja tinggi untuk mengawal integritas naskah dan dokumen:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Fitur 1 */}
            <div className="bg-[#161A20] border border-[#262D37] rounded-xl p-5 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-[#C7A86D]/15 text-[#C7A86D] flex items-center justify-center">
                <Search className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm text-white">OCR & Vision</h4>
              <p className="text-xs text-[#9BA3AF] leading-relaxed">
                Mengekstrak teks seakurat mungkin dari halaman dokumen PDF yang berisi skema konstruksi, tabel parameter, maupun gambar rancangan mesin.
              </p>
            </div>

            {/* Fitur 2 */}
            <div className="bg-[#161A20] border border-[#262D37] rounded-xl p-5 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-[#C7A86D]/15 text-[#C7A86D] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm text-white">Citation/Bukti Rujukan</h4>
              <p className="text-xs text-[#9BA3AF] leading-relaxed">
                Menyajikan sorotan rujukan kata-demi-kata (exact matching snippet) lengkap dengan halaman aslinya untuk menjamin transparansi keaslian data.
              </p>
            </div>

            {/* Fitur 3 */}
            <div className="bg-[#161A20] border border-[#262D37] rounded-xl p-5 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-[#C7A86D]/15 text-[#C7A86D] flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm text-white">Multi Document Hub</h4>
              <p className="text-xs text-[#9BA3AF] leading-relaxed">
                Gugus workspace lintas dokumen yang memampukan Anda menanyai beberapa rujukan regulasi berukuran tebal sekaligus dalam satu thread chat.
              </p>
            </div>

            {/* Fitur 4 */}
            <div className="bg-[#161A20] border border-[#262D37] rounded-xl p-5 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-[#C7A86D]/15 text-[#C7A86D] flex items-center justify-center">
                <GitCompare className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm text-white">Compare Engine</h4>
              <p className="text-xs text-[#9BA3AF] leading-relaxed">
                Membandingkan naskah amandemen dengan draf kontrak induk untuk melacak penambahan hak/kewajiban terselubung atau bentrokan pasal teknis.
              </p>
            </div>

            {/* Fitur 5 */}
            <div className="bg-[#161A20] border border-[#262D37] rounded-xl p-5 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-[#C7A86D]/15 text-[#C7A86D] flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm text-white">Audit Assistant</h4>
              <p className="text-xs text-[#9BA3AF] leading-relaxed">
                Meneliti draf secara mendalam mengimplementasikan rujukan baku mutu nasional untuk menyusun klasifikasi ancaman risiko korporat secara dinamis.
              </p>
            </div>

            {/* Fitur 6 */}
            <div className="bg-[#161A20] border border-[#262D37] rounded-xl p-5 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-[#C7A86D]/15 text-[#C7A86D] flex items-center justify-center">
                <Scroll className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm text-white">Professional Report</h4>
              <p className="text-xs text-[#9BA3AF] leading-relaxed">
                Penyusun rancangan draf ringkasan eksekutif, berita acara evaluasi kelayakan secara runtun terstruktur lengkap dengan formulir siap cetak print.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 7: Footer */}
      <footer className="bg-[#0F1115] border-t border-[#1B2028] py-10 text-center space-y-2">
        <div className="text-sm font-extrabold text-white font-display flex items-center justify-center gap-1.5">
          <div className="w-5 h-5 rounded bg-[#C7A86D] text-[#0F1115] text-[10px] font-bold flex items-center justify-center">BV</div>
          <span>BrainVault AI</span>
        </div>
        <p className="text-xs text-[#6B7280]">
          Enterprise Document Intelligence Platform &copy; 2026. All rights reserved.
        </p>
      </footer>

    </div>
  );
}
