(function (global) {
  'use strict';
  var App = global.App = global.App || {};

  var DATA_STORE = 'data';
  var BLOB_STORE = 'blobs';
  var OPEN_TIMEOUT = 3000;

  function cloneValue(v) {
    if (v === undefined) return undefined;
    try { return JSON.parse(JSON.stringify(v)); } catch (e) { return v; }
  }

  function probeLocalStorage() {
    try {
      if (!global.localStorage) return false;
      var k = '__bg_probe__';
      global.localStorage.setItem(k, '1');
      var ok = global.localStorage.getItem(k) === '1';
      global.localStorage.removeItem(k);
      return ok;
    } catch (e) {
      return false;
    }
  }

  function openDB(name) {
    return new Promise(function (resolve, reject) {
      if (!global.indexedDB) { reject(new Error('indexedDB 不可用')); return; }
      var settled = false;
      var timer = null;
      var req;
      try { req = global.indexedDB.open(name, 1); } catch (e) { reject(e); return; }

      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(DATA_STORE)) db.createObjectStore(DATA_STORE);
        if (!db.objectStoreNames.contains(BLOB_STORE)) db.createObjectStore(BLOB_STORE);
      };
      req.onsuccess = function () {
        var db = req.result;
        if (settled) { try { db.close(); } catch (e) {} return; }
        settled = true;
        if (timer) clearTimeout(timer);
        resolve(db);
      };
      req.onerror = function () {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        reject(req.error || new Error('打开数据库失败'));
      };
      req.onblocked = function () {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        reject(new Error('数据库被占用'));
      };
      timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        reject(new Error('打开数据库超时'));
      }, OPEN_TIMEOUT);
    });
  }

  function idbGet(handle, storeName, key) {
    return new Promise(function (resolve, reject) {
      var req;
      try {
        req = handle.transaction(storeName, 'readonly').objectStore(storeName).get(key);
      } catch (e) { reject(e); return; }
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function idbPut(handle, storeName, key, value) {
    return new Promise(function (resolve, reject) {
      var tx;
      try {
        tx = handle.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).put(value, key);
      } catch (e) { reject(e); return; }
      tx.oncomplete = function () { resolve(true); };
      tx.onerror = function () { reject(tx.error || new Error('写入失败')); };
      tx.onabort = function () { reject(tx.error || new Error('写入被中止')); };
    });
  }

  function idbDelete(handle, storeName, key) {
    return new Promise(function (resolve, reject) {
      var tx;
      try {
        tx = handle.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).delete(key);
      } catch (e) { reject(e); return; }
      tx.oncomplete = function () { resolve(true); };
      tx.onerror = function () { reject(tx.error || new Error('删除失败')); };
      tx.onabort = function () { reject(tx.error || new Error('删除被中止')); };
    });
  }

  function idbAll(handle, storeName) {
    return new Promise(function (resolve, reject) {
      var out = [];
      var req;
      try {
        req = handle.transaction(storeName, 'readonly').objectStore(storeName).openCursor();
      } catch (e) { reject(e); return; }
      req.onsuccess = function () {
        var cur = req.result;
        if (!cur) { resolve(out); return; }
        out.push({ key: cur.key, value: cur.value });
        cur.continue();
      };
      req.onerror = function () { reject(req.error); };
    });
  }

  function blobToDataURL(blob) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(fr.result); };
      fr.onerror = function () { reject(fr.error || new Error('读取文件失败')); };
      fr.readAsDataURL(blob);
    });
  }

  function dataURLToBlob(url) {
    var parts = String(url).split(',');
    var mime = (parts[0].match(/data:([^;]+);base64/) || [])[1] || 'application/octet-stream';
    var bin;
    try { bin = atob(parts[1] || ''); } catch (e) { bin = ''; }
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  /**
   * 创建存储实例。
   * 后端选择顺序：IndexedDB → localStorage → 内存（仅导出模式）。
   * opts: { dbName, disableIndexedDB, disableLocalStorage, onWriteError }
   */
  function createStore(opts) {
    opts = opts || {};
    var dbName = opts.dbName || 'buildprnest';
    var useIDB = !opts.disableIndexedDB;
    var useLS = !opts.disableLocalStorage;
    var lsPrefix = 'bg:' + dbName + ':';
    var onWriteError = typeof opts.onWriteError === 'function' ? opts.onWriteError : null;

    var db = null;
    var memData = {};
    var memBlobs = {};
    var readyPromise = null;

    var self = {
      dbName: dbName,
      backend: null
    };

    function reportError(err) {
      if (!onWriteError) return;
      try { onWriteError(err); } catch (e) {}
    }

    function fallback() {
      if (useLS && probeLocalStorage()) {
        self.backend = 'localstorage';
        return Promise.resolve('localstorage');
      }
      self.backend = 'memory';
      return Promise.resolve('memory');
    }

    self.ready = function () {
      if (readyPromise) return readyPromise;
      var selecting;
      if (useIDB && global.indexedDB) {
        selecting = openDB(dbName).then(function (handle) {
          db = handle;
          self.backend = 'indexeddb';
        }, function () {
          return fallback();
        });
      } else {
        selecting = fallback();
      }
      readyPromise = selecting.then(function () { return self; });
      return readyPromise;
    };

    self.set = function (key, value) {
      return self.ready().then(function () {
        if (self.backend === 'indexeddb') {
          return idbPut(db, DATA_STORE, key, value);
        }
        if (self.backend === 'localstorage') {
          global.localStorage.setItem(lsPrefix + key, JSON.stringify(value));
          return true;
        }
        memData[key] = cloneValue(value);
        return true;
      }).catch(function (err) {
        reportError(err);
        throw err;
      });
    };

    self.get = function (key) {
      return self.ready().then(function () {
        if (self.backend === 'indexeddb') {
          return idbGet(db, DATA_STORE, key).then(function (v) {
            return v === undefined ? null : v;
          });
        }
        if (self.backend === 'localstorage') {
          var raw;
          try { raw = global.localStorage.getItem(lsPrefix + key); } catch (e) { return null; }
          if (raw === null || raw === undefined) return null;
          try { return JSON.parse(raw); } catch (e) { return null; }
        }
        return (key in memData) ? cloneValue(memData[key]) : null;
      });
    };

    self.remove = function (key) {
      return self.ready().then(function () {
        if (self.backend === 'indexeddb') return idbDelete(db, DATA_STORE, key);
        if (self.backend === 'localstorage') {
          global.localStorage.removeItem(lsPrefix + key);
          return true;
        }
        delete memData[key];
        return true;
      }).catch(function (err) {
        reportError(err);
        throw err;
      });
    };

    /* ---------- 附件（Blob） ---------- */

    self.putBlob = function (id, blob) {
      return self.ready().then(function () {
        if (self.backend === 'indexeddb') return idbPut(db, BLOB_STORE, id, blob);
        if (self.backend === 'localstorage') {
          return blobToDataURL(blob).then(function (url) {
            global.localStorage.setItem(lsPrefix + 'blob:' + id, JSON.stringify({ type: blob.type || '', url: url }));
            return true;
          });
        }
        memBlobs[id] = blob;
        return true;
      }).catch(function (err) {
        reportError(err);
        throw err;
      });
    };

    self.getBlob = function (id) {
      return self.ready().then(function () {
        if (self.backend === 'indexeddb') {
          return idbGet(db, BLOB_STORE, id).then(function (v) { return v || null; });
        }
        if (self.backend === 'localstorage') {
          var raw;
          try { raw = global.localStorage.getItem(lsPrefix + 'blob:' + id); } catch (e) { return null; }
          if (!raw) return null;
          try {
            var meta = JSON.parse(raw);
            return dataURLToBlob(meta.url);
          } catch (e) { return null; }
        }
        return memBlobs[id] || null;
      });
    };

    self.deleteBlob = function (id) {
      return self.ready().then(function () {
        if (self.backend === 'indexeddb') return idbDelete(db, BLOB_STORE, id);
        if (self.backend === 'localstorage') {
          global.localStorage.removeItem(lsPrefix + 'blob:' + id);
          return true;
        }
        delete memBlobs[id];
        return true;
      }).catch(function (err) {
        reportError(err);
        throw err;
      });
    };

    /** 返回 [{ id, blob }] */
    self.allBlobs = function () {
      return self.ready().then(function () {
        if (self.backend === 'indexeddb') {
          return idbAll(db, BLOB_STORE).then(function (rows) {
            return rows.map(function (r) { return { id: r.key, blob: r.value }; });
          });
        }
        var out = [];
        if (self.backend === 'localstorage') {
          try {
            for (var i = 0; i < global.localStorage.length; i++) {
              var k = global.localStorage.key(i);
              if (!k || k.indexOf(lsPrefix + 'blob:') !== 0) continue;
              var id = k.slice((lsPrefix + 'blob:').length);
              var blob = dataURLToBlob(JSON.parse(global.localStorage.getItem(k)).url);
              if (blob) out.push({ id: id, blob: blob });
            }
          } catch (e) {}
          return out;
        }
        Object.keys(memBlobs).forEach(function (id) {
          out.push({ id: id, blob: memBlobs[id] });
        });
        return out;
      });
    };

    self.clearAll = function () {
      return self.ready().then(function () {
        if (self.backend === 'indexeddb') {
          return Promise.all([
            idbAll(db, DATA_STORE).then(function (rows) {
              return Promise.all(rows.map(function (r) { return idbDelete(db, DATA_STORE, r.key); }));
            }),
            idbAll(db, BLOB_STORE).then(function (rows) {
              return Promise.all(rows.map(function (r) { return idbDelete(db, BLOB_STORE, r.key); }));
            })
          ]);
        }
        if (self.backend === 'localstorage') {
          var keys = [];
          for (var i = 0; i < global.localStorage.length; i++) {
            var k = global.localStorage.key(i);
            if (k && k.indexOf(lsPrefix) === 0) keys.push(k);
          }
          keys.forEach(function (k) { global.localStorage.removeItem(k); });
          return true;
        }
        memData = {};
        memBlobs = {};
        return true;
      });
    };

    self.close = function () {
      if (db) {
        try { db.close(); } catch (e) {}
        db = null;
      }
      readyPromise = null;
      self.backend = null;
    };

    return self;
  }

  function deleteDatabase(name) {
    return new Promise(function (resolve) {
      if (!global.indexedDB) { resolve(false); return; }
      var req;
      try { req = global.indexedDB.deleteDatabase(name); } catch (e) { resolve(false); return; }
      req.onsuccess = function () { resolve(true); };
      req.onerror = function () { resolve(false); };
      req.onblocked = function () { resolve(false); };
    });
  }

  App.store = {
    create: createStore,
    probeLocalStorage: probeLocalStorage,
    deleteDatabase: deleteDatabase,
    DATA_STORE: DATA_STORE,
    BLOB_STORE: BLOB_STORE
  };
})(window);
