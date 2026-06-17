import React, { useState } from "react";
import { User, Sparkles, BookOpen, ChevronDown, ChevronUp, AlertCircle, FileText } from "lucide-react";
import { ChatMessage } from "../../types/chat";

interface MessageBubbleProps {
  message: ChatMessage;
  key?: React.Key;
  onOpenCitation?: (citation: any) => void;
}

export default function MessageBubble({ message, onOpenCitation }: MessageBubbleProps) {
  const isAi = message.sender === "ai";
  const [citationsExpanded, setCitationsExpanded] = useState(false);

  // Formatter to render simple bold strings, lists, linebreaks, and blockquotes cleanly
  const formatText = (rawText: string) => {
    if (!rawText) return null;

    const lines = rawText.split("\n");
    return lines.map((line, lineIdx) => {
      // 1. Check for headers/bold lines or subheadings
      if (line.startsWith("### ")) {
        return (
          <h4 key={lineIdx} className="text-sm font-semibold text-[#C7A86D] font-display mt-4 mb-1.5 first:mt-0">
            {line.replace("### ", "")}
          </h4>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h3 key={lineIdx} className="text-base font-bold text-[#C7A86D] font-display mt-5 mb-2.5 first:mt-0 border-b border-[#262D37] pb-1">
            {line.replace("## ", "")}
          </h3>
        );
      }

      // 2. Format lists with bullets
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        const cleanContent = line.trim().substring(2);
        return (
          <li key={lineIdx} className="ml-4 list-disc pl-1 mb-1.5 text-[#9BA3AF] leading-relaxed font-sans">
            {renderInlineStyles(cleanContent)}
          </li>
        );
      }

      // 3. Format numbered lists
      const numberMatch = line.trim().match(/^(\d+)\.\s(.*)/);
      if (numberMatch) {
         const orderNumber = numberMatch[1];
        const cleanContent = numberMatch[2];
        return (
          <li key={lineIdx} className="ml-4 list-decimal pl-1 mb-1.5 text-[#9BA3AF] leading-relaxed font-sans">
             {renderInlineStyles(cleanContent)}
          </li>
        );
      }

      // 4. Default inline text formatting
      return (
        <p key={lineIdx} className="min-h-[1.25rem] mb-2 leading-relaxed text-[#9BA3AF] font-sans last:mb-0">
          {renderInlineStyles(line)}
        </p>
      );
    });
  };

  // Replace double asterisks (**text**) and single backticks (`text`) with styled tags
  const renderInlineStyles = (txt: string) => {
    const parts: React.ReactNode[] = [];
    let currentIndex = 0;

    // Pattern matching either bold (**word**) or custom inline code (`code`)
    const regex = /(\*\*.*?\*\*|`.*?`)/g;
    let match;

    while ((match = regex.exec(txt)) !== null) {
      const matchIndex = match.index;
      const matchedString = match[0];

      // Add preceding plain text
      if (matchIndex > currentIndex) {
        parts.push(txt.substring(currentIndex, matchIndex));
      }

      // Format bold text
      if (matchedString.startsWith("**") && matchedString.endsWith("**")) {
        const boldText = matchedString.slice(2, -2);
        parts.push(
          <strong key={matchIndex} className="font-semibold text-[#F5F5F5]">
            {boldText}
          </strong>
        );
      } 
      // Format inline code
      else if (matchedString.startsWith("`") && matchedString.endsWith("`")) {
        const codeText = matchedString.slice(1, -1);
        parts.push(
          <code key={matchIndex} className="bg-[#1B2028] text-[#C7A86D] font-mono px-1.5 py-0.5 rounded text-xs select-all border border-[#262D37]">
            {codeText}
          </code>
        );
      }

      currentIndex = regex.lastIndex;
    }

    // Add trailing plain text
    if (currentIndex < txt.length) {
      parts.push(txt.substring(currentIndex));
    }

    return parts.length > 0 ? parts : txt;
  };

  const getFormattedTime = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const isQuotaError = isAi && (
    message.text.toLowerCase().includes("quota") ||
    message.text.toLowerCase().includes("limit") ||
    message.text.toLowerCase().includes("429") ||
    message.text.toLowerCase().includes("resource_exhausted") ||
    message.text.toLowerCase().includes("exceeded") ||
    message.text.toLowerCase().includes("gagal memanggil ai") ||
    message.text.startsWith("Error:")
  );

  return (
    <div
      className={`flex gap-3.5 max-w-[85%] md:max-w-[80%] ${
        isAi ? "self-start" : "self-end flex-row-reverse"
      }`}
    >
      {/* Icon */}
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border ${
          isAi
            ? isQuotaError
              ? "bg-[#EF4444] text-white border-[#EF4444]"
              : "bg-[#C7A86D] text-[#0F1115] border-[#C7A86D]"
            : "bg-[#1B2028] text-[#9BA3AF] border-[#262D37]"
        }`}
      >
        {isAi ? (isQuotaError ? <AlertCircle className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />) : <User className="w-4 h-4" />}
      </div>

      {/* Bubble Container */}
      <div className="flex flex-col gap-1.5 max-w-full">
        <div
          className={`px-4.5 py-3.5 rounded-xl text-sm border ${
            isAi
              ? isQuotaError
                ? "bg-[#161A20] border-[#EF4444]/50 rounded-tl-none text-[#EF4444]"
                : "bg-[#161A20] border-[#262D37] rounded-tl-none text-[#F5F5F5]"
              : "bg-[#1B2028] border-[#262D37] rounded-tr-none text-[#F5F5F5]"
          }`}
        >
          {isAi ? (
            isQuotaError ? (
              <div className="flex flex-col gap-3 p-1">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-[#EF4444]/10 rounded text-[#EF4444] flex-shrink-0 mt-0.5">
                    <AlertCircle className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-1 flex flex-col gap-1">
                    <h5 className="font-bold text-[13px] text-[#EF4444] uppercase tracking-wide">
                      Limit Kuota Layanan Tercapai (HTTP 429)
                    </h5>
                    <p className="text-xs text-[#9BA3AF] leading-relaxed font-semibold">
                      Harap maklum, batas akses gratis harian (free-tier quota) untuk model kecerdasan AI Anda saat ini telah mencapai batasnya (maksimum 20 pemanggilan per hari).
                    </p>
                    <p className="text-xs text-[#6B7280] leading-relaxed">
                      Hal ini adalah perilaku bawaan Google AI Studio untuk mencegah spam. Anda dapat menunggu beberapa saat hingga sistem disetel ulang secara berkala, atau meningkatkan langganan kunci API Anda di bawah menu panel Settings &rarr; Secrets ke akun berbayar.
                    </p>
                  </div>
                </div>
                <div className="text-[10.5px] text-[#9BA3AF] font-mono mt-1 p-2.5 bg-[#0F1115] border border-[#262D37] rounded-lg whitespace-pre-line overflow-x-auto select-all leading-relaxed max-h-[120px]">
                  <strong>Detail Kesalahan Sistem:</strong>
                  {"\n"}{message.text}
                </div>
              </div>
            ) : (
              <div className="prose prose-sm font-normal break-words max-w-none text-[#9BA3AF] leading-relaxed">
                {formatText(message.text)}
              </div>
            )
          ) : (
            <div className="whitespace-pre-line break-words text-[#F5F5F5] font-sans leading-relaxed">
              {message.text}
            </div>
          )}

          {isAi && message.citations && message.citations.length > 0 && (
            <div className="mt-3.5 pt-3 border-t border-[#262D37]">
              <button
                type="button"
                onClick={() => {
                  setCitationsExpanded(!citationsExpanded);
                  // Trigger event callback if available to display/scroll references panel
                  if (onOpenCitation && message.citations) {
                    onOpenCitation(message.citations);
                  }
                }}
                className="flex items-center justify-between w-full text-xs font-bold text-[#9BA3AF] hover:text-[#C7A86D] transition-colors py-1 cursor-pointer"
                id={`btn-citations-${message.id}`}
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#C7A86D]" />
                  <span>Referensi Sumber ({message.citations.length})</span>
                </span>
                {citationsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {citationsExpanded && (
                <div id={`citations-${message.id}`} className="mt-2.5 flex flex-col gap-2.5">
                  {message.citations.map((cit, idx) => (
                    <div
                      key={cit.id || idx}
                      onClick={() => {
                        if (onOpenCitation) {
                          onOpenCitation(cit);
                        }
                      }}
                      className="bg-[#1B2028] hover:bg-[#1B2028]/90 border border-[#262D37] rounded-lg p-3.5 transition text-xs flex flex-col gap-2.5 cursor-pointer hover:border-[#C7A86D]"
                    >
                      {/* Document Details Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-[#262D37] pb-2">
                        <div className="flex items-center gap-1.5 min-w-0 max-w-[70%] text-left">
                          <FileText className="w-4 h-4 text-[#C7A86D] flex-shrink-0" />
                          <div className="truncate text-[11px] font-semibold text-[#F5F5F5]">
                            <span className="text-[#6B7280] font-normal">Nama Dokumen:</span> {cit.documentName || "Dokumen Aktif"}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-[#9BA3AF]">
                          <span className="bg-[#161A20] border border-[#262D37] px-2 py-0.5 rounded text-[10px] font-bold">
                            Halaman {cit.pageNum}
                          </span>
                        </div>
                      </div>

                      {/* Snippet Block */}
                      <div className="text-[#9BA3AF] text-left leading-relaxed italic bg-[#161A20] p-2.5 rounded border border-[#262D37] text-[11px] select-all">
                        "{cit.text}"
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between text-[10px] text-[#6B7280] pt-0.5">
                        <span className="font-semibold tracking-wider uppercase text-[8.5px]">SUMBER #{idx + 1}</span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#161A20] text-[#C7A86D] border border-[#262D37] rounded-full font-bold text-[9.5px]">
                          Pratinjau Kutipan
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <span
          className={`text-[9px] font-semibold text-[#6B7280] uppercase tracking-widest px-1 font-mono ${
            isAi ? "text-left" : "text-right"
          }`}
        >
          {getFormattedTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}
