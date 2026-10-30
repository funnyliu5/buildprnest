(function (global) {
  'use strict';
  var App = global.App = global.App || {};

  var TABS = ['home', 'ledger', 'todo', 'log', 'more'];
  var state = { tab: 'home', stack: [] };
  var onChange = null;

  function rootView() {
    return { name: state.tab, param: null, root: true };
  }

  function current() {
    return state.stack.length ? state.stack[state.stack.length - 1] : rootView();
  }

  function notify() {
    if (typeof onChange === 'function') onChange(current());
  }

  var router = {
    tabs: TABS.slice(),

    init: function (fn) { onChange = typeof fn === 'function' ? fn : null; },

    current: current,

    stack: function () { return state.stack.slice(); },

    stackDepth: function () { return state.stack.length; },

    isSubPage: function () { return state.stack.length > 0; },

    go: function (name, param) {
      if (!name) throw new Error('缺少路由名称');
      state.stack.push({
        name: name,
        param: param === undefined ? null : param,
        root: false
      });
      notify();
      return current();
    },

    goBack: function () {
      if (!state.stack.length) return false;
      state.stack.pop();
      notify();
      return true;
    },

    switchTab: function (tab) {
      if (TABS.indexOf(tab) === -1) throw new Error('未知的底部页签：' + tab);
      state.tab = tab;
      state.stack = [];
      notify();
      return current();
    },

    tab: function () { return state.tab; },

    reset: function () {
      state.tab = 'home';
      state.stack = [];
      onChange = null;
    }
  };

  App.router = router;
})(window);
