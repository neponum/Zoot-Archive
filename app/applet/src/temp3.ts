import fs from 'fs';

async function run() {
  const res = await fetch('https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData_YoStar/main/en_US/gamedata/excel/character_table.json');
  const data = await res.json();
  const mapping = {};
  for (const charId in data) {
    const parts = charId.split('_');
    if (parts.length >= 3) {
      const name = parts.slice(2).join('_');
      mapping[name] = charId;
    }
  }
  fs.writeFileSync('./src/charMapping.json', JSON.stringify(mapping, null, 2));
  console.log('Mapping created with ' + Object.keys(mapping).length + ' entries');
}
run();
