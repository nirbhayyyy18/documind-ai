import { PDFParse } from "pdf-parse";

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export async function extractPdfPages(
  fileBuffer: Buffer
): Promise<ExtractedPage[]> {
  const parser = new PDFParse({
    data: new Uint8Array(fileBuffer),
  });

  try {
    const result = await parser.getText();

    return result.pages.map((page) => ({
      pageNumber: page.num,
      text: page.text.trim(),
    }));
  } finally {
    await parser.destroy();
  }
}