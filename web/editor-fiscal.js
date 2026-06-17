// ═══════════════════════════════════════════════════════════════
// 编辑器 · 财政初值配置（帑廪 + 内帑）
// ═══════════════════════════════════════════════════════════════

function openFiscalConfigEditor() {
  if (typeof scriptData === 'undefined') {
    alert('剧本数据未就绪');
    return;
  }
  if (!scriptData.guoku) scriptData.guoku = {};
  if (!scriptData.neitang) scriptData.neitang = {};
  if (!scriptData.fiscalConfig) scriptData.fiscalConfig = {};

  var gk = scriptData.guoku;
  var nt = scriptData.neitang;
  var fc = scriptData.fiscalConfig;

  function numField(id, label, val, placeholder) {
    return '<div class="form-group" style="margin-bottom:6px;">'+
      '<label style="font-size:0.78rem;display:block;margin-bottom:2px;">' + label + '</label>'+
      '<input type="number" id="fiscalEd-' + id + '" '+
      'value="' + (val !== undefined && val !== null ? val : '') + '" '+
      'placeholder="' + (placeholder || '留空则按朝代预设') + '" '+
      'style="width:100%;padding:5px 8px;">'+
      '</div>';
  }

  function textField(id, label, val, placeholder) {
    return '<div class="form-group" style="margin-bottom:6px;">'+
      '<label style="font-size:0.78rem;display:block;margin-bottom:2px;">' + label + '</label>'+
      '<input type="text" id="fiscalEd-' + id + '" '+
      'value="' + (val || '') + '" placeholder="' + (placeholder || '') + '" '+
      'style="width:100%;padding:5px 8px;">'+
      '</div>';
  }

  var body = '';
  body += '<div style="margin-bottom:0.8rem;font-size:0.82rem;color:var(--txt-d);line-height:1.5;">'+
    '财政配置。<b>帑廪/内帑的钱粮布库存与月入月支不再此处手填</b>——'+
    '改由"行政区划"的人口/繁荣/税率 × "官制"的公库初值与年额 自然聚合得出。<br>'+
    '此处仅配置<b>规则性</b>内容（单位/税种开关/央地分账/货币政策/内帑规则/皇庄/户口基线/环境/诏令/权力初值）。<br>'+
    '参考 <code>设计方案-财政系统.md §A/F</code>、<code>设计方案-央地财政.md §3-§5</code>。'+
    '</div>';

  // Tab 切换（去掉独立的"帑廪"Tab；"内帑"Tab 缩为"内帑规则"）
  body += '<div style="display:flex;gap:4px;margin-bottom:0.6rem;border-bottom:1px solid var(--bdr);flex-wrap:wrap;">'+
    '<button class="fisc-tab-btn active" onclick="_fiscTab(\'fisc-units\',this)" style="padding:5px 12px;cursor:pointer;border:1px solid var(--bdr);border-bottom:none;background:var(--gold-d);color:#fff;">单位/税种</button>'+
    '<button class="fisc-tab-btn" onclick="_fiscTab(\'fisc-centrallocal\',this)" style="padding:5px 12px;cursor:pointer;border:1px solid var(--bdr);border-bottom:none;background:var(--bg-2);color:var(--txt-s);">央地分账</button>'+
    '<button class="fisc-tab-btn" onclick="_fiscTab(\'fisc-currency\',this)" style="padding:5px 12px;cursor:pointer;border:1px solid var(--bdr);border-bottom:none;background:var(--bg-2);color:var(--txt-s);">货币政策</button>'+
    '<button class="fisc-tab-btn" onclick="_fiscTab(\'fisc-neitang\',this)" style="padding:5px 12px;cursor:pointer;border:1px solid var(--bdr);border-bottom:none;background:var(--bg-2);color:var(--txt-s);">内帑规则</button>'+
    '<button class="fisc-tab-btn" onclick="_fiscTab(\'fisc-population\',this)" style="padding:5px 12px;cursor:pointer;border:1px solid var(--bdr);border-bottom:none;background:var(--bg-2);color:var(--txt-s);">户口</button>'+
    '<button class="fisc-tab-btn" onclick="_fiscTab(\'fisc-environment\',this)" style="padding:5px 12px;cursor:pointer;border:1px solid var(--bdr);border-bottom:none;background:var(--bg-2);color:var(--txt-s);">环境</button>'+
    '<button class="fisc-tab-btn" onclick="_fiscTab(\'fisc-edict\',this)" style="padding:5px 12px;cursor:pointer;border:1px solid var(--bdr);border-bottom:none;background:var(--bg-2);color:var(--txt-s);">诏令</button>'+
    '<button class="fisc-tab-btn" onclick="_fiscTab(\'fisc-authority\',this)" style="padding:5px 12px;cursor:pointer;border:1px solid var(--bdr);border-bottom:none;background:var(--bg-2);color:var(--txt-s);">权力初值</button>'+
    '<button class="fisc-tab-btn" onclick="_fiscValidate()" style="padding:5px 12px;cursor:pointer;border:1px solid var(--vermillion-400);border-bottom:none;background:var(--bg-2);color:var(--vermillion-400);margin-left:auto;">⚖ 核验配置</button>'+
    '</div>';

  // （已去掉"帑廪"Tab：帑廪钱粮布库存与月入月支由 行政区划税收级联 + 官制公库年额 自然结算。）

  // Tab: 内帑规则（不含库存/月入——由"皇庄田亩+规则"运行时累积得出）
  body += '<div id="fisc-neitang" class="fisc-panel" style="display:none;">';
  body += '<div style="font-size:0.78rem;color:var(--txt-d);line-height:1.6;margin-bottom:0.6rem;padding:0.5rem;background:var(--bg-2);border-radius:4px;">'+
    '内帑（皇帝私藏）不再手填起始金额与月入。运行时从：皇庄田亩租赋 + 贡赋 + 罚没入官 + 赏赐支出 自然累积。<br>此处仅配置<b>规则</b>：皇庄规模、宗室压力、内外流转规则。'+
    '</div>';
  body += '<div style="margin-bottom:0.6rem;"><button class="btn" style="background:var(--gold-d);color:#fff;font-size:0.78rem;padding:4px 12px;" onclick="aiGenFiscalConfig&&aiGenFiscalConfig()">🪄 AI 一键生成规则（央地+货币+内帑）</button></div>';

  body += '<div style="font-size:0.82rem;color:var(--gold);margin-bottom:0.4rem;">皇庄</div>';
  body += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">';
  body += '<div>';
  body += numField('nt-huangzhuangAcres', '皇庄田亩（亩）', nt.huangzhuangAcres);
  body += '<div style="font-size:0.7rem;color:var(--txt-d);margin-top:4px;">皇庄田租 = 田亩 × 0.5 两/年，自动入内帑</div>';
  body += '</div></div>';

  // 内帑规则预设选择器
  var DETAILED_PRESETS = (typeof NeitangEngine !== 'undefined' && NeitangEngine.DETAILED_PRESETS) || {};
  body += '<div style="font-size:0.82rem;color:var(--gold);margin:0.8rem 0 0.4rem;">内帑规则预设</div>';
  body += '<div class="form-group">'+
    '<label style="font-size:0.78rem;display:block;margin-bottom:2px;">快捷应用 15 条历史预设</label>'+
    '<select id="fiscalEd-presetKey" style="width:100%;padding:5px 8px;">'+
    '<option value="">--自定义--</option>';
  Object.keys(DETAILED_PRESETS).forEach(function(k) {
    var p = DETAILED_PRESETS[k];
    body += '<option value="' + k + '">' + p.name + ' · ' + (p.historical || '').substring(0, 30) + '</option>';
  });
  body += '</select></div>';

  // 内帑规则 JSON
  var currentRules = (fc.neicangRules) || (nt.neicangRules) || {};
  body += '<div style="font-size:0.82rem;color:var(--gold);margin:0.8rem 0 0.4rem;">内帑规则 JSON（高级）</div>';
  body += '<textarea id="fiscalEd-neicangRules" rows="10" style="width:100%;font-family:monospace;font-size:0.72rem;padding:6px;" placeholder=\'见设计方案 §F.2\'>'+
    JSON.stringify(currentRules, null, 2) + '</textarea>';

  // 快速选项
  body += '<div style="font-size:0.82rem;color:var(--gold);margin:0.8rem 0 0.4rem;">快速开关</div>';
  var rcp = (currentRules.royalClanPressure) || {};
  body += '<label style="display:flex;align-items:center;gap:6px;font-size:0.78rem;">'+
    '<input type="checkbox" id="fiscalEd-rcpEnabled"' + (rcp.enabled ? ' checked' : '') + '>'+
    '明代宗室俸禄压力（royalClanPressure）'+
    '</label>';
  body += '</div>';

  // Tab 3: 单位和税种
  body += '<div id="fisc-units" class="fisc-panel" style="display:none;">';
  body += '<div style="font-size:0.82rem;color:var(--gold);margin-bottom:0.4rem;">货币单位</div>';
  var unit = (fc.unit) || { money: '两', grain: '石', cloth: '匹' };
  body += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">';
  body += textField('unit-money', '钱单位', unit.money, '两/贯');
  body += textField('unit-grain', '粮单位', unit.grain, '石/斛');
  body += textField('unit-cloth', '布单位', unit.cloth, '匹/束');
  body += '</div>';

  body += '<div style="font-size:0.82rem;color:var(--gold);margin:0.8rem 0 0.4rem;">税种启用</div>';
  var taxEnabled = (fc.taxesEnabled) || {};
  var taxes = [
    ['tianfu','田赋'],['dingshui','丁税'],['caoliang','漕粮'],
    ['yanlizhuan','盐铁专卖'],['shipaiShui','市舶'],['quanShui','榷税'],
    ['juanNa','捐纳'],['qita','其他']
  ];
  body += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:4px;">';
  taxes.forEach(function(t) {
    var checked = taxEnabled[t[0]] !== false ? ' checked' : '';
    body += '<label style="display:flex;align-items:center;gap:4px;font-size:0.78rem;">'+
      '<input type="checkbox" id="fiscalEd-tax-' + t[0] + '"' + checked + '>' + t[1] + '</label>';
  });
  body += '</div>';

  // 自定义税种（JSON 数组）
  body += '<div style="font-size:0.82rem;color:var(--gold);margin:0.8rem 0 0.4rem;display:flex;align-items:center;gap:8px;">自定义税种（JSON 数组）<button class="btn" style="font-size:0.7rem;padding:2px 8px;" onclick="if(typeof aiPolishCustomTaxes===\'function\')aiPolishCustomTaxes();">🪄 AI 润色</button></div>';
  body += '<div style="font-size:0.7rem;color:var(--txt-d);margin-bottom:0.3rem;">'+
    '字段：id / name / formulaType(perCapita/flat/percent) / rate / base(population/land/commerce) / amount / description</div>';
  body += '<textarea id="fiscalEd-customTaxes" rows="6" style="width:100%;font-family:monospace;font-size:0.72rem;padding:6px;" placeholder=\'[{"id":"chaShui","name":"茶税","formulaType":"perCapita","rate":0.008,"description":"每人年 0.008 两"}]\'>'+
    JSON.stringify(fc.customTaxes || [], null, 2) + '</textarea>';

  body += '</div>';  // fisc-units end

  // Tab 4: 央地分账
  if (!fc.centralLocalRules) fc.centralLocalRules = {};
  var clRules = fc.centralLocalRules;
  body += '<div id="fisc-centrallocal" class="fisc-panel" style="display:none;">';
  body += '<div style="font-size:0.82rem;color:var(--gold);margin-bottom:0.4rem;">分账预设（11 套历史模式）</div>';
  var ALLOC_PRESETS = (typeof CentralLocalEngine !== 'undefined' && CentralLocalEngine.ALLOCATION_PRESETS) || {};
  body += '<div class="form-group">'+
    '<label style="font-size:0.78rem;display:block;margin-bottom:2px;">预设（选中后应用到所有区域）</label>'+
    '<select id="fiscalEd-clPreset" style="width:100%;padding:5px 8px;">'+
    '<option value="">--不指定（运行时按朝代推断）--</option>';
  Object.keys(ALLOC_PRESETS).forEach(function(k) {
    var p = ALLOC_PRESETS[k];
    var sel = (clRules.preset === k) ? ' selected' : '';
    body += '<option value="' + k + '"' + sel + '>' + p.name + ' (' + p.mode + ')</option>';
  });
  body += '</select></div>';
  body += '<div style="font-size:0.82rem;color:var(--gold);margin:0.8rem 0 0.4rem;display:flex;align-items:center;gap:8px;">区域特例（JSON）<button class="btn" style="font-size:0.7rem;padding:2px 8px;" onclick="if(typeof aiPolishRegionOverrides===\'function\')aiPolishRegionOverrides();">🪄 AI 润色</button></div>';
  body += '<div style="font-size:0.7rem;color:var(--txt-d);margin-bottom:0.3rem;">'+
    '字段：regionId → { ratios / perTax / autonomy / reason }</div>';
  body += '<textarea id="fiscalEd-clRegionOverrides" rows="5" style="width:100%;font-family:monospace;font-size:0.72rem;padding:6px;" placeholder=\'{"江南":{"perTax":{"land_grain":{"qiyun":0.8,"cunliu":0.2}},"reason":"财赋重地"}}\'>'+
    JSON.stringify(clRules.regionOverrides || {}, null, 2) + '</textarea>';
  body += '<div style="font-size:0.82rem;color:var(--gold);margin:0.8rem 0 0.4rem;">14 项地方支出说明</div>';
  body += '<div style="font-size:0.7rem;color:var(--txt-d);line-height:1.7;padding:0.4rem;background:var(--bg-2);border-radius:4px;">';
  var EXPL = (typeof CentralLocalEngine !== 'undefined' && CentralLocalEngine.EXPENDITURE_LABELS) || {};
  Object.keys(EXPL).forEach(function(k) { body += '<b>' + EXPL[k] + '</b>（' + k + '） · '; });
  body += '</div>';
  body += '</div>'; // fisc-centrallocal end

  // Tab 5: 货币政策
  if (!fc.currencyRules) fc.currencyRules = {};
  var cr = fc.currencyRules;
  body += '<div id="fisc-currency" class="fisc-panel" style="display:none;">';
  body += '<div style="font-size:0.82rem;color:var(--gold);margin-bottom:0.4rem;">启用币种</div>';
  var curEn = cr.enabledCoins || {};
  body += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">';
  [['copper','铜','秦至清普世主币'],['silver','银','宋起辅币，明清主币'],['gold','金','赏赐贮藏，先秦 常用'],['iron','铁','宋四川专用'],['shell','贝','先秦'],['paper','纸','宋起多朝']].forEach(function(k) {
    var chk = curEn[k[0]] ? 'checked' : '';
    body += '<label style="font-size:0.75rem;display:flex;align-items:center;gap:4px;" title="' + k[2] + '">'+
      '<input type="checkbox" id="fiscalEd-curr-' + k[0] + '" ' + chk + '>' + k[1] + '</label>';
  });
  body += '</div>';
  body += '<div style="font-size:0.82rem;color:var(--gold);margin:0.8rem 0 0.4rem;">本位制</div>';
  body += '<div class="form-group">'+
    '<select id="fiscalEd-curr-standard" style="width:100%;padding:5px 8px;">'+
    '<option value=""' + (!cr.initialStandard ? ' selected' : '') + '>--按朝代自动--</option>'+
    '<option value="copper"' + (cr.initialStandard === 'copper' ? ' selected' : '') + '>纯铜本位</option>'+
    '<option value="silver"' + (cr.initialStandard === 'silver' ? ' selected' : '') + '>纯银本位</option>'+
    '<option value="copper_paper"' + (cr.initialStandard === 'copper_paper' ? ' selected' : '') + '>铜纸并行</option>'+
    '<option value="silver_copper_paper"' + (cr.initialStandard === 'silver_copper_paper' ? ' selected' : '') + '>银铜纸三元</option>'+
    '</select></div>';
  body += '<div style="font-size:0.82rem;color:var(--gold);margin:0.8rem 0 0.4rem;">纸币预设</div>';
  var PP = (typeof CurrencyEngine !== 'undefined' && CurrencyEngine.PAPER_PRESETS) || {};
  body += '<div class="form-group">'+
    '<select id="fiscalEd-curr-paper" style="width:100%;padding:5px 8px;">'+
    '<option value="">--无--</option>';
  Object.keys(PP).forEach(function(k) {
    var p = PP[k];
    var sel = (cr.defaultPresets && cr.defaultPresets.paper === k) ? ' selected' : '';
    body += '<option value="' + k + '"' + sel + '>' + (p.name || k) + ' (' + p.dynasty + ')</option>';
  });
  body += '</select></div>';
  body += '<label style="display:flex;align-items:center;gap:6px;font-size:0.78rem;margin-top:0.6rem;">'+
    '<input type="checkbox" id="fiscalEd-curr-foreignFlow" ' + (cr.foreignFlowEnabled ? 'checked' : '') + '>'+
    '启用海外银流模型（明清建议勾选）</label>';
  body += '<label style="display:flex;align-items:center;gap:6px;font-size:0.78rem;margin-top:0.3rem;">'+
    '<input type="checkbox" id="fiscalEd-curr-canMintPrivately" ' + (cr.canMintPrivately ? 'checked' : '') + '>'+
    '允许私铸（默认否）</label>';
  body += '<div style="font-size:0.82rem;color:var(--gold);margin:0.8rem 0 0.4rem;">改革预设列表（15 条）</div>';
  var REFS = (typeof CurrencyEngine !== 'undefined' && CurrencyEngine.REFORM_PRESETS) || [];
  body += '<div style="font-size:0.7rem;color:var(--txt-d);line-height:1.7;padding:0.4rem;background:var(--bg-2);border-radius:4px;max-height:140px;overflow-y:auto;">';
  REFS.forEach(function(r) {
    body += '<div>· <b>' + r.name + '</b>（' + r.dynasty + ' ' + r.historicalYear + '）· ' + r.description + ' · 成功率 ' + (r.baseSuccessRate*100) + '%</div>';
  });
  body += '</div>';
  body += '</div>'; // fisc-currency end

  // Tab 6: 户口系统
  if (!scriptData.populationConfig) scriptData.populationConfig = {};
  var pc = scriptData.populationConfig;
  body += '<div id="fisc-population" class="fisc-panel" style="display:none;">';
  body += '<div style="margin-bottom:0.6rem;"><button class="btn" style="background:var(--gold-d);color:#fff;font-size:0.78rem;padding:4px 12px;" onclick="aiGenPopulationConfig&&aiGenPopulationConfig()">🪄 AI 一键生成户口配置</button></div>';
  body += '<div style="font-size:0.82rem;color:var(--gold);margin-bottom:0.4rem;">全国初始人口</div>';
  body += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">';
  body += numField('pop-households', '户数', pc.initial && pc.initial.nationalHouseholds);
  body += numField('pop-mouths', '总口', pc.initial && pc.initial.nationalMouths);
  body += numField('pop-ding', '丁数', pc.initial && pc.initial.nationalDing);
  body += '</div>';
  body += '<div style="font-size:0.82rem;color:var(--gold);margin:0.8rem 0 0.4rem;">丁年龄范围</div>';
  body += '<div style="display:flex;gap:12px;">';
  body += numField('pop-dingAgeMin', '丁始龄', pc.dingAgeRange && pc.dingAgeRange[0]);
  body += numField('pop-dingAgeMax', '丁终龄', pc.dingAgeRange && pc.dingAgeRange[1]);
  body += '</div>';
  body += '<div style="font-size:0.82rem;color:var(--gold);margin:0.8rem 0 0.4rem;">启用色目户</div>';
  var catEnabled = pc.categoryEnabled || [];
  body += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;">';
  [['bianhu','编户'],['junhu','军户'],['jianghu','匠户'],['ruhu','儒户'],['sengdao','僧道'],['yuehu','乐户'],['danhu','疍户'],['nubi','奴婢'],['huangzhuang','皇庄'],['touxia','投下']].forEach(function(c) {
    var chk = catEnabled.indexOf(c[0]) >= 0 ? 'checked' : '';
    body += '<label style="font-size:0.72rem;"><input type="checkbox" id="fiscalEd-cat-' + c[0] + '" ' + chk + '>' + c[1] + '</label>';
  });
  body += '</div>';
  body += '<div style="font-size:0.82rem;color:var(--gold);margin:0.8rem 0 0.4rem;">户等制</div>';
  body += '<select id="fiscalEd-gradeSystem" style="width:100%;padding:5px 8px;">'+
    '<option value=""' + (!pc.gradeSystem ? ' selected' : '') + '>--按朝代自动--</option>'+
    '<option value="tang_9"' + (pc.gradeSystem==='tang_9' ? ' selected' : '') + '>唐九等</option>'+
    '<option value="song_5"' + (pc.gradeSystem==='song_5' ? ' selected' : '') + '>宋五等</option>'+
    '<option value="ming_10"' + (pc.gradeSystem==='ming_10' ? ' selected' : '') + '>明十等</option>'+
    '<option value="none"' + (pc.gradeSystem==='none' ? ' selected' : '') + '>无</option></select>';
  body += '</div>'; // fisc-population end

  // Tab 7: 环境承载力
  if (!scriptData.environmentConfig) scriptData.environmentConfig = {};
  var ec = scriptData.environmentConfig;
  body += '<div id="fisc-environment" class="fisc-panel" style="display:none;">';
  body += '<div style="margin-bottom:0.6rem;"><button class="btn" style="background:var(--gold-d);color:#fff;font-size:0.78rem;padding:4px 12px;" onclick="aiGenEnvironmentConfig&&aiGenEnvironmentConfig()">🪄 AI 一键生成环境承载力配置</button></div>';
  body += '<div style="font-size:0.82rem;color:var(--gold);margin-bottom:0.4rem;">气候时期</div>';
  body += '<select id="fiscalEd-climate" style="width:100%;padding:5px 8px;">'+
    '<option value=""' + (!ec.climatePhase ? ' selected' : '') + '>--正常--</option>'+
    '<option value="little_ice_age"' + (ec.climatePhase==='little_ice_age' ? ' selected' : '') + '>小冰期（明末清初）</option>'+
    '<option value="medieval_warm"' + (ec.climatePhase==='medieval_warm' ? ' selected' : '') + '>中世纪暖期（唐宋）</option>'+
    '</select>';
  body += '<div style="font-size:0.82rem;color:var(--gold);margin:0.8rem 0 0.4rem;">13 类环境政策（可由运行时玩家诏令触发）</div>';
  var POLS = (typeof EnvCapacityEngine !== 'undefined' && EnvCapacityEngine.ENV_POLICIES) || [];
  body += '<div style="font-size:0.7rem;color:var(--txt-d);line-height:1.8;padding:0.4rem;background:var(--bg-2);border-radius:4px;max-height:200px;overflow-y:auto;">';
  POLS.forEach(function(p) {
    body += '<div>· <b>' + p.name + '</b>（' + p.id + '）· 成本 ' + (p.cost && p.cost.money ? p.cost.money + '贯' : '—') + '</div>';
  });
  body += '</div>';
  body += '<div style="font-size:0.82rem;color:var(--gold);margin:0.8rem 0 0.4rem;">20+ 环境危机事件自动触发（无需配置）</div>';
  body += '<div style="font-size:0.7rem;color:var(--txt-d);line-height:1.7;">黄河改道/淮河泛滥/大水/旱/蝗/瘟疫/饥荒/山火/沙尘/地震/台风/山尽伐/井泉涸/盐侵/沙侵/虫害/地力尽/都市疫疠/河决/严冬</div>';
  body += '</div>'; // fisc-environment end

  // Tab 8: 诏令预设
  body += '<div id="fisc-edict" class="fisc-panel" style="display:none;">';
  body += '<div style="font-size:0.82rem;color:var(--gold);margin-bottom:0.4rem;">30 条历代典范诏书（含剧本自定义）</div>';
  var EDICT_P = (typeof EdictParser !== 'undefined')
    ? (typeof EdictParser.getHistoricalEdictPresets === 'function'
        ? EdictParser.getHistoricalEdictPresets()
        : (EdictParser.HISTORICAL_EDICT_PRESETS || []))
    : [];
  body += '<div style="font-size:0.7rem;color:var(--txt-d);line-height:1.8;padding:0.4rem;background:var(--bg-2);border-radius:4px;max-height:320px;overflow-y:auto;">';
  EDICT_P.forEach(function(e) {
    body += '<div>· <b>[' + e.dynasty + ']</b> ' + e.text + ' <span style="color:var(--txt-s);">(' + e.type + ')</span></div>';
  });
  body += '</div>';
  body += '<div style="font-size:0.8rem;color:var(--txt-s);margin-top:0.6rem;">运行时：玩家输入诏书 → EdictParser 三维评估（完整度/紧急度/重要度）→ 分流 direct/memorial/ask</div>';
  body += '</div>'; // fisc-edict end

  // Tab 9: 权力初值（皇威/皇权/民心/腐败/党争）
  if (!scriptData.authorityConfig) scriptData.authorityConfig = {};
  var ac = scriptData.authorityConfig;
  if (!ac.initial) ac.initial = {};
  body += '<div id="fisc-authority" class="fisc-panel" style="display:none;">';
  body += '<div style="margin-bottom:0.6rem;"><button class="btn" style="background:var(--gold-d);color:#fff;font-size:0.78rem;padding:4px 12px;" onclick="aiGenAuthorityConfig&&aiGenAuthorityConfig()">🪄 AI 一键生成权力初值</button></div>';
  body += '<div style="font-size:0.82rem;color:var(--gold);margin-bottom:0.4rem;">五变量初值（0-100，留空则按朝代默认）</div>';
  body += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">';
  body += numField('auth-huangwei', '皇威（50=常，90+=暴君，30-=失威）', ac.initial.huangwei, '默认 50');
  body += numField('auth-huangquan', '皇权（55=制衡，70+=专制，40-=权臣）', ac.initial.huangquan, '默认 55');
  body += numField('auth-minxin', '民心（60=安，80+=颂圣，20-=民变）', ac.initial.minxin, '默认 60');
  body += numField('auth-corruption', '腐败（0-100，越高越浊）', ac.initial.corruption, '默认 30');
  body += numField('auth-partyStrife', '党争（0-100，越高越乱）', ac.initial.partyStrife, '默认 30');
  body += '</div>';
  // 深度配置 —— 皇威/皇权/民心 子维度
  if (!ac.initial.huangweiSubDims) ac.initial.huangweiSubDims = {};
  if (!ac.initial.huangquanSubDims) ac.initial.huangquanSubDims = {};
  if (!ac.initial.minxinByClass) ac.initial.minxinByClass = {};
  if (!ac.initial.tyrant) ac.initial.tyrant = {};
  if (!ac.initial.powerMinister) ac.initial.powerMinister = {};
  // 天威之察
  body += '<div style="font-size:0.8rem;color:var(--gold);margin:0.8rem 0 0.4rem;">天威之察 · 皇威四维（空则继承总值）</div>';
  body += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">';
  body += numField('auth-hw-court', '宫廷威（妃嫔/宦官敬畏）', ac.initial.huangweiSubDims.court);
  body += numField('auth-hw-provincial', '藩屏威（地方官服从）', ac.initial.huangweiSubDims.provincial);
  body += numField('auth-hw-military', '军威（将士听命）', ac.initial.huangweiSubDims.military);
  body += numField('auth-hw-foreign', '外威（朝贡/藩属）', ac.initial.huangweiSubDims.foreign);
  body += '</div>';
  body += '<div style="margin-top:0.4rem;display:flex;gap:12px;">';
  body += '<label style="font-size:0.74rem;"><input type="checkbox" id="fiscalEd-auth-tyrantSyndrome"' + (ac.initial.tyrant.syndromeActive ? ' checked' : '') + '> 开局起暴君综合症</label>';
  body += '<label style="font-size:0.74rem;"><input type="checkbox" id="fiscalEd-auth-lostCrisis"' + (ac.initial.tyrant.lostCrisisActive ? ' checked' : '') + '> 开局起失威危机</label>';
  body += '</div>';
  // 乾纲之察
  body += '<div style="font-size:0.8rem;color:var(--gold);margin:0.8rem 0 0.4rem;">乾纲之察 · 皇权四维（空则继承总值）</div>';
  body += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">';
  body += numField('auth-hq-central', '中央决断力', ac.initial.huangquanSubDims.central);
  body += numField('auth-hq-provincial', '地方驾驭', ac.initial.huangquanSubDims.provincial);
  body += numField('auth-hq-military', '军权集中', ac.initial.huangquanSubDims.military);
  body += numField('auth-hq-imperial', '宫廷内务', ac.initial.huangquanSubDims.imperial);
  body += '</div>';
  body += '<div style="margin-top:0.4rem;display:grid;grid-template-columns:2fr 1fr;gap:10px;">';
  body += textField('auth-pm-name', '开局权臣姓名（空=无）', ac.initial.powerMinister.name, '留空即开局无权臣');
  body += numField('auth-pm-control', '权臣控制力 0-1（默认 0.3）', ac.initial.powerMinister.controlLevel);
  body += '</div>';
  // 民心之察
  body += '<div style="font-size:0.8rem;color:var(--gold);margin:0.8rem 0 0.4rem;">民心之察 · 分阶层初值（空则继承总值）</div>';
  body += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">';
  body += numField('auth-mx-imperial', '皇族/宗室', ac.initial.minxinByClass.imperial);
  body += numField('auth-mx-gentry_high', '世家门阀', ac.initial.minxinByClass.gentry_high);
  body += numField('auth-mx-scholar', '寒门士人', ac.initial.minxinByClass.scholar);
  body += numField('auth-mx-merchant', '商贾', ac.initial.minxinByClass.merchant);
  body += numField('auth-mx-landlord', '地主', ac.initial.minxinByClass.landlord);
  body += numField('auth-mx-peasant_self', '自耕农', ac.initial.minxinByClass.peasant_self);
  body += numField('auth-mx-peasant_tenant', '佃农', ac.initial.minxinByClass.peasant_tenant);
  body += numField('auth-mx-craftsman', '工匠', ac.initial.minxinByClass.craftsman);
  body += numField('auth-mx-clergy', '僧道', ac.initial.minxinByClass.clergy);
  body += numField('auth-mx-debased', '贱民', ac.initial.minxinByClass.debased);
  body += '</div>';
  body += '<div style="font-size:0.7rem;color:var(--txt-d);margin-top:0.6rem;line-height:1.7;">说明：决定开局时"朝野气氛"与"民情图"。<br>・ 开国盛世：皇威 65+/皇权 65/民心 75+<br>・ 盛世中叶：皇威 75/皇权 50/民心 65<br>・ 衰颓末期：皇威 25/皇权 30/民心 25/腐败 70 + 勾选失威危机<br>・ 权臣专朝：皇权 20/填权臣姓名/控制力 0.7+/军权 30-</div>';
  body += '</div>'; // fisc-authority end

  if (typeof openGenericModal !== 'function') {
    alert('openGenericModal 未就绪');
    return;
  }
  openGenericModal('财政配置（规则性配置）', body, function() {
    function pickNum(id) {
      var el = document.getElementById('fiscalEd-' + id);
      if (!el || el.value === '') return undefined;
      return Number(el.value);
    }
    function pickText(id) {
      var el = document.getElementById('fiscalEd-' + id);
      return el ? el.value.trim() : '';
    }

    // 帑廪/内帑的库存与月入不再此处手填（由行政区划+官制自然聚合）
    // 仅保留内帑独有配置：皇庄田亩
    var ntHA = pickNum('nt-huangzhuangAcres'); if (ntHA !== undefined) scriptData.neitang.huangzhuangAcres = ntHA;

    // 预设 key
    var presetKey = pickText('presetKey');
    if (presetKey && DETAILED_PRESETS[presetKey]) {
      var preset = DETAILED_PRESETS[presetKey];
      if (!scriptData.fiscalConfig.neicangRules) scriptData.fiscalConfig.neicangRules = {};
      Object.assign(scriptData.fiscalConfig.neicangRules, preset.rules || {});
    }

    // 内帑规则 JSON
    var rulesEl = document.getElementById('fiscalEd-neicangRules');
    if (rulesEl && rulesEl.value.trim()) {
      try {
        scriptData.fiscalConfig.neicangRules = JSON.parse(rulesEl.value);
      } catch(e) {
        alert('内帑规则 JSON 解析失败：' + e.message);
        return false;
      }
    }

    // 宗室压力
    var rcpEl = document.getElementById('fiscalEd-rcpEnabled');
    if (rcpEl) {
      if (!scriptData.fiscalConfig.neicangRules) scriptData.fiscalConfig.neicangRules = {};
      if (!scriptData.fiscalConfig.neicangRules.royalClanPressure) scriptData.fiscalConfig.neicangRules.royalClanPressure = {};
      scriptData.fiscalConfig.neicangRules.royalClanPressure.enabled = rcpEl.checked;
    }

    // 单位
    var um = pickText('unit-money'), ug = pickText('unit-grain'), uc = pickText('unit-cloth');
    if (um || ug || uc) {
      if (!scriptData.fiscalConfig.unit) scriptData.fiscalConfig.unit = {};
      if (um) scriptData.fiscalConfig.unit.money = um;
      if (ug) scriptData.fiscalConfig.unit.grain = ug;
      if (uc) scriptData.fiscalConfig.unit.cloth = uc;
    }

    // 税种
    var taxesEn = {};
    var anyTaxChanged = false;
    taxes.forEach(function(t) {
      var el = document.getElementById('fiscalEd-tax-' + t[0]);
      if (el && !el.checked) { taxesEn[t[0]] = false; anyTaxChanged = true; }
    });
    if (anyTaxChanged) scriptData.fiscalConfig.taxesEnabled = taxesEn;
    else if (scriptData.fiscalConfig.taxesEnabled) delete scriptData.fiscalConfig.taxesEnabled;

    // 自定义税种 JSON
    var ctEl = document.getElementById('fiscalEd-customTaxes');
    if (ctEl && ctEl.value.trim()) {
      try {
        var parsed = JSON.parse(ctEl.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          scriptData.fiscalConfig.customTaxes = parsed;
        } else {
          delete scriptData.fiscalConfig.customTaxes;
        }
      } catch(e) {
        alert('自定义税种 JSON 解析失败：\n' + e.message);
        return false;
      }
    } else {
      delete scriptData.fiscalConfig.customTaxes;
    }

    // 央地分账
    var clPreset = pickText('clPreset');
    if (!scriptData.fiscalConfig.centralLocalRules) scriptData.fiscalConfig.centralLocalRules = {};
    if (clPreset) scriptData.fiscalConfig.centralLocalRules.preset = clPreset;
    else delete scriptData.fiscalConfig.centralLocalRules.preset;
    var clOvEl = document.getElementById('fiscalEd-clRegionOverrides');
    if (clOvEl && clOvEl.value.trim() && clOvEl.value.trim() !== '{}') {
      try {
        scriptData.fiscalConfig.centralLocalRules.regionOverrides = JSON.parse(clOvEl.value);
      } catch(e) {
        alert('区域特例 JSON 解析失败：' + e.message);
        return false;
      }
    } else {
      delete scriptData.fiscalConfig.centralLocalRules.regionOverrides;
    }

    // 货币政策
    if (!scriptData.fiscalConfig.currencyRules) scriptData.fiscalConfig.currencyRules = {};
    var cur = scriptData.fiscalConfig.currencyRules;
    var anyCurSet = false;
    var enabledCoins = {};
    ['gold','silver','copper','iron','shell','paper'].forEach(function(k) {
      var el = document.getElementById('fiscalEd-curr-' + k);
      if (el) { enabledCoins[k] = !!el.checked; anyCurSet = anyCurSet || el.checked; }
    });
    if (anyCurSet) cur.enabledCoins = enabledCoins;
    else delete cur.enabledCoins;
    var std = pickText('curr-standard');
    if (std) cur.initialStandard = std; else delete cur.initialStandard;
    var paper = pickText('curr-paper');
    if (paper) { cur.defaultPresets = cur.defaultPresets || {}; cur.defaultPresets.paper = paper; }
    else if (cur.defaultPresets) delete cur.defaultPresets.paper;
    var ffEl = document.getElementById('fiscalEd-curr-foreignFlow');
    if (ffEl && ffEl.checked) cur.foreignFlowEnabled = true; else delete cur.foreignFlowEnabled;
    var pmEl = document.getElementById('fiscalEd-curr-canMintPrivately');
    if (pmEl && pmEl.checked) cur.canMintPrivately = true; else delete cur.canMintPrivately;
    if (Object.keys(cur).length === 0) delete scriptData.fiscalConfig.currencyRules;
    if (Object.keys(scriptData.fiscalConfig.centralLocalRules || {}).length === 0) delete scriptData.fiscalConfig.centralLocalRules;

    // 户口配置
    if (!scriptData.populationConfig) scriptData.populationConfig = {};
    var popH = pickNum('pop-households'), popM = pickNum('pop-mouths'), popD = pickNum('pop-ding');
    if (popH || popM || popD) {
      if (!scriptData.populationConfig.initial) scriptData.populationConfig.initial = {};
      if (popH) scriptData.populationConfig.initial.nationalHouseholds = popH;
      if (popM) scriptData.populationConfig.initial.nationalMouths = popM;
      if (popD) scriptData.populationConfig.initial.nationalDing = popD;
    }
    var dingMin = pickNum('pop-dingAgeMin'), dingMax = pickNum('pop-dingAgeMax');
    if (dingMin || dingMax) scriptData.populationConfig.dingAgeRange = [dingMin || 16, dingMax || 60];
    var catsEn = [];
    ['bianhu','junhu','jianghu','ruhu','sengdao','yuehu','danhu','nubi','huangzhuang','touxia'].forEach(function(c) {
      var el = document.getElementById('fiscalEd-cat-' + c);
      if (el && el.checked) catsEn.push(c);
    });
    if (catsEn.length > 0) scriptData.populationConfig.categoryEnabled = catsEn;
    var grdSys = pickText('gradeSystem');
    if (grdSys) scriptData.populationConfig.gradeSystem = grdSys;
    else delete scriptData.populationConfig.gradeSystem;
    if (Object.keys(scriptData.populationConfig).length === 0) delete scriptData.populationConfig;

    // 环境配置
    if (!scriptData.environmentConfig) scriptData.environmentConfig = {};
    var climate = pickText('climate');
    if (climate) scriptData.environmentConfig.climatePhase = climate;
    else delete scriptData.environmentConfig.climatePhase;
    if (Object.keys(scriptData.environmentConfig).length === 0) delete scriptData.environmentConfig;

    // 权力初值（主值+子维度+权臣+暴君）
    if (!scriptData.authorityConfig) scriptData.authorityConfig = {};
    if (!scriptData.authorityConfig.initial) scriptData.authorityConfig.initial = {};
    var acInit = scriptData.authorityConfig.initial;
    ['huangwei','huangquan','minxin','corruption','partyStrife'].forEach(function(k) {
      var v = pickNum('auth-' + k);
      if (v !== undefined) acInit[k] = v;
      else delete acInit[k];
    });
    // 皇威四维
    var hwSub = {};
    ['court','provincial','military','foreign'].forEach(function(k) {
      var v = pickNum('auth-hw-' + k);
      if (v !== undefined) hwSub[k] = v;
    });
    if (Object.keys(hwSub).length > 0) acInit.huangweiSubDims = hwSub;
    else delete acInit.huangweiSubDims;
    // 皇权四维
    var hqSub = {};
    ['central','provincial','military','imperial'].forEach(function(k) {
      var v = pickNum('auth-hq-' + k);
      if (v !== undefined) hqSub[k] = v;
    });
    if (Object.keys(hqSub).length > 0) acInit.huangquanSubDims = hqSub;
    else delete acInit.huangquanSubDims;
    // 权臣
    var pmName = pickText('pm-name');
    var pmCtrl = pickNum('pm-control');
    if (pmName || pmCtrl !== undefined) {
      acInit.powerMinister = {};
      if (pmName) acInit.powerMinister.name = pmName;
      if (pmCtrl !== undefined) acInit.powerMinister.controlLevel = pmCtrl;
    } else {
      delete acInit.powerMinister;
    }
    // 暴君/失威
    var tsEl = document.getElementById('fiscalEd-auth-tyrantSyndrome');
    var lcEl = document.getElementById('fiscalEd-auth-lostCrisis');
    var tyr = {};
    if (tsEl && tsEl.checked) tyr.syndromeActive = true;
    if (lcEl && lcEl.checked) tyr.lostCrisisActive = true;
    if (Object.keys(tyr).length > 0) acInit.tyrant = tyr;
    else delete acInit.tyrant;
    // 民心分阶层
    var mxCl = {};
    ['imperial','gentry_high','scholar','merchant','landlord','peasant_self','peasant_tenant','craftsman','clergy','debased'].forEach(function(k) {
      var v = pickNum('auth-mx-' + k);
      if (v !== undefined) mxCl[k] = v;
    });
    if (Object.keys(mxCl).length > 0) acInit.minxinByClass = mxCl;
    else delete acInit.minxinByClass;
    // 清理空
    if (Object.keys(acInit).length === 0) delete scriptData.authorityConfig.initial;
    if (Object.keys(scriptData.authorityConfig).length === 0) delete scriptData.authorityConfig;

    // 清理空对象
    if (scriptData.fiscalConfig && Object.keys(scriptData.fiscalConfig).length === 0) {
      delete scriptData.fiscalConfig;
    }

    if (typeof closeGenericModal === 'function') closeGenericModal();
    if (typeof toast === 'function') toast('财政配置已保存');
    else alert('已保存');
  });
}

// 核验：检查所有财政/央地/货币配置的一致性
function _fiscValidate() {
  var issues = [];
  var sd = (typeof scriptData !== 'undefined') ? scriptData : null;
  if (!sd) { alert('剧本数据未就绪'); return; }
  var gk = sd.guoku || {};
  var nt = sd.neitang || {};
  var fc = sd.fiscalConfig || {};

  // 1. 帑廪合理性
  if (gk.balance !== undefined && gk.monthlyExpense !== undefined) {
    var months = gk.balance / Math.max(1, gk.monthlyExpense);
    if (months < 1) issues.push({ level:'warn', cat:'帑廪', msg:'帑廪不足以支付 1 个月支出（仅 ' + months.toFixed(1) + ' 月）' });
  }
  if (gk.monthlyIncome !== undefined && gk.monthlyExpense !== undefined && gk.monthlyIncome < gk.monthlyExpense * 0.7) {
    issues.push({ level:'warn', cat:'帑廪', msg:'月入远小于月支（' + gk.monthlyIncome + ' vs ' + gk.monthlyExpense + '），长期必亏空' });
  }

  // 2. 内帑合理性
  if (nt.balance !== undefined && gk.balance !== undefined && nt.balance > gk.balance * 3) {
    issues.push({ level:'info', cat:'内帑', msg:'内帑远大于帑廪（' + nt.balance + ' vs ' + gk.balance + '），昏君倾向' });
  }

  // 3. 央地：preset 存在性
  if (fc.centralLocalRules && fc.centralLocalRules.preset) {
    var PRESETS = (typeof CentralLocalEngine !== 'undefined' && CentralLocalEngine.ALLOCATION_PRESETS) || {};
    if (!PRESETS[fc.centralLocalRules.preset]) issues.push({ level:'error', cat:'央地', msg:'分账预设 "' + fc.centralLocalRules.preset + '" 不存在' });
  }
  // regionOverrides 引用的 region 是否存在
  if (fc.centralLocalRules && fc.centralLocalRules.regionOverrides && sd.regions) {
    Object.keys(fc.centralLocalRules.regionOverrides).forEach(function(rid) {
      var found = sd.regions.some(function(r) { return r.id === rid || r.name === rid; });
      if (!found) issues.push({ level:'warn', cat:'央地', msg:'regionOverrides 中的 "' + rid + '" 在 sd.regions 中不存在' });
    });
  }

  // 4. 货币：币种选择
  if (fc.currencyRules && fc.currencyRules.enabledCoins) {
    var enabled = fc.currencyRules.enabledCoins;
    var anyEnabled = Object.keys(enabled).some(function(k) { return enabled[k]; });
    if (!anyEnabled) issues.push({ level:'error', cat:'货币', msg:'至少需要启用一种币种' });
    if (enabled.paper && !enabled.copper && !enabled.silver) {
      issues.push({ level:'warn', cat:'货币', msg:'纸币需要有本币（铜或银）作准备金支撑' });
    }
  }
  // 纸币预设的朝代与剧本朝代不符
  if (fc.currencyRules && fc.currencyRules.defaultPresets && fc.currencyRules.defaultPresets.paper) {
    var PP = (typeof CurrencyEngine !== 'undefined' && CurrencyEngine.PAPER_PRESETS) || {};
    var p = PP[fc.currencyRules.defaultPresets.paper];
    if (p && sd.dynasty && p.dynasty.indexOf(sd.dynasty) < 0 && sd.dynasty.indexOf(p.dynasty) < 0) {
      issues.push({ level:'info', cat:'货币', msg:'纸币预设 "' + p.name + '" (' + p.dynasty + ') 与剧本朝代 "' + sd.dynasty + '" 不符' });
    }
  }

  // 5. 税种合理性
  if (fc.taxesEnabled) {
    var allDisabled = Object.keys(fc.taxesEnabled).every(function(k) { return !fc.taxesEnabled[k]; });
    if (allDisabled) issues.push({ level:'error', cat:'税种', msg:'所有标准税种都禁用了，政府将无收入' });
  }

  // 6. 户口配置
  var pc = sd.populationConfig;
  if (pc && pc.initial) {
    var h = pc.initial.nationalHouseholds, m = pc.initial.nationalMouths, d = pc.initial.nationalDing;
    if (h && m) {
      var ratio = m / h;
      if (ratio < 2 || ratio > 10) issues.push({ level:'warn', cat:'户口', msg:'户均口数异常（' + ratio.toFixed(1) + '），合理范围 4-7' });
    }
    if (d && m && (d/m < 0.2 || d/m > 0.45)) issues.push({ level:'warn', cat:'户口', msg:'丁/口比异常（' + (d/m*100).toFixed(0) + '%），合理范围 25-40%' });
  }
  if (pc && pc.dingAgeRange) {
    if (pc.dingAgeRange[0] >= pc.dingAgeRange[1]) issues.push({ level:'error', cat:'户口', msg:'丁年龄范围非法：始龄 >= 终龄' });
  }

  // 7. 环境配置
  var env = sd.environmentConfig;
  if (env && env.initialCarrying && env.initialCarrying.byRegion && sd.regions) {
    Object.keys(env.initialCarrying.byRegion).forEach(function(rid) {
      var found = sd.regions.some(function(r) { return r.id === rid || r.name === rid; });
      if (!found) issues.push({ level:'warn', cat:'环境', msg:'initialCarrying 中的 "' + rid + '" 在 regions 中不存在' });
    });
  }

  // 结果展示
  var lv = { error:'严重', warn:'警示', info:'提示' };
  var col = { error:'var(--vermillion-400)', warn:'var(--amber-400)', info:'var(--celadon-400)' };
  var out = '';
  if (issues.length === 0) {
    out = '<div style="color:var(--celadon-400);padding:0.8rem;text-align:center;font-weight:bold;">✓ 所有核验项通过</div>';
  } else {
    out = '<div style="font-weight:bold;margin-bottom:0.5rem;">核验发现 ' + issues.length + ' 条问题：</div>';
    issues.forEach(function(iss) {
      out += '<div style="padding:4px 8px;margin-bottom:3px;border-left:3px solid ' + col[iss.level] + ';background:var(--bg-2);">'+
        '<span style="color:' + col[iss.level] + ';font-weight:bold;">〔' + lv[iss.level] + '〕</span> ' +
        '<span style="color:var(--gold);">[' + iss.cat + ']</span> ' +
        iss.msg + '</div>';
    });
  }
  if (typeof openGenericModal === 'function') {
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:20000;display:flex;align-items:center;justify-content:center;';
    ov.innerHTML = '<div style="background:var(--bg-1);border:1px solid var(--gold);border-radius:6px;padding:1.2rem;max-width:600px;width:90%;max-height:80vh;overflow-y:auto;">'+
      '<div style="font-size:1rem;color:var(--gold);margin-bottom:0.8rem;font-weight:bold;">财政/央地/货币配置核验</div>'+
      out +
      '<button class="btn" style="margin-top:0.8rem;" onclick="this.parentNode.parentNode.remove()">关闭</button>'+
      '</div>';
    ov.addEventListener('click', function(e) { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
  } else {
    alert(out.replace(/<[^>]+>/g, ''));
  }
}

// Tab 切换
function _fiscTab(panelId, btn) {
  var panels = document.querySelectorAll('.fisc-panel');
  for (var i = 0; i < panels.length; i++) panels[i].style.display = 'none';
  var target = document.getElementById(panelId);
  if (target) target.style.display = 'block';
  var btns = document.querySelectorAll('.fisc-tab-btn');
  for (var j = 0; j < btns.length; j++) {
    btns[j].classList.remove('active');
    btns[j].style.background = 'var(--bg-2)';
    btns[j].style.color = 'var(--txt-s)';
  }
  if (btn) {
    btn.classList.add('active');
    btn.style.background = 'var(--gold-d)';
    btn.style.color = '#fff';
  }
}
