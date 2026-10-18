// 構築済みの環境へ、今のコードをデプロイする。URL は変わらない。
//   npm run deploy
// ID は .clasp.json / .deploy.json から読む。CI では環境変数 SCRIPT_ID / DEPLOYMENT_ID / DEPLOY_NAME から読む。

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import {
  assertClaspLogin,
  build,
  CLASP_FILE,
  claspJson,
  DEPLOY_FILE,
  ROOT_DIR,
  run,
  VERSION_LIMIT,
  webAppUrl,
} from "./lib.mjs";

const saved = existsSync(DEPLOY_FILE) ? JSON.parse(readFileSync(DEPLOY_FILE, "utf8")) : {};
const deploymentId = process.env.DEPLOYMENT_ID || saved.deploymentId;
const name = process.env.DEPLOY_NAME || saved.name || "development";

if (!existsSync(CLASP_FILE)) {
  if (!process.env.SCRIPT_ID) {
    console.error(
      `${CLASP_FILE} がありません。先に \`npm run setup\` を実行するか、環境変数 SCRIPT_ID を指定してください。`,
    );
    process.exit(1);
  }
  writeFileSync(CLASP_FILE, `${JSON.stringify({ scriptId: process.env.SCRIPT_ID, rootDir: ROOT_DIR }, null, 2)}\n`);
}
if (!deploymentId) {
  console.error(`デプロイ ID がありません。${DEPLOY_FILE} か環境変数 DEPLOYMENT_ID を用意してください。`);
  process.exit(1);
}
assertClaspLogin();

build();
run("npx", ["clasp", "push", "--force"]);
run("npx", ["clasp", "create-deployment", "--deploymentId", deploymentId, "--description", name]);
console.log(`\nデプロイしました: ${webAppUrl(deploymentId)}`);

// バージョンは API から消せないので、上限に近づいたら知らせるだけにする。消すのは GAS エディタの「プロジェクト履歴」から
try {
  const count = claspJson(["list-versions"]).length;
  const message = `GAS のバージョンが ${count} / ${VERSION_LIMIT} 個あります。上限に達するとデプロイできなくなるので、GAS エディタの「プロジェクト履歴」から古いバージョンを削除してください。`;
  if (count >= VERSION_LIMIT - 20) {
    console.warn(process.env.GITHUB_ACTIONS ? `::warning::${message}` : `\n警告: ${message}`);
  } else {
    console.log(`GAS のバージョン: ${count} / ${VERSION_LIMIT}`);
  }
} catch (e) {
  console.warn(`バージョン数を確認できませんでした: ${e instanceof Error ? e.message : e}`);
}
