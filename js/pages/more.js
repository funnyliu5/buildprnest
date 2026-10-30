(function (global) {
  'use strict';
  var App = global.App = global.App || {};
  App.pages = App.pages || {};
  var fmt = App.format;

  function esc(s) { return App.ui.esc(s); }

  function tile(act, icon, cls, title, desc) {
    return '<button class="tile" type="button" data-act="' + esc(act) + '">' +
        '<span class="ti ' + cls + '">' + App.icons.svg(icon, 20) + '</span>' +
        '<h3>' + esc(title) + '</h3>' +
        '<p>' + esc(desc) + '</p>' +
      '</button>';
  }

  function tiles(data) {
    var files = data.files || [];
    var ideas = data.ideas || [];
    var folders = data.folders || [];
    return '<div class="tiles">' +
        tile('open-warehouse', 'folder', 't1', '资料仓库',
          files.length + ' 个文件 · 已用 ' + fmt.fileSize(App.actions.file.totalSize(files))) +
        tile('open-ideas', 'link', 't2', '随心记',
          ideas.length + ' 条 · ' + folders.length + ' 个分类') +
        tile('open-learn', 'sparkle', 't3', '学习装修知识',
          App.actions.article.total() + ' 篇文章') +
        tile('open-settings', 'settings', 't4', '设置与数据', '备份、恢复、预算') +
      '</div>';
  }

  function storageCard(data) {
    var usage = App.actions.file.usage(data.files || []);
    return '<div class="sec"><div class="card storage-card">' +
        '<div class="storage-top"><span>本地存储占用</span><b class="num">' +
          esc(fmt.fileSize(usage.bytes)) + ' / 1 GB</b></div>' +
        '<div class="bar thick node-bar' + (usage.warn ? ' warn' : '') + '">' +
          '<i style="width:' + usage.percent + '%"></i></div>' +
        '<div class="storage-tip">' +
          (usage.warn
            ? '容量已使用 80% 以上，建议导出备份后清理不常用的文件。'
            : '文件和文字都只保存在这台设备，断网也能用。') +
        '</div>' +
        '<div class="storage-actions">' +
          '<button class="btn ghost sm" type="button" data-act="export">' +
            App.icons.svg('download', 15) + '导出备份</button>' +
          '<button class="btn ghost sm" type="button" data-act="import">' +
            App.icons.svg('upload', 15) + '导入备份</button>' +
        '</div>' +
      '</div></div>';
  }

  function projectCard(data) {
    var p = data.project || {};
    var name = p.name || '我的装修项目';
    var meta = [p.area ? p.area + ' ㎡' : '', p.stage || ''].filter(Boolean).join(' · ');
    var end = p.endDate || (p.startDate && p.totalDays ? fmt.addDays(p.startDate, p.totalDays) : '');
    return '<div class="sec-head">' +
        '<h2>项目信息</h2>' +
        '<button class="more" type="button" data-act="open-settings">设置 ›</button>' +
      '</div>' +
      '<div class="sec"><div class="card more-project">' +
        '<div class="row top">' +
          '<div class="grow">' +
            '<div class="proj-name">' + esc(name) + '</div>' +
            '<div class="proj-meta">' + esc(meta || '完善项目信息') + '</div>' +
          '</div>' +
          '<span class="badge">' + esc(p.stage || '准备阶段') + '</span>' +
        '</div>' +
        (end ? '<div class="proj-foot">预计完工 ' + esc(end) + '</div>' : '') +
      '</div></div>';
  }

  function render() {
    var data = App.data || {};
    return '<div class="page-head">' +
        '<div class="head-main">' +
          '<h1>更多</h1>' +
          '<div class="sub">资料、灵感、知识和设置</div>' +
        '</div>' +
      '</div>' +
      '<div class="sec">' + tiles(data) + '</div>' +
      storageCard(data) +
      projectCard(data);
  }

  function mount(container) {
    container.onclick = function (e) {
      var btn = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      if (act === 'open-warehouse') App.router.go('warehouse');
      else if (act === 'open-ideas') App.router.go('ideas');
      else if (act === 'open-learn') App.router.go('learn');
      else if (act === 'open-settings') App.router.go('settings');
      else if (act === 'export') App.pages.settings.exportBackup();
      else if (act === 'import') App.router.go('settings');
    };
  }

  App.pages.more = { render: render, mount: mount };
})(window);
