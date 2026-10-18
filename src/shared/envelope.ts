// 通信の区間だけで使う封筒。HTTP の応答は例外のクラスを運べないため、
// サーバーの入口で例外を封筒に詰め、呼び出し側でコードを見て扱いを分ける。
// アプリのコード（ユースケース）はこの型を直接扱わない。

import { type ErrorCode, toAppError } from "./errors";

export type Envelope<T = unknown> = { ok: true; data: T } | { ok: false; error: { code: ErrorCode; message: string } };

export const unwrap = <T>(envelope: Envelope<T>): T => {
  if (envelope.ok) return envelope.data;
  throw toAppError(envelope.error.code, envelope.error.message);
};
