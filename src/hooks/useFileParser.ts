import { useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export function useFileParser() {
  const extractFileText = useCallback(async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'txt' || ext === 'md') {
      return file.text();
    }

    if (ext === 'pdf') {
      const pdf = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text +=
          content.items
            .map((item) => ('str' in item ? item.str : ''))
            .join(' ') + '\n';
      }
      return text;
    }

    if (ext === 'docx') {
      const result = await mammoth.extractRawText({
        arrayBuffer: await file.arrayBuffer(),
      });
      return result.value;
    }

    throw new Error('Unsupported file format. Use .txt, .pdf, .docx, or .md');
  }, []);

  return { extractFileText };
}
