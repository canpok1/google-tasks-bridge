// google-tasks-bridge を構築する。
//   npm run setup -- [--name <デプロイ名>]
// 単独の GAS プロジェクトを作り、ビルド・push・デプロイまで行う。
// 作った ID は git 管理外の .clasp.json と .deploy.json に保存する。

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { assertClaspLogin, build, CLASP_FILE, claspJson, DEPLOY_FILE, ROOT_DIR, run, webAppUrl } from "./lib.mjs";

const USAGE = "使い方: npm run setup -- [--name <デプロイ名>]";

let options;
try {
  options = parseArgs({
    options: {
      // GAS の「デプロイを管理」で環境を見分けるための名前（デプロイの説明）
      name: { type: "string", default: "development" },
    },
  });
} catch (e) {
  console.error(`${e.message}\n${USAGE}`);
  process.exit(1);
}
const {
  values: { name },
} = options;

if (!name) {
  console.error(USAGE);
  process.exit(1);
}
if (existsSync(CLASP_FILE) || existsSync(DEPLOY_FILE)) {
  console.error(
    `${CLASP_FILE} か ${DEPLOY_FILE} が既にあります。構築済みならデプロイは \`npm run deploy\` を使ってください。`,
  );
  process.exit(1);
}
assertClaspLogin();

console.log("\n== GAS プロジェクトを作成 ==");
mkdirSync(ROOT_DIR, { recursive: true });
const { scriptId } = claspJson([
  "create-script",
  "--type",
  "standalone",
  "--title",
  "google-tasks-bridge",
  "--rootDir",
  ROOT_DIR,
]);

console.log("\n== ビルド ==");
build();

console.log("\n== push ==");
run("npx", ["clasp", "push", "--force"]);

console.log("\n== デプロイ ==");
const { deploymentId } = claspJson(["create-deployment", "--description", name]);
writeFileSync(DEPLOY_FILE, `${JSON.stringify({ deploymentId, name }, null, 2)}\n`);

console.log(`
構築が終わりました。

1. 次のコマンドでエディタを開き、関数 issueApiKey を実行してください。
   権限の承認を求められたら許可します。実行ログに出る文字列が合言葉です。
   npx clasp open-script

2. 呼び出し側（brain の google-tasks スキル）の環境変数に次を設定してください。
   GOOGLE_TASKS_GAS_URL = ${webAppUrl(deploymentId)}
   GOOGLE_TASKS_GAS_KEY = 手順1の合言葉

3. 自動デプロイを使う場合は、GitHub の Environment に次を登録してください。
   シークレット SCRIPT_ID     = ${scriptId}
   シークレット DEPLOYMENT_ID = ${deploymentId}
   シークレット CLASPRC_JSON  = ~/.clasprc.json の中身
`);
