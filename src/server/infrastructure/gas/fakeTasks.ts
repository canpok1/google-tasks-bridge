// Tasks の拡張サービスを真似たフェイク。テストで tasksRepositories.ts を動かすのに使う。
// 実物に合わせて、一覧は1ページ2件ずつ返し、完了済みは showCompleted: false で除き、無い ID の patch は例外にする。

import type { TasksService } from "./tasksRepositories";

type Schema = GoogleAppsScript.Tasks.Schema.Task;

const PAGE = 2;

const page = <T>(all: T[], pageToken: string | undefined) => {
  const start = Number(pageToken ?? 0);
  const next = start + PAGE;
  return { items: all.slice(start, next), nextPageToken: next < all.length ? String(next) : undefined };
};

export const createFakeTasks = (initial: {
  lists: { id: string; title: string }[];
  tasks: Record<string, Schema[]>;
}) => {
  const lists = initial.lists.map((l) => ({ ...l }));
  const tasks: Record<string, Schema[]> = Object.fromEntries(
    lists.map((l) => [l.id, (initial.tasks[l.id] ?? []).map((t) => ({ ...t }))]),
  );
  let seq = 0;

  const service = {
    Tasklists: {
      list: (o?: { pageToken?: string }) => page(lists, o?.pageToken),
    },
    Tasks: {
      list: (listId: string, o?: { showCompleted?: boolean; pageToken?: string }) => {
        const all = (tasks[listId] ?? []).filter((t) => o?.showCompleted !== false || t.status !== "completed");
        return page(all, o?.pageToken);
      },
      insert: (resource: Schema, listId: string) => {
        const t = { status: "needsAction", ...resource, id: `new${++seq}` };
        tasks[listId].push(t);
        return t;
      },
      patch: (resource: Schema, listId: string, taskId: string) => {
        const t = (tasks[listId] ?? []).find((x) => x.id === taskId);
        if (!t) throw new Error("API call to tasks.tasks.patch failed with error: Not Found");
        for (const [k, v] of Object.entries(resource)) {
          if (v === null) delete (t as Record<string, unknown>)[k];
          else (t as Record<string, unknown>)[k] = v;
        }
        return t;
      },
    },
  };

  return { service: service as unknown as TasksService, tasks };
};
