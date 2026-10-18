import { describe, expect, it } from "vitest";
import type { Task } from "../../shared/api";
import { ValidationError } from "../../shared/errors";
import { sortByDue, validateChanges, validateNewTask } from "./task";

const task = (id: string, due: string): Task => ({
  listId: "L",
  listTitle: "生活",
  id,
  title: id,
  due,
  notes: "",
  completed: false,
});

describe("sortByDue", () => {
  it("期限の近い順に並べ、期限なしは末尾に置く", () => {
    const sorted = sortByDue([task("a", ""), task("b", "2026-10-30"), task("c", "2026-10-19"), task("d", "")]);

    expect(sorted.map((t) => t.id)).toEqual(["c", "b", "a", "d"]);
  });
});

describe("validateNewTask", () => {
  it("省略した値は null や空文字でも無しとして扱う", () => {
    expect(validateNewTask({ title: "牛乳", due: "", notes: null })).toEqual({
      title: "牛乳",
      due: undefined,
      notes: undefined,
    });
  });

  it.each(["10/21", "2026-02-30", "2026-10-21T09:00"])("期限 %s は弾く", (due) => {
    expect(() => validateNewTask({ title: "牛乳", due })).toThrow(ValidationError);
  });

  it("空白だけのタイトルは弾く", () => {
    expect(() => validateNewTask({ title: "  " })).toThrow(ValidationError);
  });
});

describe("validateChanges", () => {
  it("渡された項目だけを返す。期限の空文字は期限を外す指定として通す", () => {
    expect(validateChanges({ due: "" })).toEqual({ due: "" });
    expect(validateChanges({ title: "卵", notes: "" })).toEqual({ title: "卵", notes: "" });
  });

  it.each([undefined, null, {}])("変える項目が無ければ弾く（%s）", (input) => {
    expect(() => validateChanges(input)).toThrow(ValidationError);
  });

  it("不正な期限は弾く", () => {
    expect(() => validateChanges({ due: "明日" })).toThrow(ValidationError);
  });
});
