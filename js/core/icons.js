(function (global) {
  'use strict';
  var App = global.App = global.App || {};

  var PATHS = {
    home: '<path d="M4 10.2 12 3.6l8 6.6"/><path d="M6.2 9.3v10.9h11.6V9.3"/>',
    ledger: '<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10.2h18"/><circle cx="16.4" cy="14.4" r="1.1"/>',
    todo: '<rect x="4" y="3.5" width="16" height="17" rx="4"/><path d="m8 12.2 2.5 2.5 4.8-5"/>',
    log: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 7.5h8M8 12h8M8 16.5h4"/>',
    more: '<rect x="4" y="4" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    back: '<path d="m15 4.5-7.5 7.5 7.5 7.5"/>',
    right: '<path d="m9 4.5 7.5 7.5-7.5 7.5"/>',
    down: '<path d="m5 9 7 7 7-7"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    camera: '<path d="M3.5 8.8h3.2l1.5-2.1h7.6l1.5 2.1h3.2v10.4H3.5V8.8Z"/><circle cx="12" cy="13.6" r="3"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><circle cx="8.5" cy="9.5" r="1.4"/><path d="m4.5 17 5-4.6 4 3.6 3-2.6 4 3.6"/>',
    file: '<path d="M6.5 3h7l4.5 4.6V21H6.5V3Z"/><path d="M13.5 3v4.8h4.5"/>',
    search: '<circle cx="11" cy="11" r="6.2"/><path d="m15.6 15.6 4.4 4.4"/>',
    trash: '<path d="M4 7h16"/><path d="M9 7V4.8h6V7"/><path d="m6.5 7 1 13.2h9l1-13.2"/>',
    edit: '<path d="M4.5 19.5H8L19 8.5 15.5 5 4.5 16v3.5Z"/><path d="m13.6 6.9 3.5 3.5"/>',
    calendar: '<rect x="3.6" y="5.2" width="16.8" height="15" rx="3"/><path d="M8 3v4M16 3v4M3.6 10.4h16.8"/>',
    tag: '<path d="M4 4h7.2l8.8 8.8-7.2 7.2L4 11.2V4Z"/><circle cx="8.4" cy="8.4" r="1.3"/>',
    clock: '<circle cx="12" cy="12" r="8.2"/><path d="M12 7.8v4.6l3 1.8"/>',
    chart: '<path d="M4 20h16"/><path d="M6.5 16.5V11M11.5 16.5V6.5M16.5 16.5v-7"/>',
    folder: '<path d="M3.5 7.2a2.2 2.2 0 0 1 2.2-2.2h4.2l2 2.2h7.1a2.2 2.2 0 0 1 2.2 2.2v8.4a2.2 2.2 0 0 1-2.2 2.2H5.7a2.2 2.2 0 0 1-2.2-2.2V7.2Z"/>',
    link: '<path d="M10.5 7.5h-2a4 4 0 0 0 0 8h2"/><path d="M13.5 7.5h2a4 4 0 0 1 0 8h-2"/><path d="M8.8 12h6.4"/>',
    download: '<path d="M12 3.8v10.6"/><path d="m7.8 10.6 4.2 4.2 4.2-4.2"/><path d="M4.8 19.2h14.4"/>',
    upload: '<path d="M12 14.4V3.8"/><path d="m7.8 7.8 4.2-4.2 4.2 4.2"/><path d="M4.8 19.2h14.4"/>',
    settings: '<circle cx="12" cy="12" r="3.1"/><path d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M18.4 5.6l-1.7 1.7M7.3 16.7 5.6 18.4"/>',
    warning: '<path d="M12 3.8 21 20H3L12 3.8Z"/><path d="M12 9.4v4.4M12 16.6h.01"/>',
    check: '<path d="m4.8 12.6 4.6 4.6 9.8-10"/>',
    info: '<circle cx="12" cy="12" r="8.2"/><path d="M12 8.2h.01M11 11.4h1.2v5"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4.2v4.2h-4.2"/>',
    money: '<path d="m7 4.5 5 6.6 5-6.6"/><path d="M12 11.1V20M8.6 12.2h6.8M8.6 15.4h6.8"/>',
    list: '<path d="M8.5 6h11M8.5 12h11M8.5 18h11"/><circle cx="4.6" cy="6" r="1.1"/><circle cx="4.6" cy="12" r="1.1"/><circle cx="4.6" cy="18" r="1.1"/>',
    sparkle: '<path d="M12 4.6 13.6 9l4.4 1.6-4.4 1.6L12 16.6l-1.6-4.4-4.4-1.6L10.4 9 12 4.6Z"/>',
    arrowRight: '<path d="M4.5 12h14"/><path d="m13 6.5 5.5 5.5-5.5 5.5"/>',
    external: '<path d="M7 17 17 7"/><path d="M9.5 7H17v7.5"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5"/>'
  };

  var ALIAS = {
    wallet: 'ledger',
    book: 'log',
    grid: 'more',
    'check-square': 'todo'
  };

  function svg(name, size) {
    var key = ALIAS[name] || name;
    var path = PATHS[key];
    if (!path) return '';
    var s = size || 22;
    return '<svg class="ico" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true">' + path + '</svg>';
  }

  App.icons = {
    svg: svg,
    has: function (name) { return !!PATHS[ALIAS[name] || name]; },
    names: Object.keys(PATHS)
  };
})(window);
