const OLLAMA_URL =
  process.env.OLLAMA_URL || "http://localhost:11434/api/chat";

const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "chat-bot";

const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS) || 60000;

// Maximum number of history messages (user + assistant pairs) to send for
// multi-turn context. Keeping this small avoids bloating the prompt.
const MAX_HISTORY_PAIRS = 5;

const SYSTEM_PROMPT =
  "You are a helpful assistant for a room and flat renting platform in Nepal. " +
  "You help users find rooms, understand rental processes, security deposits in NPR, " +
  "lease agreements, and platform features. Always give accurate and helpful answers.";

/**
 * Trim history to the last MAX_HISTORY_PAIRS user/assistant exchanges.
 * Expects each entry to be { role: "user"|"assistant", content: string }.
 */
const trimHistory = (history) => {
  if (!Array.isArray(history)) return [];
  // Only allow known roles; drop anything malformed
  const valid = history.filter(
    (m) =>
      m &&
      (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string"
  );
  // Keep only the last N pairs (2 messages per pair)
  return valid.slice(-(MAX_HISTORY_PAIRS * 2));
};

/**
 * POST /chat
 * Body: { message: string, history?: Array<{ role, content }> }
 * Response: { reply: string }
 */
const chat = async (req, res) => {
  const { message, history } = req.body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ message: "message is required" });
  }

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...trimHistory(history),
    { role: "user", content: message.trim() },
  ];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

  try {
    const response = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Ollama error:", response.status, errText);
      return res
        .status(502)
        .json({ message: "AI service error", detail: errText });
    }

    const data = await response.json();
    const reply = data?.message?.content;

    if (!reply) {
      return res.status(502).json({ message: "Empty response from AI model" });
    }

    return res.status(200).json({ reply });
  } catch (error) {
    if (error.name === "AbortError") {
      return res
        .status(504)
        .json({ message: "AI model timed out. Please try again." });
    }
    console.error("Chat controller error:", error);
    return res
      .status(503)
      .json({
        message:
          "AI service unavailable. Make sure Ollama is running (`ollama serve`).",
      });
  } finally {
    clearTimeout(timeoutId);
  }
};

module.exports = { chat };
