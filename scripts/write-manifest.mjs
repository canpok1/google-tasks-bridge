// GAS のマニフェスト dist/gas/appsscript.json を書き出す。
// 呼び出し側は Google にログインできない（curl から呼ぶ）ため、公開範囲は「全員（匿名を含む）」に固定する。
// 代わりにリクエスト本文の合言葉で呼び出し元を確かめる（docs/adr/0001-anonymous-web-app-with-api-key.md）。

import { mkdirSync, writeFileSync } from "node:fs";

const manifest = {
  timeZone: "Asia/Tokyo",
  runtimeVersion: "V8",
  exceptionLogging: "STACKDRIVER",
  dependencies: {
    enabledAdvancedServices: [{ userSymbol: "Tasks", serviceId: "tasks", version: "v1" }],
  },
  webapp: {
    executeAs: "USER_DEPLOYING",
    access: "ANYONE_ANONYMOUS",
  },
};

mkdirSync("dist/gas", { recursive: true });
writeFileSync("dist/gas/appsscript.json", `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`appsscript.json: webapp.access = ${manifest.webapp.access}`);
