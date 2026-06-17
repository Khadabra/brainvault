import React, { useState, useRef, useEffect } from "react";
import { Send, CornerDownLeft, Loader2 } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  disabled: boolean;
  placeholderText?: string;
}

export default function ChatInput({
  onSendMessage,
  isLoading,
  disabled,
  placeholderText,
}: ChatInputProps) {
  const [inputText, setInputText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow height on newline
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [inputText]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const trimmed = inputText.trim();
    if (!trimmed || isLoading || disabled) return;

    onSendMessage(trimmed);
    setInputText("");
    
    // Recenter height
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className="flex gap-2.5 items-end border border-[#262D37] rounded-xl p-2.5 transition-all focus-within:border-[#C7A86D] focus-within:ring-1 focus-within:ring-[#C7A86D]/20 bg-[#1B2028]"
    >
      <textarea
        ref={inputRef}
        rows={1}
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled || isLoading}
        placeholder={placeholderText || "Tulis pertanyaan Anda di sini..."}
        className="flex-1 resize-none bg-transparent py-2 px-2.5 border-0 focus:outline-none focus:ring-0 text-sm max-h-[120px] text-[#F5F5F5] disabled:opacity-50 placeholder-[#6B7280] font-sans"
      />

      <button
        type="submit"
        disabled={disabled || isLoading || !inputText.trim()}
        className={`p-3 rounded-lg flex items-center justify-center transition-all ${
          disabled || isLoading || !inputText.trim()
            ? "bg-[#161A20] text-[#6B7280] cursor-not-allowed border border-[#262D37]"
            : "bg-[#C7A86D] hover:bg-[#D6B978] text-[#0F1115] shadow-sm font-semibold active:scale-95"
        }`}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-[#0F1115]" />
        ) : (
          <Send className="w-4 h-4 carbon-send-icon" />
        )}
      </button>
    </form>
  );
}
