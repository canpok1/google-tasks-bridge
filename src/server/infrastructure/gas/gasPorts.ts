import type { Ports } from "../../application/ports";
import { createTasksRepositories } from "./tasksRepositories";

export const createGasPorts = (): Ports => {
  // マニフェスト（scripts/write-manifest.mjs）で有効にした拡張サービス。無効だと undefined になる
  if (!Tasks) throw new Error("Tasks の拡張サービスが有効になっていません");
  return createTasksRepositories(Tasks);
};
