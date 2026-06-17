import React, { useState } from "react";
import { FileText, Trash2, Calendar, ClipboardCheck, Layers } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Document } from "../../types/document";

interface DocumentListProps {
  documents: Document[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function DocumentList({
  documents,
  activeId,
  onSelect,
  onDelete,
}: DocumentListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Format file bytes to KB or MB safely
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Format date readable
  const formatDate = (isoStr: string): string => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return isoStr;
    }
  };

  const getPageCount = (doc: Document): number => {
    if (doc.chunks && doc.chunks.length > 0) {
      const pages = doc.chunks.map(c => c.pageNum).filter(Boolean);
      if (pages.length > 0) {
        return Math.max(...pages);
      }
    }
    return 1;
  };

  const renderStatusBadge = (status?: string) => {
    const resolvedStatus = status || "enrichment_partial";
    switch (resolvedStatus) {
      case "enriching":
      case "indexed_native":
        return (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#F59E0B] bg-[#F59E0B]/10 px-2.5 py-1 rounded border border-[#F59E0B]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse"></span>
            Memproses
          </span>
        );
      case "fully_enriched":
        return (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#C7A86D] bg-[#C7A86D]/10 px-2.5 py-1 rounded border border-[#C7A86D]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C7A86D]"></span>
            Selesai
          </span>
        );
      case "enrichment_failed":
        return (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#EF4444] bg-[#EF4444]/10 px-2.5 py-1 rounded border border-[#EF4444]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]"></span>
            Gagal
          </span>
        );
      default: // enrichment_partial
        return (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#22C55E] bg-[#22C55E]/10 px-2.5 py-1 rounded border border-[#22C55E]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]"></span>
            Siap
          </span>
        );
    }
  };

  return (
    <div id="document-list-container" className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-[#C7A86D]" />
          Koleksi Dokumen ({documents.length})
        </h3>
      </div>

      {documents.length === 0 ? (
        <div
          id="empty-docs-view"
          className="flex flex-col items-center justify-center p-6 bg-[#0F1115] rounded-lg border border-dashed border-[#262D37] text-center"
        >
          <FileText className="w-8 h-8 text-[#6B7280] stroke-[1.5] mb-2" />
          <p className="text-xs font-bold text-[#F5F5F5]">Belum ada dokumen</p>
          <p className="text-[10.5px] text-[#9BA3AF] mt-1.5 max-w-[200px] mx-auto leading-relaxed">
            Unggah file PDF terlebih dahulu untuk mulai bersoal-jawab cerdas.
          </p>
        </div>
      ) : (
        <div id="docs-list-grid" className="flex flex-col gap-2 max-h-[340px] overflow-y-auto pr-1">
          
          {/* All Documents Mode */}
          {documents.length > 0 && (
            <motion.div
              layout
              onClick={() => onSelect("all_documents")}
              className={`relative flex items-center justify-between p-3.5 rounded-lg border cursor-pointer transition-all ${
                activeId === "all_documents"
                  ? "border-[#C7A86D] bg-[#161A20] shadow-sm"
                  : "border-[#262D37] bg-[#1B2028] hover:border-[#6B7280] hover:bg-[#161A20]/80"
              }`}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div
                  className={`p-2 rounded-lg flex-shrink-0 border ${
                    activeId === "all_documents"
                      ? "bg-[#C7A86D] text-[#0F1115] border-[#C7A86D]"
                      : "bg-[#161A20] border-[#262D37] text-[#9BA3AF]"
                  }`}
                >
                  <Layers className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p
                      className={`text-xs font-bold truncate ${
                        activeId === "all_documents" ? "text-[#C7A86D]" : "text-[#F5F5F5]"
                      }`}
                    >
                      Semua Dokumen
                    </p>
                    {activeId === "all_documents" && (
                      <span className="flex-shrink-0 text-[9px] font-bold text-[#C7A86D] bg-[#C7A86D]/10 px-1.5 py-0.5 rounded border border-[#C7A86D]/20 flex items-center gap-0.5">
                        <ClipboardCheck className="w-2.5 h-2.5" />
                        Aktif
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#9BA3AF] mt-0.5">
                    Mode Lintas Dokumen ({documents.length} File)
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {documents.map((doc) => {
              const isActive = doc.id === activeId;
              const pages = getPageCount(doc);
              return (
                <motion.div
                  key={doc.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => onSelect(doc.id)}
                  className={`relative flex flex-col p-3.5 rounded-lg border cursor-pointer transition-all gap-2.5 ${
                    isActive
                      ? "border-[#C7A86D] bg-[#161A20] shadow-sm"
                      : "border-[#262D37] bg-[#1B2028] hover:border-[#6B7280] hover:bg-[#161A20]/80"
                  }`}
                >
                  <div className="flex items-start gap-3 w-full min-w-0 justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div
                        className={`p-2.5 rounded-lg flex-shrink-0 border ${
                          isActive
                            ? "bg-[#C7A86D] text-[#0F1115] border-[#C7A86D]"
                            : "bg-[#161A20] border-[#262D37] text-[#9BA3AF]"
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 w-full min-w-0">
                          <p
                            title={doc.name}
                            className={`text-xs font-bold truncate flex-1 ${
                              isActive ? "text-[#C7A86D]" : "text-[#F5F5F5]"
                            }`}
                          >
                            {doc.name}
                          </p>
                          {isActive && (
                            <span className="flex-shrink-0 text-[9px] font-bold text-[#C7A86D] bg-[#C7A86D]/10 px-1.5 py-0.5 rounded border border-[#C7A86D]/20 flex items-center gap-0.5">
                              <ClipboardCheck className="w-2.5 h-2.5" />
                              Aktif
                            </span>
                          )}
                        </div>

                        {/* Metadata row */}
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-1 text-[10.5px] font-semibold text-[#9BA3AF]">
                          <span className="font-mono bg-[#0F1115] px-1.5 py-0.5 rounded border border-[#262D37] text-[10px]">
                            {formatBytes(doc.size)}
                          </span>
                          <span className="text-[#262D37]">•</span>
                          <span className="text-[10px]">{pages} Halaman</span>
                        </div>
                      </div>
                    </div>

                    {/* Delete button wrapper */}
                    <div className="flex items-center gap-1 flex-shrink-0 ml-1" onClick={(e) => e.stopPropagation()}>
                      {deletingId === doc.id ? (
                        <div className="flex items-center gap-1 bg-[#161A20] border border-[#262D37] rounded-lg p-0.5 shadow-sm">
                          <button
                            type="button"
                            onClick={() => {
                              onDelete(doc.id);
                              setDeletingId(null);
                            }}
                            className="px-2 py-0.5 text-[9px] bg-[#EF4444] text-white font-bold rounded hover:bg-[#EF4444]/90 transition"
                          >
                            Ya
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(null)}
                            className="px-2 py-0.5 text-[9px] text-[#9BA3AF] font-bold hover:bg-[#1B2028] rounded transition"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          title="Hapus Dokumen"
                          onClick={() => setDeletingId(doc.id)}
                          className="p-1.5 rounded text-[#6B7280] hover:text-[#EF4444] hover:bg-[#161A20] transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Status & Timestamp */}
                  <div className="flex items-center justify-between border-t border-[#262D37] pt-2 mt-0.5">
                    {renderStatusBadge(doc.status)}
                    <span className="flex items-center gap-1 text-[10px] text-[#6B7280] font-mono font-medium">
                      <Calendar className="w-3 h-3" />
                      {formatDate(doc.uploadedAt)}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
