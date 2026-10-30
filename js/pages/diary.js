(function (global) {
  'use strict';
  var App = global.App = global.App || {};
  App.pages = App.pages || {};
  var fmt = App.format;

  function esc(s) { return App.ui.esc(s); }

  var TAGS = ['水电', '防水', '泥瓦', '木工', '软装', '踩坑'];

  var state = { tab: 'diary' };
  var liveUrls = [];

  function revokeUrls() {
    liveUrls.forEach(function (u) { try { URL.revokeObjectURL(u); } catch (e) {} });
    liveUrls = [];
  }

  function hydrate(root) {
    var imgs = root.querySelectorAll ? root.querySelectorAll('[data-file-id]') : [];
    Array.prototype.forEach.call(imgs, function (img) {
      var id = img.getAttribute('data-file-id');
      if (!id || !App.store || !App.store.db) return;
      App.store.db.getBlob(id).then(function (blob) {
        if (!blob) return;
        var url = URL.createObjectURL(blob);
        liveUrls.push(url);
        img.src = url;
        img.classList.add('loaded');
      }).catch(function () {});
    });
  }

  function head(data) {
    if (state.tab === 'nodes') {
      var np = App.actions.node.progress(data);
      return '<div class="page-head">' +
          '<div class="head-main">' +
            '<h1>日志</h1>' +
            '<div class="sub">验收节点 · 已完成 ' + np.done + ' / ' + np.total + '</div>' +
          '</div>' +
          '<button class="btn primary sm" type="button" data-act="add-node">' +
            App.icons.svg('plus', 14) + '新增</button>' +
        '</div>';
    }
    var count = (data.diaries || []).length;
    var sub = count ? '共 ' + count + ' 篇日记' : '记录施工过程与现场照片';
    return '<div class="page-head">' +
        '<div class="head-main">' +
          '<h1>日志</h1>' +
          '<div class="sub">' + esc(sub) + '</div>' +
        '</div>' +
        '<button class="btn primary sm" type="button" data-act="add-diary">' +
          App.icons.svg('plus', 14) + '写日记</button>' +
      '</div>';
  }

  function segSection() {
    return '<div class="seg-wrap"><div class="seg">' +
        '<button type="button" data-act="tab" data-tab="diary" class="' +
          (state.tab === 'diary' ? 'active' : '') + '">日记</button>' +
        '<button type="button" data-act="tab" data-tab="nodes" class="' +
          (state.tab === 'nodes' ? 'active' : '') + '">验收节点</button>' +
      '</div></div>';
  }

  function tagsHTML(tags, cls) {
    return (tags || []).map(function (t) {
      return '<span class="' + (cls || 'tag-pill') + '">' + esc(t) + '</span>';
    }).join('');
  }

  function diaryList(data) {
    var list = App.actions.diary.sorted(data);
    if (!list.length) {
      return '<div class="sec">' + App.ui.emptyHTML({
        icon: 'log', text: '还没有日记', btn: '写日记'
      }) + '</div>';
    }
    var rows = list.map(function (d) {
      var photos = d.photos || [];
      var cover = photos.length
        ? '<div class="log-cover"><img data-file-id="' + esc(photos[0]) + '" alt=""></div>'
        : '';
      return '<div class="diary-card log-card" data-act="open-diary" data-id="' + esc(d.id) + '">' +
          cover +
          '<div class="log-content">' +
            '<div class="log-meta">' +
              '<span>' + esc(fmt.dateCN(d.date)) + '</span>' +
              tagsHTML(d.tags, 'tag-pill') +
            '</div>' +
            '<div class="diary-title">' + esc(d.title) + '</div>' +
            '<div class="diary-text">' + esc(App.actions.diary.excerpt(d.text)) + '</div>' +
          '</div>' +
        '</div>';
    }).join('');
    return '<div class="sec log-list"><div class="list">' + rows + '</div></div>';
  }

  function render() {
    var data = App.data || {};
    return head(data) + segSection() +
      (state.tab === 'nodes'
        ? App.pages.nodes.renderBody(data)
        : diaryList(data));
  }

  /* ---------------- 详情页 ---------------- */

  function detailHead(d) {
    return '<div class="page-head">' +
        '<button class="icon-btn plain" type="button" data-act="back" aria-label="返回">' +
          App.icons.svg('back', 18) + '</button>' +
        '<div class="head-main">' +
          '<h1>日记详情</h1>' +
          '<div class="sub">' + esc(fmt.dateFull(d.date)) + '</div>' +
        '</div>' +
      '</div>';
  }

  function photosHTML(photos) {
    if (!photos.length) return '';
    var big = '<button class="photo-big" type="button" data-act="photo" data-index="0">' +
      '<img data-file-id="' + esc(photos[0]) + '" alt=""></button>';
    var rest = photos.slice(1).map(function (id, i) {
      return '<button class="photo-thumb" type="button" data-act="photo" data-index="' + (i + 1) + '">' +
        '<img data-file-id="' + esc(id) + '" alt=""></button>';
    }).join('');
    return '<div class="sec"><div class="detail-photos">' + big +
      (rest ? '<div class="photo-grid">' + rest + '</div>' : '') + '</div></div>';
  }

  function detailRender(id) {
    var data = App.data || {};
    var d = App.actions.diary.byId(data, id);
    if (!d) {
      return '<div class="page-head">' +
          '<button class="icon-btn plain" type="button" data-act="back" aria-label="返回">' +
            App.icons.svg('back', 18) + '</button>' +
          '<div class="head-main"><h1>日记详情</h1></div>' +
        '</div>' +
        '<div class="sec">' + App.ui.emptyHTML({ icon: 'log', text: '日记不存在' }) + '</div>';
    }
    var photos = d.photos || [];
    return detailHead(d) +
      '<div class="sec">' +
        '<div class="detail-title">' + esc(d.title) + '</div>' +
        '<div class="detail-meta">' + tagsHTML(d.tags) + '</div>' +
      '</div>' +
      photosHTML(photos) +
      '<div class="sec"><div class="card detail-body">' + esc(d.text) + '</div></div>' +
      '<div class="sec"><div class="archive-note">' +
        App.icons.svg('lock', 15) +
        '<span>归档说明：日记与照片仅保存在本机，未上传云端；清理浏览器数据会导致记录丢失，建议定期导出备份。</span>' +
      '</div></div>';
  }

  function detailMount(container, id) {
    hydrate(container);
    var data = App.data || {};
    var d = App.actions.diary.byId(data, id);
    var photos = d ? (d.photos || []) : [];

    function openPhotos(index) {
      if (!photos.length || !App.store || !App.store.db) return;
      Promise.all(photos.map(function (pid) {
        return App.store.db.getBlob(pid).then(function (blob) { return blob || null; }, function () { return null; });
      })).then(function (blobs) {
        var urls = blobs.map(function (blob) {
          return blob ? URL.createObjectURL(blob) : '';
        }).filter(Boolean);
        if (!urls.length) return;
        App.ui.openPreview(urls, index, function () {
          urls.forEach(function (u) { try { URL.revokeObjectURL(u); } catch (e) {} });
        });
      });
    }

    container.onclick = function (e) {
      var btn = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      if (act === 'back') {
        if (!App.router.goBack()) App.router.switchTab('log');
      } else if (act === 'photo') {
        var idx = Number(btn.getAttribute('data-index')) || 0;
        openPhotos(idx);
      }
    };
  }

  /* ---------------- 写日记弹层 ---------------- */

  function renderWriteSheet() {
    var tagChips = TAGS.map(function (t) {
      return '<button type="button" class="tag-chip" data-tag="' + esc(t) + '">' + esc(t) + '</button>';
    }).join('');

    return {
      title: '写日记',
      html:
        '<div class="field" data-field="title">' +
          '<label for="dy-title">标题</label>' +
          '<input class="input" id="dy-title" maxlength="60" placeholder="例如：水电开槽第一天">' +
          '<div class="err-text" data-role="err-title" hidden></div>' +
        '</div>' +
        '<div class="field" data-field="text">' +
          '<label for="dy-text">正文</label>' +
          '<textarea class="textarea" id="dy-text" rows="5" maxlength="2000" placeholder="今天工地发生了什么…"></textarea>' +
          '<div class="err-text" data-role="err-text" hidden></div>' +
        '</div>' +
        '<div class="field">' +
          '<label>标签（可多选）</label>' +
          '<div class="tag-grid">' + tagChips + '</div>' +
        '</div>' +
        '<div class="field">' +
          '<label>照片（选填）</label>' +
          '<input type="file" id="dy-file" accept="image/*" multiple hidden>' +
          '<div class="photo-grid" data-role="photos">' +
            '<button class="photo-add" type="button" data-act="pick-photo">' +
              App.icons.svg('camera', 18) + '<span>添加照片</span></button>' +
          '</div>' +
        '</div>' +
        '<div class="sheet-foot"><button class="btn primary block" type="button" data-act="save-diary">保存</button></div>',
      onMount: function (body, close) {
        var titleInput = body.querySelector('#dy-title');
        var textInput = body.querySelector('#dy-text');
        var fileInput = body.querySelector('#dy-file');
        var photoBox = body.querySelector('[data-role="photos"]');
        var addBtn = body.querySelector('[data-act="pick-photo"]');
        var saveBtn = body.querySelector('[data-act="save-diary"]');
        var selectedTags = [];
        var draft = [];

        function clearErr(field) {
          var wrap = body.querySelector('[data-field="' + field + '"]');
          var err = body.querySelector('[data-role="err-' + field + '"]');
          if (wrap) wrap.classList.remove('invalid');
          if (err) { err.hidden = true; err.textContent = ''; }
        }

        function showErr(field, msg) {
          var wrap = body.querySelector('[data-field="' + field + '"]');
          var err = body.querySelector('[data-role="err-' + field + '"]');
          if (wrap) wrap.classList.add('invalid');
          if (err) { err.hidden = false; err.textContent = msg; }
        }

        function paintPhotos() {
          var items = draft.map(function (item, i) {
            return '<div class="photo-item">' +
                '<img src="' + esc(item.url) + '" alt="">' +
                '<button class="photo-remove" type="button" data-act="remove-photo" data-index="' + i + '" aria-label="移除照片">' +
                  App.icons.svg('close', 12) + '</button>' +
              '</div>';
          }).join('');
          photoBox.innerHTML = items +
            '<button class="photo-add" type="button" data-act="pick-photo">' +
              App.icons.svg('camera', 18) + '<span>' + (draft.length ? '继续添加' : '添加照片') + '</span></button>';
        }

        body.onclick = function (e) {
          var tag = e.target.closest ? e.target.closest('[data-tag]') : null;
          if (tag) {
            var name = tag.getAttribute('data-tag');
            var i = selectedTags.indexOf(name);
            if (i === -1) selectedTags.push(name); else selectedTags.splice(i, 1);
            tag.classList.toggle('active', i === -1);
            return;
          }
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
              paintPhotos();
            }
          } else if (act === 'save-diary') {
            clearErr('title');
            clearErr('text');
            var v = App.actions.diary.validate({
              title: titleInput ? titleInput.value : '',
              text: textInput ? textInput.value : ''
            });
            if (!v.ok) {
              showErr(v.field, v.msg);
              return;
            }
            saveBtn.disabled = true;
            saveBtn.textContent = '保存中…';
            App.actions.diary.uploadPhotos(App.store.db, App.data, draft.map(function (x) { return x.file; }))
              .then(function (records) {
                var r = App.actions.diary.add(App.data, {
                  title: v.title,
                  text: v.text,
                  tags: selectedTags.slice(),
                  photos: records.map(function (rec) { return rec.id; })
                });
                if (!r.ok) throw new Error(r.msg);
                App.saveQuiet();
                draft.forEach(function (x) { try { URL.revokeObjectURL(x.url); } catch (err) {} });
                draft = [];
                close();
                App.refresh();
                App.ui.toast('日记已保存');
              })
              .catch(function () {
                saveBtn.disabled = false;
                saveBtn.textContent = '保存';
                App.ui.toast('照片保存失败，请重试');
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
            paintPhotos();
          };
        }
      }
    };
  }

  function openWrite() {
    App.ui.openSheet('diary-write', {});
  }

  App.ui.registerSheet('diary-write', renderWriteSheet);

  /* ---------------- 页面挂载 ---------------- */

  function mount(container) {
    revokeUrls();
    hydrate(container);
    container.onclick = function (e) {
      var btn = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      if (act === 'add-diary' || act === 'empty') {
        openWrite();
      } else if (act === 'tab') {
        state.tab = btn.getAttribute('data-tab') === 'nodes' ? 'nodes' : 'diary';
        App.refresh();
      } else if (act === 'open-diary') {
        App.router.go('diary-detail', btn.getAttribute('data-id'));
      } else {
        App.pages.nodes.handleAction(act, btn);
      }
    };
  }

  App.pages.log = {
    render: render,
    mount: mount,
    setTab: function (tab) { state.tab = tab === 'nodes' ? 'nodes' : 'diary'; },
    getTab: function () { return state.tab; },
    openWrite: openWrite
  };

  App.pages.diaryDetail = { render: detailRender, mount: detailMount };
  App.pages['diary-detail'] = App.pages.diaryDetail;
})(window);
