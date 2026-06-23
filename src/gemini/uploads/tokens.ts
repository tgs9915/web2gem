import { extractGeminiAppPageTokens, type GeminiAppPageTokens } from "../app-page";
import { GEMINI_WEB_USER_AGENT } from "../constants";
import { httpFetch } from "../transport";
import type { RuntimeConfig } from "../../config";
import { configWithFreshGeminiCookie } from "../cookies";

type PageTokens = GeminiAppPageTokens;
type PageTokenCache = { key: string; tokens: PageTokens | null; ts: number };
type PageTokenPending = { key: string; promise: Promise<PageTokens> | null };

export const GEMINI_UPLOAD_USER_AGENT = GEMINI_WEB_USER_AGENT;
export let _pageTokens: PageTokenCache = { key: "", tokens: null, ts: 0 };
export let _pageTokensPending: PageTokenPending = { key: "", promise: null };

export function resetGeminiUploadCachesForTest(): void {
  _pageTokens = { key: "", tokens: null, ts: 0 };
  _pageTokensPending = { key: "", promise: null };
}

export async function getPageTokens(cfg: RuntimeConfig): Promise<PageTokens> {
  const activeCfg = await configWithFreshGeminiCookie(cfg);
  return getPageTokensForConfig(activeCfg);
}

export async function getPageTokensForConfig(activeCfg: RuntimeConfig): Promise<PageTokens> {
  const now = Date.now();
  const cacheKey = `${activeCfg.gemini_origin || "https://gemini.google.com"}\x00${activeCfg.cookie || ""}`;
  if (_pageTokens.tokens && _pageTokens.key === cacheKey && now - _pageTokens.ts < 600000) return _pageTokens.tokens;
  if (_pageTokensPending.promise && _pageTokensPending.key === cacheKey) return _pageTokensPending.promise;
  const promise = (async () => {
    const headers: Record<string, string> = {
      "User-Agent": GEMINI_UPLOAD_USER_AGENT,
      "Accept-Language": "en-US,en;q=0.9",
    };
    if (activeCfg.cookie) headers["Cookie"] = activeCfg.cookie;
    const tokens: PageTokens = {};
    try {
      const resp = await httpFetch(`${activeCfg.gemini_origin || "https://gemini.google.com"}/app`, {
        headers,
        timeoutMs: 30000,
        socket: activeCfg.upstream_socket,
        cfg: activeCfg,
      });
      Object.assign(tokens, await extractGeminiAppPageTokens(resp));
    } catch (_) {
      // Anonymous /app access can still provide enough defaults for upload.
    }
    _pageTokens = { key: cacheKey, tokens, ts: now };
    return tokens;
  })();
  _pageTokensPending = { key: cacheKey, promise };
  try {
    return await promise;
  } finally {
    if (_pageTokensPending.promise === promise) _pageTokensPending = { key: "", promise: null };
  }
}
