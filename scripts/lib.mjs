import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const run = (cmd, args, env = {}) =>
  execFileSync(cmd, args, { stdio: "inherit", env: { ...process.env, ...env } });

/** clasp を --json 付きで実行し、出力の JSON を返す。JSON の前に出るログは読み飛ばす */
export const claspJson = (args) => {
  const out = execFileSync("npx", ["clasp", ...args, "--json"], {
    encoding: "utf8",
    stdio: ["inherit", "pipe", "inherit"],
  });
  return JSON.parse(out.slice(out.search(/^[[{]/m)));
};

export const build = () => run("npm", ["run", "build"]);

export const webAppUrl = (deploymentId) => `https://script.google.com/macros/s/${deploymentId}/exec`;

export const assertClaspLogin = () => {
  if (process.env.clasp_config_auth || existsSync(join(homedir(), ".clasprc.json"))) return;
  console.error("clasp にログインしていません。先に `npx clasp login` を実行してください。");
  process.exit(1);
};

/** GAS が1プロジェクトに持てるバージョンの上限。デプロイのたびに1つ増える */
export const VERSION_LIMIT = 200;

export const DEPLOY_FILE = ".deploy.json";
export const CLASP_FILE = ".clasp.json";
export const ROOT_DIR = "dist/gas";
