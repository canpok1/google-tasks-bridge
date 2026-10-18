# CLAUDE.md

Google ToDo リスト（Google Tasks）を Claude Code から読み書きするための、GAS の Web アプリ。使い方・構成・デプロイ手順は `README.md` が正本。ここには README に書いていない、コードを変えるときの決まりだけを置く。

構成は [canpok1/tempnote](https://github.com/canpok1/tempnote) に揃えている。画面とスプレッドシートが無いぶん、そちらから client・ローカル版・E2E を除いた形になっている。決まりを変えるときは tempnote 側と食い違わないか確かめる。

## 言語

ドキュメント・コードコメント・コミットメッセージ・PR は日本語で書く。

## 検査

- push 前に `npm run check`（型チェック・Biome・ユニットテスト・ビルド）を通す
- 整形は `npm run format` で直す。手で合わせない
- ユニットテストは対象の隣に `*.test.ts` で置く。本物の Tasks API には繋がない。GAS の Tasks サービスは `src/server/infrastructure/gas/fakeTasks.ts` で真似る

## 層の依存

`src/server/` は domain / application / infrastructure / entry の層に分ける。application は `ports.ts` のインターフェースにだけ依存する。

層をまたぐ import の制限は `biome.json` の `overrides` で強制している（一覧は README の「層の依存の向き」）。lint で止められたら import の向きを直す。ルールを緩めない。層やディレクトリを足したときは `biome.json` と README の表を両方更新する。

## エラーは例外で扱う

- 失敗は `src/shared/errors.ts` の `AppError` のサブクラスを throw して表す。`{ ok, error }` のような結果オブジェクトを戻り値で返さない
- 通信用の封筒（`src/shared/envelope.ts`）は dispatcher と `src/server/entry/request.ts` の中だけで使う。ユースケースに持ち込まない
- エラーの種類を足すときは、`ErrorCode`・サブクラス・`toAppError` の対応を揃える

## API を足す・変える

`src/shared/api.ts` の `Api` に型を足し、`src/server/application/useCases.ts` に同じ名前のユースケースを足す。dispatcher はメソッド名でユースケースを直接引くので、振り分けの追加は要らない。ユースケースの戻り値は `Api` のメソッドと1対1になるよう `satisfies` で縛っているので、足し忘れると型チェックで落ちる。

**呼び出し側は brain リポジトリの `.claude/skills/google-tasks/scripts/tasks.sh`。** メソッド名・入力・出力を変えたら、そちらも合わせて直す。

## GAS の制約

- サーバー側のコードは GAS の V8 で動く。`src/server/entry/gas.ts` から辿れるコードで Node の API を使わない
- GAS から呼べるのは直下の関数だけ。`doPost`・`issueApiKey` 以外の入口を足すときは、`src/server/entry/gas.ts` で export したうえで `vite.server.config.ts` の `exposed` にも足す
- `appsscript.json` は `scripts/write-manifest.mjs` が生成する。公開範囲は匿名を含む全員に固定している（`docs/adr/0001-anonymous-web-app-with-api-key.md`）。新しい GAS のサービスを使うと必要な権限が増え、デプロイ後にエディタで関数を一度実行して承認し直す必要がある

## 環境ごとの値

リポジトリは誰でも clone して自分の環境に構築できる前提で公開する。スクリプト ID・デプロイ ID・合言葉・認証情報をコミットしない。手元の値は git 管理外の `.clasp.json` / `.deploy.json`、自動デプロイの値は GitHub の Environments（`staging` / `production`）のシークレットに置く。

## git

- PR は squash マージ
- 手順やコマンド、ディレクトリ構成を変えたら README も同じ PR で直す
