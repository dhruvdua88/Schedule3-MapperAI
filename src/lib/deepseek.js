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
 *                                         If provided, the call switches to streaming mode (SSE).
 *                                         The final parsed JSON is still returned from the promise.
 * @param {number}   [opts.temperature] - Sampling temperature (default: 0.2). SCH3 uses 0.1.
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
  temperature = 0.2,
}) {
  if (!apiKey) throw new AuthError('No API key provided. Please add your DeepSeek API key in Settings.');

  const useStreaming = typeof onFirstToken === 'function';

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
  }

  if (!content) throw new ApiError('Empty response from DeepSeek API');

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
