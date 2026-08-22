import fs from 'fs';
import path from 'path';

/**
 * Zoot Archive Data Integrity Validator for AI Agents and Developers
 * Run via: npm run validate:data
 */

const dataDir = path.resolve('./src/data');
let hasErrors = false;

console.log('🔍 Starting Zoot Archive Data Integrity Check...\n');

// 1. Check if required JSON files exist and are valid JSON
const requiredFiles = [
  'operators_database.json',
  'operator_names_map.json',
  'tags_database.json',
  'translations.json'
];

for (const file of requiredFiles) {
  const filePath = path.join(dataDir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ [MISSING FILE] ${file} does not exist in src/data/!`);
    hasErrors = true;
    continue;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    
    if (Array.isArray(parsed)) {
      console.log(`✅ [VALID] ${file} (Array, ${parsed.length} items)`);
    } else if (typeof parsed === 'object' && parsed !== null) {
      console.log(`✅ [VALID] ${file} (Object, ${Object.keys(parsed).length} keys)`);
    } else {
      console.warn(`⚠️ [WARNING] ${file} contains empty or unexpected root structure.`);
    }
  } catch (err) {
    console.error(`❌ [JSON SYNTAX ERROR] ${file}: ${err.message}`);
    hasErrors = true;
  }
}

// 2. Validate Operators Database vs Operator Names Map alignment
console.log('\n🔗 Checking Database <-> Operator Names Map alignment...');
try {
  const opDb = JSON.parse(fs.readFileSync(path.join(dataDir, 'operators_database.json'), 'utf8'));
  const namesMap = JSON.parse(fs.readFileSync(path.join(dataDir, 'operator_names_map.json'), 'utf8'));

  let unmappedOps = 0;
  for (const op of opDb) {
    if (!op.id) continue;
    const cleanId = op.id.toLowerCase().replace(/^char_/, '').replace(/^\d+_/, '').replace(/_[a-z0-9]+$/, '');
    if (!namesMap[op.id] && !namesMap[cleanId] && !namesMap[op.nameEn?.toLowerCase()?.replace(/[^a-z0-9]/g, '')]) {
      unmappedOps++;
    }
  }

  if (unmappedOps > 0) {
    console.warn(`⚠️ [NAME MAP] ${unmappedOps} operators in operators_database.json do not have entries in operator_names_map.json. Run "npm run sync:operators" to fix.`);
  } else {
    console.log('✅ [NAME MAP] All operators are properly mapped!');
  }
} catch (e) {
  console.error(`❌ Could not verify operator name alignment: ${e.message}`);
  hasErrors = true;
}

console.log('\n----------------------------------------');
if (hasErrors) {
  console.error('❌ Data integrity validation failed. Please address errors before building or committing.');
  process.exit(1);
} else {
  console.log('✨ All data integrity checks passed successfully!');
  process.exit(0);
}
