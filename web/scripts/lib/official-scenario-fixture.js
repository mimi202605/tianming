// Test-only adapter that mirrors start-game's scenario-array materialization.
// Production code loads the complete scenario script lazily and startGame owns
// the actual GM/P writeback; smokes use this helper instead of the retired
// Tianqi runtime snapshot.
'use strict';

const ROW_KEYS = [
  'characters', 'factions', 'parties', 'classes', 'variables',
  'events', 'relations', 'items', 'rigidHistoryEvents'
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function materializeScenarioRows(project, scenarioId) {
  if (!project || !Array.isArray(project.scenarios)) {
    throw new Error('P.scenarios is required');
  }
  const scenario = project.scenarios.find((row) => row && row.id === scenarioId);
  if (!scenario || scenario._lazyOfficial === true) {
    throw new Error('full official scenario is required: ' + scenarioId);
  }
  for (const key of ROW_KEYS) {
    if (!Array.isArray(project[key])) project[key] = [];
    project[key] = project[key].filter((row) => !row || row.sid !== scenarioId);
    const rows = Array.isArray(scenario[key]) ? clone(scenario[key]) : [];
    for (const row of rows) {
      if (row && row.sid == null) row.sid = scenarioId;
      project[key].push(row);
    }
  }
  return scenario;
}

module.exports = { ROW_KEYS, materializeScenarioRows };
