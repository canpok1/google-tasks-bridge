// Tasks の拡張サービス（Tasks API v1）を使う Repository。
// 拡張サービスはグローバルの Tasks を直接引かず、引数で受け取る。テストではフェイク（fakeTasks.ts）を渡す。

import type { Task, TaskList } from "../../../shared/api";
import { NotFoundError } from "../../../shared/errors";
import type { TaskListRepository, TaskRepository } from "../../application/ports";

export type TasksService = Pick<GoogleAppsScript.Tasks, "Tasklists" | "Tasks">;

/** 1回の取得で受け取る件数。API の上限 */
const PAGE_SIZE = 100;

/** ページングをたどって items を1つの配列にする */
const collect = <T>(fetch: (pageToken: string | undefined) => { items?: T[]; nextPageToken?: string }): T[] => {
  const items: T[] = [];
  let pageToken: string | undefined;
  do {
    const page = fetch(pageToken);
    items.push(...(page.items ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken);
  return items;
};

/** API の due は RFC 3339 だが、日付部分しか意味を持たない（時刻は捨てられる） */
const toDue = (date: string) => `${date}T00:00:00.000Z`;

const toTask = (list: TaskList, t: GoogleAppsScript.Tasks.Schema.Task): Task => ({
  listId: list.id,
  listTitle: list.title,
  id: t.id ?? "",
  title: t.title ?? "",
  due: (t.due ?? "").slice(0, 10),
  notes: t.notes ?? "",
  completed: t.status === "completed",
});

/**
 * 404 は「対象が無い」として扱う。拡張サービスはステータスを例外のメッセージにしか載せない。
 * GAS の例外が Error のインスタンスとは限らないため、instanceof ではなくメッセージで見分ける
 */
const rethrowNotFound = (e: unknown): never => {
  const message = String((e as { message?: unknown } | null)?.message ?? e);
  if (/not ?found|404/i.test(message)) throw new NotFoundError("タスクが見つかりません");
  throw e;
};

export const createTasksRepositories = (
  service: TasksService,
): { taskLists: TaskListRepository; tasks: TaskRepository } => {
  const taskLists: TaskListRepository = {
    list: () =>
      collect((pageToken) => service.Tasklists.list({ maxResults: PAGE_SIZE, pageToken })).map((l) => ({
        id: l.id ?? "",
        title: l.title ?? "",
      })),
  };

  const listById = (id: string): TaskList => {
    const list = taskLists.list().find((l) => l.id === id);
    if (!list) throw new NotFoundError("リストが見つかりません");
    return list;
  };

  const tasks: TaskRepository = {
    listOpen: (list) =>
      collect((pageToken) =>
        service.Tasks.list(list.id, { showCompleted: false, showHidden: false, maxResults: PAGE_SIZE, pageToken }),
      ).map((t) => toTask(list, t)),

    add: (list, { title, due, notes }) => {
      const resource: GoogleAppsScript.Tasks.Schema.Task = { title };
      if (due !== undefined) resource.due = toDue(due);
      if (notes !== undefined) resource.notes = notes;
      return toTask(list, service.Tasks.insert(resource, list.id));
    },

    update: (listId, taskId, { title, due, notes, completed }) => {
      const list = listById(listId);
      const resource: GoogleAppsScript.Tasks.Schema.Task = {};
      if (title !== undefined) resource.title = title;
      // 空文字は期限を外す。API は null で消える
      if (due !== undefined) resource.due = due === "" ? (null as unknown as string) : toDue(due);
      if (notes !== undefined) resource.notes = notes;
      if (completed) resource.status = "completed";
      try {
        return toTask(list, service.Tasks.patch(resource, listId, taskId));
      } catch (e) {
        return rethrowNotFound(e);
      }
    },
  };

  return { taskLists, tasks };
};
