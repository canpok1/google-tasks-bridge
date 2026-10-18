import { describe, expect, it, vi } from "vitest";
import { ValidationError } from "../../shared/errors";
import type { UseCases } from "../application/useCases";
import { createDispatcher } from "./dispatcher";

const lists = [{ id: "L1", title: "生活" }];

const useCasesThat = (listTaskLists: UseCases["listTaskLists"]): UseCases => ({
  listTaskLists,
  listOpenTasks: () => [],
  addTask: () => {
    throw new Error("not used");
  },
  completeTask: () => {
    throw new Error("not used");
  },
  updateTask: () => {
    throw new Error("not used");
  },
});

describe("createDispatcher", () => {
  it("メソッド名に対応するユースケースの結果を成功の封筒に入れる", () => {
    const dispatch = createDispatcher(useCasesThat(() => lists));

    expect(dispatch("listTaskLists", undefined)).toEqual({ ok: true, data: lists });
  });

  it.each(["unknown", "toString", "constructor", "__proto__"])(
    "持っていないメソッド名 %s は NOT_FOUND にする",
    (method) => {
      const dispatch = createDispatcher(useCasesThat(() => lists));

      expect(dispatch(method, undefined)).toEqual({
        ok: false,
        error: { code: "NOT_FOUND", message: `unknown method: ${method}` },
      });
    },
  );

  it("AppError のサブクラスはコードとメッセージをそのまま封筒に詰める", () => {
    const dispatch = createDispatcher(
      useCasesThat(() => {
        throw new ValidationError("入力が不正です");
      }),
    );

    expect(dispatch("listTaskLists", undefined)).toEqual({
      ok: false,
      error: { code: "INVALID", message: "入力が不正です" },
    });
  });

  it("想定外の例外は中身を隠して INTERNAL にする", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const dispatch = createDispatcher(
      useCasesThat(() => {
        throw new Error("secret detail");
      }),
    );

    expect(dispatch("listTaskLists", undefined)).toEqual({
      ok: false,
      error: { code: "INTERNAL", message: "サーバーでエラーが発生しました" },
    });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
