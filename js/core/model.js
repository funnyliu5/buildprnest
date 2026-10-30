(function (global) {
  'use strict';
  var App = global.App = global.App || {};
  var fmt = App.format;

  var VERSION = 1;

  var CATS = [
    { id: 'design', name: '设计', limit: 0 },
    { id: 'demolish', name: '拆改', limit: 0 },
    { id: 'plumb', name: '水电', limit: 0 },
    { id: 'masonry', name: '泥瓦', limit: 0 },
    { id: 'woodwork', name: '木工', limit: 0 },
    { id: 'paint', name: '油漆', limit: 0 },
    { id: 'material', name: '主材', limit: 0 },
    { id: 'appliance', name: '家电', limit: 0 },
    { id: 'soft', name: '软装', limit: 0 },
    { id: 'other', name: '其他', limit: 0 }
  ];

  var STANDARD_NODES = [
    {
      name: '开工交底',
      checks: ['设计图纸与现场尺寸一致', '交底记录已确认并签字', '物业手续与施工许可已办理', '地面与成品保护已到位']
    },
    {
      name: '水电验收',
      checks: ['强弱电箱位置与回路符合设计', '线管敷设横平竖直、无破损', '水管打压试验合格并留记录', '插座底盒标高一致', '现场已拍照存档']
    },
    {
      name: '防水验收',
      checks: ['防水涂刷范围与高度符合要求', '闭水试验 24 小时无渗漏', '阴阳角与管根已做加强处理', '现场已拍照存档']
    },
    {
      name: '泥瓦',
      checks: ['墙砖空鼓率在允许范围内', '地砖坡向地漏、不积水', '砖缝均匀、无崩边崩角', '现场已拍照存档']
    },
    {
      name: '木工',
      checks: ['吊顶龙骨间距符合规范', '板材接缝平整、无错台', '柜体尺寸与图纸一致', '现场已拍照存档']
    },
    {
      name: '油漆',
      checks: ['墙面基层平整、无裂缝', '阴阳角顺直', '漆面均匀、无流挂与色差', '现场已拍照存档']
    },
    {
      name: '安装',
      checks: ['灯具与开关位置正确', '五金安装牢固、开合顺畅', '成品表面无划伤', '现场已拍照存档']
    },
    {
      name: '竣工',
      checks: ['全屋开关插座通电测试正常', '给排水无渗漏', '门窗开合与密封良好', '现场清洁、垃圾清运完成', '现场已拍照存档']
    }
  ];

  var DEFAULT_FOLDERS = ['全屋', '水电', '收纳', '软装', '踩坑'];

  var DEFAULT_CHECKS = ['材料与方案一致', '施工工艺符合要求', '现场已拍照存档'];

  var seq = 0;

  function uid(prefix) {
    seq += 1;
    return (prefix || 'id') + '_' + Date.now().toString(36) + seq.toString(36) +
      Math.random().toString(36).slice(2, 6);
  }

  function makeChecks(list) {
    return (list || []).map(function (t) {
      return { t: t, note: '', done: false };
    });
  }

  function makeNode(name, builtin, checks) {
    return {
      id: uid('nd'),
      name: name,
      builtin: !!builtin,
      status: 'todo',
      date: '',
      checks: makeChecks(checks),
      photos: [],
      issues: []
    };
  }

  function defaults() {
    var total = 0;
    var start = fmt.today();
    return {
      version: VERSION,
      project: {
        name: '',
        area: '',
        stage: '准备阶段',
        startDate: start,
        totalDays: 90,
        endDate: fmt.addDays(start, 90)
      },
      budget: {
        total: total,
        cats: CATS.map(function (c) {
          return { id: c.id, name: c.name, limit: c.limit };
        })
      },
      expenses: [],
      todos: [],
      diaries: [],
      nodes: STANDARD_NODES.map(function (n) {
        return makeNode(n.name, true, n.checks);
      }),
      files: [],
      folders: DEFAULT_FOLDERS.map(function (name) {
        return { id: uid('fd'), name: name };
      }),
      ideas: [],
      settings: {
        storageBackend: '',
        lastExportAt: '',
        usageBytes: 0,
        lastCatId: ''
      }
    };
  }

  function mergeObject(base, raw) {
    var out = {};
    Object.keys(base).forEach(function (k) { out[k] = base[k]; });
    if (raw && typeof raw === 'object') {
      Object.keys(raw).forEach(function (k) { out[k] = raw[k]; });
    }
    return out;
  }

  function mergeBudget(base, raw) {
    if (!raw || typeof raw !== 'object') return base;
    var out = mergeObject(base, raw);
    var byId = {};
    (Array.isArray(raw.cats) ? raw.cats : []).forEach(function (c) {
      if (c && c.id) byId[c.id] = c;
    });
    out.cats = base.cats.map(function (c) {
      var r = byId[c.id];
      if (!r) return { id: c.id, name: c.name, limit: c.limit };
      return {
        id: c.id,
        name: (typeof r.name === 'string' && r.name) ? r.name : c.name,
        limit: Number(r.limit) || 0
      };
    });
    return out;
  }

  /**
   * 版本迁移：补齐缺失字段，不覆盖已有值。
   * 返回 { data, changed }
   */
  function migrate(raw) {
    if (!raw || typeof raw !== 'object') {
      return { data: defaults(), changed: true };
    }
    var base = defaults();
    var out = mergeObject(base, raw);
    out.version = VERSION;
    out.project = mergeObject(base.project, raw.project);
    out.budget = mergeBudget(base.budget, raw.budget);
    out.settings = mergeObject(base.settings, raw.settings);
    ['expenses', 'todos', 'diaries', 'nodes', 'files', 'folders', 'ideas'].forEach(function (k) {
      if (!Array.isArray(raw[k])) out[k] = base[k];
    });
    var changed = !raw.version || Number(raw.version) < VERSION;
    if (!changed) {
      changed = false;
      ['expenses', 'todos', 'diaries', 'nodes', 'files', 'folders', 'ideas'].forEach(function (k) {
        if (!Array.isArray(raw[k])) changed = true;
      });
      if (!raw.project || !raw.budget || !raw.settings) changed = true;
    }
    return { data: out, changed: changed };
  }

  function loadOrInit(store) {
    return store.get('data').then(function (raw) {
      if (!raw) {
        var fresh = defaults();
        return store.set('data', fresh).then(function () { return fresh; });
      }
      var result = migrate(raw);
      if (result.changed) {
        return store.set('data', result.data).then(function () { return result.data; });
      }
      return result.data;
    });
  }

  function save(store, data) {
    return store.set('data', data).then(function () { return data; });
  }

  App.model = {
    VERSION: VERSION,
    CATS: CATS,
    STANDARD_NODES: STANDARD_NODES,
    DEFAULT_FOLDERS: DEFAULT_FOLDERS,
    DEFAULT_CHECKS: DEFAULT_CHECKS,
    uid: uid,
    defaults: defaults,
    migrate: migrate,
    loadOrInit: loadOrInit,
    save: save,
    makeNode: makeNode
  };
})(window);
