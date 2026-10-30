(function (global) {
  'use strict';
  var App = global.App = global.App || {};
  App.pages = App.pages || {};
  var fmt = App.format;

  function esc(s) { return App.ui.esc(s); }

  var KIND_ICON = { img: 'image', doc: 'file', sheet: 'list', deck: 'chart', cad: 'grid', other: 'file' };

  var state = { kind: 'all', keyword: '' };

  function shortSize(bytes) {
    return fmt.fileSize(bytes || 0);
  }

  function head(data) {
    var files = data.files || [];
    return '<div class="page-head">' +
        '<button class="icon-btn plain" type="button" data-act="back" aria-label="返回">' +
          App.icons.svg('back', 18) + '</button>' +
        '<div class="head-main">' +
          '<h1>资料仓库</h1>' +
          '<div class="sub">' + files.length + ' 个文件 · 已用 ' +
            esc(shortSize(App.actions.file.totalSize(files))) + '</div>' +
        '</div>' +
        '<button class="btn primary sm" type="button" data-act="upload">' +
          App.icons.svg('upload', 14) + '上传</button>' +
      '</div>';
  }

  function capacitySection(data) {
    var u = App.actions.file.usage(data.files || []);
    return '<div class="sec">' +
        '<div class="card">' +
          '<div class="row">' +
            '<div class="grow node-label">仓库容量</div>' +
            '<span class="cap-num num">' + u.percent + '%</span>' +
          '</div>' +
          '<div class="bar thick node-bar' + (u.percent >= 80 ? ' warn' : '') + '">' +
            '<i style="width:' + u.percent + '%"></i></div>' +
          '<div class="cap-sub">已用 ' + esc(shortSize(u.bytes)) +
            ' / 1 GB · 剩余 ' + esc(shortSize(u.remaining)) + '</div>' +
          (u.warn
            ? '<div class="cap-warn">' + App.icons.svg('warning', 15) +
              '<span>容量已使用 80% 以上，建议清理不常用的文件</span></div>'
            : '') +
        '</div>' +
      '</div>';
  }

  function searchSection() {
    return '<div class="sec">' +
        '<div class="search-wrap">' +
          '<span class="search-ico">' + App.icons.svg('search', 16) + '</span>' +
          '<input class="input search-input" data-role="search" type="search" placeholder="搜索文件名" value="' +
            esc(state.keyword) + '">' +
        '</div>' +
        '<div class="filter-row">' +
          App.actions.file.KINDS.map(function (k) {
            return '<button class="chip' + (state.kind === k.id ? ' active' : '') +
              '" type="button" data-act="filter" data-kind="' + k.id + '">' + k.label + '</button>';
          }).join('') +
        '</div>' +
      '</div>';
  }

  function fileRow(f) {
    return '<div class="file-row" data-act="open-file" data-id="' + esc(f.id) +
        '" data-kind="' + esc(f.kind) + '">' +
        '<span class="file-ico kind-' + esc(f.kind) + '">' +
          App.icons.svg(KIND_ICON[f.kind] || 'file', 19) + '</span>' +
        '<div class="file-main">' +
          '<div class="file-name ellipsis">' + esc(f.name) + '</div>' +
          '<div class="file-meta">' + esc(shortSize(f.size)) + ' · ' +
            esc(fmt.dateCN(f.addedAt)) + '</div>' +
        '</div>' +
        '<button class="icon-btn plain file-del" type="button" data-act="delete-file" data-id="' +
          esc(f.id) + '" aria-label="删除文件">' + App.icons.svg('trash', 16) + '</button>' +
      '</div>';
  }

  function listSection(data) {
    var list = App.actions.file.query(data, state);
    var body;
    if (!list.length) {
      body = App.ui.emptyHTML({
        icon: 'file',
        text: (data.files || []).length ? '没有找到匹配的文件' : '还没有上传资料',
        btn: (data.files || []).length ? '' : '上传文件'
      });
    } else {
      body = '<div class="list">' + list.map(fileRow).join('') + '</div>';
    }
    return '<div class="sec" data-role="file-list">' + body + '</div>';
  }

  function render() {
    var data = App.data || {};
    return head(data) + capacitySection(data) + searchSection() + listSection(data) +
      '<input type="file" data-role="file-input" multiple hidden>';
  }

  function uploadFiles(files) {
    var list = Array.prototype.slice.call(files || []);
    if (!list.length) return;
    var v = App.actions.file.validateUpload(App.data, list);
    if (!v.ok) {
      App.ui.toast(v.msg, 3000);
      return;
    }
    var pending = list.map(function (f) {
      var r = App.actions.file.add(App.data, {
        name: f.name || '未命名文件',
        size: f.size,
        mime: f.type || ''
      });
      return { file: f, record: r.file };
    });
    var chain = Promise.resolve();
    pending.forEach(function (p) {
      chain = chain.then(function () {
        return App.store.db.putBlob(p.record.id, p.file);
      });
    });
    chain.then(function () {
      App.saveQuiet();
      App.refresh();
      App.ui.toast('已上传 ' + pending.length + ' 个文件');
    }).catch(function () {
      pending.forEach(function (p) { App.actions.file.remove(App.data, p.record.id); });
      App.refresh();
      App.ui.toast('文件未能保存，请重试', 2600);
    });
  }

  function previewFile(id) {
    if (!App.store || !App.store.db) return;
    App.store.db.getBlob(id).then(function (blob) {
      if (!blob) {
        App.ui.toast('文件不存在');
        return;
      }
      var url = URL.createObjectURL(blob);
      App.ui.openPreview([url], 0, function () {
        try { URL.revokeObjectURL(url); } catch (e) {}
      });
    }).catch(function () {
      App.ui.toast('文件无法读取');
    });
  }

  function confirmDelete(id) {
    var f = (App.data.files || []).filter(function (x) { return x.id === id; })[0];
    if (!f) return;
    App.ui.confirm({
      title: '删除文件',
      detail: '“' + f.name + '”删除后无法恢复。',
      okText: '删除',
      danger: true
    }).then(function (ok) {
      if (!ok) return;
      if (App.store && App.store.db) {
        App.store.db.deleteBlob(id).catch(function () {});
      }
      App.actions.file.remove(App.data, id);
      App.saveQuiet();
      App.refresh();
      App.ui.toast('文件已删除');
    });
  }

  function mount(container) {
    var fileInput = container.querySelector('[data-role="file-input"]');
    if (fileInput) {
      fileInput.onchange = function () {
        var files = Array.prototype.slice.call(fileInput.files || []);
        fileInput.value = '';
        uploadFiles(files);
      };
    }

    container.oninput = function (e) {
      var input = e.target;
      if (!input || input.getAttribute('data-role') !== 'search') return;
      state.keyword = input.value || '';
      var box = container.querySelector('[data-role="file-list"]');
      if (box) box.outerHTML = listSection(App.data || {});
    };

    container.onclick = function (e) {
      var btn = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      if (act === 'back') {
        if (!App.router.goBack()) App.router.switchTab('more');
      } else if (act === 'upload' || act === 'empty') {
        if (fileInput) fileInput.click();
      } else if (act === 'filter') {
        state.kind = btn.getAttribute('data-kind') || 'all';
        App.refresh();
      } else if (act === 'delete-file') {
        confirmDelete(btn.getAttribute('data-id'));
      } else if (act === 'open-file') {
        var kind = btn.getAttribute('data-kind');
        if (kind !== 'img') {
          App.ui.toast('该文件类型暂不支持预览');
          return;
        }
        previewFile(btn.getAttribute('data-id'));
      }
    };
  }

  App.pages.warehouse = {
    render: render,
    mount: mount,
    setFilter: function (kind, keyword) {
      state.kind = kind || 'all';
      state.keyword = typeof keyword === 'string' ? keyword : '';
    },
    getFilter: function () { return { kind: state.kind, keyword: state.keyword }; }
  };
})(window);
