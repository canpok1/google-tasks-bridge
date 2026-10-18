---
name: google-tasks
description: 生活のタスクを Google ToDo リストで読み書きする。ユーザーが「生活タスクを見せて」「〇〇をタスクに追加して」「〇〇を完了にして」「期限が近いタスクは？」など、開発以外の日常のタスクに触れたときに起動する。開発タスク（brain の tasks/）には使わない。
argument-hint: "やりたいこと（一覧・追加・完了・変更）"
user-invocable: true
---

# 生活のタスクを Google ToDo リストで扱う

生活のタスクの正本は、ユーザー本人の Google アカウントの Google ToDo リスト（判断の記録は `canpok1/brain` の `projects/brain/adr/0014-life-tasks-in-google-tasks.md`）。スマホのアプリで一覧・編集・リマインドを受け、Claude はこのスキルの `scripts/tasks.sh` から、ユーザーのアカウントで動く Apps Script の Web アプリを呼ぶ。Web アプリのコードはこのリポジトリ（`canpok1/google-tasks-bridge`）にある。**タスクの写しを brain などに持たない。** 写しは正本と食い違うため。

開発タスクは brain の `tasks/` に置く。こちらとは混ぜない。

## 前提

環境変数 `GOOGLE_TASKS_GAS_URL`（Web アプリの URL）と `GOOGLE_TASKS_GAS_KEY`（合言葉）が要る。未設定ならスクリプトは終了コード 2 で止まる。そのときは「この実行環境には Google ToDo リストの接続情報が無い」とユーザーに伝えて終える。値をチャットに貼ってもらわない。

**2つの値は読まない・表示しない。** 使うのは `tasks.sh` の中だけにする。`echo` `env` `printenv` `set -x` などで中身を出さず、設定の有無だけを確かめる（`[ -n "$GOOGLE_TASKS_GAS_KEY" ]`）。出力に出ると会話の記録に残るため。

ネットワークは `script.google.com` と `script.googleusercontent.com` に届く必要がある（Web アプリは POST に 302 で応え、結果を後者から返す）。

## Apps Script の設置・更新

このリポジトリの README に従う（clasp で push・デプロイする）。Web アプリが受け付ける操作を変えたら、このスキルの `scripts/tasks.sh` も合わせて直す。

## 使い方

このスキルのディレクトリ（`.claude/skills/google-tasks/`）を基点にパスを書く。brain など別のリポジトリから `--add-dir` で参照しているときは、このリポジトリの clone の位置から辿る。

```bash
scripts/tasks.sh lists                           # リスト一覧
scripts/tasks.sh open [リスト名]                 # 未完了を期限の近い順に
scripts/tasks.sh add <リスト名> <タイトル> [YYYY-MM-DD] [メモ]
scripts/tasks.sh done <リストid> <タスクid>
scripts/tasks.sh update <リストid> <タスクid> '{"due":"2026-10-20","title":"…","notes":"…"}'
```

- `open` は TSV（`due list title list_id task_id notes`）を返す。期限なしは末尾。メモの改行は ` / ` に置き換える
- 完了・変更には id が要る。先に `open` で引く。タイトルが似たタスクが複数あるときは、どれかをユーザーに確かめてから書き換える
- **削除はしない。** やめたタスクも完了にする。削除は API から戻せないため。ユーザーが削除を求めたらアプリでの削除を案内する

## 制約

- **期限は日付だけ。** Tasks API は期限の時刻を読み書きできない（`due` の時刻部分は捨てられる）。時刻付きのリマインドが要るときは、ユーザーにアプリで時刻を足してもらうか、「生活メモ」カレンダーに通知付きの予定を作る
- **スター・繰り返しは API から扱えない。** アプリで設定してもらう
- サブタスクは `open` に親と同列で出る（親子関係は表示しない）
