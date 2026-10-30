(function (global) {
  'use strict';
  var App = global.App = global.App || {};
  var actions = App.actions = App.actions || {};
  var fmt = App.format;

  /** 同步节点状态：全部勾选 → 已完成并记录日期；否则回到进行中 */
  function sync(node) {
    var checks = node.checks || [];
    var done = checks.filter(function (c) { return !!c.done; }).length;
    var wasDone = node.status === 'done';
    if (checks.length && done === checks.length) {
      if (!wasDone) node.date = fmt.today();
      node.status = 'done';
      return;
    }
    if (wasDone) node.date = '';
    if (done > 0) node.status = 'doing';
    else if (wasDone) node.status = 'doing';
    else if (node.status !== 'doing') node.status = 'todo';
  }

  function validate(input) {
    var text = input && typeof input.t === 'string' ? input.t.trim() : '';
    if (!text) return { ok: false, msg: '请输入检查项内容', field: 't' };
    return { ok: true, t: text };
  }

  function add(node, input) {
    input = input || {};
    var v = validate({ t: input.t });
    if (!v.ok) return v;
    var check = {
      t: v.t,
      note: typeof input.note === 'string' ? input.note.trim() : '',
      done: false
    };
    node.checks = Array.isArray(node.checks) ? node.checks : [];
    node.checks.push(check);
    sync(node);
    return { ok: true, check: check, index: node.checks.length - 1 };
  }

  function toggle(node, index) {
    var check = (node.checks || [])[index];
    if (!check) return { ok: false, msg: '检查项不存在' };
    check.done = !check.done;
    sync(node);
    return {
      ok: true,
      check: check,
      index: index,
      progress: actions.node.nodeProgress(node)
    };
  }

  function remove(node, index) {
    var checks = node.checks || [];
    if (!checks[index]) return { ok: false, msg: '检查项不存在' };
    if (checks.length <= 1) return { ok: false, msg: '至少保留一条检查项' };
    var removed = checks.splice(index, 1)[0];
    sync(node);
    return { ok: true, check: removed };
  }

  actions.check = {
    sync: sync,
    validate: validate,
    add: add,
    toggle: toggle,
    remove: remove
  };
})(window);
