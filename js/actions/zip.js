(function (global) {
  'use strict';
  var App = global.App = global.App || {};
  var actions = App.actions = App.actions || {};

  var LOCAL_SIG = 0x04034b50;
  var CENTRAL_SIG = 0x02014b50;
  var EOCD_SIG = 0x06054b50;
  var UTF8_FLAG = 0x0800;

  var CRC_TABLE = (function () {
    var table = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[n] = c >>> 0;
    }
    return table;
  })();

  function invalid() {
    var err = new Error('备份文件无法识别');
    err.code = 'INVALID_ZIP';
    return err;
  }

  function crc32(bytes) {
    var data = toBytes(bytes);
    var c = 0xFFFFFFFF;
    for (var i = 0; i < data.length; i++) {
      c = CRC_TABLE[(c ^ data[i]) & 0xFF] ^ (c >>> 8);
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function utf8Encode(str) {
    if (typeof global.TextEncoder !== 'undefined') return new global.TextEncoder().encode(String(str));
    var s = unescape(encodeURIComponent(String(str)));
    var arr = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) arr[i] = s.charCodeAt(i);
    return arr;
  }

  function utf8Decode(bytes) {
    if (typeof global.TextDecoder !== 'undefined') {
      return new global.TextDecoder('utf-8').decode(bytes);
    }
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    try { return decodeURIComponent(escape(s)); } catch (e) { return s; }
  }

  function toBytes(data) {
    if (!data) return new Uint8Array(0);
    if (data instanceof Uint8Array) return data;
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    if (typeof data === 'string') return utf8Encode(data);
    if (Array.isArray(data)) return new Uint8Array(data);
    throw new Error('不支持的二进制数据类型');
  }

  function writeU16(arr, offset, value) {
    arr[offset] = value & 0xFF;
    arr[offset + 1] = (value >>> 8) & 0xFF;
  }

  function writeU32(arr, offset, value) {
    arr[offset] = value & 0xFF;
    arr[offset + 1] = (value >>> 8) & 0xFF;
    arr[offset + 2] = (value >>> 16) & 0xFF;
    arr[offset + 3] = (value >>> 24) & 0xFF;
  }

  function readU16(arr, offset) {
    if (offset < 0 || offset + 2 > arr.length) throw invalid();
    return arr[offset] | (arr[offset + 1] << 8);
  }

  function readU32(arr, offset) {
    if (offset < 0 || offset + 4 > arr.length) throw invalid();
    return (arr[offset] | (arr[offset + 1] << 8) |
      (arr[offset + 2] << 16) | (arr[offset + 3] << 24)) >>> 0;
  }

  function dosTime(date) {
    var d = date instanceof Date ? date : new Date();
    var time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
    var day = ((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    return { time: time, date: day };
  }

  function concat(parts) {
    var total = parts.reduce(function (sum, p) { return sum + p.length; }, 0);
    var out = new Uint8Array(total);
    var offset = 0;
    parts.forEach(function (p) {
      out.set(p, offset);
      offset += p.length;
    });
    return out;
  }

  /**
   * 打包为 ZIP（STORE 不压缩，文件名 UTF-8）。
   * entries: [{ name: 'data.json', bytes: Uint8Array }]
   */
  function buildBytes(entries) {
    var list = entries || [];
    var local = [];
    var central = [];
    var offset = 0;
    var stamp = dosTime();

    list.forEach(function (entry) {
      var name = String(entry && entry.name ? entry.name : '');
      if (!name) throw new Error('ZIP 条目缺少文件名');
      var nameBytes = utf8Encode(name);
      var data = toBytes(entry.bytes);
      var crc = crc32(data);

      var lh = new Uint8Array(30);
      writeU32(lh, 0, LOCAL_SIG);
      writeU16(lh, 4, 20);
      writeU16(lh, 6, UTF8_FLAG);
      writeU16(lh, 8, 0);
      writeU16(lh, 10, stamp.time);
      writeU16(lh, 12, stamp.date);
      writeU32(lh, 14, crc);
      writeU32(lh, 18, data.length);
      writeU32(lh, 22, data.length);
      writeU16(lh, 26, nameBytes.length);
      writeU16(lh, 28, 0);
      local.push(lh, nameBytes, data);

      var ch = new Uint8Array(46);
      writeU32(ch, 0, CENTRAL_SIG);
      writeU16(ch, 4, 20);
      writeU16(ch, 6, 20);
      writeU16(ch, 8, UTF8_FLAG);
      writeU16(ch, 10, 0);
      writeU16(ch, 12, stamp.time);
      writeU16(ch, 14, stamp.date);
      writeU32(ch, 16, crc);
      writeU32(ch, 20, data.length);
      writeU32(ch, 24, data.length);
      writeU16(ch, 28, nameBytes.length);
      writeU16(ch, 30, 0);
      writeU16(ch, 32, 0);
      writeU16(ch, 34, 0);
      writeU16(ch, 36, 0);
      writeU32(ch, 38, 0);
      writeU32(ch, 42, offset);
      central.push(ch, nameBytes);

      offset += 30 + nameBytes.length + data.length;
    });

    var centralOffset = offset;
    var centralSize = central.reduce(function (sum, p) { return sum + p.length; }, 0);

    var eocd = new Uint8Array(22);
    writeU32(eocd, 0, EOCD_SIG);
    writeU16(eocd, 4, 0);
    writeU16(eocd, 6, 0);
    writeU16(eocd, 8, list.length);
    writeU16(eocd, 10, list.length);
    writeU32(eocd, 12, centralSize);
    writeU32(eocd, 16, centralOffset);
    writeU16(eocd, 20, 0);

    return concat(local.concat(central, [eocd]));
  }

  /**
   * 解析 ZIP，返回 { entries: [{ name, bytes, size }] }。
   * 仅接受 STORE（不压缩）条目，并校验 CRC。
   */
  function parseBytes(input) {
    var bytes = toBytes(input);
    if (bytes.length < 22) throw invalid();

    var eocd = -1;
    var min = Math.max(0, bytes.length - 65557);
    for (var i = bytes.length - 22; i >= min; i--) {
      if (readU32(bytes, i) === EOCD_SIG) { eocd = i; break; }
    }
    if (eocd < 0) throw invalid();

    var total = readU16(bytes, eocd + 10);
    var cdSize = readU32(bytes, eocd + 12);
    var cdOffset = readU32(bytes, eocd + 16);
    if (total === 0 || cdOffset + cdSize > bytes.length) throw invalid();

    var entries = [];
    var p = cdOffset;
    for (var n = 0; n < total; n++) {
      if (readU32(bytes, p) !== CENTRAL_SIG) throw invalid();
      var method = readU16(bytes, p + 10);
      var crc = readU32(bytes, p + 16);
      var csize = readU32(bytes, p + 20);
      var nameLen = readU16(bytes, p + 28);
      var extraLen = readU16(bytes, p + 30);
      var commentLen = readU16(bytes, p + 32);
      var localOffset = readU32(bytes, p + 42);
      if (method !== 0) throw invalid();
      if (p + 46 + nameLen + extraLen + commentLen > bytes.length) throw invalid();

      var name = utf8Decode(bytes.subarray(p + 46, p + 46 + nameLen));
      if (readU32(bytes, localOffset) !== LOCAL_SIG) throw invalid();
      var localNameLen = readU16(bytes, localOffset + 26);
      var localExtraLen = readU16(bytes, localOffset + 28);
      var dataStart = localOffset + 30 + localNameLen + localExtraLen;
      if (dataStart + csize > bytes.length) throw invalid();

      var data = bytes.slice(dataStart, dataStart + csize);
      if (crc32(data) !== crc) throw invalid();
      entries.push({ name: name, bytes: data, size: data.length });
      p += 46 + nameLen + extraLen + commentLen;
    }

    return { entries: entries };
  }

  function bytesOf(data) {
    if (typeof Blob !== 'undefined' && data instanceof Blob) {
      if (typeof data.arrayBuffer === 'function') {
        return data.arrayBuffer().then(function (buf) { return new Uint8Array(buf); });
      }
      return new Promise(function (resolve, reject) {
        var fr = new FileReader();
        fr.onload = function () { resolve(new Uint8Array(fr.result)); };
        fr.onerror = function () { reject(fr.error || new Error('读取文件失败')); };
        fr.readAsArrayBuffer(data);
      });
    }
    return Promise.resolve(toBytes(data));
  }

  /** entries: [{ name, data: Blob|string|Uint8Array }] → Blob（application/zip） */
  function buildBlob(entries) {
    var list = entries || [];
    return Promise.all(list.map(function (entry) {
      return bytesOf(entry && entry.data).then(function (bytes) {
        return { name: entry.name, bytes: bytes };
      });
    })).then(function (prepared) {
      return new Blob([buildBytes(prepared)], { type: 'application/zip' });
    });
  }

  function parseBlob(blob) {
    return bytesOf(blob).then(function (bytes) { return parseBytes(bytes); });
  }

  function find(entries, name) {
    var list = entries || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].name === name) return list[i];
    }
    return null;
  }

  actions.zip = {
    LOCAL_SIG: LOCAL_SIG,
    CENTRAL_SIG: CENTRAL_SIG,
    EOCD_SIG: EOCD_SIG,
    utf8Encode: utf8Encode,
    utf8Decode: utf8Decode,
    crc32: crc32,
    buildBytes: buildBytes,
    parseBytes: parseBytes,
    buildBlob: buildBlob,
    parseBlob: parseBlob,
    find: find
  };
})(window);
