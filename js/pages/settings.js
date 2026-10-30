(function (global) {
  'use strict';
  var App = global.App = global.App || {};
  App.pages = App.pages || {};
  var fmt = App.format;

  function esc(s) { return App.ui.esc(s); }

  function totalBlobBytes(blobs) {
    return (blobs || []).reduce(function (sum, b) {
      return sum + (b && b.blob && Number(b.blob.size) || 0);
    }, 0);
  }

  function row(act, icon, title, desc, value, danger) {
    return '<button class="set-row" type="button" data-act="' + esc(act) + '">' +
        '<span class="si' + (danger ? ' si-danger' : '') + '">' + App.icons.svg(icon, 17) + '</span>' +
        '<span class="sl"><b' + (danger ? ' class="danger"' : '') + '>' + esc(title) + '</b>' +
          '<small>' + esc(desc) + '</small></span>' +
        '<span class="sv">' + (value || '') + App.icons.svg('right', 13) + '</span>' +
      '</button>';
  }

  function staticRow(icon, title, desc) {
    return '<div class="set-row static">' +
        '<span class="si">' + App.icons.svg(icon, 17) + '</span>' +
        '<span class="sl"><b>' + esc(title) + '</b><small>' + esc(desc) + '</small></span>' +
      '</div>';
  }

  function render() {
    var data = App.data || {};
    var p = data.project || {};
    var budgetTotal = data.budget ? Number(data.budget.total) || 0 : 0;
    var nodeCount = (data.nodes || []).length;
    var files = (data.files || []).length;
    var usage = App.actions.file.usage(data.files || []);
    var estimate = App.actions.backup.estimateSize(data, App.actions.file.totalSize(data.files || []));
    var projectLine = [p.name || '我的装修项目', p.area ? p.area + ' ㎡' : '', p.stage || '']
      .filter(Boolean).join(' · ');

    return '<div class="page-head">' +
        '<button class="icon-btn plain" type="button" data-act="back" aria-label="返回">' +
          App.icons.svg('back', 18) + '</button>' +
        '<div class="head-main">' +
          '<h1>设置与数据</h1>' +
          '<div class="sub">项目、预算、备份</div>' +
        '</div>' +
      '</div>' +

      '<div class="group-title">项目与预算</div>' +
      '<div class="sec"><div class="card set-card">' +
        row('open-budget', 'ledger', '预算设置', '总预算与分类上限',
          budgetTotal > 0 ? fmt.money(budgetTotal) : '未设置') +
        row('open-nodes', 'todo', '验收节点管理', '新增、删除、调整检查项',
          nodeCount + ' 个') +
        staticRow('home', '项目信息', projectLine) +
      '</div></div>' +

      '<div class="group-title">数据（全部存在本机）</div>' +
      '<div class="sec"><div class="card set-card">' +
        row('export', 'download', '导出备份',
          '生成 ZIP 备份，含全部文字与原始附件 · 预计 ' + fmt.fileSize(estimate)) +
        row('import', 'upload', '导入备份', '从备份 ZIP 恢复，导入前会提示覆盖') +
        row('clear', 'trash', '清空所有数据', '保留项目信息与预算，不可撤销', '', true) +
      '</div></div>' +

      '<div class="sec"><div class="card storage-card">' +
        '<div class="storage-top"><span>资料仓库占用</span><b class="num">' +
          esc(fmt.fileSize(usage.bytes)) + ' / 1 GB</b></div>' +
        '<div class="bar thick node-bar' + (usage.warn ? ' warn' : '') + '">' +
          '<i style="width:' + usage.percent + '%"></i></div>' +
        '<div class="storage-tip">' + files + ' 个文件，占用 ' + usage.percent + '%。' +
          '图片与文件占空间最多，清理前记得先导出备份。</div>' +
      '</div></div>' +

      '<div class="group-title">关于</div>' +
      '<div class="sec"><div class="card set-card">' +
        staticRow('info', '离线使用说明', '无需登录、不联网，数据只保存在这台设备') +
        staticRow('lock', '备份内容', '一个 ZIP 文件，含 data.json 与资料仓库原始附件') +
        staticRow('sparkle', '版本', 'v1.0 · 离线单页版') +
      '</div></div>' +

      '<input type="file" data-role="backup-file" accept=".zip,application/zip" hidden>';
  }

  /* ---------------- 导出 ---------------- */

  function download(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      if (a.parentNode) a.parentNode.removeChild(a);
      try { URL.revokeObjectURL(url); } catch (e) {}
    }, 1000);
  }

  function exportBackup() {
    var db = App.store.db;
    if (!db) {
      App.ui.toast('存储尚未就绪');
      return Promise.resolve(false);
    }
    return db.allBlobs().then(function (blobs) {
      var bytes = totalBlobBytes(blobs);
      var estimate = App.actions.backup.estimateSize(App.data, bytes);
      return App.ui.confirm({
        title: '导出备份',
        detail: '备份预计 ' + fmt.fileSize(estimate) + '，将保存为 ZIP 文件（含全部文字与原始附件）。',
        okText: '开始导出'
      });
    }).then(function (ok) {
      if (!ok) return false;
      return App.actions.backup.exportBackup(db, App.data).then(function (out) {
        download(out.blob, out.fileName);
        App.data.settings.lastExportAt = fmt.today();
        App.saveQuiet();
        App.ui.toast('备份已导出');
        return true;
      });
    }).catch(function () {
      App.ui.toast('导出失败，请重试');
      return false;
    });
  }

  /* ---------------- 导入 ---------------- */

  function importBackup(file) {
    if (!file) return Promise.resolve(false);
    var db = App.store.db;
    if (!db) {
      App.ui.toast('存储尚未就绪');
      return Promise.resolve(false);
    }
    return App.actions.backup.readBackup(file).then(function (bundle) {
      return App.ui.confirm({
        title: '导入备份',
        detail: '导入将覆盖当前全部数据（项目、预算、明细、日记、节点、随笔与文件）。是否继续？',
        okText: '覆盖导入',
        danger: true
      }).then(function (ok) {
        if (!ok) return false;
        return App.actions.backup.applyBackup(db, bundle).then(function (data) {
          App.data = data;
          App.data.settings.storageBackend = db.backend;
          App.refresh();
          App.ui.toast('备份已导入');
          return true;
        }, function () {
          App.ui.toast('导入失败，请重试');
          return false;
        });
      });
    }, function () {
      App.ui.toast('备份文件无法识别');
      return false;
    });
  }

  /* ---------------- 清空 ---------------- */

  function clearData() {
    var db = App.store.db;
    if (!db) {
      App.ui.toast('存储尚未就绪');
      return Promise.resolve(false);
    }
    return App.ui.confirm({
      title: '清空所有数据？',
      detail: '将清空支出明细、待办、日记、验收节点、随笔与资料仓库文件；项目信息与预算设置会保留。此操作不可撤销。',
      okText: '清空数据',
      danger: true
    }).then(function (ok) {
      if (!ok) return false;
      return App.actions.backup.clearAll(db, App.data).then(function (data) {
        App.data = data;
        App.data.settings.storageBackend = db.backend;
        App.refresh();
        App.ui.toast('数据已清空');
        return true;
      });
    }).catch(function () {
      App.ui.toast('清空失败，请重试');
      return false;
    });
  }

  /* ---------------- 挂载 ---------------- */

  function mount(container) {
    var fileInput = container.querySelector('[data-role="backup-file"]');

    container.onclick = function (e) {
      var btn = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      if (act === 'back') {
        if (!App.router.goBack()) App.router.switchTab('more');
      } else if (act === 'open-budget') {
        App.router.go('budget');
      } else if (act === 'open-nodes') {
        App.pages.log.setTab('nodes');
        App.router.switchTab('log');
      } else if (act === 'export') {
        exportBackup();
      } else if (act === 'import') {
        if (fileInput) fileInput.click();
      } else if (act === 'clear') {
        clearData();
      }
    };

    container.onchange = function (e) {
      var input = e.target;
      if (!input || input.getAttribute('data-role') !== 'backup-file') return;
      var file = input.files && input.files[0];
      input.value = '';
      if (file) importBackup(file);
    };
  }

  App.pages.settings = {
    render: render,
    mount: mount,
    exportBackup: exportBackup,
    importBackup: importBackup,
    clearData: clearData
  };
})(window);
