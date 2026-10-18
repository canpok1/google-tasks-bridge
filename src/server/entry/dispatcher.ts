// メソッド名からユースケースへ振り分け、例外を通信用の封筒に詰め替える。
// 何を実行してどうなったかを GAS の実行ログに1行で残す。合言葉は request.ts で外れているのでここには来ない。

import type { Envelope } from "../../shared/envelope";
import { AppError, NotFoundError } from "../../shared/errors";
import type { UseCases } from "../application/useCases";

/** 一覧は件数だけ、1件ならその中身を出す */
const describeResult = (data: unknown): string =>
  Array.isArray(data) ? `${data.length} 件` : (JSON.stringify(data) ?? "なし");

export const createDispatcher =
  (useCases: UseCases) =>
  (method: string, input: unknown): Envelope => {
    const call = `${method} input=${JSON.stringify(input) ?? "なし"}`;
    try {
      // Object.prototype の toString なども引けてしまうので、ユースケース自身が持つメソッドだけを呼ぶ
      if (!Object.hasOwn(useCases, method)) {
        throw new NotFoundError(`unknown method: ${method}`);
      }
      // 入力は通信路から来るので型どおりとは限らない。形はユースケースが確かめる
      const handler = useCases[method as keyof UseCases] as (input: unknown) => unknown;
      const data = handler(input);
      console.log(`${call} -> 成功: ${describeResult(data)}`);
      return { ok: true, data };
    } catch (e) {
      if (e instanceof AppError) {
        console.warn(`${call} -> ${e.code}: ${e.message}`);
        return { ok: false, error: { code: e.code, message: e.message } };
      }
      console.error(`${call} -> INTERNAL`, e);
      return { ok: false, error: { code: "INTERNAL", message: "サーバーでエラーが発生しました" } };
    }
  };
