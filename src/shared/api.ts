// 呼び出し側とサーバーのやり取りの定義。
// 期限は日付だけを YYYY-MM-DD で運ぶ。Tasks API は期限の時刻を読み書きできないため。

export type TaskList = { id: string; title: string };

export type Task = {
  /** タスクが入っているリスト */
  listId: string;
  listTitle: string;
  id: string;
  title: string;
  /** YYYY-MM-DD。期限が無ければ空文字 */
  due: string;
  /** 無ければ空文字 */
  notes: string;
  completed: boolean;
};

/** 変える項目だけを渡す。due を空文字にすると期限を外す */
export type TaskChanges = { title?: string; due?: string; notes?: string };

export type Api = {
  listTaskLists: { input: undefined; output: TaskList[] };
  /** 未完了のタスクを期限の近い順に返す（期限なしは末尾）。listTitle を渡すとそのリストだけ。無いリスト名なら NotFoundError */
  listOpenTasks: { input: { listTitle?: string }; output: Task[] };
  /** リスト名で追加先を指す。無いリスト名なら NotFoundError */
  addTask: { input: { listTitle: string; title: string; due?: string; notes?: string }; output: Task };
  /** 削除の代わりに使う。削除は戻せないため受け付けない */
  completeTask: { input: { listId: string; taskId: string }; output: Task };
  updateTask: { input: { listId: string; taskId: string; changes: TaskChanges }; output: Task };
};

export type ApiMethod = keyof Api;
export type ApiInput<M extends ApiMethod> = Api[M]["input"];
export type ApiOutput<M extends ApiMethod> = Api[M]["output"];
