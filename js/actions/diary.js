(function (global) {
  'use strict';
  var App = global.App = global.App || {};
  var actions = App.actions = App.actions || {};
  var fmt = App.format;

  function validate(input) {
    input = input || {};
    var title = typeof input.title === 'string' ? input.title.trim() : '';
    if (!title) return { ok: false, msg: '请输入日记标题', field: 'title' };
    var text = typeof input.text === 'string' ? input.text.trim() : '';
    if (!text) return { ok: false, msg: '请输入日记正文', field: 'text' };
    return { ok: true, title: title, text: text };
  }

  function tagsOf(v) {
    if (!Array.isArray(v)) return [];
    return v.filter(function (t) { return typeof t === 'string' && t.trim(); })
      .map(function (t) { return t.trim(); });
  }

  function add(data, input) {
    input = input || {};
    var v = validate(input);
    if (!v.ok) return v;
    var diary = {
      id: App.model.uid('dy'),
      title: v.title,
      text: v.text,
      tags: tagsOf(input.tags),
      photos: Array.isArray(input.photos) ? input.photos.filter(function (p) { return !!p; }) : [],
      date: input.date || fmt.today()
    };
    data.diaries = Array.isArray(data.diaries) ? data.diaries : [];
    data.diaries.push(diary);
    return { ok: true, diary: diary };
  }

  function extOf(name) {
    var m = String(name || '').match(/\.([a-zA-Z0-9]+)$/);
    return m ? m[1].toLowerCase() : '';
  }

  /**
   * 保存照片到存储并写入文件记录，返回 Promise<记录数组>。
   * fileList 中每项需有 name / type / size（File 或 Blob 均可）。
   */
  function uploadPhotos(store, data, fileList) {
    var list = Array.prototype.slice.call(fileList || []);
    data.files = Array.isArray(data.files) ? data.files : [];
    var out = [];
    var chain = Promise.resolve();
    list.forEach(function (file) {
      chain = chain.then(function () {
        var record = {
          id: App.model.uid('fl'),
          name: file.name || '照片',
          size: Number(file.size) || 0,
          ext: extOf(file.name),
          kind: 'img',
          mime: file.type || '',
          addedAt: fmt.today()
        };
        return store.putBlob(record.id, file).then(function () {
          data.files.push(record);
          out.push(record);
        });
      });
    });
    return chain.then(function () { return out; });
  }

  function byId(data, id) {
    return (data && data.diaries ? data.diaries : []).filter(function (d) { return d.id === id; })[0] || null;
  }

  /** 日记按日期倒序（同日则后写入的在前） */
  function sorted(data) {
    var list = (data && data.diaries ? data.diaries : [])
      .map(function (d, i) { return { d: d, i: i }; });
    list.sort(function (a, b) {
      var da = a.d.date || '';
      var db = b.d.date || '';
      if (da !== db) return da > db ? -1 : 1;
      return b.i - a.i;
    });
    return list.map(function (x) { return x.d; });
  }

  function latest(data) {
    var list = sorted(data);
    return list.length ? list[0] : null;
  }

  /** 摘要：折叠换行，截断到指定长度 */
  function excerpt(text, max) {
    var s = String(text || '').replace(/\s+/g, ' ').trim();
    var n = max || 90;
    return s.length > n ? s.slice(0, n) + '…' : s;
  }

  actions.diary = {
    validate: validate,
    add: add,
    uploadPhotos: uploadPhotos,
    byId: byId,
    sorted: sorted,
    latest: latest,
    excerpt: excerpt
  };
})(window);
