(function (global) {
  'use strict';
  var App = global.App = global.App || {};
  App.pages = App.pages || {};
  var fmt = App.format;

  function esc(s) { return App.ui.esc(s); }

  function pad2(n) {
    var v = n + 1;
    return v < 10 ? '0' + v : String(v);
  }

  function statusBadge(node) {
    if (node.status === 'done') return '<span class="badge green">已完成</span>';
    if (node.status === 'doing') return '<span class="badge amber">进行中</span>';
    return '<span class="badge gray">未开始</span>';
  }

  function statusText(node) {
    return App.actions.node.statusText(node.status);
  }

  /* ---------------- 节点列表 ---------------- */

  function summary(data) {
    var np = App.actions.node.progress(data);
    return '<div class="sec">' +
        '<div class="card node-hero">' +
          '<div class="row">' +
            '<div class="grow node-label">整体进度</div>' +
            '<span class="node-count num">' + np.done + ' / ' + np.total + '</span>' +
          '</div>' +
          '<div class="bar thick node-bar"><i style="width:' + np.percent + '%"></i></div>' +
          '<div class="hint node-hint">节点顺序按施工流程排列，自定义节点可插在任意两个节点之间。</div>' +
        '</div>' +
      '</div>';
  }

  function nodeRow(node, index) {
    var np = App.actions.node.nodeProgress(node);
    var meta = np.total + ' 项检查' + (np.total ? ' · 已勾选 ' + np.done + ' / ' + np.total : '');
    return '<div class="node-row" data-act="open-node" data-id="' + esc(node.id) + '">' +
        '<span class="node-seq ' + esc(node.status) + '">' + pad2(index) + '</span>' +
        '<div class="node-main">' +
          '<div class="node-line">' +
            '<span class="node-name ellipsis">' + esc(node.name) + '</span>' +
            (node.builtin ? '' : '<span class="tag-pill">自定义</span>') +
          '</div>' +
          '<div class="node-meta">' + esc(meta) + (node.date ? ' · ' + esc(fmt.dateCN(node.date)) : '') + '</div>' +
        '</div>' +
        '<div class="node-right">' +
          statusBadge(node) +
          (node.builtin
            ? ''
            : '<button class="icon-btn plain node-del" type="button" data-act="delete-node" data-id="' +
              esc(node.id) + '" aria-label="删除节点">' + App.icons.svg('trash', 16) + '</button>') +
        '</div>' +
      '</div>';
  }

  function renderBody(data) {
    data = data || App.data || {};
    var nodes = data.nodes || [];
    var rows = nodes.map(nodeRow).join('');
    return summary(data) +
      '<div class="sec node-list"><div class="list">' + rows + '</div></div>' +
      '<div class="sec">' +
        '<button class="btn ghost block node-add" type="button" data-act="add-node">' +
          App.icons.svg('plus', 16) + '新增自定义节点</button>' +
      '</div>';
  }

  /* ---------------- 操作 ---------------- */

  function openAddNode() {
    App.ui.openSheet('node-add', {});
  }

  function confirmDeleteNode(id) {
    var node = App.actions.node.get(App.data, id);
    if (!node) return;
    App.ui.confirm({
      title: '删除节点',
      detail: '“' + node.name + '”删除后，检查清单会一并删除。',
      okText: '删除节点',
      danger: true
    }).then(function (ok) {
      if (!ok) return;
      var r = App.actions.node.removeCustom(App.data, id);
      if (!r.ok) {
        App.ui.toast(r.msg);
        return;
      }
      App.saveQuiet();
      App.refresh();
      App.ui.toast('节点已删除');
    });
  }

  /** 列表页动作委托；返回 true 表示已处理 */
  function handleAction(act, btn) {
    if (act === 'add-node') {
      openAddNode();
      return true;
    }
    if (act === 'open-node') {
      App.router.go('nodeDetail', btn.getAttribute('data-id'));
      return true;
    }
    if (act === 'delete-node') {
      confirmDeleteNode(btn.getAttribute('data-id'));
      return true;
    }
    return false;
  }

  /* ---------------- 节点详情 ---------------- */

  function photosHTML(node, photos) {
    if (!photos.length) {
      return '<div class="mini-empty">还没有现场照片</div>';
    }
    var items = photos.map(function (id, i) {
      return '<button class="photo-thumb" type="button" data-act="photo" data-index="' + i + '">' +
          '<img data-file-id="' + esc(id) + '" alt=""></button>';
    }).join('');
    return '<div class="node-photos">' + items +
      '<button class="photo-add" type="button" data-act="add-photo">' +
        App.icons.svg('camera', 18) + '<span>上传照片</span></button></div>';
  }

  function checksHTML(node) {
    var checks = node.checks || [];
    if (!checks.length) {
      return '<div class="mini-empty">还没有检查项，点下面按钮添加</div>';
    }
    return '<div class="check-list">' + checks.map(function (c, i) {
      return '<div class="check-row' + (c.done ? ' on' : '') + '" data-act="toggle-check" data-index="' + i + '">' +
          '<span class="check-box' + (c.done ? ' on' : '') + '">' + App.icons.svg('check', 13) + '</span>' +
          '<div class="check-main">' +
            '<div class="check-text">' + esc(c.t) + '</div>' +
            (c.note ? '<div class="check-note">' + esc(c.note) + '</div>' : '') +
          '</div>' +
          '<button class="icon-btn plain check-del" type="button" data-act="delete-check" data-index="' + i + '" aria-label="删除检查项">' +
            App.icons.svg('trash', 15) + '</button>' +
        '</div>';
    }).join('') + '</div>';
  }

  function issuesHTML(node) {
    var issues = node.issues || [];
    if (!issues.length) return '<div class="mini-empty">暂无问题记录</div>';
    return issues.map(function (it) {
      return '<div class="issue-row">' +
          '<i class="issue-dot"></i>' +
          '<div class="grow">' +
            '<div class="issue-text">' + esc(it.text) + '</div>' +
            '<div class="issue-date">' + esc(fmt.dateCN(it.date)) + '</div>' +
          '</div>' +
        '</div>';
    }).join('');
  }

  function detailRender(id) {
    var data = App.data || {};
    var node = App.actions.node.get(data, id);
    var backHead = '<div class="page-head">' +
        '<button class="icon-btn plain" type="button" data-act="back" aria-label="返回">' +
          App.icons.svg('back', 18) + '</button>' +
        '<div class="head-main"><h1>验收节点</h1></div>' +
      '</div>';

    if (!node) {
      return backHead + '<div class="sec">' +
        App.ui.emptyHTML({ icon: 'todo', text: '节点不存在' }) + '</div>';
    }

    var np = App.actions.node.nodeProgress(node);
    var photos = node.photos || [];

    return '<div class="page-head">' +
        '<button class="icon-btn plain" type="button" data-act="back" aria-label="返回">' +
          App.icons.svg('back', 18) + '</button>' +
        '<div class="head-main">' +
          '<h1>' + esc(node.name) + '</h1>' +
          '<div class="sub">' + (node.builtin ? '标准节点' : '自定义节点') +
            ' · ' + statusText(node) +
            (node.date ? ' · ' + fmt.dateFull(node.date) : '') + '</div>' +
        '</div>' +
        statusBadge(node) +
      '</div>' +

      '<div class="sec">' +
        '<div class="card node-hero">' +
          '<div class="row">' +
            '<div class="grow node-label">检查进度</div>' +
            '<span class="node-count num">' + np.done + ' / ' + np.total + '</span>' +
          '</div>' +
          '<div class="node-prog">' +
            '<div class="bar thick"><i style="width:' + np.percent + '%"></i></div>' +
            '<b class="num">' + np.percent + '%</b>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="sec-head">' +
        '<h2>对照检查清单</h2>' +
        '<button class="more" type="button" data-act="add-check">添加检查项</button>' +
      '</div>' +
      '<div class="sec"><div class="card flat check-card">' + checksHTML(node) + '</div></div>' +

      '<div class="sec-head">' +
        '<h2>问题记录</h2>' +
        '<button class="more" type="button" data-act="add-issue">记录问题</button>' +
      '</div>' +
      '<div class="sec"><div class="card flat">' + issuesHTML(node) + '</div></div>' +

      '<div class="sec-head">' +
        '<h2>现场照片</h2>' +
        '<span class="muted node-photo-count">' + photos.length + ' 张</span>' +
      '</div>' +
      '<div class="sec">' + photosHTML(node, photos) +
        '<input type="file" data-role="node-file" accept="image/*" multiple hidden>' +
      '</div>' +

      (node.builtin
        ? ''
        : '<div class="sec"><button class="btn danger-ghost block" type="button" data-act="delete-node" data-id="' +
          esc(node.id) + '">删除节点</button></div>') +

      '<div class="sec"><div class="archive-note">' +
        App.icons.svg('lock', 15) +
        '<span>验收记录与照片仅保存在本机，未上传云端；清理浏览器数据会导致记录丢失，建议定期导出备份。</span>' +
      '</div></div>';
  }

  function detailMount(container, id) {
    var liveUrls = [];
    var data = App.data || {};
    var node = App.actions.node.get(data, id);
    var photos = node ? (node.photos || []).slice() : [];

    function hydrate() {
      var imgs = container.querySelectorAll ? container.querySelectorAll('[data-file-id]') : [];
      Array.prototype.forEach.call(imgs, function (img) {
        var fid = img.getAttribute('data-file-id');
        if (!fid || !App.store || !App.store.db) return;
        App.store.db.getBlob(fid).then(function (blob) {
          if (!blob) return;
          var url = URL.createObjectURL(blob);
          liveUrls.push(url);
          img.src = url;
        }).catch(function () {});
      });
    }

    function revokeAll() {
      liveUrls.forEach(function (u) { try { URL.revokeObjectURL(u); } catch (e) {} });
      liveUrls = [];
    }

    function openPhotos(index) {
      if (!photos.length || !App.store || !App.store.db) return;
      Promise.all(photos.map(function (pid) {
        return App.store.db.getBlob(pid).then(function (b) { return b || null; }, function () { return null; });
      })).then(function (blobs) {
        var urls = blobs.map(function (b) { return b ? URL.createObjectURL(b) : ''; }).filter(Boolean);
        if (!urls.length) return;
        App.ui.openPreview(urls, index, function () {
          urls.forEach(function (u) { try { URL.revokeObjectURL(u); } catch (e) {} });
        });
      });
    }

    function refreshNode() {
      return App.actions.node.get(App.data, id);
    }

    var fileInput = container.querySelector('[data-role="node-file"]');
    if (fileInput) {
      fileInput.onchange = function () {
        var files = Array.prototype.slice.call(fileInput.files || [])
          .filter(function (f) { return f && String(f.type || '').match(/^image\//); });
        fileInput.value = '';
        if (!files.length) return;
        var target = refreshNode();
        if (!target) return;
        App.actions.diary.uploadPhotos(App.store.db, App.data, files).then(function (records) {
          target.photos = Array.isArray(target.photos) ? target.photos : [];
          records.forEach(function (rec) { target.photos.push(rec.id); });
          return App.save();
        }).then(function () {
          App.refresh();
          App.ui.toast('照片已保存');
        }).catch(function () {
          App.ui.toast('照片保存失败，请重试');
        });
      };
    }

    container.onclick = function (e) {
      var btn = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      var index = Number(btn.getAttribute('data-index'));

      if (act === 'back') {
        if (!App.router.goBack()) App.router.switchTab('log');
        return;
      }

      var current = refreshNode();
      if (!current) return;

      if (act === 'toggle-check') {
        var r = App.actions.check.toggle(current, index);
        if (!r.ok) return;
        App.saveQuiet();
        App.refresh();
        if (current.status === 'done') App.ui.toast('节点已完成');
        return;
      }

      if (act === 'delete-check') {
        var checks = current.checks || [];
        if (checks.length <= 1) {
          App.ui.toast('至少保留一条检查项');
          return;
        }
        var target = checks[index];
        if (!target) return;
        App.ui.confirm({
          title: '删除检查项',
          detail: target.t,
          okText: '删除',
          danger: true
        }).then(function (ok) {
          if (!ok) return;
          var res = App.actions.check.remove(current, index);
          if (!res.ok) {
            App.ui.toast(res.msg);
            return;
          }
          App.saveQuiet();
          App.refresh();
          App.ui.toast('检查项已删除');
        });
        return;
      }

      if (act === 'add-check') {
        App.ui.openSheet('node-check', { nodeId: id });
        return;
      }

      if (act === 'add-issue') {
        App.ui.openSheet('node-issue', { nodeId: id });
        return;
      }

      if (act === 'add-photo') {
        if (fileInput) fileInput.click();
        return;
      }

      if (act === 'photo') {
        openPhotos(index);
        return;
      }

      if (act === 'delete-node') {
        App.ui.confirm({
          title: '删除节点',
          detail: '“' + current.name + '”删除后，检查清单会一并删除。',
          okText: '删除节点',
          danger: true
        }).then(function (ok) {
          if (!ok) return;
          var res = App.actions.node.removeCustom(App.data, id);
          if (!res.ok) {
            App.ui.toast(res.msg);
            return;
          }
          App.saveQuiet();
          revokeAll();
          if (!App.router.goBack()) App.router.switchTab('log');
          App.ui.toast('节点已删除');
        });
      }
    };

    hydrate();
    container._revokeNodeUrls = revokeAll;
  }

  /* ---------------- 弹层：新增节点 ---------------- */

  function addNodeSheet() {
    var nodes = (App.data && App.data.nodes) || [];
    var options = '<option value="last">放到最后</option>' +
      nodes.map(function (n) {
        return '<option value="' + esc(n.id) + '">在“' + esc(n.name) + '”之后</option>';
      }).join('');

    return {
      title: '新增验收节点',
      html:
        '<div class="field" data-field="name">' +
          '<label for="nd-name">节点名称</label>' +
          '<input class="input" id="nd-name" maxlength="20" placeholder="例如：美缝验收">' +
          '<div class="err-text" data-role="err-name" hidden></div>' +
        '</div>' +
        '<div class="field">' +
          '<label for="nd-pos">插入位置</label>' +
          '<select class="select" id="nd-pos">' + options + '</select>' +
        '</div>' +
        '<div class="field">' +
          '<label for="nd-checks">初始检查项（每行一条，选填）</label>' +
          '<textarea class="textarea" id="nd-checks" rows="4" placeholder="留空将自动生成 3 条通用检查项"></textarea>' +
          '<div class="hint">留空自动生成：材料与方案一致 / 施工工艺符合要求 / 现场已拍照存档</div>' +
        '</div>' +
        '<div class="sheet-foot"><button class="btn primary block" type="button" data-act="save-node">保存</button></div>',
      onMount: function (body, close) {
        var nameInput = body.querySelector('#nd-name');
        var posSelect = body.querySelector('#nd-pos');
        var checksInput = body.querySelector('#nd-checks');
        var saveBtn = body.querySelector('[data-act="save-node"]');
        var err = body.querySelector('[data-role="err-name"]');

        saveBtn.onclick = function () {
          var name = nameInput ? nameInput.value : '';
          var v = App.actions.node.insertCustom(App.data, {
            name: name,
            afterId: posSelect ? posSelect.value : 'last',
            checks: checksInput ? checksInput.value.split(/\r?\n/) : []
          });
          if (!v.ok) {
            var wrap = body.querySelector('[data-field="name"]');
            if (wrap) wrap.classList.add('invalid');
            if (err) { err.hidden = false; err.textContent = v.msg; }
            return;
          }
          if (err) { err.hidden = true; err.textContent = ''; }
          App.saveQuiet();
          close();
          App.refresh();
          App.ui.toast('已新增“' + v.node.name + '”');
        };
      }
    };
  }

  /* ---------------- 弹层：新增检查项 ---------------- */

  function addCheckSheet(ctx) {
    return {
      title: '添加检查项',
      html:
        '<div class="field" data-field="t">' +
          '<label for="ck-t">检查内容</label>' +
          '<input class="input" id="ck-t" maxlength="60" placeholder="例如：地砖无明显色差">' +
          '<div class="err-text" data-role="err-t" hidden></div>' +
        '</div>' +
        '<div class="field">' +
          '<label for="ck-note">备注（选填）</label>' +
          '<input class="input" id="ck-note" maxlength="80" placeholder="例如：检查平整度">' +
        '</div>' +
        '<div class="sheet-foot"><button class="btn primary block" type="button" data-act="save-check">保存</button></div>',
      onMount: function (body, close) {
        var tInput = body.querySelector('#ck-t');
        var noteInput = body.querySelector('#ck-note');
        var saveBtn = body.querySelector('[data-act="save-check"]');
        var err = body.querySelector('[data-role="err-t"]');

        saveBtn.onclick = function () {
          var node = App.actions.node.get(App.data, ctx.nodeId);
          if (!node) { close(); return; }
          var r = App.actions.check.add(node, {
            t: tInput ? tInput.value : '',
            note: noteInput ? noteInput.value : ''
          });
          if (!r.ok) {
            var wrap = body.querySelector('[data-field="t"]');
            if (wrap) wrap.classList.add('invalid');
            if (err) { err.hidden = false; err.textContent = r.msg; }
            return;
          }
          App.saveQuiet();
          close();
          App.refresh();
          App.ui.toast('检查项已添加');
        };
      }
    };
  }

  /* ---------------- 弹层：记录问题 ---------------- */

  function addIssueSheet(ctx) {
    return {
      title: '记录问题',
      html:
        '<div class="field" data-field="text">' +
          '<label for="is-text">问题内容</label>' +
          '<textarea class="textarea" id="is-text" rows="3" maxlength="200" placeholder="例如：卫生间门槛石挡水条偏薄"></textarea>' +
          '<div class="err-text" data-role="err-text" hidden></div>' +
        '</div>' +
        '<div class="sheet-foot"><button class="btn primary block" type="button" data-act="save-issue">保存</button></div>',
      onMount: function (body, close) {
        var textInput = body.querySelector('#is-text');
        var saveBtn = body.querySelector('[data-act="save-issue"]');
        var err = body.querySelector('[data-role="err-text"]');

        saveBtn.onclick = function () {
          var node = App.actions.node.get(App.data, ctx.nodeId);
          if (!node) { close(); return; }
          var r = App.actions.node.addIssue(node, textInput ? textInput.value : '');
          if (!r.ok) {
            var wrap = body.querySelector('[data-field="text"]');
            if (wrap) wrap.classList.add('invalid');
            if (err) { err.hidden = false; err.textContent = r.msg; }
            return;
          }
          App.saveQuiet();
          close();
          App.refresh();
          App.ui.toast('问题已记录');
        };
      }
    };
  }

  App.ui.registerSheet('node-add', addNodeSheet);
  App.ui.registerSheet('node-check', addCheckSheet);
  App.ui.registerSheet('node-issue', addIssueSheet);

  App.pages.nodes = {
    renderBody: renderBody,
    handleAction: handleAction,
    openAdd: openAddNode
  };

  App.pages.nodeDetail = { render: detailRender, mount: detailMount };
  App.pages['node-detail'] = App.pages.nodeDetail;
})(window);
