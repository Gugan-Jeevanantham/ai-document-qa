const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const UPLOAD_TIMEOUT_MS = 60000;   // cold-start ku 60 sec allow pannu
const ASK_TIMEOUT_MS = 20000;      // first-byte varaikkum wait pannura time

function friendlyNetworkError() {
  return new Error("Connection issue — please check your network and try again.");
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // agar caller already oru external signal (stop button) kudutha, adha kooda link pannu
  if (options.signal) {
    options.signal.addEventListener("abort", () => controller.abort());
  }

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err.name === "AbortError" && !options.signal?.aborted) {
      // idhu namma timeout tha abort pannuchu, user stop button illa
      throw friendlyNetworkError();
    }
    throw err; // user-initiated abort ah irundha, appadiye propagate pannu
  } finally {
    clearTimeout(timer);
  }
}

export async function mockUploadPdf(file) {
  const formData = new FormData();
  formData.append("file", file);

  let response;
  try {
    response = await fetchWithTimeout(`${BASE_URL}/upload`, {
      method: "POST",
      body: formData,
    }, UPLOAD_TIMEOUT_MS);
  } catch (err) {
    throw friendlyNetworkError();
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Upload failed.");
  }

  return data;
}

export async function askGeminiStream(documentId, question, onChunk, signal) {
  let response;
  try {
    response = await fetchWithTimeout(`${BASE_URL}/ask-stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId, question }),
      signal,
    }, ASK_TIMEOUT_MS);
  } catch (err) {
    if (err.name === "AbortError" && signal?.aborted) throw err; // user stop button
    throw friendlyNetworkError();
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "The AI could not respond.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (payload === "[DONE]") continue;

        try {
          const parsed = JSON.parse(payload);
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.delta) {
            fullText += parsed.delta;
            onChunk(fullText);
          }
        } catch (e) {
          if (e.message && e.message !== "Unexpected end of JSON input") {
            throw e;
          }
        }
      }
    }
  } catch (err) {
    if (err.name === "AbortError") throw err; // user stop button — pass through as-is
    throw friendlyNetworkError(); // mid-stream connection drop
  }

  return fullText;
}
