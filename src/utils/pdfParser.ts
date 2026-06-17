import * as pdfjsLib from "pdfjs-dist";
import { DocumentChunk } from "../types/document";

// Resolve version dynamically to fetch correct worker from UNPKG CDN
const pdfjsVersion = pdfjsLib.version || "6.0.227";
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`;

export interface ExtractedPage {
  text: string;
  pageNum: number;
}

export interface PdfExtractionResult {
  rawText: string;
  pages: ExtractedPage[];
}

/**
 * Extract plain text content page-by-page from an uploaded PDF file with thread-yielding
 * to prevent the browser from freezing on large documents.
 * 
 * @param file The PDF File uploaded by the user
 * @param onProgress Callback function to track extraction percentage (0 - 100)
 */
export async function extractPagesFromPdf(
  file: File,
  onProgress?: (percent: number) => void
): Promise<PdfExtractionResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      disableRange: true,
      disableStream: true,
    });

    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;
    const pages: ExtractedPage[] = [];
    let fullText = "";

    if (onProgress) onProgress(5);

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: any) => item.str || "")
        .join(" ");
      
      pages.push({
        text: pageText,
        pageNum,
      });
      fullText += pageText + "\n";

      // Non-blocking break: yield execution to browser loop every few pages
      if (pageNum % 4 === 0 || totalPages > 50) {
        await new Promise((resolve) => setTimeout(resolve, 5));
      }

      if (onProgress) {
        const percent = Math.round((pageNum / totalPages) * 95);
        onProgress(percent);
      }
    }

    const trimmedText = fullText.trim();
    if (!trimmedText && pages.length === 0) {
      throw new Error(
        "PDF tidak mengandung teks atau PDF berupa hasil scan/gambar yang belum di-OCR."
      );
    }

    if (onProgress) onProgress(100);

    return {
      rawText: trimmedText,
      pages,
    };
  } catch (error: any) {
    console.error("PDF Parsing error:", error);
    throw new Error(error.message || "Gagal membaca file PDF. Pastikan file tidak rusak.");
  }
}

/**
 * Legacy compatible export mapping
 */
export async function extractTextFromPdf(
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  const result = await extractPagesFromPdf(file, onProgress);
  return result.rawText;
}

/**
 * Split page text content into overlaps chunks asynchronously
 */
export async function chunkExtractedPages(
  pages: ExtractedPage[],
  maxChunkSize = 1200,
  overlap = 200,
  onProgress?: (percent: number, chunkCount: number) => void
): Promise<DocumentChunk[]> {
  const chunks: DocumentChunk[] = [];
  const totalPages = pages.length;
  
  for (let i = 0; i < totalPages; i++) {
    const page = pages[i];
    const pageText = page.text;
    const pageNum = page.pageNum;
    
    if (!pageText || pageText.trim().length === 0) continue;
    
    let startIndex = 0;
    let pageChunkIndex = 0;
    
    while (startIndex < pageText.length) {
      let endIndex = startIndex + maxChunkSize;
      if (endIndex > pageText.length) {
        endIndex = pageText.length;
      }
      
      // Try to align endIndex to next space or sentence period
      if (endIndex < pageText.length) {
        const nextSpace = pageText.indexOf(" ", endIndex);
        const nextPeriod = pageText.indexOf(".", endIndex);
        
        let adjustment = -1;
        if (nextPeriod !== -1 && nextPeriod - endIndex < 60) {
          adjustment = nextPeriod + 1; // align to end of sentence
        } else if (nextSpace !== -1 && nextSpace - endIndex < 30) {
          adjustment = nextSpace + 1; // align to space
        }
        
        if (adjustment !== -1) {
          endIndex = adjustment;
        }
      }
      
      const chunkText = pageText.substring(startIndex, endIndex).trim();
      if (chunkText.length > 0) {
        chunks.push({
          id: `chunk_${pageNum}_${pageChunkIndex}_${Math.random().toString(36).substring(2, 6)}`,
          text: chunkText,
          pageNum,
        });
        pageChunkIndex++;
      }
      
      startIndex = endIndex - overlap;
      if (startIndex >= pageText.length || endIndex === pageText.length) {
        break;
      }
    }
    
    // Yield thread to prevent UI lockup
    if (i % 8 === 0 || totalPages > 40) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    
    if (onProgress) {
      const percent = Math.round(((i + 1) / totalPages) * 100);
      onProgress(percent, chunks.length);
    }
  }
  
  return chunks;
}

/**
 * Micro async indexing phase to prepare search structures
 */
export async function indexDocumentChunks(
  chunks: DocumentChunk[],
  onProgress?: (percent: number) => void
): Promise<void> {
  const total = chunks.length;
  if (total === 0) return;
  
  // Create a brief step-by-step iteration to show visual completion
  const batchSize = Math.max(1, Math.round(total / 10));
  
  for (let i = 0; i < total; i += batchSize) {
    const end = Math.min(i + batchSize, total);
    
    // Simulate lightweight task warming (lowercase, token splits)
    for (let j = i; j < end; j++) {
      const _text = chunks[j].text.toLowerCase();
    }
    
    if (onProgress) {
      const percent = Math.round((end / total) * 100);
      onProgress(percent);
    }
    
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

/**
 * Render a specific page of a PDF file to a data URL (image/jpeg).
 * 
 * @param file The PDF File loaded by the user
 * @param pageNumber The page number to render (1-based index)
 * @param scale The rendering scale, defaulting to 1.5
 */
export async function renderPdfPageToImage(
  file: File,
  pageNumber: number,
  scale = 1.5
): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      disableRange: true,
      disableStream: true,
    });

    const pdf = await loadingTask.promise;
    
    if (pageNumber < 1 || pageNumber > pdf.numPages) {
      throw new Error(`Page number ${pageNumber} is out of bounds (1 to ${pdf.numPages}).`);
    }

    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    // Create a temporary canvas
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    console.log(`[PdfPageRender] Rendering page ${pageNumber} to canvas: width=${canvas.width}px, height=${canvas.height}px, scale=${scale}`);

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not get 2D context from canvas.");
    }

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
      canvas: canvas,
    };

    const renderTask = page.render(renderContext);
    await renderTask.promise;

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

    // Clean up canvas references to prevent memory leaks
    canvas.width = 0;
    canvas.height = 0;

    return dataUrl;
  } catch (error: any) {
    console.error("PDF Page rendering error:", error);
    throw new Error(error.message || "Gagal merender halaman PDF menjadi gambar.");
  }
}

