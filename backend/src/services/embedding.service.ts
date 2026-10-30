import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is missing from the backend .env file.");
}

const ai = new GoogleGenAI({ apiKey });

const EMBEDDING_MODEL = "gemini-embedding-001";

export type EmbeddingTask = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

export async function generateEmbedding(
  text: string,
  taskType: EmbeddingTask = "RETRIEVAL_QUERY",
): Promise<number[]> {
  const input = text.trim();

  if (!input) {
    throw new Error("Cannot generate an embedding for empty text.");
  }

  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: input,
    config: {
      taskType,
      outputDimensionality: 768,
    },
  });

  const embedding = response.embeddings?.[0]?.values;

  if (
    !embedding ||
    embedding.length !== 768 ||
    !embedding.every((value) => Number.isFinite(value))
  ) {
    throw new Error("Gemini returned an invalid embedding vector.");
  }

  return embedding;
}
