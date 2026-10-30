(function (global) {
  'use strict';
  var App = global.App = global.App || {};
  var actions = App.actions = App.actions || {};
  var fmt = App.format;

  var STATUS_TEXT = { todo: '未开始', doing: '进行中', done: '已完成' };

  /** 节点整体进度：已完成节点数 / 节点总数 */
  function progress(data) {
    var nodes = data && data.nodes ? data.nodes : [];
    var total = nodes.length;
    var done = nodes.filter(function (n) { return n.status === 'done'; }).length;
    return {
      done: done,
      total: total,
      percent: total ? Math.round(done / total * 100) : 0
    };
  }

  /** 第一个未完成节点 */
  function nextNode(data) {
    var nodes = data && data.nodes ? data.nodes : [];
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].status !== 'done') return nodes[i];
    }
    return null;
  }

  /** 单个节点的检查项进度 */
  function nodeProgress(node) {
    var checks = node && node.checks ? node.checks : [];
    var done = checks.filter(function (c) { return !!c.done; }).length;
    return {
      done: done,
      total: checks.length,
      percent: checks.length ? Math.round(done / checks.length * 100) : 0
    };
  }

  function get(data, id) {
    return (data && data.nodes ? data.nodes : []).filter(function (n) { return n.id === id; })[0] || null;
  }

  /** 新增自定义节点：位置为某节点之后，默认放到最后；检查项留空则用 3 条通用项 */
  function insertCustom(data, input) {
    input = input || {};
    var name = typeof input.name === 'string' ? input.name.trim() : '';
    if (!name) return { ok: false, msg: '请输入节点名称', field: 'name' };

    var checks = (Array.isArray(input.checks) ? input.checks : [])
      .filter(function (t) { return typeof t === 'string' && t.trim(); })
      .map(function (t) { return t.trim(); });
    if (!checks.length) checks = App.model.DEFAULT_CHECKS.slice();

    var node = App.model.makeNode(name, false, checks);
    data.nodes = Array.isArray(data.nodes) ? data.nodes : [];

    var index = data.nodes.length;
    if (input.afterId && input.afterId !== 'last') {
      var found = -1;
      for (var i = 0; i < data.nodes.length; i++) {
        if (data.nodes[i].id === input.afterId) { found = i; break; }
      }
      if (found !== -1) index = found + 1;
    }
    data.nodes.splice(index, 0, node);
    return { ok: true, node: node, index: index };
  }

  /** 删除自定义节点；标准节点函数级拒绝 */
  function removeCustom(data, id) {
    var node = get(data, id);
    if (!node) return { ok: false, msg: '节点不存在' };
    if (node.builtin) return { ok: false, msg: '标准节点不可删除' };
    var index = data.nodes.indexOf(node);
    data.nodes.splice(index, 1);
    return { ok: true, node: node, index: index };
  }

  function statusText(status) {
    return STATUS_TEXT[status] || '未开始';
  }

  function addIssue(node, text) {
    var t = typeof text === 'string' ? text.trim() : '';
    if (!t) return { ok: false, msg: '请输入问题内容', field: 'text' };
    node.issues = Array.isArray(node.issues) ? node.issues : [];
    var issue = { id: App.model.uid('is'), text: t, date: fmt.today() };
    node.issues.push(issue);
    return { ok: true, issue: issue };
  }

  actions.node = {
    progress: progress,
    nextNode: nextNode,
    nodeProgress: nodeProgress,
    get: get,
    insertCustom: insertCustom,
    removeCustom: removeCustom,
    statusText: statusText,
    addIssue: addIssue
  };
})(window);
