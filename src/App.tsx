import React, { useState, useEffect } from "react";
import { FolderOpen, Eye, Info, RefreshCw, FileSymlink, Sparkles, MessageSquare, Terminal, AlertCircle, BookOpen, Layers, Settings, ChevronRight, Menu, X, Sliders, Layout, FileText, ShieldCheck, Trash2, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import DocumentUpload from "./features/documents/DocumentUpload";
import DocumentList from "./features/documents/DocumentList";
import ChatWindow from "./features/chat/ChatWindow";
import AuditDashboard from "./features/audit/AuditDashboard";
import ReportGenerator from "./features/report/ReportGenerator";
import { storageService } from "./services/storageService";
import { chatService } from "./services/chatService";
import { dbService } from "./services/dbService";
import { Document, VisionMode } from "./types/document";
import { ChatMessage, SourceCitation } from "./types/chat";
import { retrieveRelevantChunks } from "./utils/searchEngine";
import { rankBySimilarity } from "./utils/vectorMath";
import ValidationDashboard from "./features/validation/ValidationDashboard";
import { IndustryType, INDUSTRY_WORKSPACES } from "./utils/industryTemplates";
import EnterpriseLandingPage from "./features/landing/EnterpriseLandingPage";
import { DEMO_DATASETS } from "./utils/demoData";

export default function App() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [workspaceMode, setWorkspaceMode] = useState<"user" | "demo">(() => {
    const val = localStorage.getItem("brainvault_workspace_mode");
    return val === "demo" ? "demo" : "user";
  });
  const [showLanding, setShowLanding] = useState<boolean>(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDevValidation, setIsDevValidation] = useState(false);
  const [mobileTab, setMobileTab] = useState<"chat" | "documents" | "upload" | "references" | "compare" | "inspect" | "audit" | "report">("chat");
  const [visionMode, setVisionMode] = useState<VisionMode>("AUTO");
  
  // High-fidelity active citations list
  const [activeCitations, setActiveCitations] = useState<SourceCitation[]>([]);
  const [isReferenceDrawerOpen, setIsReferenceDrawerOpen] = useState(false);
  const [isReferenceDrawerOpenState, setIsReferenceDrawerOpenState] = useState(false);

  // System is hard-locked to premium corporate dark mode for consistent high-status Harvey/Linear vibe
  useEffect(() => {
    document.documentElement.classList.add("dark");
    localStorage.setItem("theme", "dark");
  }, []);

  // Right container workspace tabs: "chat" or "inspect" or "compare" or "audit" or "report"
  const [activeTab, setActiveTab ] = useState<"chat" | "inspect" | "compare" | "audit" | "report">("chat");
  const [textPreviewExpanded, setTextPreviewExpanded] = useState(false);
  const [selectedOcrPage, setSelectedOcrPage] = useState<number>(1);
  const [ocrSearchQuery, setOcrSearchQuery] = useState<string>("");

  // Safe accessor for the currently active document
  const activeDoc = documents.find((doc) => doc.id === activeId) || null;

  // Group chunks by pageNum to get the text per page
  const getPagesList = (doc: Document) => {
    const chunks = doc.chunks || [];
    if (chunks.length > 0) {
      const chunksByPage = chunks.reduce((acc: Record<number, string[]>, chunk) => {
        const pNum = chunk.pageNum || 1;
        if (!acc[pNum]) {
          acc[pNum] = [];
        }
        acc[pNum].push(chunk.text);
        return acc;
      }, {});

      return Object.keys(chunksByPage)
        .map(Number)
        .sort((a, b) => a - b)
        .map((pageNum) => ({
          pageNum,
          text: chunksByPage[pageNum].join("\n\n"),
        }));
    } else if (doc.extractedText) {
      return [{ pageNum: 1, text: doc.extractedText }];
    }
    return [];
  };

  const highlightFullParagraph = (fullText: string, substring: string) => {
    if (!fullText) return null;
    if (!substring) {
      return <span>{fullText}</span>;
    }
    
    const words = substring.toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, " ")
      .split(/\s+/)
      .map(w => w.trim())
      .filter(w => w.length >= 4);
      
    if (words.length === 0) {
      return <span>{fullText}</span>;
    }

    try {
      const wordsRegex = new RegExp(`(${words.map(w => w.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')).join("|")})`, "gi");
      const parts = fullText.split(wordsRegex);

      return (
        <span>
          {parts.map((part, i) => {
            const isMatch = words.some(w => part.toLowerCase() === w.toLowerCase());
            return isMatch ? (
              <mark key={i} className="bg-amber-400 text-black px-1 rounded font-bold">
                {part}
              </mark>
            ) : (
              part
            );
          })}
        </span>
      );
    } catch (e) {
      return <span>{fullText}</span>;
    }
  };

  // Reset selected OCR page when active document changes
  useEffect(() => {
    if (activeDoc) {
      const pages = getPagesList(activeDoc);
      if (pages.length > 0) {
        setSelectedOcrPage(pages[0].pageNum);
      } else {
        setSelectedOcrPage(1);
      }
    } else {
      setSelectedOcrPage(1);
    }
    setOcrSearchQuery("");
  }, [activeId, activeDoc]);

  // Chat conversation state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [verifiedVectorCount, setVerifiedVectorCount] = useState<number | null>(null);

  // Multi-Document Active Workspace Selection
  const [activeWorkspaceDocIds, setActiveWorkspaceDocIds] = useState<string[]>([]);

  // Selected industry workspace state (Fase 7)
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryType>(() => {
    const saved = localStorage.getItem("brainvault_active_industry");
    return (saved as IndustryType) || "umum";
  });

  // Active industry template (Fase 7)
  const activeIndustry = INDUSTRY_WORKSPACES.find((ind) => ind.id === selectedIndustry) || INDUSTRY_WORKSPACES[0];

  // Individual Citation Focused Preview state
  const [activePreviewCitation, setActivePreviewCitation] = useState<SourceCitation | null>(null);

  // Compare Document Engine states
  const [compareDocA, setCompareDocA] = useState<string>("");
  const [compareDocB, setCompareDocB] = useState<string>("");
  const [compareResult, setCompareResult] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  // Document Delete Confirmation modal state
  const [documentIdToDelete, setDocumentIdToDelete] = useState<string | null>(null);

  // Check for developer-only validation parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("dev_validation") === "true") {
      setIsDevValidation(true);
    }
  }, []);

  // Load documents from LocalStorage on mount
  useEffect(() => {
    const loadedDocs = storageService.getDocuments();
    const storedWorkspaceMode = localStorage.getItem("brainvault_workspace_mode") || "user";
    setWorkspaceMode(storedWorkspaceMode as "user" | "demo");

    const filteredDocs = storedWorkspaceMode === "demo"
      ? loadedDocs.filter(d => d.id.startsWith("demo-"))
      : loadedDocs.filter(d => !d.id.startsWith("demo-"));

    setDocuments(filteredDocs);

    const loadedActiveId = storageService.getActiveDocumentId();
    if (loadedActiveId && (loadedActiveId === "all_documents" || filteredDocs.some((d) => d.id === loadedActiveId))) {
      setActiveId(loadedActiveId);
    } else if (filteredDocs.length > 0) {
      setActiveId(filteredDocs[0].id);
      storageService.setActiveDocumentId(filteredDocs[0].id);
    } else {
      setActiveId("all_documents"); // default fallback
    }

    // Load active workspace document IDs
    const storedActiveWorkspace = localStorage.getItem("brainvault_active_workspace_doc_ids");
    if (storedActiveWorkspace) {
      try {
        setActiveWorkspaceDocIds(JSON.parse(storedActiveWorkspace));
      } catch {
        setActiveWorkspaceDocIds(filteredDocs.map((d) => d.id));
      }
    } else {
      setActiveWorkspaceDocIds(filteredDocs.map((d) => d.id));
    }
  }, []);

  // Load and count vectors stored in IndexedDB for active document verification
  useEffect(() => {
    if (activeId === "all_documents") {
      const countAll = async () => {
        try {
          const promises = documents.map((d) => dbService.loadDocumentVectors(d.id));
          const results = await Promise.all(promises);
          const totalVectors = results.reduce((acc, current) => acc + current.length, 0);
          setVerifiedVectorCount(totalVectors);
        } catch (err) {
          console.error("Gagal menghitung statistik IndexedDB Lintas Dokumen:", err);
          setVerifiedVectorCount(0);
        }
      };
      countAll();
    } else if (activeId) {
      dbService.loadDocumentVectors(activeId)
        .then((vectors) => {
          setVerifiedVectorCount(vectors.length);
        })
        .catch((err) => {
          console.error("Gagal memuat statistik IndexedDB:", err);
          setVerifiedVectorCount(0);
        });
    } else {
      setVerifiedVectorCount(null);
    }
  }, [activeId, documents]);

  // Sync / Load specific chat history whenever the active document is changed
  useEffect(() => {
    if (activeId) {
      const historicalMessages = chatService.loadChatHistory(activeId);
      setMessages(historicalMessages);
      setActiveTab("chat");

      // Set initial sidebar citations based on latest bot message
      const latestAiMsg = [...historicalMessages].reverse().find(m => m.sender === "ai" && m.citations && m.citations.length > 0);
      if (latestAiMsg && latestAiMsg.citations) {
        setActiveCitations(latestAiMsg.citations);
      } else {
        setActiveCitations([]);
      }
    } else {
      setMessages([]);
      setActiveCitations([]);
    }
  }, [activeId]);

  const handleToggleActiveWorkspaceDoc = (id: string) => {
    setActiveWorkspaceDocIds((prev) => {
      const next = prev.includes(id) ? prev.filter((dId) => dId !== id) : [...prev, id];
      localStorage.setItem("brainvault_active_workspace_doc_ids", JSON.stringify(next));
      return next;
    });
  };

  // Handle a newly processed file upload success callback
  const handleUploadSuccess = (newDoc: Document) => {
    setDocuments((prev) => {
      const filtered = prev.filter((d) => d.name !== newDoc.name);
      const updated = [...filtered, newDoc];
      setActiveId(newDoc.id);
      storageService.setActiveDocumentId(newDoc.id);

      // Auto-activate uploaded document:
      setActiveWorkspaceDocIds((prevActive) => {
        const nextActive = prevActive.includes(newDoc.id) ? prevActive : [...prevActive, newDoc.id];
        localStorage.setItem("brainvault_active_workspace_doc_ids", JSON.stringify(nextActive));
        return nextActive;
      });

      return updated;
    });
    setMobileTab("chat"); // auto shift to intelligence feed on mobile upload completion
  };

  const handleTriggerUpload = () => {
    setMobileTab("upload");
    const fileSelector = document.getElementById("pdf-file-selector");
    if (fileSelector) {
      (fileSelector as HTMLElement).click();
    }
  };

  const handleClearDemoAndStartFresh = () => {
    // 1. Fetch current stored documents
    const allDocs = storageService.getDocuments();
    // 2. Filter out demo documents (those starting with "demo-")
    const userDocs = allDocs.filter(d => !d.id.startsWith("demo-"));
    // 3. Save only user documents back to localStorage
    localStorage.setItem("brainvault_documents", JSON.stringify(userDocs));
    // 4. Update state variables
    setDocuments(userDocs);
    setWorkspaceMode("user");
    localStorage.setItem("brainvault_workspace_mode", "user");
    setSelectedIndustry("umum");
    localStorage.removeItem("brainvault_active_industry");
    localStorage.removeItem("brainvault_active_workspace_doc_ids");

    // 5. Select first user document or "all_documents"
    if (userDocs.length > 0) {
      setActiveId(userDocs[0].id);
      storageService.setActiveDocumentId(userDocs[0].id);
      setActiveWorkspaceDocIds(userDocs.map(d => d.id));
    } else {
      setActiveId("all_documents");
      storageService.setActiveDocumentId("all_documents");
      setActiveWorkspaceDocIds([]);
    }
  };

  const handleLoadDemoDataset = (targetIndustry: IndustryType) => {
    // Collect all documents from all demo datasets
    const allDemoDocs: Document[] = [];
    const keys: IndustryType[] = ["umum", "ipal", "konstruksi", "legal"];
    
    keys.forEach((key) => {
      const demo = DEMO_DATASETS[key];
      if (demo && demo.documents) {
        demo.documents.forEach((doc) => {
          if (!allDemoDocs.some((d) => d.id === doc.id)) {
            allDemoDocs.push(doc);
          }
        });
      }
    });

    // Save with user-uploaded docs combined to preserve user-uploaded files
    const currentDocs = storageService.getDocuments();
    const userDocs = currentDocs.filter(d => !d.id.startsWith("demo-"));
    const mergedDocs = [...userDocs];
    allDemoDocs.forEach((doc) => {
      if (!mergedDocs.some(d => d.id === doc.id)) {
        mergedDocs.push(doc);
      }
    });
    localStorage.setItem("brainvault_documents", JSON.stringify(mergedDocs));
    
    // In demo mode, we display only the demo documents in the Workspace dashboard
    setDocuments(allDemoDocs);
    setWorkspaceMode("demo");
    localStorage.setItem("brainvault_workspace_mode", "demo");

    // Seed chat histories
    keys.forEach((key) => {
      const demo = DEMO_DATASETS[key];
      if (demo && demo.chats) {
        Object.keys(demo.chats).forEach((docId) => {
          chatService.saveChatHistory(docId, demo.chats[docId]);
        });
      }
    });

    // Seed audit reports
    keys.forEach((key) => {
      const demo = DEMO_DATASETS[key];
      if (demo && demo.documents) {
        const sortedIds = demo.documents.map((d) => d.id).sort().join(",");
        localStorage.setItem(`brainvault_audit_report_${sortedIds}`, demo.auditReport);
      }
    });

    // Pre-select the target industry & active view
    setSelectedIndustry(targetIndustry);
    localStorage.setItem("brainvault_active_industry", targetIndustry);

    const targetDemo = DEMO_DATASETS[targetIndustry];
    if (targetDemo) {
      setCompareDocA(targetDemo.compareDocA);
      setCompareDocB(targetDemo.compareDocB);
      if (targetDemo.compareResult) {
        setCompareResult(targetDemo.compareResult);
      }
      
      // Auto-set active workspace documents to the specific loaded industry pair
      const activeIds = targetDemo.documents.map(d => d.id);
      setActiveWorkspaceDocIds(activeIds);
      localStorage.setItem("brainvault_active_workspace_doc_ids", JSON.stringify(activeIds));
      
      // Select first document of the targeted sector as active
      if (targetDemo.documents.length > 0) {
        const firstId = targetDemo.documents[0].id;
        setActiveId(firstId);
        storageService.setActiveDocumentId(firstId);
      } else {
        setActiveId("all_documents");
        storageService.setActiveDocumentId("all_documents");
      }
    } else {
      setActiveId("all_documents");
      storageService.setActiveDocumentId("all_documents");
    }

    // Dismiss landing page overlay to reveal primary dashboard
    setShowLanding(false);
  };

  // Handle selecting an existing document
  const handleSelectDocument = (id: string) => {
    setActiveId(id);
    storageService.setActiveDocumentId(id);
    setMobileTab("chat"); // shift to chat tab on file selection
  };

  // Real deleter that gets called after modal confirmation
  const executeDeleteDocument = (id: string) => {
    const updated = storageService.deleteDocument(id);
    setDocuments(updated);

    // Keep active workspace doc IDs synchronized:
    setActiveWorkspaceDocIds((prev) => {
      const next = prev.filter((docId) => docId !== id);
      localStorage.setItem("brainvault_active_workspace_doc_ids", JSON.stringify(next));
      return next;
    });

    dbService.deleteDocumentVectors(id).catch((err) => {
      console.error("Gagal menghapus vector dari database lokal:", err);
    });

    chatService.clearChatHistory(id);

    if (activeId === id) {
      if (updated.length > 0) {
        setActiveId(updated[0].id);
        storageService.setActiveDocumentId(updated[0].id);
      } else {
        setActiveId("all_documents");
        storageService.setActiveDocumentId("all_documents");
      }
    }
  };

  // Handle deleting a document from our knowledge base (triggers modal wrapper)
  const handleDeleteDocument = (id: string) => {
    setDocumentIdToDelete(id);
  };

  // Process sending a user Q&A query to full-stack Express service
  const handleSendMessage = async (text: string) => {
    if (!activeId) return;

    const isWorkspace = activeId === "all_documents";
    const currentActiveDoc = documents.find((doc) => doc.id === activeId);

    if (!isWorkspace && !currentActiveDoc) return;

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      sender: "user",
      text,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    chatService.saveChatHistory(activeId, updatedMessages);

    setIsChatLoading(true);

    try {
      let documentContext = "";
      let retrievedViaVectors = false;
      let top3Citations: SourceCitation[] = [];

      try {
        let storedVectors = [];
        if (isWorkspace) {
          console.log("[Semantic Search] Memuat vektor dari dokumen aktif dalam workspace...");
          const activeDocs = documents.filter((doc) => activeWorkspaceDocIds.includes(doc.id));
          const promises = activeDocs.map((doc) => dbService.loadDocumentVectors(doc.id));
          const results = await Promise.all(promises);
          storedVectors = results.flat();
        } else {
          storedVectors = await dbService.loadDocumentVectors(activeId);
        }

        if (storedVectors && storedVectors.length > 0) {
          console.log(`[Semantic Search] Menghitung pencarian semantik untuk ${storedVectors.length} vector...`);
          const embedRes = await fetch("/api/embed", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ texts: [text] }),
          });

          if (!embedRes.ok) {
            const errData = await embedRes.json().catch(() => ({}));
            throw new Error(errData.error || "Gagal menghubungi API /api/embed.");
          }

          const embedData = await embedRes.json();
          const queryEmbedding = embedData.embeddings?.[0];

          if (queryEmbedding && Array.isArray(queryEmbedding)) {
            const rankedResults = rankBySimilarity(queryEmbedding, storedVectors, 10);
            if (rankedResults.length > 0) {
              documentContext = rankedResults
                .map((res) => {
                  const docName = documents.find((d) => d.id === res.chunk.documentId)?.name || "Sumber Lain";
                  return `[Dokumen: ${docName}, Halaman ${res.chunk.pageNum}] (Score Kemiripan: ${(res.score * 100).toFixed(1)}%):\n${res.chunk.text}`;
                })
                .join("\n\n---\n\n");
              retrievedViaVectors = true;
              console.log(`[Semantic Search] Berhasil melacak ${rankedResults.length} fragmen menggunakan kemiripan kosinus.`);

              top3Citations = rankedResults.slice(0, 3).map((res) => {
                const docName = documents.find((d) => d.id === res.chunk.documentId)?.name || "Sumber Lain";
                return {
                  id: res.chunk.id,
                  text: res.chunk.text,
                  pageNum: res.chunk.pageNum,
                  documentName: docName,
                };
              });
            }
          }
        }
      } catch (err) {
        console.warn("[Semantic Search Fallback] Terjadi kendala saat melakukan semantic search, beralih ke TF-IDF lama.", err);
      }

      if (!retrievedViaVectors) {
        console.log("[BrainVault AI] Menerapkan pencarian berbasis kata kunci (TF-IDF Fallback)...");
        let pooledChunks: any[] = [];

        if (isWorkspace) {
          const activeDocs = documents.filter((doc) => activeWorkspaceDocIds.includes(doc.id));
          activeDocs.forEach((doc) => {
            const chunks = doc.chunks || [];
            chunks.forEach((c) => {
              pooledChunks.push({
                ...c,
                documentId: doc.id,
              });
            });
          });
        } else if (currentActiveDoc) {
          pooledChunks = (currentActiveDoc.chunks || []).map((c) => ({
            ...c,
            documentId: activeId,
          }));
        }

        const relevantChunks = retrieveRelevantChunks(text, pooledChunks, 10);
        documentContext = relevantChunks.length > 0
          ? relevantChunks
              .map((chunk) => {
                const docName = documents.find((d) => d.id === (chunk as any).documentId)?.name || "Sumber Lain";
                return `[Dokumen: ${docName}, Halaman ${chunk.pageNum}]:\n${chunk.text}`;
              })
              .join("\n\n---\n\n")
          : isWorkspace 
            ? "Tidak ada data kontekstual yang ditemukan di dalam workspace." 
            : currentActiveDoc?.extractedText || "";

        if (relevantChunks.length > 0) {
          top3Citations = relevantChunks.slice(0, 3).map((chunk) => {
            const docName = documents.find((d) => d.id === (chunk as any).documentId)?.name || "Sumber Lain";
            return {
              id: chunk.id,
              text: chunk.text,
              pageNum: chunk.pageNum,
              documentName: docName,
            };
          });
        } else if (pooledChunks.length > 0) {
          top3Citations = pooledChunks.slice(0, 3).map((chunk) => {
            const docName = documents.find((d) => d.id === (chunk as any).documentId)?.name || "Sumber Lain";
            return {
              id: chunk.id,
              text: chunk.text,
              pageNum: chunk.pageNum,
              documentName: docName,
            };
          });
        }
      }

      const replyText = await chatService.askQuestion(
        text,
        documentContext,
        messages
      );

      const aiReply: ChatMessage = {
        id: `${Date.now()}-ai`,
        sender: "ai",
        text: replyText,
        timestamp: new Date().toISOString(),
        citations: top3Citations.length > 0 ? top3Citations : undefined,
      };

      const finalMessagesList = [...updatedMessages, aiReply];
      setMessages(finalMessagesList);
      chatService.saveChatHistory(activeId, finalMessagesList);

      if (top3Citations.length > 0) {
        setActiveCitations(top3Citations);
      }
    } catch (error: any) {
      console.error(error);
      const systemErrorReply: ChatMessage = {
        id: `${Date.now()}-error`,
        sender: "ai",
        text: `Error: Gagal memanggil AI. ${
          error.message || "Terdapat kendala jaringan atau backend offline."
        }\n\nPastikan koneksi internet aktif dan variabel GEMINI_API_KEY sudah terpasang di panel Secrets (AI Studio).`,
        timestamp: new Date().toISOString(),
      };

      const errorMessagesList = [...updatedMessages, systemErrorReply];
      setMessages(errorMessagesList);
      chatService.saveChatHistory(activeId, errorMessagesList);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Clear Chat History callback
  const handleClearChatHistory = () => {
    if (activeId) {
      chatService.clearChatHistory(activeId);
      setMessages([]);
      setActiveCitations([]);
    }
  };

  // Compare Document Engine handler
  const handleCompareDocs = async () => {
    if (!compareDocA || !compareDocB) {
      setCompareError("Harap pilih dua dokumen berbeda yang ingin Anda bandingkan.");
      return;
    }
    if (compareDocA === compareDocB) {
      setCompareError("Dokumen utama (A) dan Pembanding (B) harus berbeda untuk dapat diulas.");
      return;
    }

    const docA = documents.find((d) => d.id === compareDocA);
    const docB = documents.find((d) => d.id === compareDocB);
    if (!docA || !docB) {
      setCompareError("Gagal mendeteksi informasi dari berkas yang Anda pilih.");
      return;
    }

    setIsComparing(true);
    setCompareError(null);
    setCompareResult(null);

    try {
      const chunksA = docA.chunks || [];
      const chunksB = docB.chunks || [];

      // Merge text and label sources for systemic evaluation
      const contextA = chunksA.slice(0, 25).map((c) => `[Dokumen A: ${docA.name}, Halaman ${c.pageNum}]:\n${c.text}`).join("\n\n");
      const contextB = chunksB.slice(0, 25).map((c) => `[Dokumen B: ${docB.name}, Halaman ${c.pageNum}]:\n${c.text}`).join("\n\n");

      const documentContext = `DOKUMEN A MATRIKS:\n${contextA}\n\n====================\n\nDOKUMEN B MATRIKS:\n${contextB}`;

      const systemComparePrompt = `Silakan lakukan analisis perbandingan komprehensif antara Dokumen A: "${docA.name}" dengan Dokumen B: "${docB.name}". 
      Gunakan informasi dan data yang terdapat dalam konteks dokumen yang disediakan.
      Jangan membuat-buat asumsi di luar teks dokumen.
      
      SAJIKAN ANALISIS SECARA DETIL DAN RAPI DALAM BAHASA INDONESIA PENUH DENGAN STRUKTUR SEBAGAI BERIKUT:

      ## INFORMASI HANYA DI DOKUMEN A (${docA.name})
      - Sebutkan klausul unik, data nilai, parameter teknis, gambar, atau draf informasi yang hanya ditonjolkan atau terdapat di dalam Dokumen A saja. Berikan nomor halaman rujukan jika relevan.

      ## INFORMASI HANYA DI DOKUMEN B (${docB.name})
      - Sebutkan klausul unik, data nilai, parameter teknis, gambar, atau draf informasi yang hanya ditonjolkan atau terdapat di dalam Dokumen B saja. Berikan nomor halaman rujukan jika relevan.

      ## INFORMASI YANG SAMA
      - Sebutkan kecocokan data, kesamaan spesifikasi, nilai tolok ukur yang identik, atau kesepakatan umum yang sama-sama termuat di kedua dokumen tersebut.

      ## PERBEDAAN KRITIS
      - Sebutkan perbedaan krusial, ketidaksesuaian nilai kuantitatif, deviasi standar, waktu tenggat yang berbenturan, draf tanggung jawab yang berbeda, atau potensi konflik/risiko operasional antara Dokumen A dan Dokumen B.`;

      const result = await chatService.askQuestion(systemComparePrompt, documentContext, []);
      setCompareResult(result);
    } catch (err: any) {
      console.error(err);
      setCompareError(err.message || "Terdapat kendala jaringan atau backend offline saat memproses perbandingan.");
    } finally {
      setIsComparing(false);
    }
  };

  // Dynamic metrics calculation for Workspace Intelligence Panel
  const estPages = documents.filter(d => activeWorkspaceDocIds.includes(d.id)).reduce((acc, doc) => {
    if (doc.chunks && doc.chunks.length > 0) {
      const pages = doc.chunks.map(c => c.pageNum).filter(Boolean);
      if (pages.length > 0) {
        return acc + Math.max(...pages);
      }
    }
    return acc + 1;
  }, 0);

  const totalRefs = documents.filter(d => activeWorkspaceDocIds.includes(d.id)).reduce((acc, doc) => acc + (doc.chunks?.length || 0), 0);

  const blueprintCount = documents.filter(d => activeWorkspaceDocIds.includes(d.id)).reduce((acc, doc) => {
    const matched = (doc.chunks || []).filter(c => {
      const text = c.text.toLowerCase();
      return text.includes("blueprint") || text.includes("gambar") || text.includes("rencana") || text.includes("skema") || text.includes("diagram") || text.includes("tata letak");
    }).length;
    return acc + matched;
  }, 0);

  const tablesCount = documents.filter(d => activeWorkspaceDocIds.includes(d.id)).reduce((acc, doc) => {
    const matched = (doc.chunks || []).filter(c => {
      const text = c.text.toLowerCase();
      return text.includes("|") || text.includes("tabel") || text.includes("table") || text.includes("matriks") || text.includes("matrix");
    }).length;
    return acc + matched;
  }, 0);

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, "gi"));
    return (
      <>
        {parts.map((part, index) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={index} className="bg-[#C7A86D] text-[#0F1115] px-0.5 rounded font-bold font-mono">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const renderOcrInspector = () => {
    if (!activeDoc) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#0F1115]" id="ocr-empty-no-doc">
          <div className="p-4 bg-[#161A20] border border-[#262D37] rounded-full text-[#C7A86D] shadow-inner mb-4">
            <Eye className="w-8 h-8 opacity-75" />
          </div>
          <h4 className="font-bold text-sm text-[#F5F5F5]">Pilih dokumen untuk melihat hasil OCR.</h4>
          <p className="text-xs text-[#9BA3AF] mt-2 max-w-[320px] mx-auto leading-relaxed">
            Silakan pilih berkas individual di panel kiri untuk mengulas transkripsi utuh yang diekstrak oleh kecerdasan visual AI.
          </p>
        </div>
      );
    }

    const pages = getPagesList(activeDoc);

    if (pages.length === 0 || !pages[0].text) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#0F1115]" id="ocr-empty-no-text">
          <div className="p-4 bg-[#161A20] border border-[#262D37] rounded-full text-[#C7A86D] shadow-inner mb-4">
            <AlertCircle className="w-8 h-8 opacity-75 text-amber-500" />
          </div>
          <h4 className="font-bold text-sm text-[#F5F5F5]">Teks OCR belum tersedia untuk dokumen ini.</h4>
          <p className="text-xs text-[#9BA3AF] mt-2 max-w-[320px] mx-auto leading-relaxed">
            Berkas sedang dianalisis atau tidak berisi deskripsi skema tekstual yang dapat diekstrak secara otomatis.
          </p>
          <button
            onClick={() => {
              setActiveTab("chat");
              setMobileTab("chat");
            }}
            className="mt-4 px-3.5 py-1.5 bg-[#C7A86D] hover:bg-[#C7A86D]/90 text-[#0F1115] text-xs font-bold rounded transition cursor-pointer"
          >
            Kembali ke Tanya Jawab
          </button>
        </div>
      );
    }

    // Find current page obj
    const currentPageObj = pages.find((p) => p.pageNum === selectedOcrPage) || pages[0];
    const totalPages = pages.length;

    return (
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-[#0F1115] h-full" id="ocr-inspector-layout">
        {/* Left Side: Thumbnail Pages Select Grid/List */}
        <div className="w-full lg:w-[260px] lg:border-r border-[#262D37] bg-[#161A20]/30 flex flex-col h-[200px] lg:h-full overflow-hidden flex-shrink-0" id="ocr-sidebar-pages">
          <div className="p-4 border-b border-[#262D37] space-y-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#C7A86D] uppercase tracking-wider block">Halaman OCR</span>
              <span className="text-[10px] font-mono bg-[#0F1115] text-[#9BA3AF] px-1.5 py-0.5 rounded border border-[#262D37] font-bold">
                {totalPages} Hlm
              </span>
            </div>
            
            {/* Find in text search filter */}
            <div className="relative">
              <input
                type="text"
                placeholder="Cari dalam OCR..."
                value={ocrSearchQuery}
                onChange={(e) => {
                  setOcrSearchQuery(e.target.value);
                  // Auto shift to first matching page
                  if (e.target.value) {
                    const matchedPage = pages.find((p) => p.text.toLowerCase().includes(e.target.value.toLowerCase()));
                    if (matchedPage) {
                      setSelectedOcrPage(matchedPage.pageNum);
                    }
                  }
                }}
                className="w-full bg-[#0F1115] border border-[#262D37] text-xs text-[#F5F5F5] placeholder-[#6B7280] rounded px-3 py-1.5 focus:border-[#C7A86D] focus:ring-0 outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
            {pages.map((p) => {
              const isSelected = p.pageNum === selectedOcrPage;
              const hasMatch = ocrSearchQuery && p.text.toLowerCase().includes(ocrSearchQuery.toLowerCase());
              return (
                <button
                  key={p.pageNum}
                  onClick={() => setSelectedOcrPage(p.pageNum)}
                  className={`w-full text-left p-2 rounded transition font-mono text-[11px] flex items-center justify-between cursor-pointer border ${
                    isSelected
                      ? "bg-[#C7A86D]/15 border-[#C7A86D]/40 text-[#C7A86D] font-bold"
                      : "bg-transparent border-transparent hover:bg-[#1B2028]/80 text-[#9BA3AF] hover:text-[#F1F3F5]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className={`w-3.5 h-3.5 ${isSelected ? "text-[#C7A86D]" : "text-[#6B7280]"}`} />
                    <span>Halaman {p.pageNum}</span>
                  </div>
                  {hasMatch && (
                    <span className="text-[8px] bg-[#C7A86D] text-[#0F1115] font-sans px-1 rounded font-bold uppercase tracking-wider">
                      Match
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Teks Reader panel */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0F1115] h-full overflow-hidden" id="ocr-main-content">
          <div className="p-4 bg-[#161A20] border-b border-[#262D37] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-shrink-0">
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-[#F5F5F5] truncate flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-[#22C55E] rounded-full"></span>
                {activeDoc.name}
              </h4>
              <p className="text-[10px] text-[#9BA3AF] mt-0.5">
                Melihat Halaman <strong className="font-mono text-[#C7A86D]">{currentPageObj?.pageNum || selectedOcrPage}</strong> dari <strong className="font-mono text-[#C7A86D]">{totalPages}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={() => {
                  setActiveTab("chat");
                  setMobileTab("chat");
                }}
                className="px-3 py-1.5 bg-[#1B2028] hover:bg-[#262D37] text-xs text-[#C7A86D] border border-[#262D37] rounded font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Tanya Jawab</span>
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(currentPageObj?.text || "");
                }}
                className="px-3 py-1.5 bg-[#C7A86D] hover:bg-[#C7A86D]/90 text-[#0F1115] text-xs font-bold rounded transition cursor-pointer"
              >
                Salin Halaman
              </button>
            </div>
          </div>

          <div className="flex-1 p-5 overflow-y-auto scrollbar-thin select-text">
            <div className="max-w-4xl mx-auto bg-[#161A20]/40 border border-[#262D37] rounded-xl p-5 md:p-6 shadow-sm">
              <div className="border-b border-dashed border-[#262D37] pb-2 mb-4 flex items-center justify-between text-[10px]">
                <span className="font-bold text-[#6B7280] uppercase font-mono">Transkripsi Asli Halaman {currentPageObj?.pageNum || selectedOcrPage}</span>
                <span className="text-[#C7A86D] font-bold font-mono">
                  {(currentPageObj?.text || "").length.toLocaleString()} karakter
                </span>
              </div>
              <pre className="text-xs text-[#9BA3AF] font-mono leading-relaxed whitespace-pre-wrap break-words prose select-all">
                {ocrSearchQuery ? highlightText(currentPageObj?.text || "", ocrSearchQuery) : (currentPageObj?.text || "(Halaman ini tidak memuat data teks)")}
              </pre>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const checklistsCount = documents.filter(d => activeWorkspaceDocIds.includes(d.id)).reduce((acc, doc) => {
    const matched = (doc.chunks || []).filter(c => {
      const text = c.text.toLowerCase();
      return text.includes("checklist") || text.includes("daftar periksa") || text.includes("kriteria") || text.includes("persyaratan") || text.includes("syarat") || text.includes("status");
    }).length;
    return acc + matched;
  }, 0);

  if (isDevValidation) {
    return (
      <ValidationDashboard
        onExit={() => {
          setIsDevValidation(false);
          const url = new URL(window.location.href);
          url.searchParams.delete("dev_validation");
          window.history.replaceState({}, "", url.toString());
        }}
        onRefreshDocs={() => {
          const loadedDocs = storageService.getDocuments();
          setDocuments(loadedDocs);
          if (loadedDocs.length > 0) {
            setActiveId(loadedDocs[0].id);
          } else {
            setActiveId("all_documents");
          }
        }}
      />
    );
  }

  if (showLanding) {
    return (
      <EnterpriseLandingPage
        onSelectDemoDataset={handleLoadDemoDataset}
        onTriggerUpload={handleTriggerUpload}
        onStartDemo={() => {
          handleLoadDemoDataset("ipal");
        }}
        onEnterApp={() => {
          const loadedDocs = storageService.getDocuments();
          // Filter ONLY user-uploaded documents (i.e. those that don't start with "demo-")
          const userDocs = loadedDocs.filter((d) => !d.id.startsWith("demo-"));
          setDocuments(userDocs);
          setWorkspaceMode("user");
          localStorage.setItem("brainvault_workspace_mode", "user");
          
          if (userDocs.length > 0) {
            setActiveId(userDocs[0].id);
            setActiveWorkspaceDocIds(userDocs.map(d => d.id));
          } else {
            setActiveId("all_documents");
            setActiveWorkspaceDocIds([]);
          }
          setShowLanding(false);
        }}
      />
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row overflow-hidden bg-[#0F1115] text-[#F5F5F5] font-sans antialiased">
      
      {/* LEFT SIDEBAR PANEL: 280px, fixed height, modern vertical rail */}
      <aside className="hidden md:flex flex-col w-[290px] h-full bg-[#161A20] border-r border-[#262D37] overflow-hidden flex-shrink-0">
        
        {/* Brand Header */}
        <div className="p-5 border-b border-[#262D37] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#C7A86D] text-[#0F1115] flex items-center justify-center font-extrabold text-base shadow-sm">
              BV
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-[#F5F5F5]">
                BrainVault AI
              </h1>
              <p className="text-[10px] text-[#C7A86D] uppercase tracking-wider font-semibold">
                Ruang Kerja Dokumen
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Action Areas */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 select-none scrollbar-thin">
          
          {/* Industry Workspace Selector (Fase 7) */}
          <div className="p-3 bg-[#1B2028] border border-[#262D37] rounded-lg space-y-2">
            <div className="flex items-center gap-1.5 border-b border-[#262D37] pb-1.5">
              <span className="text-xs">💼</span>
              <span className="text-[10.5px] font-bold text-[#F5F5F5]">Sektor & Tema Workspace</span>
            </div>
            
            <div className="relative">
              <select
                id="industry-workspace-selection-dropdown"
                value={selectedIndustry}
                onChange={(e) => {
                  const val = e.target.value as IndustryType;
                  setSelectedIndustry(val);
                  localStorage.setItem("brainvault_active_industry", val);
                }}
                className="w-full bg-[#0F1115] border border-[#262D37] text-[11px] text-[#F5F5F5] font-bold py-2 px-2.5 pr-8 rounded focus:outline-none focus:border-[#C7A86D] transition cursor-pointer appearance-none font-sans"
              >
                {INDUSTRY_WORKSPACES.map((ind) => (
                  <option key={ind.id} value={ind.id} className="bg-[#0F1115] text-[#9BA3AF] font-semibold font-sans">
                    {ind.title} ({ind.badge})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#9BA3AF]">
                <ChevronRight className="w-3.5 h-3.5 transform rotate-90" />
              </div>
            </div>

            <div className="p-2 bg-[#0F1115]/40 border border-[#262D37]/40 rounded text-[9.5px] text-[#9BA3AF] leading-relaxed select-text">
              <span className="text-[#C7A86D] font-bold">Fokus: </span>
              {activeIndustry.focus}
            </div>
          </div>

          {/* Action Item: Workspace Lintas Dokumen */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block px-1">
              Gugus Analisis
            </span>
            <button
              onClick={() => handleSelectDocument("all_documents")}
              className={`w-full flex items-center justify-between p-2.5 rounded text-xs transition duration-200 cursor-pointer ${
                activeId === "all_documents"
                  ? "bg-[#C7A86D]/10 border border-[#C7A86D]/45 text-[#C7A86D] font-bold"
                  : "bg-transparent border border-transparent text-[#9BA3AF] hover:bg-[#1B2028] hover:text-[#F5F5F5]"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Layout className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">Lintas Dokumen Workspace</span>
              </div>
              <span className="text-[9px] font-mono bg-[#0F1115] px-1.5 py-0.5 rounded border border-[#262D37]">
                {documents.length} File
              </span>
            </button>
            {activeId === "all_documents" && documents.length > 0 && (
              <div className="mt-2.5 p-2 bg-[#0F1115]/60 border border-[#262D37] rounded space-y-2">
                <p className="text-[10px] font-bold text-[#C7A86D] uppercase tracking-wider px-1">
                  Pilih Dokumen Aktif ({activeWorkspaceDocIds.length}/{documents.length})
                </p>
                <div className="space-y-1.5 max-h-[120px] overflow-y-auto scrollbar-thin">
                  {documents.map((doc) => {
                    const isActive = activeWorkspaceDocIds.includes(doc.id);
                    return (
                      <label
                        key={doc.id}
                        className="flex items-center gap-2 px-1.5 py-1 text-[11px] text-[#9BA3AF] hover:text-[#F1F3F5] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={() => handleToggleActiveWorkspaceDoc(doc.id)}
                          className="rounded border-[#262D37] text-[#C7A86D] focus:ring-0 cursor-pointer accent-[#C7A86D]"
                        />
                        <span className="truncate" title={doc.name}>{doc.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Vision Mode / Config Selector: Removed large card templates, replaced with simple corporate parameters */}
          <div className="p-3 bg-[#1B2028] border border-[#262D37] rounded space-y-2.5">
            <div className="flex items-center gap-1.5 border-b border-[#262D37] pb-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#C7A86D]" />
              <span className="text-[10.5px] font-bold text-[#F5F5F5]">Pengaturan Analisis</span>
            </div>

            <div className="grid grid-cols-4 bg-[#0F1115] p-0.5 rounded border border-[#262D37]">
              {(["AUTO", "STANDARD", "HYBRID", "FULL"] as VisionMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setVisionMode(mode)}
                  className={`py-1 text-[9px] font-bold rounded transition cursor-pointer text-center ${
                    visionMode === mode
                      ? "bg-[#C7A86D] text-[#0F1115]"
                      : "text-[#9BA3AF] hover:text-[#F5F5F5]"
                  }`}
                  title={`Mode ${mode}`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <p className="text-[9.5px] text-[#6B7280] leading-relaxed font-sans mt-1">
              {visionMode === "AUTO" && "⭐ Menyelaraskan teks alami & render ocr otomatis."}
              {visionMode === "STANDARD" && "⚡ Ekstrak teks mentah PDF asli. Kecepatan maksimal."}
              {visionMode === "HYBRID" && "🎯 Gunting koordinat visual saat tabel/skema renggang."}
              {visionMode === "FULL" && "🔬 Rekonstruksi visual multimodal penuh halaman."}
            </p>
          </div>

          {/* Collection Lists */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block px-1">
              Koleksi Berkas
            </span>
            <div className="max-h-[170px] overflow-y-auto pr-1 scrollbar-thin">
              <DocumentList
                documents={documents}
                activeId={activeId}
                onSelect={handleSelectDocument}
                onDelete={handleDeleteDocument}
              />
            </div>
          </div>

          {/* Add Pengetahuan Area */}
          <div className="space-y-1.5 pt-1 border-t border-[#262D37]/45">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block px-1 flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5 text-[#C7A86D]" />
              Unggah Dokumen Baru
            </span>
            <div className="overflow-hidden">
              <DocumentUpload 
                onUploadSuccess={handleUploadSuccess} 
                visionMode={visionMode} 
                setVisionMode={setVisionMode} 
              />
            </div>
          </div>

        </div>

        {/* Workspace info & system credit */}
        <div className="p-4 border-t border-[#262D37] bg-[#0F1115]/30 space-y-2.5">
          <button
            onClick={() => setShowLanding(true)}
            className="w-full py-1.5 px-2 bg-[#1B2028] hover:bg-[#262D37] text-white hover:text-[#C7A86D] text-[10.5px] font-bold rounded border border-[#262D37] transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C7A86D]" />
            <span>Kembali ke Landing</span>
          </button>
          {workspaceMode === "demo" && (
            <button
              onClick={handleClearDemoAndStartFresh}
              className="w-full py-1.5 px-2 bg-red-950/15 hover:bg-red-950/30 text-red-400 hover:text-red-300 text-[10px] font-bold rounded border border-red-900/35 transition flex items-center justify-center gap-1.5 cursor-pointer font-sans"
              title="Membersihkan sampel rujukan dan kembali ke ruang kerja kosong steril"
            >
              <RefreshCw className="w-3 h-3 text-red-400" />
              <span>Hapus Demo & Mulai Baru</span>
            </button>
          )}
          <div className="flex items-center justify-between text-[10px] text-[#6B7280]">
            <span>Database Status</span>
            <span className="text-[#22C55E] font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-[#22C55E] rounded-full"></span>
              TERHUBUNG
            </span>
          </div>
        </div>

      </aside>

      {/* CENTRAL MAIN WORKSPACE PANEL: Chat, Workspace information */}
      <section className="flex-1 flex flex-col h-full bg-[#0F1115] overflow-hidden">
        {documents.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#0F1115]" id="workspace-empty-center">
            <div className="p-4 bg-[#161A20] border border-[#262D37] rounded-full text-[#C7A86D] shadow-inner mb-4">
              <FolderOpen className="w-8 h-8 opacity-75 animate-pulse" />
            </div>
            <h3 className="font-extrabold text-sm text-[#F5F5F5] tracking-tight uppercase">Ruang Kerja Masih Kosong</h3>
            <p className="text-xs text-[#9BA3AF] mt-2 max-w-[320px] mx-auto leading-relaxed font-sans">
              Silakan unggah dokumen PDF teknis melalui panel kiri (<strong className="text-[#C7A86D]">Unggah Dokumen Baru</strong>) untuk memicu proses ekstraksi OCR cerdas.
            </p>
            <div className="mt-5 flex flex-col w-full max-w-[240px] mx-auto gap-2">
              <button
                onClick={handleTriggerUpload}
                className="w-full py-2 bg-[#C7A86D] hover:bg-[#D6B978] text-[#0F1115] text-xs font-bold rounded transition cursor-pointer select-none font-sans flex items-center justify-center gap-1"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Unggah Dokumen</span>
              </button>
              <button
                onClick={() => {
                  setShowLanding(true);
                  setTimeout(() => {
                    const el = document.getElementById("demo-experience-section");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }, 200);
                }}
                className="w-full py-2 bg-[#1B2028] hover:bg-[#262D37] text-[#C7A86D] hover:text-amber-400 text-xs font-semibold rounded border border-[#262D37] transition cursor-pointer select-none font-sans flex items-center justify-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Lihat Contoh Alur Kerja</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Header bar (Metadata statistics, toggles) */}
            <header className="hidden md:flex items-center justify-between px-6 py-4 bg-[#161A20] border-b border-[#262D37]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B7280]">Pusat Kendali</span>
              {workspaceMode === "demo" && (
                <span className="px-1.5 py-0.5 bg-[#C7A86D]/10 border border-[#C7A86D]/20 rounded text-[8px] text-[#C7A86D] uppercase tracking-wider font-extrabold font-sans select-none">
                  Dataset Demo
                </span>
              )}
              <ChevronRight className="w-3 h-3 text-[#6B7280]" />
              <span className="text-xs font-semibold text-[#C7A86D]">
                {activeId === "all_documents" ? "Semua Berkas Aktif" : activeDoc ? activeDoc.name : "Konfigurasi Workspace"}
              </span>
            </div>
            
            <div className="flex items-center gap-2.5 mt-1 text-[11px] text-[#9BA3AF]">
              <span>Total Berkas: <strong className="font-semibold text-[#F5F5F5]">{documents.length}</strong></span>
              <span className="text-[#262D37]">•</span>
              <span>Kerangka Pemetaan: <strong className="font-semibold text-[#F5F5F5]">{verifiedVectorCount !== null ? "Siap Di-Analisis" : "Menyelaraskan..."}</strong></span>
              {activeDoc && (
                <>
                  <span className="text-[#262D37]">•</span>
                  <span>Kapasitas Teks: <strong className="font-mono text-[#F5F5F5]">{(activeDoc.extractedText || "").length.toLocaleString()} karakter</strong></span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#0F1115] p-1 rounded-lg border border-[#262D37]" role="tablist" aria-label="Aktivitas Analisis Utama">
              <button
                onClick={() => setActiveTab("chat")}
                role="tab"
                aria-selected={activeTab === "chat"}
                aria-label="Tab halaman Tanya Jawab AI"
                className={`px-3 py-1.5 text-xs font-bold rounded transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "chat" ? "bg-[#C7A86D] text-[#0F1115]" : "text-[#9BA3AF] hover:text-[#F1F3F5]"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Tanya Jawab</span>
              </button>
              <button
                onClick={() => setActiveTab("inspect")}
                role="tab"
                aria-selected={activeTab === "inspect"}
                aria-label="Tab halaman Inspeksi OCR"
                className={`px-3 py-1.5 text-xs font-bold rounded transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "inspect" ? "bg-[#C7A86D] text-[#0F1115]" : "text-[#9BA3AF] hover:text-[#F1F3F5]"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Inspeksi OCR</span>
              </button>
              <button
                onClick={() => setActiveTab("compare")}
                role="tab"
                aria-selected={activeTab === "compare"}
                aria-label="Tab halaman Bandingkan Dokumen"
                className={`px-3 py-1.5 text-xs font-bold rounded transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "compare" ? "bg-[#C7A86D] text-[#0F1115]" : "text-[#9BA3AF] hover:text-[#F1F3F5]"
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Bandingkan</span>
              </button>
              <button
                onClick={() => setActiveTab("audit")}
                role="tab"
                aria-selected={activeTab === "audit"}
                aria-label="Tab halaman Audit Dokumen dan Kepatuhan"
                className={`px-3 py-1.5 text-xs font-bold rounded transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "audit" ? "bg-[#C7A86D] text-[#0F1115]" : "text-[#9BA3AF] hover:text-[#F1F3F5]"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Audit Dokumen</span>
              </button>
              <button
                onClick={() => setActiveTab("report")}
                role="tab"
                aria-selected={activeTab === "report"}
                aria-label="Tab halaman Laporan Ringkasan Eksekutif"
                className={`px-3 py-1.5 text-xs font-bold rounded transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "report" ? "bg-[#C7A86D] text-[#0F1115]" : "text-[#9BA3AF] hover:text-[#F1F3F5]"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Laporan</span>
              </button>
            </div>

            {/* Tablet & Mobile Slide-out Drawer Trigger for references */}
            <button
              onClick={() => setIsReferenceDrawerOpen(!isReferenceDrawerOpen)}
              className="lg:hidden px-3.5 py-1.5 border border-[#262D37] hover:border-[#F5F5F5] bg-[#161A20] hover:bg-[#1B2028] text-xs font-bold rounded transition-all flex items-center gap-1.5 cursor-pointer text-[#C7A86D]"
              title="Lihat kutipan sumber"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Referensi ({activeCitations.length})</span>
            </button>
          </div>
        </header>

        {/* VIEWPORT SWITCHER CORE */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          
          {/* DESKTOP VIEWPORT LAYOUTS */}
          <div className="hidden md:flex flex-col flex-1 min-h-0 overflow-hidden" id="desktop-viewport-container">
            {/* Active Tab is Chat */}
            {activeTab === "chat" && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {activeId === "all_documents" && documents.length > 0 && (
                  <div className="bg-[#161A20] border-b border-[#262D37] p-4.5 space-y-3 px-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10.5px] font-bold text-[#C7A86D] uppercase tracking-wider flex items-center gap-1.5">
                        <Layout className="w-4 h-4" />
                        Ringkasan Workspace Analitis ({documents.filter(d => activeWorkspaceDocIds.includes(d.id)).length} Verifikasi Aktif)
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                      <div className="p-2.5 bg-[#0F1115] rounded border border-[#262D37] shadow-inner">
                        <p className="text-[#6B7280] text-[8.5px] uppercase font-bold">Total Dokumen</p>
                        <p className="text-[#F5F5F5] font-bold mt-0.5 text-xs truncate">{documents.length} <span className="text-[9.5px] text-[#6B7280] font-normal font-sans">berkas</span></p>
                      </div>
                      <div className="p-2.5 bg-[#0F1115] rounded border border-[#262D37] shadow-inner">
                        <p className="text-[#6B7280] text-[8.5px] uppercase font-bold">Kapasitas Halaman</p>
                        <p className="text-[#C7A86D] font-bold mt-0.5 text-xs truncate">{estPages} <span className="text-[9.5px] text-[#6B7280] font-normal font-sans">halaman</span></p>
                      </div>
                      <div className="p-2.5 bg-[#0F1115] rounded border border-[#262D37] shadow-inner">
                        <p className="text-[#6B7280] text-[8.5px] uppercase font-bold">Unit Referensi</p>
                        <p className="text-[#F5F5F5] font-bold mt-0.5 text-xs truncate">{totalRefs} <span className="text-[9.5px] text-[#6B7280] font-normal font-sans">klaster</span></p>
                      </div>
                      <div className="p-2.5 bg-[#0F1115] rounded border border-[#262D37] shadow-inner">
                        <p className="text-[#6B7280] text-[8.5px] uppercase font-bold">Gambar Rencana</p>
                        <p className="text-[#22C55E] font-bold mt-0.5 text-xs truncate">{blueprintCount} <span className="text-[9.5px] text-[#6B7280] font-normal font-sans">diagram</span></p>
                      </div>
                      <div className="p-2.5 bg-[#0F1115] rounded border border-[#262D37] shadow-inner">
                        <p className="text-[#6B7280] text-[8.5px] uppercase font-bold">Ekstraksi Tabel</p>
                        <p className="text-[#F5F5F5] font-bold mt-0.5 text-xs truncate">{tablesCount} <span className="text-[9.5px] text-[#6B7280] font-normal font-sans">tabel</span></p>
                      </div>
                      <div className="p-2.5 bg-[#0F1115] rounded border border-[#262D37] shadow-inner">
                        <p className="text-[#6B7280] text-[8.5px] uppercase font-bold">Tenggat Audit</p>
                        <p className="text-[#C7A86D] font-bold mt-0.5 text-xs truncate">{checklistsCount} <span className="text-[9.5px] text-[#6B7280] font-normal font-sans">checklist</span></p>
                      </div>
                    </div>
                  </div>
                )}
                <ChatWindow
                  activeDoc={activeDoc}
                  activeId={activeId}
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  onClearHistory={handleClearChatHistory}
                  isLoading={isChatLoading}
                  onOpenCitation={(citation) => {
                    if (citation) {
                      setActivePreviewCitation(citation);
                      setIsReferenceDrawerOpen(true);
                    }
                  }}
                  selectedIndustry={selectedIndustry}
                  documentsCount={documents.length}
                  onTriggerUpload={handleTriggerUpload}
                />
              </div>
            )}

            {/* Active Tab is Compare Documents Engine */}
            {activeTab === "compare" && (
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin bg-[#0F1115]">
                <div className="bg-[#161A20] border border-[#262D37] rounded-xl p-5 space-y-5">
                  <div>
                    <h3 className="text-sm font-bold text-[#F5F5F5] flex items-center gap-2">
                      <RefreshCw className="w-4.5 h-4.5 text-[#C7A86D]" />
                      Komparasi Berkas Enterprise
                    </h3>
                    <p className="text-[11px] text-[#9BA3AF] mt-1">
                      Bandingkan dua dokumen rencana konstruksi atau regulasi teknis di bawah ini untuk mengidentifikasi klausul unik dan perbedaan operasional kritis.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Select Document A */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-[#9BA3AF] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-[#C7A86D] rounded-full"></span>
                        Dokumen Utama (Dokumen A):
                      </label>
                      <select
                        value={compareDocA}
                        onChange={(e) => setCompareDocA(e.target.value)}
                        className="bg-[#0F1115] border border-[#262D37] text-xs text-[#F5F5F5] rounded-lg p-2.5 focus:border-[#C7A86D] focus:ring-0 outline-none"
                      >
                        <option value="">-- Pilih Dokumen A --</option>
                        {documents.map((doc) => (
                          <option key={doc.id} value={doc.id}>
                            {doc.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Select Document B */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-[#9BA3AF] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-[#EF4444] rounded-full"></span>
                        Dokumen Pembanding (Dokumen B):
                      </label>
                      <select
                        value={compareDocB}
                        onChange={(e) => setCompareDocB(e.target.value)}
                        className="bg-[#0F1115] border border-[#262D37] text-xs text-[#F5F5F5] rounded-lg p-2.5 focus:border-[#C7A86D] focus:ring-0 outline-none"
                      >
                        <option value="">-- Pilih Dokumen B --</option>
                        {documents.map((doc) => (
                          <option key={doc.id} value={doc.id}>
                            {doc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {compareDocA && compareDocB && compareDocA === compareDocB && (
                    <div id="compare-same-warning" className="p-3 bg-[#EF4444]/15 border border-[#EF4444]/30 rounded-lg text-xs text-[#EF4444] font-medium">
                      Silakan pilih dua dokumen yang berbeda untuk dibandingkan.
                    </div>
                  )}

                  {compareError && (
                    <div className="p-3 bg-[#EF4444]/15 border border-[#EF4444]/30 rounded-lg text-xs text-[#EF4444] font-medium">
                      {compareError}
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleCompareDocs}
                      disabled={isComparing || !compareDocA || !compareDocB || compareDocA === compareDocB}
                      className="w-full md:w-auto px-5 py-2.5 bg-[#C7A86D] hover:bg-[#C7A86D]/90 disabled:opacity-40 text-[#0F1115] text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      {isComparing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Menganalisis Perbandingan...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Mulai Analisis Banding</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {isComparing && (
                  <div className="bg-[#161A20] border border-[#262D37] rounded-xl p-8 text-center space-y-4">
                    <RefreshCw className="w-8 h-8 text-[#C7A86D] animate-spin mx-auto" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-[#F5F5F5]">Menyusun Matriks Perbandingan</p>
                      <p className="text-[11px] text-[#9BA3AF]">AI sedang membaca sasis referensi kedua dokumen untuk mengidentifikasi konflik dan klausul kritis...</p>
                    </div>
                  </div>
                )}

                {compareResult && (
                  <div className="bg-[#161A20] border border-[#262D37] rounded-xl p-5 space-y-4 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-[#262D37] pb-3">
                      <span className="text-xs font-bold text-[#C7A86D] uppercase tracking-wider">Hasil Analisis Perbandingan</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(compareResult || "");
                        }}
                        className="px-2.5 py-1 bg-[#1B2028] text-xs text-[#C7A86D] border border-[#262D37] rounded hover:bg-[#262D37] font-semibold transition cursor-pointer"
                      >
                        Salin Laporan
                      </button>
                    </div>

                    <div className="prose prose-sm max-w-none text-[#9BA3AF] leading-relaxed font-sans space-y-4 text-left">
                      {compareResult.split("\n").map((line, lIdx) => {
                        if (line.startsWith("## ") || line.startsWith("### ")) {
                          const title = line.replace(/##\s*|###\s*/g, "");
                          return (
                            <h4 key={lIdx} className="text-sm font-bold text-[#C7A86D] font-display border-b border-[#262D37] pb-1.5 mt-5">
                              {title}
                            </h4>
                          );
                        }
                        if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
                          return (
                            <li key={lIdx} className="ml-4 list-disc pl-1 text-xs text-[#9BA3AF] leading-relaxed">
                              {line.trim().substring(2)}
                            </li>
                          );
                        }
                        return (
                          <p key={lIdx} className="text-xs text-[#9BA3AF] leading-relaxed">
                            {line}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Active Tab is Audit Assistant & Executive Report */}
            {activeTab === "audit" && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#0F1115]" id="desktop-audit-viewport">
                <AuditDashboard
                  documents={documents}
                  activeWorkspaceDocIds={activeWorkspaceDocIds}
                  onOpenCitation={(citation) => {
                    if (citation) {
                      setActivePreviewCitation(citation);
                      setIsReferenceDrawerOpen(true);
                    }
                  }}
                  selectedIndustry={selectedIndustry}
                />
              </div>
            )}

            {/* Active Tab is Professional Report Generator */}
            {activeTab === "report" && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#0F1115]" id="desktop-report-viewport">
                <ReportGenerator
                  documents={documents}
                  activeWorkspaceDocIds={activeWorkspaceDocIds}
                  navigateToAuditTab={() => setActiveTab("audit")}
                  selectedIndustry={selectedIndustry}
                  onOpenCitation={(citation) => {
                    if (citation) {
                      setActivePreviewCitation(citation);
                      setIsReferenceDrawerOpen(true);
                    }
                  }}
                />
              </div>
            )}

            {/* Active Tab is Inspeksi OCR */}
            {(activeTab === "inspect" || activeTab === "ocr" || (activeTab as string) === "inspeksi-ocr") && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#0F1115]" id="desktop-ocr-viewport">
                {renderOcrInspector()}
              </div>
            )}
          </div>

          {/* MOBILE VIEWPORT LAYOUTS */}
          <div className="flex md:hidden flex-col flex-1 min-h-0 overflow-hidden" id="mobile-viewport-container">
            {/* Mobile Tab Chat */}
            {mobileTab === "chat" && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <ChatWindow
                  activeDoc={activeDoc}
                  activeId={activeId}
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  onClearHistory={handleClearChatHistory}
                  isLoading={isChatLoading}
                  onOpenCitation={(citation) => {
                    if (citation) {
                      setActivePreviewCitation(citation);
                      setIsReferenceDrawerOpen(true);
                    }
                  }}
                  selectedIndustry={selectedIndustry}
                  documentsCount={documents.length}
                  onTriggerUpload={handleTriggerUpload}
                />
              </div>
            )}

            {/* Mobile Tab Documents */}
            {mobileTab === "documents" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="p-1 px-1.5 bg-[#1B2028] border border-[#262D37] rounded-lg shadow-sm">
                  <button
                    onClick={() => handleSelectDocument("all_documents")}
                    className={`w-full flex items-center justify-between p-3 rounded text-xs transition duration-200 ${
                      activeId === "all_documents"
                        ? "bg-[#C7A86D]/15 text-[#C7A86D] font-bold border border-[#C7A86D]/30"
                        : "text-[#9BA3AF]"
                    }`}
                  >
                    <span className="flex items-center gap-2 font-bold uppercase tracking-wider text-[10px]">
                      <Layout className="w-4 h-4 text-[#C7A86D]" />
                      Workspace Lintas Dokumen
                    </span>
                    <span className="text-[10px] bg-[#0F1115] px-1.5 py-0.5 rounded border border-[#262D37] font-bold">
                      {documents.length} File
                    </span>
                  </button>
                </div>

                <div className="text-xs font-bold text-[#6B7280] uppercase tracking-wider px-1">
                  Koleksi Dokumen Aktif
                </div>
                <div className="bg-[#161A20] border border-[#262D37] rounded-xl p-3">
                  <DocumentList
                    documents={documents}
                    activeId={activeId}
                    onSelect={handleSelectDocument}
                    onDelete={handleDeleteDocument}
                  />
                </div>
              </div>
            )}

            {/* Mobile Tab Upload */}
            {mobileTab === "upload" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="text-xs font-bold text-[#6B7280] uppercase tracking-wider px-1">
                  Unggah Dokumen Baru
                </div>
                <div className="bg-[#161A20] border border-[#262D37] rounded-xl p-4">
                  <DocumentUpload 
                    onUploadSuccess={handleUploadSuccess} 
                    visionMode={visionMode} 
                    setVisionMode={setVisionMode} 
                  />
                </div>

                {/* Mobile Analisis Settings */}
                <div className="bg-[#161A20] border border-[#262D37] rounded-xl p-4 space-y-3.5">
                  <div className="flex items-center gap-1.5 border-b border-[#262D37] pb-2">
                    <Sliders className="w-4 h-4 text-[#C7A86D]" />
                    <span className="text-xs font-bold text-[#F5F5F5]">Kode Mesin Vision AI</span>
                  </div>
                  <div className="grid grid-cols-4 bg-[#0F1115] p-1 rounded border border-[#262D37]">
                    {(["AUTO", "STANDARD", "HYBRID", "FULL"] as VisionMode[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setVisionMode(mode)}
                        className={`py-1.5 text-xs font-bold rounded transition cursor-pointer text-center ${
                          visionMode === mode
                            ? "bg-[#C7A86D] text-[#0F1115]"
                            : "text-[#9BA3AF] hover:text-[#F5F5F5]"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10.5px] text-[#9BA3AF] leading-relaxed">
                    {visionMode === "AUTO" && "AUTO: Menilai format dokumen secara asinkron."}
                    {visionMode === "STANDARD" && "STANDARD: Ekstraksi teks murni (tercepat)."}
                    {visionMode === "HYBRID" && "HYBRID: OCR cerdas untuk diagram & formulir."}
                    {visionMode === "FULL" && "FULL: Scan visual mendalam (disarankan untuk skema kasar)."}
                  </p>
                </div>
              </div>
            )}

            {/* Mobile Tab References */}
            {mobileTab === "references" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="text-xs font-bold text-[#6B7280] uppercase tracking-wider px-1 flex items-center justify-between">
                  <span>Bukti Referensi (Citations)</span>
                  {activeCitations.length > 0 && (
                    <span className="text-[10px] bg-[#C7A86D]/10 text-[#C7A86D] border border-[#C7A86D]/20 font-mono px-2 py-0.5 rounded-full font-bold">
                      {activeCitations.length} Referensi
                    </span>
                  )}
                </div>

                {activeCitations.length > 0 ? (
                  <div className="space-y-3">
                    {activeCitations.map((cit, idx) => (
                      <div key={cit.id || idx} className="bg-[#161A20] border border-[#262D37] rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-[#262D37] pb-2">
                          <div className="flex items-center gap-1.5 min-w-0 max-w-[70%]">
                            <FileText className="w-4 h-4 text-[#C7A86D] flex-shrink-0" />
                            <span className="text-xs font-semibold text-[#F5F5F5] truncate">{cit.documentName}</span>
                          </div>
                          <span className="text-[10px] bg-[#0F1115] border border-[#262D37] px-2 py-0.5 rounded text-[#9BA3AF] font-bold">
                            Halaman {cit.pageNum}
                          </span>
                        </div>
                        <p className="text-xs text-[#9BA3AF] italic leading-relaxed bg-[#0F1115] p-3 rounded border border-[#262D37] font-mono select-all">
                          "{cit.text}"
                        </p>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[9px] text-[#6B7280] font-bold">SUMBER REFERENSI #{idx + 1}</span>
                          <span className="text-[10px] text-[#C7A86D] font-bold bg-[#C7A86D]/10 px-2.5 py-0.5 border border-[#C7A86D]/20 rounded-full">
                            Lihat Sumber
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-[#161A20] border border-[#262D37] rounded-xl p-8 text-center space-y-2 text-[#6B7280]">
                    <BookOpen className="w-10 h-10 text-[#C7A86D] mx-auto opacity-70" />
                    <h4 className="font-bold text-xs text-[#F5F5F5]">Belum Ada Referensi Berkas</h4>
                    <p className="text-[11px] leading-relaxed max-w-[240px] mx-auto">
                      Kirim pesan tanya jawab pada tab Tanya untuk memicu pencarian semantik (RAG) dan mengekstrak sitasi pendukung.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Mobile Tab Compare */}
            {mobileTab === "compare" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="bg-[#161A20] border border-[#262D37] rounded-xl p-4 space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-[#F5F5F5] flex items-center gap-1.5">
                      <RefreshCw className="w-4 h-4 text-[#C7A86D]" />
                      Komparasi Berkas
                    </h3>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-semibold text-[#9BA3AF]">Dokumen Utama (A):</label>
                      <select
                        value={compareDocA}
                        onChange={(e) => setCompareDocA(e.target.value)}
                        className="bg-[#0F1115] border border-[#262D37] text-xs text-[#F5F5F5] rounded p-2 focus:border-[#C7A86D] focus:ring-0 outline-none"
                      >
                        <option value="">-- Pilih Dokumen A --</option>
                        {documents.map((doc) => (
                          <option key={doc.id} value={doc.id}>{doc.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-semibold text-[#9BA3AF]">Dokumen Pembanding (B):</label>
                      <select
                        value={compareDocB}
                        onChange={(e) => setCompareDocB(e.target.value)}
                        className="bg-[#0F1115] border border-[#262D37] text-xs text-[#F5F5F5] rounded p-2 focus:border-[#C7A86D] focus:ring-0 outline-none"
                      >
                        <option value="">-- Pilih Dokumen B --</option>
                        {documents.map((doc) => (
                          <option key={doc.id} value={doc.id}>{doc.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {compareDocA && compareDocB && compareDocA === compareDocB && (
                    <div id="compare-same-warning-mobile" className="p-2.5 bg-[#EF4444]/15 border border-[#EF4444]/30 rounded text-xs text-[#EF4444] font-medium">
                      Silakan pilih dua dokumen yang berbeda untuk dibandingkan.
                    </div>
                  )}

                  {compareError && (
                    <div className="p-2.5 bg-[#EF4444]/15 border border-[#EF4444]/30 rounded text-xs text-[#EF4444]">
                      {compareError}
                    </div>
                  )}

                  <button
                    onClick={handleCompareDocs}
                    disabled={isComparing || !compareDocA || !compareDocB || compareDocA === compareDocB}
                    className="w-full py-2 bg-[#C7A86D] text-[#0F1115] text-xs font-bold rounded hover:bg-[#C7A86D]/90 disabled:opacity-40 transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    {isComparing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>{isComparing ? "Menganalisis..." : "Mulai Analisis Banding"}</span>
                  </button>
                </div>

                {isComparing && (
                  <div className="bg-[#161A20] border border-[#262D37] rounded-xl p-6 text-center space-y-3">
                    <RefreshCw className="w-6 h-6 text-[#C7A86D] animate-spin mx-auto" />
                    <p className="text-xs font-bold text-[#F5F5F5]">Menyusun Matriks Perbandingan...</p>
                  </div>
                )}

                {compareResult && (
                  <div className="bg-[#161A20] border border-[#262D37] rounded-xl p-4.5 space-y-3">
                    <div className="flex items-center justify-between border-b border-[#262D37] pb-2">
                       <span className="text-[10px] font-bold text-[#C7A86D] uppercase tracking-wider">Hasil Komparasi</span>
                    </div>
                    <div className="text-[11px] text-[#9BA3AF] leading-relaxed whitespace-pre-wrap select-all bg-[#0F1115] p-3 rounded border border-[#262D37] font-mono">
                      {compareResult}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mobile Tab Inspeksi OCR */}
            {mobileTab === "inspect" && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#0F1115]" id="mobile-ocr-viewport">
                {renderOcrInspector()}
              </div>
            )}

            {/* Mobile Tab Audit Assistant */}
            {mobileTab === "audit" && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#0F1115]" id="mobile-audit-viewport">
                <AuditDashboard
                  documents={documents}
                  activeWorkspaceDocIds={activeWorkspaceDocIds}
                  onOpenCitation={(citation) => {
                    if (citation) {
                      setActivePreviewCitation(citation);
                      setIsReferenceDrawerOpen(true);
                    }
                  }}
                  selectedIndustry={selectedIndustry}
                />
              </div>
            )}

            {/* Mobile Tab Professional Report Generator */}
            {mobileTab === "report" && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#0F1115]" id="mobile-report-viewport">
                <ReportGenerator
                  documents={documents}
                  activeWorkspaceDocIds={activeWorkspaceDocIds}
                  navigateToAuditTab={() => setMobileTab("audit")}
                  selectedIndustry={selectedIndustry}
                  onOpenCitation={(citation) => {
                    if (citation) {
                      setActivePreviewCitation(citation);
                      setIsReferenceDrawerOpen(true);
                    }
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </>
    )}
      </section>

      {/* RIGHT REFERENCE PANEL: 360px side bar layout display for citation tracking */}
      <aside className="hidden lg:flex flex-col w-[360px] h-full bg-[#161A20] border-l border-[#262D37] overflow-hidden flex-shrink-0">
        <div className="p-5 border-b border-[#262D37] flex items-center justify-between bg-[#1B2028]/40">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#C7A86D]" />
            <h3 className="text-sm font-bold tracking-tight text-[#F5F5F5]">
              Referensi Dokumen
            </h3>
          </div>
          {activeCitations.length > 0 && (
            <span className="text-[10px] font-mono bg-[#0F1115] text-[#C7A86D] px-2 py-0.5 rounded-full border border-[#262D37] font-bold">
              {activeCitations.length} Terpilih
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {activeCitations.length > 0 ? (
            <div className="space-y-3.5">
              <div className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider px-1">
                Kutipan Pembuktian RAG
              </div>
              
              {activeCitations.map((cit, idx) => (
                <div
                  key={cit.id || idx}
                  className="bg-[#1B2028] hover:bg-[#1B2028]/80 border border-[#262D37] rounded-lg p-3.5 transition flex flex-col gap-2.5 shadow-sm"
                >
                  {/* Citations metadata header */}
                  <div className="flex items-center justify-between border-b border-dashed border-[#262D37] pb-2 text-[10.5px]">
                    <div className="flex items-center gap-1.5 min-w-0 max-w-[70%]">
                      <FileText className="w-4 h-4 text-[#C7A86D] flex-shrink-0" />
                      <span className="truncate text-[#F5F5F5] font-semibold" title={cit.documentName}>
                        {cit.documentName || "Dokumen Aktif"}
                      </span>
                    </div>
                    <span className="bg-[#0F1115] border border-[#262D37] px-2 py-0.5 rounded text-[9.5px] font-bold text-[#9BA3AF] flex-shrink-0">
                      Halaman {cit.pageNum}
                    </span>
                  </div>

                  {/* Snippet Block */}
                  <blockquote className="text-[#9BA3AF] leading-relaxed italic bg-[#0F1115] p-2.5 rounded border border-[#262D37] text-[11px] font-mono break-words select-all">
                    "{cit.text}"
                  </blockquote>

                  {/* Footers */}
                  <div className="flex items-center justify-between text-[10px] text-[#6B7280] pt-0.5">
                    <span className="font-semibold tracking-wider uppercase text-[8.5px]">BUKTI CITASI #{idx + 1}</span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#0F1115] text-[#C7A86D] border border-[#262D37] rounded-full font-bold text-[9.5px]">
                      Lihat Sumber
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3 text-[#6B7280] py-24">
              <div className="p-4 bg-[#1B2028] border border-[#262D37] rounded-full text-[#C7A86D] shadow-inner">
                <BookOpen className="w-8 h-8 opacity-75 animate-pulse" />
              </div>
              <h4 className="font-bold text-xs text-[#F5F5F5]">Panel Referensi Lintas Dokumen</h4>
              <p className="text-[11px] leading-relaxed max-w-[240px] mx-auto select-none">
                Ketika Anda melakukan Tanya Jawab dengan AI, kutipan pembacaan fragmen referensi paling kredibel akan dinavigasikan langsung di panel ini.
              </p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[#262D37] bg-[#1B2028]/10 text-center text-[10px] text-[#6B7280]">
          Sistem Pengawasan Verifikasi Berkas Aktif
        </div>
      </aside>

      {/* Collapsible reference drawer overlay for small/medium screen sizes (mobile/tablet) */}
      <AnimatePresence>
        {isReferenceDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsReferenceDrawerOpen(false)}
              className="fixed inset-0 bg-black z-40 lg:hidden"
            />
            {/* Drawer Body */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-[340px] md:w-[380px] bg-[#161A20] border-l border-[#262D37] z-50 flex flex-col shadow-2xl lg:hidden"
            >
              <div className="p-5 border-b border-[#262D37] flex items-center justify-between bg-[#1B2028]/45">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#C7A86D]" />
                  <h3 className="text-sm font-bold tracking-tight text-[#F5F5F5]">
                    Referensi Dokumen
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReferenceDrawerOpen(false)}
                  className="w-11 h-11 flex items-center justify-center text-[#9BA3AF] hover:text-[#F5F5F5] rounded-lg hover:bg-[#1B2028] transition-all cursor-pointer"
                  aria-label="Tutup referensi"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                {activeCitations.length > 0 ? (
                  <div className="space-y-3.5">
                    <div className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider px-1">
                      Kutipan Pembuktian RAG
                    </div>
                    {activeCitations.map((cit, idx) => (
                      <div
                        key={cit.id || idx}
                        className="bg-[#1B2028] hover:bg-[#1B2028]/80 border border-[#262D37] rounded-lg p-3.5 transition flex flex-col gap-2.5 shadow-sm"
                      >
                        <div className="flex items-center justify-between border-b border-dashed border-[#262D37] pb-2 text-[10.5px]">
                          <div className="flex items-center gap-1.5 min-w-0 max-w-[70%]">
                            <FileText className="w-4 h-4 text-[#C7A86D] flex-shrink-0" />
                            <span className="truncate text-[#F5F5F5] font-semibold" title={cit.documentName}>
                              {cit.documentName || "Dokumen Aktif"}
                            </span>
                          </div>
                          <span className="bg-[#0F1115] border border-[#262D37] px-2 py-0.5 rounded text-[9.5px] font-bold text-[#9BA3AF] flex-shrink-0">
                            Halaman {cit.pageNum}
                          </span>
                        </div>
                        <blockquote className="text-[#9BA3AF] leading-relaxed italic bg-[#0F1115] p-2.5 rounded border border-[#262D37] text-[11px] font-mono break-words select-all">
                          "{cit.text}"
                        </blockquote>
                        <div className="flex items-center justify-between text-[10px] text-[#6B7280] pt-0.5">
                          <span className="font-semibold tracking-wider uppercase text-[8.5px]">BUKTI CITASI #{idx + 1}</span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#0F1115] text-[#C7A86D] border border-[#262D37] rounded-full font-bold text-[9.5px]">
                            Lihat Sumber
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3 text-[#6B7280] py-24">
                    <div className="p-4 bg-[#1B2028] border border-[#262D37] rounded-full text-[#C7A86D] shadow-inner">
                      <BookOpen className="w-8 h-8 opacity-75 animate-pulse" />
                    </div>
                    <h4 className="font-bold text-xs text-[#F5F5F5]">Panel Referensi Lintas Dokumen</h4>
                    <p className="text-[11px] leading-relaxed max-w-[240px] mx-auto select-none">
                      Ketika Anda melakukan Tanya Jawab dengan AI, kutipan pembacaan fragmen referensi paling kredibel akan dinavigasikan langsung di panel ini.
                    </p>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-[#262D37] bg-[#1B2028]/10 text-center text-[10px] text-[#6B7280]">
                Sistem Pengawasan Verifikasi Berkas Aktif
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Immersive Citation Focus & Highlight Preview Panel */}
      <AnimatePresence>
        {activePreviewCitation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="w-full max-w-lg bg-[#161A20] border-2 border-[#C7A86D] rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="bg-[#1B2028] px-5 py-4 border-b border-[#262D37] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#C7A86D]" />
                  <span className="text-xs font-bold text-[#F5F5F5] uppercase tracking-wider">
                    Panel Bukti Penelusuran Dokumen (Traceability)
                  </span>
                </div>
                <button
                  onClick={() => {
                    setActivePreviewCitation(null);
                    setIsReferenceDrawerOpen(false);
                  }}
                  className="w-11 h-11 flex items-center justify-center text-[#9BA3AF] hover:text-[#F1F3F5] hover:bg-[#262D37] rounded-lg transition-all cursor-pointer"
                  aria-label="Tutup panel bukti"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {activePreviewCitation.isManualVerify ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center border border-[#EF4444]/35 bg-[#EF4444]/5 rounded-xl space-y-3.5 my-2">
                    <div className="p-3 bg-red-500/10 rounded-full border border-red-500/20 text-red-400">
                      <AlertTriangle className="w-6 h-6 animate-pulse" />
                    </div>
                    <span className="text-red-400 font-bold text-sm tracking-wide uppercase">Rujukan Bukti Tidak Tersedia</span>
                    <blockquote className="text-xs text-[#9BA3AF] italic max-w-sm leading-relaxed p-2 bg-[#0F1115] border border-[#262D37] rounded">
                      "{activePreviewCitation.text}"
                    </blockquote>
                    <div className="text-xs font-mono font-bold text-red-400 bg-red-500/15 px-4 py-2 rounded-lg border border-red-500/20 shadow-md">
                      Perlu verifikasi manual
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between bg-[#0F1115] p-3 rounded-lg border border-[#262D37]">
                      <div className="flex items-center gap-2 min-w-0 max-w-[70%]">
                        <FileText className="w-4 h-4 text-[#C7A86D]" />
                        <span className="text-xs text-[#F5F5F5] font-bold truncate text-left">
                          {activePreviewCitation.documentName || activePreviewCitation.docName}
                        </span>
                      </div>
                      <span className="text-[10px] bg-[#C7A86D]/10 text-[#C7A86D] border border-[#C7A86D]/20 px-2.5 py-0.5 rounded font-mono font-bold">
                        Halaman {activePreviewCitation.pageNum}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-left">
                      <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Kutipan yang Disorot:</p>
                      <blockquote className="bg-[#C7A86D]/10 border-l-4 border-[#C7A86D] p-3 text-xs italic text-[#F5F5F5] font-serif leading-relaxed rounded-r-lg max-h-[120px] overflow-y-auto select-all">
                        "{activePreviewCitation.text}"
                      </blockquote>
                    </div>

                    {activePreviewCitation.fullParagraph && (
                      <div className="space-y-1.5 text-left border-t border-[#262D37]/60 pt-3">
                        <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Highlight Paragraf Bukti Fisik:</p>
                        <div className="bg-[#0F1115] border border-[#262D37] p-3 rounded-lg max-h-[160px] overflow-y-auto select-all font-sans text-xs leading-relaxed text-[#9BA3AF]">
                          {highlightFullParagraph(activePreviewCitation.fullParagraph, activePreviewCitation.text || "")}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="bg-[#1B2028] px-6 py-4 border-t border-[#262D37] flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setActivePreviewCitation(null);
                    setIsReferenceDrawerOpen(false);
                  }}
                  className="px-3.5 py-1.5 text-xs text-[#9BA3AF] hover:text-[#F1F3F5] font-semibold transition cursor-pointer"
                >
                  Tutup
                </button>

                {!activePreviewCitation.isManualVerify && (
                  <>
                    <button
                      onClick={() => {
                        const doc = documents.find((d) => d.id === activePreviewCitation.docId || d.name === activePreviewCitation.documentName);
                        if (doc) {
                          setActiveId(doc.id);
                          storageService.setActiveDocumentId(doc.id);
                        }
                        setActiveTab("documents");
                        setMobileTab("documents");
                        setActivePreviewCitation(null);
                        setIsReferenceDrawerOpen(false);
                      }}
                      className="px-3.5 py-1.5 bg-[#1B2028] hover:bg-[#262D37] text-white border border-[#262D37] rounded text-xs font-semibold cursor-pointer transition flex items-center gap-1"
                    >
                      Buka Referensi
                    </button>

                    <button
                      onClick={() => {
                        const doc = documents.find((d) => d.id === activePreviewCitation.docId || d.name === activePreviewCitation.documentName);
                        if (doc) {
                          setActiveId(doc.id);
                          storageService.setActiveDocumentId(doc.id);
                          setSelectedOcrPage(activePreviewCitation.pageNum);
                        }
                        setActiveTab("inspect");
                        setMobileTab("inspect"); // switches to inspector view
                        setActivePreviewCitation(null);
                        setIsReferenceDrawerOpen(false);
                      }}
                      className="px-4 py-1.5 bg-[#C7A86D] hover:bg-[#C7A86D]/90 text-[#0F1115] text-xs font-bold rounded transition shadow-sm cursor-pointer flex items-center gap-1"
                    >
                      Buka OCR
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MOBILE BOTTOM NAVIGATION DOCK BAR */}
      {!showLanding && documents.length > 0 && (
        <nav className="md:hidden flex items-center justify-around bg-[#161A20] border-t border-[#262D37] py-2.5 px-4 z-40 flex-shrink-0 sticky bottom-0">
          <button
            onClick={() => setMobileTab("chat")}
            className={`flex flex-col items-center gap-1 transition-all ${
              mobileTab === "chat" ? "text-[#C7A86D]" : "text-[#6B7280] hover:text-[#9BA3AF]"
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px] font-bold">Tanya</span>
          </button>

          <button
            onClick={() => setMobileTab("documents")}
            className={`flex flex-col items-center gap-1 transition-all ${
              mobileTab === "documents" ? "text-[#C7A86D]" : "text-[#6B7280] hover:text-[#9BA3AF]"
            }`}
          >
            <FolderOpen className="w-5 h-5" />
            <span className="text-[10px] font-bold">Berkas</span>
          </button>

          <button
            onClick={() => setMobileTab("upload")}
            className={`flex flex-col items-center gap-1 transition-all ${
              mobileTab === "upload" ? "text-[#C7A86D]" : "text-[#6B7280] hover:text-[#9BA3AF]"
            }`}
          >
            <FolderOpen className="w-5 h-5 text-indigo-400 rotate-180" />
            <span className="text-[10px] font-bold">Unggah</span>
          </button>

          <button
            onClick={() => setMobileTab("references")}
            className={`flex flex-col items-center gap-1 transition-all ${
              mobileTab === "references" ? "text-[#C7A86D]" : "text-[#6B7280] hover:text-[#9BA3AF]"
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px] font-bold">Referensi</span>
          </button>

          <button
            onClick={() => setMobileTab("compare")}
            className={`flex flex-col items-center gap-1 transition-all ${
              mobileTab === "compare" ? "text-[#C7A86D]" : "text-[#6B7280] hover:text-[#9BA3AF]"
            }`}
          >
            <RefreshCw className="w-5 h-5 animate-pulse" />
            <span className="text-[10px] font-bold">Banding</span>
          </button>

          <button
            onClick={() => setMobileTab("audit")}
            className={`flex flex-col items-center gap-1 transition-all ${
              mobileTab === "audit" ? "text-[#C7A86D]" : "text-[#6B7280] hover:text-[#9BA3AF]"
            }`}
          >
            <ShieldCheck className="w-5 h-5" />
            <span className="text-[10px] font-bold">Audit</span>
          </button>

          <button
            onClick={() => setMobileTab("report")}
            className={`flex flex-col items-center gap-1 transition-all ${
              mobileTab === "report" ? "text-[#C7A86D]" : "text-[#6B7280] hover:text-[#9BA3AF]"
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-[10px] font-bold">Laporan</span>
          </button>
        </nav>
      )}

      {/* Delete Confirmation Modal */}
      {documentIdToDelete !== null && (
        <div id="delete-confirm-modal" className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#161A20] border border-[#262D37] rounded-xl max-w-sm w-full p-6 shadow-2xl space-y-5 text-left">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 min-w-0">
                <h3 className="text-sm font-bold text-[#F5F5F5] tracking-tight">Hapus Dokumen?</h3>
                <p className="text-xs text-[#9BA3AF] leading-relaxed">
                  Dokumen, indeks lokal, dan hasil analisis terkait akan dihapus dari perangkat ini.
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDocumentIdToDelete(null)}
                className="px-4 py-2 bg-[#1B2028] hover:bg-[#1B2028]/90 text-[#9BA3AF] hover:text-[#F5F5F5] text-xs font-semibold rounded-lg border border-[#262D37] transition cursor-pointer select-none"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (documentIdToDelete) {
                    executeDeleteDocument(documentIdToDelete);
                  }
                  setDocumentIdToDelete(null);
                }}
                className="px-4 py-2 bg-[#EF4444] hover:bg-[#EF4444]/90 text-white text-xs font-bold rounded-lg transition cursor-pointer select-none"
              >
                Hapus Dokumen
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
