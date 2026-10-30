(function (global) {
  'use strict';
  var App = global.App = global.App || {};
  App.pages = App.pages || {};
  var fmt = App.format;

  function esc(s) { return App.ui.esc(s); }
  function money(n) { return fmt.money(n); }

  var CAT_ICONS = {
    design: 'edit',
    demolish: 'trash',
    plumb: 'settings',
    masonry: 'list',
    woodwork: 'folder',
    paint: 'sparkle',
    material: 'file',
    appliance: 'home',
    soft: 'image',
    other: 'tag'
  };

  var state = { tab: 'list' };

  function catIcon(id) {
    return App.icons.svg(CAT_ICONS[id] || 'tag', 18);
  }

  function head(data) {
    var sum = App.actions.budget.summary(data);
    var sub = sum.total > 0
      ? '总预算 ' + money(sum.total) + ' · 已用 ' + sum.percent + '%'
      : '还没有设置预算';
    return '<div class="page-head">' +
        '<div class="head-main">' +
          '<h1>记账</h1>' +
          '<div class="sub">' + esc(sub) + '</div>' +
        '</div>' +
        '<div class="head-actions">' +
          '<button class="icon-btn" type="button" data-act="open-budget" aria-label="预算设置">' +
            App.icons.svg('settings', 18) + '</button>' +
          '<button class="btn primary sm" type="button" data-act="add-expense">' +
            App.icons.svg('plus', 14) + '记一笔</button>' +
        '</div>' +
      '</div>';
  }

  function statSection(data) {
    var sum = App.actions.budget.summary(data);
    var month = Number(fmt.today().slice(5, 7));
    var monthSpent = App.actions.expense.monthSpent(data);
    var barPercent = Math.min(100, Math.max(0, sum.percent));
    var remainText = sum.total > 0
      ? (sum.over ? '已超支 ' + money(Math.abs(sum.remaining)) : '剩余预算 ' + money(sum.remaining))
      : '设置预算后显示剩余';
    return '<div class="sec">' +
        '<div class="card statcard">' +
          '<div class="statcard-l">' +
            '<span>' + month + ' 月支出</span>' +
            '<b class="num">' + money(monthSpent) + '</b>' +
          '</div>' +
          '<div class="statcard-r">' +
            '<div class="kv"><span>' + esc(remainText) + '</span>' +
              '<b class="num' + (sum.over ? ' over' : '') + '">' +
                (sum.total > 0 ? sum.percent + '%' : '--') + '</b>' +
            '</div>' +
            '<div class="bar' + (sum.over ? ' warn' : '') + '"><i style="width:' + barPercent + '%"></i></div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function segSection() {
    return '<div class="seg-wrap"><div class="seg">' +
        '<button type="button" data-act="tab" data-tab="list" class="' +
          (state.tab === 'list' ? 'active' : '') + '">支出明细</button>' +
        '<button type="button" data-act="tab" data-tab="cats" class="' +
          (state.tab === 'cats' ? 'active' : '') + '">分类预算</button>' +
      '</div></div>';
  }

  function listSection(data) {
    var list = App.actions.expense.sorted(data);
    if (!list.length) {
      return '<div class="sec">' + App.ui.emptyHTML({
        icon: 'money',
        text: '还没有支出记录',
        btn: '记一笔'
      }) + '</div>';
    }
    var cats = {};
    ((data.budget && data.budget.cats) || []).forEach(function (c) { cats[c.id] = c.name; });

    var rows = list.map(function (e) {
      var catName = cats[e.catId] || '其他';
      var title = e.note || catName;
      return '<div class="ledger-row">' +
          '<div class="row-ico">' + catIcon(e.catId) + '</div>' +
          '<div class="row-main">' +
            '<span class="row-title ellipsis">' + esc(title) + '</span>' +
            '<span class="row-sub">' + esc(fmt.dateCN(e.date)) + ' · ' + esc(catName) + '</span>' +
          '</div>' +
          '<div class="row-end"><b class="amt num">-' + money(e.amount) + '</b></div>' +
        '</div>';
    }).join('');

    return '<div class="sec"><div class="card listcard">' + rows + '</div></div>';
  }

  function catsSection(data) {
    var list = App.actions.budget.catList(data);
    var rows = list.map(function (c) {
      var percent = Math.min(100, Math.max(0, c.percent));
      return '<div class="catrow">' +
          '<div class="catrow-top">' +
            '<span>' + esc(c.name) + '</span>' +
            '<span class="catrow-n num' + (c.over ? ' over' : '') + '">' +
              money(c.spent) + ' <i>/ ' + money(c.limit) + '</i>' +
            '</span>' +
          '</div>' +
          '<div class="bar' + (c.over ? ' warn' : '') + '"><i style="width:' + percent + '%"></i></div>' +
        '</div>';
    }).join('');
    return '<div class="sec"><div class="card">' + rows + '</div></div>';
  }

  function render() {
    var data = App.data || {};
    return head(data) + statSection(data) + segSection() +
      (state.tab === 'cats' ? catsSection(data) : listSection(data));
  }

  function mount(container) {
    container.onclick = function (e) {
      var btn = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      if (act === 'add-expense' || act === 'empty') {
        openAdd();
      } else if (act === 'open-budget') {
        App.router.go('budget');
      } else if (act === 'tab') {
        state.tab = btn.getAttribute('data-tab') === 'cats' ? 'cats' : 'list';
        App.refresh();
      }
    };
  }

  /* ---------------- 记一笔弹层 ---------------- */

  function renderAddSheet() {
    var data = App.data || {};
    var cats = (data.budget && data.budget.cats) || [];
    var last = App.actions.expense.lastCat(data);
    var chips = cats.map(function (c) {
      return '<button type="button" class="cat-chip' + (c.id === last ? ' active' : '') +
        '" data-cat="' + esc(c.id) + '">' + esc(c.name) + '</button>';
    }).join('');

    return {
      title: '记一笔',
      html:
        '<div class="field" data-field="amount">' +
          '<label for="exp-amount">金额</label>' +
          '<div class="amount-wrap">' +
            '<span>¥</span>' +
            '<input class="input num" id="exp-amount" type="number" inputmode="decimal" min="0" step="1" placeholder="0">' +
          '</div>' +
          '<div class="err-text" data-role="err-amount" hidden></div>' +
        '</div>' +
        '<div class="field" data-field="cat">' +
          '<label>分类</label>' +
          '<div class="cat-grid" data-role="cat-grid">' + chips + '</div>' +
          '<div class="err-text" data-role="err-catId" hidden></div>' +
        '</div>' +
        '<div class="field">' +
          '<label for="exp-note">备注（选填）</label>' +
          '<input class="input" id="exp-note" maxlength="40" placeholder="例如：瓷砖进场">' +
        '</div>' +
        '<div class="field">' +
          '<label for="exp-date">日期</label>' +
          '<input class="input" id="exp-date" type="date" value="' + esc(fmt.today()) + '">' +
        '</div>' +
        '<div class="sheet-foot"><button class="btn primary block" type="button" data-act="save-expense">保存</button></div>',
      onMount: function (body, close) {
        var selected = last;
        var amountInput = body.querySelector('#exp-amount');
        var noteInput = body.querySelector('#exp-note');
        var dateInput = body.querySelector('#exp-date');

        function clearErr(field) {
          var wrap = body.querySelector('[data-field="' + field + '"]');
          var err = body.querySelector('[data-role="err-' + field + '"]');
          if (wrap) wrap.classList.remove('invalid');
          if (err) { err.hidden = true; err.textContent = ''; }
        }

        function showErr(field, msg) {
          var wrap = body.querySelector('[data-field="' + field + '"]');
          var err = body.querySelector('[data-role="err-' + field + '"]');
          if (wrap) wrap.classList.add('invalid');
          if (err) { err.hidden = false; err.textContent = msg; }
        }

        body.onclick = function (e) {
          var chip = e.target.closest ? e.target.closest('[data-cat]') : null;
          if (chip) {
            selected = chip.getAttribute('data-cat');
            var chipsIn = body.querySelectorAll('[data-cat]');
            for (var i = 0; i < chipsIn.length; i++) {
              chipsIn[i].classList.toggle('active', chipsIn[i] === chip);
            }
            clearErr('catId');
            return;
          }
          var btn = e.target.closest ? e.target.closest('[data-act="save-expense"]') : null;
          if (!btn) return;

          clearErr('amount');
          clearErr('catId');
          var result = App.actions.expense.add(App.data, {
            amount: amountInput ? amountInput.value : '',
            catId: selected,
            note: noteInput ? noteInput.value : '',
            date: dateInput ? dateInput.value : ''
          });
          if (!result.ok) {
            showErr(result.field, result.msg);
            if (amountInput && result.field === 'amount') amountInput.focus();
            return;
          }
          App.saveQuiet();
          close();
          App.refresh();
          App.ui.toast('已记录，剩余 ' + money(result.remaining));
        };
      }
    };
  }

  function openAdd() {
    App.ui.openSheet('expense-add', {});
  }

  App.ui.registerSheet('expense-add', renderAddSheet);

  /* ---------------- 预算设置页 ---------------- */

  function budgetPage() {
    var data = App.data || {};
    var total = data.budget ? Number(data.budget.total) || 0 : 0;
    var cats = data.budget ? data.budget.cats || [] : [];
    var sum = App.actions.budget.catSum(data);
    var diff = total - sum;

    function diffText() {
      if (total <= 0) return '分类额度合计 ' + money(sum) + '，总额未设置';
      if (diff === 0) return '分类额度合计 ' + money(sum) + '，与总额一致';
      return '分类额度合计 ' + money(sum) + '，与总额相差 ' + money(Math.abs(diff));
    }

    var rows = cats.map(function (c) {
      return '<div class="budget-row">' +
          '<span class="budget-row-name">' + esc(c.name) + '</span>' +
          '<input class="input num budget-limit" type="number" inputmode="decimal" min="0" step="1" ' +
            'data-cat="' + esc(c.id) + '" value="' + (Number(c.limit) || 0) + '" aria-label="' + esc(c.name) + '额度">' +
        '</div>';
    }).join('');

    return '<div class="page-head">' +
        '<button class="icon-btn plain" type="button" data-act="back" aria-label="返回">' +
          App.icons.svg('back', 18) + '</button>' +
        '<div class="head-main">' +
          '<h1>预算设置</h1>' +
          '<div class="sub">改完点保存，首页立即同步</div>' +
        '</div>' +
      '</div>' +
      '<div class="sec">' +
        '<div class="card">' +
          '<div class="field" data-field="total">' +
            '<label for="budget-total">预算总额</label>' +
            '<div class="amount-wrap"><span>¥</span>' +
              '<input class="input num" id="budget-total" type="number" inputmode="decimal" min="0" step="1" ' +
                'value="' + (total || '') + '" placeholder="例如 180000">' +
            '</div>' +
            '<div class="err-text" data-role="err-total" hidden></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="sec-head"><h2>分类额度</h2></div>' +
      '<div class="sec">' +
        '<div class="card">' + rows + '</div>' +
        '<div class="budget-diff" data-role="diff">' + esc(diffText()) + '</div>' +
        '<button class="btn primary block" type="button" data-act="save-budget">保存预算</button>' +
      '</div>';
  }

  function budgetMount(container) {
    var totalInput = container.querySelector('#budget-total');
    var diffEl = container.querySelector('[data-role="diff"]');

    function readCats() {
      var out = {};
      var inputs = container.querySelectorAll('[data-cat]');
      for (var i = 0; i < inputs.length; i++) {
        out[inputs[i].getAttribute('data-cat')] = inputs[i].value;
      }
      return out;
    }

    function refreshDiff() {
      var total = Number(totalInput ? totalInput.value : 0);
      var inputs = container.querySelectorAll('[data-cat]');
      var sum = 0;
      for (var i = 0; i < inputs.length; i++) sum += Number(inputs[i].value) || 0;
      if (!diffEl) return;
      if (total <= 0) {
        diffEl.textContent = '分类额度合计 ' + money(sum) + '，总额未设置';
        return;
      }
      var diff = Math.round(total) - Math.round(sum);
      diffEl.textContent = diff === 0
        ? '分类额度合计 ' + money(sum) + '，与总额一致'
        : '分类额度合计 ' + money(sum) + '，与总额相差 ' + money(Math.abs(diff));
      diffEl.classList.toggle('off', diff === 0);
    }

    container.oninput = function () { refreshDiff(); };

    container.onclick = function (e) {
      var btn = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      if (act === 'back') {
        if (!App.router.goBack()) App.router.switchTab('ledger');
        return;
      }
      if (act === 'save-budget') {
        var errEl = container.querySelector('[data-role="err-total"]');
        var field = container.querySelector('[data-field="total"]');
        var result = App.actions.budget.setSettings(App.data, {
          total: totalInput ? totalInput.value : '',
          cats: readCats()
        });
        if (!result.ok) {
          if (field) field.classList.add('invalid');
          if (errEl) { errEl.hidden = false; errEl.textContent = result.msg; }
          App.ui.toast(result.msg);
          return;
        }
        if (field) field.classList.remove('invalid');
        if (errEl) errEl.hidden = true;
        App.saveQuiet();
        App.ui.toast('预算已保存');
        App.router.goBack();
      }
    };
  }

  App.pages.ledger = {
    render: render,
    mount: mount,
    setTab: function (tab) { state.tab = tab === 'cats' ? 'cats' : 'list'; },
    getTab: function () { return state.tab; },
    openAdd: openAdd
  };

  App.pages.budget = { render: budgetPage, mount: budgetMount };
})(window);
