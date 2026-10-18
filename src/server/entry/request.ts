// HTTP の本文を読み、合言葉を確かめてから dispatcher に渡す。
// 本文は {"key": "<合言葉>", "method": "<API のメソッド名>", "input": {...}}。
// 合言葉は URL に載せず本文に入れる（URL はログに残りやすいため）。

import type { Envelope } from "../../shared/envelope";
import { UnauthorizedError, ValidationError } from "../../shared/errors";

/** 長さの違いと最初に食い違う位置で処理時間が変わらないように比べる */
const sameKey = (a: string, b: string): boolean => {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
};

export const createRequestHandler =
  (dispatch: (method: string, input: unknown) => Envelope, expectedKey: () => string | null) =>
  (body: string | undefined): Envelope => {
    let request: { key?: unknown; method?: unknown; input?: unknown };
    try {
      request = JSON.parse(body ?? "");
    } catch {
      return toEnvelope(new ValidationError("本文が JSON ではありません"));
    }
    const key = expectedKey();
    // 合言葉が未発行のうちは、誰の呼び出しも通さない
    if (!key || typeof request?.key !== "string" || !sameKey(request.key, key)) {
      return toEnvelope(new UnauthorizedError("合言葉が違います"));
    }
    if (typeof request.method !== "string") return toEnvelope(new ValidationError("method が必要です"));
    return dispatch(request.method, request.input);
  };

const toEnvelope = (e: UnauthorizedError | ValidationError): Envelope => ({
  ok: false,
  error: { code: e.code, message: e.message },
});
