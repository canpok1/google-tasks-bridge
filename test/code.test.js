// src/Code.js を Apps Script のサービスを模したスタブの上で動かす
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function load() {
  const lists = [{ id: 'L1', title: '生活' }, { id: 'L2', title: '買い物' }];
  const tasks = {
    L1: [
      { id: 'a', title: '期限なし', status: 'needsAction' },
      { id: 'b', title: '遅い', due: '2026-10-30T00:00:00.000Z', status: 'needsAction', notes: 'メモ' },
      { id: 'c', title: '完了済み', status: 'completed' },
    ],
    L2: [{ id: 'd', title: '早い', due: '2026-10-19T00:00:00.000Z', status: 'needsAction' }],
  };
  const props = {};
  let uuid = 0;
  const ctx = {
    Utilities: { getUuid: () => 'u' + ++uuid },
    Logger: { log() {} },
    PropertiesService: { getScriptProperties: () => ({ setProperty: (k, v) => (props[k] = v), getProperty: (k) => props[k] ?? null }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (s) => ({ s, setMimeType() { return this; } }) },
    Tasks: {
      // 2ページに分けて返し、ページングをたどることを確かめる
      Tasklists: { list: (o) => (o.pageToken ? { items: [lists[1]] } : { items: [lists[0]], nextPageToken: 'p2' }) },
      Tasks: {
        list: (l, o) => ({ items: tasks[l].filter((t) => o.showCompleted !== false || t.status !== 'completed') }),
        insert: (b, l) => { const t = Object.assign({ id: 'new', status: 'needsAction' }, b); tasks[l].push(t); return t; },
        patch: (b, l, id) => { const t = tasks[l].find((t) => t.id === id); if (!t) throw new Error('Not Found'); return Object.assign(t, b); },
      },
    },
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/Code.js'), 'utf8'), ctx);
  ctx.setup();
  const call = (req) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(Object.assign({ key: props.API_KEY }, req)) } }).s);
  return { call, tasks, props };
}

test('setup は合言葉をスクリプト プロパティに保存する', () => {
  const { props } = load();
  assert.strictEqual(props.API_KEY, 'u1u2');
});

test('合言葉が違えば拒否する', () => {
  const { call } = load();
  assert.deepStrictEqual(call({ key: 'wrong', action: 'lists' }), { ok: false, error: 'unauthorized' });
});

test('lists はページングをたどって全リストを返す', () => {
  const { call } = load();
  assert.deepStrictEqual(call({ action: 'lists' }).result, [{ id: 'L1', title: '生活' }, { id: 'L2', title: '買い物' }]);
});

test('open は未完了だけを返し、リスト名で絞れる', () => {
  const { call } = load();
  assert.deepStrictEqual(call({ action: 'open' }).result.map((t) => t.task_id), ['a', 'b', 'd']);
  const r = call({ action: 'open', list: '生活' }).result;
  assert.deepStrictEqual(r.map((t) => t.task_id), ['a', 'b']);
  assert.deepStrictEqual(r[1], { due: '2026-10-30', list: '生活', title: '遅い', list_id: 'L1', task_id: 'b', notes: 'メモ' });
  assert.strictEqual(call({ action: 'open', list: '無い' }).ok, false);
});

test('add は期限を API の形式に変えて追加する', () => {
  const { call, tasks } = load();
  assert.strictEqual(call({ action: 'add', list: '生活', task: { title: '新規', due: '2026-10-21' } }).ok, true);
  assert.strictEqual(tasks.L1.at(-1).due, '2026-10-21T00:00:00.000Z');
});

test('期限が YYYY-MM-DD でなければ追加しない', () => {
  const { call, tasks } = load();
  const before = tasks.L1.length;
  assert.deepStrictEqual(call({ action: 'add', list: '生活', task: { title: 'x', due: '10/21' } }), { ok: false, error: '日付は YYYY-MM-DD: 10/21' });
  assert.strictEqual(tasks.L1.length, before);
});

test('done は完了にし、update は項目を書き換える', () => {
  const { call, tasks } = load();
  assert.strictEqual(call({ action: 'done', list_id: 'L1', task_id: 'b' }).result.status, 'completed');
  call({ action: 'update', list_id: 'L1', task_id: 'a', task: { title: '期限あり', due: '2026-10-25' } });
  assert.deepStrictEqual([tasks.L1[0].title, tasks.L1[0].due], ['期限あり', '2026-10-25T00:00:00.000Z']);
  assert.strictEqual(call({ action: 'done', list_id: 'L1', task_id: 'zz' }).ok, false);
});

test('知らない action は拒否する', () => {
  const { call } = load();
  assert.strictEqual(call({ action: 'delete' }).ok, false);
});
