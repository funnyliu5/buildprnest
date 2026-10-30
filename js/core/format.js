(function (global) {
  'use strict';
  var App = global.App = global.App || {};

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function toNumber(n) {
    var v = typeof n === 'number' ? n : parseFloat(n);
    return isFinite(v) ? v : 0;
  }

  function thousands(intStr) {
    return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  var format = {
    /**
     * 金额：¥ + 千分位，按 PRD §6 取整到元（四舍五入）。
     */
    money: function (n) {
      var v = toNumber(n);
      var neg = v < 0;
      var abs = Math.round(Math.abs(v));
      return (neg ? '-¥' : '¥') + thousands(String(abs));
    },

    /** 金额（不带符号），用于输入框回显等场景 */
    amount: function (n) {
      var v = toNumber(n);
      var neg = v < 0;
      return (neg ? '-' : '') + thousands(String(Math.round(Math.abs(v))));
    },

    /** 百分比：整数，分母 <= 0 时返回 0 */
    percent: function (part, total) {
      var p = toNumber(part), t = toNumber(total);
      if (t <= 0) return 0;
      return Math.round(p / t * 100);
    },

    /** 两位补零：YYYY-MM-DD */
    date: function (d) {
      var dt = d instanceof Date ? d : (d ? new Date(d) : new Date());
      if (isNaN(dt.getTime())) dt = new Date();
      return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate());
    },

    today: function () { return format.date(new Date()); },

    /** 解析 YYYY-MM-DD 为本地日期（避免 UTC 偏移） */
    parse: function (s) {
      if (!s) return null;
      var m = String(s).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (!m) {
        var d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
      }
      return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    },

    /** 10月29日 */
    dateCN: function (s) {
      var d = format.parse(s);
      if (!d) return '';
      return (d.getMonth() + 1) + '月' + d.getDate() + '日';
    },

    /** 2026年10月29日 */
    dateFull: function (s) {
      var d = format.parse(s);
      if (!d) return '';
      return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
    },

    /** 相对日期：今天 / 昨天 / 10月29日 */
    dateLabel: function (s) {
      var d = format.parse(s);
      if (!d) return '';
      var today = format.parse(format.today());
      var diff = Math.round((today - d) / 86400000);
      if (diff === 0) return '今天';
      if (diff === 1) return '昨天';
      if (diff === -1) return '明天';
      if (d.getFullYear() === today.getFullYear()) return format.dateCN(s);
      return format.dateFull(s);
    },

    /** 两个日期相差天数（b - a） */
    daysBetween: function (a, b) {
      var da = format.parse(a), db = format.parse(b);
      if (!da || !db) return 0;
      return Math.round((db - da) / 86400000);
    },

    /** 加天数，返回 YYYY-MM-DD */
    addDays: function (s, n) {
      var d = format.parse(s);
      if (!d) return '';
      d.setDate(d.getDate() + Number(n || 0));
      return format.date(d);
    },

    /** 相对今天的天数差（正数=已过去） */
    daysSince: function (s) {
      return format.daysBetween(s, format.today());
    },

    /** 文件大小：0 B / 856 KB / 12.3 MB / 1.2 GB */
    fileSize: function (bytes) {
      var n = Number(bytes);
      if (!isFinite(n) || n <= 0) return '0 B';
      if (n < 1024) return Math.round(n) + ' B';
      var kb = n / 1024;
      if (kb < 1024) return round1(kb) + ' KB';
      var mb = kb / 1024;
      if (mb < 1024) return round1(mb) + ' MB';
      return round1(mb / 1024) + ' GB';
    }
  };

  function round1(x) {
    var v = Math.round(x * 10) / 10;
    return String(v).replace(/\.0$/, '');
  }

  App.format = format;
})(window);
