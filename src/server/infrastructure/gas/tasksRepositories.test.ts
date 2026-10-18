import { describe, expect, it } from "vitest";
import { NotFoundError } from "../../../shared/errors";
import { createFakeTasks } from "./fakeTasks";
import { createTasksRepositories } from "./tasksRepositories";

const fixture = () =>
  createFakeTasks({
    lists: [
      { id: "L1", title: "生活" },
      { id: "L2", title: "買い物" },
    ],
    tasks: {
      L1: [
        { id: "a", title: "期限なし", status: "needsAction" },
        { id: "b", title: "遅い", due: "2026-10-30T00:00:00.000Z", status: "needsAction", notes: "メモ" },
        { id: "c", title: "完了済み", status: "completed" },
      ],
      L2: [{ id: "d", title: "早い", due: "2026-10-19T00:00:00.000Z", status: "needsAction" }],
    },
  });

describe("createTasksRepositories: 読み書き", () => {
  it("すべてのリストを返す", () => {
    expect(createTasksRepositories(fixture().service).taskLists.list()).toEqual([
      { id: "L1", title: "生活" },
      { id: "L2", title: "買い物" },
    ]);
  });

  it("未完了のタスクだけを、リストの名前付きで返す", () => {
    const { tasks } = createTasksRepositories(fixture().service);

    expect(tasks.listOpen({ id: "L1", title: "生活" })).toEqual([
      { listId: "L1", listTitle: "生活", id: "a", title: "期限なし", due: "", notes: "", completed: false },
      { listId: "L1", listTitle: "生活", id: "b", title: "遅い", due: "2026-10-30", notes: "メモ", completed: false },
    ]);
  });

  it("追加したタスクは未完了の一覧に出る", () => {
    const { tasks } = createTasksRepositories(fixture().service);
    const list = { id: "L2", title: "買い物" };

    const added = tasks.add(list, { title: "牛乳", due: "2026-10-21", notes: "2本" });

    expect(added).toMatchObject({ listId: "L2", title: "牛乳", due: "2026-10-21", notes: "2本", completed: false });
    expect(tasks.listOpen(list).map((t) => t.id)).toContain(added.id);
  });

  it("完了にしたタスクは未完了の一覧から消える", () => {
    const { tasks } = createTasksRepositories(fixture().service);

    expect(tasks.update("L1", "b", { completed: true }).completed).toBe(true);
    expect(tasks.listOpen({ id: "L1", title: "生活" }).map((t) => t.id)).toEqual(["a"]);
  });

  it("項目を書き換え、期限の空文字で期限を外す", () => {
    const { tasks } = createTasksRepositories(fixture().service);

    expect(tasks.update("L1", "a", { title: "期限あり", due: "2026-10-25" })).toMatchObject({
      title: "期限あり",
      due: "2026-10-25",
    });
    expect(tasks.update("L1", "b", { due: "" }).due).toBe("");
  });

  it("無いタスクの更新は NotFoundError", () => {
    expect(() => createTasksRepositories(fixture().service).tasks.update("L1", "zz", { completed: true })).toThrow(
      NotFoundError,
    );
  });
});

describe("createTasksRepositories", () => {
  it("期限は API の形式（RFC 3339 の0時）で書き込む", () => {
    const fake = fixture();

    createTasksRepositories(fake.service).tasks.add(
      { id: "L2", title: "買い物" },
      { title: "牛乳", due: "2026-10-21" },
    );

    expect(fake.tasks.L2.at(-1)?.due).toBe("2026-10-21T00:00:00.000Z");
  });

  it("ページングをたどって3件以上のタスクも返す（フェイクは1ページ2件）", () => {
    const fake = fixture();
    const { tasks } = createTasksRepositories(fake.service);
    const list = { id: "L2", title: "買い物" };
    tasks.add(list, { title: "卵" });
    tasks.add(list, { title: "パン" });

    expect(tasks.listOpen(list)).toHaveLength(3);
  });
});

it("Error のインスタンスでない例外でも、Not Found なら NotFoundError にする", () => {
  const fake = fixture();
  fake.service.Tasks.patch = () => {
    throw { message: "API call to tasks.tasks.patch failed with error: Not Found" };
  };

  expect(() => createTasksRepositories(fake.service).tasks.update("L1", "a", { completed: true })).toThrow(
    NotFoundError,
  );
});

it("Not Found 以外の例外はそのまま投げ直す", () => {
  const fake = fixture();
  fake.service.Tasks.patch = () => {
    throw new Error("Rate Limit Exceeded");
  };

  expect(() => createTasksRepositories(fake.service).tasks.update("L1", "a", { completed: true })).toThrow(
    "Rate Limit Exceeded",
  );
});
