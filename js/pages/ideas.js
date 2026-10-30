(function (global) {
  'use strict';
  var App = global.App = global.App || {};
  App.pages = App.pages || {};
  var fmt = App.format;

  function esc(s) { return App.ui.esc(s); }

  var state = { folderId: '' };
  var liveUrls = [];

  function revokeUrls() {
    liveUrls.forEach(function (u) { try { URL.revokeObjectURL(u); } catch (e) {} });
    liveUrls = [];
  }

  function hydrate(root, urls) {
    var imgs = root.querySelectorAll ? root.querySelectorAll('[data-file-id]') : [];
    Array.prototype.forEach.call(imgs, function (img) {
      var id = img.getAttribute('data-file-id');
      if (!id || !App.store || !App.store.db) return;
      App.store.db.getBlob(id).then(function (blob) {
        if (!blob) return;
        var url = URL.createObjectURL(blob);
        (urls || []).push(url);
        img.src = url;
      }).catch(function () {});
    });
  }

  /* ---------------- 页面 ---------------- */

  function head(data) {
    var count = (data.ideas || []).length;
    return '<div class="page-head">' +
        '<button class="icon-btn plain" type="button" data-act="back" aria-label="返回">' +
          App.icons.svg('back', 18) + '</button>' +
        '<div class="head-main">' +
          '<h1>随心记</h1>' +
          '<div class="sub">' + (count ? '共 ' + count + ' 条收藏' : '收藏链接与装修灵感') + '</div>' +
        '</div>' +
        '<div class="head-actions">' +
          '<button class="icon-btn plain" type="button" data-act="manage-folders" aria-label="管理文件夹">' +
            App.icons.svg('folder', 18) + '</button>' +
          '<button class="btn primary sm" type="button" data-act="add-idea">' +
            App.icons.svg('plus', 14) + '新建</button>' +
        '</div>' +
      '</div>';
  }

  function folderBar(data) {
    var chips = '<button class="chip' + (state.folderId === '' ? ' active' : '') +
      '" type="button" data-act="folder" data-folder="">全部</button>' +
      (data.folders || []).map(function (f) {
        return '<button class="chip' + (state.folderId === f.id ? ' active' : '') +
          '" type="button" data-act="folder" data-folder="' + esc(f.id) + '">' +
          esc(f.name) + '</button>';
      }).join('');
    return '<div class="sec"><div class="filter-row">' + chips +
        '<button class="chip chip-add" type="button" data-act="add-folder">' +
          App.icons.svg('plus', 12) + '新建文件夹</button>' +
      '</div></div>';
  }

  function card(idea) {
    var photos = idea.photos || [];
    var cover = photos.length
      ? '<div class="idea-cover"><img data-file-id="' + esc(photos[0]) + '" alt=""></div>'
      : '';
    var source = idea.url
      ? App.icons.svg('link', 13) + '<span>' + esc(App.actions.idea.domain(idea.url) || idea.url) + '</span>'
      : App.icons.svg('file', 13) + '<span>无链接</span>';
    var folder = App.actions.folder.nameOf(App.data || {}, idea.folderId);
    return '<div class="idea-card" data-act="open-idea" data-id="' + esc(idea.id) + '">' +
        cover +
        '<div class="idea-body">' +
          '<div class="idea-title">' + esc(idea.title) + '</div>' +
          '<div class="idea-source">' + source + '</div>' +
          (idea.text ? '<div class="idea-text">' + esc(App.actions.idea.excerpt(idea.text, 70)) + '</div>' : '') +
          '<div class="idea-foot">' +
            (folder ? '<span class="tag-pill">' + esc(folder) + '</span>' : '') +
            '<span class="idea-date">' + esc(fmt.dateCN(idea.createdAt)) + '</span>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function listSection(data) {
    var list = App.actions.idea.listByFolder(data, state.folderId);
    if (!list.length) {
      var hasAny = (data.ideas || []).length > 0;
      return '<div class="sec">' + App.ui.emptyHTML({
        icon: 'sparkle',
        text: hasAny ? '这个文件夹还没有内容' : '还没有收藏内容',
        btn: '新建随笔'
      }) + '</div>';
    }
    return '<div class="sec"><div class="list">' + list.map(card).join('') + '</div></div>';
  }

  function render() {
    var data = App.data || {};
    return head(data) + folderBar(data) + listSection(data);
  }

  /* ---------------- 详情弹层 ---------------- */

  function detailHTML(idea) {
    if (!idea) return '<div class="mini-empty">随笔不存在</div>';
    var photos = idea.photos || [];
    var photoHTML = photos.length
      ? '<div class="node-photos">' + photos.map(function (id, i) {
          return '<button class="photo-thumb" type="button" data-act="preview" data-index="' + i + '">' +
            '<img data-file-id="' + esc(id) + '" alt=""></button>';
        }).join('') + '</div>'
      : '';
    return '<div class="idea-detail">' +
        '<div class="idea-detail-title">' + esc(idea.title) + '</div>' +
        '<div class="idea-source">' + (idea.url
          ? App.icons.svg('link', 13) + '<span>' + esc(idea.url) + '</span>'
          : App.icons.svg('file', 13) + '<span>无链接</span>') + '</div>' +
        '<div class="idea-detail-meta">' + esc(fmt.dateCN(idea.createdAt)) +
          ' · ' + esc(App.actions.folder.nameOf(App.data || {}, idea.folderId) || '未分类') + '</div>' +
        (idea.text ? '<div class="card flat detail-body idea-detail-body">' + esc(idea.text) + '</div>' : '') +
        photoHTML +
        (idea.url
          ? '<div class="sheet-foot"><button class="btn primary block" type="button" data-act="open-url" data-url="' +
            esc(idea.url) + '">打开链接</button></div>'
          : '') +
      '</div>';
  }

  function openDetail(id) {
    App.ui.openSheet('idea-detail', { ideaId: id });
  }

  /* ---------------- 新建随笔弹层 ---------------- */

  function createSheet() {
    var data = App.data || {};
    var folders = data.folders || [];
    var defaultFolder = state.folderId && App.actions.folder.byId(data, state.folderId)
      ? state.folderId
      : (folders[0] ? folders[0].id : '');

    return {
      title: '新建随笔',
      html:
        '<div class="field" data-field="title">' +
          '<label for="id-title">标题</label>' +
          '<input class="input" id="id-title" maxlength="60" placeholder="例如：小户型收纳灵感合集">' +
          '<div class="err-text" data-role="err-title" hidden></div>' +
        '</div>' +
        '<div class="field" data-field="url">' +
          '<label for="id-url">链接（选填）</label>' +
          '<input class="input" id="id-url" maxlength="300" placeholder="https://">' +
          '<div class="err-text" data-role="err-url" hidden></div>' +
        '</div>' +
        '<div class="field">' +
          '<label for="id-text">内容或备注（选填）</label>' +
          '<textarea class="textarea" id="id-text" rows="3" maxlength="600" placeholder="记下打动你的细节…"></textarea>' +
        '</div>' +
        '<div class="field" data-field="folder">' +
          '<label for="id-folder">所属文件夹</label>' +
          '<select class="select" id="id-folder">' +
            folders.map(function (f) {
              return '<option value="' + esc(f.id) + '"' +
                (f.id === defaultFolder ? ' selected' : '') + '>' + esc(f.name) + '</option>';
            }).join('') +
          '</select>' +
          '<div class="err-text" data-role="err-folder" hidden></div>' +
        '</div>' +
        '<div class="field">' +
          '<label>图片（选填，可多张）</label>' +
          '<input type="file" id="id-file" accept="image/*" multiple hidden>' +
          '<div class="photo-grid" data-role="photos">' +
            '<button class="photo-add" type="button" data-act="pick-photo">' +
              App.icons.svg('camera', 18) + '<span>添加图片</span></button>' +
          '</div>' +
        '</div>' +
        '<div class="sheet-foot"><button class="btn primary block" type="button" data-act="save-idea">保存</button></div>',
      onMount: function (body, close) {
        var titleInput = body.querySelector('#id-title');
        var urlInput = body.querySelector('#id-url');
        var textInput = body.querySelector('#id-text');
        var folderSelect = body.querySelector('#id-folder');
        var fileInput = body.querySelector('#id-file');
        var photoBox = body.querySelector('[data-role="photos"]');
        var saveBtn = body.querySelector('[data-act="save-idea"]');
        var draft = [];

        function showErr(field, msg) {
          var wrap = body.querySelector('[data-field="' + field + '"]');
          var err = body.querySelector('[data-role="err-' + field + '"]');
          if (wrap) wrap.classList.add('invalid');
          if (err) { err.hidden = false; err.textContent = msg; }
        }

        function clearErr(field) {
          var wrap = body.querySelector('[data-field="' + field + '"]');
          var err = body.querySelector('[data-role="err-' + field + '"]');
          if (wrap) wrap.classList.remove('invalid');
          if (err) { err.hidden = true; err.textContent = ''; }
        }

        function paint() {
          photoBox.innerHTML = draft.map(function (item, i) {
            return '<div class="photo-item">' +
                '<img src="' + esc(item.url) + '" alt="">' +
                '<button class="photo-remove" type="button" data-act="remove-photo" data-index="' + i + '" aria-label="移除图片">' +
                  App.icons.svg('close', 12) + '</button>' +
              '</div>';
          }).join('') +
            '<button class="photo-add" type="button" data-act="pick-photo">' +
              App.icons.svg('camera', 18) + '<span>' + (draft.length ? '继续添加' : '添加图片') + '</span></button>';
        }

        body.onclick = function (e) {
          var btn = e.target.closest ? e.target.closest('[data-act]') : null;
          if (!btn) return;
          var act = btn.getAttribute('data-act');
          if (act === 'pick-photo') {
            if (fileInput) fileInput.click();
          } else if (act === 'remove-photo') {
            var idx = Number(btn.getAttribute('data-index'));
            var item = draft[idx];
            if (item) {
              try { URL.revokeObjectURL(item.url); } catch (err) {}
              draft.splice(idx, 1);
              paint();
            }
          } else if (act === 'save-idea') {
            ['title', 'url', 'folder'].forEach(clearErr);
            var v = App.actions.idea.validate({
              title: titleInput ? titleInput.value : '',
              url: urlInput ? urlInput.value : '',
              text: textInput ? textInput.value : '',
              folderId: folderSelect ? folderSelect.value : ''
            });
            if (!v.ok) {
              showErr(v.field, v.msg);
              return;
            }
            saveBtn.disabled = true;
            saveBtn.textContent = '保存中…';
            var files = draft.map(function (x) { return x.file; });
            App.actions.diary.uploadPhotos(App.store.db, App.data, files)
              .then(function (records) {
                var r = App.actions.idea.add(App.data, {
                  title: v.title,
                  url: v.url,
                  text: v.text,
                  folderId: v.folderId,
                  photos: records.map(function (rec) { return rec.id; })
                });
                if (!r.ok) throw new Error(r.msg);
                state.folderId = r.idea.folderId;
                App.saveQuiet();
                draft.forEach(function (x) { try { URL.revokeObjectURL(x.url); } catch (err) {} });
                draft = [];
                close();
                App.refresh();
                App.ui.toast('随笔已保存');
              })
              .catch(function () {
                saveBtn.disabled = false;
                saveBtn.textContent = '保存';
                App.ui.toast('图片保存失败，请重试');
              });
          }
        };

        if (fileInput) {
          fileInput.onchange = function () {
            Array.prototype.forEach.call(fileInput.files || [], function (file) {
              if (!file || !String(file.type || '').match(/^image\//)) return;
              draft.push({ file: file, url: URL.createObjectURL(file) });
            });
            fileInput.value = '';
            paint();
          };
        }
      }
    };
  }

  /* ---------------- 文件夹弹层 ---------------- */

  function folderNameSheet(ctx) {
    var isEdit = !!(ctx && ctx.folderId);
    var current = isEdit ? App.actions.folder.byId(App.data || {}, ctx.folderId) : null;

    return {
      title: isEdit ? '重命名文件夹' : '新建文件夹',
      html:
        '<div class="field" data-field="name">' +
          '<label for="fd-name">文件夹名称</label>' +
          '<input class="input" id="fd-name" maxlength="12" value="' +
            esc(current ? current.name : '') + '" placeholder="例如：收纳">' +
          '<div class="err-text" data-role="err-name" hidden></div>' +
        '</div>' +
        '<div class="sheet-foot"><button class="btn primary block" type="button" data-act="save-folder">保存</button></div>',
      onMount: function (body, close) {
        var input = body.querySelector('#fd-name');
        var saveBtn = body.querySelector('[data-act="save-folder"]');
        var err = body.querySelector('[data-role="err-name"]');

        saveBtn.onclick = function () {
          var r = isEdit
            ? App.actions.folder.rename(App.data, ctx.folderId, input ? input.value : '')
            : App.actions.folder.add(App.data, input ? input.value : '');
          if (!r.ok) {
            var wrap = body.querySelector('[data-field="name"]');
            if (wrap) wrap.classList.add('invalid');
            if (err) { err.hidden = false; err.textContent = r.msg; }
            return;
          }
          if (!isEdit) state.folderId = r.folder.id;
          App.saveQuiet();
          close();
          App.refresh();
          App.ui.toast(isEdit ? '文件夹已重命名' : '文件夹已创建');
        };
      }
    };
  }

  function manageSheet() {
    var data = App.data || {};
    var folders = data.folders || [];
    var rows = folders.map(function (f) {
      var count = App.actions.folder.countIdeas(data, f.id);
      return '<div class="folder-row">' +
          '<div class="grow">' +
            '<div class="folder-name">' + esc(f.name) + '</div>' +
            '<div class="folder-count">' + count + ' 条内容</div>' +
          '</div>' +
          '<button class="icon-btn plain" type="button" data-act="edit-folder" data-id="' + esc(f.id) +
            '" aria-label="重命名">' + App.icons.svg('edit', 16) + '</button>' +
          '<button class="icon-btn plain folder-del" type="button" data-act="del-folder" data-id="' + esc(f.id) +
            '" aria-label="删除文件夹">' + App.icons.svg('trash', 16) + '</button>' +
        '</div>';
    }).join('');

    return {
      title: '管理文件夹',
      html: '<div class="folder-list">' + (rows || '<div class="mini-empty">还没有文件夹</div>') + '</div>' +
        '<div class="sheet-foot"><button class="btn ghost block" type="button" data-act="new-folder">' +
          App.icons.svg('plus', 14) + '新建文件夹</button></div>',
      onMount: function (body) {
        body.onclick = function (e) {
          var btn = e.target.closest ? e.target.closest('[data-act]') : null;
          if (!btn) return;
          var act = btn.getAttribute('data-act');
          if (act === 'new-folder') {
            App.ui.openSheet('folder-name', {});
          } else if (act === 'edit-folder') {
            App.ui.openSheet('folder-name', { folderId: btn.getAttribute('data-id') });
          } else if (act === 'del-folder') {
            var id = btn.getAttribute('data-id');
            var f = App.actions.folder.byId(App.data, id);
            if (!f) return;
            var blocked = App.actions.folder.countIdeas(App.data, id) > 0;
            App.ui.confirm({
              title: '删除文件夹',
              detail: blocked
                ? '“' + f.name + '”下还有内容，需先移走才能删除。'
                : '“' + f.name + '”删除后不可恢复。',
              okText: '删除',
              danger: true
            }).then(function (ok) {
              if (!ok) return;
              var r = App.actions.folder.remove(App.data, id);
              if (!r.ok) {
                App.ui.toast(r.msg, 2600);
                return;
              }
              if (state.folderId === id) state.folderId = '';
              App.saveQuiet();
              App.refresh();
              App.ui.toast('文件夹已删除');
            });
          }
        };
      }
    };
  }

  function detailSheet(ctx) {
    var idea = App.actions.idea.byId(App.data || {}, ctx.ideaId);
    return {
      title: '随笔详情',
      html: detailHTML(idea),
      onMount: function (body) {
        hydrate(body, []);
        var photos = idea ? (idea.photos || []) : [];
        body.onclick = function (e) {
          var btn = e.target.closest ? e.target.closest('[data-act]') : null;
          if (!btn) return;
          var act = btn.getAttribute('data-act');
          if (act === 'open-url') {
            var url = btn.getAttribute('data-url');
            if (url) window.open(url, '_blank');
          } else if (act === 'preview') {
            var index = Number(btn.getAttribute('data-index')) || 0;
            if (!photos.length || !App.store || !App.store.db) return;
            Promise.all(photos.map(function (pid) {
              return App.store.db.getBlob(pid).then(function (b) { return b || null; }, function () { return null; });
            })).then(function (blobs) {
              var urls = blobs.map(function (b) { return b ? URL.createObjectURL(b) : ''; }).filter(Boolean);
              if (!urls.length) return;
              App.ui.openPreview(urls, index, function () {
                urls.forEach(function (u) { try { URL.revokeObjectURL(u); } catch (err) {} });
              });
            });
          }
        };
      }
    };
  }

  App.ui.registerSheet('idea-create', createSheet);
  App.ui.registerSheet('idea-detail', detailSheet);
  App.ui.registerSheet('folder-name', folderNameSheet);
  App.ui.registerSheet('folder-manage', manageSheet);

  function openCreate() {
    App.ui.openSheet('idea-create', {});
  }

  /* ---------------- 挂载 ---------------- */

  function mount(container) {
    revokeUrls();
    hydrate(container, liveUrls);
    container.onclick = function (e) {
      var btn = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      if (act === 'back') {
        if (!App.router.goBack()) App.router.switchTab('more');
      } else if (act === 'folder') {
        state.folderId = btn.getAttribute('data-folder') || '';
        App.refresh();
      } else if (act === 'add-idea' || act === 'empty') {
        openCreate();
      } else if (act === 'add-folder') {
        App.ui.openSheet('folder-name', {});
      } else if (act === 'manage-folders') {
        App.ui.openSheet('folder-manage', {});
      } else if (act === 'open-idea') {
        openDetail(btn.getAttribute('data-id'));
      }
    };
  }

  App.pages.ideas = {
    render: render,
    mount: mount,
    renderDetail: function (id) { return detailHTML(App.actions.idea.byId(App.data || {}, id)); },
    openCreate: openCreate,
    setFolder: function (id) { state.folderId = id || ''; },
    getFolder: function () { return state.folderId; }
  };
})(window);
