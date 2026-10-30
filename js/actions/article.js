(function (global) {
  'use strict';
  var App = global.App = global.App || {};
  var actions = App.actions = App.actions || {};

  var CATEGORIES = ['全部', '预算', '水电', '防水', '泥瓦', '木工', '软装'];

  function all() {
    return Array.isArray(App.articles) ? App.articles : [];
  }

  function list(cat) {
    var items = all();
    if (!cat || cat === '全部') return items.slice();
    return items.filter(function (a) { return a.cat === cat; });
  }

  function byId(id) {
    return all().filter(function (a) { return a.id === id; })[0] || null;
  }

  function related(id, max) {
    var a = byId(id);
    if (!a) return [];
    var n = max || 3;
    return list(a.cat).filter(function (x) { return x.id !== id; }).slice(0, n);
  }

  function count(cat) {
    return list(cat).length;
  }

  function total() {
    return all().length;
  }

  actions.article = {
    CATEGORIES: CATEGORIES,
    all: all,
    list: list,
    byId: byId,
    related: related,
    count: count,
    total: total
  };
})(window);
