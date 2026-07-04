const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const patches = (read('tm-patches.js') + '\n' + read('tm-patches-start.js'));
const officeEditor = read('tm-office-editor.js');
const verifyAll = read(path.join('scripts', 'verify-all.js'));

function extractBlock(src, needle) {
  const start = src.indexOf(needle);
  assert(start >= 0, 'source block not found: ' + needle);
  const open = src.indexOf('{', start);
  assert(open >= 0, 'source block has no opening brace: ' + needle);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error('source block has no closing brace: ' + needle);
}

const startSrc = extractBlock(patches, 'startGame=async function(sid){');
const validateHelper = extractBlock(patches, 'function _tmStartValidateScenarioBeforeLaunch(sc)');
const modelHelper = extractBlock(patches, 'function _tmStartConfirmModelRequirementsBeforeLaunch(sc)');

const pageHideAt = startSrc.indexOf('_$("scn-page").classList.remove("show")');
const validateAt = startSrc.indexOf('_tmStartValidateScenarioBeforeLaunch(sc)');
const modelAt = startSrc.indexOf('_tmStartConfirmModelRequirementsBeforeLaunch(sc)');
assert(validateAt >= 0, 'active startGame should call validation helper, not rely on old overwritten startGame');
assert(modelAt >= 0, 'active startGame should call model requirement helper, not rely on old overwritten startGame');
assert(pageHideAt < 0 || validateAt < pageHideAt, 'scenario validation should run before the launch page is hidden');
assert(pageHideAt < 0 || modelAt < pageHideAt, 'modelRequirements warning should run before the launch page is hidden');
assert(validateHelper.includes('validateScenario(sc)'), 'validation helper should call validateScenario(sc)');
assert(validateHelper.includes('TM_START_GUARD: validate-scenario-before-start'), 'active startGame validation guard marker missing');
assert(modelHelper.includes('sc.modelRequirements'), 'model helper should preserve modelRequirements warning path');
assert(modelHelper.includes('confirm('), 'modelRequirements warning should still let the player confirm or cancel');
assert(modelHelper.includes('TM_START_GUARD: model-requirements-warning-before-start'), 'active startGame model guard marker missing');

assert(officeEditor.includes('TM_OFFICE_CONFIG_UI: cost-variable-editor-restored'), 'officeConfig cost UI marker missing');
assert(/function\s+_renderOfficeConfigCostPanel\s*\(/.test(officeEditor), 'office editor should expose _renderOfficeConfigCostPanel()');
assert(/function\s+_officeConfigAddCostVariable\s*\(/.test(officeEditor), 'office editor should expose add helper for costVariables');
assert(/function\s+_officeConfigRemoveCostVariable\s*\(/.test(officeEditor), 'office editor should expose remove helper for costVariables');
assert(officeEditor.includes('P.officeConfig.costVariables'), 'office editor should edit P.officeConfig.costVariables');
assert(officeEditor.includes('P.officeConfig.shortfallEffects'), 'office editor should edit P.officeConfig.shortfallEffects');
assert(officeEditor.includes('office-config-cost-panel'), 'renderOfficeTab should include the officeConfig cost panel');

assert(verifyAll.includes('smoke-restored-deprecated-code-paths.js'), 'verify-all should include restored deprecated code smoke');

console.log('smoke-restored-deprecated-code-paths ok');
