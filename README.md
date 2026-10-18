# google-tasks-bridge

Google ToDo リスト（Google Tasks）を、Claude Code などブラウザを持たないプログラムから読み書きするための Google Apps Script（GAS）の Web アプリです。構築した人の Google アカウントで動き、合言葉が合う呼び出しだけを受け付けます。

呼び出し側は [canpok1/brain](https://github.com/canpok1/brain) の `.claude/skills/google-tasks/` です。スマホの Google ToDo リストのアプリで見ているタスクを、Claude Code から一覧・追加・完了・変更するのに使います。

構成は [canpok1/tempnote](https://github.com/canpok1/tempnote) に揃えています。

## 呼び出し方

Web アプリの URL へ JSON を POST します。GAS は POST に 302 で応え、結果は転送先から返るので、転送をたどってください（curl なら `-L`）。

```sh
curl -sS -L -H 'Content-Type: application/json' \
  -d '{"key":"<合言葉>","method":"listOpenTasks","input":{"listTitle":"生活"}}' \
  "$GOOGLE_TASKS_GAS_URL"
```

応答は成功なら `{"ok":true,"data":...}`、失敗なら `{"ok":false,"error":{"code":"...","message":"..."}}` です。`code` は `UNAUTHORIZED`（合言葉が違う）・`NOT_FOUND`・`INVALID`（入力が不正）・`INTERNAL` のいずれかです。

| method | input | data |
| --- | --- | --- |
| `listTaskLists` | なし | リストの一覧（`id`・`title`） |
| `listOpenTasks` | `listTitle`（省略で全リスト） | 未完了のタスク。期限の近い順で、期限なしは末尾 |
| `addTask` | `listTitle`・`title`・`due`（任意）・`notes`（任意） | 追加したタスク |
| `completeTask` | `listId`・`taskId` | 完了にしたタスク |
| `updateTask` | `listId`・`taskId`・`changes`（`title`・`due`・`notes` のうち変えるもの） | 更新したタスク |

タスクは `listId`・`listTitle`・`id`・`title`・`due`・`notes`・`completed` を持ちます。

- `due` は `YYYY-MM-DD` です。**Tasks API は期限の時刻を読み書きできない**ため日付だけを扱います。`updateTask` で空文字を渡すと期限を外します
- 削除はできません。API から削除すると戻せないため、やめたタスクも完了にします
- スター・繰り返しは Tasks API から扱えません

## 必要なもの

- Node.js 22
- Google アカウント（[Apps Script API](https://script.google.com/home/usersettings) を有効にしておく）

```sh
npm install
```

## 検査する

| コマンド | 内容 |
| --- | --- |
| `npm run check` | 型チェック・lint・ユニットテスト・ビルドをまとめて実行する。push 前に流す |
| `npm run typecheck` | TypeScript の型チェック |
| `npm run lint` | Biome で lint とフォーマットを確認する。直すときは `npm run format` |
| `npm test` | Vitest のユニットテスト（`src/**/*.test.ts`）。`npm run test:watch` で監視しながら実行 |

プルリクエストを作ると、GitHub Actions がこれらをすべて実行します（`.github/workflows/ci.yml`）。デプロイの前にも同じ検査を通し、失敗したらデプロイしません。

## 本番環境を作る

ToDo リストを使っている Google アカウントで行います。

1. clasp にログインする

   ```sh
   npx clasp login
   ```

2. 構築する

   ```sh
   npm run setup
   ```

   `--name staging` のように名前を付けると、GAS の「デプロイを管理」にその名前で表示されます（省略時は `development`）。自動デプロイでは GitHub の環境名（`staging` / `production`）が付きます。

3. `npx clasp open-script` でエディタを開き、関数 `issueApiKey` を実行する。権限の承認を求められたら許可します（「このアプリは Google で確認されていません」と出たら「詳細」から進めます）。**実行ログに出る文字列が合言葉です**
4. 呼び出し側に、`npm run setup` が表示した Web アプリの URL と合言葉を渡す。brain の google-tasks スキルなら、環境変数 `GOOGLE_TASKS_GAS_URL` と `GOOGLE_TASKS_GAS_KEY` に置きます。呼び出し側のネットワークは `script.google.com` と `script.googleusercontent.com` に届く必要があります

スクリプト ID とデプロイ ID は、git 管理外の `.clasp.json` と `.deploy.json` に保存されます。

### 合言葉を作り直す

エディタで `issueApiKey` をもう一度実行すると、新しい合言葉に替わり、古いものは使えなくなります。漏れたときはすぐに作り直して、呼び出し側の値を替えてください。

## デプロイ

権限の増える変更（新しい GAS のサービスを使うなど）をデプロイした後は、エディタで関数（`issueApiKey` など）を一度「実行」して承認し直してください。承認するまで、新しい処理は「権限がありません」というエラーで失敗します。なお `issueApiKey` を実行すると合言葉も替わります。

手元から:

```sh
npm run deploy
```

URL は変わりません。

自動デプロイ: GitHub Actions が、main への push で `staging` 環境へ、`v` から始まるタグの push で `production` 環境へデプロイします。リポジトリの Settings > Environments で環境を作り、次を登録してください。登録していない環境へのデプロイは飛ばされます。

| 名前 | 種類 | 内容 |
| --- | --- | --- |
| `SCRIPT_ID` | シークレット | `npm run setup` が表示したスクリプト ID |
| `DEPLOYMENT_ID` | シークレット | `npm run setup` が表示したデプロイ ID |
| `CLASPRC_JSON` | シークレット | `~/.clasprc.json` の中身 |

### GAS のバージョン数

デプロイのたびに GAS のバージョンが1つ増え、1つのプロジェクトに作れるのは 200 個までです。バージョンは API から削除できないため、`npm run deploy` は残りが 20 個以下になると警告を出します（GitHub Actions ではジョブの警告として表示）。警告が出たら、GAS エディタの「プロジェクト履歴」から古いバージョンを削除してください。デプロイ中のバージョンは削除できません。

## 構成

```
src/
  shared/          呼び出し側とサーバーで共有するもの（API の定義・例外・通信用の封筒）
  server/
    domain/        タスクの入力のルールと並べ方
    application/   ユースケースと、インフラ層に求めるインターフェース（ports）
    infrastructure/
      gas/         GAS 版の実装（Tasks の拡張サービス）と、テスト用のフェイク
    entry/         入口。GAS の doPost が合言葉を確かめ、dispatcher がユースケースへ振り分ける
scripts/           setup・deploy・マニフェスト生成
docs/adr/          設計の判断の記録（ADR）
```

ユニットテストは対象のファイルの隣に `*.test.ts` として置きます。GAS 版の実装は、Tasks の拡張サービスを真似たフェイク（`src/server/infrastructure/gas/fakeTasks.ts`）の上で動かします。

アプリのコードは例外でエラーを扱います。`AppError` のサブクラス（`UnauthorizedError` / `NotFoundError` / `ValidationError`）をサーバーで throw すると、入口が `{ ok, data | error }` の封筒に詰め替えて返します（`src/shared/errors.ts`・`src/shared/envelope.ts`）。

公開範囲を匿名を含む全員にし、合言葉で呼び出し元を確かめる理由は `docs/adr/0001-anonymous-web-app-with-api-key.md` にあります。

### 層の依存の向き

層をまたぐ import は Biome の `noRestrictedImports` で縛っています（`biome.json` の `overrides`）。違反すると `npm run lint` が失敗します。

| 場所 | import してはいけないもの |
| --- | --- |
| `shared/` | `server/` |
| `server/domain/` | ほかのすべての層（`shared/` だけ使える） |
| `server/application/` | `infrastructure/`・`entry/` |
| `server/infrastructure/gas/` と `entry/gas.ts` | `entry/` |
