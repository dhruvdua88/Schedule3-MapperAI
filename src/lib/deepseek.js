// ============ DEEPSEEK API WRAPPER ============
//
// OpenAI-compatible endpoint at api.deepseek.com.
// Ref: https://api-docs.deepseek.com/
//
// NOTE: model strings 'deepseek-v4-pro' and 'deepseek-v4-flash' are used
// as specified in the build brief. If DeepSeek publishes these models under
// different names (e.g. 'deepseek-chat', 'deepseek-reasoner'), update the
// DEFAULT_MODEL constant below and the Settings panel options accordingly.

const BASE_URL      = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-v4-pro';
const TIMEOUT_MS    = 120_000; // 120 s — abort if DeepSeek doesn't respond

// ---- Custom error classes ----
export class AuthError extends Error {
  constructor(msg) { super(msg); this.name = 'AuthError'; }
}
export class RateLimitError extends Error {
  constructor(msg) { super(msg); this.name = 'RateLimitError'; }
}
export class ApiError extends Error {
  constructor(msg, status) { super(msg); this.name = 'ApiError'; this.status = status; }
}

// ============================================================
// In-memory response cache
// ------------------------------------------------------------
// Keyed by hash of (model + temperature + top_p + systemPrompt + userPrompt).
// Module-scoped Map — survives across renders in the same session, cleared
// on page reload. Skipped for streaming calls (caller wants live feedback).
// ============================================================
const _responseCache = new Map();

async function hashKey({ model, temperature, top_p, systemPrompt, userPrompt }) {
  const enc = new TextEncoder();
  const payload = enc.encode(
    `${model}|${temperature}|${top_p}|${systemPrompt}|${userPrompt}`
  );
  if (globalThis.crypto?.subtle) {
    const buf = await globalThis.crypto.subtle.digest('SHA-256', payload);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback (non-crypto contexts): cheap djb2-ish hash
  let h = 5381;
  for (let i = 0; i < payload.length; i++) h = ((h << 5) + h + payload[i]) | 0;
  return 'fallback:' + (h >>> 0).toString(16);
}

export function clearDeepSeekCache() {
  _responseCache.clear();
}

// ============================================================
// Retry helper
// ------------------------------------------------------------
// Retries on 429 and 5xx with exponential backoff + jitter.
// Does NOT retry: auth (401/403), credit (402), bad request (400),
// aborts, or already-parsed JSON errors. Streaming calls retry too,
// but only on connection-level / pre-stream failures.
// ============================================================
const RETRY_BASE_MS = 1_000;
const RETRY_MAX_ATTEMPTS = 3;

function isRetryable(err) {
  if (err?.name === 'AbortError')   return false;
  if (err instanceof AuthError)     return false;
  if (err instanceof RateLimitError) return true;
  if (err instanceof ApiError && typeof err.status === 'number') {
    return err.status === 429 || (err.status >= 500 && err.status < 600);
  }
  // Network errors (TypeError) — retry once
  if (err instanceof TypeError) return true;
  return false;
}

function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    if (signal) {
      const onAbort = () => { clearTimeout(t); reject(new DOMException('Aborted', 'AbortError')); };
      if (signal.aborted) onAbort();
      else signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

/**
 * Call the DeepSeek chat completions endpoint.
 *
 * @param {object} opts
 * @param {string}   opts.apiKey       - Bearer token
 * @param {string}   [opts.model]      - Model string (default: deepseek-v4-pro)
 * @param {string}   opts.systemPrompt - System instruction
 * @param {string}   opts.userPrompt   - User message (contains markdown + prompt)
 * @param {AbortSignal} [opts.signal]  - AbortController signal for cancellation
 * @param {function} [opts.onUsage]    - Called with {input_tokens, output_tokens} after response
 * @param {function} [opts.onFirstToken] - Called once when the first content chunk arrives.
 *                                         ONLY fires when `stream: true` is also set. Ignored
 *                                         otherwise (default path is non-streaming).
 * @param {boolean}  [opts.stream]     - Explicitly opt into SSE streaming. Default false.
 *                                         (Streaming + json_object on DeepSeek is fiddly — keep
 *                                          it off unless you've tested the specific model + endpoint.)
 * @param {number}   [opts.temperature] - Sampling temperature (default: 0.0).
 * @param {number}   [opts.top_p]      - Nucleus sampling cutoff (default: 0.1).
 * @param {boolean}  [opts.bypassCache] - Skip cache lookup and store (default: false).
 * @returns {Promise<object>}          - Parsed JSON object from model response
 */
export async function callDeepSeek({
  apiKey,
  model = DEFAULT_MODEL,
  systemPrompt,
  userPrompt,
  signal,
  onUsage,
  onFirstToken,
  stream      = false,
  temperature = 0.0,
  top_p       = 0.1,
  bypassCache = false,
}) {
  if (!apiKey) throw new AuthError('No API key provided. Please add your DeepSeek API key in Settings.');

  // Streaming is now explicit-opt-in. onFirstToken alone no longer triggers it.
  const useStreaming = !!stream;

  // ── Cache check (non-streaming only; streaming consumers want live feedback) ──
  let cacheKey = null;
  if (!useStreaming && !bypassCache) {
    try {
      cacheKey = await hashKey({ model, temperature, top_p, systemPrompt, userPrompt });
      if (_responseCache.has(cacheKey)) {
        const cached = _responseCache.get(cacheKey);
        if (onUsage && cached._usage) onUsage(cached._usage);
        // Deep-clone so the caller can mutate freely.
        return JSON.parse(JSON.stringify(cached.value));
      }
    } catch { /* hashing failure shouldn't break the call */ }
  }

  // ── Retry loop ──
  let lastErr;
  for (let attempt = 1; attempt <= RETRY_MAX_ATTEMPTS; attempt++) {
    try {
      const result = await _doCall({
        apiKey, model, systemPrompt, userPrompt, signal,
        onUsage: (u) => {
          if (cacheKey) {
            // Stash usage on the cached entry once it's written.
            const entry = _responseCache.get(cacheKey);
            if (entry) entry._usage = u;
          }
          if (onUsage) onUsage(u);
        },
        onFirstToken, temperature, top_p, useStreaming,
      });

      // Stash in cache on success.
      if (cacheKey) {
        _responseCache.set(cacheKey, { value: result, _usage: null });
      }
      return result;
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || attempt === RETRY_MAX_ATTEMPTS) throw err;
      // Backoff with jitter: 1s, 2s, 4s ± 30%
      const base = RETRY_BASE_MS * Math.pow(2, attempt - 1);
      const jitter = base * (0.7 + Math.random() * 0.6);
      // eslint-disable-next-line no-console
      console.warn(`[deepseek] retry ${attempt}/${RETRY_MAX_ATTEMPTS - 1} after ${Math.round(jitter)}ms — ${err.message}`);
      await delay(jitter, signal);
    }
  }
  throw lastErr;
}

// ============================================================
// Internal — single attempt at the API call
// ============================================================
async function _doCall({
  apiKey, model, systemPrompt, userPrompt, signal,
  onUsage, onFirstToken, temperature, top_p, useStreaming,
}) {
  let response;
  try {
    response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      signal,
      headers: {
        'Authorization':  `Bearer ${apiKey}`,
        'Content-Type':   'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature,
        top_p,
        max_tokens:   16000,
        stream:       useStreaming,
        ...(useStreaming ? { stream_options: { include_usage: true } } : {}),
      }),
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(`Network error: ${err.message}. Check your internet connection.`);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    if (response.status === 401 || response.status === 403) {
      throw new AuthError(
        `Invalid or expired API key (HTTP ${response.status}). ` +
        `Please check your DeepSeek API key in Settings.`
      );
    }
    if (response.status === 429) {
      throw new RateLimitError(
        `DeepSeek rate limit reached. Please wait a moment and try again.`
      );
    }
    if (response.status === 402) {
      throw new ApiError(
        `Insufficient DeepSeek credits. Please top up your account at platform.deepseek.com.`,
        402
      );
    }
    throw new ApiError(
      `DeepSeek API error ${response.status}: ${errText.slice(0, 200)}`,
      response.status
    );
  }

  // ── Streaming path: read SSE chunks, fire onFirstToken on first content delta,
  //    accumulate the full JSON, then parse at the end. ──
  let content;
  if (useStreaming) {
    if (!response.body || !response.body.getReader) {
      throw new ApiError('Streaming not supported in this environment.');
    }
    const reader  = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let firstTokenFired = false;
    let accumulated = '';
    let usage = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by double-newline; each frame is a "data:" line.
      const frames = buffer.split('\n\n');
      buffer = frames.pop() || '';
      for (const frame of frames) {
        const line = frame.trim();
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') continue;
        try {
          const j = JSON.parse(payload);
          const delta = j.choices?.[0]?.delta?.content;
          if (delta) {
            accumulated += delta;
            if (!firstTokenFired) {
              firstTokenFired = true;
              try { onFirstToken(); } catch { /* user callback errors must not break stream */ }
            }
          }
          if (j.usage) usage = j.usage;
        } catch {
          // skip malformed frame
        }
      }
    }
    content = accumulated;
    if (onUsage && usage) {
      onUsage({
        input_tokens:  usage.prompt_tokens    || 0,
        output_tokens: usage.completion_tokens || 0,
      });
    }
  } else {
    const data = await response.json();

    // Report token usage to caller
    if (onUsage && data.usage) {
      onUsage({
        input_tokens:  data.usage.prompt_tokens    || 0,
        output_tokens: data.usage.completion_tokens || 0,
      });
    }

    content = data.choices?.[0]?.message?.content;

    // When content is empty, log the full response to console so we can debug
    // edge cases (content filter / refusal / odd model names / etc.).
    if (!content) {
      const finishReason = data.choices?.[0]?.finish_reason;
      const refusal      = data.choices?.[0]?.message?.refusal;
      // eslint-disable-next-line no-console
      console.error('[deepseek] empty content in response:', {
        finishReason,
        refusal,
        model:  data.model,
        usage:  data.usage,
        firstChoice: data.choices?.[0],
      });
      if (refusal) {
        throw new ApiError(`Model refused to answer: ${String(refusal).slice(0, 200)}`);
      }
      if (finishReason === 'content_filter') {
        throw new ApiError('DeepSeek content filter blocked the response. Try a different document or contact DeepSeek support.');
      }
      if (finishReason === 'length') {
        throw new ApiError('Response was truncated before any content was emitted. The prompt may be too long. Try the flash model or reduce the PDF size.');
      }
    }
  }

  if (!content) {
    throw new ApiError(
      'Empty response from DeepSeek API. ' +
      'See the browser console for the raw response payload — common causes are an invalid model name (verify deepseek-v4-pro / deepseek-v4-flash exist on your DeepSeek plan), or a temporary upstream issue (auto-retry should have kicked in for 5xx errors).'
    );
  }

  // response_format: json_object should guarantee valid JSON, but handle edge cases
  try {
    return JSON.parse(content);
  } catch {
    // Strip markdown code fences if present
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* fall through */ }
    }
    throw new ApiError(
      'Could not parse JSON from DeepSeek response. The model may have returned malformed output.'
    );
  }
}
