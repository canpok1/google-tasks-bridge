import type { ApiMethod, ApiInput as Input, ApiOutput as Output, TaskList } from "../../shared/api";
import { NotFoundError } from "../../shared/errors";
import { assertId, sortByDue, validateChanges, validateNewTask } from "../domain/task";
import type { Ports } from "./ports";

export const createUseCases = ({ taskLists, tasks }: Ports) => {
  const listByTitle = (title: string): TaskList => {
    const list = taskLists.list().find((l) => l.title === title);
    if (!list) throw new NotFoundError(`リスト「${title}」が見つかりません`);
    return list;
  };

  // API のメソッドと1対1で対応させる。dispatcher はメソッド名でここを直接引くので、足し忘れや余分は型チェックで落ちる
  return {
    listTaskLists: (): Output<"listTaskLists"> => taskLists.list(),

    // 入力は通信路から来るので、型どおりとは限らない
    listOpenTasks: (input: Input<"listOpenTasks">): Output<"listOpenTasks"> => {
      const listTitle = input?.listTitle || undefined;
      const lists = listTitle === undefined ? taskLists.list() : [listByTitle(listTitle)];
      return sortByDue(lists.flatMap((list) => tasks.listOpen(list)));
    },

    addTask: (input: Input<"addTask">): Output<"addTask"> => {
      const task = validateNewTask(input ?? {});
      const listTitle = input?.listTitle;
      assertId("listTitle", listTitle);
      return tasks.add(listByTitle(listTitle), task);
    },

    completeTask: (input: Input<"completeTask">): Output<"completeTask"> => {
      const { listId, taskId } = input ?? {};
      assertId("listId", listId);
      assertId("taskId", taskId);
      return tasks.update(listId, taskId, { completed: true });
    },

    updateTask: (input: Input<"updateTask">): Output<"updateTask"> => {
      const { listId, taskId } = input ?? {};
      assertId("listId", listId);
      assertId("taskId", taskId);
      return tasks.update(listId, taskId, validateChanges(input?.changes));
    },
  } satisfies { [M in ApiMethod]: (input: Input<M>) => Output<M> };
};

export type UseCases = ReturnType<typeof createUseCases>;
