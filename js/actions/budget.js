(function (global) {
  'use strict';
  var App = global.App = global.App || {};
  var actions = App.actions = App.actions || {};

  function number(v) {
    var n = Number(v);
    return isFinite(n) ? n : 0;
  }

  function spentTotal(data) {
    return (data && data.expenses ? data.expenses : []).reduce(function (sum, e) {
      return sum + number(e.amount);
    }, 0);
  }

  function catSpent(data, catId) {
    return (data && data.expenses ? data.expenses : []).reduce(function (sum, e) {
      if (e.catId !== catId) return sum;
      return sum + number(e.amount);
    }, 0);
  }

  /** 总预算概览 */
  function summary(data) {
    var total = number(data && data.budget ? data.budget.total : 0);
    var spent = spentTotal(data);
    return {
      total: total,
      spent: spent,
      remaining: total - spent,
      percent: App.format.percent(spent, total),
      over: total > 0 && spent > total
    };
  }

  /** 分类额度合计 */
  function catSum(data) {
    var cats = data && data.budget && data.budget.cats ? data.budget.cats : [];
    return cats.reduce(function (sum, c) { return sum + number(c.limit); }, 0);
  }

  /** 保存预算设置：总额必须大于 0；分类额度允许与总额不一致 */
  function setSettings(data, input) {
    input = input || {};
    var total = Number(input.total);
    if (!isFinite(total) || total <= 0) {
      return { ok: false, msg: '预算总额必须大于 0' };
    }
    var cats = data.budget && data.budget.cats ? data.budget.cats : [];
    var limits = input.cats || {};
    data.budget.total = Math.round(total);
    data.budget.cats = cats.map(function (c) {
      var raw = limits[c.id];
      var limit = raw === undefined || raw === null || raw === '' ? number(c.limit) : number(raw);
      return { id: c.id, name: c.name, limit: Math.max(0, Math.round(limit)) };
    });
    var sum = catSum(data);
    return { ok: true, sum: sum, diff: data.budget.total - sum };
  }

  /** 分类列表（附已花、进度、超支标记） */
  function catList(data) {
    var cats = data && data.budget && data.budget.cats ? data.budget.cats : [];
    return cats.map(function (c) {
      var limit = number(c.limit);
      var spent = catSpent(data, c.id);
      return {
        id: c.id,
        name: c.name,
        limit: limit,
        spent: spent,
        percent: App.format.percent(spent, limit),
        over: limit > 0 && spent > limit,
        remain: limit - spent
      };
    });
  }

  actions.budget = {
    spentTotal: spentTotal,
    catSpent: catSpent,
    catSum: catSum,
    setSettings: setSettings,
    summary: summary,
    catList: catList
  };
})(window);
