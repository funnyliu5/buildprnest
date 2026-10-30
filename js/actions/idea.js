(function (global) {
  'use strict';
  var App = global.App = global.App || {};
  var actions = App.actions = App.actions || {};
  var fmt = App.format;

  function trimStr(v) {
    return typeof v === 'string' ? v.trim() : '';
  }

  function validate(input) {
    input = input || {};
    var title = trimStr(input.title);
    if (!title) return { ok: false, msg: '请输入标题', field: 'title' };

    var url = trimStr(input.url);
    if (url && !/^https?:\/\/[^\s]+$/i.test(url)) {
      return { ok: false, msg: '链接需以 http:// 或 https:// 开头', field: 'url' };
    }

    var folderId = trimStr(input.folderId);
    if (!folderId) return { ok: false, msg: '请选择文件夹', field: 'folder' };

    return { ok: true, title: title, url: url, text: trimStr(input.text), folderId: folderId };
  }

  function add(data, input) {
    var v = validate(input);
    if (!v.ok) return v;
    var idea = {
      id: App.model.uid('id'),
      title: v.title,
      url: v.url,
      text: v.text,
      folderId: v.folderId,
      photos: Array.isArray(input.photos) ? input.photos.filter(Boolean) : [],
      createdAt: input.createdAt || fmt.today()
    };
    data.ideas = Array.isArray(data.ideas) ? data.ideas : [];
    data.ideas.push(idea);
    return { ok: true, idea: idea };
  }

  function byId(data, id) {
    return (data && data.ideas ? data.ideas : []).filter(function (i) { return i.id === id; })[0] || null;
  }

  /** 按创建日期倒序；同日则后写入的在前 */
  function sorted(data) {
    var list = (data && data.ideas ? data.ideas : []).map(function (i, idx) {
      return { i: i, idx: idx };
    });
    list.sort(function (a, b) {
      var da = a.i.createdAt || '';
      var db = b.i.createdAt || '';
      if (da !== db) return da > db ? -1 : 1;
      return b.idx - a.idx;
    });
    return list.map(function (x) { return x.i; });
  }

  function listByFolder(data, folderId) {
    var all = sorted(data);
    if (!folderId) return all;
    return all.filter(function (i) { return i.folderId === folderId; });
  }

  /** 链接来源：去掉协议，仅保留域名 */
  function domain(url) {
    var s = String(url || '').replace(/^https?:\/\//i, '');
    return s.split('/')[0].split('?')[0] || '';
  }

  function excerpt(text, max) {
    var s = String(text || '').replace(/\s+/g, ' ').trim();
    var n = max || 60;
    return s.length > n ? s.slice(0, n) + '…' : s;
  }

  actions.idea = {
    validate: validate,
    add: add,
    byId: byId,
    sorted: sorted,
    listByFolder: listByFolder,
    domain: domain,
    excerpt: excerpt
  };
})(window);
