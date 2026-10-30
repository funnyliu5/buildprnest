(function (global) {
  'use strict';
  var App = global.App = global.App || {};
  App.pages = App.pages || {};
  var fmt = App.format;

  function esc(s) { return App.ui.esc(s); }

  var state = { tab: 'open' };

  var TAGS = ['', '采购', '施工', '验收', '预约', '软装', '其他'];

  function doneLabel(stamp) {
    if (!stamp) return '';
    var parts = String(stamp).split(' ');
    return fmt.dateCN(parts[0]) + (parts[1] ? ' ' + parts[1] : '');
  }

  function head(data) {
    var open = App.actions.todo.pending(data).length;
    var done = App.actions.todo.done(data).length;
    return '<div class="page-head">' +
        '<div class="head-main">' +
          '<h1>待办</h1>' +
          '<div class="sub">未完成 ' + open + ' 条 · 已完成 ' + done + ' 条</div>' +
        '</div>' +
        '<button class="btn primary sm" type="button" data-act="add-todo">' +
          App.icons.svg('plus', 14) + '新增待办</button>' +
      '</div>';
  }

  function segSection() {
    return '<div class="seg-wrap"><div class="seg">' +
        '<button type="button" data-act="tab" data-tab="open" class="' +
          (state.tab === 'open' ? 'active' : '') + '">未完成</button>' +
        '<button type="button" data-act="tab" data-tab="done" class="' +
          (state.tab === 'done' ? 'active' : '') + '">已完成</button>' +
      '</div></div>';
  }

  function metaHTML(todo, done) {
    var parts = [];
    if (done) {
      if (todo.doneAt) parts.push(esc(doneLabel(todo.doneAt)));
    } else if (todo.due) {
      parts.push(esc(fmt.dateLabel(todo.due)));
    }
    if (todo.tag) parts.push('<span class="todo-tag">' + esc(todo.tag) + '</span>');
    return parts.join(' · ');
  }

  function openList(data) {
    var list = App.actions.todo.pending(data);
    if (!list.length) {
      return '<div class="sec">' + App.ui.emptyHTML({
        icon: 'todo', text: '暂无待办', btn: '新增待办'
      }) + '</div>';
    }
    var rows = list.map(function (t) {
      var overdue = App.actions.todo.isOverdue(t);
      return '<div class="todo-row' + (overdue ? ' overdue' : '') + '" data-act="toggle" data-id="' + esc(t.id) + '">' +
          '<button class="todo-check" type="button" data-act="toggle" data-id="' + esc(t.id) + '" aria-label="完成待办">' +
            App.icons.svg('check', 14) + '</button>' +
          '<div class="todo-main">' +
            '<div class="todo-title">' + esc(t.title) + '</div>' +
            '<div class="todo-meta">' + metaHTML(t, false) + '</div>' +
          '</div>' +
          (overdue ? '<span class="badge warn">逾期</span>' : '') +
        '</div>';
    }).join('');
    return '<div class="sec"><div class="list">' + rows + '</div></div>';
  }

  function doneList(data) {
    var list = App.actions.todo.done(data);
    if (!list.length) {
      return '<div class="sec">' + App.ui.emptyHTML({
        icon: 'check', text: '还没有完成的待办'
      }) + '</div>';
    }
    var rows = list.map(function (t) {
      return '<div class="todo-row done" data-act="toggle" data-id="' + esc(t.id) + '">' +
          '<button class="todo-check on" type="button" data-act="toggle" data-id="' + esc(t.id) + '" aria-label="取消完成">' +
            App.icons.svg('check', 14) + '</button>' +
          '<div class="todo-main">' +
            '<div class="todo-title">' + esc(t.title) + '</div>' +
            '<div class="todo-meta">' + metaHTML(t, true) + '</div>' +
          '</div>' +
        '</div>';
    }).join('');
    return '<div class="sec"><div class="list">' + rows + '</div></div>';
  }

  function render() {
    var data = App.data || {};
    return head(data) + segSection() + (state.tab === 'done' ? doneList(data) : openList(data));
  }

  function mount(container) {
    container.onclick = function (e) {
      var btn = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      if (act === 'add-todo' || act === 'empty') {
        openAdd();
      } else if (act === 'tab') {
        state.tab = btn.getAttribute('data-tab') === 'done' ? 'done' : 'open';
        App.refresh();
      } else if (act === 'toggle') {
        var id = btn.getAttribute('data-id');
        var result = App.actions.todo.toggle(App.data, id);
        if (!result.ok) {
          App.ui.toast(result.msg);
          return;
        }
        App.saveQuiet();
        App.refresh();
        App.ui.toast(result.msg);
      }
    };
  }

  /* ---------------- 新增待办弹层 ---------------- */

  function renderAddSheet() {
    var tagOptions = TAGS.map(function (t) {
      return '<option value="' + esc(t) + '">' + (t ? esc(t) : '不选标签') + '</option>';
    }).join('');

    return {
      title: '新增待办',
      html:
        '<div class="field" data-field="title">' +
          '<label for="todo-title">标题</label>' +
          '<input class="input" id="todo-title" maxlength="60" placeholder="例如：买 30 箱墙砖">' +
          '<div class="err-text" data-role="err-title" hidden></div>' +
        '</div>' +
        '<div class="field">' +
          '<label for="todo-due">截止日期（选填）</label>' +
          '<input class="input" id="todo-due" type="date">' +
        '</div>' +
        '<div class="field">' +
          '<label for="todo-tag">分类标签（选填）</label>' +
          '<select class="select" id="todo-tag">' + tagOptions + '</select>' +
        '</div>' +
        '<div class="sheet-foot"><button class="btn primary block" type="button" data-act="save-todo">保存</button></div>',
      onMount: function (body, close) {
        var titleInput = body.querySelector('#todo-title');
        var dueInput = body.querySelector('#todo-due');
        var tagInput = body.querySelector('#todo-tag');
        var errEl = body.querySelector('[data-role="err-title"]');
        var field = body.querySelector('[data-field="title"]');

        body.onclick = function (e) {
          var btn = e.target.closest ? e.target.closest('[data-act="save-todo"]') : null;
          if (!btn) return;
          var result = App.actions.todo.add(App.data, {
            title: titleInput ? titleInput.value : '',
            due: dueInput ? dueInput.value : '',
            tag: tagInput ? tagInput.value : ''
          });
          if (!result.ok) {
            if (field) field.classList.add('invalid');
            if (errEl) { errEl.hidden = false; errEl.textContent = result.msg; }
            if (titleInput) titleInput.focus();
            return;
          }
          App.saveQuiet();
          close();
          App.refresh();
          App.ui.toast('已添加待办');
        };
      }
    };
  }

  function openAdd() {
    App.ui.openSheet('todo-add', {});
  }

  App.ui.registerSheet('todo-add', renderAddSheet);

  App.pages.todo = {
    render: render,
    mount: mount,
    setTab: function (tab) { state.tab = tab === 'done' ? 'done' : 'open'; },
    getTab: function () { return state.tab; },
    openAdd: openAdd
  };
})(window);
