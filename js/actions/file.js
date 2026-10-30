(function (global) {
  'use strict';
  var App = global.App = global.App || {};
  var actions = App.actions = App.actions || {};
  var fmt = App.format;

  var MAX_FILE = 100 * 1024 * 1024;
  var MAX_TOTAL = 1024 * 1024 * 1024;
  var WARN_RATIO = 0.8;

  var KINDS = [
    { id: 'all', label: '全部' },
    { id: 'img', label: '图片' },
    { id: 'doc', label: '文档' },
    { id: 'sheet', label: '表格' },
    { id: 'deck', label: '演示' },
    { id: 'cad', label: 'CAD' },
    { id: 'other', label: '其他' }
  ];

  var EXT_KIND = {
    jpg: 'img', jpeg: 'img', png: 'img', webp: 'img',
    pdf: 'doc', doc: 'doc', docx: 'doc',
    xls: 'sheet', xlsx: 'sheet', csv: 'sheet',
    ppt: 'deck', pptx: 'deck',
    dwg: 'cad', dxf: 'cad'
  };

  function extOf(name) {
    var m = String(name || '').match(/\.([a-zA-Z0-9]+)$/);
    return m ? m[1].toLowerCase() : '';
  }

  function kindOf(name) {
    return EXT_KIND[extOf(name)] || 'other';
  }

  function kindLabel(kind) {
    var hit = KINDS.filter(function (k) { return k.id === kind; })[0];
    return hit ? hit.label : '其他';
  }

  function totalSize(files) {
    return (files || []).reduce(function (sum, f) { return sum + (Number(f.size) || 0); }, 0);
  }

  function usage(files) {
    var bytes = totalSize(files);
    var percent = Math.min(100, Math.round(bytes / MAX_TOTAL * 100));
    return {
      bytes: bytes,
      limit: MAX_TOTAL,
      percent: percent,
      warn: bytes / MAX_TOTAL >= WARN_RATIO,
      remaining: Math.max(0, MAX_TOTAL - bytes)
    };
  }

  /** 上传前校验：单文件 100MB、仓库总量 1GB */
  function validateUpload(data, fileList) {
    var list = Array.prototype.slice.call(fileList || []);
    if (!list.length) return { ok: false, msg: '请选择要上传的文件' };

    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      if ((Number(f.size) || 0) > MAX_FILE) {
        return { ok: false, msg: '「' + (f.name || '文件') + '」超过 100MB，无法上传' };
      }
    }

    var incoming = list.reduce(function (sum, f) { return sum + (Number(f.size) || 0); }, 0);
    var existing = totalSize(data && data.files);
    if (existing + incoming > MAX_TOTAL) {
      return { ok: false, msg: '上传后仓库总量将超过 1GB，请先清理文件' };
    }
    return { ok: true, bytes: incoming };
  }

  function add(data, input) {
    input = input || {};
    var name = typeof input.name === 'string' && input.name.trim() ? input.name.trim() : '未命名文件';
    var record = {
      id: App.model.uid('fl'),
      name: name,
      size: Math.max(0, Number(input.size) || 0),
      ext: extOf(name),
      kind: kindOf(name),
      mime: typeof input.mime === 'string' ? input.mime : '',
      addedAt: input.addedAt || fmt.today()
    };
    data.files = Array.isArray(data.files) ? data.files : [];
    data.files.push(record);
    return { ok: true, file: record };
  }

  function remove(data, id) {
    var files = data && data.files ? data.files : [];
    for (var i = 0; i < files.length; i++) {
      if (files[i].id === id) {
        var removed = files.splice(i, 1)[0];
        return { ok: true, file: removed };
      }
    }
    return { ok: false, msg: '文件不存在' };
  }

  /** 按上传日期倒序；同日则后写入的在前 */
  function sorted(data) {
    var list = (data && data.files ? data.files : []).map(function (f, i) {
      return { f: f, i: i };
    });
    list.sort(function (a, b) {
      var da = a.f.addedAt || '';
      var db = b.f.addedAt || '';
      if (da !== db) return da > db ? -1 : 1;
      return b.i - a.i;
    });
    return list.map(function (x) { return x.f; });
  }

  /** 类型筛选 + 文件名模糊搜索（大小写不敏感） */
  function query(data, opts) {
    opts = opts || {};
    var kind = opts.kind && opts.kind !== 'all' ? opts.kind : '';
    var keyword = typeof opts.keyword === 'string' ? opts.keyword.trim().toLowerCase() : '';
    return sorted(data).filter(function (f) {
      if (kind && f.kind !== kind) return false;
      if (keyword && String(f.name || '').toLowerCase().indexOf(keyword) === -1) return false;
      return true;
    });
  }

  actions.file = {
    MAX_FILE: MAX_FILE,
    MAX_TOTAL: MAX_TOTAL,
    WARN_RATIO: WARN_RATIO,
    KINDS: KINDS,
    extOf: extOf,
    kindOf: kindOf,
    kindLabel: kindLabel,
    totalSize: totalSize,
    usage: usage,
    validateUpload: validateUpload,
    add: add,
    remove: remove,
    sorted: sorted,
    query: query
  };
})(window);
