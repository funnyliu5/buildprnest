(function (global) {
  'use strict';
  var App = global.App = global.App || {};

  App.pages = App.pages || {};

  var TABS = [
    { id: 'home', label: '首页', icon: 'home' },
    { id: 'ledger', label: '记账', icon: 'ledger' },
    { id: 'todo', label: '待办', icon: 'todo' },
    { id: 'log', label: '日志', icon: 'log' },
    { id: 'more', label: '更多', icon: 'more' }
  ];

  var TAB_LABELS = {};
  TABS.forEach(function (t) { TAB_LABELS[t.id] = t.label; });

  var appEl = null;
  var viewport = null;
  var tabbar = null;
  var scrollMemo = {};
  var currentKey = '';

  function buildTabbar() {
    tabbar.innerHTML = TABS.map(function (t) {
      return '<button class="tab" type="button" data-tab="' + t.id + '">' +
        '<span class="tab-ico">' + App.icons.svg(t.icon, 21) + '</span>' +
        '<span>' + t.label + '</span>' +
        '</button>';
    }).join('');
  }

  function paintTabs(active) {
    var btns = tabbar.querySelectorAll('[data-tab]');
    for (var i = 0; i < btns.length; i++) {
      var btn = btns[i];
      btn.classList.toggle('active', btn.getAttribute('data-tab') === active);
    }
  }

  function keyOf(view) {
    if (!view) return '';
    if (view.root) return 'tab:' + view.name;
    return 'view:' + view.name + ':' + JSON.stringify(view.param === undefined ? null : view.param);
  }

  function placeholderHTML(name) {
    return '<div class="page-head"><div class="head-main">' +
      '<h1>' + App.ui.esc(TAB_LABELS[name] || name) + '</h1>' +
      '</div></div>' +
      '<div class="ph">' +
      '<div class="ph-ico">' + App.icons.svg('sparkle', 26) + '</div>' +
      '<h2>正在准备</h2><p>这个页面会在后续阶段和你见面</p>' +
      '</div>';
  }

  function render(view) {
    if (!view) return;
    if (currentKey) scrollMemo[currentKey] = viewport.scrollTop;
    currentKey = keyOf(view);

    var page = App.pages[view.name];
    viewport.onclick = null;
    viewport.oninput = null;
    viewport.onchange = null;
    viewport.innerHTML = page ? page.render(view.param, view) : placeholderHTML(view.name);
    if (page && typeof page.mount === 'function') page.mount(viewport, view.param, view);

    viewport.scrollTop = scrollMemo[currentKey] || 0;

    var sub = App.router.isSubPage();
    tabbar.hidden = sub;
    appEl.classList.toggle('no-tabbar', sub);
    if (view.root) paintTabs(view.name);
  }

  function boot() {
    appEl = document.getElementById('app');
    viewport = document.getElementById('viewport');
    tabbar = document.getElementById('tabbar');

    buildTabbar();
    tabbar.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('[data-tab]') : null;
      if (!btn) return;
      App.router.switchTab(btn.getAttribute('data-tab'));
    });

    App.store.db = App.store.create({
      dbName: 'buildprnest',
      onWriteError: function () {
        App.ui.toast('数据保存失败，请到「更多-设置」导出备份');
      }
    });

    App.store.db.ready()
      .then(function () {
        return App.model.loadOrInit(App.store.db);
      })
      .then(function (data) {
        App.data = data;
        App.data.settings.storageBackend = App.store.db.backend;
        if (App.store.db.backend === 'memory') {
          App.ui.toast('当前浏览器无法持久保存，请及时导出备份', 3200);
        }
        App.router.init(render);
        render(App.router.current());
      })
      .catch(function (err) {
        console.error(err);
        viewport.innerHTML = '<div class="boot-hint">数据加载失败：' +
          App.ui.esc(err && err.message ? err.message : err) + '</div>';
      });
  }

  App.save = function () {
    if (!App.store.db) return Promise.reject(new Error('存储尚未就绪'));
    return App.store.db.set('data', App.data);
  };

  App.saveQuiet = function () {
    return App.save().catch(function () {});
  };

  App.refresh = function () {
    render(App.router.current());
  };

  App.tabLabel = function (id) { return TAB_LABELS[id] || id; };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
