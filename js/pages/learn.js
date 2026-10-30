(function (global) {
  'use strict';
  var App = global.App = global.App || {};
  App.pages = App.pages || {};

  function esc(s) { return App.ui.esc(s); }

  var state = { cat: '全部' };

  function CHIPS() {
    return App.actions.article.CATEGORIES;
  }

  function card(a) {
    return '<button class="article-card" type="button" data-act="open-article" data-id="' + esc(a.id) + '">' +
        '<div class="article-top">' +
          '<span class="tag-pill">' + esc(a.cat) + '</span>' +
          '<span class="article-min">' + App.icons.svg('clock', 13) + a.minutes + ' 分钟</span>' +
        '</div>' +
        '<div class="article-title">' + esc(a.title) + '</div>' +
        '<div class="article-sum">' + esc(a.summary) + '</div>' +
      '</button>';
  }

  function render() {
    var total = App.actions.article.total();
    var list = App.actions.article.list(state.cat);
    var chips = CHIPS().map(function (c) {
      return '<button class="chip' + (state.cat === c ? ' active' : '') +
        '" type="button" data-act="cat" data-cat="' + esc(c) + '">' + esc(c) + '</button>';
    }).join('');

    var body = list.length
      ? '<div class="sec"><div class="list">' + list.map(card).join('') + '</div></div>'
      : '<div class="sec">' + App.ui.emptyHTML({
          icon: 'book', text: '这个分类还没有文章'
        }) + '</div>';

    return '<div class="page-head learn-head">' +
        '<button class="icon-btn plain" type="button" data-act="back" aria-label="返回">' +
          App.icons.svg('back', 18) + '</button>' +
        '<div class="head-main">' +
          '<h1>学习装修知识</h1>' +
          '<div class="sub">' + total + ' 篇文章 · 装到哪步查哪步</div>' +
        '</div>' +
      '</div>' +
      '<div class="sec"><div class="filter-row">' + chips + '</div></div>' +
      body;
  }

  function mount(container) {
    container.onclick = function (e) {
      var btn = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      if (act === 'back') {
        if (!App.router.goBack()) App.router.switchTab('more');
      } else if (act === 'cat') {
        state.cat = btn.getAttribute('data-cat') || '全部';
        container.scrollTop = 0;
        App.refresh();
      } else if (act === 'open-article') {
        App.router.go('article', btn.getAttribute('data-id'));
      }
    };
  }

  /* ---------------- 阅读页 ---------------- */

  function renderArticle(id) {
    var a = App.actions.article.byId(id);
    var backHead = '<div class="page-head article-head">' +
        '<button class="icon-btn plain" type="button" data-act="back" aria-label="返回">' +
          App.icons.svg('back', 18) + '</button>' +
        '<div class="head-main"><h1>装修知识</h1></div>' +
      '</div>';

    if (!a) {
      return backHead + '<div class="sec">' + App.ui.emptyHTML({
        icon: 'book', text: '文章不存在'
      }) + '</div>';
    }

    var related = App.actions.article.related(a.id, 3);

    return '<div class="page-head article-head">' +
        '<button class="icon-btn plain" type="button" data-act="back" aria-label="返回">' +
          App.icons.svg('back', 18) + '</button>' +
        '<div class="head-main">' +
          '<h1>' + esc(a.title) + '</h1>' +
          '<div class="sub">' + esc(a.cat) + ' · ' + a.minutes + ' 分钟 · 要点 ' +
            (a.points ? a.points.length : 0) + ' 条</div>' +
        '</div>' +
      '</div>' +

      '<div class="sec">' +
        '<div class="card article-body">' +
          a.body.map(function (p) {
            return '<p class="article-p">' + esc(p) + '</p>';
          }).join('') +
        '</div>' +
      '</div>' +

      '<div class="sec">' +
        '<div class="card points-card">' +
          '<div class="points-title">要点清单</div>' +
          (a.points || []).map(function (p) {
            return '<div class="point-row">' +
                '<span class="point-check">' + App.icons.svg('check', 12) + '</span>' +
                '<span class="grow">' + esc(p) + '</span>' +
              '</div>';
          }).join('') +
        '</div>' +
      '</div>' +

      (related.length
        ? '<div class="sec-head"><h2>相关文章</h2></div>' +
          '<div class="sec"><div class="list">' + related.map(card).join('') + '</div></div>'
        : '');
  }

  function mountArticle(container, id) {
    container.onclick = function (e) {
      var btn = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      if (act === 'back') {
        if (!App.router.goBack()) App.router.switchTab('more');
      } else if (act === 'open-article') {
        App.router.go('article', btn.getAttribute('data-id'));
      }
    };
  }

  App.pages.learn = {
    render: render,
    mount: mount,
    setCat: function (cat) { state.cat = cat || '全部'; },
    getCat: function () { return state.cat; }
  };
  App.pages.article = { render: renderArticle, mount: mountArticle };
  App.pages['article-detail'] = App.pages.article;
})(window);
