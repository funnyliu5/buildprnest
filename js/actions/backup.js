(function (global) {
  'use strict';
  var App = global.App = global.App || {};
  var actions = App.actions = App.actions || {};
  var zip = actions.zip;

  var DATA_ENTRY = 'data.json';
  var FILE_DIR = 'files/';
  var NAME_PREFIX = '装修管家备份-';

  function fileName(dateStr) {
    return NAME_PREFIX + (dateStr || App.format.today()) + '.zip';
  }

  function safeName(name) {
    var s = String(name === undefined || name === null ? '' : name)
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, ' ')
      .trim();
    if (!s) s = 'file';
    return s.length > 80 ? s.slice(0, 80) : s;
  }

  function entryName(file) {
    return FILE_DIR + (file && file.id ? file.id : 'unknown') + '__' + safeName(file && file.name);
  }

  /** 从 files/<id>__<name> 解析文件 ID；非附件条目返回 '' */
  function entryFileId(name) {
    var s = String(name || '');
    if (s.indexOf(FILE_DIR) !== 0) return '';
    var base = s.slice(FILE_DIR.length);
    var idx = base.indexOf('__');
    return (idx >= 0 ? base.slice(0, idx) : base).trim();
  }

  function byteLength(text) {
    try {
      return zip.utf8Encode(String(text)).length;
    } catch (e) {
      return String(text).length;
    }
  }

  /** 备份体积预估：JSON 文本 + 附件总字节 + 条目头开销 */
  function estimateSize(data, blobBytes) {
    var json = '';
    try { json = JSON.stringify(data || {}); } catch (e) { json = ''; }
    var fileCount = (data && data.files ? data.files.length : 0);
    return byteLength(json) + (Number(blobBytes) || 0) + 22 + (1 + fileCount) * 120;
  }

  /** 导出：读取附件并打包 data.json + files/ 原始字节 */
  function exportBackup(store, data) {
    if (!store) return Promise.reject(new Error('存储尚未就绪'));
    return store.allBlobs().then(function (blobs) {
      var byId = {};
      (blobs || []).forEach(function (b) { byId[b.id] = b.blob; });
      var files = (data && data.files) || [];
      var entries = [{ name: DATA_ENTRY, data: JSON.stringify(data, null, 2) }];
      files.forEach(function (f) {
        if (!f || !f.id) return;
        if (!byId[f.id]) return;
        entries.push({ name: entryName(f), data: byId[f.id] });
      });
      return zip.buildBlob(entries).then(function (blob) {
        return {
          blob: blob,
          fileName: fileName(),
          fileCount: entries.length - 1,
          size: blob.size
        };
      });
    });
  }

  function isBackupObject(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
    if (!raw.project || typeof raw.project !== 'object') return false;
    if (!raw.budget || typeof raw.budget !== 'object') return false;
    var arrays = ['expenses', 'todos', 'diaries', 'nodes', 'files', 'ideas'];
    for (var i = 0; i < arrays.length; i++) {
      if (!Array.isArray(raw[arrays[i]])) return false;
    }
    return true;
  }

  /**
   * 读取并校验备份文件；校验失败抛「备份文件无法识别」，不改动任何数据。
   * 返回 { data, blobs: [{ id, blob }] }
   */
  function readBackup(blob) {
    return zip.parseBlob(blob).then(function (packed) {
      var dataEntry = zip.find(packed.entries, DATA_ENTRY);
      if (!dataEntry) throw new Error('备份文件无法识别');
      var text;
      try {
        text = zip.utf8Decode(dataEntry.bytes);
      } catch (e) {
        throw new Error('备份文件无法识别');
      }
      var raw;
      try { raw = JSON.parse(text); } catch (e) { throw new Error('备份文件无法识别'); }
      if (!isBackupObject(raw)) throw new Error('备份文件无法识别');

      var normalized = App.model.migrate(raw).data;
      var mimeById = {};
      (normalized.files || []).forEach(function (f) {
        if (f && f.id) mimeById[f.id] = f.mime || '';
      });

      var blobs = [];
      packed.entries.forEach(function (entry) {
        var id = entryFileId(entry.name);
        if (!id) return;
        var type = mimeById[id] || 'application/octet-stream';
        blobs.push({ id: id, blob: new Blob([entry.bytes], { type: type }) });
      });

      return { data: normalized, blobs: blobs };
    });
  }

  /** 覆盖导入：先写附件，再写数据，最后清理备份中不存在的旧附件 */
  function applyBackup(store, bundle) {
    if (!store) return Promise.reject(new Error('存储尚未就绪'));
    if (!bundle || !bundle.data) return Promise.reject(new Error('备份文件无法识别'));
    var keep = {};
    (bundle.blobs || []).forEach(function (b) { keep[b.id] = true; });

    return (bundle.blobs || []).reduce(function (chain, b) {
      return chain.then(function () { return store.putBlob(b.id, b.blob); });
    }, Promise.resolve()).then(function () {
      return store.set('data', bundle.data);
    }).then(function () {
      return store.allBlobs();
    }).then(function (existing) {
      var stale = (existing || []).filter(function (b) { return !keep[b.id]; });
      return stale.reduce(function (chain, b) {
        return chain.then(function () { return store.deleteBlob(b.id); });
      }, Promise.resolve());
    }).then(function () {
      return bundle.data;
    });
  }

  /** 清空范围：支出、待办、日记、节点、随笔、文件；保留项目信息、预算与文件夹 */
  function clearData(data) {
    var src = data && typeof data === 'object' ? data : App.model.defaults();
    var next = JSON.parse(JSON.stringify(src));
    next.expenses = [];
    next.todos = [];
    next.diaries = [];
    next.ideas = [];
    next.files = [];
    next.nodes = App.model.STANDARD_NODES.map(function (n) {
      return App.model.makeNode(n.name, true, n.checks);
    });
    next.settings = next.settings && typeof next.settings === 'object' ? next.settings : {};
    next.settings.usageBytes = 0;
    next.settings.lastExportAt = '';
    return next;
  }

  function clearAll(store, data) {
    if (!store) return Promise.reject(new Error('存储尚未就绪'));
    var next = clearData(data);
    return store.allBlobs().then(function (blobs) {
      return (blobs || []).reduce(function (chain, b) {
        return chain.then(function () { return store.deleteBlob(b.id); });
      }, Promise.resolve());
    }).then(function () {
      return store.set('data', next);
    }).then(function () {
      return next;
    });
  }

  actions.backup = {
    DATA_ENTRY: DATA_ENTRY,
    FILE_DIR: FILE_DIR,
    NAME_PREFIX: NAME_PREFIX,
    fileName: fileName,
    safeName: safeName,
    entryName: entryName,
    entryFileId: entryFileId,
    estimateSize: estimateSize,
    isBackupObject: isBackupObject,
    exportBackup: exportBackup,
    readBackup: readBackup,
    applyBackup: applyBackup,
    clearData: clearData,
    clearAll: clearAll
  };
})(window);
