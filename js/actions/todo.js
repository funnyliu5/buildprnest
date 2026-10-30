(function (global) {
  'use strict';
  var App = global.App = global.App || {};
  var actions = App.actions = App.actions || {};
  var fmt = App.format;

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  /** 完成时间：YYYY-MM-DD HH:mm */
  function nowStamp() {
    var d = new Date();
    return fmt.date(d) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function validate(input) {
    input = input || {};
    var title = typeof input.title === 'string' ? input.title.trim() : '';
    if (!title) return { ok: false, msg: '请输入待办标题', field: 'title' };
    return { ok: true, title: title };
  }

  function add(data, input) {
    input = input || {};
    var v = validate(input);
    if (!v.ok) return v;
    var todo = {
      id: App.model.uid('td'),
      title: v.title,
      due: typeof input.due === 'string' ? input.due : '',
      done: false,
      doneAt: '',
      tag: typeof input.tag === 'string' ? input.tag.trim() : ''
    };
    data.todos = Array.isArray(data.todos) ? data.todos : [];
    data.todos.push(todo);
    return { ok: true, todo: todo };
  }

  /** 切换完成状态；完成后记录完成时间，取消后清空 */
  function toggle(data, id) {
    var todo = (data && data.todos ? data.todos : []).filter(function (t) { return t.id === id; })[0];
    if (!todo) return { ok: false, msg: '待办不存在' };
    todo.done = !todo.done;
    todo.doneAt = todo.done ? nowStamp() : '';
    return {
      ok: true,
      todo: todo,
      done: todo.done,
      msg: todo.done ? '完成了：' + todo.title : '已恢复到未完成'
    };
  }

  function isOverdue(todo, today) {
    if (!todo || todo.done) return false;
    if (!todo.due) return false;
    return todo.due < (today || App.format.today());
  }

  /** 未完成待办，按截止日升序（无截止日排最后），可限制条数 */
  function pending(data, limit) {
    var list = (data && data.todos ? data.todos : [])
      .filter(function (t) { return !t.done; })
      .map(function (t, i) { return { t: t, i: i }; });

    list.sort(function (a, b) {
      var da = a.t.due || '9999-99-99';
      var db = b.t.due || '9999-99-99';
      if (da !== db) return da < db ? -1 : 1;
      return a.i - b.i;
    });

    var out = list.map(function (x) { return x.t; });
    return limit ? out.slice(0, limit) : out;
  }

  function done(data) {
    return (data && data.todos ? data.todos : [])
      .filter(function (t) { return !!t.done; })
      .sort(function (a, b) {
        var da = a.doneAt || '';
        var db = b.doneAt || '';
        return da < db ? 1 : da > db ? -1 : 0;
      });
  }

  actions.todo = {
    validate: validate,
    add: add,
    toggle: toggle,
    isOverdue: isOverdue,
    pending: pending,
    done: done
  };
})(window);
