import { describe, expect, it, vi } from "vitest";
import { createRequestHandler } from "./request";

const KEY = "0123456789abcdef";

const setup = (key: string | null = KEY) => {
  const dispatch = vi.fn(() => ({ ok: true as const, data: "dispatched" }));
  return { dispatch, handle: createRequestHandler(dispatch, () => key) };
};

describe("createRequestHandler", () => {
  it("合言葉が合えばメソッド名と入力を dispatcher に渡す", () => {
    const { dispatch, handle } = setup();

    expect(handle(JSON.stringify({ key: KEY, method: "listOpenTasks", input: { listTitle: "生活" } }))).toEqual({
      ok: true,
      data: "dispatched",
    });
    expect(dispatch).toHaveBeenCalledWith("listOpenTasks", { listTitle: "生活" });
  });

  it.each([
    ["違う合言葉", { key: "0123456789abcdeX", method: "listTaskLists" }],
    ["短い合言葉", { key: "0123", method: "listTaskLists" }],
    ["合言葉なし", { method: "listTaskLists" }],
  ])("%s は UNAUTHORIZED にして dispatcher を呼ばない", (_, body) => {
    const { dispatch, handle } = setup();

    expect(handle(JSON.stringify(body))).toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("合言葉が未発行なら、どの呼び出しも UNAUTHORIZED", () => {
    const { handle } = setup(null);

    expect(handle(JSON.stringify({ key: "", method: "listTaskLists" }))).toMatchObject({
      ok: false,
      error: { code: "UNAUTHORIZED" },
    });
  });

  it.each([undefined, "", "not json"])("JSON でない本文（%s）は INVALID", (body) => {
    expect(setup().handle(body)).toMatchObject({ ok: false, error: { code: "INVALID" } });
  });

  it("method が無ければ INVALID", () => {
    expect(setup().handle(JSON.stringify({ key: KEY }))).toMatchObject({ ok: false, error: { code: "INVALID" } });
  });
});
