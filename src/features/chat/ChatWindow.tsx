import React, { useRef, useEffect, useState } from "react";
import { MessageSquare, RefreshCw, Sparkles, Terminal, FileText, Trash2 } from "lucide-react";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import { ChatMessage } from "../../types/chat";
import { Document } from "../../types/document";
import { IndustryType, INDUSTRY_WORKSPACES } from "../../utils/industryTemplates";

interface ChatWindowProps {
  activeDoc: Document | null;
  activeId: string | null;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onClearHistory: () => void;
  isLoading: boolean;
  onOpenCitation?: (citation: any) => void;
  selectedIndustry?: IndustryType;
  documentsCount?: number;
  onTriggerUpload?: () => void;
}

export default function ChatWindow({
  activeDoc,
  activeId,
  messages,
  onSendMessage,
  onClearHistory,
  isLoading,
  onOpenCitation,
  selectedIndustry = "umum",
  documentsCount = 0,
  onTriggerUpload = () => {},
}: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const isWorkspace = activeId === "all_documents";
  const hasActiveSelection = (activeDoc !== null || isWorkspace) && documentsCount > 0;

  // Auto scroll to latest bubble on message count changed or loading state changed
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Reset confirmation state when active document changes
  useEffect(() => {
    setShowConfirm(false);
  }, [activeId]);

  // Retrieve industry questions dynamically
  const activeIndustryInfo = INDUSTRY_WORKSPACES.find(ind => ind.id === selectedIndustry);
  const industryQuestions = activeIndustryInfo ? activeIndustryInfo.questions : [];

  const starterQuestions = isWorkspace && industryQuestions.length > 0
    ? industryQuestions
    : [
         "Tolong jelaskan ringkasan dari dokumen ini secara singkat.",
         "Apa saja poin-poin penting atau kesimpulan utama di sini?",
         "Adakah data angka, tanggal, atau statistik menarik di dalamnya?",
         ...(industryQuestions.slice(0, 1))
       ];

  return (
    <div id="chat-window-viewport" className="flex-1 flex flex-col min-h-0 bg-[#0F1115] overflow-hidden">
      
      {/* Header Panel */}
      <div className="bg-[#161A20] border-b border-[#262D37] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-[#1B2028] text-[#C7A86D] border border-[#262D37] flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold tracking-tight text-[#F5F5F5] truncate">
              {isWorkspace ? "Workspace Lintas Dokumen" : "Tanya-Jawab AI"}
            </h3>
            <p className="text-[11px] text-[#9BA3AF] truncate mt-0.5">
              {documentsCount === 0
                ? "Belum ada dokumen yang dianalisis"
                : isWorkspace
                  ? "Menjelajahi Seluruh Dokumen Aktif"
                  : activeDoc
                    ? `Menjelajahi: ${activeDoc.name}`
                    : "Pilih dokumen di sebelah kiri"}
            </p>
          </div>
        </div>

        {/* Clear thread history action */}
        {hasActiveSelection && messages.length > 0 && (
          <div className="flex items-center gap-2">
            {showConfirm ? (
              <div className="flex items-center gap-1.5 bg-[#1B2028] border border-[#262D37] rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => {
                    onClearHistory();
                    setShowConfirm(false);
                  }}
                  className="px-2.5 py-1 text-[10px] bg-[#EF4444]/20 hover:bg-[#EF4444]/30 border border-[#EF4444]/40 text-[#EF4444] font-bold rounded transition"
                >
                  Ya, Hapus
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="px-2 py-1 text-[10px] text-[#9BA3AF] font-semibold hover:bg-[#161A20] rounded transition"
                >
                  Batal
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-[#EF4444] hover:bg-[#EF4444]/10 border border-[#EF4444]/20 bg-transparent rounded-lg font-medium transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus Riwayat
              </button>
            )}
          </div>
        )}
      </div>

      {/* Messages Thread list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6"
      >
        {documentsCount === 0 ? (
          // System Empty State: No documents uploaded yet
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto">
            <div className="p-4 bg-[#161A20] border border-[#262D37] rounded-xl text-[#C7A86D] mb-4 shadow">
              <FileText className="w-8 h-8" />
            </div>
            <h4 id="empty-workspace-title" className="text-sm font-bold tracking-tight text-[#F5F5F5]">Belum ada dokumen yang dianalisis.</h4>
            <p id="empty-workspace-desc" className="text-xs text-[#9BA3AF] mt-2 leading-relaxed">
              Unggah dokumen untuk memulai analisis, audit, dan pembuatan laporan.
            </p>
            <button
              onClick={onTriggerUpload}
              className="mt-5 px-5 py-2 hover:bg-[#C7A86D]/95 bg-[#C7A86D] text-[#0F1115] text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            >
              <Sparkles className="w-4 h-4" />
              <span>Unggah Dokumen</span>
            </button>

            {/* Recommendations (Disabled Style) */}
            <div className="w-full mt-6 bg-[#161A20]/40 p-4 rounded-xl border border-[#262D37]/50 opacity-40 select-none">
              <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#6B7280]" />
                Rekomendasi Pertanyaan (Nonaktif):
              </p>
              <div className="flex flex-col gap-2">
                {starterQuestions.slice(0, 2).map((q, idx) => (
                  <button
                    key={idx}
                    disabled
                    className="text-slate-500 bg-[#1B2028]/60 text-left text-xs p-2.5 rounded-lg border border-[#262D37]/30 cursor-not-allowed font-medium"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : !hasActiveSelection ? (
          // Case 1: No selected active document
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
            <div className="p-4 bg-[#161A20] border border-[#262D37] rounded-xl text-[#C7A86D] mb-4 shadow">
              <FileText className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-semibold tracking-tight text-[#F5F5F5]">Belum Ada Dokumen Terpilih</h4>
            <p className="text-xs text-[#9BA3AF] mt-2 leading-relaxed">
              Silakan unggah dan pilih dokumen PDF melalui menu kiri untuk memulai analisis cerdas di Ruang Kerja Dokumen.
            </p>
          </div>
        ) : messages.length === 0 ? (
          // Case 2: Document loaded but chat is completely new
          <div className="flex-1 flex flex-col justify-center py-6">
            <div className="text-center max-w-sm mx-auto mb-8">
              <div className="w-12 h-12 bg-[#161A20] border border-[#262D37] text-[#C7A86D] rounded-xl flex items-center justify-center mx-auto mb-4 shadow">
                <Sparkles className="w-5 h-5 text-[#C7A86D] animate-pulse" />
              </div>
              <h4 className="text-base font-bold text-[#F5F5F5] tracking-tight">
                BrainVault AI Workspace
              </h4>
              <p className="text-xs text-[#9BA3AF] mt-2 leading-relaxed">
                Asisten kecerdasan dokumen profesional. Ajukan pertanyaan terperinci untuk mengulas isi, regulasi, dan draf teknis.
              </p>
            </div>

            {/* Quick starter questions prompt suggestions */}
            <div className="max-w-md mx-auto w-full flex flex-col gap-2.5 bg-[#161A20] p-4.5 rounded-xl border border-[#262D37] shadow-sm">
              <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#C7A86D]" />
                Pertanyaan Rekomendasi:
              </p>
              {starterQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(q)}
                  className="text-[#9BA3AF] bg-[#1B2028] hover:text-[#C7A86D] hover:bg-[#1B2028]/80 text-left text-xs p-3 rounded-lg border border-[#262D37] transition-all font-medium leading-relaxed cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          // Case 3: Conversation in progress
          <>
            {messages.map((msg) => (
              <MessageBubble 
                key={msg.id} 
                message={msg} 
                onOpenCitation={onOpenCitation}
              />
            ))}

            {/* Simulated Live Thinking Skeleton */}
            {isLoading && (
              <div className="flex gap-3.5 max-w-[80%] self-start animate-pulse">
                <div className="w-9 h-9 rounded-lg bg-[#C7A86D] text-[#0F1115] flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4.5 h-4.5" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="px-4.5 py-3.5 bg-[#161A20] border border-[#262D37] rounded-xl rounded-tl-none shadow-sm flex items-center gap-2.5 text-[#9BA3AF] text-xs font-sans">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#C7A86D]" />
                    <span>Mengekstrak referensi dan merumuskan laporan jawaban...</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-[#161A20] border-t border-[#262D37] p-4.5">
        <ChatInput
          onSendMessage={onSendMessage}
          isLoading={isLoading}
          disabled={!hasActiveSelection || documentsCount === 0}
          placeholderText={
            documentsCount === 0
              ? "Unggah dokumen terlebih dahulu untuk bertanya"
              : isWorkspace
                ? "Tulis pertanyaan analitis lintas dokumen..."
                : activeDoc
                  ? `Tulis pertanyaan tentang "${activeDoc.name}"...`
                  : "Unggah dokumen terlebih dahulu untuk bertanya"
          }
        />
      </div>
    </div>
  );
}
