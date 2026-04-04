import fs from 'fs';

async function run() {
  const res = await fetch('https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData_YoStar/main/en_US/gamedata/excel/story_review_table.json');
  const data = await res.json();
  const noneKeys = Object.keys(data).filter(k => data[k].entryType === 'NONE').slice(0, 20);
  const samples = noneKeys.map(k => ({ id: k, name: data[k].name, storyId: data[k].infoUnlockDatas[0]?.storyId }));
  console.log(JSON.stringify(samples, null, 2));
}
run();
