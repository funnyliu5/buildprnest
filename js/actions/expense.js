(function (global) {
  'use strict';
  var App = global.App = global.App || {};
  var actions = App.actions = App.actions || {};
  var fmt = App.format;

  /** 上次使用的分类；无记录时取第一个分类 */
  function lastCat(data) {
    var cats = data && data.budget && data.budget.cats ? data.budget.cats : [];
    var last = data && data.settings ? data.settings.lastCatId : '';
    var found = cats.filter(function (c) { return c.id === last; })[0];
    if (found) return found.id;
    return cats.length ? cats[0].id : '';
  }

  function toAmount(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === 'string') v = v.trim();
    if (v === '') return null;
    var n = Number(v);
    if (!isFinite(n) || n <= 0) return null;
    var yuan = Math.round(n);
    return yuan > 0 ? yuan : null;
  }

  /** 校验：金额 > 0，分类必须存在于预算分类中 */
  function validate(data, input) {
    input = input || {};
    var amount = toAmount(input.amount);
    if (amount === null) {
      return { ok: false, msg: '请输入有效金额', field: 'amount' };
    }
    var cats = data && data.budget && data.budget.cats ? data.budget.cats : [];
    var catOk = cats.some(function (c) { return c.id === input.catId; });
    if (!catOk) {
      return { ok: false, msg: '请选择分类', field: 'catId' };
    }
    return { ok: true, amount: amount, catId: input.catId };
  }

  /** 新增支出，成功后返回剩余金额 */
  function add(data, input) {
    input = input || {};
    var v = validate(data, input);
    if (!v.ok) return v;

    var expense = {
      id: App.model.uid('ex'),
      catId: v.catId,
      amount: v.amount,
      note: typeof input.note === 'string' ? input.note.trim() : '',
      date: input.date || fmt.today()
    };
    data.expenses = Array.isArray(data.expenses) ? data.expenses : [];
    data.expenses.push(expense);
    data.settings = data.settings || {};
    data.settings.lastCatId = v.catId;

    return {
      ok: true,
      expense: expense,
      remaining: actions.budget.summary(data).remaining
    };
  }

  /** 明细按日期倒序，同日后写入的在前 */
  function sorted(data) {
    var list = (data && data.expenses ? data.expenses : [])
      .map(function (e, i) { return { e: e, i: i }; });
    list.sort(function (a, b) {
      var da = a.e.date || '';
      var db = b.e.date || '';
      if (da !== db) return da > db ? -1 : 1;
      return b.i - a.i;
    });
    return list.map(function (x) { return x.e; });
  }

  /** 指定月份（YYYY-MM）的支出合计，默认本月 */
  function monthSpent(data, month) {
    var m = month || fmt.today().slice(0, 7);
    return (data && data.expenses ? data.expenses : []).reduce(function (sum, e) {
      if (String(e.date || '').slice(0, 7) !== m) return sum;
      var n = Number(e.amount);
      return sum + (isFinite(n) ? n : 0);
    }, 0);
  }

  actions.expense = {
    lastCat: lastCat,
    validate: validate,
    add: add,
    sorted: sorted,
    monthSpent: monthSpent
  };
})(window);
