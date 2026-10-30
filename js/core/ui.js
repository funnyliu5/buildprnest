(function (global) {
  'use strict';
  var App = global.App = global.App || {};

  var sheets = {};
  var activeSheet = null;
  var toastTimer = null;

  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function overlayRoot() {
    var root = document.getElementById('overlay-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'overlay-root';
      document.body.appendChild(root);
    }
    return root;
  }

  function el(html) {
    var box = document.createElement('div');
    box.innerHTML = String(html).trim();
    return box.firstElementChild;
  }

  function show(node) {
    overlayRoot().appendChild(node);
    // 强制重排以保证过渡动画生效
    void node.offsetHeight;
    node.classList.add('show');
  }

  /** 轻提示，2 秒自动消失 */
  function toast(msg, duration) {
    if (!msg) return;
    var root = overlayRoot();
    var wrap = root.querySelector('.toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'toast-wrap';
      root.appendChild(wrap);
    }
    wrap.innerHTML = '';
    var item = document.createElement('div');
    item.className = 'toast';
    item.textContent = String(msg);
    wrap.appendChild(item);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      if (wrap.parentNode) wrap.remove();
    }, duration || 2000);
  }

  /* ---------- 弹层 ---------- */

  function registerSheet(type, renderer) {
    if (!type || typeof renderer !== 'function') throw new Error('弹层注册参数不合法');
    sheets[type] = renderer;
  }

  /**
   * 打开底部弹层。
   * renderer(ctx) 返回 { title, html, onMount(bodyEl, close) }
   */
  function openSheet(type, ctx) {
    var renderer = sheets[type];
    if (!renderer) throw new Error('未注册的弹层：' + type);
    if (activeSheet) closeSheet(true);
    var def = renderer(ctx || {}) || {};
    var node = el(
      '<div class="overlay sheet-overlay">' +
        '<div class="sheet-wrap">' +
          '<div class="sheet">' +
            '<div class="sheet-head">' +
              '<h3>' + esc(def.title || '') + '</h3>' +
              '<button class="icon-btn plain" data-sheet-close type="button">' + App.icons.svg('close', 18) + '</button>' +
            '</div>' +
            '<div class="sheet-body">' + (def.html || '') + '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
    activeSheet = node;
    show(node);

    node.querySelector('[data-sheet-close]').addEventListener('click', function () { closeSheet(); });
    node.addEventListener('click', function (e) {
      if (e.target === node) closeSheet();
    });

    if (typeof def.onMount === 'function') {
      def.onMount(node.querySelector('.sheet-body'), closeSheet);
    }
    return node;
  }

  function closeSheet(immediate) {
    var node = activeSheet;
    if (!node) return;
    activeSheet = null;
    node.classList.remove('show');
    if (immediate) {
      node.remove();
    } else {
      setTimeout(function () { node.remove(); }, 200);
    }
  }

  /* ---------- 二次确认 ---------- */

  /**
   * confirm({ title, detail, okText, cancelText, danger }) → Promise<boolean>
   * 破坏性操作必须传 danger:true 且写明 okText。
   */
  function confirm(opts) {
    opts = opts || {};
    var danger = !!opts.danger;
    if (danger && !opts.okText) {
      throw new Error('危险操作必须提供明确的操作文案（okText）');
    }
    var okText = opts.okText || '确定';
    var cancelText = opts.cancelText || '取消';
    var node = el(
      '<div class="overlay confirm-overlay">' +
        '<div class="dialog">' +
          '<h3>' + esc(opts.title || '请确认') + '</h3>' +
          (opts.detail ? '<p>' + esc(opts.detail) + '</p>' : '') +
          '<div class="dialog-actions">' +
            '<button class="btn ghost" data-act="cancel" type="button">' + esc(cancelText) + '</button>' +
            '<button class="btn ' + (danger ? 'danger' : 'primary') + '" data-act="ok" type="button">' + esc(okText) + '</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
    show(node);

    return new Promise(function (resolve) {
      var done = false;
      function finish(value) {
        if (done) return;
        done = true;
        node.classList.remove('show');
        setTimeout(function () { node.remove(); }, 180);
        resolve(value);
      }
      node.querySelector('[data-act="cancel"]').addEventListener('click', function () { finish(false); });
      node.querySelector('[data-act="ok"]').addEventListener('click', function () { finish(true); });
      node.addEventListener('click', function (e) {
        if (e.target === node) finish(false);
      });
    });
  }

  /* ---------- 图片预览 ---------- */

  /**
   * openPreview(srcList, startIndex, onClose)
   */
  function openPreview(srcList, startIndex, onClose) {
    var list = (srcList || []).filter(function (s) { return !!s; });
    if (!list.length) return;
    var index = Math.min(Math.max(startIndex || 0, 0), list.length - 1);

    var node = document.createElement('div');
    node.className = 'preview-overlay';

    function paint() {
      node.innerHTML =
        '<div class="preview-count">' + (index + 1) + ' / ' + list.length + '</div>' +
        '<button class="preview-close" data-preview="close" type="button">' + App.icons.svg('close', 18) + '</button>' +
        (list.length > 1
          ? '<button class="preview-nav prev" data-preview="prev" type="button">' + App.icons.svg('back', 18) + '</button>' +
            '<button class="preview-nav next" data-preview="next" type="button">' + App.icons.svg('right', 18) + '</button>'
          : '') +
        '<img src="' + esc(list[index]) + '" alt="">';
    }

    function close() {
      node.remove();
      if (typeof onClose === 'function') onClose();
    }

    node.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('[data-preview]') : null;
      if (btn) {
        var act = btn.getAttribute('data-preview');
        if (act === 'close') { close(); return; }
        if (act === 'prev') { index = (index - 1 + list.length) % list.length; paint(); return; }
        if (act === 'next') { index = (index + 1) % list.length; paint(); return; }
      }
      if (e.target === node || e.target.tagName === 'IMG') close();
    });

    paint();
    document.body.appendChild(node);
  }

  /* ---------- 空态 ---------- */

  function emptyHTML(opts) {
    opts = opts || {};
    return '<div class="empty">' +
      (opts.icon ? '<div class="empty-ico">' + App.icons.svg(opts.icon, 24) + '</div>' : '') +
      '<p>' + esc(opts.text || '暂无内容') + '</p>' +
      (opts.btn ? '<button class="btn primary sm" data-act="empty" type="button">' + esc(opts.btn) + '</button>' : '') +
      '</div>';
  }

  App.ui = {
    esc: esc,
    el: el,
    toast: toast,
    registerSheet: registerSheet,
    openSheet: openSheet,
    closeSheet: closeSheet,
    confirm: confirm,
    openPreview: openPreview,
    emptyHTML: emptyHTML
  };
})(window);
