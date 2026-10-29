const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const EMBEDDING_MODEL = "nomic-embed-text";

export async function generateEmbedding(text: string): Promise<number[]> {
  const input = text.trim();

  if (!input) {
    throw new Error("Cannot generate an embedding for empty text.");
  }

  const response = await fetch(`${OLLAMA_BASE_URL}/api/embed`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Ollama embedding request failed (${response.status}): ${errorText.slice(0, 300)}`,
    );
  }

  const data = (await response.json()) as {
    embeddings?: number[][];
  };

  const embedding = data.embeddings?.[0];

  if (
    !embedding ||
    embedding.length === 0 ||
    !embedding.every((value) => Number.isFinite(value))
  ) {
    throw new Error("Ollama returned an invalid embedding vector.");
  }

  return embedding;
}
