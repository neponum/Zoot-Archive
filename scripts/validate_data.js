import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Zoot Archive Data Integrity Validator for AI Agents and Developers
 * Run via: npm run validate:data  (path-independent, works from any cwd)
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const dataDir = path.join(projectRoot, 'src/data');

const stats = {
  filesChecked: 0,
  filesPassed: 0,
  filesFailed: 0,
  recordsChecked: 0,
  recordsInvalid: 0,
  mismatches: 0
};

let hasErrors = false;

function print(message = '') {
  process.stdout.write(`${message}\n`);
}

function printError(message) {
  hasErrors = true;
  print(message);
}

function describe(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `array(${value.length})`;
  if (typeof value === 'string') return `string "${value}"`;
  return typeof value;
}

const REQUIRED_FILES = [
  { name: 'operators_database.json', root: 'array', purpose: 'operator dossier records' },
  { name: 'operator_names_map.json', root: 'object', purpose: 'operator name lookup index' },
  { name: 'new_operators.json', root: 'array', purpose: 'recent release ids for the NEW filter' },
  { name: 'operator_birthdays.json', root: 'object', purpose: 'birthday index (char_id -> MM-DD)' },
  { name: 'tags_database.json', root: 'object', purpose: 'story script AST tag dictionary' },
  { name: 'translations.json', root: 'object', purpose: 'UI localization strings' },
  { name: 'storyDescriptionsRu.json', root: 'object', purpose: 'Russian chapter synopses (zoot-data canon)' },
  { name: 'storyOperationDescriptionsRu.json', root: 'object', purpose: 'Russian operation briefs (zoot-data canon)' }
];

/**
 * Канон zoot-data: запрещённые формы в русских описаниях.
 * Источник — `ZOOT-DATA/tools/UNIFY.md`, `translation/ru_RU/glossary.json`,
 * `apply_canon.py` (ё, тире) и `apply_glossary.py` (Инфицированные).
 */
const STORY_CANON_RULES = [
  { pattern: /зараж[её]нн\w*/gi, hint: 'Инфицированные (glossary: infected)' },
  { pattern: /Родос[ -]Айленд/g, hint: 'Родос (apply_canon: Rhodes Island)' },
  { pattern: /Реюньон/g, hint: 'Воссоединение (glossary)' },
  { pattern: /Таллула/g, hint: 'Талула (UNIFY.md)' },
  { pattern: /Хосигума/g, hint: 'Хошигума (UNIFY.md)' },
  { pattern: /Нянь/g, hint: 'Ниан (UNIFY.md)' },
  { pattern: /Тьяго/g, hint: 'Тиаго (UNIFY.md)' },
  { pattern: /Леонтуццо/g, hint: 'Леонтузо (UNIFY.md)' },
  { pattern: /Клеменца/g, hint: 'Клементия (UNIFY.md)' },
  { pattern: /Сузуран/g, hint: 'Судзуран (UNIFY.md)' },
  { pattern: /Паллас/g, hint: 'Паллада (UNIFY.md)' },
  { pattern: /Вэй Яньу(?!в)/g, hint: 'Вэй Яньву (UNIFY.md)' },
  { pattern: /Доберман(?!н)/g, hint: 'Доберманн (UNIFY.md)' },
  { pattern: /((?<!А-Яа-яЁё)Чен(?!А-Яа-яЁё))/g, hint: 'Чэнь (UNIFY.md)' },
  { pattern: /Клоуз/g, hint: 'Кложер (UNIFY.md)' },
  { pattern: /—{2,}/g, hint: 'одинарное тире — (apply_canon)' },
  { pattern: /\.{4,}/g, hint: 'многоточие «...» (glossary: punctuation)' }
];

const OPERATOR_REQUIRED_STRINGS = ['id', 'nameZh', 'nameEn', 'profession', 'drawName', 'infoName'];
const OPERATOR_OPTIONAL_STRINGS = ['subProfessionId', 'nationId', 'groupId', 'teamId', 'position', 'displayNumber'];
const RARITY_MIN = 1;
const RARITY_MAX = 6;
const MAX_REPORTED = 20;

const fileStatus = {};
const parsedFiles = {};

print('🔍 Zoot Archive Data Integrity Validator');
print(`   project root: ${projectRoot}`);
print(`   data dir:     ${dataDir}`);
print();

print('📁 [1/3] Required files, JSON syntax and root types');
for (const { name, root, purpose } of REQUIRED_FILES) {
  stats.filesChecked++;
  fileStatus[name] = { purpose, errors: [], detail: '', loaded: false };
  const filePath = path.join(dataDir, name);

  if (!fs.existsSync(filePath)) {
    printError(`   ❌ [MISSING] ${name} — expected at src/data/${name}`);
    fileStatus[name].errors.push('file does not exist');
    continue;
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    printError(`   ❌ [JSON SYNTAX] ${name}: ${err.message}`);
    fileStatus[name].errors.push(`invalid JSON syntax: ${err.message}`);
    continue;
  }

  parsedFiles[name] = parsed;
  fileStatus[name].loaded = true;

  const actual = Array.isArray(parsed) ? 'array' : (typeof parsed === 'object' && parsed !== null ? 'object' : describe(parsed));
  if (actual !== root) {
    const detail = root === 'array' ? `root must be an Array, got ${actual}` : `root must be an Object, got ${actual}`;
    printError(`   ❌ [ROOT TYPE] ${name}: ${detail}`);
    fileStatus[name].errors.push(detail);
    continue;
  }

  const size = root === 'array' ? parsed.length : Object.keys(parsed).length;
  const unit = root === 'array' ? 'items' : 'keys';
  fileStatus[name].detail = `${root}, ${size} ${unit}`;

  const problems = [];
  if (name === 'translations.json') {
    for (const locale of ['ru_RU', 'en_US']) {
      const table = parsed[locale];
      if (typeof table !== 'object' || table === null || Array.isArray(table)) {
        problems.push(`locale "${locale}" must be an object, got ${describe(table)}`);
      } else if (Object.keys(table).length === 0) {
        problems.push(`locale "${locale}" has no keys`);
      }
    }
  }

  if (problems.length > 0) {
    printError(`   ❌ [SCHEMA] ${name} — ${root}, ${size} ${unit}`);
    for (const problem of problems) printError(`      -> ${problem}`);
    fileStatus[name].errors.push(...problems);
  } else {
    print(`   ✅ [OK] ${name} — ${root}, ${size} ${unit}`);
  }
}

print();
print('🧬 [2/3] operators_database.json record schema');
const opDb = parsedFiles['operators_database.json'];
const namesMap = parsedFiles['operator_names_map.json'];

if (!Array.isArray(opDb)) {
  printError('   ❌ [SCHEMA] Skipped: operators_database.json is not a valid array.');
} else {
  const problems = [];
  for (let i = 0; i < opDb.length; i++) {
    stats.recordsChecked++;
    const record = opDb[i];
    const recordErrors = [];

    if (typeof record !== 'object' || record === null || Array.isArray(record)) {
      recordErrors.push(`record #${i} must be an object, got ${describe(record)}`);
    } else {
      for (const field of OPERATOR_REQUIRED_STRINGS) {
        const value = record[field];
        if (typeof value !== 'string') {
          recordErrors.push(`record #${i} field "${field}" must be a string, got ${describe(value)}`);
        } else if (value.trim() === '') {
          recordErrors.push(`record #${i} field "${field}" must not be empty`);
        }
      }
      for (const field of OPERATOR_OPTIONAL_STRINGS) {
        if (!(field in record)) continue;
        const value = record[field];
        if (value !== undefined && typeof value !== 'string') {
          recordErrors.push(`record #${i} field "${field}" must be a string when present, got ${describe(value)}`);
        }
      }
      const rarity = record.rarity;
      if (typeof rarity !== 'number' || !Number.isInteger(rarity) || rarity < RARITY_MIN || rarity > RARITY_MAX) {
        recordErrors.push(`record #${i} field "rarity" must be an integer ${RARITY_MIN}..${RARITY_MAX}, got ${describe(rarity)}`);
      }
    }

    if (recordErrors.length > 0) {
      stats.recordsInvalid++;
      problems.push(...recordErrors);
    }
  }

  if (problems.length > 0) {
    for (const problem of problems.slice(0, MAX_REPORTED)) printError(`   ❌ ${problem}`);
    if (problems.length > MAX_REPORTED) printError(`   ❌ ... and ${problems.length - MAX_REPORTED} more problem(s)`);
    if (fileStatus['operators_database.json']) {
      fileStatus['operators_database.json'].errors.push(`${stats.recordsInvalid} record(s) violate the schema`);
    }
  }
  print(`   ${stats.recordsInvalid === 0 ? '✅' : '❌'} [SCHEMA] ${stats.recordsInvalid} invalid record(s) out of ${stats.recordsChecked}`);
}

print();
print('🔗 [3/3] operators_database.json ↔ operator_names_map.json alignment');
if (!Array.isArray(opDb) || typeof namesMap !== 'object' || namesMap === null) {
  printError('   ❌ [MISMATCH] Cannot verify alignment: operators_database.json or operator_names_map.json is unavailable.');
} else {
  const unmapped = [];
  for (const op of opDb) {
    if (!op || typeof op.id !== 'string' || op.id === '') continue;
    const cleanId = op.id.toLowerCase().replace(/^char_/, '').replace(/^\d+_/, '').replace(/_[a-z0-9]+$/, '');
    const cleanEn = typeof op.nameEn === 'string' ? op.nameEn.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    if (!namesMap[op.id] && !namesMap[cleanId] && !(cleanEn && namesMap[cleanEn])) {
      unmapped.push(op.id);
    }
  }

  stats.mismatches = unmapped.length;
  if (unmapped.length > 0) {
    printError(`   ❌ [MISMATCH] ${unmapped.length} operator(s) in operators_database.json have no entry in operator_names_map.json:`);
    for (const id of unmapped.slice(0, MAX_REPORTED)) print(`      - ${id}`);
    if (unmapped.length > MAX_REPORTED) print(`      ... and ${unmapped.length - MAX_REPORTED} more`);
    print('      Run "npm run sync:operators" to rebuild operator_names_map.json.');
    if (fileStatus['operators_database.json']) {
      fileStatus['operators_database.json'].errors.push(`${unmapped.length} operator(s) missing from the name map`);
    }
    if (fileStatus['operator_names_map.json']) {
      fileStatus['operator_names_map.json'].errors.push(`no lookup entry for ${unmapped.length} operator(s)`);
    }
  } else {
    print(`   ✅ [ALIGNED] All ${opDb.length} operator(s) are mapped in operator_names_map.json`);
  }
}

print();
print('🆕 [3b/3] new_operators.json ↔ operators_database.json');
const newOps = parsedFiles['new_operators.json'];
if (!Array.isArray(newOps) || !Array.isArray(opDb)) {
  printError('   ❌ [MISMATCH] Cannot verify new operators: new_operators.json or operators_database.json is unavailable.');
} else {
  const knownIds = new Set(opDb.map((op) => (op && typeof op.id === 'string' ? op.id : '')));
  const newEntries = newOps
    .map((entry) => (typeof entry === 'string' ? { id: entry } : entry))
    .filter((entry) => entry && typeof entry.id === 'string');
  const unknown = newEntries
    .map((entry) => entry.id)
    .filter((id) => !knownIds.has(id));
  if (unknown.length > 0) {
    printError(`   ❌ [MISMATCH] ${unknown.length} id(s) in new_operators.json are missing from operators_database.json:`);
    for (const id of unknown.slice(0, MAX_REPORTED)) print(`      - ${id}`);
    if (fileStatus['new_operators.json']) {
      fileStatus['new_operators.json'].errors.push(`${unknown.length} id(s) not found in operators_database.json`);
    }
  } else {
    print(`   ✅ [ALIGNED] All ${newEntries.length} new operator(s) exist in operators_database.json`);
  }
}

print();
print('📝 [3c/3] Story translations ↔ canon (zoot-data)');
for (const name of ['storyDescriptionsRu.json', 'storyOperationDescriptionsRu.json']) {
  const data = parsedFiles[name];
  if (!data || typeof data !== 'object') {
    printError(`   ❌ [MISSING] ${name}: cannot check canon`);
    continue;
  }
  const violations = [];
  for (const [key, text] of Object.entries(data)) {
    if (typeof text !== 'string') continue;
    for (const rule of STORY_CANON_RULES) {
      rule.pattern.lastIndex = 0;
      const match = rule.pattern.exec(text);
      if (match) {
        violations.push({ key, found: match[0], hint: rule.hint });
      }
    }
  }
  if (violations.length > 0) {
    printError(`   ❌ [CANON] ${name}: ${violations.length} violation(s)`);
    for (const item of violations.slice(0, MAX_REPORTED)) {
      print(`      - ${item.key}: «${item.found}» → ${item.hint}`);
    }
    if (fileStatus[name]) {
      fileStatus[name].errors.push(`${violations.length} canon violation(s) in Russian story text`);
    }
  } else {
    print(`   ✅ [CANON] ${name}: no banned forms`);
  }
}

print();
print('📋 Per-file results');
for (const { name } of REQUIRED_FILES) {
  const status = fileStatus[name];
  if (!status) continue;
  const ok = status.errors.length === 0 && status.loaded;
  const suffix = ok ? ` — ${status.detail}` : ` — ${status.errors[0]}`;
  print(`   ${ok ? '✅ [OK]   ' : '❌ [ERROR]'} ${name}${suffix}`);
  if (ok) print(`             ${status.purpose}`);
}

print();
print('----------------------------------------');
for (const { name } of REQUIRED_FILES) {
  const status = fileStatus[name];
  if (!status) continue;
  if (status.errors.length === 0 && status.loaded) stats.filesPassed++;
  else stats.filesFailed++;
}
print('📊 Summary');
print(`   Files checked .......... ${stats.filesChecked}`);
print(`   Files OK ............... ${stats.filesPassed}`);
print(`   Files failed ........... ${stats.filesFailed}`);
print(`   Operator records ....... ${stats.recordsChecked} (invalid: ${stats.recordsInvalid})`);
print(`   Name-map mismatches .... ${stats.mismatches}`);
print('----------------------------------------');

if (hasErrors) {
  print('❌ Data integrity validation FAILED. Please address the errors above before building or committing.');
  process.exit(1);
}

print('✨ All data integrity checks passed successfully!');
process.exit(0);
