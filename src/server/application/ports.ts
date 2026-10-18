// アプリケーション層がインフラ層に求めるもの。本番は GAS の Tasks サービスの実装、ユースケースのテストでは配列で持つ実装を渡す。

import type { Task, TaskChanges, TaskList } from "../../shared/api";

export type TaskListRepository = {
  /** すべてのリスト */
  list(): TaskList[];
};

export type TaskRepository = {
  /** リストの中の未完了タスク。並びは保存先の順 */
  listOpen(list: TaskList): Task[];
  add(list: TaskList, task: { title: string; due?: string; notes?: string }): Task;
  /** 無ければ NotFoundError */
  update(listId: string, taskId: string, changes: TaskChanges & { completed?: true }): Task;
};

export type Ports = {
  taskLists: TaskListRepository;
  tasks: TaskRepository;
};
