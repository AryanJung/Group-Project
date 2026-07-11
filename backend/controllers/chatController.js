const Room = require("../models/Room");

const OLLAMA_URL =
  process.env.OLLAMA_URL || "http://localhost:11434/api/generate";

const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "final-chat-bot";

const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS) || 60000;

// Low temperature keeps the fine-tuned model's answers consistent and makes
// it far more likely to follow the "don't invent facts" system instructions
// instead of improvising plausible-sounding but fabricated room details.
const OLLAMA_TEMPERATURE = Number(process.env.OLLAMA_TEMPERATURE) || 0.2;

// Maximum number of history messages (user + assistant pairs) to send for
// multi-turn context. Keeping this small avoids bloating the prompt.
const MAX_HISTORY_PAIRS = 5;

// Max number of matching listings to pull from the DB and show per search.
const MAX_LISTINGS = 5;

// When an exact-price search finds nothing, widen to this band around the
// requested price (e.g. 12000 → 10800–13200) so "costing exactly 12k" still
// surfaces close matches instead of a bare "no results".
const PRICE_TOLERANCE = 0.1;

// Fields pulled for each listing: enough for the comparison table (price,
// location, beds, baths, area) plus description/features/rating so the model
// can write a richer comparison.
const LISTING_FIELDS =
  "title description features rating price location bedrooms bathrooms images image area maxRenters";

const SYSTEM_PROMPT =
  "You are a helpful assistant for a room and flat renting platform in Nepal. " +
  "You help users find rooms, understand rental processes, and platform features. " +
  "This platform does not charge or track security deposits — if asked about a " +
  "deposit, say deposits are not part of this platform rather than stating an amount. " +
  "Never state a specific price, deposit, or room detail unless it was given to you " +
  "directly in this conversation's context. Always give accurate and helpful answers.";

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
 * Build a single prompt string from conversation history.
 * The fine-tuned model uses the /api/generate endpoint (not /api/chat)
 * because its Modelfile template handles system + single user turn.
 * For multi-turn context we prepend prior exchanges into the prompt.
 * contextBlock (if any) is appended to the current turn so the model is
 * grounded on real listings pulled from the database.
 */
const buildPrompt = (history, currentMessage, contextBlock = "") => {
  const trimmed = trimHistory(history);
  const currentTurn = contextBlock
    ? `${currentMessage}${contextBlock}`
    : currentMessage;

  if (trimmed.length === 0) return currentTurn;

  // Format prior turns so the model sees the conversation context
  const contextLines = trimmed.map((m) => {
    const label = m.role === "user" ? "User" : "Assistant";
    return `${label}: ${m.content}`;
  });

  contextLines.push(`User: ${currentTurn}`);
  return contextLines.join("\n");
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const AMOUNT_MULTIPLIERS = { k: 1000, thousand: 1000, lakh: 100000, lac: 100000 };

const toAmount = (numStr, suffix) => {
  const n = parseFloat(numStr.replace(/,/g, ""));
  if (Number.isNaN(n)) return null;
  const mult = AMOUNT_MULTIPLIERS[(suffix || "").toLowerCase()];
  return mult ? n * mult : n;
};

const AMOUNT_PATTERN = "(?:rs\\.?|npr)?\\s*([\\d,]+(?:\\.\\d+)?)\\s*(k|thousand|lakh|lac)?";

const extractPrice = (message, verbsPattern) => {
  const re = new RegExp(`${verbsPattern}\\s*${AMOUNT_PATTERN}`, "i");
  const match = message.match(re);
  if (!match) return null;
  return toAmount(match[1], match[2]);
};

/**
 * Pull search filters (price range, bedrooms, location) straight out of the
 * user's free-text message using regex/keyword heuristics. This is a
 * lightweight, deterministic alternative to relying on the fine-tuned model
 * to emit structured output — the model was trained on plain Q&A text, not
 * function calls, so it can't reliably request a DB search itself.
 */
const extractSearchFilters = (message) => {
  const maxPrice = extractPrice(
    message,
    "(?:under|below|less than|not more than|max(?:imum)?|up ?to|within|cheaper than)"
  );
  const minPrice = extractPrice(
    message,
    "(?:above|over|more than|at least|min(?:imum)?|starting from)"
  );

  // Exact/approx price, e.g. "costing exactly 12k", "priced at 8000",
  // "around 15000". Only meaningful when the user didn't give a range, so we
  // skip it if a min/max was already captured. The search then tries an exact
  // price match first and falls back to a ±10% band (see chat()).
  const exactPrice =
    maxPrice == null && minPrice == null
      ? extractPrice(
          message,
          "(?:exactly|cost(?:s|ing)?|priced at|price of|equal to|around|about|roughly|approx(?:imately)?|=|@)"
        )
      : null;

  const bedroomMatch = message.match(/(\d+)\s*[- ]?(?:bhk|bed ?rooms?|beds?)/i);
  const bedrooms = bedroomMatch ? parseInt(bedroomMatch[1], 10) : null;

  const locationMatch = message.match(
    /\b(?:near|in|at|around|close to)\s+([a-zA-Z][a-zA-Z\s]{1,30}?)(?=$|[,.!?]|\s+(?:under|below|less|more|above|over|for|with|area|within|up ?to))/i
  );
  const location = locationMatch ? locationMatch[1].trim() : null;

  const hasListingKeyword =
    /\b(room|rooms|flat|flats|apartment|apartments|house|houses|listing|listings|propert(?:y|ies))\b/i.test(
      message
    );
  // Deliberately narrow: generic words like "need"/"want"/"have"/"any" show
  // up constantly in ordinary rental Q&A ("what documents do I need to rent
  // a room?") and caused false-positive searches when included here.
  const hasIntentVerb =
    /\b(find|search|show me|look(?:ing)? for|recommend|suggest|browse|list|get me)\b/i.test(
      message
    );

  const hasFilters = Boolean(
    maxPrice || minPrice || exactPrice || location || bedrooms
  );
  const shouldSearch = hasFilters || (hasListingKeyword && hasIntentVerb);

  return { maxPrice, minPrice, exactPrice, bedrooms, location, shouldSearch };
};

const buildRoomQuery = (filters) => {
  const query = { isRented: { $ne: true } };

  if (filters.maxPrice != null || filters.minPrice != null) {
    query.price = {};
    if (filters.maxPrice != null) query.price.$lte = filters.maxPrice;
    if (filters.minPrice != null) query.price.$gte = filters.minPrice;
  } else if (filters.exactPrice != null) {
    query.price = filters.exactPrice;
  }

  if (filters.location) {
    query.location = { $regex: escapeRegex(filters.location), $options: "i" };
  }

  if (filters.bedrooms != null) {
    query.bedrooms = filters.bedrooms;
  }

  return query;
};

/**
 * Build a short, factual note to append to the prompt so the model grounds
 * its reply in real listings instead of inventing them. Note: this model
 * has been observed to still fabricate details (deposits, amenities) despite
 * this instruction — accepted tradeoff while the model is being iterated on.
 */
const buildListingsContext = (listings, searched) => {
  if (!searched) return "";

  if (listings.length === 0) {
    return (
      "\n\n[System note: The property database was searched for this request " +
      "and no matching listings were found. Tell the user no matches were " +
      "found and suggest they broaden their search.]"
    );
  }

  // Feed the model every available fact per listing so it can write a rich,
  // human-friendly comparison that goes beyond the table (which only shows
  // price/location/bedrooms/bathrooms/area). Descriptions, features and
  // ratings live only in this prompt block, so the reply can reference them.
  const blocks = listings.map((r, i) => {
    const facts = [`Price: Rs ${r.price}/mo`, `Location: ${r.location}`];
    if (r.bedrooms != null) facts.push(`Bedrooms: ${r.bedrooms}`);
    if (r.bathrooms != null) facts.push(`Bathrooms: ${r.bathrooms}`);
    if (r.area) facts.push(`Area: ${r.area}`);
    if (r.maxRenters > 1) facts.push(`Accepts up to ${r.maxRenters} renters`);
    if (r.rating > 0) facts.push(`Rating: ${r.rating}/5`);
    if (Array.isArray(r.features) && r.features.length) {
      facts.push(`Features: ${r.features.join(", ")}`);
    }
    if (r.description && r.description.trim()) {
      facts.push(`Description: ${r.description.trim()}`);
    }
    return `Listing ${i + 1}: ${r.title}\n  - ${facts.join("\n  - ")}`;
  });

  const instruction =
    listings.length > 1
      ? "Here are real listings from the property database matching this " +
        "request. A comparison table is already shown to the user, so do " +
        "NOT just repeat the numbers. Instead, write a descriptive, " +
        "human-friendly comparison in plain language: for each listing " +
        "highlight what it offers and what it lacks (e.g. 'Listing 1 has " +
        "X and Y but no Z'), draw on the descriptions, features and " +
        "ratings — not only the table columns — and finish with a clear " +
        "recommendation that depends on the user's priority (e.g. 'if " +
        "your priority is budget, choose ...; if you want the most space, " +
        "choose ...'). Base every claim ONLY on the facts below — do not " +
        "invent a deposit, amenity, or any detail not listed, and do not " +
        "invent other listings."
      : "Here is a real listing from the property database matching this " +
        "request. Describe it naturally in plain language, drawing on its " +
        "description and features as well as the basic facts. Only mention " +
        "details that appear below — do not invent a deposit amount or any " +
        "other detail, and do not invent other listings.";

  return `\n\n[System note: ${instruction}]\n${blocks.join("\n\n")}`;
};

/**
 * When the AI model is unreachable/erroring but we already found matching
 * listings in the DB, still return them with a canned reply instead of a
 * hard error — a broken/offline model shouldn't hide real search results.
 */
const buildFallbackReply = (listings) => {
  if (listings.length === 0) {
    return "I couldn't reach the AI assistant right now, and no matching listings were found either. Please try again in a moment.";
  }
  const noun = listings.length === 1 ? "listing" : "listings";
  return `The AI assistant is offline right now, but I found ${listings.length} ${noun} matching your search:`;
};

/**
 * POST /chat
 * Body: { message: string, history?: Array<{ role, content }> }
 * Response: { reply: string, listings: Array<Room> }
 */
const chat = async (req, res) => {
  const { message, history } = req.body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ message: "message is required" });
  }

  const trimmedMessage = message.trim();
  const filters = extractSearchFilters(trimmedMessage);

  let listings = [];
  if (filters.shouldSearch) {
    try {
      listings = await Room.find(buildRoomQuery(filters))
        .sort({ price: 1 })
        .limit(MAX_LISTINGS)
        .select(LISTING_FIELDS);

      // Exact-price request found nothing → retry within a ±10% band so a
      // close listing still shows up instead of an empty result.
      if (listings.length === 0 && filters.exactPrice != null) {
        const lo = Math.round(filters.exactPrice * (1 - PRICE_TOLERANCE));
        const hi = Math.round(filters.exactPrice * (1 + PRICE_TOLERANCE));
        listings = await Room.find(
          buildRoomQuery({ ...filters, exactPrice: null, minPrice: lo, maxPrice: hi })
        )
          .sort({ price: 1 })
          .limit(MAX_LISTINGS)
          .select(LISTING_FIELDS);
      }
    } catch (dbErr) {
      console.error("Room search error:", dbErr);
    }
  }

  const contextBlock = buildListingsContext(listings, filters.shouldSearch);
  const prompt = buildPrompt(history, trimmedMessage, contextBlock);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

  try {
    const response = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        system: SYSTEM_PROMPT,
        stream: false,
        options: { temperature: OLLAMA_TEMPERATURE },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Ollama error:", response.status, errText);
      if (filters.shouldSearch) {
        return res
          .status(200)
          .json({ reply: buildFallbackReply(listings), listings });
      }
      return res
        .status(502)
        .json({ message: "AI service error", detail: errText });
    }

    const data = await response.json();
    const reply = data?.response;

    if (!reply) {
      if (filters.shouldSearch) {
        return res
          .status(200)
          .json({ reply: buildFallbackReply(listings), listings });
      }
      return res.status(502).json({ message: "Empty response from AI model" });
    }

    return res.status(200).json({ reply, listings });
  } catch (error) {
    if (filters.shouldSearch) {
      return res
        .status(200)
        .json({ reply: buildFallbackReply(listings), listings });
    }
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
