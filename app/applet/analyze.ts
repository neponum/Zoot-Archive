import axios from 'axios';

async function analyze() {
  const { data } = await axios.get('https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/zh_CN/gamedata/excel/story_review_table.json');
  console.log("Top level keys:", Object.keys(data).slice(0, 10));
  const firstKey = Object.keys(data)[0];
  console.log("First key:", firstKey);
  console.log("First item:", JSON.stringify(data[firstKey], null, 2).substring(0, 1000));
}

analyze();
