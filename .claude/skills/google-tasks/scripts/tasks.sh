#!/usr/bin/env bash
# Google ToDo リストを、ユーザーの Google アカウントで動く Apps Script（canpok1/google-tasks-bridge）経由で読み書きする。
#
# 必要な環境変数: GOOGLE_TASKS_GAS_URL（Web アプリの URL）/ GOOGLE_TASKS_GAS_KEY（合言葉）
#
# 使い方:
#   tasks.sh lists                                   リスト一覧（id と名前）
#   tasks.sh open [リスト名]                         未完了を期限の近い順に（期限なしは末尾）
#   tasks.sh add <リスト名> <タイトル> [YYYY-MM-DD] [メモ]
#   tasks.sh done <リストid> <タスクid>
#   tasks.sh update <リストid> <タスクid> <JSON>     例: '{"due":"2026-10-20"}' '{"title":"…","notes":"…"}'（due を "" にすると期限を外す）
#
# 期限は日付だけ。Tasks API は時刻を読み書きできない。
set -euo pipefail

for v in GOOGLE_TASKS_GAS_URL GOOGLE_TASKS_GAS_KEY; do
  if [ -z "${!v:-}" ]; then
    echo "環境変数 $v が未設定" >&2
    exit 2
  fi
done

# call <method> [input の JSON]。合言葉は URL に載せず本文に入れる。
# Apps Script は POST に 302 で応え、結果は転送先を GET して受け取る（curl -L は 302 で GET に切り替える）
call() {
  local res
  res=$(jq -cn --arg k "$GOOGLE_TASKS_GAS_KEY" --arg m "$1" --argjson i "${2:-null}" '{key: $k, method: $m, input: $i}' |
    curl -sS -L --fail-with-body -H 'Content-Type: application/json' --data-binary @- "$GOOGLE_TASKS_GAS_URL")
  if ! jq -e '.ok == true' <<<"$res" >/dev/null 2>&1; then
    echo "Apps Script がエラーを返した: $(jq -r '.error | "\(.code): \(.message)"' <<<"$res" 2>/dev/null || true)" >&2
    echo "$res" | head -c 500 >&2
    exit 1
  fi
  jq -c .data <<<"$res"
}

task_row='[.id, .title, (if .completed then "completed" else "needsAction" end), .due] | @tsv'

cmd=${1:-}
shift || true
case "$cmd" in
  lists)
    call listTaskLists | jq -r '.[] | [.id, .title] | @tsv'
    ;;
  open)
    # 並べ替えは Apps Script 側で済んでいる（期限の近い順、期限なしは末尾）
    rows=$(call listOpenTasks "$(jq -cn --arg l "${1:-}" 'if $l == "" then {} else {listTitle: $l} end')")
    printf 'due\tlist\ttitle\tlist_id\ttask_id\tnotes\n'
    jq -r '.[] | [.due, .listTitle, .title, .listId, .id, (.notes | gsub("\n"; " / "))] | @tsv' <<<"$rows"
    ;;
  add)
    [ $# -ge 2 ] || { echo "使い方: add <リスト名> <タイトル> [YYYY-MM-DD] [メモ]" >&2; exit 1; }
    call addTask "$(jq -cn --arg l "$1" --arg t "$2" --arg d "${3:-}" --arg n "${4:-}" \
      '{listTitle: $l, title: $t} + (if $d == "" then {} else {due: $d} end) + (if $n == "" then {} else {notes: $n} end)')" |
      jq -r "$task_row"
    ;;
  done)
    [ $# -eq 2 ] || { echo "使い方: done <リストid> <タスクid>" >&2; exit 1; }
    call completeTask "$(jq -cn --arg l "$1" --arg t "$2" '{listId: $l, taskId: $t}')" | jq -r "$task_row"
    ;;
  update)
    [ $# -eq 3 ] || { echo "使い方: update <リストid> <タスクid> <JSON>" >&2; exit 1; }
    call updateTask "$(jq -cn --arg l "$1" --arg t "$2" --argjson c "$3" '{listId: $l, taskId: $t, changes: $c}')" |
      jq -r "$task_row"
    ;;
  *)
    sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'
    exit 1
    ;;
esac
