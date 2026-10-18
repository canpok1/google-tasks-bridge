// タスクの入力のルールと並べ方。

import type { Task, TaskChanges } from "../../shared/api";
import { ValidationError } from "../../shared/errors";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** 実在する日付の YYYY-MM-DD か。2026-02-30 のような日付は弾く */
const isDate = (value: string): boolean => {
  if (!DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
};

export function assertDue(value: unknown): asserts value is string {
  if (typeof value !== "string" || !isDate(value))
    throw new ValidationError(`期限は YYYY-MM-DD で渡してください: ${value}`);
}

export function assertId(name: string, value: unknown): asserts value is string {
  if (typeof value !== "string" || value === "") throw new ValidationError(`${name} が必要です`);
}

export const validateTitle = (value: unknown): string => {
  if (typeof value !== "string" || value.trim() === "") throw new ValidationError("タイトルが必要です");
  return value;
};

const validateNotes = (value: unknown): string => {
  if (typeof value !== "string") throw new ValidationError("メモは文字列で渡してください");
  return value;
};

/** 通信路から来た変更を確かめる。渡されなかった項目は含めない */
export const validateChanges = (input: unknown): TaskChanges => {
  if (typeof input !== "object" || input === null) throw new ValidationError("変える項目が必要です");
  const { title, due, notes } = input as Record<string, unknown>;
  const changes: TaskChanges = {};
  if (title !== undefined) changes.title = validateTitle(title);
  if (due !== undefined && due !== "") assertDue(due);
  if (due !== undefined) changes.due = due as string;
  if (notes !== undefined) changes.notes = validateNotes(notes);
  if (Object.keys(changes).length === 0) throw new ValidationError("変える項目が必要です");
  return changes;
};

export const validateNewTask = (input: { title?: unknown; due?: unknown; notes?: unknown }) => {
  const title = validateTitle(input.title);
  // 通信路によっては省略した値が null や空文字で届くので、どれも「無し」として扱う
  const due = input.due || undefined;
  if (due !== undefined) assertDue(due);
  const notes = input.notes || undefined;
  return { title, due: due as string | undefined, notes: notes === undefined ? undefined : validateNotes(notes) };
};

/** 期限の近い順。期限なしは末尾。同じ期限どうしは元の順を保つ */
export const sortByDue = (tasks: Task[]): Task[] =>
  [...tasks].sort((a, b) => {
    if (a.due === b.due) return 0;
    if (a.due === "") return 1;
    if (b.due === "") return -1;
    return a.due < b.due ? -1 : 1;
  });
