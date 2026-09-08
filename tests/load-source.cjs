const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
global.__testEnv = {
  VITE_CACHE_DEFAULT_TTL: '900000', VITE_CACHE_MAX_ENTRY_PER_CATEGORY: '2',
  VITE_DATA_URL_BASE: 'https://bls.bindul.name/data/',
  VITE_DATA_LEAGUES_INDEX_RESOURCE: 'https://bls.bindul.name/data/leagues.json',
  VITE_DATA_PLAYERS_INDEX_RESOURCE: 'https://bls.bindul.name/data/players.json',
};
// Preserve the application's legacy decorators while testing source, without editing it.
const exposed = {'league-calculators.ts': ['PpgPpsPointsCalculator', 'calculatePlayerScores', 'setCrossPlayerFrameAttributes']};
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (mod, filename) => {
  let source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env', 'global.__testEnv');
  if (exposed[path.basename(filename)]) source += '\nexport {' + exposed[path.basename(filename)].join(',') + '};';
  mod._compile(ts.transpileModule(source, {fileName: filename, compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
    experimentalDecorators: true, emitDecoratorMetadata: true, esModuleInterop: true,
  }}).outputText, filename);
};
module.exports = p => require(path.join(root, p));
