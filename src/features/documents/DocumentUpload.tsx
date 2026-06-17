import React, { useState, useRef } from "react";
import { UploadCloud, FileText, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { motion } from "motion/react";
import { extractPagesFromPdf, chunkExtractedPages, indexDocumentChunks, renderPdfPageToImage } from "../../utils/pdfParser";
import * as pdfjsLib from "pdfjs-dist";
import { storageService } from "../../services/storageService";
import { dbService } from "../../services/dbService";
import { chatService } from "../../services/chatService";
import { Document, DocumentChunk, VisionMode } from "../../types/document";

// Helpers for optimization task
function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

async function calculateSHA256(text: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

function classifyPage(pageNum: number, text: string, fileName: string): { priority: 1 | 2 | 3; reason: string } {
  const normText = text.toLowerCase();
  const trimText = text.trim();
  const textLength = trimText.length;
  
  if (textLength === 0) {
    return {
      priority: 2,
      reason: "Scanned page (empty text layer detected)",
    };
  }

  // Calculate numeric and symbol density
  // digits: [0-9]
  // symbols: standard non-word non-space punctuation: [-,./()\[\]+øØ*_=:]
  const digitMatches = trimText.match(/[0-9]/g);
  const digitCount = digitMatches ? digitMatches.length : 0;
  
  const symbolMatches = trimText.match(/[-‐‑–—_./()\[\]{}|\\+*=øØ:;,?]/g);
  const symbolCount = symbolMatches ? symbolMatches.length : 0;
  
  const totalSpecial = digitCount + symbolCount;
  const numericDensity = totalSpecial / (textLength || 1);

  // Search spatial & drawing keywords
  const drawingKeywords = [
    "scale", "dwg", "sheet", "rev", "dimension", "approved", "isometric", "layout",
    "pipeline", "co-ordinate", "tabel", "table", "drawing", "legend", "section", 
    "detail", "plan", "project", "client", "spec", "col-", "row", "diagram", 
    "as-built", "elevation", "schm", "schematic"
  ];

  let matches = 0;
  const matchedWords: string[] = [];
  for (const kw of drawingKeywords) {
    if (normText.includes(kw)) {
      matches++;
      matchedWords.push(kw);
    }
  }

  const isFileNameDrawingStr = 
    fileName.toLowerCase().includes("drawing") || 
    fileName.toLowerCase().includes("dwg") || 
    fileName.toLowerCase().includes("as-built") ||
    fileName.toLowerCase().includes("stp") || 
    fileName.toLowerCase().includes("blueprint") || 
    fileName.toLowerCase().includes("shop") || 
    fileName.toLowerCase().includes("plan");

  // Determine priority:
  // Priority 1: blueprints / shop drawings / layout drawings / engineering diagrams / large tables.
  // Identified by: extremely high numeric density (>35%), or moderate density with drawing keywords, or explicit drawing metadata.
  if (
    (matches >= 3 && numericDensity > 0.15) || 
    (numericDensity > 0.35) ||
    (isFileNameDrawingStr && textLength < 800 && matches >= 1)
  ) {
    return {
      priority: 1,
      reason: `Blueprint/drawing/table match (numeric/symbol density: ${(numericDensity * 100).toFixed(1)}%, keyword matches: ${matches} [${matchedWords.slice(0, 3).join(", ")}])`,
    };
  }

  // Priority 2: scanned pages, forms, low-text visual pages.
  // Identified by: very sparse text (< 300 chars) with lower keyword matches, or medium density forms.
  if (textLength < 350) {
    return {
      priority: 2,
      reason: `Low-text visual/form/scanned page (text length: ${textLength} chars)`,
    };
  }

  // Priority 3: text-heavy pages.
  // Identified by: standard text prose (mostly natural language text).
  return {
    priority: 3,
    reason: `Text-heavy page (text length: ${textLength} chars, numeric/symbol density: ${(numericDensity * 100).toFixed(1)}%)`,
  };
}

try {
  const pdfjsVersion = pdfjsLib.version || "6.0.227";
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`;
} catch (e) {
  console.error("Failed to register worker in DocumentUpload:", e);
}

async function renderPageWithSafety(
  page: any,
  pageNum: number,
  initialScale: number,
  isPriority1: boolean,
  fileName: string,
  textItemCount: number,
  viewportWidth: number,
  viewportHeight: number
): Promise<string> {
  // Dynamic scale correction
  const isLandscape = viewportWidth > viewportHeight;
  const totalArea = viewportWidth * viewportHeight;
  const isLargePage = totalArea > 800000;
  const isDrawingFile = fileName.toLowerCase().includes("drawing") || 
                        fileName.toLowerCase().includes("dwg") || 
                        fileName.toLowerCase().includes("as-built") ||
                        fileName.toLowerCase().includes("blueprint") ||
                        fileName.toLowerCase().includes("shop") ||
                        fileName.toLowerCase().includes("plan");

  const isComplexBlueprint = (isLandscape && isLargePage) || 
                             (isPriority1 && isLandscape) || 
                             (textItemCount > 800 && isLandscape) ||
                             (isDrawingFile && isLargePage);

  let chosenScale = initialScale;
  if (isComplexBlueprint && initialScale > 1.2) {
    chosenScale = 1.2;
    console.log(`[Render Safety] Page ${pageNum} high complexity detected (landscape: ${isLandscape}, area: ${totalArea}, textItems: ${textItemCount}, priority: ${isPriority1 ? 1 : 0}). Scale reduced from ${initialScale} to ${chosenScale}`);
  } else {
    console.log(`[Render Safety] Page ${pageNum} complexity estimation (landscape: ${isLandscape}, area: ${totalArea}, textItems: ${textItemCount}). Using scale ${chosenScale}`);
  }

  const tryRender = async (scale: number, timeoutMs: number): Promise<string> => {
    let canvas: HTMLCanvasElement | null = null;
    let renderTask: any = null;
    let timeoutId: any = null;

    return new Promise<string>(async (resolve, reject) => {
      try {
        const viewport = page.getViewport({ scale });
        canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Could not get 2D context from canvas"));
          return;
        }

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          canvas: canvas,
        };

        renderTask = page.render(renderContext);

        // Setup timeout
        let isEnded = false;
        timeoutId = setTimeout(() => {
          if (!isEnded) {
            isEnded = true;
            console.warn(`[Render Safety] Page ${pageNum} render timed out after ${timeoutMs / 1000}s at scale ${scale}. Cancelling renderTask.`);
            try {
              if (renderTask && typeof renderTask.cancel === "function") {
                renderTask.cancel();
              }
            } catch (cancelErr) {
              console.error("[Render Safety] Error while cancelling renderTask:", cancelErr);
            }
            reject(new Error("RENDER_TIMEOUT"));
          }
        }, timeoutMs);

        await renderTask.promise;
        isEnded = true;
        clearTimeout(timeoutId);

        if (!canvas) {
          reject(new Error("Canvas was disposed/destroyed before serialization"));
          return;
        }

        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        
        // Clean up
        canvas.width = 0;
        canvas.height = 0;
        canvas = null;

        resolve(dataUrl);
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (canvas) {
          canvas.width = 0;
          canvas.height = 0;
        }
        reject(err);
      }
    });
  };

  // First Attempt (at chosenScale, up to 10 seconds before retry)
  try {
    const startAttempt1 = performance.now();
    const dataUrl = await tryRender(chosenScale, 10000); // 10s timeout
    console.log(`[Render Safety] Page ${pageNum} rendered successfully at scale ${chosenScale} in ${(performance.now() - startAttempt1).toFixed(1)}ms`);
    return dataUrl;
  } catch (err: any) {
    if (err.message === "RENDER_TIMEOUT" || err.name === "RenderingCancelledException" || err.message?.includes("cancelled")) {
      // Retry once at lower scale (1.1)
      console.warn(`[Render Safety] Page ${pageNum} first attempt failed or timed out. Retrying once at lower scale 1.1...`);
      const startAttempt2 = performance.now();
      try {
        const dataUrl = await tryRender(1.1, 15000); // Retry with a 15-second timeout
        console.log(`[Render Safety] Page ${pageNum} retry rendered successfully at scale 1.1 in ${(performance.now() - startAttempt2).toFixed(1)}ms`);
        return dataUrl;
      } catch (retryErr: any) {
        console.error(`[Render Safety] Page ${pageNum} retry attempt also failed.`, retryErr);
        throw retryErr;
      }
    } else {
      throw err;
    }
  }
}

async function runBackgroundVisionEnrichment(
  documentId: string,
  file: File,
  pageClassifications: any[],
  pagesToProcessWithVision: number[],
  totalPages: number
) {
  console.log(`[Background Enrichment] Queue started for Document ${documentId}`);

  // Transition document status to enriching
  storageService.updateDocument(documentId, { status: "enriching" });

  let pdfInstance: any = null;
  let successCount = 0;
  let failCount = 0;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    pdfInstance = await pdfjsLib.getDocument({
      data: uint8Array,
      disableRange: true,
      disableStream: true,
    }).promise;
  } catch (err) {
    console.error(`[Background Enrichment] Failed to load pdfInstance:`, err);
    storageService.updateDocument(documentId, { status: "enrichment_failed" });
    return;
  }

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    // Check cancellation: has document been deleted?
    const exists = storageService.getDocuments().some((d) => d.id === documentId);
    if (!exists) {
      console.warn(`[Background Enrichment] Document ${documentId} has been deleted or re-uploaded. Stopping background queue safely.`);
      break;
    }

    if (!pagesToProcessWithVision.includes(pageNum)) {
      continue;
    }

    console.log(`[Background Enrichment] Processing Page ${pageNum}/${totalPages}...`);

    try {
      const isDrawingOrVisual = file.name.toLowerCase().includes("drawing") || 
                                file.name.toLowerCase().includes("dwg") || 
                                file.name.toLowerCase().includes("as-built") ||
                                file.name.toLowerCase().includes("stp") || 
                                file.name.toLowerCase().includes("blueprint") || 
                                file.name.toLowerCase().includes("shop") || 
                                file.name.toLowerCase().includes("plan");
      const renderScale = isDrawingOrVisual ? 1.6 : 1.2;

      const pageInstance = await pdfInstance.getPage(pageNum);
      const normViewport = pageInstance.getViewport({ scale: 1.0 });
      const textContent = await pageInstance.getTextContent();
      const textItemCount = textContent.items.length;

      const isP1 = pageClassifications[pageNum - 1]?.priority === 1;

      const dataUrl = await renderPageWithSafety(
        pageInstance,
        pageNum,
        renderScale,
        isP1,
        file.name,
        textItemCount,
        normViewport.width,
        normViewport.height
      );

      if (!dataUrl) {
        throw new Error("Render returned empty dataUrl");
      }

      // Call vision API
      const res = await fetch("/api/vision-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: dataUrl, pageNumber: pageNum }),
      });

      if (!res.ok) {
        throw new Error(`Vision API error: HTTP ${res.status}`);
      }

      const visionData = await res.json();

      // Compile rich searchable markdown layout chunk
      const compiledPageText = `[ANALISIS MULTIMODAL & OCR - HALAMAN ${pageNum}]
Tipe Dokumen Fisik: ${visionData.documentType || "tidak terklasifikasi"} (Confidence/Akurasi: ${Math.round((visionData.confidence || 1.0) * 100)}%)
Model Sukses: ${visionData.modelUsed || "Gemini Suite"}

TEKS TRANSTRIPSI (OCR):
${visionData.ocrText ? visionData.ocrText.trim() : "(Tidak ada teks karakter yang terdeteksi)"}

DESKRIPSI FISIK & STRUKTUR LAYOUT:
${visionData.visualDescription ? visionData.visualDescription.trim() : "(Tidak ada diagram/grafis teridentifikasi)"}

${visionData.structuralTables && visionData.structuralTables.length > 0
  ? `TABEL DAN STRUKTUR DATA TERSTRUKTUR:
${visionData.structuralTables.join("\n\n")}`
  : ""
}

${visionData.warnings && visionData.warnings.length > 0
  ? `INFORMASI KUALITAS & CATATAN: ${visionData.warnings.join(", ")}`
  : ""
}`;

      // Generate embedding vector for the compiled vision enrichment text
      const normalizedText = normalizeText(compiledPageText);
      const hash = await calculateSHA256(normalizedText);

      // Check cache first
      let emb = await dbService.getCachedEmbedding(hash, "gemini-embedding-2-preview");
      if (!emb) {
        // Embed via API
        const embedRes = await fetch("/api/embed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texts: [normalizedText] }),
        });
        if (embedRes.ok) {
          const embedData = await embedRes.json();
          emb = embedData.embeddings?.[0];
          if (Array.isArray(emb) && emb.length > 0) {
            await dbService.saveCachedEmbedding(hash, emb, "gemini-embedding-2-preview");
          }
        }
      }

      if (emb && Array.isArray(emb) && emb.length > 0) {
        // Check cancellation again right before write
        const stillExists = storageService.getDocuments().some((d) => d.id === documentId);
        if (!stillExists) {
          console.warn(`[Background Enrichment] Cancelled right before writing page ${pageNum} enrichment chunk.`);
          break;
        }

        const chunkId = `${documentId}_page_${pageNum}_vision_enrichment`;

        const chunkObj: DocumentChunk = {
          id: chunkId,
          text: compiledPageText,
          pageNum: pageNum,
          sourceType: "vision_enrichment",
          documentId: documentId,
          createdAt: new Date().toISOString()
        };

        // Save to IndexedDB
        await dbService.saveDocumentVectors(documentId, [chunkObj], [emb]);
        console.log(`[Background Enrichment] Saved enrichment vector for Page ${pageNum} under id: ${chunkId}`);

        // Append chunkObj to the document record
        const currentDocs = storageService.getDocuments();
        const dIdx = currentDocs.findIndex((d) => d.id === documentId);
        if (dIdx !== -1) {
          const docItem = currentDocs[dIdx];
          const existingChunks = docItem.chunks || [];
          const filteredChunks = existingChunks.filter((c) => c.id !== chunkId);

          storageService.updateDocument(documentId, {
            chunks: [...filteredChunks, chunkObj]
          });
        }
        successCount++;
      } else {
        throw new Error("Failed to generate embedding for vision enrichment text");
      }
    } catch (pageErr) {
      console.error(`[Background Enrichment] Error processing page ${pageNum}:`, pageErr);
      failCount++;
    }
  }

  // Clean up pdfInstance safely
  try {
    if (pdfInstance) {
      if (typeof pdfInstance.destroy === "function") {
        await pdfInstance.destroy();
      } else if (typeof pdfInstance.cleanup === "function") {
        await pdfInstance.cleanup();
      }
    }
  } catch (cleanErr) {
    console.error("[Background Enrichment] Error cleaning up pdfInstance:", cleanErr);
  }

  // Set final status
  const existsAtEnd = storageService.getDocuments().some((d) => d.id === documentId);
  if (existsAtEnd) {
    let finalStatus: "fully_enriched" | "enrichment_partial" | "enrichment_failed" = "fully_enriched";
    if (successCount === 0) {
      finalStatus = "enrichment_failed";
    } else if (failCount > 0) {
      finalStatus = "enrichment_partial";
    }

    storageService.updateDocument(documentId, { status: finalStatus });
    console.log(`[Background Enrichment] Completed. Success pages: ${successCount}, Failed pages: ${failCount}. Final Status: ${finalStatus}`);
  }
}

interface DocumentUploadProps {
  onUploadSuccess: (newDoc: Document) => void;
  visionMode?: VisionMode;
  setVisionMode?: (mode: VisionMode) => void;
}

export default function DocumentUpload({ onUploadSuccess, visionMode: externalVisionMode, setVisionMode: externalSetVisionMode }: DocumentUploadProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [status, setStatus] = useState<"idle" | "parsing" | "vision_ocr" | "chunking" | "indexing" | "embedding" | "saving" | "success" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [chunkCount, setChunkCount] = useState(0);
  const [fileName, setFileName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [transientAlert, setTransientAlert] = useState("");
  const [internalVisionMode, setInternalVisionMode] = useState<VisionMode>("AUTO");
  
  const visionMode = externalVisionMode !== undefined ? externalVisionMode : internalVisionMode;
  const setVisionMode = externalSetVisionMode !== undefined ? externalSetVisionMode : setInternalVisionMode;

  const [isReindexing, setIsReindexing] = useState(false);
  const [visionProcessProgress, setVisionProcessProgress] = useState({ current: 0, total: 0 });
  const [stats, setStats] = useState<{
    totalChunks: number;
    embeddedChunks: number;
    skippedChunks: number;
    multimodalPages?: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States for V3 Vision Sandbox usage
  const [latestFile, setLatestFile] = useState<File | null>(null);
  const [visionLoading, setVisionLoading] = useState(false);
  const [visionResponse, setVisionResponse] = useState<any>(null);
  const [visionError, setVisionError] = useState("");


  const processFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      setStatus("error");
      setErrorMessage("Hanya file PDF yang diperbolehkan.");
      setTransientAlert("");
      return;
    }

    // Inform the user for very large PDFs (> 15MB) about client-side parsing time
    const WARN_SIZE_MB = 15;
    if (file.size > WARN_SIZE_MB * 1024 * 1024) {
      if (
        !confirm(
          `Ukuran file (${(file.size / (1024 * 1024)).toFixed(1)} MB) cukup besar. Proses ekstraksi teks offline & indexing di dalam browser mungkin memakan waktu beberapa detik. Lanjutkan?`
        )
      ) {
        return;
      }
    }

    setIsReindexing(false);
    console.log(`[DocumentUpload Debug] --- STARTING FILE PROCESSING ---`, {
      fileName: file.name,
      fileSize: file.size,
      visionMode,
    });

    setStatus("parsing");
    setProgress(0);
    setFileName(file.name);
    setLatestFile(file); // Saved for V3 Vision Sandbox usage
    setErrorMessage("");
    setTransientAlert("");
    setChunkCount(0);
    setStats(null);

    try {
      console.log(`[Timer Start] Starting processing pipeline for "${file.name}"`);
      const pdfExtractStart = performance.now();
      // Step 1: Parsing PDF page-by-page asynchronously (Progress 0 - 100)
      const extractionResult = await extractPagesFromPdf(file, (percent) => {
        setProgress(percent);
      });
      const pdfExtractTime = performance.now() - pdfExtractStart;
      console.log(`[Timer Result] PDF extraction took ${pdfExtractTime.toFixed(1)}ms`);

      const totalPages = extractionResult.pages.length;
      const textLayerFound = extractionResult.pages.some((p) => p.text && p.text.trim().length > 0);
      const rawTextTrimmed = extractionResult.rawText.trim();

      // Implement Local Page-by-Page Classification
      const pageClassifications = extractionResult.pages.map((p) => {
        const decision = classifyPage(p.pageNum, p.text, file.name);
        console.log(`[Page Classifier] Page ${p.pageNum} → Priority ${decision.priority} (${decision.reason})`);
        return {
          pageNum: p.pageNum,
          priority: decision.priority,
          reason: decision.reason,
        };
      });

      const p1Count = pageClassifications.filter((c) => c.priority === 1).length;
      const p2Count = pageClassifications.filter((c) => c.priority === 2).length;
      const p3Count = pageClassifications.filter((c) => c.priority === 3).length;

      const p1Ratio = p1Count / totalPages;
      const p2Ratio = p2Count / totalPages;
      const p3Ratio = p3Count / totalPages;

      console.log(`[Document Profile Analysis] File: ${file.name}, Total pages: ${totalPages}`, {
        priority1: `${p1Count} pages (${(p1Ratio * 100).toFixed(1)}%)`,
        priority2: `${p2Count} pages (${(p2Ratio * 100).toFixed(1)}%)`,
        priority3: `${p3Count} pages (${(p3Ratio * 100).toFixed(1)}%)`,
      });

      // AUTO Mode dynamic resolution:
      // - Text-heavy document → STANDARD (use text layer, skip Vision completely)
      // - Mixed document → HYBRID (Vision on P1 and P2, skip P3)
      // - Drawing-heavy / scan-heavy document → FULL or HYBRID (if extreme p1/p2, resolvedMode = FULL, otherwise HYBRID)
      let resolvedMode: VisionMode = visionMode;
      if (visionMode === "AUTO") {
        if (p3Ratio >= 0.70) {
          resolvedMode = "STANDARD";
          console.log(`[Auto Mode Decision] Text-heavy profile detected (${(p3Ratio * 100).toFixed(1)}% Priority 3). Resolving to STANDARD (skip Vision).`);
        } else if (p1Ratio >= 0.50 || (p1Ratio + p2Ratio >= 0.85)) {
          if (p1Ratio + p2Ratio >= 0.90) {
            resolvedMode = "FULL";
            console.log(`[Auto Mode Decision] Extreme drawing/scan-heavy profile detected. Resolving to FULL.`);
          } else {
            resolvedMode = "HYBRID";
            console.log(`[Auto Mode Decision] High drawing/scan profile detected. Resolving to HYBRID.`);
          }
        } else {
          resolvedMode = "HYBRID";
          console.log(`[Auto Mode Decision] Mixed content profile detected. Resolving to HYBRID.`);
        }
      } else if (visionMode === "HYBRID") {
        resolvedMode = "HYBRID";
      }

      console.log(`[Resolved Vision Mode] Selected Mode: ${visionMode} -> Resolved Mode: ${resolvedMode}`);

      // Now determine whether isMultimodalActive and selection logic
      let isMultimodalActive = false;
      if (resolvedMode === "FULL" || resolvedMode === "HYBRID") {
        isMultimodalActive = true;
      } else {
        isMultimodalActive = false; // STANDARD skips vision entirely
      }

      // Identify which pages actually run Vision
      const pagesToProcessWithVision = pageClassifications.filter((c) => {
        if (resolvedMode === "FULL") return true;
        if (resolvedMode === "HYBRID") {
          return c.priority === 1 || c.priority === 2;
        }
        return false;
      }).map((c) => c.pageNum);

      const skippedCount = totalPages - pagesToProcessWithVision.length;

      if (resolvedMode === "HYBRID") {
        console.log(`[Hybrid Mode] Selected ${pagesToProcessWithVision.length} of ${totalPages} pages for Vision`);
        console.log(`[Vision Reduction] Skipped ${skippedCount} pages`);
      }

      const visionOcrStart = performance.now();
      if (isMultimodalActive && pagesToProcessWithVision.length > 0 && false) {
        console.log(`[Multimodal RAG] Initializing page-by-page vision processing for ${pagesToProcessWithVision.length} pages...`);
        setStatus("vision_ocr");
        setProgress(0);
        setVisionProcessProgress({ current: 0, total: totalPages });

        let pdfInstance: any = null;
        try {
          const arrayBuffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          pdfInstance = await pdfjsLib.getDocument({
            data: uint8Array,
            disableRange: true,
            disableStream: true,
          }).promise;
          console.log(`[Render Safety] Successfully initialized pdfInstance of "${file.name}" for safe rendering.`);
        } catch (loadErr) {
          console.error(`[Render Safety] Failed to load pdfInstance once for rendering:`, loadErr);
        }

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          setVisionProcessProgress({ current: pageNum, total: totalPages });
          setProgress(Math.round(((pageNum - 1) / totalPages) * 100));

          if (!pagesToProcessWithVision.includes(pageNum)) {
            console.log(`[Vision Mode] Skipping Page ${pageNum} under HYBRID mode (Priority 3). Retaining native text layer.`);
            continue;
          }

          // Determine optimal render scale to preserve fine details like dimension annotations
          const isDrawingOrVisual = file.name.toLowerCase().includes("drawing") || 
                                    file.name.toLowerCase().includes("stp") || 
                                    file.name.toLowerCase().includes("blueprint") || 
                                    file.name.toLowerCase().includes("shop") || 
                                    file.name.toLowerCase().includes("plan") || 
                                    file.name.toLowerCase().includes("surat") || 
                                    file.name.toLowerCase().includes("claim") || 
                                    file.name.toLowerCase().includes("invoice") || 
                                    file.name.toLowerCase().includes("table") || 
                                    file.name.toLowerCase().includes("form") || 
                                    isMultimodalActive;
          const renderScale = isDrawingOrVisual ? 1.6 : 1.2;

          let dataUrl = "";
          let pageRenderSuccess = false;
          let renderStatus: "success" | "vision_render_timeout" | "render_failed" = "success";

          if (pdfInstance) {
            try {
              const pageInstance = await pdfInstance.getPage(pageNum);
              const normViewport = pageInstance.getViewport({ scale: 1.0 });
              
              // Estimate complexity
              const textContent = await pageInstance.getTextContent();
              const textItemCount = textContent.items.length;
              
              const isP1 = pageClassifications[pageNum - 1].priority === 1;

              // Render using Page Render Safety helper
              dataUrl = await renderPageWithSafety(
                pageInstance,
                pageNum,
                renderScale,
                isP1,
                file.name,
                textItemCount,
                normViewport.width,
                normViewport.height
              );
              pageRenderSuccess = true;
            } catch (renderSafetyErr: any) {
              if (renderSafetyErr.message === "RENDER_TIMEOUT" || renderSafetyErr.message?.includes("timeout")) {
                renderStatus = "vision_render_timeout";
                console.error(`[Render Safety] Page ${pageNum} render timeout after 15s`);
                console.log(`[Render Safety] Continuing with next page`);
              } else {
                renderStatus = "render_failed";
                console.error(`[Render Safety] Page ${pageNum} rendering failed completely:`, renderSafetyErr);
                console.log(`[Render Safety] Continuing with next page`);
              }
            }
          } else {
            // Fallback (just in case loading pdfInstance failed)
            try {
              console.log(`[Render Safety] Falling back to standard rendering without complexity safety for Page ${pageNum}`);
              const pageOcrStart = performance.now();
              dataUrl = await renderPdfPageToImage(file, pageNum, renderScale);
              pageRenderSuccess = true;
              const pageOcrRenderTime = performance.now() - pageOcrStart;
              console.log(`[Timer Result] OCR rendering (fallback) for Page ${pageNum} took ${pageOcrRenderTime.toFixed(1)}ms`);
            } catch (fallbackErr) {
              renderStatus = "render_failed";
              console.error(`[Render Safety] Fallback rendering failed for Page ${pageNum}:`, fallbackErr);
              console.log(`[Render Safety] Continuing with next page`);
            }
          }

          if (pageRenderSuccess && dataUrl) {
            const pageVisionStart = performance.now();
            console.log(`[Multimodal OCR Debug] Sending page ${pageNum} to /api/vision-analyze...`);
            try {
              const res = await fetch("/api/vision-analyze", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  imageBase64: dataUrl,
                  pageNumber: pageNum,
                }),
              });

              if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                console.error(`[Multimodal OCR Debug] Error calling vision-analyze on Page ${pageNum}:`, res.status, errData);
                console.warn(`[Render Safety] Skipping vision page compilation for Page ${pageNum} due to API error. Retaining native text layer.`);
              } else {
                const visionData = await res.json();
                const pageVisionTime = performance.now() - pageVisionStart;
                console.log(`[Timer Result] Vision API analyze for Page ${pageNum} took ${pageVisionTime.toFixed(1)}ms`);
                console.log(`[Multimodal OCR Debug] Page ${pageNum}: Server resolved successfully. Model used: ${visionData.modelUsed || "Unknown"}`);

                if (pageNum === 3) {
                  console.log(`[Multimodal OCR Debug] --- PAGE 3 OCR TEXT PREVIEW ---`);
                  console.log(visionData.ocrText ? visionData.ocrText.substring(0, 1200) : "(No characters detected or returned)");
                  console.log(`[Multimodal OCR Debug] --- PAGE 3 VISUAL DESCRIPTION PREVIEW ---`);
                  console.log(visionData.visualDescription ? visionData.visualDescription.substring(0, 1200) : "(No spatial description detected or returned)");
                }

                // Compile rich searchable markdown layout chunk
                const compiledPageText = `[ANALISIS MULTIMODAL & OCR - HALAMAN ${pageNum}]
Tipe Dokumen Fisik: ${visionData.documentType || "tidak terklasifikasi"} (Confidence/Akurasi: ${Math.round((visionData.confidence || 1.0) * 100)}%)
Model Sukses: ${visionData.modelUsed || "Gemini Suite"}

TEKS TRANSTRIPSI (OCR):
${visionData.ocrText ? visionData.ocrText.trim() : "(Tidak ada teks karakter yang terdeteksi)"}

DESKRIPSI FISIK & STRUKTUR LAYOUT:
${visionData.visualDescription ? visionData.visualDescription.trim() : "(Tidak ada diagram/grafis teridentifikasi)"}

${visionData.structuralTables && visionData.structuralTables.length > 0
  ? `TABEL DAN STRUKTUR DATA TERSTRUKTUR:
${visionData.structuralTables.join("\n\n")}`
  : ""
}

${visionData.warnings && visionData.warnings.length > 0
  ? `INFORMASI KUALITAS & CATATAN: ${visionData.warnings.join(", ")}`
  : ""
}`;

                // Swap text slot for this page
                extractionResult.pages[pageNum - 1].text = compiledPageText;
              }
            } catch (apiErr) {
              console.error(`[Render Safety] Error fetching vision-analyze for Page ${pageNum}:`, apiErr);
              console.warn(`[Render Safety] Skipping vision page compilation for Page ${pageNum} due to fetch error. Retaining native text layer.`);
            }
          } else {
            console.log(`[Render Safety] Skipping Vision API call for Page ${pageNum} because rendering was unsuccessful (status: ${renderStatus}). Keeping native text-layer.`);
          }
        }

        // Clean up pdfInstance safely
        try {
          if (pdfInstance) {
            if (typeof pdfInstance.destroy === "function") {
              await pdfInstance.destroy();
            } else if (typeof pdfInstance.cleanup === "function") {
              await pdfInstance.cleanup();
            }
            console.log(`[Render Safety] Successfully cleaned up pdfInstance.`);
          }
        } catch (destroyErr) {
          console.error(`[Render Safety] Error destroying pdfInstance:`, destroyErr);
        }

        const visionOcrTime = performance.now() - visionOcrStart;
        console.log(`[Timer Result] Page-by-page Vision & OCR analysis took ${visionOcrTime.toFixed(1)}ms`);

        // Reconstitute accumulated raw string
        extractionResult.rawText = extractionResult.pages.map((p) => p.text).join("\n\n---\n\n");
        setProgress(100);
      } else {
        const visionOcrTime = performance.now() - visionOcrStart;
        console.log(`[Timer Result] Vision & OCR bypassed or skipped entirely. Completed in ${visionOcrTime.toFixed(1)}ms`);
      }

      // Check final compiled page text of Page 3 before chunking
      const page3Data = extractionResult.pages.find((p) => p.pageNum === 3);
      if (page3Data) {
        const p3Text = page3Data.text || "";
        console.log(`[Chunk Assembly Debug] --- PAGE 3 SEARCHABLE TEXT BEFORE CHUNKING (Length: ${p3Text.length} chars) ---`);
        console.log(p3Text);
        
        const hasDimensionHeader = p3Text.includes("--- VISIBLE DIMENSIONS, MEASUREMENTS, AND ANNOTATIONS ---");
        const contains5300 = p3Text.includes("5300");
        const contains15000 = p3Text.includes("15000");
        const contains9400 = p3Text.includes("9400");
        const containsPipe = p3Text.includes("Ø100");
        
        console.log(`[Chunk Assembly Debug] Dimension checks for Page 3 text before chunking:`, {
          hasDimensionHeader,
          contains5300,
          contains15000,
          contains9400,
          containsPipe,
        });
      } else {
        console.log(`[Chunk Assembly Debug] No Page 3 data loaded/found in extracted pages.`);
      }

      // Compute and process the visual text SHA-256 hash
      const extractedTextHash = await calculateSHA256(extractionResult.rawText);
      console.log(`[document hash match] PDF Content Hash Computed: ${extractedTextHash} for "${file.name}"`);

      const existingDocs = storageService.getDocuments();

      // Look for duplicate document record matching fileName, fileSize, AND extractedTextHash
      const duplicateDoc = existingDocs.find(
        (d) => d.name === file.name && d.size === file.size && d.extractedTextHash === extractedTextHash
      );

      if (duplicateDoc) {
        console.log(`[duplicate vector reuse] Perfect file match found (fileName, fileSize, and textHash). Reusing stored vectors for: ${file.name}`);
        setStatus("saving");
        setProgress(45);

        // Load pre-existing vectors linked to this duplicate doc
        const existingVectors = await dbService.loadDocumentVectors(duplicateDoc.id);
        if (existingVectors && existingVectors.length > 0) {
          console.log(`[duplicate vector reuse] Successfully loaded ${existingVectors.length} vectors from document ID ${duplicateDoc.id}`);
          const newDocId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

          // Re-map and clone the vectors with new distinct chunk IDs on Key-Path to avoid IndexedDB collisions
          const reusedChunks: DocumentChunk[] = [];
          const reusedEmbeddings: number[][] = [];

          existingVectors.forEach((v, index) => {
            const newChunkId = `chunk_${v.pageNum}_${index}_${Math.random().toString(36).substring(2, 6)}`;
            reusedChunks.push({
              id: newChunkId,
              text: v.text,
              pageNum: v.pageNum,
            });
            reusedEmbeddings.push(v.embedding);
          });

          setProgress(75);
          console.log(`[duplicate vector reuse] Saving ${reusedChunks.length} duplicated vectors under new docID: ${newDocId}`);
          await dbService.saveDocumentVectors(newDocId, reusedChunks, reusedEmbeddings);

          const newDoc: Document = {
            id: newDocId,
            name: file.name,
            size: file.size,
            extractedText: extractionResult.rawText,
            extractedTextHash: extractedTextHash,
            chunks: reusedChunks,
            uploadedAt: new Date().toISOString(),
          };

          const saveResult = storageService.saveDocument(newDoc);
          if (!saveResult.success) {
            throw new Error(saveResult.error || "Gagal menyimpan dokumen.");
          }

          setStats({
            totalChunks: reusedChunks.length,
            embeddedChunks: reusedChunks.length,
            skippedChunks: 0,
            multimodalPages: isMultimodalActive ? totalPages : undefined,
          });

          setProgress(100);
          setStatus("success");

          if (saveResult.isTransient) {
            setTransientAlert(saveResult.error || "");
          }

          onUploadSuccess(newDoc);

          setTimeout(() => {
            setStatus("idle");
            setProgress(0);
            setFileName("");
            setChunkCount(0);
          }, 6000);

          return; // STOP indexing/embedding pipeline immediately as vectors are successfully duplicated
        } else {
          console.warn("[duplicate vector reuse] Existing doc matched but had 0 vectors in IndexedDB. Continuing index from scratch...");
        }
      }

      // If there is an existing stale document with matching name only (editing different file contents), clean it first
      const staleDoc = existingDocs.find((d) => d.name === file.name);
      if (staleDoc) {
        setIsReindexing(true);
        console.log(`[DocumentUpload Debug] Stale document matching name "${file.name}" detected. CLEARING old documents, vectors, & chat history.`);
        storageService.deleteDocument(staleDoc.id);
        await dbService.deleteDocumentVectors(staleDoc.id);
        chatService.clearChatHistory(staleDoc.id);
      }

      // Step 2: Chunking (Divide pages text into overlapping blocks)
      const chunkingStart = performance.now();
      setStatus("chunking");
      setProgress(0);
      const rawChunks = await chunkExtractedPages(
        extractionResult.pages,
        1200, // maxChunkSize
        200,  // overlap
        (percent, count) => {
          setProgress(percent);
          setChunkCount(count);
        }
      );

      // Clean chunks: filter empty chunks, trim whitespace, remove empty chunks
      const chunks = rawChunks
        .map((c) => ({ ...c, text: c.text.trim() }))
        .filter((c) => c.text.length > 0);
      const chunkingTime = performance.now() - chunkingStart;
      console.log(`[Timer Result] Chunking took ${chunkingTime.toFixed(1)}ms`);

      // Step 3: Indexing (Prepare search arrays asynchronously)
      const indexingStart = performance.now();
      setStatus("indexing");
      setProgress(0);
      await indexDocumentChunks(chunks, (percent) => {
        setProgress(percent);
      });
      const indexingTime = performance.now() - indexingStart;
      console.log(`[Timer Result] Indexing took ${indexingTime.toFixed(1)}ms`);

      // Step 3.5: Embedding (Batch call to backend API with chunk cache and chunk resilience)
      const embeddingStart = performance.now();
      setStatus("embedding");
      setProgress(0);

      const embeddedChunks: DocumentChunk[] = [];
      const successfulEmbeddings: number[][] = [];
      let skippedChunksCount = 0;
      let cacheHitsVal = 0;
      let cacheMissesVal = 0;

      // Pre-process and resolve cache states or collect cache misses
      const preparedChunks: { chunk: DocumentChunk; normalized: string; hash: string; isCached: boolean; embedding?: number[] }[] = [];

      for (const chunk of chunks) {
        const normalized = normalizeText(chunk.text);
        if (normalized.length < 15) {
          // Rule: "Do not cache empty or extremely short chunks."
          console.log(`[Chunk Cache] Skipping extremely short or empty chunk id: ${chunk.id}`);
          skippedChunksCount++;
          continue;
        }

        const hash = await calculateSHA256(normalized);
        const cachedEmb = await dbService.getCachedEmbedding(hash, "gemini-embedding-2-preview");

        if (cachedEmb) {
          cacheHitsVal++;
          preparedChunks.push({ chunk, normalized, hash, isCached: true, embedding: cachedEmb });
        } else {
          cacheMissesVal++;
          preparedChunks.push({ chunk, normalized, hash, isCached: false });
        }
      }

      console.log(`[chunk cache hits] Hits: ${cacheHitsVal}`);
      console.log(`[chunk cache misses] Misses: ${cacheMissesVal}`);

      const chunksToEmbed = preparedChunks.filter((p) => !p.isCached);
      const batchSize = 20;
      const totalMisses = chunksToEmbed.length;

      if (totalMisses > 0) {
        const batchStartTiming = performance.now();
        for (let i = 0; i < totalMisses; i += batchSize) {
          const batchItems = chunksToEmbed.slice(i, i + batchSize);
          const batchTexts = batchItems.map((item) => item.normalized);

          try {
            const batchCallStart = performance.now();
            const response = await fetch("/api/embed", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ texts: batchTexts }),
            });
            const batchCallDuration = performance.now() - batchCallStart;
            console.log(`[batch embedding duration] Batch of size ${batchItems.length} returned in ${batchCallDuration.toFixed(1)}ms`);

            if (!response.ok) {
              console.warn(`[DocumentUpload] Batch embedding request i=${i} failed (${response.status}). Retrying sequentially for this batch...`);
              for (const item of batchItems) {
                try {
                  const singleResponse = await fetch("/api/embed", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ texts: [item.normalized] }),
                  });

                  if (!singleResponse.ok) {
                    throw new Error(`Controlled concurrency/sequential fallback returned HTTP ${singleResponse.status}`);
                  }

                  const singleData = await singleResponse.json();
                  const emb = singleData.embeddings?.[0];
                  if (Array.isArray(emb) && emb.length > 0) {
                    item.isCached = true;
                    item.embedding = emb;
                    // Cache single
                    await dbService.saveCachedEmbedding(item.hash, emb, "gemini-embedding-2-preview");
                  } else {
                    skippedChunksCount++;
                  }
                } catch (singleErr) {
                  console.warn(`[controlled concurrency fallback] Fallback failed for chunk hash ${item.hash}:`, singleErr);
                  skippedChunksCount++;
                }
              }
            } else {
              const data = await response.json();
              if (data.embeddings && Array.isArray(data.embeddings)) {
                if (data.embeddings.length !== batchItems.length) {
                  console.warn(`[controlled concurrency fallback] Mismatch in batch embedding count. Processing sequentially...`);
                  for (let j = 0; j < batchItems.length; j++) {
                    const emb = data.embeddings[j];
                    const item = batchItems[j];
                    if (Array.isArray(emb) && emb.length > 0) {
                      item.isCached = true;
                      item.embedding = emb;
                      await dbService.saveCachedEmbedding(item.hash, emb, "gemini-embedding-2-preview");
                    } else {
                      skippedChunksCount++;
                    }
                  }
                } else {
                  // Perfect batch match: Cache in transaction batch
                  const cacheBatch: { hash: string; embedding: number[]; model: string }[] = [];
                  for (let j = 0; j < batchItems.length; j++) {
                    const emb = data.embeddings[j];
                    const item = batchItems[j];
                    if (Array.isArray(emb) && emb.length > 0) {
                      item.isCached = true;
                      item.embedding = emb;
                      cacheBatch.push({
                        hash: item.hash,
                        embedding: emb,
                        model: "gemini-embedding-2-preview",
                      });
                    } else {
                      skippedChunksCount++;
                    }
                  }
                  if (cacheBatch.length > 0) {
                    await dbService.saveCachedEmbeddingsBatch(cacheBatch);
                  }
                }
              } else {
                throw new Error("Format respons batch embedding tidak didukung.");
              }
            }
          } catch (err) {
            console.warn(`[controlled concurrency fallback] Uncaught batch process error starting i=${i}. Swapping to sequentialFallback:`, err);
            for (const item of batchItems) {
              try {
                const singleResponse = await fetch("/api/embed", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ texts: [item.normalized] }),
                });

                if (singleResponse.ok) {
                  const singleData = await singleResponse.json();
                  const emb = singleData.embeddings?.[0];
                  if (Array.isArray(emb) && emb.length > 0) {
                    item.isCached = true;
                    item.embedding = emb;
                    await dbService.saveCachedEmbedding(item.hash, emb, "gemini-embedding-2-preview");
                    continue;
                  }
                }
                skippedChunksCount++;
              } catch {
                skippedChunksCount++;
              }
            }
          }
          const percent = Math.min(100, Math.round(((i + batchItems.length) / totalMisses) * 100));
          setProgress(percent);
        }
        const batchEmbeddingDuration = performance.now() - batchStartTiming;
        console.log(`[batch embedding duration] Generated embeddings for cache misses in ${batchEmbeddingDuration.toFixed(1)}ms`);
      }

      // Reassemble processed vectors (hits + misses)
      for (const item of preparedChunks) {
        if (item.embedding) {
          embeddedChunks.push(item.chunk);
          successfulEmbeddings.push(item.embedding);
        }
      }

      const embeddingTime = performance.now() - embeddingStart;
      console.log(`[total embedding duration] Generation finished in ${embeddingTime.toFixed(1)}ms`);

      setStats({
        totalChunks: chunks.length,
        embeddedChunks: embeddedChunks.length,
        skippedChunks: skippedChunksCount,
        multimodalPages: isMultimodalActive ? totalPages : undefined,
      });

      // Step 4: Saving Metadata
      const dbSaveStart = performance.now();
      setStatus("saving");
      setProgress(60);

      const newDocId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const chunksWithMetadata: DocumentChunk[] = chunks.map((c) => ({
        id: c.id,
        text: c.text,
        pageNum: c.pageNum,
        sourceType: "native_text" as const,
        documentId: newDocId,
        createdAt: new Date().toISOString()
      }));

      // Save vectors to IndexedDB
      if (embeddedChunks.length > 0) {
        try {
          const embeddedChunksWithMetadata = embeddedChunks.map((c) => ({
            id: c.id,
            text: c.text,
            pageNum: c.pageNum,
            sourceType: "native_text" as const,
            documentId: newDocId,
            createdAt: new Date().toISOString()
          }));
          await dbService.saveDocumentVectors(newDocId, embeddedChunksWithMetadata, successfulEmbeddings);
        } catch (dbErr) {
          console.error("Gagal menyimpan vector ke IndexedDB:", dbErr);
        }
      }
      const dbSaveTime = performance.now() - dbSaveStart;
      console.log(`[Timer Result] IndexedDB & storage saving took ${dbSaveTime.toFixed(1)}ms`);

      const hasVisionToRun = isMultimodalActive && pagesToProcessWithVision.length > 0;
      const initialStatus = hasVisionToRun ? "indexed_native" : "fully_enriched";

      const newDoc: Document = {
        id: newDocId,
        name: file.name,
        size: file.size,
        extractedText: extractionResult.rawText, // preserved for UI visual inspector
        extractedTextHash: extractedTextHash,
        chunks: chunksWithMetadata,
        uploadedAt: new Date().toISOString(),
        status: initialStatus
      };

      // Try local storage sync with capacity auto recovery
      const saveResult = storageService.saveDocument(newDoc);
      
      if (!saveResult.success) {
        throw new Error(saveResult.error || "Gagal menyimpan dokumen.");
      }

      setProgress(100);
      setStatus("success");
      
      if (saveResult.isTransient) {
        setTransientAlert(saveResult.error || "");
      }

      onUploadSuccess(newDoc);

      // Trigger asynchronous Background Vision Enrichment (detached)
      if (hasVisionToRun) {
        console.log(`[DocumentUpload] Starting background vision enrichment queue for ${newDoc.name}...`);
        runBackgroundVisionEnrichment(
          newDocId,
          file,
          pageClassifications,
          pagesToProcessWithVision,
          totalPages
        ).catch((bgErr) => {
          console.error(`[DocumentUpload] Uncaught background vision enrichment queue error:`, bgErr);
        });
      }

      // Reset back to idle after a brief success phase
      setTimeout(() => {
        setStatus("idle");
        setProgress(0);
        setFileName("");
        setChunkCount(0);
      }, 6000);
    } catch (err: any) {
      console.error("Failed to parse and store document:", err);
      setStatus("error");
      setErrorMessage(err.message || "Gagal membaca atau memproses file PDF.");
      setTransientAlert("");
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleTestVisionPage1 = async () => {
    if (!latestFile) return;
    setVisionLoading(true);
    setVisionResponse(null);
    setVisionError("");

    try {
      console.log(`[Vision V3 Debug] Rendering Page 1 of ${latestFile.name}...`);
      
      // Determine optimal render scale to preserve fine details like dimension annotations
      const isDrawingOrVisual = latestFile.name.toLowerCase().includes("drawing") || 
                                latestFile.name.toLowerCase().includes("stp") || 
                                latestFile.name.toLowerCase().includes("blueprint") || 
                                latestFile.name.toLowerCase().includes("shop") || 
                                latestFile.name.toLowerCase().includes("plan") || 
                                latestFile.name.toLowerCase().includes("surat") || 
                                latestFile.name.toLowerCase().includes("claim") || 
                                latestFile.name.toLowerCase().includes("invoice") || 
                                latestFile.name.toLowerCase().includes("table") || 
                                latestFile.name.toLowerCase().includes("form") || 
                                (visionMode !== "STANDARD");
      const renderScale = isDrawingOrVisual ? 1.6 : 1.2;
      console.log(`[Vision V3 Debug] Rendering Page 1 of ${latestFile.name} focusing annotations. Scale used: ${renderScale}`);
      
      const dataUrl = await renderPdfPageToImage(latestFile, 1, renderScale);
      
      console.log(`[Vision V3 Debug] Page 1 rendered. Sending to /api/vision-analyze...`);
      const res = await fetch("/api/vision-analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64: dataUrl,
          pageNumber: 1
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server returned status ${res.status}`);
      }

      const visionData = await res.json();
      console.log(`[Vision V3 Debug] Vision analysis response successfully received on client!`, visionData);
      setVisionResponse(visionData);
    } catch (err: any) {
      console.error("[Vision V3 Debug] Failed V3 vision test:", err);
      setVisionError(err.message || "Gagal melakukan uji Vision.");
    } finally {
      setVisionLoading(false);
    }
  };

  const isProcessing = ["parsing", "vision_ocr", "chunking", "indexing", "embedding", "saving"].includes(status);

  return (
    <div id="document-upload-container" className="w-full">
      {/* Panel Selektor Mode Vision */}
      <div id="vision-mode-selector-panel" className="bg-slate-50/50 dark:bg-[#0B1220]/50 border border-slate-200 dark:border-[#1F2937] rounded-xl p-3.5 mb-4 shadow-sm select-none">
        <div className="flex flex-col gap-3">
          <div className="text-left">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="inline-block flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              <span className="text-[11px] font-extrabold text-slate-700 dark:text-[#9CA3AF] uppercase tracking-wider">Mode Analisis Dokumen</span>
            </div>
            <p className="text-[10.5px] text-slate-500 dark:text-[#9CA3AF] leading-relaxed">
              Pilih metode pemrosesan yang sesuai dengan tipe berkas Anda.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {(["AUTO", "STANDARD", "HYBRID", "FULL"] as VisionMode[]).map((mode) => {
              const isActive = visionMode === mode;
              let title = "";
              let badgeText = "";
              let desc = "";
              let useCases: string[] = [];
              
              if (mode === "AUTO") {
                title = "AUTO ⭐";
                badgeText = "Direkomendasikan";
                desc = "BrainVault memilih mode terbaik secara otomatis.";
                useCases = ["Manual", "SOP", "Kontrak", "BAST"];
              } else if (mode === "STANDARD") {
                title = "STANDARD ⚡";
                badgeText = "Tercepat";
                desc = "Menggunakan teks asli PDF.";
                useCases = ["Laporan", "Spesifikasi", "Dokumen teks"];
              } else if (mode === "HYBRID") {
                title = "HYBRID 🎯";
                badgeText = "Seimbang";
                desc = "Menggabungkan teks dan analisis visual.";
                useCases = ["Formulir", "Tabel", "Checklist inspeksi"];
              } else if (mode === "FULL") {
                title = "FULL 🔬";
                badgeText = "Analisis Visual";
                desc = "Menganalisis seluruh halaman menggunakan Vision AI.";
                useCases = ["Blueprint", "Shop Drawing", "Dokumen Scan"];
              }

              return (
                <button
                  key={mode}
                  id={`btn-vision-mode-${mode.toLowerCase()}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setVisionMode(mode);
                  }}
                  className={`flex flex-col text-left p-3 rounded-xl border transition-all cursor-pointer gap-2 outline-none ${
                    isActive
                      ? "border-blue-500 bg-blue-50/25 dark:bg-blue-950/20 shadow-sm"
                      : "border-slate-200 dark:border-[#1F2937] bg-white dark:bg-[#111827] hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/30 text-slate-750 dark:text-[#9CA3AF]"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold tracking-tight ${isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-800 dark:text-slate-200"}`}>{title}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-extrabold ${isActive ? "bg-blue-105/20 text-blue-600 dark:text-blue-400 border border-blue-500/20" : "bg-slate-100 dark:bg-[#1F2937] text-slate-500 dark:text-[#9CA3AF]"}`}>{badgeText}</span>
                    </div>
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isActive ? "border-blue-500 bg-blue-500" : "border-slate-300 dark:border-slate-700"}`}>
                      {isActive && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                    </span>
                  </div>
                  
                  <span className="text-[10px] text-slate-500 dark:text-[#9CA3AF] leading-normal">{desc}</span>
                  
                  <div className="flex flex-col gap-1 border-t border-slate-100 dark:border-[#1F2937] pt-1.5">
                    <span className="text-[9px] text-slate-400 dark:text-[#9CA3AF] uppercase font-bold tracking-wider">Cocok untuk:</span>
                    <div className="grid grid-cols-2 gap-x-1 gap-y-0.5 mt-0.5">
                      {useCases.map((uc) => (
                        <span key={uc} className="text-[9.5px] text-slate-600 dark:text-[#9CA3AF] flex items-center gap-1 font-medium">
                          <span className="text-blue-500 dark:text-blue-400">✓</span> {uc}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <input
        id="pdf-file-selector"
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".pdf"
        className="hidden"
      />

      <div
        id="pdf-drop-zone"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={status === "idle" || status === "error" ? triggerFileSelect : undefined}
        className={`w-full min-h-[170px] flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 transition-all duration-300 text-center cursor-pointer ${
          isDragActive
            ? "border-blue-500 bg-blue-50/10 dark:bg-blue-950/10"
            : isProcessing
            ? "border-amber-400 bg-amber-50/10 cursor-not-allowed"
            : status === "success"
            ? "border-emerald-500 bg-emerald-50/10"
            : status === "error"
            ? "border-rose-400 bg-rose-50/10"
            : "border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 bg-white dark:bg-[#111827] hover:bg-slate-50/50 dark:hover:bg-slate-800/10"
        }`}
      >
        {status === "idle" && (
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 bg-slate-100 dark:bg-slate-850 rounded-full text-slate-600 dark:text-slate-400">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm md:text-base">
                Unggah Dokumen PDF
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[280px] mx-auto leading-relaxed">
                Tarik & lepas file PDF di sini, atau klik untuk memilih berkas dari komputer Anda
              </p>
              <div className="mt-3.5 flex flex-wrap justify-center gap-1.5 max-w-[280px] mx-auto">
                {["PDF Teks", "PDF Scan/SOP", "Gambar CAD", "Cetak Biru", "Technical Manual", "Kontrak"].map((docType) => (
                  <span key={docType} className="text-[9px] text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-[#0B0F19]/60 px-2 py-0.5 rounded border border-slate-200/40 dark:border-slate-800/60 font-medium">
                    {docType}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="flex flex-col items-center gap-4 w-full max-w-xs">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <div className="w-full text-center">
              <p className="font-bold text-slate-800 dark:text-slate-250 text-sm truncate max-w-full">
                {status === "parsing" && "Mengekstrak PDF..."}
                {status === "vision_ocr" && "Menganalisis Multimodal (Vision AI)..."}
                {status === "chunking" && "Menyusun Struktur Pengetahuan..."}
                {status === "indexing" && "Mengindeks Dokumen..."}
                {status === "embedding" && "Penyelarasan Pencarian Semantik..."}
                {status === "saving" && "Menyinkronkan Basis Data..."}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 min-h-[15px]">
                {status === "parsing" && `Membaca halaman demi halaman (${progress}%)`}
                {status === "vision_ocr" && `Mengulas tata letak & OCR halaman ${visionProcessProgress.current} dari ${visionProcessProgress.total}...`}
                {status === "chunking" && `Mengorganisasi ${chunkCount} bagian teks (${progress}%)`}
                {status === "indexing" && `Membangun index query pencarian (${progress}%)`}
                {status === "embedding" && `Memproses pencarian semantik (${progress}%)`}
                {status === "saving" && "Mempersiapkan sasis referensi teks..."}
              </p>
              {isReindexing && (
                <p className="text-amber-600 dark:text-amber-400 font-bold text-[10px] mt-2 animate-pulse bg-amber-50/50 dark:bg-amber-950/20 py-0.5 px-2.5 rounded-full border border-amber-100/50 dark:border-amber-900/30 inline-block">
                  Dokumen diproses ulang dan indeks lama diperbarui.
                </p>
              )}
            </div>
            
            {/* Multi-stage interactive progress bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 mt-1">
              <motion.div
                className={`h-full rounded-full ${
                  status === "parsing"
                    ? "bg-amber-500"
                    : status === "vision_ocr"
                    ? "bg-rose-500"
                    : status === "chunking"
                    ? "bg-blue-500"
                    : status === "indexing"
                    ? "bg-indigo-500"
                    : status === "embedding"
                    ? "bg-purple-500"
                    : "bg-emerald-500"
                }`}
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.15 }}
              />
            </div>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 font-mono">{progress}%</span>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-3 w-full">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-950/40 rounded-full text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-8 h-8 animate-bounce" />
            </div>
            <div className="max-w-[420px] px-2 w-full text-center">
              <p className="font-semibold text-emerald-800 dark:text-emerald-300 text-sm md:text-base">
                Sukses Memproses PDF!
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 truncate max-w-[280px] mx-auto font-medium">
                {fileName}
              </p>
              {isReindexing && (
                <div id="reindexed-success-banner" className="mt-2.5 p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30 rounded-lg text-[11px] font-bold leading-normal text-center max-w-[280px] mx-auto">
                  Dokumen diproses ulang dan indeks lama diperbarui.
                </div>
              )}
              {stats && (
                <div className="mt-3 p-3 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-200/40 dark:border-emerald-900/40 rounded-xl text-left text-xs text-emerald-850 dark:text-emerald-300 space-y-1">
                  <div className="flex justify-between py-0.5 border-b border-emerald-100/20 dark:border-emerald-900/20">
                    <span>Total Unit Pengetahuan:</span>
                    <span className="font-bold font-mono text-emerald-900 dark:text-emerald-200">{stats.totalChunks}</span>
                  </div>
                  {stats.multimodalPages !== undefined && (
                    <div className="flex justify-between py-0.5 border-b border-emerald-100/20 dark:border-emerald-900/20 text-indigo-950 dark:text-indigo-300 font-semibold bg-indigo-50/40 dark:bg-indigo-950/20 px-1.5 rounded border border-indigo-100/30 dark:border-indigo-900/30">
                      <span>Proses Multimodal (Vision):</span>
                      <span className="font-bold font-mono text-indigo-700 dark:text-indigo-400">{stats.multimodalPages} Halaman</span>
                    </div>
                  )}
                  <div className="flex justify-between py-0.5 border-b border-emerald-100/20 dark:border-emerald-900/20">
                    <span>Rujukan Pencarian Semantik:</span>
                    <span className="font-bold font-mono text-emerald-700 dark:text-emerald-400">Siap</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span>Bagian Dilewati (Murni Grafis/CAD):</span>
                    <span className="font-bold font-mono text-amber-605 dark:text-amber-400">{stats.skippedChunks}</span>
                  </div>
                </div>
              )}
              {transientAlert && (
                <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-xl text-[11px] text-amber-900 dark:text-amber-300 leading-relaxed text-left">
                  ⚠️ <strong>Info Optimalisasi:</strong> {transientAlert}
                </div>
              )}
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 bg-rose-100 dark:bg-rose-950/40 rounded-full text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <p className="font-semibold text-rose-800 dark:text-rose-350 text-sm md:text-base">
                Gagal Memproses File
              </p>
              <p className="text-xs text-rose-500 dark:text-rose-400 mt-1 max-w-[320px] mx-auto leading-relaxed">
                {errorMessage}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-semibold">
                Gunakan PDF murni teks (bukan hasil scan gambar/grafis murni)
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-start gap-1.5 mt-2.5 text-[10px] text-slate-400 dark:text-slate-500">
        <AlertCircle className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0 mt-0.5" />
        <span>Kini mendukung file besar (10MB-50MB+) & ratusan halaman secara asinkron tanpa mematikan browser.</span>
      </div>

      {latestFile && (
        <div id="vision-tester-panel" className="mt-4 p-4 bg-slate-50 dark:bg-slate-900/20 rounded-xl border border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">🔬 Ruang Uji Coba Vision AI</p>
            </div>
            <button
              id="btn-test-vision-p1"
              onClick={handleTestVisionPage1}
              disabled={visionLoading}
              className="px-3 py-1.5 bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {visionLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Menganalisis...
                </>
              ) : (
                "Uji Coba Halaman 1"
              )}
            </button>
          </div>
          
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2">
            Menguji pengiriman halaman 1 dari berkas <strong className="font-semibold">{latestFile.name}</strong> ke model Gemini Vision.
          </p>

          {visionError && (
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 text-rose-850 dark:text-rose-450 rounded-lg text-[10px] leading-relaxed">
              <strong>Error:</strong> {visionError}
            </div>
          )}

          {visionResponse && (
            <div className="mt-2 space-y-2.5">
              <div className="p-2.5 bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-800/40 rounded-lg space-y-1.5 text-[11px] text-indigo-955 dark:text-indigo-305">
                {visionResponse.modelUsed && (
                  <div className="flex justify-between items-center pb-1 border-b border-indigo-100/40 dark:border-indigo-800/20">
                    <span className="font-semibold text-slate-505 dark:text-slate-400">Model AI Terpilih:</span>
                    <span className="font-mono text-[9px] text-indigo-700 dark:text-indigo-455 bg-indigo-100/40 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-800 font-bold">{visionResponse.modelUsed}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pb-1 border-b border-indigo-100/40 dark:border-indigo-800/20">
                  <span className="font-semibold text-slate-505 dark:text-slate-400">Tipe Dokumen Terdeteksi:</span>
                  <span className="bg-indigo-100 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-400 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">{visionResponse.documentType}</span>
                </div>
                <div className="flex justify-between items-center pb-1 border-b border-indigo-100/40 dark:border-indigo-800/20">
                  <span className="font-semibold text-slate-505 dark:text-slate-400">Tingkat Keyakinan:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-450">{(visionResponse.confidence * 100).toFixed(0)}%</span>
                </div>
                
                {visionResponse.warnings && visionResponse.warnings.length > 0 && (
                  <div className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 rounded p-1.5 border border-amber-100 dark:border-amber-900/30 mt-1">
                    <strong>Catatan Pemrosesan:</strong> {visionResponse.warnings.join(", ")}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block">Akurasi Transkripsi Teks ({visionResponse.ocrText?.length || 0} karakter):</span>
                <pre className="max-h-24 overflow-y-auto bg-slate-900 dark:bg-slate-950 text-emerald-400 p-2 rounded-lg font-mono text-[10px] whitespace-pre-wrap leading-relaxed border border-slate-800/80">
                  {visionResponse.ocrText || "(Tidak ada teks terdeteksi)"}
                </pre>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block">Deskripsi Detail Dokumen / CAD:</span>
                <p className="max-h-24 overflow-y-auto bg-white dark:bg-[#111827] p-2 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] text-slate-650 dark:text-slate-400 leading-relaxed font-sans">
                  {visionResponse.visualDescription || "(Belum ada deskripsi)"}
                </p>
              </div>

              {visionResponse.structuralTables && visionResponse.structuralTables.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block">Tabel Terstruktur ({visionResponse.structuralTables.length} tabel):</span>
                  {visionResponse.structuralTables.map((tbl: string, index: number) => (
                    <pre key={index} className="max-h-24 overflow-x-auto bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg font-mono text-[9px] whitespace-pre border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                      {tbl}
                    </pre>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>

  );
}
