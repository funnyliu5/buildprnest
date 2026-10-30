(function (global) {
  'use strict';
  var App = global.App = global.App || {};
  App.pages = App.pages || {};
  var fmt = App.format;

  function esc(s) { return App.ui.esc(s); }

  function projectSection(data) {
    var p = data.project || {};
    var name = p.name || '我的装修项目';
    var meta = [p.area ? p.area + ' ㎡' : '', p.stage || ''].filter(Boolean).join(' · ') || '完善项目信息';
    var totalDays = Number(p.totalDays) || 0;
    var start = p.startDate || '';
    var elapsed = start ? Math.max(0, fmt.daysSince(start) + 1) : 0;
    var dayPercent = totalDays > 0 ? Math.min(100, Math.round(elapsed / totalDays * 100)) : 0;
    var end = p.endDate || (start && totalDays ? fmt.addDays(start, totalDays) : '');

    return '<div class="sec">' +
      '<div class="card project-card">' +
        '<div class="row top">' +
          '<div class="grow">' +
            '<div class="proj-name">' + esc(name) + '</div>' +
            '<div class="proj-meta">' + esc(meta) + '</div>' +
          '</div>' +
          '<span class="badge">' + esc(p.stage || '装修中') + '</span>' +
        '</div>' +
        (totalDays > 0
          ? '<div class="proj-bar">' +
              '<span>已开工 <b>' + elapsed + '</b> 天</span>' +
              '<span>共 <b>' + totalDays + '</b> 天</span>' +
            '</div>' +
            '<div class="bar thin"><i style="width:' + dayPercent + '%"></i></div>'
          : '') +
        (end ? '<div class="proj-foot">预计完工 ' + esc(end) + '</div>' : '') +
      '</div>' +
      '</div>';
  }

  function budgetSection(data) {
    var sum = App.actions.budget.summary(data);
    var ringPercent = Math.min(100, Math.max(0, sum.percent));
    var mainText = sum.total > 0 ? '已花 ' + fmt.money(sum.spent) : '还没有设置预算';
    var subText = sum.total > 0
      ? '预算 ' + fmt.money(sum.total) + ' · ' +
        (sum.over ? '已超支 ' + fmt.money(Math.abs(sum.remaining)) : '剩余 ' + fmt.money(sum.remaining))
      : '设置预算后自动计算剩余与进度';

    return '<div class="sec">' +
      '<div class="card budget-card" data-act="go-ledger">' +
        '<div class="ring' + (sum.over ? ' over' : '') + '" style="--p:' + ringPercent + '">' +
          '<span>' + (sum.total > 0 ? sum.percent : 0) + '<small>%</small></span>' +
        '</div>' +
        '<div class="grow">' +
          '<div class="budget-kicker">' + (sum.over ? '预算已超支' : '预算使用') + '</div>' +
          '<div class="budget-main">' + esc(mainText) + '</div>' +
          '<div class="budget-sub">' + esc(subText) + '</div>' +
        '</div>' +
      '</div>' +
      '</div>';
  }

  function quickSection() {
    var items = [
      { act: 'quick-expense', label: '记一笔', icon: 'money' },
      { act: 'quick-todo', label: '加待办', icon: 'plus' },
      { act: 'quick-diary', label: '写日记', icon: 'edit' },
      { act: 'quick-file', label: '传资料', icon: 'upload' }
    ];
    return '<div class="quick-grid">' +
      items.map(function (it) {
        return '<button class="quick" type="button" data-act="' + it.act + '">' +
          '<span class="q-ico">' + App.icons.svg(it.icon, 18) + '</span>' +
          '<span>' + it.label + '</span>' +
          '</button>';
      }).join('') +
      '</div>';
  }

  function todoSection(data) {
    var all = App.actions.todo.pending(data);
    var top = all.slice(0, 3);
    var body;
    if (!top.length) {
      body = '<div class="mini-empty">暂无待办</div>';
    } else {
      body = top.map(function (t) {
        var overdue = App.actions.todo.isOverdue(t);
        var sub = [t.due ? fmt.dateLabel(t.due) : '', t.tag || ''].filter(Boolean).join(' · ');
        return '<button class="todo-item' + (overdue ? ' overdue' : '') + '" type="button" data-act="go-todo">' +
          '<span class="todo-dot"></span>' +
          '<span class="grow">' +
            '<span class="todo-title ellipsis">' + esc(t.title) + '</span>' +
            (sub ? '<span class="todo-sub">' + esc(sub) + '</span>' : '') +
          '</span>' +
          (overdue ? '<span class="badge warn">逾期</span>' : '') +
          '</button>';
      }).join('');
    }

    return '<div class="sec-head">' +
        '<h2>最近待办</h2>' +
        '<button class="more" type="button" data-act="go-todo">全部 ' + all.length + ' 条 ›</button>' +
      '</div>' +
      '<div class="list">' + body + '</div>';
  }

  function diarySection(data) {
    var latest = App.actions.diary.latest(data);
    if (!latest) return '';
    var tags = (latest.tags || []).join(' / ');
    var meta = [fmt.dateCN(latest.date), tags].filter(Boolean).join(' · ');
    return '<div class="sec-head">' +
        '<h2>最新日记</h2>' +
        '<button class="more" type="button" data-act="go-log">全部 ›</button>' +
      '</div>' +
      '<div class="sec">' +
        '<button class="card diary-card" type="button" data-act="go-log">' +
          '<span class="diary-meta">' + esc(meta) + '</span>' +
          '<span class="diary-title">' + esc(latest.title) + '</span>' +
          '<span class="diary-text">' + esc(latest.text || '') + '</span>' +
        '</button>' +
      '</div>';
  }

  function nodeSection(data) {
    var np = App.actions.node.progress(data);
    var next = App.actions.node.nextNode(data);
    return '<div class="sec-head">' +
        '<h2>验收节点</h2>' +
        '<button class="more" type="button" data-act="go-nodes">查看全部 ›</button>' +
      '</div>' +
      '<div class="sec">' +
        '<div class="card node-card">' +
          '<div class="row">' +
            '<div class="grow node-label">已完成 ' + np.done + ' / ' + np.total + '</div>' +
            '<span class="badge' + (np.percent === 100 ? ' green' : '') + '">' + np.percent + '%</span>' +
          '</div>' +
          '<div class="bar thick node-bar"><i style="width:' + np.percent + '%"></i></div>' +
          '<div class="node-next">' +
            (next ? '下一步 · ' + esc(next.name) : '全部节点已完成') +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function render() {
    var data = App.data || {};
    var p = data.project || {};
    var start = p.startDate || '';
    var elapsed = start ? Math.max(0, fmt.daysSince(start) + 1) : 0;
    var sub = fmt.dateFull(fmt.today()) + (start ? ' · 已开工第 ' + elapsed + ' 天' : '');

    return '<div class="page-head home-head">' +
        '<div class="head-main">' +
          '<h1>装修管家</h1>' +
          '<div class="sub">' + esc(sub) + '</div>' +
        '</div>' +
      '</div>' +
      projectSection(data) +
      budgetSection(data) +
      quickSection() +
      todoSection(data) +
      diarySection(data) +
      nodeSection(data);
  }

  function mount(container) {
    container.onclick = function (e) {
      var btn = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      if (act === 'go-ledger') App.router.switchTab('ledger');
      else if (act === 'quick-expense') {
        App.router.switchTab('ledger');
        App.pages.ledger.openAdd();
      }
      else if (act === 'go-todo' || act === 'quick-todo') App.router.switchTab('todo');
      else if (act === 'go-log' || act === 'quick-diary') {
        App.pages.log.setTab('diary');
        App.router.switchTab('log');
        if (act === 'quick-diary') App.pages.log.openWrite();
      }
      else if (act === 'go-nodes') {
        App.pages.log.setTab('nodes');
        App.router.switchTab('log');
      }
      else if (act === 'go-warehouse' || act === 'quick-file') App.router.go('warehouse');
    };
  }

  App.pages.home = { render: render, mount: mount };
})(window);
