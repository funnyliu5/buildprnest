(function (global) {
  'use strict';
  var App = global.App = global.App || {};
  var actions = App.actions = App.actions || {};

  function list(data) {
    return data && Array.isArray(data.folders) ? data.folders : [];
  }

  function byId(data, id) {
    return list(data).filter(function (f) { return f.id === id; })[0] || null;
  }

  function nameOf(data, id) {
    var f = byId(data, id);
    return f ? f.name : '';
  }

  function countIdeas(data, folderId) {
    return (data && data.ideas ? data.ideas : []).filter(function (i) {
      return i.folderId === folderId;
    }).length;
  }

  /** 名称校验：必填 + 不允许重名（改名时排除自身） */
  function validateName(data, name, excludeId) {
    var n = typeof name === 'string' ? name.trim() : '';
    if (!n) return { ok: false, msg: '请输入文件夹名称', field: 'name' };
    var dup = list(data).filter(function (f) {
      return f.id !== excludeId && f.name === n;
    })[0];
    if (dup) return { ok: false, msg: '文件夹名称已存在', field: 'name' };
    return { ok: true, name: n };
  }

  function add(data, name) {
    var v = validateName(data, name);
    if (!v.ok) return v;
    data.folders = list(data);
    var folder = { id: App.model.uid('fd'), name: v.name };
    data.folders.push(folder);
    return { ok: true, folder: folder };
  }

  function rename(data, id, name) {
    var folder = byId(data, id);
    if (!folder) return { ok: false, msg: '文件夹不存在' };
    var v = validateName(data, name, id);
    if (!v.ok) return v;
    folder.name = v.name;
    return { ok: true, folder: folder };
  }

  /** 仅空文件夹可删，有内容时提示先移走 */
  function remove(data, id) {
    var folder = byId(data, id);
    if (!folder) return { ok: false, msg: '文件夹不存在' };
    if (countIdeas(data, id) > 0) {
      return { ok: false, msg: '该文件夹下还有内容，请先移走' };
    }
    var index = list(data).indexOf(folder);
    data.folders.splice(index, 1);
    return { ok: true, folder: folder, index: index };
  }

  actions.folder = {
    list: list,
    byId: byId,
    nameOf: nameOf,
    countIdeas: countIdeas,
    validateName: validateName,
    add: add,
    rename: rename,
    remove: remove
  };
})(window);
