// Google ToDo リストを Claude から読み書きするための Web アプリ。
// 呼び出し側は brain リポジトリの .claude/skills/google-tasks/scripts/tasks.sh。
// 設置・更新の手順は README.md。

// 初回だけエディタから実行する。合言葉を作ってスクリプト プロパティに保存し、ログに出す
function setup() {
  const key = Utilities.getUuid() + Utilities.getUuid();
  PropertiesService.getScriptProperties().setProperty('API_KEY', key);
  Logger.log(key);
}

function doPost(e) {
  let out;
  try {
    const req = JSON.parse(e.postData.contents);
    const key = PropertiesService.getScriptProperties().getProperty('API_KEY');
    if (!key || req.key !== key) throw new Error('unauthorized');
    out = { ok: true, result: handle_(req) };
  } catch (err) {
    out = { ok: false, error: String(err && err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function handle_(req) {
  switch (req.action) {
    case 'lists':
      return lists_();
    case 'open':
      return open_(req.list);
    case 'add':
      return Tasks.Tasks.insert(taskBody_(req.task), listIdByName_(req.list));
    case 'done':
      return Tasks.Tasks.patch({ status: 'completed' }, req.list_id, req.task_id);
    case 'update':
      return Tasks.Tasks.patch(taskBody_(req.task), req.list_id, req.task_id);
    default:
      throw new Error('unknown action: ' + req.action);
  }
}

// ページングをたどって items を1つの配列にする
function collect_(fetch) {
  let items = [], page;
  do {
    const res = fetch(page);
    items = items.concat(res.items || []);
    page = res.nextPageToken;
  } while (page);
  return items;
}

function lists_() {
  return collect_(p => Tasks.Tasklists.list({ maxResults: 100, pageToken: p }))
    .map(l => ({ id: l.id, title: l.title }));
}

function listIdByName_(name) {
  const l = lists_().find(l => l.title === name);
  if (!l) throw new Error('リスト「' + name + '」が見つからない');
  return l.id;
}

// 未完了タスク。並べ替えは呼び出し側で行う
function open_(name) {
  const lists = lists_().filter(l => !name || l.title === name);
  if (name && !lists.length) throw new Error('リスト「' + name + '」が見つからない');
  return lists.flatMap(l =>
    collect_(p => Tasks.Tasks.list(l.id, { showCompleted: false, showHidden: false, maxResults: 100, pageToken: p }))
      .map(t => ({ due: (t.due || '').slice(0, 10), list: l.title, title: t.title, list_id: l.id, task_id: t.id, notes: t.notes || '' })));
}

// due は YYYY-MM-DD で受ける。時刻部分は API 側で捨てられる
function taskBody_(task) {
  const body = Object.assign({}, task);
  if (body.due !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.due)) throw new Error('日付は YYYY-MM-DD: ' + body.due);
    body.due = body.due + 'T00:00:00.000Z';
  }
  return body;
}
