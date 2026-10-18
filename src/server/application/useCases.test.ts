import { describe, expect, it } from "vitest";
import type { Task, TaskList } from "../../shared/api";
import { NotFoundError, ValidationError } from "../../shared/errors";
import type { Ports } from "./ports";
import { createUseCases } from "./useCases";

const base = { listId: "L1", listTitle: "生活", notes: "", completed: false };

const lists: TaskList[] = [
  { id: "L1", title: "生活" },
  { id: "L2", title: "買い物" },
];

const setup = () => {
  const all: Task[] = [
    { ...base, id: "a", title: "期限なし", due: "" },
    { ...base, id: "b", title: "遅い", due: "2026-10-30" },
    { ...base, listId: "L2", listTitle: "買い物", id: "d", title: "早い", due: "2026-10-19" },
  ];
  const ports: Ports = {
    taskLists: { list: () => lists },
    tasks: {
      // 保存先の順（ここでは配列の順）で返す。並べ替えはユースケースの役目
      listOpen: (list) => all.filter((t) => t.listId === list.id && !t.completed),
      add: (list, { title, due, notes }) => {
        const task = {
          ...base,
          listId: list.id,
          listTitle: list.title,
          id: "new",
          title,
          due: due ?? "",
          notes: notes ?? "",
        };
        all.push(task);
        return task;
      },
      update: (listId, taskId, changes) => {
        const task = all.find((t) => t.listId === listId && t.id === taskId);
        if (!task) throw new NotFoundError("タスクが見つかりません");
        return Object.assign(task, changes);
      },
    },
  };
  return { ...createUseCases(ports), all };
};

describe("listOpenTasks", () => {
  it("全リストの未完了を期限の近い順に返す", () => {
    expect(
      setup()
        .listOpenTasks({})
        .map((t) => t.id),
    ).toEqual(["d", "b", "a"]);
  });

  it("リスト名で絞る。空文字は絞らない", () => {
    const { listOpenTasks } = setup();

    expect(listOpenTasks({ listTitle: "生活" }).map((t) => t.id)).toEqual(["b", "a"]);
    expect(listOpenTasks({ listTitle: "" })).toHaveLength(3);
  });

  it("無いリスト名は NotFoundError", () => {
    expect(() => setup().listOpenTasks({ listTitle: "無い" })).toThrow(NotFoundError);
  });
});

describe("addTask", () => {
  it("リスト名で追加先を決める", () => {
    const { addTask } = setup();

    expect(addTask({ listTitle: "買い物", title: "牛乳", due: "2026-10-21" })).toMatchObject({
      listId: "L2",
      title: "牛乳",
      due: "2026-10-21",
    });
  });

  it("不正な期限なら追加しない", () => {
    const { addTask, all } = setup();

    expect(() => addTask({ listTitle: "生活", title: "x", due: "10/21" })).toThrow(ValidationError);
    expect(all).toHaveLength(3);
  });

  it("リスト名が無ければ弾く", () => {
    expect(() => setup().addTask({ title: "x" } as never)).toThrow(ValidationError);
  });
});

describe("completeTask / updateTask", () => {
  it("完了にする", () => {
    expect(setup().completeTask({ listId: "L1", taskId: "b" }).completed).toBe(true);
  });

  it("渡した項目だけを変える", () => {
    expect(setup().updateTask({ listId: "L1", taskId: "a", changes: { due: "2026-10-25" } })).toMatchObject({
      title: "期限なし",
      due: "2026-10-25",
    });
  });

  it("ID が無ければ弾く", () => {
    expect(() => setup().completeTask({ listId: "L1" } as never)).toThrow(ValidationError);
  });
});
