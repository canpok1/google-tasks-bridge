# google-tasks-bridge

Google ToDo リスト（Google Tasks）を Claude Code から読み書きするための Apps Script Web アプリ。ユーザー本人の Google アカウントで動き、リクエスト本文の合言葉が合う呼び出しだけを受け付ける。

呼び出し側は brain リポジトリの `.claude/skills/google-tasks/`。この構成にした理由は brain の `projects/brain/adr/0014-life-tasks-in-google-tasks.md`。

## 受け付ける操作

POST の本文に JSON で `{"key": "<合言葉>", "action": "...", ...}` を送る。応答は `{"ok": true, "result": ...}` か `{"ok": false, "error": "..."}`。

| action | 引数 | 結果 |
|---|---|---|
| `lists` | なし | リストの一覧（`id` / `title`） |
| `open` | `list`（リスト名。省略で全リスト） | 未完了タスク（`due` / `list` / `title` / `list_id` / `task_id` / `notes`）。並べ替えはしない |
| `add` | `list`（リスト名）、`task`（`title` 必須、`due`・`notes`） | 追加したタスク |
| `done` | `list_id`、`task_id` | 完了にしたタスク |
| `update` | `list_id`、`task_id`、`task`（変える項目） | 更新したタスク |

- `due` は `YYYY-MM-DD`。**Tasks API は期限の時刻を読み書きできない**ため日付だけ
- 削除は受け付けない。API から削除すると戻せないため

## 初回の設置

ユーザー本人のアカウント（スマホで ToDo リストを使っているもの）で行う。

1. https://script.google.com/home/usersettings で「Google Apps Script API」をオンにする
2. clasp でログインし、プロジェクトを作る

    ```bash
    npm install
    npx clasp login
    npx clasp create --type standalone --title google-tasks-bridge --rootDir src
    git restore src/appsscript.json   # create が書き換えた場合に戻す
    npm run push
    ```

    `.clasp.json`（scriptId が入る）はコミットする。秘密ではなく、別の環境から同じプロジェクトへ push するのに要る

3. `npx clasp open-script` でエディタを開き、関数 `setup` を実行して権限を許可する。「このアプリは Google で確認されていません」は「詳細」→「（安全ではないページ）に移動」で進める。**実行ログに出る文字列が合言葉**
4. エディタの「デプロイ」→「新しいデプロイ」→ 種類「ウェブアプリ」。実行ユーザーは自分、アクセスは「全員」。表示される URL（`/exec` で終わる）と、デプロイ ID を控える
5. Claude Code の実行環境に環境変数を置く。値はチャットに貼らない

    ```
    GOOGLE_TASKS_GAS_URL=<手順4の URL>
    GOOGLE_TASKS_GAS_KEY=<手順3の合言葉>
    ```

    ネットワークは `script.google.com` と `script.googleusercontent.com` に届くようにする

## 更新

```bash
npm test
DEPLOYMENT_ID=<手順4のデプロイ ID> npm run deploy
```

**既存のデプロイ ID を指定して更新する。** 新しいデプロイを作ると URL が変わり、環境変数の書き換えが要る。

## 合言葉が漏れたとき

エディタで `setup` をもう一度実行すると作り直され、古いものは使えなくなる。環境変数を新しい値に替える。

## テスト

`npm test` は `src/Code.js` を Apps Script のサービスを模したスタブの上で動かす。本物の ToDo リストには触れない。
