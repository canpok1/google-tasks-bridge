// メソッド名からユースケースへ振り分け、例外を通信用の封筒に詰め替える。

import type { Envelope } from "../../shared/envelope";
import { AppError, NotFoundError } from "../../shared/errors";
import type { UseCases } from "../application/useCases";

export const createDispatcher =
  (useCases: UseCases) =>
  (method: string, input: unknown): Envelope => {
    try {
      // Object.prototype の toString なども引けてしまうので、ユースケース自身が持つメソッドだけを呼ぶ
      if (!Object.hasOwn(useCases, method)) {
        throw new NotFoundError(`unknown method: ${method}`);
      }
      // 入力は通信路から来るので型どおりとは限らない。形はユースケースが確かめる
      const handler = useCases[method as keyof UseCases] as (input: unknown) => unknown;
      return { ok: true, data: handler(input) };
    } catch (e) {
      if (e instanceof AppError) return { ok: false, error: { code: e.code, message: e.message } };
      console.error(e);
      return { ok: false, error: { code: "INTERNAL", message: "サーバーでエラーが発生しました" } };
    }
  };
