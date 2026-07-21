'use strict';
/**
 * 穿越模式 AI 双轨入口（tm-player-ai-bridge.js）
 *
 * 作用：统一 AI 调用入口，带降级链 + 缓存 + schema 校验 + 朝代污染检查。
 *
 * 铁律：
 * 1. 不允许业务代码直接调 callLLM/callAI（必须走 invoke）。
 * 2. 降级链每层带 level 标记（L1/L2/L3/fallback）。
 * 3. systemPrompt 朝代中立，不出现 SUSPECT 黑名单词。
 */
(function (global) {
  if (global.TM && global.TM.PlayerAIBridge) return;

  var TM = global.TM || (global.TM = {});

  /** 缓存（Map） */
  var CACHE = new Map();

  /** 朝代通用白名单（这些词不算污染） */
  var COMMON_DYNASTY_TERMS = [
    '皇帝', '君主', '圣上', '陛下', '天子', '朝廷', '官府', '州县', '百姓',
    '年', '月', '日', '春', '夏', '秋', '冬', '奏', '诏', '旨', '爵', '禄',
    '兵', '将', '军', '师', '民', '商', '农', '工', '士', '史', '书', '经'
  ];

  /** 朝代特有黑名单（出现且不在白名单则判为污染） */
  var SUSPECT = [
    '翰林院', '内阁', '军机处', '东厂', '西厂', '锦衣卫', '司礼监', '御马监',
    '尚书省', '中书省', '门下省', '六部', '九品', '科举', '乡试', '会试', '殿试',
    '丞相', '宰相', '太师', '太傅', '太保', '大学士', '军机大臣',
    '总督', '巡抚', '知府', '知县', '翰林', '进士', '举人', '秀才',
    '状元', '榜眼', '探花'
  ];

  /** level 是否合法 */
  function _isLevelEnabled(level) {
    return level === 'L1' || level === 'L2' || level === 'L3';
  }

  /** 取 AI level（默认 L2） */
  function _getAILevel(level) {
    if (_isLevelEnabled(level)) return level;
    return 'L2';
  }

  /** 数组 indexOf 兼容（ES5 风格） */
  function _indexOf(arr, item) {
    if (!arr) return -1;
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] === item) return i;
    }
    return -1;
  }

  /**
   * 计算缓存 key
   * key = `${scenarioKey}.${turn}.${playerRole}`
   * turn 优先从 GM.turn 取，playerRole 从 ctx.playerRole 或 GM.playerRole 取
   */
  function getCacheKey(opts) {
    opts = opts || {};
    var scenarioKey = opts.scenarioKey || '';

    var turn = '';
    if (global.GM && typeof global.GM.turn !== 'undefined') {
      turn = global.GM.turn;
    } else if (opts.ctx && typeof opts.ctx.turn !== 'undefined') {
      turn = opts.ctx.turn;
    }

    var playerRole = '';
    if (opts.ctx && opts.ctx.playerRole) {
      playerRole = opts.ctx.playerRole;
    } else if (global.GM && global.GM.playerRole) {
      playerRole = global.GM.playerRole;
    }

    return scenarioKey + '.' + turn + '.' + playerRole;
  }

  /**
   * 构造朝代中立的 systemPrompt
   * 不出现 SUSPECT 黑名单词
   */
  function _buildSystemPrompt(scene) {
    return '你是天命穿越模式叙事助手。当前场景：' + (scene || '通用') +
      '。要求：朝代中立叙事，不出现特定朝代官职或机构名称；' +
      '用通用中国古典意象，避免明清官制词汇；' +
      '输出简洁、可读、贴合角色处境。';
  }

  /** AI 应用点表：18 条 */
  var AI_SCENARIOS = {
    'home.family_event': {
      scenarioKey: 'home.family_event',
      tabId: 'home',
      level: 'L1',
      systemPrompt: _buildSystemPrompt('家族日常'),
      template: function (ctx) { return '家中又一日，照旧平安。'; }
    },
    'home.family_major': {
      scenarioKey: 'home.family_major',
      tabId: 'home',
      level: 'L2',
      systemPrompt: _buildSystemPrompt('家族大事'),
      template: function (ctx) { return '家中迎来一件要紧事，需要你拿主意。'; }
    },
    'court.debate': {
      scenarioKey: 'court.debate',
      tabId: 'court',
      level: 'L2',
      systemPrompt: _buildSystemPrompt('朝堂廷议'),
      template: function (ctx) { return '朝堂之上众说纷纭，你须择一表态。'; }
    },
    'court.debate_critical': {
      scenarioKey: 'court.debate_critical',
      tabId: 'court',
      level: 'L3',
      systemPrompt: _buildSystemPrompt('廷议关键议题'),
      template: function (ctx) { return '此议关乎大局，需慎重决断。'; }
    },
    'court.memorial_reply': {
      scenarioKey: 'court.memorial_reply',
      tabId: 'court',
      level: 'L2',
      systemPrompt: _buildSystemPrompt('奏章批复'),
      template: function (ctx) { return '奏章呈上，请拟批语。'; }
    },
    'social.npc_visit': {
      scenarioKey: 'social.npc_visit',
      tabId: 'social',
      level: 'L2',
      systemPrompt: _buildSystemPrompt('客来访'),
      template: function (ctx) { return '有客来访，落座叙话。'; }
    },
    'social.secret_talk': {
      scenarioKey: 'social.secret_talk',
      tabId: 'social',
      level: 'L3',
      systemPrompt: _buildSystemPrompt('密谈'),
      template: function (ctx) { return '密室之内，来人欲言又止。'; }
    },
    'social.letter': {
      scenarioKey: 'social.letter',
      tabId: 'social',
      level: 'L2',
      systemPrompt: _buildSystemPrompt('书信往来'),
      template: function (ctx) { return '书信一封，展卷细读。'; }
    },
    'study.breakthrough': {
      scenarioKey: 'study.breakthrough',
      tabId: 'study',
      level: 'L2',
      systemPrompt: _buildSystemPrompt('学问精进'),
      template: function (ctx) { return '静心研读，似有所悟。'; }
    },
    'tech.research': {
      scenarioKey: 'tech.research',
      tabId: 'tech',
      level: 'L1',
      systemPrompt: _buildSystemPrompt('技艺研发'),
      template: function (ctx) { return '工坊之内，新物初成。'; }
    },
    'tech.dynasty_branch': {
      scenarioKey: 'tech.dynasty_branch',
      tabId: 'tech',
      level: 'L3',
      systemPrompt: _buildSystemPrompt('技艺分歧抉择'),
      template: function (ctx) { return '技艺之路分歧，择一而行。'; }
    },
    'tech.memorial': {
      scenarioKey: 'tech.memorial',
      tabId: 'tech',
      level: 'L2',
      systemPrompt: _buildSystemPrompt('技艺奏章'),
      template: function (ctx) { return '新物既成，拟章奏报。'; }
    },
    'military.war_council': {
      scenarioKey: 'military.war_council',
      tabId: 'military',
      level: 'L2',
      systemPrompt: _buildSystemPrompt('军议'),
      template: function (ctx) { return '众将齐聚，议定进止。'; }
    },
    'military.battle_report': {
      scenarioKey: 'military.battle_report',
      tabId: 'military',
      level: 'L2',
      systemPrompt: _buildSystemPrompt('战报'),
      template: function (ctx) { return '战报传来，胜败有数。'; }
    },
    'military.rebel_plot': {
      scenarioKey: 'military.rebel_plot',
      tabId: 'military',
      level: 'L3',
      systemPrompt: _buildSystemPrompt('叛谋'),
      template: function (ctx) { return '有谋乱之兆，须早作绸缪。'; }
    },
    'fortune.random': {
      scenarioKey: 'fortune.random',
      tabId: 'fortune',
      level: 'L3',
      systemPrompt: _buildSystemPrompt('机缘'),
      template: function (ctx) { return '一桩机缘，悄然而至。'; }
    },
    'adversity.disaster': {
      scenarioKey: 'adversity.disaster',
      tabId: 'adversity',
      level: 'L1',
      systemPrompt: _buildSystemPrompt('灾祸'),
      template: function (ctx) { return '天降灾祸，需速应对。'; }
    },
    'adversity.life_turn': {
      scenarioKey: 'adversity.life_turn',
      tabId: 'adversity',
      level: 'L3',
      systemPrompt: _buildSystemPrompt('人生转折'),
      template: function (ctx) { return '人生至此，一重大转折。'; }
    }
  };

  /**
   * 朝代污染检查
   * @param {object|string} obj 待检对象（对象会 JSON.stringify）
   * @param {Array<string>} allowedTerms 调用方允许的额外白名单词
   * @returns {boolean} true=命中污染
   */
  function _containsDynastySpecificTerms(obj, allowedTerms) {
    var text;
    if (typeof obj === 'string') {
      text = obj;
    } else {
      try { text = JSON.stringify(obj); } catch (e) { text = String(obj); }
    }
    if (!text) return false;

    // 合并白名单 = allowedTerms + COMMON_DYNASTY_TERMS
    var whitelist = [].concat(allowedTerms || [], COMMON_DYNASTY_TERMS);

    for (var i = 0; i < SUSPECT.length; i++) {
      var term = SUSPECT[i];
      if (text.indexOf(term) !== -1 && _indexOf(whitelist, term) === -1) {
        return true;
      }
    }
    return false;
  }

  /**
   * 校验 AI 输出
   * @param {string|object} raw AI 原始输出（字符串则先 JSON.parse）
   * @param {object} schema { required: [], optional: [] }
   * @param {Array<string>} dynastyTerms 朝代白名单
   * @returns {object|null} 通过返回 parsed 对象，失败返回 null
   */
  function validateAIOutput(raw, schema, dynastyTerms) {
    var parsed;
    if (typeof raw === 'string') {
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        return null;
      }
    } else {
      parsed = raw;
    }

    // schema 检查 required
    if (schema && typeof schema === 'object') {
      var required = schema.required || [];
      for (var i = 0; i < required.length; i++) {
        var field = required[i];
        if (parsed === null || typeof parsed !== 'object' || !(field in parsed)) {
          return null;
        }
      }
    }

    // 朝代污染检查
    if (_containsDynastySpecificTerms(parsed, dynastyTerms || [])) {
      return null;
    }

    return parsed;
  }

  /** 从 LLM/AI 返回中提取文本 */
  function _extractText(resp) {
    if (!resp) return '';
    if (typeof resp === 'string') return resp;
    if (typeof resp.text === 'string') return resp.text;
    if (typeof resp.content === 'string') return resp.content;
    if (typeof resp.output === 'string') return resp.output;
    if (typeof resp.message === 'string') return resp.message;
    try { return JSON.stringify(resp); } catch (e) { return ''; }
  }

  /** 构造 prompt 字符串 */
  function _buildPrompt(scenario, opts) {
    var ctx = (opts && opts.ctx) ? opts.ctx : {};
    try { return JSON.stringify(ctx); } catch (e) { return String(ctx); }
  }

  /** 第三层降级：template（opts.template 优先，否则 scenario.template） */
  function _fallbackToTemplate(opts, scenario, cacheKey, turn, resolve) {
    var text = '';
    if (opts && typeof opts.template === 'function') {
      try { text = opts.template(opts && opts.ctx); } catch (e) { text = ''; }
    }
    if (!text && scenario && typeof scenario.template === 'function') {
      try { text = scenario.template(opts && opts.ctx); } catch (e) { text = ''; }
    }
    if (!text) text = '（无内容）';

    var entry = { level: 'fallback', text: text, raw: null, turn: turn };
    CACHE.set(cacheKey, entry);
    resolve({ level: 'fallback', text: text, raw: null });
  }

  /** 第二层降级：callAI */
  function _fallbackToCallAI(opts, systemPrompt, prompt, scenario, cacheKey, turn, resolve) {
    try {
      if (typeof global.callAI === 'function') {
        var aiResult = global.callAI({ prompt: prompt, systemPrompt: systemPrompt });
        if (aiResult && typeof aiResult.then === 'function') {
          aiResult.then(function (resp) {
            var text = _extractText(resp);
            if (text) {
              var entry = { level: 'L1', text: text, raw: resp, turn: turn };
              CACHE.set(cacheKey, entry);
              resolve({ level: 'L1', text: text, raw: resp });
              return;
            }
            _fallbackToTemplate(opts, scenario, cacheKey, turn, resolve);
          }).catch(function () {
            _fallbackToTemplate(opts, scenario, cacheKey, turn, resolve);
          });
          return;
        } else if (aiResult) {
          var text = _extractText(aiResult);
          if (text) {
            var entry = { level: 'L1', text: text, raw: aiResult, turn: turn };
            CACHE.set(cacheKey, entry);
            resolve({ level: 'L1', text: text, raw: aiResult });
            return;
          }
        }
      }
    } catch (e) {
      // 落到 template
    }
    _fallbackToTemplate(opts, scenario, cacheKey, turn, resolve);
  }

  /**
   * 统一 AI 调用入口
   * @param {object} opts { scenarioKey, ctx, template, level, allowedTerms }
   * @returns {Promise<{level:string,text:string,raw:object|null}>}
   */
  function invoke(opts) {
    return new Promise(function (resolve) {
      opts = opts || {};
      var scenarioKey = opts.scenarioKey || '';
      var scenario = AI_SCENARIOS[scenarioKey];
      var level = _getAILevel(opts.level);
      var cacheKey = getCacheKey(opts);

      // 取 turn（用于 clearCache 精确删除）
      var turn = '';
      if (global.GM && typeof global.GM.turn !== 'undefined') {
        turn = global.GM.turn;
      } else if (opts.ctx && typeof opts.ctx.turn !== 'undefined') {
        turn = opts.ctx.turn;
      }

      // 调用前查缓存
      if (CACHE.has(cacheKey)) {
        var cached = CACHE.get(cacheKey);
        resolve({ level: cached.level, text: cached.text, raw: cached.raw || null });
        return;
      }

      var systemPrompt = (scenario && scenario.systemPrompt) || _buildSystemPrompt('通用');
      var prompt = _buildPrompt(scenario, opts);

      // 第一层：callLLM（5s 超时）
      try {
        if (typeof global.callLLM === 'function') {
          var llmResult = global.callLLM({ prompt: prompt, systemPrompt: systemPrompt, timeout: 5000 });
          if (llmResult && typeof llmResult.then === 'function') {
            llmResult.then(function (resp) {
              var text = _extractText(resp);
              if (text) {
                var entry = { level: level, text: text, raw: resp, turn: turn };
                CACHE.set(cacheKey, entry);
                resolve({ level: level, text: text, raw: resp });
                return;
              }
              _fallbackToCallAI(opts, systemPrompt, prompt, scenario, cacheKey, turn, resolve);
            }).catch(function () {
              _fallbackToCallAI(opts, systemPrompt, prompt, scenario, cacheKey, turn, resolve);
            });
            return;
          } else if (llmResult) {
            var text = _extractText(llmResult);
            if (text) {
              var entry = { level: level, text: text, raw: llmResult, turn: turn };
              CACHE.set(cacheKey, entry);
              resolve({ level: level, text: text, raw: llmResult });
              return;
            }
          }
        }
      } catch (e) {
        // 落到 callAI
      }
      _fallbackToCallAI(opts, systemPrompt, prompt, scenario, cacheKey, turn, resolve);
    });
  }

  /** 取场景配置 */
  function getScenario(scenarioKey) {
    return AI_SCENARIOS[scenarioKey] || null;
  }

  /** 列出所有 scenarioKey */
  function listScenarioKeys() {
    return Object.keys(AI_SCENARIOS);
  }

  /**
   * 清缓存
   * @param {string|number} turn 不传则全清；传则只清该 turn 的条目
   */
  function clearCache(turn) {
    if (typeof turn === 'undefined') {
      CACHE.clear();
      return;
    }
    var toDelete = [];
    CACHE.forEach(function (val, key) {
      if (val && String(val.turn) === String(turn)) {
        toDelete.push(key);
      }
    });
    for (var i = 0; i < toDelete.length; i++) {
      CACHE.delete(toDelete[i]);
    }
  }

  /** 缓存大小（调试用） */
  function _cacheSize() {
    return CACHE.size;
  }

  TM.PlayerAIBridge = {
    invoke: invoke,
    validateAIOutput: validateAIOutput,
    clearCache: clearCache,
    getCacheKey: getCacheKey,
    getScenario: getScenario,
    listScenarioKeys: listScenarioKeys,
    AI_SCENARIOS: AI_SCENARIOS,
    _cacheSize: _cacheSize,
    _isLevelEnabled: _isLevelEnabled,
    _getAILevel: _getAILevel,
    _containsDynastySpecificTerms: _containsDynastySpecificTerms
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TM.PlayerAIBridge;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : (typeof global !== 'undefined' ? global : this)));
